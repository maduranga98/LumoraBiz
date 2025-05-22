import React, { useState, useEffect } from "react";
import { db, auth } from "../../../services/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import EmployeeList from "../../employees/EmployeeList";
import AddingEmployees from "../../employees/AddingEmployees";
import MarkAttendance from "../../employees/MarkAttendence";

const Employees = () => {
  const [activeSection, setActiveSection] = useState("overview");
  const [employeeStats, setEmployeeStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    roles: {},
  });
  const [todayAttendance, setTodayAttendance] = useState({
    present: 0,
    absent: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployeeStats();
    fetchTodayAttendance();
  }, []);

  const fetchEmployeeStats = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const businessId = localStorage.getItem("currentBusinessId");
      if (!businessId) return;

      const employeesQuery = query(
        collection(db, "employees"),
        where("businessId", "==", businessId),
        where("ownerId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(employeesQuery);
      let total = 0;
      let active = 0;
      let inactive = 0;
      const roles = {};

      querySnapshot.forEach((doc) => {
        const employee = doc.data();
        total++;

        if (employee.status === "active") {
          active++;
        } else {
          inactive++;
        }

        const role = employee.role || "unknown";
        roles[role] = (roles[role] || 0) + 1;
      });

      setEmployeeStats({ total, active, inactive, roles });
    } catch (error) {
      console.error("Error fetching employee stats:", error);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const businessId = localStorage.getItem("currentBusinessId");
      if (!businessId) return;

      const today = new Date().toISOString().split("T")[0];
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("businessId", "==", businessId),
        where("date", "==", today)
      );

      const querySnapshot = await getDocs(attendanceQuery);
      let present = 0;
      let absent = 0;

      querySnapshot.forEach((doc) => {
        const attendance = doc.data();
        if (attendance.status === "present") {
          present++;
        } else if (attendance.status === "absent") {
          absent++;
        }
      });

      setTodayAttendance({ present, absent, total: present + absent });
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      id: "overview",
      title: "Overview",
      description: "Employee statistics and quick insights",
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      color: "bg-blue-500",
      lightColor: "bg-blue-50",
      textColor: "text-blue-600",
    },
    {
      id: "add",
      title: "Add Employee",
      description: "Register new employees with documents",
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
      ),
      color: "bg-green-500",
      lightColor: "bg-green-50",
      textColor: "text-green-600",
    },
    {
      id: "manage",
      title: "Manage Employees",
      description: "View, edit, and manage employee records",
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
          />
        </svg>
      ),
      color: "bg-purple-500",
      lightColor: "bg-purple-50",
      textColor: "text-purple-600",
    },
    {
      id: "attendance",
      title: "Attendance",
      description: "Mark attendance and view records",
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
      color: "bg-orange-500",
      lightColor: "bg-orange-50",
      textColor: "text-orange-600",
    },
  ];

  const StatCard = ({ title, value, subtitle, color, icon }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full ${color}`}>{icon}</div>
      </div>
    </div>
  );

  const RoleCard = ({ role, count }) => (
    <div className="bg-gray-50 rounded-lg p-4 text-center">
      <p className="text-2xl font-bold text-gray-900">{count}</p>
      <p className="text-sm text-gray-600 capitalize">
        {role.replace("_", " ")}
      </p>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-accent rounded-xl p-8 text-white">
        <h2 className="text-2xl font-bold mb-2">Employee Management Hub</h2>
        <p className="text-primary-100 mb-6">
          Manage your workforce efficiently with comprehensive employee tools
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold">{employeeStats.total}</p>
            <p className="text-sm opacity-90">Total Employees</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold">{employeeStats.active}</p>
            <p className="text-sm opacity-90">Active Employees</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold">{todayAttendance.present}</p>
            <p className="text-sm opacity-90">Present Today</p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Employee Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Employees"
            value={employeeStats.total}
            subtitle="All registered employees"
            color="bg-blue-100"
            icon={
              <svg
                className="w-6 h-6 text-blue-600"
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
            }
          />

          <StatCard
            title="Active Employees"
            value={employeeStats.active}
            subtitle={`${employeeStats.inactive} inactive`}
            color="bg-green-100"
            icon={
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />

          <StatCard
            title="Present Today"
            value={todayAttendance.present}
            subtitle={`${todayAttendance.absent} absent`}
            color="bg-orange-100"
            icon={
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />

          <StatCard
            title="Attendance Rate"
            value={
              todayAttendance.total > 0
                ? `${Math.round(
                    (todayAttendance.present / todayAttendance.total) * 100
                  )}%`
                : "0%"
            }
            subtitle="Today's attendance"
            color="bg-purple-100"
            icon={
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            }
          />
        </div>
      </div>

      {/* Roles Breakdown */}
      {Object.keys(employeeStats.roles).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Employees by Role
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(employeeStats.roles).map(([role, count]) => (
              <RoleCard key={role} role={role} count={count} />
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {menuItems.slice(1).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`${item.lightColor} border-2 border-transparent hover:border-gray-200 rounded-xl p-6 text-left transition-all hover:shadow-md group`}
            >
              <div
                className={`${item.color} text-white p-3 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform`}
              >
                {item.icon}
              </div>
              <h4 className={`font-semibold ${item.textColor} mb-2`}>
                {item.title}
              </h4>
              <p className="text-gray-600 text-sm">{item.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Recent Activity
        </h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">
              Employee management system is ready to use
            </span>
            <span className="text-gray-400">Just now</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">
              Attendance tracking is available
            </span>
            <span className="text-gray-400">Today</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span className="text-gray-600">
              Employee registration system active
            </span>
            <span className="text-gray-400">Today</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "add":
        return <AddingEmployees />;
      case "manage":
        return <EmployeeList />;
      case "attendance":
        return <MarkAttendance />;
      default:
        return renderOverview();
    }
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Employee Management
          </h1>
          <p className="text-gray-600">
            Comprehensive employee management solution for your business
          </p>
        </div>

        {/* Navigation */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 w-fit">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeSection === item.id
                    ? "bg-white text-primary shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white hover:bg-opacity-50"
                }`}
              >
                <div className="w-5 h-5">
                  {React.cloneElement(item.icon, { className: "w-5 h-5" })}
                </div>
                <span className="hidden sm:block">{item.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-96">
          {activeSection === "overview" ? (
            <div className="p-6">{renderContent()}</div>
          ) : (
            renderContent()
          )}
        </div>
      </div>
    </div>
  );
};

export default Employees;
