import React, { useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Package,
  Plus,
  ArrowRightLeft,
  FileText,
  Box,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Eye,
  PackagePlus,
} from "lucide-react";
import { SubStock } from "../../../components/sub_inventory/SubStock";
import { AddItems } from "../../../components/sub_inventory/AddItems";
import { ItemMove } from "../../../components/sub_inventory/ItemMove";

// Tab Navigation Component with improved styling
const TabNavigation = ({ activeTab, setActiveTab, tabs }) => (
  <div className="bg-white border-b border-gray-200">
    <div className="px-6">
      <nav className="flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`group relative py-4 px-1 text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <div className="flex items-center space-x-2">
              <span
                className={`transition-colors ${
                  activeTab === tab.id
                    ? "text-blue-600"
                    : "text-gray-400 group-hover:text-gray-500"
                }`}
              >
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full font-medium">
                  {tab.badge}
                </span>
              )}
            </div>
            {/* Active tab indicator */}
            <div
              className={`absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-blue-600 opacity-100"
                  : "bg-transparent opacity-0"
              }`}
            />
          </button>
        ))}
      </nav>
    </div>
  </div>
);

// Quick Stats Component
const QuickStats = () => {
  const stats = [
    {
      title: "Active Items",
      value: "24",
      icon: <Box className="h-6 w-6 text-blue-600" />,
      color: "blue",
      trend: "+2 this week",
    },
    {
      title: "Low Stock Alerts",
      value: "3",
      icon: <AlertTriangle className="h-6 w-6 text-yellow-600" />,
      color: "yellow",
      trend: "Requires attention",
    },
    {
      title: "Today's Movements",
      value: "12",
      icon: <ArrowRightLeft className="h-6 w-6 text-purple-600" />,
      color: "purple",
      trend: "8 in, 4 out",
    },
    {
      title: "Total Stock Value",
      value: "Rs.1.2M",
      icon: <DollarSign className="h-6 w-6 text-green-600" />,
      color: "green",
      trend: "+5.2% from last month",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-gray-50">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg bg-${stat.color}-50`}>
              {stat.icon}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
          <div>
            <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.trend}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export const SubStockPage = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Tab configuration
  const tabs = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      id: "overview",
      label: "Current Stock",
      icon: <BarChart3 className="h-5 w-5" />,
    },

    {
      id: "add",
      label: "Add Stock",
      icon: <Plus className="h-5 w-5" />,
    },
    {
      id: "move",
      label: "Move Items",
      icon: <ArrowRightLeft className="h-5 w-5" />,
    },
    {
      id: "history",
      label: "Movement History",
      icon: <FileText className="h-5 w-5" />,
    },
  ];

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="p-6">
            <div className="text-center py-12">
              <div className="mb-6">
                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Inventory Dashboard
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Welcome to your inventory management dashboard. Use the tabs
                above to navigate through different sections.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setActiveTab("overview")}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Eye className="h-4 w-4" />
                  <span>View Current Stock</span>
                </button>
                <button
                  onClick={() => setActiveTab("add")}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <PackagePlus className="h-4 w-4" />
                  <span>Add New Stock</span>
                </button>
              </div>
            </div>
          </div>
        );
      case "overview":
        return (
          <div className="p-6">
            <SubStock />
          </div>
        );

      case "add":
        return (
          <div className="p-6">
            <AddItems />
          </div>
        );
      case "move":
        return (
          <div className="p-6">
            <ItemMove />
          </div>
        );
      case "history":
        return (
          <div className="p-6">
            <div className="text-center py-12">
              <div className="mb-6">
                <FileText className="h-16 w-16 text-gray-400 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Movement History
              </h3>
              <p className="text-gray-600">
                Coming soon - Track all inventory movements and changes.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="px-6 py-6 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Inventory Management
            </h1>
            <p className="text-gray-600 mt-1">
              Complete stock management system for your rice mill operations
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white shadow-sm border border-gray-200">
        {/* Tab Navigation */}
        <TabNavigation
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tabs={tabs}
        />

        {/* Quick Stats - Show below tabs only on dashboard */}
        {activeTab === "dashboard" && <QuickStats />}

        {/* Tab Content */}
        <div className="min-h-96">{renderTabContent()}</div>
      </div>
    </div>
  );
};
