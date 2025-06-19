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

  // Payroll form data - Fixed: Initialize all values as strings to prevent controlled/uncontrolled input error
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

  const businessId = currentBusiness.id;
  const ownerId = currentUser.uid;

  // Helper function to parse time and handle cross-midnight scenarios
  const parseTimeToMinutes = (timeString) => {
    const [hours, minutes, seconds] = timeString.split(":").map(Number);
    return hours * 60 + minutes + (seconds || 0) / 60;
  };

  // Helper function to calculate work duration considering cross-midnight
  const calculateWorkDuration = (inTime, outTime) => {
    const inMinutes = parseTimeToMinutes(inTime);
    let outMinutes = parseTimeToMinutes(outTime);

    // If outTime is less than inTime, it means work continued past midnight
    if (outMinutes < inMinutes) {
      outMinutes += 24 * 60; // Add 24 hours worth of minutes
    }

    return outMinutes - inMinutes;
  };

  // Helper function to format minutes to hours and minutes
  const formatMinutesToHours = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    return `${hours}h ${minutes}m`;
  };

  // Helper function to check if date is within pay period
  const isDateInPeriod = (dateString, startDate, endDate) => {
    if (!startDate || !endDate) return true;
    const date = new Date(dateString);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return date >= start && date <= end;
  };

  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!selectedEmployee) {
        setAttendanceData({
          absentDays: [],
          halfDays: [],
          workHoursPerDay: [],
          totalWorkingDays: 0,
          totalActualHours: 0,
          totalActualMinutes: 0,
        });
        return;
      }

      setAttendanceLoading(true);
      const attendanceCollectionRef = collection(
        db,
        `owners/${ownerId}/businesses/${businessId}/employees/${selectedEmployee.id}/attendance`
      );

      try {
        const snapshot = await getDocs(attendanceCollectionRef);
        const absentDays = [];
        const halfDays = [];
        const workHoursPerDay = [];
        let totalMinutes = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          const dateId = doc.id;

          // Filter by pay period if dates are selected
          if (
            !isDateInPeriod(
              dateId,
              payrollData.payPeriodStart,
              payrollData.payPeriodEnd
            )
          ) {
            return;
          }

          if (data.status === "absent") {
            absentDays.push(dateId);
          } else if (data.status === "half_day") {
            halfDays.push(dateId);
          } else if (data.status === "present" && data.inTime && data.outTime) {
            const workMinutes = calculateWorkDuration(
              data.inTime,
              data.outTime
            );
            const formattedHours = formatMinutesToHours(workMinutes);

            workHoursPerDay.push({
              date: dateId,
              totalHours: formattedHours,
              minutes: workMinutes,
              inTime: data.inTime,
              outTime: data.outTime,
            });

            totalMinutes += workMinutes;
          }
        });

        const totalWorkingDays = workHoursPerDay.length + halfDays.length;
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = Math.floor(totalMinutes % 60);

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

        // Auto-calculate overtime based on expected vs actual hours
        const expectedMinutes =
          totalWorkingDays *
          parseFloat(payrollData.workingHoursPerDay || 8) *
          60;
        const overtimeMinutes = Math.max(0, totalMinutes - expectedMinutes);
        const overtimeHours = (overtimeMinutes / 60).toFixed(2);

        if (overtimeMinutes > 0) {
          setPayrollData((prev) => ({
            ...prev,
            overtimeHours: overtimeHours,
          }));
        }
      } catch (error) {
        console.error("Error fetching attendance data:", error);
        toast.error("Failed to fetch attendance data");
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

  // Enhanced advance payments fetch with better debugging
  useEffect(() => {
    const fetchAdvancePayments = async () => {
      if (
        !selectedEmployee ||
        !payrollData.payPeriodStart ||
        !payrollData.payPeriodEnd
      ) {
        setAdvancePayments([]);
        setAdvanceDebugInfo("Missing employee or date range");
        return;
      }

      setAdvancesLoading(true);
      setAdvanceDebugInfo("Loading...");

      try {
        const advancesRef = collection(
          db,
          `owners/${ownerId}/businesses/${businessId}/employees/${selectedEmployee.id}/advances`
        );

        const snapshot = await getDocs(advancesRef);
        const advances = [];
        const allAdvances = [];
        let debugMessages = [];

        const startDate = new Date(payrollData.payPeriodStart);
        const endDate = new Date(payrollData.payPeriodEnd);

        debugMessages.push(
          `Period: ${startDate.toDateString()} to ${endDate.toDateString()}`
        );
        debugMessages.push(`Total advance records found: ${snapshot.size}`);

        snapshot.forEach((doc) => {
          const data = doc.data();
          allAdvances.push({ id: doc.id, ...data });

          // More flexible date parsing
          let paymentDate;
          if (data.paymentDate?.toDate) {
            paymentDate = data.paymentDate.toDate();
          } else if (data.paymentDate) {
            paymentDate = new Date(data.paymentDate);
          } else if (data.date?.toDate) {
            paymentDate = data.date.toDate();
          } else if (data.date) {
            paymentDate = new Date(data.date);
          } else if (data.createdAt?.toDate) {
            paymentDate = data.createdAt.toDate();
          } else if (data.createdAt) {
            paymentDate = new Date(data.createdAt);
          } else {
            debugMessages.push(`Record ${doc.id}: No valid date found`);
            return;
          }

          const isInPeriod = paymentDate >= startDate && paymentDate <= endDate;

          // More flexible status checking
          const isApproved =
            data.approvalStatus === "approved" ||
            data.status === "approved" ||
            data.approved === true ||
            !data.approvalStatus; // If no approval status, assume approved

          const isNotRepaid =
            data.status !== "repaid" &&
            data.repaymentStatus !== "repaid" &&
            data.repaid !== true;

          const isAdvanceType =
            data.paymentType === "advance" ||
            data.type === "advance" ||
            !data.paymentType; // If no type specified, assume advance

          debugMessages.push(
            `Record ${
              doc.id
            }: Date=${paymentDate.toDateString()}, InPeriod=${isInPeriod}, Approved=${isApproved}, NotRepaid=${isNotRepaid}, IsAdvance=${isAdvanceType}, Amount=${
              data.amount
            }`
          );

          if (isInPeriod && isApproved && isNotRepaid && isAdvanceType) {
            advances.push({
              id: doc.id,
              amount: parseFloat(data.amount) || 0,
              reason: data.reason || data.description || "Advance Payment",
              paymentDate: paymentDate,
              repaymentMethod: data.repaymentMethod || "deduct_from_salary",
              ...data,
            });
          }
        });

        debugMessages.push(`Filtered advances: ${advances.length}`);
        setAdvanceDebugInfo(debugMessages.join("\n"));

        // Sort by payment date
        advances.sort((a, b) => a.paymentDate - b.paymentDate);
        setAdvancePayments(advances);

        if (advances.length > 0) {
          toast.success(
            `Found ${advances.length} advance payment(s) to deduct`
          );
        }
      } catch (error) {
        console.error("Error fetching advance payments:", error);
        setAdvanceDebugInfo(`Error: ${error.message}`);
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

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPayrollData((prev) => ({
      ...prev,
      [name]: value,
    }));
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

  // Deductions management - Fixed: Initialize amount as empty string
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

  // Calculate expected hours based on working days and hours per day
  const calculateExpectedHours = () => {
    const workingDays = attendanceData.totalWorkingDays;
    const hoursPerDay = parseFloat(payrollData.workingHoursPerDay) || 8;
    return workingDays * hoursPerDay;
  };

  // Calculate overtime amount
  const calculateOvertime = () => {
    const hours = parseFloat(payrollData.overtimeHours) || 0;
    const rate = parseFloat(payrollData.overtimeRate) || 0;
    return hours * rate;
  };

  // Calculate basic pay (daily rate × working days)
  const calculateBasicPay = () => {
    const dailyRate = parseFloat(selectedEmployee?.payRate) || 0;
    const workingDays = attendanceData.totalWorkingDays;
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

  // Calculate total deductions - Fixed: Now uses the deductions array properly and includes advance payments
  const calculateTotalDeductions = () => {
    const totalDeductions = deductions.reduce((sum, item) => {
      const amount = parseFloat(item.amount || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const advance = parseFloat(payrollData.advance) || 0;

    // Calculate total advance payments to be deducted (only those with repaymentMethod = "deduct_from_salary")
    const totalAdvanceDeductions = advancePayments
      .filter((advance) => advance.repaymentMethod === "deduct_from_salary")
      .reduce((sum, advance) => sum + (parseFloat(advance.amount) || 0), 0);

    return totalDeductions + advance + totalAdvanceDeductions;
  };

  // Calculate net pay
  const calculateNetPay = () => {
    return calculateTotalEarnings() - calculateTotalDeductions();
  };

  // Check if there's a shortfall in hours
  const getHoursShortfall = () => {
    const expectedMinutes = calculateExpectedHours() * 60;
    const actualMinutes = attendanceData.totalActualMinutes;
    const shortfall = Math.max(0, expectedMinutes - actualMinutes);
    return shortfall / 60;
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

    setLoading(true);

    try {
      const currentUser = auth.currentUser;
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
        createdByName: currentUser.displayName || "Unknown",
        status: "generated",
        createdAt: new Date(),
        attendanceData: attendanceData,
      };

      // Save in employee's paysheets collection
      await addDoc(
        collection(
          db,
          `owners/${ownerId}/businesses/${businessId}/employees/${selectedEmployee.id}/paysheets`
        ),
        paysheetData
      );

      // Save copy in business salary collection
      await addDoc(
        collection(db, `owners/${ownerId}/businesses/${businessId}/salary`),
        { ...paysheetData, paysheetId }
      );

      toast.success("Paysheet created successfully");

      // Reset form
      setSelectedEmployee(null);
      setAllowances([]);
      setDeductions([]);
      setAdvancePayments([]);
      setAdvanceDebugInfo("");
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
    } catch (error) {
      console.error("Error creating paysheet:", error);
      toast.error("Failed to create paysheet");
    } finally {
      setLoading(false);
    }
  };

  // Handle form reset
  const handleReset = () => {
    setSelectedEmployee(null);
    setAllowances([]);
    setDeductions([]);
    setAdvancePayments([]);
    setAdvanceDebugInfo("");
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
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Employee Selection and Pay Period */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {!selectedEmployee && (
            <div className="text-center py-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
      </div>

      {/* Attendance Summary */}
      {selectedEmployee && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <div className="bg-purple-100 p-2 rounded-full mr-3">
              <svg
                className="w-5 h-5 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              Attendance Summary
            </h3>
            {attendanceLoading && (
              <div className="ml-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              </div>
            )}
          </div>

          {attendanceLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mr-3"></div>
              <span className="text-gray-600">Loading attendance data...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Working Days */}
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-green-700 font-medium">
                        Working Days
                      </p>
                      <p className="text-2xl font-bold text-green-800">
                        {attendanceData.totalWorkingDays}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actual Hours */}
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
                        Actual Hours
                      </p>
                      <p className="text-2xl font-bold text-blue-800">
                        {attendanceData.totalActualHours}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Half Days */}
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center">
                    <div className="bg-yellow-100 p-2 rounded-full mr-3">
                      <svg
                        className="w-4 h-4 text-yellow-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-yellow-700 font-medium">
                        Half Days
                      </p>
                      <p className="text-2xl font-bold text-yellow-800">
                        {attendanceData.halfDays.length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Absent Days */}
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center">
                    <div className="bg-red-100 p-2 rounded-full mr-3">
                      <svg
                        className="w-4 h-4 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-red-700 font-medium">
                        Absent Days
                      </p>
                      <p className="text-2xl font-bold text-red-800">
                        {attendanceData.absentDays.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expected vs Actual Hours */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Expected Hours</p>
                    <p className="text-xl font-bold text-gray-800">
                      {calculateExpectedHours().toFixed(1)}h
                    </p>
                    <p className="text-xs text-gray-500">
                      {attendanceData.totalWorkingDays} days ×{" "}
                      {payrollData.workingHoursPerDay}h
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Actual Hours</p>
                    <p className="text-xl font-bold text-blue-800">
                      {(attendanceData.totalActualMinutes / 60).toFixed(1)}h
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Difference</p>
                    <p
                      className={`text-xl font-bold ${
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

              {/* Enhanced Advance Payments Alert with Debug Info */}
              {payrollData.payPeriodStart && payrollData.payPeriodEnd && (
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
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
                        Found {advancePayments.length} advance payment(s) in
                        this pay period
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
            </>
          )}
        </div>
      )}

      {/* Payroll Calculation Form */}
      {selectedEmployee && !attendanceLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="space-y-6">
            {/* Working Hours Configuration */}
            <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
              <div className="flex items-center mb-4">
                <svg
                  className="w-5 h-5 text-indigo-600 mr-2"
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
                <h3 className="text-lg font-medium text-indigo-800">
                  Configuration
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    placeholder="8"
                    step="0.5"
                    min="1"
                    max="24"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Pay Rate
                  </label>
                  <div className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                    Rs. {selectedEmployee?.payRate ?? "0.00"}
                  </div>
                </div>
              </div>
            </div>

            {/* Earnings Section */}
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <div className="flex items-center mb-4">
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
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-green-800">Earnings</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <div className="bg-green-100 p-4 rounded-lg border border-green-300 mb-4">
                    <label className="block text-sm font-medium text-green-700 mb-1">
                      Basic Pay (Daily Rate × Working Days)
                    </label>
                    <div className="flex items-center">
                      <span className="text-2xl font-bold text-green-800">
                        Rs.{calculateBasicPay().toFixed(2)}
                      </span>
                      <span className="text-sm text-green-600 ml-2">
                        (Rs.{selectedEmployee?.payRate ?? 0} ×{" "}
                        {attendanceData.totalWorkingDays} days)
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overtime Hours
                  </label>
                  <input
                    type="number"
                    name="overtimeHours"
                    value={payrollData.overtimeHours}
                    onChange={handleInputChange}
                    placeholder="0"
                    step="0.1"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {getHoursShortfall() > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      Note: {getHoursShortfall().toFixed(1)} hours shortfall
                      detected
                    </p>
                  )}
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
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bonus
                  </label>
                  <input
                    type="number"
                    name="bonus"
                    value={payrollData.bonus}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Allowances Section */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Allowances
                    </label>
                    <button
                      type="button"
                      onClick={addAllowance}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      + Add Allowance
                    </button>
                  </div>

                  {allowances.length === 0 ? (
                    <div className="text-gray-500 text-sm text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                      No allowances added. Click "Add Allowance" to add one.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allowances.map((allowance, index) => (
                        <div key={index} className="flex gap-3 items-end">
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="Allowance reason (e.g., Transport, Meal)"
                              value={allowance.reason || ""}
                              onChange={(e) =>
                                updateAllowance(index, "reason", e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                          </div>
                          <div className="w-32">
                            <input
                              type="number"
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                              value={allowance.amount || ""}
                              onChange={(e) =>
                                updateAllowance(index, "amount", e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAllowance(index)}
                            className="bg-red-500 text-white px-2 py-2 rounded text-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                            title="Remove allowance"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {allowances.length > 0 && (
                    <div className="mt-3 bg-green-100 p-3 rounded border border-green-300">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-green-700">
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
                  )}
                </div>

                {payrollData.overtimeHours && payrollData.overtimeRate && (
                  <div className="md:col-span-2">
                    <div className="bg-green-100 p-4 rounded-lg border border-green-300">
                      <label className="block text-sm font-medium text-green-700 mb-1">
                        Overtime Amount
                      </label>
                      <div className="flex items-center">
                        <span className="text-xl font-bold text-green-800">
                          Rs.{calculateOvertime().toFixed(2)}
                        </span>
                        <span className="text-sm text-green-600 ml-2">
                          ({payrollData.overtimeHours || 0}h × Rs.
                          {payrollData.overtimeRate || 0})
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Deductions Section - Fixed: Now uses multiple deductions like allowances */}
            <div className="bg-red-50 p-6 rounded-lg border border-red-200">
              <div className="flex items-center mb-4">
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
                <h3 className="text-lg font-medium text-red-800">Deductions</h3>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Multiple Deductions Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Deductions
                    </label>
                    <button
                      type="button"
                      onClick={addDeduction}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      + Add Deduction
                    </button>
                  </div>

                  {deductions.length === 0 ? (
                    <div className="text-gray-500 text-sm text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                      No deductions added. Click "Add Deduction" to add one.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {deductions.map((deduction, index) => (
                        <div key={index} className="flex gap-3 items-end">
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="Deduction reason (e.g., Tax, Insurance, Loan)"
                              value={deduction.reason || ""}
                              onChange={(e) =>
                                updateDeduction(index, "reason", e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                          </div>
                          <div className="w-32">
                            <input
                              type="number"
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                              value={deduction.amount || ""}
                              onChange={(e) =>
                                updateDeduction(index, "amount", e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDeduction(index)}
                            className="bg-red-500 text-white px-2 py-2 rounded text-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                            title="Remove deduction"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {deductions.length > 0 && (
                    <div className="mt-3 bg-red-100 p-3 rounded border border-red-300">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-red-700">
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
                  )}
                </div>

                {/* Advance Payment */}
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

                {/* Advance Payments from Pay Period */}
                {(advancePayments.length > 0 || advancesLoading) && (
                  <div className="md:col-span-1">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Advance Payments (Auto-deducted)
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
                                {advance.paymentDate.toLocaleDateString()} •
                                {advance.repaymentMethod ===
                                "deduct_from_salary"
                                  ? " Will be deducted"
                                  : " Not auto-deducted"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p
                                className={`text-sm font-bold ${
                                  advance.repaymentMethod ===
                                  "deduct_from_salary"
                                    ? "text-red-600"
                                    : "text-gray-500"
                                }`}
                              >
                                {advance.repaymentMethod ===
                                "deduct_from_salary"
                                  ? "-"
                                  : ""}
                                Rs.{advance.amount.toFixed(2)}
                              </p>
                              {advance.repaymentMethod !==
                                "deduct_from_salary" && (
                                <p className="text-xs text-gray-400">
                                  Not auto-deducted
                                </p>
                              )}
                            </div>
                          </div>
                        ))}

                        {advancePayments.filter(
                          (advance) =>
                            advance.repaymentMethod === "deduct_from_salary"
                        ).length > 0 && (
                          <div className="mt-3 bg-red-100 p-3 rounded border border-red-300">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-red-700">
                                Total Advance Deductions:
                              </span>
                              <span className="font-bold text-red-800">
                                Rs.
                                {advancePayments
                                  .filter(
                                    (advance) =>
                                      advance.repaymentMethod ===
                                      "deduct_from_salary"
                                  )
                                  .reduce(
                                    (sum, advance) => sum + advance.amount,
                                    0
                                  )
                                  .toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Summary Section */}
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
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-blue-800">
                    Pay Summary
                  </h3>
                </div>
                {selectedEmployee && (
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    Print Slip
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
                  <p className="text-2xl font-bold text-green-600">
                    Rs.{calculateTotalEarnings().toFixed(2)}
                  </p>
                  <div className="text-xs text-gray-500 mt-1">
                    Basic + Overtime + Bonus + Allowances
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Total Deductions</p>
                  <p className="text-2xl font-bold text-red-600">
                    Rs.{calculateTotalDeductions().toFixed(2)}
                  </p>
                  <div className="text-xs text-gray-500 mt-1">
                    {deductions.length > 0 && (
                      <div>
                        Itemized Deductions: Rs.
                        {deductions
                          .reduce((sum, item) => {
                            const amount = parseFloat(item.amount || 0);
                            return sum + (isNaN(amount) ? 0 : amount);
                          }, 0)
                          .toFixed(2)}
                        <br />
                      </div>
                    )}
                    {parseFloat(payrollData.advance || 0) > 0 && (
                      <div>
                        Additional Advance: Rs.
                        {parseFloat(payrollData.advance || 0).toFixed(2)}
                        <br />
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
                        <br />
                      </div>
                    )}
                    Total Deductions + Advances
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border-2 border-blue-400">
                  <p className="text-sm text-gray-600 mb-1">Net Pay</p>
                  <p className="text-3xl font-bold text-blue-800">
                    Rs.{calculateNetPay().toFixed(2)}
                  </p>
                  <div className="text-xs text-blue-600 mt-1 font-medium">
                    Final Amount
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={payrollData.notes}
                onChange={handleInputChange}
                rows={3}
                placeholder="Additional notes or comments about this payroll..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Reset Form
              </button>

              <button
                type="submit"
                disabled={loading || !selectedEmployee}
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit(e);
                }}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating Paysheet...
                  </div>
                ) : (
                  "Generate Paysheet"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Content (Hidden) */}
      <div id="paysheet-print" style={{ display: "none" }}>
        {selectedEmployee && (
          <div>
            <div className="header">
              <h1>SALARY SLIP</h1>
              <h2>{currentBusiness?.name || "Company Name"}</h2>
              <p>
                Pay Period: {payrollData.payPeriodStart} to{" "}
                {payrollData.payPeriodEnd}
              </p>
            </div>

            <div className="section">
              <h3>Employee Details</h3>
              <div className="grid">
                <div>
                  <strong>Name:</strong> {selectedEmployee.name}
                  <br />
                  <strong>Employee ID:</strong> {selectedEmployee.employeeId}
                  <br />
                  <strong>Role:</strong> {selectedEmployee.role || "N/A"}
                </div>
                <div>
                  <strong>Daily Rate:</strong> Rs.
                  {selectedEmployee.payRate || 0}
                  <br />
                  <strong>Working Days:</strong>{" "}
                  {attendanceData.totalWorkingDays}
                  <br />
                  <strong>Total Hours:</strong>{" "}
                  {attendanceData.totalActualHours}
                </div>
              </div>
            </div>

            <div className="section">
              <h3>Earnings</h3>
              <div>
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
                          {advance.paymentDate.toLocaleDateString()}): Rs.
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

            {payrollData.notes && (
              <div className="section">
                <h3>Notes</h3>
                <p>{payrollData.notes}</p>
              </div>
            )}

            <div
              className="section"
              style={{
                textAlign: "center",
                marginTop: "40px",
                borderTop: "1px solid #ccc",
                paddingTop: "20px",
              }}
            >
              <p style={{ fontSize: "12px", color: "#666" }}>
                Generated by <strong>LumoraBiz</strong> - Lumora Ventures (PVT)
                Ltd
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Copyright Footer */}
      <div className="text-center py-6 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          Generated by{" "}
          <span className="font-medium text-blue-600">LumoraBiz</span> - Lumora
          Ventures (PVT) Ltd
        </p>
      </div>
    </div>
  );
};

export default PaySheet;
