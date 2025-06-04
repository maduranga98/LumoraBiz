import React, { useState, useEffect } from "react";
import { db, auth } from "../../services/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import EmployeeDropdown from "../EmployeeDropdown";

export const DaySalary = () => {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [paymentType, setPaymentType] = useState("");
  const [loading, setLoading] = useState(false);
  const [employeeHistory, setEmployeeHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form data
  const [salaryData, setSalaryData] = useState({
    date: new Date().toISOString().split("T")[0],
    dailyRate: "",
    hoursWorked: "8",
    overtimeHours: "",
    overtimeRate: "",
    bonus: "",
    deductions: "",
    advanceAmount: "",
    description: "",
    notes: "",
  });

  // Payment types
  const paymentTypes = [
    {
      value: "daily_salary",
      label: "Daily Salary Payment",
      description: "Regular daily wage payment",
      color: "bg-blue-100 text-blue-800",
      icon: (
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
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      value: "advance_payment",
      label: "Advance Payment",
      description: "Salary advance before payday",
      color: "bg-orange-100 text-orange-800",
      icon: (
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
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    },
    {
      value: "bonus_payment",
      label: "Bonus Payment",
      description: "Additional incentive payment",
      color: "bg-green-100 text-green-800",
      icon: (
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
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
      ),
    },
  ];

  // Fetch employee payment history when employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeHistory();
      // Pre-fill daily rate if available from employee data
      if (selectedEmployee.dailyRate) {
        setSalaryData((prev) => ({
          ...prev,
          dailyRate: selectedEmployee.dailyRate.toString(),
        }));
      }
    }
  }, [selectedEmployee]);

  const fetchEmployeeHistory = async () => {
    if (!selectedEmployee) return;

    setLoadingHistory(true);
    try {
      const currentUser = auth.currentUser;
      const currentBusinessId = localStorage.getItem("currentBusinessId");

      const historyQuery = query(
        collection(db, "dailySalaryPayments"),
        where("employeeId", "==", selectedEmployee.employeeId),
        where("businessId", "==", currentBusinessId),
        orderBy("createdAt", "desc"),
        limit(5)
      );

      const querySnapshot = await getDocs(historyQuery);
      const history = [];

      querySnapshot.forEach((doc) => {
        history.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setEmployeeHistory(history);
    } catch (error) {
      console.error("Error fetching employee history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSalaryData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Calculate total payment
  const calculateTotalPayment = () => {
    const dailyRate = parseFloat(salaryData.dailyRate) || 0;
    const hoursWorked = parseFloat(salaryData.hoursWorked) || 0;
    const overtimeHours = parseFloat(salaryData.overtimeHours) || 0;
    const overtimeRate = parseFloat(salaryData.overtimeRate) || dailyRate / 8; // Default overtime rate
    const bonus = parseFloat(salaryData.bonus) || 0;
    const deductions = parseFloat(salaryData.deductions) || 0;

    let totalPayment = 0;

    if (paymentType === "daily_salary") {
      // Calculate based on hours worked
      const regularPay = (dailyRate / 8) * Math.min(hoursWorked, 8);
      const overtimePay = overtimeHours * overtimeRate;
      totalPayment = regularPay + overtimePay + bonus - deductions;
    } else if (paymentType === "advance_payment") {
      totalPayment = parseFloat(salaryData.advanceAmount) || 0;
    } else if (paymentType === "bonus_payment") {
      totalPayment = bonus;
    }

    return Math.max(0, totalPayment);
  };

  // Get selected payment type details
  const getSelectedPaymentType = () => {
    return paymentTypes.find((type) => type.value === paymentType);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }

    if (!paymentType) {
      toast.error("Please select a payment type");
      return;
    }

    if (
      paymentType === "daily_salary" &&
      (!salaryData.dailyRate || !salaryData.hoursWorked)
    ) {
      toast.error("Please fill in daily rate and hours worked");
      return;
    }

    if (paymentType === "advance_payment" && !salaryData.advanceAmount) {
      toast.error("Please enter advance amount");
      return;
    }

    if (paymentType === "bonus_payment" && !salaryData.bonus) {
      toast.error("Please enter bonus amount");
      return;
    }

    setLoading(true);

    try {
      const currentUser = auth.currentUser;
      const currentBusinessId = localStorage.getItem("currentBusinessId");

      const paymentData = {
        employeeId: selectedEmployee.employeeId,
        employeeName: selectedEmployee.employeeName,
        employeeDocId: selectedEmployee.id,
        paymentType: paymentType,
        paymentTypeLabel: getSelectedPaymentType()?.label || paymentType,
        date: new Date(salaryData.date),
        dailyRate: parseFloat(salaryData.dailyRate) || 0,
        hoursWorked: parseFloat(salaryData.hoursWorked) || 0,
        overtimeHours: parseFloat(salaryData.overtimeHours) || 0,
        overtimeRate: parseFloat(salaryData.overtimeRate) || 0,
        bonus: parseFloat(salaryData.bonus) || 0,
        deductions: parseFloat(salaryData.deductions) || 0,
        advanceAmount: parseFloat(salaryData.advanceAmount) || 0,
        totalAmount: calculateTotalPayment(),
        description: salaryData.description.trim(),
        notes: salaryData.notes.trim(),
        businessId: currentBusinessId,
        ownerId: currentUser.uid,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName || "Unknown",
        status: "paid",
        createdAt: new Date(),
      };

      await addDoc(collection(db, "dailySalaryPayments"), paymentData);

      toast.success("Payment recorded successfully");

      // Reset form
      setPaymentType("");
      setSalaryData({
        date: new Date().toISOString().split("T")[0],
        dailyRate: selectedEmployee?.dailyRate?.toString() || "",
        hoursWorked: "8",
        overtimeHours: "",
        overtimeRate: "",
        bonus: "",
        deductions: "",
        advanceAmount: "",
        description: "",
        notes: "",
      });

      // Refresh history
      fetchEmployeeHistory();
    } catch (error) {
      console.error("Error recording payment:", error);
      toast.error("Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  // Handle form reset
  const handleReset = () => {
    setSelectedEmployee(null);
    setPaymentType("");
    setSalaryData({
      date: new Date().toISOString().split("T")[0],
      dailyRate: "",
      hoursWorked: "8",
      overtimeHours: "",
      overtimeRate: "",
      bonus: "",
      deductions: "",
      advanceAmount: "",
      description: "",
      notes: "",
    });
    setEmployeeHistory([]);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `Rs.${parseFloat(amount || 0).toFixed(2)}`;
  };

  // Format date
  const formatDate = (date) => {
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Daily Salary Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage daily wages, advances, and bonus payments
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              Daily Payments
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Employee Selection */}
            <EmployeeDropdown
              selectedEmployee={selectedEmployee}
              onEmployeeSelect={setSelectedEmployee}
              label="Select Employee"
              placeholder="Choose an employee for payment"
              required={true}
              showEmployeeDetails={true}
              className="mb-6"
            />

            {/* Payment Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Payment Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {paymentTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setPaymentType(type.value)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      paymentType === type.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <div className={`p-2 rounded-full ${type.color} mr-3`}>
                        {type.icon}
                      </div>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">
                      {type.label}
                    </h3>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="date"
                value={salaryData.date}
                onChange={handleInputChange}
                max={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Payment Type Specific Fields */}
            {paymentType === "daily_salary" && (
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-lg font-medium text-blue-800 mb-4">
                  Daily Salary Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Daily Rate <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="dailyRate"
                      value={salaryData.dailyRate}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hours Worked <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="hoursWorked"
                      value={salaryData.hoursWorked}
                      onChange={handleInputChange}
                      placeholder="8"
                      step="0.5"
                      min="0"
                      max="24"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Overtime Hours
                    </label>
                    <input
                      type="number"
                      name="overtimeHours"
                      value={salaryData.overtimeHours}
                      onChange={handleInputChange}
                      placeholder="0"
                      step="0.5"
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Overtime Rate (per hour)
                    </label>
                    <input
                      type="number"
                      name="overtimeRate"
                      value={salaryData.overtimeRate}
                      onChange={handleInputChange}
                      placeholder={
                        salaryData.dailyRate
                          ? (parseFloat(salaryData.dailyRate) / 8).toFixed(2)
                          : "0.00"
                      }
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
                      value={salaryData.bonus}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deductions
                    </label>
                    <input
                      type="number"
                      name="deductions"
                      value={salaryData.deductions}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentType === "advance_payment" && (
              <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                <h3 className="text-lg font-medium text-orange-800 mb-4">
                  Advance Payment Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Advance Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="advanceAmount"
                      value={salaryData.advanceAmount}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Advance
                    </label>
                    <input
                      type="text"
                      name="description"
                      value={salaryData.description}
                      onChange={handleInputChange}
                      placeholder="e.g., Medical emergency, Personal needs"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentType === "bonus_payment" && (
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <h3 className="text-lg font-medium text-green-800 mb-4">
                  Bonus Payment Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bonus Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="bonus"
                      value={salaryData.bonus}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bonus Reason
                    </label>
                    <input
                      type="text"
                      name="description"
                      value={salaryData.description}
                      onChange={handleInputChange}
                      placeholder="e.g., Performance bonus, Festival bonus"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                name="notes"
                value={salaryData.notes}
                onChange={handleInputChange}
                rows={3}
                placeholder="Any additional notes or comments..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* Total Payment Display */}
            {paymentType && (
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-800">
                    Total Payment
                  </h3>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-600">
                      {formatCurrency(calculateTotalPayment())}
                    </p>
                    <p className="text-sm text-gray-600">
                      {getSelectedPaymentType()?.label}
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                disabled={loading || !selectedEmployee || !paymentType}
                className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Recording Payment...
                  </div>
                ) : (
                  "Record Payment"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Employee History Sidebar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Payments
          </h3>

          {!selectedEmployee ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <p className="text-gray-600">
                Select an employee to view payment history
              </p>
            </div>
          ) : loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600">Loading history...</span>
            </div>
          ) : employeeHistory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No payment history found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {employeeHistory.map((payment) => (
                <div
                  key={payment.id}
                  className="border border-gray-200 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        paymentTypes.find(
                          (t) => t.value === payment.paymentType
                        )?.color || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {payment.paymentTypeLabel}
                    </span>
                    <span className="text-sm font-medium text-green-600">
                      {formatCurrency(payment.totalAmount)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {formatDate(payment.date)}
                  </p>
                  {payment.description && (
                    <p className="text-xs text-gray-500 mt-1">
                      {payment.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
