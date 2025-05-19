// src/pages/home/pages/Dashboard.jsx
import React from "react";
import { useAuth } from "../../../contexts/AuthContext";

// Stat card component
const StatCard = ({ title, value, icon, change, changeType }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-muted">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-muted text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>

        {change && (
          <p
            className={`text-xs font-medium mt-2 ${
              changeType === "increase" ? "text-success" : "text-error"
            }`}
          >
            {changeType === "increase" ? "↑" : "↓"} {change} from last month
          </p>
        )}
      </div>
      <div className="bg-primary bg-opacity-10 p-3 rounded-full">{icon}</div>
    </div>
  </div>
);

// Activity item component
const ActivityItem = ({ icon, title, time, description, iconColor }) => (
  <div className="flex items-start space-x-3 py-3">
    <div className={`p-2 rounded-full bg-opacity-10 ${iconColor}`}>{icon}</div>
    <div>
      <div className="flex items-center">
        <p className="font-medium text-text">{title}</p>
        <span className="text-xs text-muted ml-2">{time}</span>
      </div>
      <p className="text-sm text-muted mt-1">{description}</p>
    </div>
  </div>
);

export const Dashboard = () => {
  const { currentUser } = useAuth();

  // Sample data (Replace with actual data from Firebase)
  const stats = [
    {
      title: "Total Inventory",
      value: "24,500 kg",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-primary"
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
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-primary"
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
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-primary"
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
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-primary"
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
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-green-500"
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
      iconColor: "bg-success",
      title: "New Order Received",
      time: "2 hours ago",
      description: "Received 1,200 kg of paddy from Green Fields Farms.",
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-blue-500"
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
      iconColor: "bg-primary",
      title: "Production Completed",
      time: "5 hours ago",
      description:
        "Batch #RF-2023-05-12 processed successfully. Yield: 875 kg.",
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-yellow-500"
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
      iconColor: "bg-warning",
      title: "Low Inventory Alert",
      time: "1 day ago",
      description:
        "Raw paddy stock approaching minimum threshold. Consider placing orders.",
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-purple-500"
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
      iconColor: "bg-accent",
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
    },
    {
      vehicle: "Mill Machine #2",
      type: "Regular Service",
      dueDate: "May 15, 2023",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-primary bg-opacity-10 rounded-xl p-6">
        <h1 className="text-xl font-semibold text-primary">
          Welcome back, {currentUser?.displayName || "User"}!
        </h1>
        <p className="text-muted mt-1">
          Here's what's happening with LumoraBiz today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Two Column Section - Recent Activity and Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-muted p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="divide-y divide-muted">
            {recentActivities.map((activity, index) => (
              <ActivityItem key={index} {...activity} />
            ))}
          </div>
        </div>

        {/* Upcoming Maintenance */}
        <div className="bg-white rounded-xl shadow-sm border border-muted p-6">
          <h2 className="text-lg font-semibold mb-4">Upcoming Maintenance</h2>
          <div className="space-y-4">
            {upcomingMaintenance.map((item, index) => (
              <div key={index} className="border-l-4 border-warning pl-4 py-2">
                <p className="font-medium">{item.vehicle}</p>
                <p className="text-sm text-muted">{item.type}</p>
                <p className="text-xs text-warning mt-1">Due: {item.dueDate}</p>
              </div>
            ))}
          </div>
          <button className="mt-6 w-full bg-primary text-white py-2 rounded-md hover:opacity-90 transition-opacity">
            View All Maintenance
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-muted p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center justify-center p-4 bg-primary bg-opacity-5 rounded-lg hover:bg-opacity-10 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-primary"
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
            <span className="mt-2 text-sm">New Order</span>
          </button>

          <button className="flex flex-col items-center justify-center p-4 bg-primary bg-opacity-5 rounded-lg hover:bg-opacity-10 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-primary"
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
            <span className="mt-2 text-sm">Generate Invoice</span>
          </button>

          <button className="flex flex-col items-center justify-center p-4 bg-primary bg-opacity-5 rounded-lg hover:bg-opacity-10 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-primary"
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
            <span className="mt-2 text-sm">Create Report</span>
          </button>

          <button className="flex flex-col items-center justify-center p-4 bg-primary bg-opacity-5 rounded-lg hover:bg-opacity-10 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-primary"
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
            <span className="mt-2 text-sm">Schedule Maintenance</span>
          </button>
        </div>
      </div>

      {/* LumoraBiz Promo */}
      <div className="bg-accent bg-opacity-5 rounded-xl p-6 text-center">
        <h2 className="text-lg font-semibold text-accent mb-2">
          Powered by LumoraBiz
        </h2>
        <p className="text-sm text-muted mb-4">
          Smart Tools for Smarter Business
        </p>
        <p className="text-xs text-muted">
          © {new Date().getFullYear()} Lumora Ventures Pvt Ltd. All rights
          reserved.
        </p>
      </div>
    </div>
  );
};
