import React, { useState, useEffect } from "react";
import { db, auth } from "../../../services/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import EmployeeList from "../../employees/EmployeeList";
import AddingEmployees from "../../employees/AddingEmployees";
import MarkAttendance from "../../employees/MarkAttendence";
import { ManPower } from "../../../components/employees/ManPower";
import { WorkAssignmentsList } from "../../../components/employees/WorkAssignedList";
import PaySheet from "../../../components/employees/PaySheet";
import Salary from "../../../components/employees/Salary";

const Employees = () => {
  const [activeSection, setActiveSection] = useState("add");
  const [loading, setLoading] = useState(false);

  const menuItems = [
    {
      id: "add",
      title: "Add Employee",
      description: "Register new team members",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      ),
      gradient: "from-emerald-500 to-emerald-600",
      color: "emerald",
    },
    {
      id: "manage",
      title: "Manage",
      description: "Edit employee records",
      icon: (
        <svg
          className="w-5 h-5"
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
      gradient: "from-violet-500 to-violet-600",
      color: "violet",
    },
    {
      id: "attendance",
      title: "Attendance",
      description: "Track daily attendance",
      icon: (
        <svg
          className="w-5 h-5"
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
      ),
      gradient: "from-blue-500 to-blue-600",
      color: "blue",
    },
    {
      id: "manpower",
      title: "Assign Work",
      description: "Assign tasks to employees",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
      gradient: "from-amber-500 to-amber-600",
      color: "amber",
    },
    {
      id: "assignments",
      title: "Work Tracking",
      description: "View and manage assigned work",
      icon: (
        <svg
          className="w-5 h-5"
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
      gradient: "from-indigo-500 to-indigo-600",
      color: "indigo",
    },
    {
      id: "payroll",
      title: "Payroll",
      description: "Paysheets creations",
      icon: (
        <svg
          className="w-5 h-5"
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
      gradient: "from-indigo-500 to-indigo-600",
      color: "indigo",
    },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "add":
        return <AddingEmployees />;
      case "manage":
        return <EmployeeList />;
      case "attendance":
        return <MarkAttendance />;
      case "manpower":
        return <ManPower />;
      case "assignments":
        return <WorkAssignmentsList />;
      case "payroll":
        return <Salary />;
      default:
        return <AddingEmployees />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full animate-spin border-t-primary-500" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-primary-300" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-gray-700">
            Loading Employee Management
          </p>
          <p className="text-sm text-gray-500">
            Please wait while we prepare your workspace
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="space-y-3">
              <h1 className="text-3xl md:text-3xl font-bold text-gray-900 tracking-tight">
                Employee Management
              </h1>
              <p className="text-base md:text-lg text-gray-600 max-w-2xl">
                Comprehensive workforce management platform for modern
                businesses
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex justify-center">
            <div className="inline-flex items-center bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-1.5 shadow-sm overflow-x-auto">
              {menuItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`relative flex items-center space-x-2.5 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`${
                        isActive ? `text-${item.color}-600` : "text-gray-500"
                      } transition-colors duration-200`}
                    >
                      {item.icon}
                    </div>
                    <span className="hidden sm:block">{item.title}</span>

                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative">
          {/* Background Decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50/30 to-accent-50/30 rounded-3xl" />

          {/* Content Container */}
          <div className="relative bg-white/80 backdrop-blur-sm border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
            {/* Content Header */}
            <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white/50 px-6 py-4">
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2 rounded-lg bg-gradient-to-br ${
                    menuItems.find((item) => item.id === activeSection)
                      ?.gradient
                  } text-white shadow-sm`}
                >
                  {menuItems.find((item) => item.id === activeSection)?.icon}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {menuItems.find((item) => item.id === activeSection)?.title}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {
                      menuItems.find((item) => item.id === activeSection)
                        ?.description
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic Content */}
            <div className="relative min-h-96">
              <div className="animate-fade-in">{renderContent()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Employees;
