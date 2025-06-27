import React, { useState, useEffect } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import { useBusiness } from "../../../../contexts/ManagerBusinessContext";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  setDoc,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "../../../../services/firebase";
import { toast } from "react-hot-toast";
import {
  Calendar,
  Search,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Timer,
  UserCheck,
  Filter,
  RotateCcw,
  Eye,
  ClipboardList,
  TrendingUp,
  Loader2,
  UserX,
} from "lucide-react";

const MarkAttendance = () => {
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();

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

  // Fetch active employees when business changes
  useEffect(() => {
    if (currentBusiness?.id) {
      fetchEmployees();
    } else {
      setEmployees([]);
      setLoading(false);
    }
  }, [currentBusiness?.id]);

  // Fetch attendance when date changes or employees are loaded
  useEffect(() => {
    if (activeTab === "mark" && currentBusiness?.id && employees.length > 0) {
      fetchTodayAttendance();
    }
  }, [selectedDate, activeTab, currentBusiness?.id, employees.length]);

  // Fetch attendance records when view tab is active or filters change
  useEffect(() => {
    if (activeTab === "view" && currentBusiness?.id && employees.length > 0) {
      fetchAttendanceRecords(true);
    }
  }, [
    activeTab,
    filterEmployee,
    filterStatus,
    filterDate,
    currentBusiness?.id,
    employees.length,
  ]);

  const fetchEmployees = async () => {
    if (!currentUser || !currentBusiness?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log("Fetching employees for:", {
        ownerId: currentUser.uid,
        businessId: currentBusiness.id,
        businessName: currentBusiness.businessName,
      });

      // Use subcollection structure: owners/{userId}/businesses/{businessId}/employees
      const ownerDocRef = doc(db, "owners", currentUser.ownerId);
      const businessDocRef = doc(
        ownerDocRef,
        "businesses",
        currentUser.businessId
      );
      const employeesCollectionRef = collection(businessDocRef, "employees");

      // First, try to get all employees to see if any exist
      const allEmployeesSnapshot = await getDocs(employeesCollectionRef);
      console.log("Total employees found:", allEmployeesSnapshot.size);

      if (allEmployeesSnapshot.size === 0) {
        console.log("No employees found in the collection");
        setEmployees([]);
        return;
      }

      // Log all employees for debugging
      allEmployeesSnapshot.forEach((doc) => {
        console.log("Employee found:", doc.id, doc.data());
      });

      // Now query for active employees
      let employeesQuery;
      try {
        employeesQuery = query(
          employeesCollectionRef,
          where("status", "==", "active"),
          orderBy("name", "asc")
        );
      } catch (queryError) {
        console.log(
          "Error with complex query, trying simple query:",
          queryError
        );
        // If the complex query fails, try without orderBy
        employeesQuery = query(
          employeesCollectionRef,
          where("status", "==", "active")
        );
      }

      const querySnapshot = await getDocs(employeesQuery);
      const employeesList = [];

      console.log("Active employees found:", querySnapshot.size);

      querySnapshot.forEach((doc) => {
        const employeeData = {
          id: doc.id,
          ...doc.data(),
        };
        console.log("Active employee:", employeeData);
        employeesList.push(employeeData);
      });

      // If no active employees but there are employees, try getting all
      if (employeesList.length === 0 && allEmployeesSnapshot.size > 0) {
        console.log("No active employees found, getting all employees");
        allEmployeesSnapshot.forEach((doc) => {
          employeesList.push({
            id: doc.id,
            ...doc.data(),
          });
        });
      }

      setEmployees(employeesList);
      console.log("Final employees list:", employeesList);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to fetch employees");

      // Try a simpler approach as fallback
      try {
        console.log("Trying fallback query without filters");
        const ownerDocRef = doc(db, "owners", currentUser.uid);
        const businessDocRef = doc(
          ownerDocRef,
          "businesses",
          currentBusiness.id
        );
        const employeesCollectionRef = collection(businessDocRef, "employees");

        const fallbackSnapshot = await getDocs(employeesCollectionRef);
        const fallbackEmployees = [];

        fallbackSnapshot.forEach((doc) => {
          fallbackEmployees.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        setEmployees(fallbackEmployees);
        console.log("Fallback employees:", fallbackEmployees);
      } catch (fallbackError) {
        console.error("Fallback query also failed:", fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    if (!currentBusiness?.id || !currentUser || employees.length === 0) return;

    try {
      const todayAttendance = {};

      // Fetch attendance for each employee
      for (const employee of employees) {
        const ownerDocRef = doc(db, "owners", currentUser.uid);
        const businessDocRef = doc(
          ownerDocRef,
          "businesses",
          currentBusiness.id
        );
        const employeeDocRef = doc(businessDocRef, "employees", employee.id);
        const attendanceDocRef = doc(
          employeeDocRef,
          "attendance",
          selectedDate
        );

        try {
          const attendanceDoc = await getDoc(attendanceDocRef);

          if (attendanceDoc.exists()) {
            const data = attendanceDoc.data();
            todayAttendance[employee.id] = {
              id: selectedDate,
              employeeId: employee.id,
              date: selectedDate,
              ...data,
            };
          }
        } catch (employeeError) {
          // Employee might not have attendance record for this date
          console.log(
            `No attendance record for ${employee.name} on ${selectedDate}`
          );
        }
      }

      setAttendanceData(todayAttendance);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to fetch attendance data");
    }
  };

  const fetchAttendanceRecords = async (reset = false) => {
    if (!currentBusiness?.id || !currentUser || employees.length === 0) return;

    if (reset) {
      setCurrentPage(1);
      setAttendanceRecords([]);
    }

    setViewLoading(true);
    try {
      const records = [];

      // Get employees to filter by if needed
      let employeesToCheck = employees;
      if (filterEmployee) {
        employeesToCheck = employees.filter((emp) => emp.id === filterEmployee);
      }

      console.log("Fetching records for employees:", employeesToCheck.length);

      // Fetch attendance records for each employee
      for (const employee of employeesToCheck) {
        const ownerDocRef = doc(db, "owners", currentUser.uid);
        const businessDocRef = doc(
          ownerDocRef,
          "businesses",
          currentBusiness.id
        );
        const employeeDocRef = doc(businessDocRef, "employees", employee.id);
        const attendanceCollectionRef = collection(
          employeeDocRef,
          "attendance"
        );

        try {
          let querySnapshot;

          if (filterDate) {
            // If filtering by specific date, get that document directly
            const specificDateDoc = doc(attendanceCollectionRef, filterDate);
            const docSnapshot = await getDoc(specificDateDoc);

            if (docSnapshot.exists()) {
              const data = docSnapshot.data();

              // Apply status filter
              if (!filterStatus || data.status === filterStatus) {
                records.push({
                  id: `${employee.id}_${filterDate}`,
                  date: filterDate,
                  employeeId: employee.id,
                  employeeName: employee.name,
                  employeeRole: employee.role,
                  ...data,
                });
              }
            }
          } else {
            // Get all attendance records for this employee
            const querySnapshot = await getDocs(attendanceCollectionRef);

            querySnapshot.forEach((doc) => {
              const data = doc.data();

              // Apply status filter
              if (filterStatus && data.status !== filterStatus) {
                return;
              }

              records.push({
                id: `${employee.id}_${doc.id}`,
                date: doc.id, // Document ID is the date
                employeeId: employee.id,
                employeeName: employee.name,
                employeeRole: employee.role,
                ...data,
              });
            });
          }
        } catch (employeeError) {
          console.error(
            `Error fetching attendance for ${employee.name}:`,
            employeeError
          );
        }
      }

      console.log("Total records found:", records.length);

      // Sort records by date descending
      records.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Apply pagination
      const startIndex = reset ? 0 : attendanceRecords.length;
      const endIndex = startIndex + recordsPerPage;
      const paginatedRecords = records.slice(startIndex, endIndex);

      if (reset) {
        setAttendanceRecords(paginatedRecords);
      } else {
        setAttendanceRecords((prev) => [...prev, ...paginatedRecords]);
      }

      setHasMoreRecords(records.length > endIndex);
      if (!reset) setCurrentPage((prev) => prev + 1);

      console.log("Final paginated records:", paginatedRecords.length);
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      toast.error("Failed to fetch attendance records");
    } finally {
      setViewLoading(false);
    }
  };

  const markAttendance = async (employee, action) => {
    if (!currentUser || !currentBusiness?.id) {
      toast.error("Please select a business first");
      return;
    }

    setMarkingLoading(true);
    try {
      const now = new Date();
      const currentTime = now.toTimeString().split(" ")[0]; // HH:MM:SS format

      const existingAttendance = attendanceData[employee.id];

      // Reference to employee's attendance document for the selected date
      const ownerDocRef = doc(db, "owners", currentUser.uid);
      const businessDocRef = doc(ownerDocRef, "businesses", currentBusiness.id);
      const employeeDocRef = doc(businessDocRef, "employees", employee.id);
      const attendanceDocRef = doc(employeeDocRef, "attendance", selectedDate);

      let updateData = {};

      if (existingAttendance) {
        // Update existing attendance record
        if (action === "checkin") {
          // If already checked in, just update the check-in time (don't reset checkout)
          updateData.status = "present";
          updateData.inTime = currentTime;
          // Keep existing outTime if it exists
          if (!existingAttendance.outTime) {
            updateData.outTime = null;
          }
        } else if (action === "checkout") {
          if (!existingAttendance.inTime) {
            toast.error(
              `${employee.name} must check in first before checking out`
            );
            setMarkingLoading(false);
            return;
          }
          updateData.outTime = currentTime;
          // Keep status as present - employee has worked
        } else if (action === "absent") {
          updateData.status = "absent";
          updateData.inTime = null;
          updateData.outTime = null;
        } else if (action === "half_day") {
          updateData.status = "half_day";
          updateData.inTime = existingAttendance.inTime || currentTime;
          // Keep existing outTime if any
        }

        // Update the document
        await updateDoc(attendanceDocRef, updateData);

        // Update local state
        setAttendanceData((prev) => ({
          ...prev,
          [employee.id]: {
            ...existingAttendance,
            ...updateData,
          },
        }));
      } else {
        // Create new attendance record
        if (action === "checkout") {
          toast.error(
            `${employee.name} must check in first before checking out`
          );
          setMarkingLoading(false);
          return;
        }

        const attendanceRecord = {
          status: action === "checkin" ? "present" : action,
          inTime:
            action === "checkin" || action === "half_day" ? currentTime : null,
          outTime: null,
        };

        // Set the document with the date as document ID
        await setDoc(attendanceDocRef, attendanceRecord);

        // Update local state
        setAttendanceData((prev) => ({
          ...prev,
          [employee.id]: {
            id: selectedDate,
            employeeId: employee.id,
            date: selectedDate,
            ...attendanceRecord,
          },
        }));
      }

      // Success messages based on action
      let message = "";
      switch (action) {
        case "checkin":
          message = `${employee.name} checked in at ${currentTime}`;
          break;
        case "checkout":
          message = `${employee.name} checked out at ${currentTime}`;
          break;
        case "absent":
          message = `${employee.name} marked as absent`;
          break;
        case "half_day":
          message = `${employee.name} marked as half day`;
          break;
        default:
          message = `${employee.name} attendance updated`;
      }

      toast.success(message);
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
      checkIn: attendance.inTime,
      checkOut: attendance.outTime,
      workingHours:
        attendance.inTime && attendance.outTime
          ? calculateWorkingHours(attendance.inTime, attendance.outTime)
          : 0,
    };
  };

  const calculateWorkingHours = (inTime, outTime) => {
    if (!inTime || !outTime) return 0;

    const checkIn = new Date(`${selectedDate}T${inTime}`);
    const checkOut = new Date(`${selectedDate}T${outTime}`);
    const workingHours = ((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(2);
    return parseFloat(workingHours);
  };

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const badges = {
      present: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      absent: { color: "bg-red-100 text-red-800", icon: XCircle },
      late: { color: "bg-yellow-100 text-yellow-800", icon: Timer },
      half_day: { color: "bg-blue-100 text-blue-800", icon: Clock },
      not_marked: { color: "bg-gray-100 text-gray-800", icon: UserCheck },
    };

    const badge = badges[status] || badges.not_marked;
    const IconComponent = badge.icon;

    return (
      <span
        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}
      >
        <IconComponent className="w-3 h-3 mr-1" />
        {status === "not_marked"
          ? "Not Marked"
          : status.replace("_", " ").toUpperCase()}
      </span>
    );
  };

  const AttendanceCard = ({ employee }) => {
    const status = getAttendanceStatus(employee);
    const timeData = getEmployeeAttendanceTime(employee);

    // Determine available actions based on current state
    const canCheckIn = !timeData?.checkIn; // Can check in if no check-in time
    const canCheckOut = timeData?.checkIn && !timeData?.checkOut; // Can check out if checked in but not out
    const hasWorked = timeData?.checkIn; // Has some work record

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200">
        <div className="flex items-center space-x-4 mb-4">
          {employee.images?.employeePhoto ? (
            <img
              src={employee.images.employeePhoto}
              alt={employee.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {employee.name?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {employee.name}
            </h3>
            <p className="text-sm text-gray-600 capitalize">
              {employee.role?.replace("_", " ")}
            </p>
          </div>
          {getStatusBadge(status)}
        </div>

        {/* Time Display */}
        {timeData && (timeData.checkIn || timeData.checkOut) && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
            {timeData.checkIn && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-green-600" />
                  <span className="text-gray-600">Check In:</span>
                </div>
                <span className="font-medium text-gray-900">
                  {timeData.checkIn}
                </span>
              </div>
            )}
            {timeData.checkOut && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-red-600" />
                  <span className="text-gray-600">Check Out:</span>
                </div>
                <span className="font-medium text-gray-900">
                  {timeData.checkOut}
                </span>
              </div>
            )}
            {timeData.workingHours > 0 && (
              <div className="flex items-center justify-between text-sm border-t border-gray-200 pt-2">
                <div className="flex items-center space-x-2">
                  <Timer className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">Working Hours:</span>
                </div>
                <span className="font-bold text-blue-600">
                  {timeData.workingHours}h
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {/* Check In Button */}
          <button
            onClick={() => markAttendance(employee, "checkin")}
            disabled={markingLoading || !canCheckIn}
            className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              canCheckIn
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            {timeData?.checkIn ? "Re-Check In" : "Check In"}
          </button>

          {/* Check Out Button */}
          <button
            onClick={() => markAttendance(employee, "checkout")}
            disabled={markingLoading || !canCheckOut}
            className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              canCheckOut
                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Clock className="w-4 h-4 mr-1" />
            Check Out
          </button>

          {/* Mark Absent Button */}
          <button
            onClick={() => markAttendance(employee, "absent")}
            disabled={markingLoading}
            className="inline-flex items-center justify-center px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
          >
            <XCircle className="w-4 h-4 mr-1" />
            Mark Absent
          </button>

          {/* Half Day Button */}
          <button
            onClick={() => markAttendance(employee, "half_day")}
            disabled={markingLoading}
            className="inline-flex items-center justify-center px-4 py-2 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50"
          >
            <Timer className="w-4 h-4 mr-1" />
            Half Day
          </button>
        </div>

        {/* Status Information */}
        {status !== "not_marked" && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              {status === "present" &&
                timeData?.checkOut &&
                "Completed work day"}
              {status === "present" &&
                !timeData?.checkOut &&
                timeData?.checkIn &&
                "Currently working"}
              {status === "absent" && "Marked as absent"}
              {status === "half_day" && "Half day work"}
            </div>
          </div>
        )}
      </div>
    );
  };

  // No business selected state
  if (!currentBusiness) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Business Selected
          </h3>
          <p className="text-gray-600">
            Please select a business to manage attendance.
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
              Attendance Management
            </h1>
            <p className="text-gray-600 mt-1">{currentBusiness.businessName}</p>
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
                Attendance Management
              </h1>
              <p className="text-gray-600 mt-1">
                {currentBusiness.businessName}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{employees.length}</span> active
                employees
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setActiveTab("mark")}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "mark"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              Mark Attendance
            </button>
            <button
              onClick={() => setActiveTab("view")}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "view"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Eye className="w-4 h-4 mr-2" />
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
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Search className="w-4 h-4 inline mr-1" />
                    Search Employees
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name or role..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Attendance Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                    Today's Summary
                  </h3>
                  <span className="text-sm text-gray-600">
                    {new Date(selectedDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-center mb-2">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <span className="block text-2xl font-bold text-green-600">
                      {
                        Object.values(attendanceData).filter(
                          (a) => a.status === "present"
                        ).length
                      }
                    </span>
                    <span className="text-gray-600 text-sm">Present</span>
                  </div>
                  <div className="text-center bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-center mb-2">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <span className="block text-2xl font-bold text-red-600">
                      {
                        Object.values(attendanceData).filter(
                          (a) => a.status === "absent"
                        ).length
                      }
                    </span>
                    <span className="text-gray-600 text-sm">Absent</span>
                  </div>
                  <div className="text-center bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-center mb-2">
                      <Timer className="w-6 h-6 text-yellow-600" />
                    </div>
                    <span className="block text-2xl font-bold text-yellow-600">
                      {
                        Object.values(attendanceData).filter(
                          (a) => a.status === "half_day"
                        ).length
                      }
                    </span>
                    <span className="text-gray-600 text-sm">Half Day</span>
                  </div>
                  <div className="text-center bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-center mb-2">
                      <UserX className="w-6 h-6 text-gray-600" />
                    </div>
                    <span className="block text-2xl font-bold text-gray-600">
                      {employees.length - Object.keys(attendanceData).length}
                    </span>
                    <span className="text-gray-600 text-sm">Not Marked</span>
                  </div>
                </div>
              </div>

              {/* Employee Cards */}
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {employees.length === 0
                      ? "No active employees"
                      : "No employees found"}
                  </h3>
                  <p className="text-gray-500">
                    {searchTerm
                      ? "Try adjusting your search terms"
                      : "Add some employees to start tracking attendance"}
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
                    <Users className="w-4 h-4 inline mr-1" />
                    Filter by Employee
                  </label>
                  <select
                    value={filterEmployee}
                    onChange={(e) => setFilterEmployee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">All Employees</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Filter className="w-4 h-4 inline mr-1" />
                    Filter by Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Filter by Date
                  </label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFilterEmployee("");
                      setFilterStatus("");
                      setFilterDate("");
                    }}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Clear Filters
                  </button>
                </div>
              </div>

              {/* Records Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
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
                        <tr
                          key={record.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mr-3">
                                <span className="text-white font-semibold text-sm">
                                  {record.name?.charAt(0)?.toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {record.name}
                                </div>
                                <div className="text-sm text-gray-500 capitalize">
                                  {record.employeeRole?.replace("_", " ")}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                              {new Date(record.date).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(record.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              {record.inTime ? (
                                <>
                                  <Clock className="w-4 h-4 mr-2 text-green-500" />
                                  {record.inTime}
                                </>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              {record.outTime ? (
                                <>
                                  <Clock className="w-4 h-4 mr-2 text-red-500" />
                                  {record.outTime}
                                </>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              {record.inTime && record.outTime ? (
                                <>
                                  <Timer className="w-4 h-4 mr-2 text-blue-500" />
                                  {calculateWorkingHours(
                                    record.inTime,
                                    record.outTime
                                  )}
                                  h
                                </>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {attendanceRecords.length === 0 && !viewLoading && (
                    <div className="text-center py-12">
                      <ClipboardList className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No attendance records found
                      </h3>
                      <p className="text-gray-500">
                        {filterEmployee || filterStatus || filterDate
                          ? "Try adjusting your filters to see more results"
                          : "Start marking attendance to see records here"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Load More Button */}
              {hasMoreRecords && attendanceRecords.length > 0 && (
                <div className="text-center">
                  <button
                    onClick={() => fetchAttendanceRecords(false)}
                    disabled={viewLoading}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {viewLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Loading More...
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Load More Records
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Loading State for View Records */}
              {viewLoading && attendanceRecords.length === 0 && (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading attendance records...</p>
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
