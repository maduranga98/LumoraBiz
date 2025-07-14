import React, { useState } from "react";
import AddVehicle from "../../logistics/AddVehicle";
import AddVehicleExpenses from "../../logistics/AddVehicleExpences";
import VehiclesList from "../../logistics/VehiclesList";
import ExpensesList from "../../logistics/ExpensesList";
import MaintenanceSchedule from "../../logistics/MaintenanceSchedule";
import LogisticsReports from "../../logistics/LogisticsReports";
import LogisticsDashboard from "../../logistics/LogisticsDashboard";
import {
  LayoutDashboard,
  Truck,
  Plus,
  Receipt,
  PlusCircle,
  Wrench,
  FileText,
} from "lucide-react";

export const Logistics = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Menu items with modern styling configuration
  const menuItems = [
    {
      id: "dashboard",
      title: "Dashboard",
      description: "Overview and analytics",
      icon: <LayoutDashboard className="w-5 h-5" />,
      gradient: "from-blue-500 to-blue-600",
      color: "blue",
    },
    {
      id: "vehicles",
      title: "Vehicles",
      description: "Manage vehicle fleet",
      icon: <Truck className="w-5 h-5" />,
      gradient: "from-green-500 to-green-600",
      color: "green",
    },
    {
      id: "addVehicle",
      title: "Add Vehicle",
      description: "Register new vehicle",
      icon: <Plus className="w-5 h-5" />,
      gradient: "from-emerald-500 to-emerald-600",
      color: "emerald",
    },
    {
      id: "expenses",
      title: "Expenses",
      description: "View expense records",
      icon: <Receipt className="w-5 h-5" />,
      gradient: "from-purple-500 to-purple-600",
      color: "purple",
    },
    {
      id: "addExpense",
      title: "Add Expense",
      description: "Record new expense",
      icon: <PlusCircle className="w-5 h-5" />,
      gradient: "from-amber-500 to-amber-600",
      color: "amber",
    },
    {
      id: "maintenance",
      title: "Maintenance",
      description: "Schedule and track maintenance",
      icon: <Wrench className="w-5 h-5" />,
      gradient: "from-orange-500 to-orange-600",
      color: "orange",
    },
    {
      id: "reports",
      title: "Reports",
      description: "Analytics and insights",
      icon: <FileText className="w-5 h-5" />,
      gradient: "from-indigo-500 to-indigo-600",
      color: "indigo",
    },
  ];

  // Render the appropriate content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <LogisticsDashboard />;
      case "vehicles":
        return <VehiclesList />;
      case "addVehicle":
        return <AddVehicle />;
      case "expenses":
        return <ExpensesList />;
      case "addExpense":
        return <AddVehicleExpenses />;
      case "maintenance":
        return <MaintenanceSchedule />;
      case "reports":
        return <LogisticsReports />;
      default:
        return <LogisticsDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="space-y-3">
              <h1 className="text-3xl md:text-3xl font-bold text-gray-900 tracking-tight">
                Logistics Management
              </h1>
              <p className="text-base md:text-lg text-gray-600 max-w-2xl">
                Comprehensive fleet management platform for vehicles, expenses,
                and maintenance
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex justify-center">
            <div className="inline-flex items-center bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-1.5 shadow-sm overflow-x-auto">
              {menuItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
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

        {/* Main Content Area - FIXED: Removed overflow-hidden and height constraints */}
        <div className="relative">
          {/* Background Decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50/30 to-accent-50/30 rounded-3xl" />

          {/* Content Container - FIXED: Removed overflow-hidden */}
          <div className="relative bg-white/80 backdrop-blur-sm border border-gray-200 rounded-3xl shadow-sm">
            {/* Content Header */}
            <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white/50 px-6 py-4">
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2 rounded-lg bg-gradient-to-br ${
                    menuItems.find((item) => item.id === activeTab)?.gradient
                  } text-white shadow-sm`}
                >
                  {menuItems.find((item) => item.id === activeTab)?.icon}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {menuItems.find((item) => item.id === activeTab)?.title}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {
                      menuItems.find((item) => item.id === activeTab)
                        ?.description
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic Content - FIXED: Removed min-h constraint */}
            <div className="relative">
              <div className="animate-fade-in">{renderContent()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logistics;
