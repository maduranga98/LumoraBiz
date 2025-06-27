import React, { useState } from "react";
import { db } from "../../../../services/firebase";
import { collection, addDoc, doc } from "firebase/firestore";
import { useAuth } from "../../../../contexts/AuthContext";
import { useBusiness } from "../../../../contexts/ManagerBusinessContext";
import { toast } from "react-hot-toast";
import EmployeeDropdown from "../ManagerEmployeeDropdown";
import {
  Users,
  Briefcase,
  User,
  AlertCircle,
  CheckCircle,
  FileText,
  Target,
} from "lucide-react";

export const ManagerWorkAssigned = () => {
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [workDetails, setWorkDetails] = useState({
    title: "",
    description: "",
    instructions: "",
  });
  const [loading, setLoading] = useState(false);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setWorkDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle work assignment submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser || !currentBusiness?.id) {
      toast.error(
        "Please ensure you are logged in and have selected a business"
      );
      return;
    }

    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }

    if (!workDetails.title.trim()) {
      toast.error("Please enter a work title");
      return;
    }

    if (!workDetails.description.trim()) {
      toast.error("Please enter work description");
      return;
    }

    setLoading(true);

    try {
      // Create work assignment data
      const workAssignmentData = {
        // Employee Information
        employeeId: selectedEmployee.id,
        employeeName:
          selectedEmployee.displayName ||
          selectedEmployee.employeeName ||
          "Unknown Employee",
        employeeRole: selectedEmployee.role,

        // Work Details
        title: workDetails.title.trim(),
        description: workDetails.description.trim(),
        instructions: workDetails.instructions.trim(),

        // Assignment Information
        assignedBy: currentUser.uid,
        assignedByName:
          currentUser.displayName || currentUser.email || "Unknown",
        businessId: currentBusiness.id,
        businessName: currentBusiness.businessName,
        ownerId: currentUser.ownerId,

        // Status and Timestamps
        status: "assigned", // assigned, in_progress, completed, cancelled
        assignedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),

        // Optional tracking fields
        startedAt: null,
        completedAt: null,
        notes: "",
        attachments: [],
      };

      // Save to database structure: /owners/{ownerId}/businesses/{businessId}/temporaryWorks
      const ownerDocRef = doc(db, "owners", currentUser.ownerId);
      const businessDocRef = doc(ownerDocRef, "businesses", currentBusiness.id);
      const temporaryWorksCollectionRef = collection(
        businessDocRef,
        "temporaryWorks"
      );

      const docRef = await addDoc(
        temporaryWorksCollectionRef,
        workAssignmentData
      );

      toast.success(
        `Work assigned to ${workAssignmentData.employeeName} successfully`
      );

      // Reset form
      setSelectedEmployee(null);
      setWorkDetails({
        title: "",
        description: "",
        instructions: "",
      });
    } catch (error) {
      console.error("Error assigning work:", error);
      toast.error("Failed to assign work");
    } finally {
      setLoading(false);
    }
  };

  // No business selected state
  if (!currentBusiness) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Business Selected
          </h3>
          <p className="text-gray-600">
            Please select a business to assign work to employees.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
          <Briefcase className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Assign Work to Employee
          </h2>
          <p className="text-sm text-gray-600">
            {currentBusiness.businessName}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Selection */}
        <EmployeeDropdown
          selectedEmployee={selectedEmployee}
          onEmployeeSelect={setSelectedEmployee}
          label="Select Employee"
          placeholder="Choose an employee to assign work..."
          required={true}
          showEmployeeDetails={true}
          showAvatar={true}
          className="w-full"
        />

        {/* Work Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Target className="w-4 h-4 inline mr-1" />
            Work Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={workDetails.title}
            onChange={(e) => handleInputChange("title", e.target.value)}
            placeholder="Enter a clear, concise work title..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            required
          />
        </div>

        {/* Work Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="w-4 h-4 inline mr-1" />
            Work Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={workDetails.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder="Describe the work to be completed in detail..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
            required
          />
        </div>

        {/* Additional Instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Instructions (Optional)
          </label>
          <textarea
            value={workDetails.instructions}
            onChange={(e) => handleInputChange("instructions", e.target.value)}
            placeholder="Any specific instructions, requirements, or notes..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={
            loading ||
            !selectedEmployee ||
            !workDetails.title.trim() ||
            !workDetails.description.trim()
          }
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Assigning Work...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <Briefcase className="w-5 h-5 mr-2" />
              Assign Work
            </div>
          )}
        </button>
      </form>

      {/* Work Assignment Preview */}
      {selectedEmployee && workDetails.title && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-medium text-blue-800 mb-3 flex items-center">
            <CheckCircle className="w-4 h-4 mr-1" />
            Work Assignment Preview
          </h3>

          <div className="space-y-2 text-sm">
            {/* Employee Info */}
            <div className="flex items-center text-blue-700">
              <User className="w-4 h-4 mr-2" />
              <span className="font-medium">Employee:</span>
              <span className="ml-1">
                {selectedEmployee.displayName ||
                  selectedEmployee.employeeName ||
                  "Unknown Employee"}
              </span>
              {selectedEmployee.role && (
                <span className="ml-2 px-2 py-0.5 bg-blue-200 text-blue-800 rounded-full text-xs capitalize">
                  {selectedEmployee.role.replace("_", " ")}
                </span>
              )}
            </div>

            {/* Work Title */}
            <div className="flex items-center text-blue-700">
              <Target className="w-4 h-4 mr-2" />
              <span className="font-medium">Work:</span>
              <span className="ml-1">{workDetails.title}</span>
            </div>

            {/* Instructions */}
            {workDetails.instructions && (
              <div className="flex items-start text-blue-700">
                <FileText className="w-4 h-4 mr-2 mt-0.5" />
                <span className="font-medium">Instructions:</span>
                <span className="ml-1">{workDetails.instructions}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
