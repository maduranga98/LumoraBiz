import React, { useState, useEffect } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import { useBusiness } from "../../../../contexts/ManagerBusinessContext";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../../../services/firebase";
import { toast } from "react-hot-toast";
import {
  X,
  Eye,
  Users,
  Search,
  Filter,
  Calendar,
  Phone,
  MapPin,
  IdCard,
  Loader2,
  Mail,
  User,
} from "lucide-react";

const ManagerEmployeeDirectory = () => {
  const { currentUser, userRole } = useAuth();
  const { currentBusiness } = useBusiness();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("active"); // Default to active employees

  // Modal states
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const roles = [
    { value: "driver", label: "Driver" },
    { value: "employee", label: "Employee" },
    { value: "sales_rep", label: "Sales Representative" },
    { value: "operator", label: "Operator" },
    { value: "manager", label: "Manager" },
    { value: "supervisor", label: "Supervisor" },
  ];

  // Get database paths based on user role
  const getEmployeesPath = () => {
    if (userRole === "owner") {
      return `owners/${currentUser.uid}/businesses/${currentBusiness.id}/employees`;
    } else if (userRole === "manager") {
      return `owners/${currentUser.ownerId}/businesses/${currentUser.businessId}/employees`;
    }
    return null;
  };

  // Fetch employees when business changes
  useEffect(() => {
    if (currentBusiness?.id && getEmployeesPath()) {
      fetchEmployees();
    } else {
      setEmployees([]);
      setLoading(false);
    }
  }, [currentBusiness?.id]);

  const fetchEmployees = async () => {
    if (!currentUser || !currentBusiness?.id) {
      setLoading(false);
      return;
    }

    const employeesPath = getEmployeesPath();
    if (!employeesPath) {
      console.error(
        "Could not determine employees path for user role:",
        userRole
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log("Manager fetching employees from path:", employeesPath);

      // Create collection reference using the path
      const employeesCollectionRef = collection(db, employeesPath);

      // Try with ordering first
      let employeesQuery;
      try {
        employeesQuery = query(
          employeesCollectionRef,
          orderBy("createdAt", "desc")
        );
      } catch (queryError) {
        console.log(
          "Query with orderBy failed, trying simple query:",
          queryError
        );
        employeesQuery = employeesCollectionRef;
      }

      const querySnapshot = await getDocs(employeesQuery);
      const employeesList = [];

      querySnapshot.forEach((doc) => {
        const employeeData = {
          id: doc.id,
          ...doc.data(),
        };
        employeesList.push(employeeData);
      });

      console.log("Manager found employees:", employeesList.length);
      setEmployees(employeesList);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.nicNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.mobile1?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !filterRole || employee.role === filterRole;
    const matchesStatus = !filterStatus || employee.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Open modal
  const openModal = (employee) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const isActive = status === "active";
    return (
      <span
        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
          isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}
      >
        {isActive ? "Active" : "Inactive"}
      </span>
    );
  };

  // Role badge component
  const RoleBadge = ({ role }) => {
    const roleColors = {
      driver: "bg-blue-100 text-blue-800",
      employee: "bg-gray-100 text-gray-800",
      sales_rep: "bg-purple-100 text-purple-800",
      operator: "bg-orange-100 text-orange-800",
      manager: "bg-green-100 text-green-800",
      supervisor: "bg-yellow-100 text-yellow-800",
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
          roleColors[role] || "bg-gray-100 text-gray-800"
        }`}
      >
        {roles.find((r) => r.value === role)?.label || role}
      </span>
    );
  };

  // Employee stats
  const employeeStats = {
    total: employees.length,
    active: employees.filter((emp) => emp.status === "active").length,
    inactive: employees.filter((emp) => emp.status === "inactive").length,
    byRole: roles.reduce((acc, role) => {
      acc[role.value] = employees.filter(
        (emp) => emp.role === role.value
      ).length;
      return acc;
    }, {}),
  };

  // No business selected state
  if (!currentBusiness) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Business Selected
          </h3>
          <p className="text-gray-600">
            Please select a business to view employee directory.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-800">
              Employee Directory
            </h1>
            <p className="text-gray-600 mt-1">
              {currentBusiness.businessName} • Manager View
            </p>
          </div>
          <div className="flex justify-center items-center min-h-64">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading employees...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">
                Employee Directory
              </h1>
              <p className="text-gray-600 mt-1">
                {currentBusiness.businessName} • Manager:{" "}
                {currentUser.displayName || currentUser.name}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{filteredEmployees.length}</span>{" "}
                employees
              </div>
            </div>
          </div>

          {/* Employee Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {employeeStats.total}
              </div>
              <div className="text-sm text-blue-800">Total</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {employeeStats.active}
              </div>
              <div className="text-sm text-green-800">Active</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {employeeStats.inactive}
              </div>
              <div className="text-sm text-red-800">Inactive</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {employeeStats.byRole.driver || 0}
              </div>
              <div className="text-sm text-purple-800">Drivers</div>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none"
              >
                <option value="">All Roles</option>
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex items-center justify-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterRole("");
                  setFilterStatus("active");
                }}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>

        {/* Employee List */}
        <div className="p-6">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {employees.length === 0
                  ? "No employees found"
                  : "No employees match your filters"}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ||
                filterRole ||
                (filterStatus && filterStatus !== "active")
                  ? "Try adjusting your filters to see more results"
                  : "No employees have been added to this business yet"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-all duration-200 border border-gray-100"
                >
                  {/* Employee Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {employee.images?.employeePhoto ? (
                        <img
                          src={employee.images.employeePhoto}
                          alt={employee.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">
                            {employee.name?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {employee.name}
                        </h3>
                        <RoleBadge role={employee.role} />
                      </div>
                    </div>
                    <StatusBadge status={employee.status} />
                  </div>

                  {/* Employee Details */}
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center space-x-2">
                      <IdCard className="w-4 h-4" />
                      <span className="font-medium">NIC:</span>
                      <span>{employee.nicNumber}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4" />
                      <span className="font-medium">Mobile:</span>
                      <span>{employee.mobile1}</span>
                    </div>
                    {employee.address && (
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-4 h-4 mt-0.5" />
                        <span className="font-medium">Address:</span>
                        <span className="line-clamp-2">{employee.address}</span>
                      </div>
                    )}
                    {employee.status === "inactive" && employee.leftDate && (
                      <div className="flex items-center space-x-2 text-red-600">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">Left:</span>
                        <span>
                          {new Date(employee.leftDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Button - Manager can only view */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openModal(employee)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* View Modal */}
      {isModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Employee Details</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                      Personal Information
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Employee Name
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedEmployee.name}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        NIC Number
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedEmployee.nicNumber}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Role
                      </label>
                      <div className="mt-1">
                        <RoleBadge role={selectedEmployee.role} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Status
                      </label>
                      <div className="mt-1">
                        <StatusBadge status={selectedEmployee.status} />
                      </div>
                    </div>
                    {selectedEmployee.status === "inactive" &&
                      selectedEmployee.leftDate && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Left Date
                          </label>
                          <p className="mt-1 text-sm text-gray-900">
                            {new Date(
                              selectedEmployee.leftDate
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                      Contact Information
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Mobile 1
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedEmployee.mobile1}
                      </p>
                    </div>
                    {selectedEmployee.mobile2 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Mobile 2
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedEmployee.mobile2}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Address
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedEmployee.address}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Documents Section */}
                {selectedEmployee.images &&
                  Object.keys(selectedEmployee.images).length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                        Documents
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {selectedEmployee.images?.employeePhoto && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Employee Photo
                            </label>
                            <img
                              src={selectedEmployee.images.employeePhoto}
                              alt="Employee"
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                          </div>
                        )}
                        {selectedEmployee.images?.nicFront && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              NIC Front
                            </label>
                            <img
                              src={selectedEmployee.images.nicFront}
                              alt="NIC Front"
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                          </div>
                        )}
                        {selectedEmployee.images?.nicBack && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              NIC Back
                            </label>
                            <img
                              src={selectedEmployee.images.nicBack}
                              alt="NIC Back"
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                          </div>
                        )}
                        {selectedEmployee.images?.licenseFront && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              License Front
                            </label>
                            <img
                              src={selectedEmployee.images.licenseFront}
                              alt="License Front"
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                          </div>
                        )}
                        {selectedEmployee.images?.licenseBack && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              License Back
                            </label>
                            <img
                              src={selectedEmployee.images.licenseBack}
                              alt="License Back"
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {/* Close Button */}
                <div className="border-t border-gray-200 pt-6 flex justify-end">
                  <button
                    onClick={closeModal}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerEmployeeDirectory;
