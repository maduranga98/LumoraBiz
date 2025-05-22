import React, { useState, useEffect } from "react";
import { db, auth } from "../../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { toast } from "react-hot-toast";

const MarkAttendance = () => {
  const [activeTab, setActiveTab] = useState("mark"); // 'mark' or 'view'
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingLoading, setMarkingLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceData, setAttendanceData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  // View attendance states
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreRecords, setHasMoreRecords] = useState(true);
  const recordsPerPage = 20;

  // Fetch active employees
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Fetch attendance when date changes
  useEffect(() => {
    if (activeTab === "mark") {
      fetchTodayAttendance();
    }
  }, [selectedDate, activeTab]);

  // Fetch attendance records when view tab is active
  useEffect(() => {
    if (activeTab === "view") {
      fetchAttendanceRecords(true);
    }
  }, [activeTab, filterEmployee, filterStatus, filterDate]);

  const fetchEmployees = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const businessId = localStorage.getItem("currentBusinessId");
      if (!businessId) return;

      const employeesQuery = query(
        collection(db, "employees"),
        where("businessId", "==", businessId),
        where("ownerId", "==", currentUser.uid),
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
      setLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const businessId = localStorage.getItem("currentBusinessId");
      if (!businessId) return;

      const attendanceQuery = query(
        collection(db, "attendance"),
        where("businessId", "==", businessId),
        where("date", "==", selectedDate)
      );

      const querySnapshot = await getDocs(attendanceQuery);
      const todayAttendance = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        todayAttendance[data.employeeId] = {
          id: doc.id,
          ...data,
        };
      });

      setAttendanceData(todayAttendance);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to fetch attendance data");
    }
  };

  const fetchAttendanceRecords = async (reset = false) => {
    if (reset) {
      setCurrentPage(1);
      setAttendanceRecords([]);
    }

    setViewLoading(true);
    try {
      const businessId = localStorage.getItem("currentBusinessId");
      if (!businessId) return;

      let attendanceQuery = query(
        collection(db, "attendance"),
        where("businessId", "==", businessId)
      );

      // Apply filters
      if (filterEmployee) {
        attendanceQuery = query(
          attendanceQuery,
          where("employeeId", "==", filterEmployee)
        );
      }
      if (filterStatus) {
        attendanceQuery = query(
          attendanceQuery,
          where("status", "==", filterStatus)
        );
      }
      if (filterDate) {
        attendanceQuery = query(
          attendanceQuery,
          where("date", "==", filterDate)
        );
      }

      // Order and limit
      attendanceQuery = query(
        attendanceQuery,
        orderBy("date", "desc"),
        orderBy("checkInTime", "desc"),
        limit(recordsPerPage)
      );

      // Pagination
      if (!reset && attendanceRecords.length > 0) {
        const lastRecord = attendanceRecords[attendanceRecords.length - 1];
        attendanceQuery = query(
          attendanceQuery,
          startAfter(lastRecord.date, lastRecord.checkInTime)
        );
      }

      const querySnapshot = await getDocs(attendanceQuery);
      const records = [];

      querySnapshot.forEach((doc) => {
        records.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      if (reset) {
        setAttendanceRecords(records);
      } else {
        setAttendanceRecords((prev) => [...prev, ...records]);
      }

      setHasMoreRecords(records.length === recordsPerPage);
      if (!reset) setCurrentPage((prev) => prev + 1);
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      toast.error("Failed to fetch attendance records");
    } finally {
      setViewLoading(false);
    }
  };

  const markAttendance = async (employee, status) => {
    setMarkingLoading(true);
    try {
      const currentUser = auth.currentUser;
      const businessId = localStorage.getItem("currentBusinessId");

      if (!currentUser || !businessId) {
        toast.error("Authentication required");
        return;
      }

      const now = new Date();
      const currentTime = now.toTimeString().split(" ")[0]; // HH:MM:SS format

      const existingAttendance = attendanceData[employee.id];

      if (existingAttendance) {
        // Update existing attendance
        const updateData = {};

        if (status === "present" && !existingAttendance.checkInTime) {
          updateData.checkInTime = currentTime;
          updateData.status = "present";
        } else if (
          status === "checkout" &&
          existingAttendance.checkInTime &&
          !existingAttendance.checkOutTime
        ) {
          updateData.checkOutTime = currentTime;

          // Calculate working hours
          const checkIn = new Date(
            `${selectedDate}T${existingAttendance.checkInTime}`
          );
          const checkOut = new Date(`${selectedDate}T${currentTime}`);
          const workingHours = (
            (checkOut - checkIn) /
            (1000 * 60 * 60)
          ).toFixed(2);
          updateData.workingHours = parseFloat(workingHours);
        } else {
          updateData.status = status;
          if (status === "absent") {
            updateData.checkInTime = null;
            updateData.checkOutTime = null;
            updateData.workingHours = 0;
          }
        }

        updateData.updatedAt = new Date();
        updateData.updatedBy = currentUser.uid;

        await updateDoc(
          doc(db, "attendance", existingAttendance.id),
          updateData
        );

        // Update local state
        setAttendanceData((prev) => ({
          ...prev,
          [employee.id]: {
            ...existingAttendance,
            ...updateData,
          },
        }));

        toast.success(`${employee.employeeName} attendance updated`);
      } else {
        // Create new attendance record
        const attendanceRecord = {
          employeeId: employee.id,
          employeeName: employee.employeeName,
          employeeRole: employee.role,
          businessId: businessId,
          ownerId: currentUser.uid,
          date: selectedDate,
          status: status,
          checkInTime: status === "present" ? currentTime : null,
          checkOutTime: null,
          workingHours: 0,
          notes: "",
          createdAt: new Date(),
          createdBy: currentUser.uid,
        };

        const docRef = await addDoc(
          collection(db, "attendance"),
          attendanceRecord
        );

        // Update local state
        setAttendanceData((prev) => ({
          ...prev,
          [employee.id]: {
            id: docRef.id,
            ...attendanceRecord,
          },
        }));

        toast.success(`${employee.employeeName} marked as ${status}`);
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast.error("Failed to mark attendance");
    } finally {
      setMarkingLoading(false);
    }
  };

  const getAttendanceStatus = (employee) => {
    const attendance = attendanceData[employee.id];
    if (!attendance) return "not_marked";
    return attendance.status;
  };

  const getEmployeeAttendanceTime = (employee) => {
    const attendance = attendanceData[employee.id];
    if (!attendance) return null;
    return {
      checkIn: attendance.checkInTime,
      checkOut: attendance.checkOutTime,
      workingHours: attendance.workingHours,
    };
  };

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const badges = {
      present: "bg-green-100 text-green-800",
      absent: "bg-red-100 text-red-800",
      late: "bg-yellow-100 text-yellow-800",
      half_day: "bg-blue-100 text-blue-800",
      not_marked: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          badges[status] || badges.not_marked
        }`}
      >
        {status === "not_marked"
          ? "Not Marked"
          : status.replace("_", " ").toUpperCase()}
      </span>
    );
  };

  const AttendanceCard = ({ employee }) => {
    const status = getAttendanceStatus(employee);
    const timeData = getEmployeeAttendanceTime(employee);
    const canCheckIn = status === "not_marked" || status === "absent";
    const canCheckOut =
      status === "present" && timeData?.checkIn && !timeData?.checkOut;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-3 mb-3">
          {employee.images?.employeePhoto ? (
            <img
              src={employee.images.employeePhoto}
              alt={employee.employeeName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 font-medium">
                {employee.employeeName?.charAt(0)}
              </span>
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">
              {employee.employeeName}
            </h3>
            <p className="text-sm text-gray-500 capitalize">
              {employee.role?.replace("_", " ")}
            </p>
          </div>
          {getStatusBadge(status)}
        </div>

        {timeData && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm">
            {timeData.checkIn && (
              <div className="flex justify-between">
                <span className="text-gray-600">Check In:</span>
                <span className="font-medium">{timeData.checkIn}</span>
              </div>
            )}
            {timeData.checkOut && (
              <div className="flex justify-between">
                <span className="text-gray-600">Check Out:</span>
                <span className="font-medium">{timeData.checkOut}</span>
              </div>
            )}
            {timeData.workingHours > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Working Hours:</span>
                <span className="font-medium">{timeData.workingHours}h</span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {canCheckIn && (
            <button
              onClick={() => markAttendance(employee, "present")}
              disabled={markingLoading}
              className="px-3 py-2 bg-green-100 text-green-700 text-sm rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
            >
              Check In
            </button>
          )}

          {canCheckOut && (
            <button
              onClick={() => markAttendance(employee, "checkout")}
              disabled={markingLoading}
              className="px-3 py-2 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              Check Out
            </button>
          )}

          <button
            onClick={() => markAttendance(employee, "absent")}
            disabled={markingLoading}
            className="px-3 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
          >
            Mark Absent
          </button>

          <button
            onClick={() => markAttendance(employee, "half_day")}
            disabled={markingLoading}
            className="px-3 py-2 bg-yellow-100 text-yellow-700 text-sm rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50"
          >
            Half Day
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-800 mb-4">
            Attendance Management
          </h1>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setActiveTab("mark")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "mark"
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Mark Attendance
            </button>
            <button
              onClick={() => setActiveTab("view")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "view"
                  ? "bg-white text-primary shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              View Records
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Mark Attendance Tab */}
          {activeTab === "mark" && (
            <div className="space-y-6">
              {/* Date Selection and Search */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Employees
                  </label>
                  <input
                    type="text"
                    placeholder="Search by name or role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>
              </div>

              {/* Attendance Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">
                  Today's Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <span className="block text-2xl font-bold text-green-600">
                      {
                        Object.values(attendanceData).filter(
                          (a) => a.status === "present"
                        ).length
                      }
                    </span>
                    <span className="text-gray-600">Present</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-2xl font-bold text-red-600">
                      {
                        Object.values(attendanceData).filter(
                          (a) => a.status === "absent"
                        ).length
                      }
                    </span>
                    <span className="text-gray-600">Absent</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-2xl font-bold text-yellow-600">
                      {
                        Object.values(attendanceData).filter(
                          (a) => a.status === "half_day"
                        ).length
                      }
                    </span>
                    <span className="text-gray-600">Half Day</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-2xl font-bold text-gray-600">
                      {employees.length - Object.keys(attendanceData).length}
                    </span>
                    <span className="text-gray-600">Not Marked</span>
                  </div>
                </div>
              </div>

              {/* Employee Cards */}
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No employees found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm
                      ? "Try adjusting your search"
                      : "No active employees available"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEmployees.map((employee) => (
                    <AttendanceCard key={employee.id} employee={employee} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* View Records Tab */}
          {activeTab === "view" && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Employee
                  </label>
                  <select
                    value={filterEmployee}
                    onChange={(e) => setFilterEmployee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  >
                    <option value="">All Employees</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.employeeName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  >
                    <option value="">All Status</option>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="half_day">Half Day</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Date
                  </label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFilterEmployee("");
                      setFilterStatus("");
                      setFilterDate("");
                    }}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              {/* Records Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check In
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check Out
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Working Hours
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {record.employeeName}
                              </div>
                              <div className="text-sm text-gray-500 capitalize">
                                {record.employeeRole?.replace("_", " ")}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(record.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.checkInTime || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.checkOutTime || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.workingHours
                            ? `${record.workingHours}h`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {attendanceRecords.length === 0 && !viewLoading && (
                  <div className="text-center py-12">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      No attendance records found
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Try adjusting your filters or mark some attendance first.
                    </p>
                  </div>
                )}
              </div>

              {/* Load More Button */}
              {hasMoreRecords && attendanceRecords.length > 0 && (
                <div className="text-center">
                  <button
                    onClick={() => fetchAttendanceRecords(false)}
                    disabled={viewLoading}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {viewLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Loading...
                      </div>
                    ) : (
                      "Load More Records"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarkAttendance;
