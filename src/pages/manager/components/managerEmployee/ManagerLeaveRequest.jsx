import React, { useState } from "react";
import {
  Calendar,
  Clock,
  FileText,
  Save,
  User,
  AlertCircle,
  CheckCircle,
  X,
  CalendarDays,
  UserCheck,
} from "lucide-react";
import ManagerEmployeeDropdown from "../ManagerEmployeeDropdown";
import { db } from "../../../../services/firebase";
import { collection, addDoc, doc, serverTimestamp } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { useAuth } from "../../../../contexts/AuthContext";
import { useBusiness } from "../../../../contexts/ManagerBusinessContext";

const ManagerLeaveRequest = () => {
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();

  const [formData, setFormData] = useState({
    employeeId: "",
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
    description: "",
    isEmergency: false,
    attachments: [],
  });

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Leave types configuration
  const leaveTypes = [
    { value: "sick", label: "Sick Leave", icon: "🏥", color: "text-red-600" },
    {
      value: "casual",
      label: "Casual Leave",
      icon: "🌴",
      color: "text-green-600",
    },
    {
      value: "annual",
      label: "Annual Leave",
      icon: "📅",
      color: "text-blue-600",
    },
    {
      value: "emergency",
      label: "Emergency Leave",
      icon: "🚨",
      color: "text-orange-600",
    },
    {
      value: "maternity",
      label: "Maternity Leave",
      icon: "👶",
      color: "text-pink-600",
    },
    {
      value: "paternity",
      label: "Paternity Leave",
      icon: "👨‍👶",
      color: "text-indigo-600",
    },
    {
      value: "bereavement",
      label: "Bereavement Leave",
      icon: "💐",
      color: "text-gray-600",
    },
    {
      value: "compensatory",
      label: "Compensatory Leave",
      icon: "⚖️",
      color: "text-purple-600",
    },
  ];

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  // Handle employee selection
  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    setFormData((prev) => ({
      ...prev,
      employeeId: employee.id,
    }));

    if (errors.employeeId) {
      setErrors((prev) => ({
        ...prev,
        employeeId: "",
      }));
    }
  };

  // Calculate leave duration
  const calculateLeaveDuration = () => {
    if (!formData.startDate || !formData.endDate) return 0;

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return diffDays;
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.employeeId) {
      newErrors.employeeId = "Please select an employee";
    }

    if (!formData.leaveType) {
      newErrors.leaveType = "Please select a leave type";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }

    if (!formData.endDate) {
      newErrors.endDate = "End date is required";
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);

      if (end < start) {
        newErrors.endDate = "End date cannot be before start date";
      }
    }

    if (!formData.reason.trim()) {
      newErrors.reason = "Reason is required";
    }

    if (formData.reason.trim().length < 10) {
      newErrors.reason = "Reason must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Check if required data is available
    if (
      !currentUser?.ownerId ||
      !currentBusiness?.id ||
      !selectedEmployee?.id
    ) {
      toast.error("Missing required information. Please try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for submission
      const submissionData = {
        ...formData,
        employeeName: selectedEmployee?.displayName,
        employeeRole: selectedEmployee?.role,
        employeeEmail: selectedEmployee?.email,
        leaveDuration: calculateLeaveDuration(),
        appliedBy: "manager",
        appliedByUserId: currentUser.uid,
        appliedByUserName: currentUser.displayName || currentUser.name,
        appliedDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        status: "pending", // Changed from "approved" to "pending" for proper workflow
        businessId: currentBusiness.id,
        businessName: currentBusiness.businessName,
      };

      // Create references for Firestore collections
      const ownerDocRef = doc(db, "owners", currentUser.ownerId);
      const businessDocRef = doc(ownerDocRef, "businesses", currentBusiness.id);

      // Employee's personal leaves collection
      const employeeLeavesCollectionRef = collection(
        businessDocRef,
        "employees",
        selectedEmployee.id,
        "leaves"
      );

      // Business-wide pending leaves collection (corrected path)
      const businessLeavesCollectionRef = collection(businessDocRef, "leaves");

      // Add to both collections
      await addDoc(employeeLeavesCollectionRef, submissionData);
      await addDoc(businessLeavesCollectionRef, submissionData);

      toast.success(
        `Leave request submitted for ${selectedEmployee.displayName} successfully`
      );

      // Show success message
      setShowSuccess(true);

      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({
          employeeId: "",
          leaveType: "",
          startDate: "",
          endDate: "",
          reason: "",
          description: "",
          isEmergency: false,
          attachments: [],
        });
        setSelectedEmployee(null);
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Error submitting leave request:", error);
      toast.error("Failed to submit leave request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form reset
  const handleReset = () => {
    setFormData({
      employeeId: "",
      leaveType: "",
      startDate: "",
      endDate: "",
      reason: "",
      description: "",
      isEmergency: false,
      attachments: [],
    });
    setSelectedEmployee(null);
    setErrors({});
  };

  // Get today's date for min date validation
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <CalendarDays className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Apply Leave for Employee
            </h1>
            <p className="text-gray-600 mt-1">
              Submit leave requests on behalf of employees
            </p>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
              <div>
                <h3 className="text-green-800 font-semibold">
                  Leave Request Submitted Successfully!
                </h3>
                <p className="text-green-700 text-sm mt-1">
                  Leave request has been submitted for{" "}
                  {selectedEmployee?.displayName}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Employee Selection */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <UserCheck className="w-6 h-6 mr-2 text-blue-600" />
            Employee Information
          </h2>

          <ManagerEmployeeDropdown
            selectedEmployee={selectedEmployee}
            onEmployeeSelect={handleEmployeeSelect}
            label="Select Employee"
            placeholder="Choose an employee to apply leave for"
            required={true}
          />
          {errors.employeeId && (
            <p className="text-red-600 text-sm mt-2 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.employeeId}
            </p>
          )}
        </div>

        {/* Leave Type Selection */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-6 h-6 mr-2 text-blue-600" />
            Leave Type
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {leaveTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => handleInputChange("leaveType", type.value)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  formData.leaveType === type.value
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div
                    className={`font-medium ${
                      formData.leaveType === type.value
                        ? "text-blue-700"
                        : "text-gray-900"
                    }`}
                  >
                    {type.label}
                  </div>
                </div>
              </button>
            ))}
          </div>
          {errors.leaveType && (
            <p className="text-red-600 text-sm mt-2 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.leaveType}
            </p>
          )}
        </div>

        {/* Date Selection */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-6 h-6 mr-2 text-blue-600" />
            Leave Duration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange("startDate", e.target.value)}
                min={today}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.startDate ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.startDate && (
                <p className="text-red-600 text-sm mt-1">{errors.startDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange("endDate", e.target.value)}
                min={formData.startDate || today}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.endDate ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.endDate && (
                <p className="text-red-600 text-sm mt-1">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* Duration Display */}
          {formData.startDate && formData.endDate && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center text-blue-600">
                <Clock className="w-4 h-4 mr-2" />
                <span className="font-medium">
                  Duration: {calculateLeaveDuration()} day
                  {calculateLeaveDuration() !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Leave Details */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-6 h-6 mr-2 text-blue-600" />
            Leave Details
          </h2>

          <div className="space-y-6">
            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Leave <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => handleInputChange("reason", e.target.value)}
                placeholder="Please provide a detailed reason for the leave request..."
                rows={4}
                maxLength={500}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  errors.reason ? "border-red-300" : "border-gray-300"
                }`}
              />
              <div className="flex justify-between mt-1">
                {errors.reason ? (
                  <p className="text-red-600 text-sm">{errors.reason}</p>
                ) : (
                  <p className="text-gray-500 text-sm">
                    Minimum 10 characters required
                  </p>
                )}
                <p className="text-gray-500 text-sm">
                  {formData.reason.length}/500
                </p>
              </div>
            </div>

            {/* Additional Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Any additional information or special instructions..."
                rows={3}
                maxLength={300}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
              <p className="text-gray-500 text-sm mt-1">
                {formData.description.length}/300
              </p>
            </div>

            {/* Emergency Leave Checkbox */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="isEmergency"
                checked={formData.isEmergency}
                onChange={(e) =>
                  handleInputChange("isEmergency", e.target.checked)
                }
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <label
                  htmlFor="isEmergency"
                  className="text-sm font-medium text-gray-700"
                >
                  Emergency Leave
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Check this if this is an urgent/emergency leave request that
                  requires immediate attention
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Leave Summary */}
        {selectedEmployee &&
          formData.leaveType &&
          formData.startDate &&
          formData.endDate && (
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h2 className="text-xl font-semibold text-blue-900 mb-4">
                Leave Request Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-blue-800 mb-2">
                    Employee Details
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Name:</strong> {selectedEmployee.displayName}
                    </p>
                    <p>
                      <strong>Role:</strong>{" "}
                      {selectedEmployee.role?.replace("_", " ")}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedEmployee.email}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-blue-800 mb-2">
                    Leave Information
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Type:</strong>{" "}
                      {
                        leaveTypes.find((t) => t.value === formData.leaveType)
                          ?.label
                      }
                    </p>
                    <p>
                      <strong>Duration:</strong> {calculateLeaveDuration()} day
                      {calculateLeaveDuration() !== 1 ? "s" : ""}
                    </p>
                    <p>
                      <strong>Period:</strong> {formData.startDate} to{" "}
                      {formData.endDate}
                    </p>
                    {formData.isEmergency && (
                      <p className="text-orange-600 font-medium">
                        ⚠️ Emergency Leave
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Submitting Leave Request...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Submit Leave Request
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <X className="w-5 h-5 mr-2" />
            Reset Form
          </button>
        </div>
      </form>
    </div>
  );
};

export default ManagerLeaveRequest;
