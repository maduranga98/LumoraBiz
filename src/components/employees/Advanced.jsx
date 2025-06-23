import React, { useState, useEffect } from "react";
import { db, auth } from "../../services/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import EmployeeDropdown from "../EmployeeDropdown";
import { useBusiness } from "../../contexts/BusinessContext";
import { useAuth } from "../../contexts/AuthContext";

const Advanced = () => {
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentType, setPaymentType] = useState("advance"); // 'advance' or 'daily_wage'
  const [previousAdvances, setPreviousAdvances] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Payment form data
  const [paymentData, setPaymentData] = useState({
    amount: "",
    reason: "",
    paymentDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    notes: "",
    repaymentMethod: "deduct_from_salary", // 'deduct_from_salary', 'cash_repayment', 'installments'
    installments: "1",
    approvalStatus: "approved", // 'pending', 'approved', 'rejected'
  });

  const businessId = currentBusiness?.id;
  const ownerId = currentUser?.uid;

  // Load previous advances/payments for selected employee
  useEffect(() => {
    const fetchPreviousPayments = async () => {
      if (!selectedEmployee || !ownerId || !businessId) {
        setPreviousAdvances([]);
        return;
      }

      setLoadingHistory(true);
      try {
        let payments = [];

        if (paymentType === "advance") {
          // Load advances
          const advancesRef = collection(
            db,
            `owners/${ownerId}/businesses/${businessId}/employees/${selectedEmployee.id}/advances`
          );
          const q = query(advancesRef, orderBy("createdAt", "desc"), limit(5));
          const snapshot = await getDocs(q);

          snapshot.forEach((doc) => {
            payments.push({ id: doc.id, ...doc.data() });
          });
        } else {
          // Load daily wage records from salary collection
          const salaryRef = collection(
            db,
            `owners/${ownerId}/businesses/${businessId}/employees/${selectedEmployee.id}/salary`
          );
          const q = query(salaryRef, orderBy("createdAt", "desc"), limit(5));
          const snapshot = await getDocs(q);

          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.paymentType === "daily_wage") {
              payments.push({ id: doc.id, ...data });
            }
          });
        }

        setPreviousAdvances(payments);
      } catch (error) {
        console.error("Error fetching payment history:", error);
        toast.error("Failed to load payment history");
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchPreviousPayments();
  }, [selectedEmployee, ownerId, businessId, paymentType]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Calculate daily wage amount
  const calculateDailyWage = () => {
    if (!selectedEmployee?.payRate) return 0;
    return parseFloat(selectedEmployee.payRate) || 0;
  };

  // Calculate maximum advance allowed (e.g., 50% of monthly salary)
  const calculateMaxAdvance = () => {
    if (!selectedEmployee?.payRate) return 0;
    const dailyRate = parseFloat(selectedEmployee.payRate) || 0;
    const monthlyEstimate = dailyRate * 30; // Estimate monthly salary
    return monthlyEstimate * 0.5; // 50% of estimated monthly salary
  };

  // Calculate outstanding advances (only for advance payments)
  const calculateOutstandingAdvances = () => {
    if (paymentType !== "advance") return 0;

    return previousAdvances
      .filter(
        (advance) =>
          advance.status !== "repaid" &&
          advance.approvalStatus === "approved" &&
          advance.paymentType === "advance"
      )
      .reduce((total, advance) => total + (parseFloat(advance.amount) || 0), 0);
  };

  // Handle payment type change
  const handlePaymentTypeChange = (type) => {
    setPaymentType(type);

    // Clear employee selection if changing to daily wage and current employee is not daily wage
    if (
      type === "daily_wage" &&
      selectedEmployee &&
      selectedEmployee.salaryType !== "daily"
    ) {
      setSelectedEmployee(null);
      setPreviousAdvances([]);
    }

    if (type === "daily_wage") {
      setPaymentData((prev) => ({
        ...prev,
        amount:
          selectedEmployee?.salaryType === "daily"
            ? calculateDailyWage().toString()
            : "",
        reason: "Daily wage payment",
        repaymentMethod: "immediate",
        approvalStatus: "approved",
      }));
    } else {
      setPaymentData((prev) => ({
        ...prev,
        amount: "",
        reason: "",
        repaymentMethod: "deduct_from_salary",
        approvalStatus: "approved",
      }));
    }
  };

  // Print functionality
  const handlePrint = () => {
    const printContent = document.getElementById("payment-slip-print");
    const winPrint = window.open(
      "",
      "",
      "left=0,top=0,width=800,height=600,toolbar=0,scrollbars=0,status=0"
    );
    winPrint.document.write(`
      <html>
        <head>
          <title>${
            paymentType === "daily_wage"
              ? "Daily Wage Slip"
              : "Advance Payment Slip"
          } - ${selectedEmployee?.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .amount { font-size: 24px; font-weight: bold; color: #2563eb; }
            .footer { border-top: 1px solid #ccc; padding-top: 20px; text-align: center; font-size: 12px; color: #666; margin-top: 40px; }
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

    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Check if user is authenticated and business is selected
    if (!currentUser?.uid) {
      toast.error("Authentication error. Please sign in again.");
      return;
    }

    if (!currentBusiness?.id) {
      toast.error("Please select a business first.");
      return;
    }

    // Validation for advance payments only
    if (paymentType === "advance") {
      const maxAdvance = calculateMaxAdvance();
      const outstandingAdvances = calculateOutstandingAdvances();
      const newAmount = parseFloat(paymentData.amount);

      if (outstandingAdvances + newAmount > maxAdvance) {
        toast.error(
          `Total advances cannot exceed Rs.${maxAdvance.toFixed(
            2
          )}. Outstanding: Rs.${outstandingAdvances.toFixed(2)}`
        );
        return;
      }

      if (!paymentData.reason.trim()) {
        toast.error("Please provide a reason for the advance");
        return;
      }
    } else if (paymentType === "daily_wage") {
      // Validation for daily wage
      if (!paymentData.reason.trim()) {
        toast.error("Please provide a reason for the daily wage payment");
        return;
      }
    }

    setLoading(true);

    try {
      const paymentId = `${selectedEmployee.id}_${paymentType}_${Date.now()}`;

      const paymentRecord = {
        employeeId: selectedEmployee.employeeId,
        employeeName: selectedEmployee.name,
        employeeDocId: selectedEmployee.id,
        paymentType: paymentType,
        amount: parseFloat(paymentData.amount),
        reason: paymentData.reason,
        paymentDate: new Date(paymentData.paymentDate),
        dueDate: paymentData.dueDate ? new Date(paymentData.dueDate) : null,
        notes: paymentData.notes,
        repaymentMethod: paymentData.repaymentMethod,
        installments: parseInt(paymentData.installments) || 1,
        approvalStatus: paymentData.approvalStatus,
        status: paymentType === "daily_wage" ? "completed" : "active",
        businessId: currentBusiness.id, // Use currentBusiness.id
        ownerId: currentUser.uid, // Use currentUser.uid from useAuth context
        createdBy: currentUser.uid, // Use currentUser.uid from useAuth context
        createdByName:
          currentUser.displayName || currentUser.email || "Unknown",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save in employee's advances collection
      await addDoc(
        collection(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/employees/${selectedEmployee.id}/advances`
        ),
        paymentRecord
      );

      // Save copy in business advances collection
      await addDoc(
        collection(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/advances`
        ),
        { ...paymentRecord, paymentId }
      );

      toast.success(
        paymentType === "daily_wage"
          ? "Daily wage payment recorded successfully"
          : "Advance payment request created successfully"
      );

      // Refresh payment history based on payment type
      if (selectedEmployee) {
        if (paymentType === "advance") {
          const advancesRef = collection(
            db,
            `owners/${currentUser.uid}/businesses/${currentBusiness.id}/employees/${selectedEmployee.id}/advances`
          );
          const q = query(advancesRef, orderBy("createdAt", "desc"), limit(5));
          const snapshot = await getDocs(q);

          const advances = [];
          snapshot.forEach((doc) => {
            advances.push({ id: doc.id, ...doc.data() });
          });

          setPreviousAdvances(advances);
        } else {
          // For daily wages, we might want to show recent salary records
          const salaryRef = collection(
            db,
            `owners/${currentUser.uid}/businesses/${currentBusiness.id}/employees/${selectedEmployee.id}/salary`
          );
          const q = query(salaryRef, orderBy("createdAt", "desc"), limit(5));
          const snapshot = await getDocs(q);

          const salaryRecords = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.paymentType === "daily_wage") {
              salaryRecords.push({ id: doc.id, ...data });
            }
          });

          setPreviousAdvances(salaryRecords); // Reusing the same state for display
        }
      }

      // Reset form
      setPaymentData({
        amount:
          paymentType === "daily_wage" ? calculateDailyWage().toString() : "",
        reason: paymentType === "daily_wage" ? "Daily wage payment" : "",
        paymentDate: new Date().toISOString().split("T")[0],
        dueDate: "",
        notes: "",
        repaymentMethod:
          paymentType === "daily_wage" ? "immediate" : "deduct_from_salary",
        installments: "1",
        approvalStatus: paymentType === "daily_wage" ? "approved" : "approved",
      });
    } catch (error) {
      console.error("Error creating payment record:", error);
      toast.error("Failed to create payment record. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle form reset
  const handleReset = () => {
    setSelectedEmployee(null);
    setPreviousAdvances([]);
    setPaymentType("advance");
    setPaymentData({
      amount: "",
      reason: "",
      paymentDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      notes: "",
      repaymentMethod: "deduct_from_salary",
      installments: "1",
      approvalStatus: "approved",
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Employee Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {!selectedEmployee && (
            <div className="text-center py-4 mb-4">
              <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                <div className="flex flex-col items-center">
                  <div className="bg-green-100 p-3 rounded-full mb-3">
                    <svg
                      className="w-6 h-6 text-green-600"
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
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Advance Payments & Daily Wages
                  </h2>
                  <p className="text-gray-600 text-sm">
                    {paymentType === "daily_wage"
                      ? "Process daily wage payments for daily workers"
                      : "Process advance payments and daily wage disbursements"}
                  </p>
                  {paymentType === "daily_wage" && (
                    <div className="mt-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                      Showing only daily wage employees
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <EmployeeDropdown
            selectedEmployee={selectedEmployee}
            onEmployeeSelect={setSelectedEmployee}
            label="Select Employee"
            placeholder={
              paymentType === "daily_wage"
                ? "Choose a daily wage employee"
                : "Choose an employee for payment processing"
            }
            required={true}
            showEmployeeDetails={true}
            filterCriteria={
              paymentType === "daily_wage" ? { salaryType: "daily" } : null
            }
          />
        </div>
      </div>

      {/* Payment Type Selection */}
      {selectedEmployee && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 p-2 rounded-full mr-3">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Payment Type</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handlePaymentTypeChange("advance")}
              className={`p-4 rounded-lg border-2 transition-all ${
                paymentType === "advance"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              <div className="flex items-center justify-center mb-2">
                <svg
                  className="w-6 h-6"
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
              </div>
              <h4 className="font-medium">Advance Payment</h4>
              <p className="text-sm opacity-75">
                Pre-salary advance with repayment terms
              </p>
            </button>

            <button
              type="button"
              onClick={() => handlePaymentTypeChange("daily_wage")}
              className={`p-4 rounded-lg border-2 transition-all ${
                paymentType === "daily_wage"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              <div className="flex items-center justify-center mb-2">
                <svg
                  className="w-6 h-6"
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
              <h4 className="font-medium">Daily Wage</h4>
              <p className="text-sm opacity-75">Immediate daily wage payment</p>
            </button>
          </div>
        </div>
      )}

      {/* Employee Financial Summary */}
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              Financial Summary
            </h3>
            {loadingHistory && (
              <div className="ml-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    Daily Rate
                  </p>
                  <p className="text-xl font-bold text-green-800">
                    Rs.{selectedEmployee.payRate || "0.00"}
                  </p>
                </div>
              </div>
            </div>

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
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-blue-700 font-medium">
                    {paymentType === "advance"
                      ? "Max Advance"
                      : "Estimated Monthly"}
                  </p>
                  <p className="text-xl font-bold text-blue-800">
                    Rs.
                    {paymentType === "advance"
                      ? calculateMaxAdvance().toFixed(2)
                      : (
                          parseFloat(selectedEmployee.payRate || 0) * 30
                        ).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {paymentType === "advance" ? (
              <>
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
                          d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-red-700 font-medium">
                        Outstanding
                      </p>
                      <p className="text-xl font-bold text-red-800">
                        Rs.{calculateOutstandingAdvances().toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

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
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-yellow-700 font-medium">
                        Available
                      </p>
                      <p className="text-xl font-bold text-yellow-800">
                        Rs.
                        {(
                          calculateMaxAdvance() - calculateOutstandingAdvances()
                        ).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
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
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-purple-700 font-medium">
                        Today's Pay
                      </p>
                      <p className="text-xl font-bold text-purple-800">
                        Rs.{calculateDailyWage().toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                  <div className="flex items-center">
                    <div className="bg-indigo-100 p-2 rounded-full mr-3">
                      <svg
                        className="w-4 h-4 text-indigo-600"
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
                    <div>
                      <p className="text-sm text-indigo-700 font-medium">
                        Payment Type
                      </p>
                      <p className="text-lg font-bold text-indigo-800">
                        Daily Wage
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Recent Payment History */}
          {previousAdvances.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Recent {paymentType === "advance" ? "Advances" : "Daily Wages"}
              </h4>
              <div className="space-y-2">
                {previousAdvances.slice(0, 3).map((advance, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-2 h-2 rounded-full mr-3 ${
                          advance.status === "completed"
                            ? "bg-green-500"
                            : advance.status === "repaid"
                            ? "bg-blue-500"
                            : "bg-yellow-500"
                        }`}
                      ></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Rs.{advance.amount?.toFixed(2) || "0.00"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {advance.reason || "No reason provided"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-xs font-medium ${
                          advance.approvalStatus === "approved"
                            ? "text-green-600"
                            : advance.approvalStatus === "rejected"
                            ? "text-red-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {advance.approvalStatus || "approved"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {advance.createdAt?.toDate?.()?.toLocaleDateString() ||
                          "Unknown date"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Form */}
      {selectedEmployee && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div
              className={`p-6 rounded-lg border ${
                paymentType === "advance"
                  ? "bg-blue-50 border-blue-200"
                  : "bg-green-50 border-green-200"
              }`}
            >
              <div className="flex items-center mb-4">
                <svg
                  className={`w-5 h-5 mr-2 ${
                    paymentType === "advance"
                      ? "text-blue-600"
                      : "text-green-600"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d={
                      paymentType === "advance"
                        ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        : "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    }
                  />
                </svg>
                <h3
                  className={`text-lg font-medium ${
                    paymentType === "advance"
                      ? "text-blue-800"
                      : "text-green-800"
                  }`}
                >
                  {paymentType === "advance"
                    ? "Advance Payment Details"
                    : "Daily Wage Payment"}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={paymentData.amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    max={
                      paymentType === "advance"
                        ? calculateMaxAdvance() - calculateOutstandingAdvances()
                        : undefined
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  {paymentType === "advance" && (
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum available: Rs.
                      {(
                        calculateMaxAdvance() - calculateOutstandingAdvances()
                      ).toFixed(2)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="paymentDate"
                    value={paymentData.paymentDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="reason"
                    value={paymentData.reason}
                    onChange={handleInputChange}
                    placeholder={
                      paymentType === "advance"
                        ? "Emergency, medical, personal, etc."
                        : "Daily wage payment"
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {paymentType === "advance" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Due Date
                      </label>
                      <input
                        type="date"
                        name="dueDate"
                        value={paymentData.dueDate}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Repayment Method
                      </label>
                      <select
                        name="repaymentMethod"
                        value={paymentData.repaymentMethod}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="deduct_from_salary">
                          Deduct from Salary
                        </option>
                        <option value="cash_repayment">Cash Repayment</option>
                        <option value="installments">Installments</option>
                      </select>
                    </div>

                    {paymentData.repaymentMethod === "installments" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Number of Installments
                        </label>
                        <input
                          type="number"
                          name="installments"
                          value={paymentData.installments}
                          onChange={handleInputChange}
                          min="1"
                          max="12"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={paymentData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Additional notes or comments..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
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
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-800">
                    Payment Summary
                  </h3>
                </div>
                {selectedEmployee && paymentData.amount && (
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                  >
                    Print Slip
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Payment Amount</p>
                  <p className="text-2xl font-bold text-blue-600">
                    Rs.{parseFloat(paymentData.amount || 0).toFixed(2)}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Payment Type</p>
                  <p className="text-lg font-medium text-gray-800 capitalize">
                    {paymentType.replace("_", " ")}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <p
                    className={`text-lg font-medium ${
                      paymentData.approvalStatus === "approved"
                        ? "text-green-600"
                        : paymentData.approvalStatus === "rejected"
                        ? "text-red-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {paymentData.approvalStatus === "approved"
                      ? "Approved"
                      : paymentData.approvalStatus === "rejected"
                      ? "Rejected"
                      : "Pending"}
                  </p>
                </div>
              </div>
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
                className={`flex-1 py-3 px-6 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors ${
                  paymentType === "advance"
                    ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                    : "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : paymentType === "advance" ? (
                  "Create Advance Request"
                ) : (
                  "Record Daily Wage"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Print Content (Hidden) */}
      <div id="payment-slip-print" style={{ display: "none" }}>
        {selectedEmployee && paymentData.amount && (
          <div>
            <div className="header">
              <h1>
                {paymentType === "daily_wage"
                  ? "DAILY WAGE SLIP"
                  : "ADVANCE PAYMENT SLIP"}
              </h1>
              <h2>{currentBusiness?.businessName || "Company Name"}</h2>
              <p>Date: {paymentData.paymentDate}</p>
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
                  <strong>Payment Type:</strong>{" "}
                  {paymentType === "daily_wage"
                    ? "Daily Wage"
                    : "Advance Payment"}
                </div>
              </div>
            </div>

            <div className="section">
              <h3>Payment Details</h3>
              <div>
                <strong>Amount:</strong>{" "}
                <span className="amount">
                  Rs.{parseFloat(paymentData.amount || 0).toFixed(2)}
                </span>
                <br />
                <strong>Reason:</strong> {paymentData.reason}
                <br />
                <strong>Payment Date:</strong> {paymentData.paymentDate}
                <br />
                {paymentType === "advance" && paymentData.dueDate && (
                  <>
                    <strong>Due Date:</strong> {paymentData.dueDate}
                    <br />
                    <strong>Repayment Method:</strong>{" "}
                    {paymentData.repaymentMethod.replace("_", " ")}
                    <br />
                  </>
                )}
                <strong>Status:</strong> {paymentData.approvalStatus}
              </div>
            </div>

            {paymentData.notes && (
              <div className="section">
                <h3>Notes</h3>
                <p>{paymentData.notes}</p>
              </div>
            )}

            <div className="footer">
              <p>
                Generated by <strong>LumoraBiz</strong> - Lumora Ventures (PVT)
                Ltd
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Copyright Footer */}
    </div>
  );
};

export default Advanced;
