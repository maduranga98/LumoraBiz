import React, { useState } from "react";
import { db, auth } from "../../services/firebase";
import { collection, addDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import EmployeeDropdown from "../EmployeeDropdown";

const PaySheet = () => {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);

  // Payroll form data
  const [payrollData, setPayrollData] = useState({
    basicSalary: "",
    overtimeHours: "",
    overtimeRate: "",
    bonus: "",
    allowances: "",
    deductions: "",
    advance: "",
    payPeriodStart: "",
    payPeriodEnd: "",
    notes: "",
  });

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPayrollData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Calculate overtime amount
  const calculateOvertime = () => {
    const hours = parseFloat(payrollData.overtimeHours) || 0;
    const rate = parseFloat(payrollData.overtimeRate) || 0;
    return hours * rate;
  };

  // Calculate total earnings
  const calculateTotalEarnings = () => {
    const basic = parseFloat(payrollData.basicSalary) || 0;
    const overtime = calculateOvertime();
    const bonus = parseFloat(payrollData.bonus) || 0;
    const allowances = parseFloat(payrollData.allowances) || 0;
    return basic + overtime + bonus + allowances;
  };

  // Calculate total deductions
  const calculateTotalDeductions = () => {
    const deductions = parseFloat(payrollData.deductions) || 0;
    const advance = parseFloat(payrollData.advance) || 0;
    return deductions + advance;
  };

  // Calculate net pay
  const calculateNetPay = () => {
    return calculateTotalEarnings() - calculateTotalDeductions();
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }

    if (
      !payrollData.basicSalary ||
      !payrollData.payPeriodStart ||
      !payrollData.payPeriodEnd
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const currentUser = auth.currentUser;
      const currentBusinessId = localStorage.getItem("currentBusinessId");

      const paysheetData = {
        employeeId: selectedEmployee.employeeId,
        employeeName: selectedEmployee.employeeName,
        employeeDocId: selectedEmployee.id,
        basicSalary: parseFloat(payrollData.basicSalary),
        overtimeHours: parseFloat(payrollData.overtimeHours) || 0,
        overtimeRate: parseFloat(payrollData.overtimeRate) || 0,
        overtimeAmount: calculateOvertime(),
        bonus: parseFloat(payrollData.bonus) || 0,
        allowances: parseFloat(payrollData.allowances) || 0,
        deductions: parseFloat(payrollData.deductions) || 0,
        advance: parseFloat(payrollData.advance) || 0,
        totalEarnings: calculateTotalEarnings(),
        totalDeductions: calculateTotalDeductions(),
        netPay: calculateNetPay(),
        payPeriodStart: new Date(payrollData.payPeriodStart),
        payPeriodEnd: new Date(payrollData.payPeriodEnd),
        notes: payrollData.notes,
        businessId: currentBusinessId,
        ownerId: currentUser.uid,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName || "Unknown",
        status: "generated",
        createdAt: new Date(),
      };

      await addDoc(collection(db, "paysheets"), paysheetData);

      toast.success("Paysheet created successfully");

      // Reset form
      setSelectedEmployee(null);
      setPayrollData({
        basicSalary: "",
        overtimeHours: "",
        overtimeRate: "",
        bonus: "",
        allowances: "",
        deductions: "",
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
    setPayrollData({
      basicSalary: "",
      overtimeHours: "",
      overtimeRate: "",
      bonus: "",
      allowances: "",
      deductions: "",
      advance: "",
      payPeriodStart: "",
      payPeriodEnd: "",
      notes: "",
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Employee Paysheet
            </h1>
            <p className="text-gray-600 mt-1">
              Generate salary slips for employees
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              Payroll Management
            </div>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Employee Selection */}
          <EmployeeDropdown
            selectedEmployee={selectedEmployee}
            onEmployeeSelect={setSelectedEmployee}
            label="Select Employee"
            placeholder="Choose an employee for payroll"
            required={true}
            showEmployeeDetails={true}
            className="mb-6"
          />

          {/* Pay Period */}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Basic Salary <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="basicSalary"
                  value={payrollData.basicSalary}
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
                  Allowances
                </label>
                <input
                  type="number"
                  name="allowances"
                  value={payrollData.allowances}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

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
          </div>

          {/* Deductions Section */}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deductions
                </label>
                <input
                  type="number"
                  name="deductions"
                  value={payrollData.deductions}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Advance Payment
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
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <div className="flex items-center mb-4">
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
              <h3 className="text-lg font-medium text-blue-800">Pay Summary</h3>
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
                  Deductions + Advance
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
        </form>
      </div>

      {/* Selected Employee Summary */}
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              Employee Information
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Employee Name</p>
              <p className="font-medium text-gray-900">
                {selectedEmployee.employeeName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Employee ID</p>
              <p className="font-medium text-gray-900">
                {selectedEmployee.employeeId}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Role</p>
              <p className="font-medium text-gray-900 capitalize">
                {selectedEmployee.role || "N/A"}
              </p>
            </div>
            {selectedEmployee.mobile1 && (
              <div>
                <p className="text-sm text-gray-600">Mobile</p>
                <p className="font-medium text-gray-900">
                  {selectedEmployee.mobile1}
                </p>
              </div>
            )}
            {selectedEmployee.address && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Address</p>
                <p className="font-medium text-gray-900">
                  {selectedEmployee.address}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaySheet;
