import React, { useState } from "react";
import { db, auth } from "../../services/firebase";
import { collection, addDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import EmployeeDropdown from "../EmployeeDropdown";
import Input from "../Input";

export const Leaves = () => {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);

  // Leave form data
  const [leaveData, setLeaveData] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
    contactNumber: "",
    emergencyContact: "",
    handoverTo: "",
    handoverNotes: "",
  });

  // Predefined leave types
  const leaveTypes = [
    {
      value: "annual",
      label: "Annual Leave",
      color: "bg-blue-100 text-blue-800",
    },
    { value: "sick", label: "Sick Leave", color: "bg-red-100 text-red-800" },
    {
      value: "emergency",
      label: "Emergency Leave",
      color: "bg-orange-100 text-orange-800",
    },
    {
      value: "maternity",
      label: "Maternity Leave",
      color: "bg-pink-100 text-pink-800",
    },
    {
      value: "paternity",
      label: "Paternity Leave",
      color: "bg-purple-100 text-purple-800",
    },
    {
      value: "compassionate",
      label: "Compassionate Leave",
      color: "bg-gray-100 text-gray-800",
    },
    {
      value: "study",
      label: "Study Leave",
      color: "bg-green-100 text-green-800",
    },
    {
      value: "unpaid",
      label: "Unpaid Leave",
      color: "bg-yellow-100 text-yellow-800",
    },
  ];

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLeaveData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Calculate leave duration
  const calculateLeaveDuration = () => {
    if (!leaveData.startDate || !leaveData.endDate) return 0;

    const start = new Date(leaveData.startDate);
    const end = new Date(leaveData.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates

    return diffDays;
  };

  // Get selected leave type details
  const getSelectedLeaveType = () => {
    return leaveTypes.find((type) => type.value === leaveData.leaveType);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }

    if (
      !leaveData.leaveType ||
      !leaveData.startDate ||
      !leaveData.endDate ||
      !leaveData.reason
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate dates
    const startDate = new Date(leaveData.startDate);
    const endDate = new Date(leaveData.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      toast.error("Start date cannot be in the past");
      return;
    }

    if (endDate < startDate) {
      toast.error("End date cannot be before start date");
      return;
    }

    setLoading(true);

    try {
      const currentUser = auth.currentUser;
      const currentBusinessId = localStorage.getItem("currentBusinessId");

      const leaveRequestData = {
        employeeId: selectedEmployee.employeeId,
        employeeName: selectedEmployee.employeeName,
        employeeDocId: selectedEmployee.id,
        leaveType: leaveData.leaveType,
        leaveTypeLabel: getSelectedLeaveType()?.label || leaveData.leaveType,
        startDate: new Date(leaveData.startDate),
        endDate: new Date(leaveData.endDate),
        duration: calculateLeaveDuration(),
        reason: leaveData.reason.trim(),
        contactNumber:
          leaveData.contactNumber || selectedEmployee.mobile1 || "",
        emergencyContact: leaveData.emergencyContact,
        handoverTo: leaveData.handoverTo,
        handoverNotes: leaveData.handoverNotes,
        status: "pending",
        requestedBy: currentUser.uid,
        requestedByName: currentUser.displayName || "Unknown",
        businessId: currentBusinessId,
        ownerId: currentUser.uid,
        requestedAt: new Date(),
        createdAt: new Date(),
      };

      await addDoc(collection(db, "leaveRequests"), leaveRequestData);

      toast.success("Leave request submitted successfully");

      // Reset form
      setSelectedEmployee(null);
      setLeaveData({
        leaveType: "",
        startDate: "",
        endDate: "",
        reason: "",
        contactNumber: "",
        emergencyContact: "",
        handoverTo: "",
        handoverNotes: "",
      });
    } catch (error) {
      console.error("Error submitting leave request:", error);
      toast.error("Failed to submit leave request");
    } finally {
      setLoading(false);
    }
  };

  // Handle form reset
  const handleReset = () => {
    setSelectedEmployee(null);
    setLeaveData({
      leaveType: "",
      startDate: "",
      endDate: "",
      reason: "",
      contactNumber: "",
      emergencyContact: "",
      handoverTo: "",
      handoverNotes: "",
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leave Request</h1>
            <p className="text-gray-600 mt-1">
              Submit leave applications for employees
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
              Leave Management
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
            placeholder="Choose an employee for leave request"
            required={true}
            showEmployeeDetails={true}
            className="mb-6"
          />

          {/* Leave Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Leave Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {leaveTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() =>
                    handleInputChange({
                      target: { name: "leaveType", value: type.value },
                    })
                  }
                  className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                    leaveData.leaveType === type.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 hover:border-gray-400 text-gray-700"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full ${
                      type.color.split(" ")[0]
                    } mx-auto mb-1`}
                  ></div>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={leaveData.startDate}
                onChange={handleInputChange}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="endDate"
                value={leaveData.endDate}
                onChange={handleInputChange}
                min={
                  leaveData.startDate || new Date().toISOString().split("T")[0]
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Leave Duration Display */}
          {leaveData.startDate && leaveData.endDate && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-blue-800 font-medium">
                  Leave Duration: {calculateLeaveDuration()} day
                  {calculateLeaveDuration() !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Leave <span className="text-red-500">*</span>
            </label>
            <textarea
              name="reason"
              value={leaveData.reason}
              onChange={handleInputChange}
              rows={4}
              placeholder="Please provide a detailed reason for your leave request..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              required
            />
          </div>

          {/* Contact Information */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Contact Number During Leave"
                  type="tel"
                  name="contactNumber"
                  value={leaveData.contactNumber}
                  onChange={handleInputChange}
                  placeholder={
                    selectedEmployee?.mobile1 || "Enter contact number"
                  }
                />
              </div>
              <div>
                <Input
                  label="Emergency Contact"
                  type="tel"
                  name="emergencyContact"
                  value={leaveData.emergencyContact}
                  onChange={handleInputChange}
                  placeholder="Emergency contact number"
                />
              </div>
            </div>
          </div>

          {/* Work Handover */}
          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Work Handover Details
            </h3>
            <div className="space-y-4">
              <div>
                <Input
                  label="Handover To (Employee Name/ID)"
                  type="text"
                  name="handoverTo"
                  value={leaveData.handoverTo}
                  onChange={handleInputChange}
                  placeholder="Name or ID of person taking over responsibilities"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Handover Notes
                </label>
                <textarea
                  name="handoverNotes"
                  value={leaveData.handoverNotes}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Important tasks, deadlines, or instructions for the person covering your work..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
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
              className="flex-1 bg-orange-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Submitting Request...
                </div>
              ) : (
                "Submit Leave Request"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Request Summary */}
      {selectedEmployee &&
        leaveData.leaveType &&
        leaveData.startDate &&
        leaveData.endDate && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="bg-orange-100 p-2 rounded-full mr-3">
                <svg
                  className="w-5 h-5 text-orange-600"
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
              <h3 className="text-lg font-medium text-gray-900">
                Leave Request Summary
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Employee</p>
                <p className="font-medium text-gray-900">
                  {selectedEmployee.employeeName}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedEmployee.employeeId}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Leave Type</p>
                <div className="flex items-center">
                  <span
                    className={`inline-block w-3 h-3 rounded-full mr-2 ${
                      getSelectedLeaveType()?.color.split(" ")[0] ||
                      "bg-gray-300"
                    }`}
                  ></span>
                  <p className="font-medium text-gray-900">
                    {getSelectedLeaveType()?.label || leaveData.leaveType}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="font-medium text-gray-900">
                  {calculateLeaveDuration()} day
                  {calculateLeaveDuration() !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(leaveData.startDate).toLocaleDateString()} -{" "}
                  {new Date(leaveData.endDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Pending Submission
                </span>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
