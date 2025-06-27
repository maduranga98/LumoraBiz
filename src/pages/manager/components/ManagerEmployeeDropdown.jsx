import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { db } from "../../../services/firebase";
import { collection, query, where, getDocs, doc } from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import { useBusiness } from "../../../contexts/ManagerBusinessContext";
import { toast } from "react-hot-toast";
import {
  Search,
  ChevronDown,
  User,
  Phone,
  Mail,
  Check,
  Users,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

const ManagerEmployeeDropdown = ({
  selectedEmployee,
  onEmployeeSelect,
  placeholder = "Select an employee",
  label = "Select Employee",
  required = false,
  disabled = false,
  className = "",
  showEmployeeDetails = true,
  filterByRole = null,
  excludeEmployees = [],
  showAvatar = true,
  size = "md",
  variant = "default",
}) => {
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();

  const [employees, setEmployees] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false); // Start with false, not true
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  const dropdownRef = useRef(null);

  // Size configuration
  const sizeConfig = useMemo(
    () => ({
      sm: {
        button: "px-3 py-2",
        text: "text-sm",
        icon: "w-4 h-4",
        dropdown: "max-h-60",
        padding: "p-2",
      },
      md: {
        button: "px-4 py-3",
        text: "text-base",
        icon: "w-5 h-5",
        dropdown: "max-h-80",
        padding: "p-3",
      },
      lg: {
        button: "px-5 py-4",
        text: "text-lg",
        icon: "w-6 h-6",
        dropdown: "max-h-96",
        padding: "p-4",
      },
    }),
    []
  );

  const config = sizeConfig[size] || sizeConfig.md;

  // Helper function to get display name for employee
  const getEmployeeDisplayName = useCallback((employee) => {
    return (
      employee.employeeName ||
      employee.name ||
      employee.fullName ||
      employee.firstName ||
      "Unnamed Employee"
    );
  }, []);

  // Fetch employees - simplified version
  const fetchEmployees = useCallback(async () => {
    // Check if we have the required data
    if (!currentUser?.ownerId) {
      setEmployees([]);
      setError("User not authenticated");
      return;
    }

    if (!currentUser?.businessId) {
      setEmployees([]);
      setError("No business selected");
      return;
    }

    setLoading(true);
    setError(null);
    setHasAttemptedFetch(true);

    try {
      // Build collection reference
      const ownerDocRef = doc(db, "owners", currentUser.ownerId);
      const businessDocRef = doc(
        ownerDocRef,
        "businesses",
        currentUser.businessId
      );
      const employeesCollectionRef = collection(businessDocRef, "employees");

      // Get all documents first
      const snapshot = await getDocs(employeesCollectionRef);

      if (snapshot.empty) {
        setEmployees([]);
        setError("No employees found");
        return;
      }

      // Process employees
      const allEmployees = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const employee = {
          id: doc.id,
          ...data,
          displayName: getEmployeeDisplayName({ id: doc.id, ...data }),
        };
        allEmployees.push(employee);
      });

      // Filter by status
      let filteredEmployees = allEmployees.filter(
        (emp) => emp.status === "active"
      );

      // Filter by role if specified
      if (filterByRole) {
        filteredEmployees = filteredEmployees.filter(
          (emp) => emp.role === filterByRole
        );
      }

      // Exclude employees if specified
      if (excludeEmployees.length > 0) {
        filteredEmployees = filteredEmployees.filter(
          (emp) => !excludeEmployees.includes(emp.id)
        );
      }

      // Sort employees
      filteredEmployees.sort((a, b) =>
        (a.displayName || "").localeCompare(b.displayName || "")
      );

      setEmployees(filteredEmployees);

      if (filteredEmployees.length === 0) {
        setError("No active employees found matching criteria");
      }
    } catch (error) {
      setError(`Failed to fetch employees: ${error.message}`);
      toast.error("Failed to fetch employees");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [
    currentUser?.ownerId,
    currentBusiness?.businessId,
    filterByRole,
    excludeEmployees,
    getEmployeeDisplayName,
  ]);

  // Effect to trigger fetch
  useEffect(() => {
    if (currentUser?.ownerId && currentUser?.businessId && !hasAttemptedFetch) {
      fetchEmployees();
    } else if (!currentUser?.ownerId || !currentUser.businessId) {
      setEmployees([]);
      setLoading(false);
      setError(null);
      setHasAttemptedFetch(false);
    }
  }, [
    currentUser?.ownerId,
    currentUser.businessId,
    hasAttemptedFetch,
    fetchEmployees,
  ]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter employees based on search
  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return employees;

    const searchLower = searchTerm.toLowerCase();
    return employees.filter(
      (employee) =>
        employee.displayName?.toLowerCase().includes(searchLower) ||
        employee.employeeName?.toLowerCase().includes(searchLower) ||
        employee.employeeId?.toLowerCase().includes(searchLower) ||
        employee.role?.toLowerCase().includes(searchLower) ||
        employee.mobile1?.includes(searchTerm) ||
        employee.email?.toLowerCase().includes(searchLower)
    );
  }, [employees, searchTerm]);

  // Event handlers
  const handleEmployeeSelect = useCallback(
    (employee) => {
      onEmployeeSelect(employee);
      setIsDropdownOpen(false);
      setSearchTerm("");
    },
    [onEmployeeSelect]
  );

  const toggleDropdown = useCallback(() => {
    if (!disabled) {
      setIsDropdownOpen(!isDropdownOpen);
    }
  }, [disabled, isDropdownOpen]);

  const handleRetry = useCallback(() => {
    setHasAttemptedFetch(false);
    setError(null);
    fetchEmployees();
  }, [fetchEmployees]);

  // Render avatar
  const renderAvatar = useCallback(
    (employee) => {
      if (!showAvatar) return null;

      if (employee.images?.employeePhoto) {
        return (
          <img
            src={employee.images.employeePhoto}
            alt={employee.displayName}
            className="w-8 h-8 rounded-full object-cover border border-gray-200"
            loading="lazy"
          />
        );
      }

      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
          <span className="text-white font-semibold text-sm">
            {employee.displayName?.charAt(0)?.toUpperCase() || "?"}
          </span>
        </div>
      );
    },
    [showAvatar]
  );

  // Debug current state
  console.log("🎯 Current state:", {
    loading,
    hasAttemptedFetch,
    employeesCount: employees.length,
    error,
    hasUser: !!currentUser?.ownerId,
    hasBusiness: !!currentUser.businessId,
  });

  // No business selected
  if (!currentUser.businessId) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div
          className={`w-full ${config.button} border border-gray-300 rounded-lg bg-gray-50 flex items-center`}
        >
          <AlertCircle className="w-4 h-4 text-amber-500 mr-2" />
          <span className="text-gray-500 text-sm">No business selected</span>
        </div>
      </div>
    );
  }

  // Loading state - only show when actually loading
  if (loading) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div
          className={`w-full ${config.button} border border-gray-300 rounded-lg bg-gray-50`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500 mr-2" />
              <span className="text-gray-500">Loading employees...</span>
            </div>
            <button
              onClick={handleRetry}
              className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
              type="button"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div
          className={`w-full ${config.button} border border-red-300 rounded-lg bg-red-50`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1 min-w-0">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
              <span className="text-red-600 text-sm truncate">{error}</span>
            </div>
            <button
              onClick={handleRetry}
              className="text-xs text-red-600 hover:text-red-800 underline ml-2 flex items-center gap-1 flex-shrink-0"
              type="button"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No employees found
  if (employees.length === 0 && hasAttemptedFetch) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div
          className={`w-full ${config.button} border border-gray-300 rounded-lg bg-gray-50`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-gray-500">
                {filterByRole
                  ? `No active ${filterByRole}s found`
                  : "No active employees found"}
              </span>
            </div>
            <button
              onClick={handleRetry}
              className="text-xs text-gray-600 hover:text-gray-800 underline flex items-center gap-1"
              type="button"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Normal dropdown - this should render when employees.length > 0

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
        className={`w-full ${config.button} ${
          config.text
        } text-left bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between transition-all duration-200 ${
          disabled
            ? "bg-gray-100 cursor-not-allowed opacity-60"
            : "hover:bg-gray-50 hover:border-gray-400 cursor-pointer"
        }`}
      >
        <div className="flex items-center flex-1 min-w-0">
          {selectedEmployee ? (
            <>
              {renderAvatar(selectedEmployee)}
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex items-center">
                  <span className="font-medium text-gray-900 truncate">
                    {selectedEmployee.displayName ||
                      getEmployeeDisplayName(selectedEmployee)}
                  </span>
                </div>
                {showEmployeeDetails &&
                  variant !== "compact" &&
                  selectedEmployee.role && (
                    <span className="text-xs text-blue-600 capitalize">
                      {selectedEmployee.role.replace("_", " ")}
                    </span>
                  )}
              </div>
            </>
          ) : (
            <>
              <User className="w-5 h-5 text-gray-400" />
              <span className="text-gray-400 ml-3">{placeholder}</span>
            </>
          )}
        </div>

        {!disabled && (
          <ChevronDown
            className={`${
              config.icon
            } text-gray-400 transition-transform duration-200 ml-2 flex-shrink-0 ${
              isDropdownOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && !disabled && (
        <div
          className={`absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg ${config.dropdown} overflow-hidden`}
        >
          {/* Search Input */}
          <div className={`${config.padding} border-b border-gray-200`}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                onClick={(e) => e.stopPropagation()}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Employee List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredEmployees.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="font-medium">No employees found</p>
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
                  className={`w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors duration-150 ${
                    selectedEmployee?.id === employee.id
                      ? "bg-blue-50 text-blue-700"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      {renderAvatar(employee)}
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex items-center">
                          <p className="font-medium text-gray-900 truncate">
                            {employee.displayName}
                          </p>
                        </div>

                        {showEmployeeDetails && variant !== "compact" && (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {employee.role && (
                              <span className="text-xs text-blue-600 capitalize bg-blue-100 px-2 py-0.5 rounded-full">
                                {employee.role.replace("_", " ")}
                              </span>
                            )}
                            {employee.email && (
                              <div className="flex items-center text-xs text-gray-400">
                                <Mail className="w-3 h-3 mr-1" />
                                <span className="truncate">
                                  {employee.email}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedEmployee?.id === employee.id && (
                      <Check className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer with count and business info */}
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {filteredEmployees.length} of {employees.length} employees
                {filterByRole && ` (${filterByRole}s only)`}
              </span>
              <span className="truncate ml-2 max-w-32">
                {currentBusiness.businessName}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerEmployeeDropdown;
