// src/pages/home/pages/Dashboard.jsx
import React from "react";
import { useAuth } from "../../../contexts/AuthContext";

// Optimized stat card component
const StatCard = ({ title, value, icon, change, changeType }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <p className="text-gray-600 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>

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
                  className="w-3 h-3 mr-1"
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
                  className="w-3 h-3 mr-1"
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
              {change} from last month
            </span>
          </div>
        )}
      </div>
      <div className="bg-blue-50 p-3 rounded-full">{icon}</div>
    </div>
  </div>
);

// Enhanced activity item component
const ActivityItem = ({ icon, title, time, description, iconColor }) => (
  <div className="flex items-start space-x-4 py-4 hover:bg-gray-50 rounded-lg px-2 transition-colors duration-200">
    <div
      className={`p-2 rounded-full ${iconColor} bg-opacity-10 flex-shrink-0`}
    >
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <p className="font-medium text-gray-900 truncate">{title}</p>
        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{time}</span>
      </div>
      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{description}</p>
    </div>
  </div>
);

// Quick action button component
const QuickActionButton = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:scale-105 group"
  >
    <div className="bg-blue-100 p-3 rounded-full group-hover:bg-blue-200 transition-colors duration-200">
      {icon}
    </div>
    <span className="mt-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">
      {label}
    </span>
  </button>
);

// Maintenance item component
const MaintenanceItem = ({ vehicle, type, dueDate, priority = "medium" }) => {
  const priorityColors = {
    high: "border-red-400 bg-red-50",
    medium: "border-yellow-400 bg-yellow-50",
    low: "border-green-400 bg-green-50",
  };

  return (
    <div
      className={`border-l-4 ${priorityColors[priority]} pl-4 py-3 rounded-r-lg`}
    >
      <p className="font-medium text-gray-900">{vehicle}</p>
      <p className="text-sm text-gray-600">{type}</p>
      <p className="text-xs text-gray-500 mt-1">Due: {dueDate}</p>
    </div>
  );
};

export const Dashboard = () => {
  const { currentUser } = useAuth();

  // Enhanced stats data
  const stats = [
    {
      title: "Total Inventory",
      value: "24,500 kg",
      icon: (
        <svg
          className="h-6 w-6 text-blue-600"
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
          className="h-6 w-6 text-blue-600"
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
          className="h-6 w-6 text-blue-600"
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
      value: "Rs.146,300",
      icon: (
        <svg
          className="h-6 w-6 text-blue-600"
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

  const recentActivities = [
    {
      icon: (
        <svg
          className="h-5 w-5 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      iconColor: "bg-green-500",
      title: "New Order Received",
      time: "2 hours ago",
      description: "Received 1,200 kg of paddy from Green Fields Farms.",
    },
    {
      icon: (
        <svg
          className="h-5 w-5 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      iconColor: "bg-blue-500",
      title: "Production Completed",
      time: "5 hours ago",
      description:
        "Batch #RF-2023-05-12 processed successfully. Yield: 875 kg.",
    },
    {
      icon: (
        <svg
          className="h-5 w-5 text-yellow-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
      iconColor: "bg-yellow-500",
      title: "Low Inventory Alert",
      time: "1 day ago",
      description:
        "Raw paddy stock approaching minimum threshold. Consider placing orders.",
    },
    {
      icon: (
        <svg
          className="h-5 w-5 text-purple-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      ),
      iconColor: "bg-purple-500",
      title: "Invoice Generated",
      time: "2 days ago",
      description:
        "Invoice #INV-2023-156 for Rs.56,200 generated for Sunshine Foods Ltd.",
    },
  ];

  const upcomingMaintenance = [
    {
      vehicle: "Truck - KA 01 AA 1234",
      type: "Oil Change",
      dueDate: "May 10, 2023",
      priority: "high",
    },
    {
      vehicle: "Mill Machine #2",
      type: "Regular Service",
      dueDate: "May 15, 2023",
      priority: "medium",
    },
    {
      vehicle: "Delivery Van - KA 02 BB 5678",
      type: "Brake Inspection",
      dueDate: "May 18, 2023",
      priority: "low",
    },
  ];

  const quickActions = [
    {
      icon: (
        <svg
          className="h-6 w-6 text-blue-600"
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
          className="h-6 w-6 text-blue-600"
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
          className="h-6 w-6 text-blue-600"
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
          className="h-6 w-6 text-blue-600"
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
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Enhanced Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Welcome back, {currentUser?.displayName || "User"}! 👋
              </h1>
              <p className="text-blue-100 mt-2 text-lg">
                Here's what's happening with LumoraBiz today.
              </p>
              <div className="flex items-center gap-4 mt-4 text-blue-100">
                <span className="text-sm">{formatDate()}</span>
                <span className="text-sm">•</span>
                <span className="text-sm">{formatTime()}</span>
              </div>
            </div>
            <div className="mt-6 md:mt-0">
              <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm text-blue-100 mb-1">Today's Goal</p>
                <p className="text-lg font-semibold">Complete 15 orders</p>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-white h-2 rounded-full"
                    style={{ width: "60%" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Two Column Section - Recent Activity and Maintenance */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Recent Activity
              </h2>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View all
              </button>
            </div>
            <div className="space-y-1">
              {recentActivities.map((activity, index) => (
                <ActivityItem key={index} {...activity} />
              ))}
            </div>
          </div>

          {/* Upcoming Maintenance */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Upcoming Maintenance
            </h2>
            <div className="space-y-4">
              {upcomingMaintenance.map((item, index) => (
                <MaintenanceItem key={index} {...item} />
              ))}
            </div>
            <button className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200">
              View All Maintenance
            </button>
          </div>
        </div>

        {/* Enhanced Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <QuickActionButton key={index} {...action} />
            ))}
          </div>
        </div>

        {/* Additional Insights Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Performance Overview */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Performance Overview
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Order Completion Rate</span>
                <span className="font-semibold text-green-600">92%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: "92%" }}
                ></div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Production Efficiency</span>
                <span className="font-semibold text-blue-600">87%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: "87%" }}
                ></div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Customer Satisfaction</span>
                <span className="font-semibold text-purple-600">95%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: "95%" }}
                ></div>
              </div>
            </div>
          </div>

          {/* Weather & Schedule */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Today's Schedule
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Team Meeting</p>
                  <p className="text-sm text-gray-600">Production Review</p>
                </div>
                <span className="text-sm font-medium text-blue-600">
                  10:00 AM
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Quality Check</p>
                  <p className="text-sm text-gray-600">Batch #RF-2023-05-15</p>
                </div>
                <span className="text-sm font-medium text-green-600">
                  2:00 PM
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Client Call</p>
                  <p className="text-sm text-gray-600">Sunshine Foods Ltd.</p>
                </div>
                <span className="text-sm font-medium text-yellow-600">
                  4:30 PM
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
