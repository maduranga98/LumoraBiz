import React, { useState, useEffect } from "react";
import { db, auth } from "../../services/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import EmployeeDropdown from "../EmployeeDropdown";
import { useBusiness } from "../../contexts/BusinessContext";
import { useAuth } from "../../contexts/AuthContext";

const PaySheet = () => {
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Attendance data state
  const [attendanceData, setAttendanceData] = useState({
    absentDays: [],
    halfDays: [],
    workHoursPerDay: [],
    totalWorkingDays: 0,
    totalActualHours: 0,
    totalActualMinutes: 0,
  });

  // Payroll form data
  const [payrollData, setPayrollData] = useState({
    workingHoursPerDay: "8",
    overtimeHours: "",
    overtimeRate: "",
    bonus: "",
    advance: "",
    payPeriodStart: "",
    payPeriodEnd: "",
    notes: "",
  });

  // Multiple allowances and deductions
  const [allowances, setAllowances] = useState([]);
  const [deductions, setDeductions] = useState([]);

  // Advance payments within pay period
  const [advancePayments, setAdvancePayments] = useState([]);
  const [advancesLoading, setAdvancesLoading] = useState(false);
  const [advanceDebugInfo, setAdvanceDebugInfo] = useState("");

  const businessId = currentBusiness?.id;
  const ownerId = currentUser?.uid;

  // Helper function to safely convert Firestore Timestamps to JavaScript Dates
  const convertFirestoreDate = (dateField) => {
    try {
      if (dateField?.toDate) {
        // Firestore Timestamp with toDate method
        return dateField.toDate();
      } else if (dateField?.seconds) {
        // Firestore Timestamp object with seconds/nanoseconds
        return new Date(dateField.seconds * 1000);
      } else if (dateField) {
        // Regular date string or Date object
        return new Date(dateField);
      }
      return null;
    } catch (error) {
      console.warn("Error converting date:", error);
      return null;
    }
  };

  // Helper function to safely format dates for display
  const formatDateForDisplay = (dateField) => {
    const date = convertFirestoreDate(dateField);
    return date && !isNaN(date.getTime())
      ? date.toLocaleDateString()
      : "Invalid date";
  };

  // Helper function to parse time and handle cross-midnight scenarios
  const parseTimeToMinutes = (timeString) => {
    const [hours, minutes, seconds] = timeString.split(":").map(Number);
    return hours * 60 + minutes + (seconds || 0) / 60;
  };

  // Helper function to calculate work duration considering cross-midnight
  const calculateWorkDuration = (inTime, outTime) => {
    const inMinutes = parseTimeToMinutes(inTime);
    const outMinutes = parseTimeToMinutes(outTime);

    if (outMinutes >= inMinutes) {
      return outMinutes - inMinutes;
    } else {
      return 24 * 60 - inMinutes + outMinutes;
    }
  };

  // Helper function to format minutes to hours and minutes
  const formatMinutesToHours = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    return `${hours}h ${minutes}m`;
  };

  // FIXED: Fetch advance payments from the correct collections used by Advanced component
  useEffect(() => {
    const fetchAdvancePayments = async () => {
      if (
        !selectedEmployee ||
        !ownerId ||
        !businessId ||
        !payrollData.payPeriodStart ||
        !payrollData.payPeriodEnd
      ) {
        setAdvancePayments([]);
        setAdvanceDebugInfo("Missing required data for fetching advances");
        return;
      }

      setAdvancesLoading(true);
      const debugMessages = ["=== Advance Payments Debug ==="];

      try {
        const startDate = new Date(payrollData.payPeriodStart);
        const endDate = new Date(payrollData.payPeriodEnd);
        endDate.setHours(23, 59, 59, 999); // Include the entire end date

        debugMessages.push(
          `Employee: ${selectedEmployee.name} (ID: ${selectedEmployee.id})`
        );
        debugMessages.push(
          `Pay Period: ${startDate.toDateString()} to ${endDate.toDateString()}`
        );

        let allAdvances = [];

        // Check the correct collections used by Advanced component
        const collectionsToCheck = [
          // Employee-specific advances collection (primary location from Advanced component)
          `owners/${ownerId}/businesses/${businessId}/employees/${selectedEmployee.id}/advances`,
          // Business-wide advances collection (secondary location from Advanced component)
          `owners/${ownerId}/businesses/${businessId}/advances`,
          // Alternative flat structure collections (fallback)
          "advancePayments",
          "advance_payments",
          "advances",
        ];

        for (const collectionPath of collectionsToCheck) {
          try {
            debugMessages.push(`\nChecking collection: ${collectionPath}`);

            let queryRef;
            if (collectionPath.includes("owners/")) {
              // For nested collection paths, query directly
              queryRef = query(
                collection(db, collectionPath),
                orderBy("createdAt", "desc")
              );
            } else {
              // For flat collections, filter by business and owner
              queryRef = query(
                collection(db, collectionPath),
                where("ownerId", "==", ownerId),
                where("businessId", "==", businessId),
                where("employeeDocId", "==", selectedEmployee.id),
                orderBy("createdAt", "desc")
              );
            }

            const querySnapshot = await getDocs(queryRef);
            debugMessages.push(
              `Found ${querySnapshot.size} records in ${collectionPath}`
            );

            querySnapshot.forEach((doc) => {
              const data = doc.data();
              debugMessages.push(
                `Record found: ${JSON.stringify(data, null, 2)}`
              );

              // Parse payment date using the helper function
              const paymentDate =
                convertFirestoreDate(data.paymentDate) ||
                convertFirestoreDate(data.createdAt);

              if (!paymentDate) {
                debugMessages.push(
                  `Skipping record ${doc.id}: No valid date found`
                );
                return;
              }

              // Validate the parsed date
              if (isNaN(paymentDate.getTime())) {
                debugMessages.push(
                  `Skipping record ${doc.id}: Invalid date parsed`
                );
                return;
              }

              // Check if payment is within the pay period
              const isInPeriod =
                paymentDate >= startDate && paymentDate <= endDate;

              // Check if it's an advance payment type
              const isAdvanceType =
                data.paymentType === "advance" ||
                data.type === "advance" ||
                !data.paymentType; // Default to advance if no type

              // Check approval status - more flexible logic for payroll context
              const isApproved =
                data.status === "approved" ||
                data.approvalStatus === "approved" ||
                data.approved === true ||
                // For payroll purposes, also include "pending" advances that should be deducted
                (data.approvalStatus === "pending" &&
                  data.status === "active") ||
                // Default to approved if no explicit rejection
                (!data.approvalStatus && !data.status) ||
                (!data.approvalStatus && data.status !== "rejected");

              // Check if not repaid
              const isNotRepaid =
                data.status !== "repaid" &&
                data.repaymentStatus !== "repaid" &&
                data.repaid !== true &&
                data.status !== "completed";

              debugMessages.push(
                `Record ${
                  doc.id
                }: Date=${paymentDate.toDateString()}, InPeriod=${isInPeriod}, Approved=${isApproved}, NotRepaid=${isNotRepaid}, IsAdvance=${isAdvanceType}, Amount=${
                  data.amount
                }`
              );

              if (isInPeriod && isApproved && isNotRepaid && isAdvanceType) {
                allAdvances.push({
                  id: doc.id,
                  amount: parseFloat(data.amount) || 0,
                  reason: data.reason || data.description || "Advance Payment",
                  repaymentMethod: data.repaymentMethod || "deduct_from_salary",
                  collectionSource: collectionPath,
                  originalData: data, // Keep original data for debugging
                  ...data,
                  // Override with converted date to ensure it's a JavaScript Date object
                  paymentDate: paymentDate,
                });
              }
            });
          } catch (error) {
            debugMessages.push(
              `Error with ${collectionPath}: ${error.message}`
            );
          }
        }

        // Remove duplicates based on amount, date, and reason - with safe date comparison
        const uniqueAdvances = allAdvances.filter(
          (advance, index, self) =>
            index ===
            self.findIndex((a) => {
              try {
                return (
                  a.amount === advance.amount &&
                  a.paymentDate.getTime() === advance.paymentDate.getTime() &&
                  a.reason === advance.reason
                );
              } catch (error) {
                // If date comparison fails, fall back to amount and reason comparison
                debugMessages.push(
                  `Date comparison failed for ${advance.id}: ${error.message}`
                );
                return (
                  a.amount === advance.amount && a.reason === advance.reason
                );
              }
            })
        );

        debugMessages.push(
          `\nTotal unique advances found: ${uniqueAdvances.length}`
        );
        setAdvanceDebugInfo(debugMessages.join("\n"));

        // Sort by payment date
        uniqueAdvances.sort((a, b) => a.paymentDate - b.paymentDate);
        setAdvancePayments(uniqueAdvances);

        if (uniqueAdvances.length > 0) {
          toast.success(
            `Found ${uniqueAdvances.length} advance payment(s) to deduct`
          );
        }
      } catch (error) {
        console.error("Error fetching advance payments:", error);
        setAdvanceDebugInfo(
          `Error: ${error.message}\n${debugMessages.join("\n")}`
        );
        toast.error("Failed to fetch advance payments");
      } finally {
        setAdvancesLoading(false);
      }
    };

    fetchAdvancePayments();
  }, [
    selectedEmployee,
    ownerId,
    businessId,
    payrollData.payPeriodStart,
    payrollData.payPeriodEnd,
  ]);

  // Fetch attendance data
  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (
        !selectedEmployee ||
        !payrollData.payPeriodStart ||
        !payrollData.payPeriodEnd
      ) {
        setAttendanceData({
          absentDays: [],
          halfDays: [],
          workHoursPerDay: [],
          totalWorkingDays: 0,
          totalActualHours: "0h 0m",
          totalActualMinutes: 0,
        });
        return;
      }

      setAttendanceLoading(true);

      try {
        const startDate = new Date(payrollData.payPeriodStart);
        const endDate = new Date(payrollData.payPeriodEnd);

        console.log("Fetching attendance for:", {
          employee: selectedEmployee.name,
          startDate: startDate.toDateString(),
          endDate: endDate.toDateString(),
          employeeId: selectedEmployee.employeeId,
        });

        // Try multiple collection patterns for attendance
        const attendanceCollections = [
          "attendance",
          `owners/${ownerId}/businesses/${businessId}/attendance`,
          `businesses/${businessId}/attendance`,
        ];

        let attendanceRecords = [];
        let foundAttendance = false;

        for (const collectionPath of attendanceCollections) {
          try {
            let attendanceQuery;

            if (collectionPath.includes("/")) {
              // For nested collections
              attendanceQuery = query(
                collection(db, collectionPath),
                where("employeeId", "==", selectedEmployee.employeeId)
              );
            } else {
              // For flat collections
              attendanceQuery = query(
                collection(db, collectionPath),
                where("ownerId", "==", ownerId),
                where("businessId", "==", businessId),
                where("employeeId", "==", selectedEmployee.employeeId)
              );
            }

            const querySnapshot = await getDocs(attendanceQuery);
            console.log(
              `Found ${querySnapshot.size} attendance records in ${collectionPath}`
            );

            if (querySnapshot.size > 0) {
              foundAttendance = true;
              querySnapshot.forEach((doc) => {
                attendanceRecords.push({ id: doc.id, ...doc.data() });
              });
              break; // Use the first collection that has data
            }
          } catch (error) {
            console.warn(`Error querying ${collectionPath}:`, error);
          }
        }

        if (!foundAttendance) {
          console.warn("No attendance data found in any collection");
          // Calculate working days based on date range if no attendance data
          const totalDays =
            Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
          const weekdays = [];
          for (
            let d = new Date(startDate);
            d <= endDate;
            d.setDate(d.getDate() + 1)
          ) {
            if (d.getDay() !== 0 && d.getDay() !== 6) {
              // Exclude weekends
              weekdays.push(d.toISOString().split("T")[0]);
            }
          }

          setAttendanceData({
            absentDays: [],
            halfDays: [],
            workHoursPerDay: [],
            totalWorkingDays: weekdays.length,
            totalActualHours: "0h 0m",
            totalActualMinutes: 0,
            estimatedDays: true, // Flag to indicate this is estimated
          });
          return;
        }

        const absentDays = [];
        const halfDays = [];
        const workHoursPerDay = [];
        let totalMinutes = 0;

        // Process attendance records
        attendanceRecords.forEach((record) => {
          // Extract date from document ID or data
          let recordDate;

          // Try different date field names
          if (record.date) {
            recordDate = convertFirestoreDate(record.date);
          } else if (record.attendanceDate) {
            recordDate = convertFirestoreDate(record.attendanceDate);
          } else if (record.id.includes("_")) {
            // Extract date from document ID (common pattern: ownerId_businessId_date_employeeId)
            const parts = record.id.split("_");
            const datePart = parts.find((part) =>
              part.match(/\d{4}-\d{2}-\d{2}/)
            );
            if (datePart) {
              recordDate = new Date(datePart);
            }
          }

          if (!recordDate || recordDate < startDate || recordDate > endDate) {
            return; // Skip records outside date range
          }

          const dateString = recordDate.toISOString().split("T")[0];

          if (record.status === "absent") {
            absentDays.push(dateString);
          } else if (record.status === "half_day") {
            halfDays.push(dateString);
          } else if (
            record.status === "present" &&
            record.inTime &&
            record.outTime
          ) {
            const workMinutes = calculateWorkDuration(
              record.inTime,
              record.outTime
            );
            const formattedHours = formatMinutesToHours(workMinutes);

            workHoursPerDay.push({
              date: dateString,
              totalHours: formattedHours,
              minutes: workMinutes,
              inTime: record.inTime,
              outTime: record.outTime,
            });

            totalMinutes += workMinutes;
          }
        });

        const totalWorkingDays = workHoursPerDay.length + halfDays.length;
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = Math.floor(totalMinutes % 60);

        console.log("Attendance summary:", {
          totalWorkingDays,
          presentDays: workHoursPerDay.length,
          halfDays: halfDays.length,
          absentDays: absentDays.length,
          totalMinutes,
        });

        setAttendanceData({
          absentDays: absentDays.sort(),
          halfDays: halfDays.sort(),
          workHoursPerDay: workHoursPerDay.sort(
            (a, b) => new Date(a.date) - new Date(b.date)
          ),
          totalWorkingDays,
          totalActualHours: `${totalHours}h ${remainingMinutes}m`,
          totalActualMinutes: totalMinutes,
        });

        // Auto-calculate overtime
        const expectedMinutes =
          totalWorkingDays *
          parseFloat(payrollData.workingHoursPerDay || 8) *
          60;
        const overtimeMinutes = Math.max(0, totalMinutes - expectedMinutes);
        const overtimeHours = (overtimeMinutes / 60).toFixed(2);

        if (overtimeMinutes > 0) {
          setPayrollData((prev) => ({ ...prev, overtimeHours: overtimeHours }));
        }
      } catch (error) {
        console.error("Error fetching attendance data:", error);
        toast.error("Failed to fetch attendance data");

        // Fallback: estimate working days based on date range
        const startDate = new Date(payrollData.payPeriodStart);
        const endDate = new Date(payrollData.payPeriodEnd);
        const weekdays = [];
        for (
          let d = new Date(startDate);
          d <= endDate;
          d.setDate(d.getDate() + 1)
        ) {
          if (d.getDay() !== 0 && d.getDay() !== 6) {
            // Exclude weekends
            weekdays.push(d.toISOString().split("T")[0]);
          }
        }

        setAttendanceData({
          absentDays: [],
          halfDays: [],
          workHoursPerDay: [],
          totalWorkingDays: weekdays.length,
          totalActualHours: "0h 0m",
          totalActualMinutes: 0,
          estimatedDays: true,
        });
      } finally {
        setAttendanceLoading(false);
      }
    };

    fetchAttendanceData();
  }, [
    selectedEmployee,
    ownerId,
    businessId,
    payrollData.payPeriodStart,
    payrollData.payPeriodEnd,
    payrollData.workingHoursPerDay,
  ]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPayrollData((prev) => ({ ...prev, [name]: value }));
  };

  // Allowances management
  const addAllowance = () => {
    setAllowances([...allowances, { reason: "", amount: "" }]);
  };

  const removeAllowance = (index) => {
    setAllowances(allowances.filter((_, i) => i !== index));
  };

  const updateAllowance = (index, field, value) => {
    const updated = [...allowances];
    updated[index] = { ...updated[index], [field]: value };
    setAllowances(updated);
  };

  // Deductions management
  const addDeduction = () => {
    setDeductions([...deductions, { reason: "", amount: "" }]);
  };

  const removeDeduction = (index) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const updateDeduction = (index, field, value) => {
    const updated = [...deductions];
    updated[index] = { ...updated[index], [field]: value };
    setDeductions(updated);
  };

  // Calculate expected hours
  const calculateExpectedHours = () => {
    const workingDays = attendanceData.totalWorkingDays || 0;
    const hoursPerDay = parseFloat(payrollData.workingHoursPerDay) || 8;
    return workingDays * hoursPerDay;
  };

  // Calculate overtime amount
  const calculateOvertime = () => {
    const hours = parseFloat(payrollData.overtimeHours) || 0;
    const rate = parseFloat(payrollData.overtimeRate) || 0;
    return hours * rate;
  };

  // Calculate basic pay - use working days even if estimated
  const calculateBasicPay = () => {
    const dailyRate = parseFloat(selectedEmployee?.payRate) || 0;
    const workingDays = attendanceData.totalWorkingDays || 0;
    return dailyRate * workingDays;
  };

  // Calculate total earnings
  const calculateTotalEarnings = () => {
    const basic = calculateBasicPay();
    const overtime = calculateOvertime();
    const bonus = parseFloat(payrollData.bonus) || 0;
    const totalAllowances = allowances.reduce((sum, item) => {
      const amount = parseFloat(item.amount || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    return basic + overtime + bonus + totalAllowances;
  };

  // Calculate total deductions
  const calculateTotalDeductions = () => {
    const totalDeductions = deductions.reduce((sum, item) => {
      const amount = parseFloat(item.amount || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const advance = parseFloat(payrollData.advance) || 0;

    // Calculate total advance payments to be deducted
    const totalAdvanceDeductions = advancePayments
      .filter((advance) => advance.repaymentMethod === "deduct_from_salary")
      .reduce((sum, advance) => sum + (parseFloat(advance.amount) || 0), 0);

    return totalDeductions + advance + totalAdvanceDeductions;
  };

  // Calculate net pay
  const calculateNetPay = () => {
    return calculateTotalEarnings() - calculateTotalDeductions();
  };

  // Print functionality
  const handlePrint = () => {
    const printContent = document.getElementById("paysheet-print");
    const winPrint = window.open(
      "",
      "",
      "left=0,top=0,width=800,height=600,toolbar=0,scrollbars=0,status=0"
    );
    winPrint.document.write(`
      <html>
        <head>
          <title>Paysheet - ${selectedEmployee?.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .total { border-top: 2px solid #333; padding-top: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    winPrint.document.close();
    winPrint.focus();
    winPrint.print();
    winPrint.close();
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }

    if (!payrollData.payPeriodStart || !payrollData.payPeriodEnd) {
      toast.error("Please select pay period dates");
      return;
    }

    if (!currentUser) {
      toast.error("Authentication required. Please log in again.");
      return;
    }

    setLoading(true);
    try {
      const paysheetId = `${selectedEmployee.id}_${payrollData.payPeriodStart}_${payrollData.payPeriodEnd}`;

      const paysheetData = {
        employeeId: selectedEmployee.employeeId,
        employeeName: selectedEmployee.name,
        employeeDocId: selectedEmployee.id,
        payRate: parseFloat(selectedEmployee.payRate) || 0,
        workingHoursPerDay: parseFloat(payrollData.workingHoursPerDay) || 8,
        expectedHours: calculateExpectedHours(),
        actualHours: attendanceData.totalActualMinutes / 60,
        basicPay: calculateBasicPay(),
        overtimeHours: parseFloat(payrollData.overtimeHours) || 0,
        overtimeRate: parseFloat(payrollData.overtimeRate) || 0,
        overtimeAmount: calculateOvertime(),
        bonus: parseFloat(payrollData.bonus) || 0,
        allowances: allowances,
        totalAllowancesAmount: allowances.reduce(
          (sum, item) => sum + (parseFloat(item.amount) || 0),
          0
        ),
        deductions: deductions,
        totalDeductionsAmount: deductions.reduce(
          (sum, item) => sum + (parseFloat(item.amount) || 0),
          0
        ),
        advance: parseFloat(payrollData.advance) || 0,
        advancePayments: advancePayments,
        advancePaymentsTotal: advancePayments
          .filter((advance) => advance.repaymentMethod === "deduct_from_salary")
          .reduce((sum, advance) => sum + advance.amount, 0),
        totalEarnings: calculateTotalEarnings(),
        totalDeductions: calculateTotalDeductions(),
        netPay: calculateNetPay(),
        payPeriodStart: new Date(payrollData.payPeriodStart),
        payPeriodEnd: new Date(payrollData.payPeriodEnd),
        notes: payrollData.notes,
        businessId: businessId,
        ownerId: currentUser.uid,
        createdBy: currentUser.uid,
        createdAt: new Date(),
        status: "generated",
      };
      const dbPath = `owners/${ownerId}/businesses/${businessId}/paysheets`;
      await addDoc(collection(db, dbPath), paysheetData);
      toast.success("Paysheet generated successfully!");

      // Reset form
      setPayrollData({
        workingHoursPerDay: "8",
        overtimeHours: "",
        overtimeRate: "",
        bonus: "",
        advance: "",
        payPeriodStart: "",
        payPeriodEnd: "",
        notes: "",
      });
      setAllowances([]);
      setDeductions([]);
      setAdvancePayments([]);
    } catch (error) {
      console.error("Error generating paysheet:", error);
      toast.error("Failed to generate paysheet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Generate Employee Paysheet
        </h1>
        <p className="text-gray-600">
          Create detailed salary slips with attendance tracking and advance
          deductions
        </p>
      </div>

      {/* Employee Selection */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        {!selectedEmployee && (
          <div className="mb-6">
            <div className="text-center py-8 border-2 border-dashed border-blue-200">
              <div className="flex flex-col items-center">
                <div className="bg-blue-100 p-3 rounded-full mb-3">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Generate Employee Paysheet
                </h2>
                <p className="text-gray-600 text-sm">
                  Select an employee below to start creating their salary slip
                </p>
              </div>
            </div>
          </div>
        )}

        <EmployeeDropdown
          selectedEmployee={selectedEmployee}
          onEmployeeSelect={setSelectedEmployee}
          label="Select Employee"
          placeholder="Choose an employee for payroll"
          required={true}
          showEmployeeDetails={true}
        />

        {/* Pay Period Selection */}
        {selectedEmployee && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pay Period Start <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="payPeriodStart"
                value={payrollData.payPeriodStart}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pay Period End <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="payPeriodEnd"
                value={payrollData.payPeriodEnd}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>
        )}

        {/* Enhanced Advance Payments Alert */}
        {selectedEmployee &&
          payrollData.payPeriodStart &&
          payrollData.payPeriodEnd && (
            <div className="mt-6 bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center mb-2">
                <svg
                  className="w-5 h-5 text-orange-600 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h4 className="text-sm font-medium text-orange-800">
                  Advance Payments Status
                </h4>
                {advancesLoading && (
                  <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                )}
              </div>

              {advancesLoading ? (
                <p className="text-sm text-orange-700">
                  Checking for advance payments...
                </p>
              ) : advancePayments.length > 0 ? (
                <div>
                  <p className="text-sm text-orange-700 mb-2">
                    Found {advancePayments.length} advance payment(s) in this
                    pay period
                  </p>
                  <div className="text-xs text-orange-600">
                    Auto-deducted: Rs.
                    {advancePayments
                      .filter(
                        (advance) =>
                          advance.repaymentMethod === "deduct_from_salary"
                      )
                      .reduce((sum, advance) => sum + advance.amount, 0)
                      .toFixed(2)}{" "}
                    • Not deducted: Rs.
                    {advancePayments
                      .filter(
                        (advance) =>
                          advance.repaymentMethod !== "deduct_from_salary"
                      )
                      .reduce((sum, advance) => sum + advance.amount, 0)
                      .toFixed(2)}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-orange-700">
                  No advance payments found in this pay period
                </p>
              )}

              {/* Debug Information */}
              {advanceDebugInfo && (
                <details className="mt-3">
                  <summary className="text-xs text-orange-600 cursor-pointer hover:text-orange-800">
                    Debug Info (Click to expand)
                  </summary>
                  <pre className="text-xs text-gray-600 mt-2 bg-gray-100 p-2 rounded whitespace-pre-wrap">
                    {advanceDebugInfo}
                  </pre>
                </details>
              )}
            </div>
          )}
      </div>

      {/* Attendance Summary & Configuration */}
      {selectedEmployee &&
        payrollData.payPeriodStart &&
        payrollData.payPeriodEnd && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="bg-indigo-100 p-2 rounded-full mr-3">
                <svg
                  className="w-5 h-5 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                Attendance Summary & Configuration
              </h3>
              {attendanceLoading && (
                <div className="ml-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                </div>
              )}
            </div>

            {attendanceLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading attendance data...</p>
              </div>
            ) : (
              <>
                {/* Configuration Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-2 rounded-full mr-3">
                        <svg
                          className="w-4 h-4 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 font-medium">
                          Working Hours Per Day
                        </p>
                        <p className="text-xl font-bold text-blue-800">
                          {payrollData.workingHoursPerDay}h
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center">
                      <div className="bg-green-100 p-2 rounded-full mr-3">
                        <svg
                          className="w-4 h-4 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-green-700 font-medium">
                          Daily Pay Rate
                        </p>
                        <p className="text-xl font-bold text-green-800">
                          Rs.{selectedEmployee.payRate || "0.00"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="flex items-center">
                      <div className="bg-purple-100 p-2 rounded-full mr-3">
                        <svg
                          className="w-4 h-4 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-purple-700 font-medium">
                          Total Working Days
                        </p>
                        <p className="text-xl font-bold text-purple-800">
                          {attendanceData.totalWorkingDays}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="flex items-center">
                      <div className="bg-orange-100 p-2 rounded-full mr-3">
                        <svg
                          className="w-4 h-4 text-orange-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-orange-700 font-medium">
                          Expected Hours
                        </p>
                        <p className="text-xl font-bold text-orange-800">
                          {calculateExpectedHours()}h
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attendance Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Actual Hours Worked */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Actual Hours Worked
                    </h4>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {attendanceData.totalActualHours}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Total hours in period
                      </p>
                      {attendanceData.estimatedDays && (
                        <p className="text-xs text-yellow-600 mt-1">
                          ⚠️ No attendance data found
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Attendance Breakdown */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Attendance Breakdown
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Present Days:</span>
                        <span className="font-medium">
                          {attendanceData.workHoursPerDay.length}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-yellow-600">Half Days:</span>
                        <span className="font-medium">
                          {attendanceData.halfDays.length}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-red-600">Absent Days:</span>
                        <span className="font-medium">
                          {attendanceData.absentDays.length}
                        </span>
                      </div>
                      {attendanceData.estimatedDays && (
                        <div className="text-xs text-yellow-600 mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                          Working days estimated from date range (weekdays only)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hours Variance */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Hours Variance
                    </h4>
                    <div className="text-center">
                      <p
                        className={`text-2xl font-bold ${
                          attendanceData.totalActualMinutes / 60 >=
                          calculateExpectedHours()
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {(
                          attendanceData.totalActualMinutes / 60 -
                          calculateExpectedHours()
                        ).toFixed(1)}
                        h
                      </p>
                      <p className="text-xs text-gray-500">
                        {attendanceData.totalActualMinutes / 60 >=
                        calculateExpectedHours()
                          ? "Overtime"
                          : "Shortfall"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Attendance Debug Info (only show if there are issues) */}
                {attendanceData.estimatedDays && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h5 className="text-sm font-medium text-yellow-800 mb-2">
                      Attendance Data Notice
                    </h5>
                    <div className="text-xs text-yellow-700 space-y-1">
                      <p>
                        • No attendance records found for this employee in the
                        selected date range
                      </p>
                      <p>
                        • Working days calculated as weekdays only (Mon-Fri)
                      </p>
                      <p>
                        • To get accurate calculations, ensure attendance data
                        is recorded
                      </p>
                      <p>
                        • Check if attendance is stored in: attendance
                        collection with employeeId "
                        {selectedEmployee?.employeeId}"
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Enhanced Advance Payments Alert */}
            {payrollData.payPeriodStart && payrollData.payPeriodEnd && (
              <div className="mt-6 bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="flex items-center mb-2">
                  <svg
                    className="w-5 h-5 text-orange-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h4 className="text-sm font-medium text-orange-800">
                    Advance Payments Status
                  </h4>
                  {advancesLoading && (
                    <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                  )}
                </div>

                {advancesLoading ? (
                  <p className="text-sm text-orange-700">
                    Checking for advance payments...
                  </p>
                ) : advancePayments.length > 0 ? (
                  <div>
                    <p className="text-sm text-orange-700 mb-2">
                      Found {advancePayments.length} advance payment(s) in this
                      pay period
                    </p>
                    <div className="text-xs text-orange-600">
                      Auto-deducted: Rs.
                      {advancePayments
                        .filter(
                          (advance) =>
                            advance.repaymentMethod === "deduct_from_salary"
                        )
                        .reduce((sum, advance) => sum + advance.amount, 0)
                        .toFixed(2)}{" "}
                      • Not deducted: Rs.
                      {advancePayments
                        .filter(
                          (advance) =>
                            advance.repaymentMethod !== "deduct_from_salary"
                        )
                        .reduce((sum, advance) => sum + advance.amount, 0)
                        .toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-orange-700">
                    No advance payments found in this pay period
                  </p>
                )}

                {/* Debug Information */}
                {advanceDebugInfo && (
                  <details className="mt-3">
                    <summary className="text-xs text-orange-600 cursor-pointer hover:text-orange-800">
                      Debug Info (Click to expand)
                    </summary>
                    <pre className="text-xs text-gray-600 mt-2 bg-gray-100 p-2 rounded whitespace-pre-wrap">
                      {advanceDebugInfo}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

      {/* Payroll Calculation Form */}
      {selectedEmployee && !attendanceLoading && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Earnings Section with OT Details */}
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-blue-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-blue-800">
                    Earnings Breakdown
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Basic Pay */}
                <div className="bg-white p-4 rounded-lg border border-blue-300">
                  <div className="text-center">
                    <p className="text-sm text-blue-700 font-medium">
                      Basic Pay
                    </p>
                    <p className="text-xl font-bold text-blue-800">
                      Rs.{calculateBasicPay().toFixed(2)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {attendanceData.totalWorkingDays} days × Rs.
                      {selectedEmployee?.payRate || 0}
                    </p>
                  </div>
                </div>

                {/* Overtime */}
                <div className="bg-white p-4 rounded-lg border border-blue-300">
                  <div className="text-center">
                    <p className="text-sm text-blue-700 font-medium">
                      Overtime
                    </p>
                    <p className="text-xl font-bold text-blue-800">
                      Rs.{calculateOvertime().toFixed(2)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {parseFloat(payrollData.overtimeHours) || 0}h × Rs.
                      {parseFloat(payrollData.overtimeRate) || 0}
                    </p>
                  </div>
                </div>

                {/* Bonus */}
                <div className="bg-white p-4 rounded-lg border border-blue-300">
                  <div className="text-center">
                    <p className="text-sm text-blue-700 font-medium">Bonus</p>
                    <p className="text-xl font-bold text-blue-800">
                      Rs.{(parseFloat(payrollData.bonus) || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Performance/Special bonus
                    </p>
                  </div>
                </div>

                {/* Allowances Total */}
                <div className="bg-white p-4 rounded-lg border border-blue-300">
                  <div className="text-center">
                    <p className="text-sm text-blue-700 font-medium">
                      Allowances
                    </p>
                    <p className="text-xl font-bold text-blue-800">
                      Rs.
                      {allowances
                        .reduce(
                          (sum, item) => sum + parseFloat(item.amount || 0),
                          0
                        )
                        .toFixed(2)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {allowances.length} allowance(s)
                    </p>
                  </div>
                </div>
              </div>

              {/* Overtime Configuration */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded border border-blue-300">
                  <h5 className="text-sm font-medium text-blue-800 mb-2">
                    Overtime Configuration
                  </h5>
                  <div className="text-xs text-blue-700 space-y-1">
                    <div>Expected: {calculateExpectedHours()}h</div>
                    <div>
                      Actual:{" "}
                      {(attendanceData.totalActualMinutes / 60).toFixed(1)}h
                    </div>
                    <div>
                      Auto-calculated OT:{" "}
                      {Math.max(
                        0,
                        attendanceData.totalActualMinutes / 60 -
                          calculateExpectedHours()
                      ).toFixed(1)}
                      h
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded border border-blue-300">
                  <h5 className="text-sm font-medium text-blue-800 mb-2">
                    Earnings Summary
                  </h5>
                  <div className="text-xs text-blue-700 space-y-1">
                    <div>
                      Gross Earnings: Rs.{calculateTotalEarnings().toFixed(2)}
                    </div>
                    <div>
                      Total Deductions: Rs.
                      {calculateTotalDeductions().toFixed(2)}
                    </div>
                    <div className="font-bold">
                      Net Pay: Rs.{calculateNetPay().toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payroll Configuration Options */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <div className="flex items-center mb-4">
                <svg
                  className="w-5 h-5 text-gray-600 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-800">
                  Payroll Configuration
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Working Hours Configuration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Working Hours Per Day{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="workingHoursPerDay"
                    value={payrollData.workingHoursPerDay}
                    onChange={handleInputChange}
                    step="0.5"
                    min="1"
                    max="24"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Standard working hours per day
                  </p>
                </div>

                {/* Daily Pay Rate (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Pay Rate
                  </label>
                  <input
                    type="text"
                    value={`Rs.${selectedEmployee?.payRate || 0}`}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Employee's daily rate (from profile)
                  </p>
                </div>

                {/* Expected Monthly Salary */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Monthly Salary
                  </label>
                  <input
                    type="text"
                    value={`Rs.${(
                      (parseFloat(selectedEmployee?.payRate) || 0) * 30
                    ).toFixed(2)}`}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Estimated monthly salary (30 days)
                  </p>
                </div>
              </div>
            </div>

            {/* Overtime Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overtime Hours
                </label>
                <input
                  type="number"
                  name="overtimeHours"
                  value={payrollData.overtimeHours}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-calculated:{" "}
                  {Math.max(
                    0,
                    attendanceData.totalActualMinutes / 60 -
                      calculateExpectedHours()
                  ).toFixed(1)}
                  h
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overtime Rate (per hour)
                </label>
                <input
                  type="number"
                  name="overtimeRate"
                  value={payrollData.overtimeRate}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Suggested: Rs.
                  {(
                    ((parseFloat(selectedEmployee?.payRate) || 0) /
                      parseFloat(payrollData.workingHoursPerDay)) *
                    1.5
                  ).toFixed(2)}{" "}
                  (1.5x hourly rate)
                </p>
              </div>
            </div>

            {/* Bonus and Additional Pay */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bonus
                </label>
                <input
                  type="number"
                  name="bonus"
                  value={payrollData.bonus}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Performance bonus, holiday bonus, etc.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Advance Payment
                </label>
                <input
                  type="number"
                  name="advance"
                  value={payrollData.advance}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Additional advance not from the advance payments system
                </p>
              </div>
            </div>

            {/* Allowances Section */}
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-green-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-green-800">
                    Allowances
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={addAllowance}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  Add Allowance
                </button>
              </div>

              {allowances.length === 0 ? (
                <div className="text-center py-4 border-2 border-dashed border-green-300 rounded-lg">
                  <p className="text-green-700 text-sm">
                    No allowances added. Click "Add Allowance" to include
                    benefits.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allowances.map((allowance, index) => (
                    <div
                      key={index}
                      className="flex gap-3 items-center bg-white p-3 rounded-lg border border-green-300"
                    >
                      <input
                        type="text"
                        placeholder="Allowance reason (e.g., Transport, Food, etc.)"
                        value={allowance.reason}
                        onChange={(e) =>
                          updateAllowance(index, "reason", e.target.value)
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <input
                        type="number"
                        placeholder="Amount"
                        value={allowance.amount}
                        onChange={(e) =>
                          updateAllowance(index, "amount", e.target.value)
                        }
                        step="0.01"
                        min="0"
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeAllowance(index)}
                        className="text-red-500 hover:text-red-700 p-2"
                        title="Remove allowance"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}

                  <div className="bg-white p-3 rounded-lg border border-green-300">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-green-800">
                        Total Allowances:
                      </span>
                      <span className="font-bold text-green-800">
                        Rs.
                        {allowances
                          .reduce(
                            (sum, item) => sum + parseFloat(item.amount || 0),
                            0
                          )
                          .toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Deductions Section */}
            <div className="bg-red-50 p-6 rounded-lg border border-red-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-red-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M20 12H4"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-red-800">
                    Deductions
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={addDeduction}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Add Deduction
                </button>
              </div>

              {deductions.length === 0 ? (
                <div className="text-center py-4 border-2 border-dashed border-red-300 rounded-lg">
                  <p className="text-red-700 text-sm">
                    No deductions added. Click "Add Deduction" to include any
                    deductions.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deductions.map((deduction, index) => (
                    <div
                      key={index}
                      className="flex gap-3 items-center bg-white p-3 rounded-lg border border-red-300"
                    >
                      <input
                        type="text"
                        placeholder="Deduction reason (e.g., Tax, Insurance, etc.)"
                        value={deduction.reason}
                        onChange={(e) =>
                          updateDeduction(index, "reason", e.target.value)
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      <input
                        type="number"
                        placeholder="Amount"
                        value={deduction.amount}
                        onChange={(e) =>
                          updateDeduction(index, "amount", e.target.value)
                        }
                        step="0.01"
                        min="0"
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeDeduction(index)}
                        className="text-red-500 hover:text-red-700 p-2"
                        title="Remove deduction"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}

                  <div className="bg-white p-3 rounded-lg border border-red-300">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-red-800">
                        Total Deductions:
                      </span>
                      <span className="font-bold text-red-800">
                        Rs.
                        {deductions
                          .reduce(
                            (sum, item) => sum + parseFloat(item.amount || 0),
                            0
                          )
                          .toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Advance Payments Display */}
            {/* <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Advance Payments Found (Auto-deducted)
                </label>
                {advancesLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
              </div>

              {advancesLoading ? (
                <div className="text-gray-500 text-sm text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                  Loading advance payments...
                </div>
              ) : advancePayments.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-4 border-2 border-dashed border-green-300 bg-green-50 rounded-lg">
                  No advance payments found in this pay period
                </div>
              ) : (
                <div className="space-y-2">
                  {advancePayments.map((advance, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {advance.reason}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDateForDisplay(advance.paymentDate)} •
                          {advance.repaymentMethod === "deduct_from_salary"
                            ? " Will be deducted"
                            : " Not auto-deducted"}
                          {advance.collectionSource &&
                            ` • Source: ${advance.collectionSource}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-bold ${
                            advance.repaymentMethod === "deduct_from_salary"
                              ? "text-red-600"
                              : "text-gray-500"
                          }`}
                        >
                          {advance.repaymentMethod === "deduct_from_salary"
                            ? "-"
                            : ""}
                          Rs.{advance.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <p className="text-sm font-semibold text-red-800">
                      Total Auto-deducted: Rs.
                      {advancePayments
                        .filter(
                          (advance) =>
                            advance.repaymentMethod === "deduct_from_salary"
                        )
                        .reduce((sum, advance) => sum + advance.amount, 0)
                        .toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div> */}

            {/* Summary Calculations */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Payroll Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
                  <p className="text-2xl font-bold text-green-600">
                    Rs.{calculateTotalEarnings().toFixed(2)}
                  </p>
                  <div className="text-xs text-gray-500 mt-1 space-y-1">
                    <div>Basic Pay: Rs.{calculateBasicPay().toFixed(2)}</div>
                    <div>Overtime: Rs.{calculateOvertime().toFixed(2)}</div>
                    <div>
                      Bonus: Rs.
                      {(parseFloat(payrollData.bonus) || 0).toFixed(2)}
                    </div>
                    <div>
                      Allowances: Rs.
                      {allowances
                        .reduce(
                          (sum, item) => sum + parseFloat(item.amount || 0),
                          0
                        )
                        .toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-red-200">
                  <p className="text-sm text-gray-600 mb-1">Total Deductions</p>
                  <p className="text-2xl font-bold text-red-600">
                    Rs.{calculateTotalDeductions().toFixed(2)}
                  </p>
                  <div className="text-xs text-gray-500 mt-1 space-y-1">
                    {deductions.length > 0 && (
                      <div>
                        Itemized: Rs.
                        {deductions
                          .reduce(
                            (sum, item) => sum + parseFloat(item.amount || 0),
                            0
                          )
                          .toFixed(2)}
                      </div>
                    )}
                    {parseFloat(payrollData.advance || 0) > 0 && (
                      <div>
                        Additional Advance: Rs.
                        {parseFloat(payrollData.advance || 0).toFixed(2)}
                      </div>
                    )}
                    {advancePayments.filter(
                      (advance) =>
                        advance.repaymentMethod === "deduct_from_salary"
                    ).length > 0 && (
                      <div>
                        Auto-deducted Advances: Rs.
                        {advancePayments
                          .filter(
                            (advance) =>
                              advance.repaymentMethod === "deduct_from_salary"
                          )
                          .reduce((sum, advance) => sum + advance.amount, 0)
                          .toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border-2 border-blue-400">
                  <p className="text-sm text-gray-600 mb-1">Net Pay</p>
                  <p className="text-3xl font-bold text-blue-800">
                    Rs.{calculateNetPay().toFixed(2)}
                  </p>
                  <div className="text-xs text-gray-500 mt-1">
                    Final amount to pay
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={payrollData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Add any additional notes for this paysheet..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Generating...
                  </div>
                ) : (
                  "Generate Paysheet"
                )}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={!selectedEmployee}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Print Preview
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Print Content */}
      <div id="paysheet-print" className="hidden print:block">
        {selectedEmployee && (
          <div>
            <div className="header">
              <h1>Paysheet</h1>
              <h2>{selectedEmployee.name}</h2>
              <p>
                Pay Period: {payrollData.payPeriodStart} to{" "}
                {payrollData.payPeriodEnd}
              </p>
            </div>

            <div className="section">
              <h3>Earnings</h3>
              <div>Basic Pay: Rs.{calculateBasicPay().toFixed(2)}</div>
              <div>Overtime: Rs.{calculateOvertime().toFixed(2)}</div>
              <div>
                Bonus: Rs.{(parseFloat(payrollData.bonus) || 0).toFixed(2)}
              </div>
              {allowances.length > 0 && (
                <div>
                  <strong>Allowances:</strong>
                  {allowances.map((allowance, index) => (
                    <div key={index} style={{ marginLeft: "20px" }}>
                      {allowance.reason}: Rs.
                      {(parseFloat(allowance.amount) || 0).toFixed(2)}
                    </div>
                  ))}
                </div>
              )}
              <div>
                <strong>
                  Total Earnings: Rs.{calculateTotalEarnings().toFixed(2)}
                </strong>
              </div>
            </div>

            <div className="section">
              <h3>Deductions</h3>
              <div>
                {deductions.length > 0 && (
                  <div>
                    <strong>Deductions:</strong>
                    {deductions.map((deduction, index) => (
                      <div key={index} style={{ marginLeft: "20px" }}>
                        {deduction.reason}: Rs.
                        {(parseFloat(deduction.amount) || 0).toFixed(2)}
                      </div>
                    ))}
                  </div>
                )}
                {parseFloat(payrollData.advance || 0) > 0 && (
                  <div>
                    Additional Advance: Rs.
                    {(parseFloat(payrollData.advance) || 0).toFixed(2)}
                  </div>
                )}
                {advancePayments.filter(
                  (advance) => advance.repaymentMethod === "deduct_from_salary"
                ).length > 0 && (
                  <div>
                    <strong>Advance Payments (Auto-deducted):</strong>
                    {advancePayments
                      .filter(
                        (advance) =>
                          advance.repaymentMethod === "deduct_from_salary"
                      )
                      .map((advance, index) => (
                        <div key={index} style={{ marginLeft: "20px" }}>
                          {advance.reason} (
                          {formatDateForDisplay(advance.paymentDate)}): Rs.
                          {advance.amount.toFixed(2)}
                        </div>
                      ))}
                  </div>
                )}
                <div>
                  <strong>
                    Total Deductions: Rs.{calculateTotalDeductions().toFixed(2)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="section total">
              <h3>NET PAY: Rs.{calculateNetPay().toFixed(2)}</h3>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaySheet;
