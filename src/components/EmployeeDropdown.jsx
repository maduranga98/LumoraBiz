import React, { useState, useEffect, useRef } from "react";
import { db, auth } from "../services/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { toast } from "react-hot-toast";

const EmployeeDropdown = ({
  selectedEmployee,
  onEmployeeSelect,
  placeholder = "Select an employee",
  label = "Select Employee",
  required = false,
  disabled = false,
  className = "",
  showEmployeeDetails = true,
  filterByRole = null, // Optional: filter employees by specific role
  excludeEmployees = [], // Optional: array of employee IDs to exclude
}) => {
  const [employees, setEmployees] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Fetch employees from database
  useEffect(() => {
    fetchEmployees();
  }, [filterByRole, excludeEmployees]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchEmployees = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error("User not authenticated");
        return;
      }

      const currentBusinessId = localStorage.getItem("currentBusinessId");
      if (!currentBusinessId) {
        toast.error("No business selected");
        return;
      }

      let employeesQuery = query(
        collection(db, "employees"),
        where("ownerId", "==", currentUser.uid),
        where("businessId", "==", currentBusinessId),
        where("status", "==", "active"),
        orderBy("employeeName", "asc")
      );

      // Add role filter if specified
      if (filterByRole) {
        employeesQuery = query(
          collection(db, "employees"),
          where("ownerId", "==", currentUser.uid),
          where("businessId", "==", currentBusinessId),
          where("status", "==", "active"),
          where("role", "==", filterByRole),
          orderBy("employeeName", "asc")
        );
      }

      const querySnapshot = await getDocs(employeesQuery);
      const employeesList = [];

      querySnapshot.forEach((doc) => {
        const employeeData = {
          id: doc.id,
          ...doc.data(),
        };

        // Exclude employees if specified
        if (!excludeEmployees.includes(employeeData.employeeId)) {
          employeesList.push(employeeData);
        }
      });

      setEmployees(employeesList);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = (employee) => {
    onEmployeeSelect(employee);
    setIsDropdownOpen(false);
    setSearchTerm("");
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsDropdownOpen(!isDropdownOpen);
    }
  };

  // Filter employees based on search term
  const filteredEmployees = employees.filter(
    (employee) =>
      employee.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.role &&
        employee.role.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Loading state
  if (loading) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
            <span className="text-gray-500">Loading employees...</span>
          </div>
        </div>
      </div>
    );
  }

  // No employees state
  if (employees.length === 0) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50">
          <span className="text-gray-500">
            {filterByRole
              ? `No active ${filterByRole}s found`
              : "No active employees found"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        className={`w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between transition-colors ${
          disabled
            ? "bg-gray-100 cursor-not-allowed"
            : "hover:bg-gray-50 cursor-pointer"
        }`}
      >
        <span className={selectedEmployee ? "text-gray-900" : "text-gray-400"}>
          {selectedEmployee ? (
            <div className="flex items-center">
              <div>
                <span className="font-medium">
                  {selectedEmployee.employeeName}
                </span>
                <span className="text-sm text-gray-500 ml-2">
                  ({selectedEmployee.employeeId})
                </span>
                {showEmployeeDetails && selectedEmployee.role && (
                  <span className="text-xs text-blue-600 ml-2 capitalize">
                    • {selectedEmployee.role}
                  </span>
                )}
              </div>
            </div>
          ) : (
            placeholder
          )}
        </span>

        {!disabled && (
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
        )}
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Employee List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredEmployees.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>No employees found</p>
                {searchTerm && (
                  <p className="text-xs mt-1">Try adjusting your search term</p>
                )}
              </div>
            ) : (
              filteredEmployees.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => handleEmployeeSelect(employee)}
                  className={`w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors ${
                    selectedEmployee?.id === employee.id
                      ? "bg-blue-50 text-blue-700"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {employee.employeeName}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        ID: {employee.employeeId}
                      </p>
                      {showEmployeeDetails && (
                        <div className="flex items-center gap-2 mt-1">
                          {employee.role && (
                            <span className="text-xs text-blue-600 capitalize bg-blue-100 px-2 py-0.5 rounded">
                              {employee.role}
                            </span>
                          )}
                          {employee.mobile1 && (
                            <span className="text-xs text-gray-400">
                              {employee.mobile1}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {selectedEmployee?.id === employee.id && (
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Employee Count */}
          <div className="p-2 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              {filteredEmployees.length} of {employees.length} employees
              {filterByRole && ` (${filterByRole}s only)`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDropdown;
