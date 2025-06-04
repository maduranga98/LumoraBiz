import React, { useState, useEffect } from "react";
import { db, auth } from "../../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import Input from "../Input";

export const ManPower = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [assignedWork, setAssignedWork] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingEmployees, setFetchingEmployees] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Fetch employees from database
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          toast.error("User not authenticated");
          return;
        }

        // Get current business ID from localStorage
        const currentBusinessId = localStorage.getItem("currentBusinessId");
        if (!currentBusinessId) {
          toast.error("No business selected");
          return;
        }

        const employeesQuery = query(
          collection(db, "employees"),
          where("ownerId", "==", currentUser.uid),
          where("businessId", "==", currentBusinessId),
          where("status", "==", "active"),
          orderBy("employeeName", "asc")
        );

        const querySnapshot = await getDocs(employeesQuery);
        const employeesList = [];

        querySnapshot.forEach((doc) => {
          employeesList.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        setEmployees(employeesList);
      } catch (error) {
        console.error("Error fetching employees:", error);
        toast.error("Failed to fetch employees");
      } finally {
        setFetchingEmployees(false);
      }
    };

    fetchEmployees();
  }, []);

  // Handle employee selection
  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    setIsDropdownOpen(false);
  };

  // Handle work assignment submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }

    if (!assignedWork.trim()) {
      toast.error("Please enter the assigned work");
      return;
    }

    setLoading(true);

    try {
      const currentUser = auth.currentUser;
      const currentBusinessId = localStorage.getItem("currentBusinessId");

      const workAssignmentData = {
        employeeId: selectedEmployee.employeeId,
        employeeName: selectedEmployee.employeeName,
        employeeDocId: selectedEmployee.id,
        assignedWork: assignedWork.trim(),
        assignedBy: currentUser.uid,
        assignedByName: currentUser.displayName || "Unknown",
        businessId: currentBusinessId,
        ownerId: currentUser.uid,
        status: "assigned",
        assignedAt: new Date(),
        createdAt: new Date(),
      };

      await addDoc(collection(db, "workAssignments"), workAssignmentData);

      toast.success("Work assigned successfully");

      // Reset form
      setSelectedEmployee("");
      setAssignedWork("");
    } catch (error) {
      console.error("Error assigning work:", error);
      toast.error("Failed to assign work");
    } finally {
      setLoading(false);
    }
  };

  // Loading state for employees
  if (fetchingEmployees) {
    return (
      <div className="max-w-lg mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">Loading employees...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Assign Work to Employee
      </h2>

      {employees.length === 0 ? (
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <p className="text-gray-600">No active employees found</p>
          <p className="text-sm text-gray-400 mt-1">
            Add employees to assign work
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Employee Selection Dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee <span className="text-red-500">*</span>
            </label>

            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <span
                className={selectedEmployee ? "text-gray-900" : "text-gray-400"}
              >
                {selectedEmployee ? (
                  <div>
                    <span className="font-medium">
                      {selectedEmployee.employeeName}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({selectedEmployee.employeeId})
                    </span>
                  </div>
                ) : (
                  "Select an employee"
                )}
              </span>
              <svg
                className={`w-5 h-5 transition-transform ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                {employees.map((employee) => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => handleEmployeeSelect(employee)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {employee.employeeName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {employee.employeeId}
                        </p>
                        {employee.role && (
                          <p className="text-xs text-blue-600 capitalize">
                            {employee.role}
                          </p>
                        )}
                      </div>
                      {employee.mobile1 && (
                        <p className="text-sm text-gray-400">
                          {employee.mobile1}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assigned Work Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assigned Work <span className="text-red-500">*</span>
            </label>
            <textarea
              value={assignedWork}
              onChange={(e) => setAssignedWork(e.target.value)}
              placeholder="Enter the work to be assigned..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !selectedEmployee || !assignedWork.trim()}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Assigning Work...
              </div>
            ) : (
              "Assign Work"
            )}
          </button>
        </form>
      )}

      {/* Selected Employee Info */}
      {selectedEmployee && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            Selected Employee
          </h3>
          <div className="text-sm text-blue-700">
            <p>
              <span className="font-medium">Name:</span>{" "}
              {selectedEmployee.employeeName}
            </p>
            <p>
              <span className="font-medium">ID:</span>{" "}
              {selectedEmployee.employeeId}
            </p>
            <p>
              <span className="font-medium">Role:</span> {selectedEmployee.role}
            </p>
            {selectedEmployee.mobile1 && (
              <p>
                <span className="font-medium">Mobile:</span>{" "}
                {selectedEmployee.mobile1}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
