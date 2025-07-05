import React, { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import UpcomingMaintenance from "../../dashboard/UpcomingMaintenance";

// Optimized stat card component - Enhanced for responsive design
const StatCard = ({ title, value, icon, change, changeType }) => (
  <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
    <div className="flex justify-between items-start">
      <div className="flex-1 min-w-0">
        <p className="text-gray-600 text-sm font-medium truncate">{title}</p>
        <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 break-words">
          {value}
        </p>

        {change && (
          <div className="flex items-center mt-2">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                changeType === "increase"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {changeType === "increase" ? (
                <svg
                  className="w-3 h-3 mr-1 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-3 h-3 mr-1 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span className="hidden sm:inline">{change} from last month</span>
              <span className="sm:hidden">{change}</span>
            </span>
          </div>
        )}
      </div>
      <div className="bg-blue-50 p-2 sm:p-3 rounded-full flex-shrink-0 ml-2 sm:ml-0">
        {icon}
      </div>
    </div>
  </div>
);

// Quick action button component - Enhanced for responsive design
const QuickActionButton = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center p-3 sm:p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:scale-105 group w-full"
  >
    <div className="bg-blue-100 p-2 sm:p-3 rounded-full group-hover:bg-blue-200 transition-colors duration-200">
      {icon}
    </div>
    <span className="mt-2 sm:mt-3 text-xs sm:text-sm font-medium text-gray-700 group-hover:text-gray-900 text-center leading-tight">
      {label}
    </span>
  </button>
);

// Production metric card for responsive layout
const ProductionMetric = ({ value, label, bgColor, textColor }) => (
  <div className={`text-center p-3 sm:p-4 ${bgColor} rounded-lg`}>
    <div className={`text-lg sm:text-2xl font-bold ${textColor}`}>{value}</div>
    <div className="text-xs sm:text-sm text-gray-600 mt-1">{label}</div>
  </div>
);

export const Dashboard = () => {
  const { currentUser } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Enhanced stats data
  const stats = [
    {
      title: "Total Inventory",
      value: "24,500 kg",
      icon: (
        <svg
          className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
      change: "8%",
      changeType: "increase",
    },
    {
      title: "Monthly Production",
      value: "18,200 kg",
      icon: (
        <svg
          className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
      change: "5%",
      changeType: "increase",
    },
    {
      title: "Active Orders",
      value: "32",
      icon: (
        <svg
          className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      ),
      change: "12%",
      changeType: "increase",
    },
    {
      title: "Cash Flow",
      value: isMobile ? "Rs.146K" : "Rs.146,300",
      icon: (
        <svg
          className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      change: "3%",
      changeType: "decrease",
    },
  ];

  const quickActions = [
    {
      icon: (
        <svg
          className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      ),
      label: "New Order",
      onClick: () => console.log("New Order clicked"),
    },
    {
      icon: (
        <svg
          className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      label: "Generate Invoice",
      onClick: () => console.log("Generate Invoice clicked"),
    },
    {
      icon: (
        <svg
          className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      label: "Create Report",
      onClick: () => console.log("Create Report clicked"),
    },
    {
      icon: (
        <svg
          className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      label: "Schedule Maintenance",
      onClick: () => console.log("Schedule Maintenance clicked"),
    },
  ];

  const formatTime = () => {
    return new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = () => {
    const options = isMobile
      ? { weekday: "short", month: "short", day: "numeric" }
      : { weekday: "long", year: "numeric", month: "long", day: "numeric" };

    return new Date().toLocaleDateString("en-US", options);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Enhanced Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 text-white">
          <div className="flex flex-col space-y-3 sm:space-y-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
                Welcome back, {currentUser?.displayName || "User"}!
              </h1>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-blue-100">
              <span className="text-sm">{formatDate()}</span>
              <span className="hidden sm:inline text-sm">•</span>
              <span className="text-sm">{formatTime()}</span>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Grid - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Main Content Section - Responsive Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content Area */}
          <div className="xl:col-span-2 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Production Overview
              </h2>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium self-start sm:self-auto">
                View Details
              </button>
            </div>

            {/* Production metrics - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
              <ProductionMetric
                value="875 kg"
                label="Today's Output"
                bgColor="bg-green-50"
                textColor="text-green-600"
              />
              <ProductionMetric
                value="92%"
                label="Efficiency Rate"
                bgColor="bg-blue-50"
                textColor="text-blue-600"
              />
              <ProductionMetric
                value="3"
                label="Active Batches"
                bgColor="bg-orange-50"
                textColor="text-orange-600"
              />
            </div>

            {/* Production chart placeholder - Responsive */}
            <div className="bg-gray-50 rounded-lg p-4 sm:p-6 lg:p-8 text-center">
              <div className="text-gray-400 mb-2">
                <svg
                  className="mx-auto h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <p className="text-gray-500 text-sm sm:text-base">
                Production Analytics Chart
              </p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Weekly production trends and forecasts
              </p>
            </div>
          </div>

          {/* Upcoming Maintenance Sidebar - Responsive */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <UpcomingMaintenance />
          </div>
        </div>

        {/* Additional Mobile-Specific Bottom Section */}
        {isMobile && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Today's Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Rice Processed</span>
                <span className="text-sm font-medium text-gray-900">
                  2,450 kg
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Orders Completed</span>
                <span className="text-sm font-medium text-gray-900">8</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Revenue</span>
                <span className="text-sm font-medium text-green-600">
                  Rs. 48,500
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
