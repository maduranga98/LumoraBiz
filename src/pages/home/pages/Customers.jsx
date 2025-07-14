import React, { useState, useEffect } from "react";

import { Users, MapPin, Plus } from "lucide-react";
import CustomerList from "../../customers/CustomerList";
import CustomerMap from "../../customers/CustomerMap";

export const Customers = () => {
  const [activeTab, setActiveTab] = useState("customerList");
  const [loading, setLoading] = useState(false);

  const menuItems = [
    {
      id: "customerList",
      title: "Customer List",
      description: "View and manage customer information",
      icon: <Users className="w-5 h-5" />,
      gradient: "from-blue-500 to-blue-600",
      color: "blue",
    },
    {
      id: "customerMap",
      title: "Map View",
      description: "View customer locations on map",
      icon: <MapPin className="w-5 h-5" />,
      gradient: "from-emerald-500 to-emerald-600",
      color: "emerald",
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "customerList":
        return <CustomerList key="customer-list" />;
      case "customerMap":
        return <CustomerMap key="customer-map" />;
      default:
        return <CustomerList key="customer-list" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full animate-spin border-t-blue-500" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-blue-300" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-gray-700">
            Loading Customer Management
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
                Customer Management
              </h1>
              <p className="text-base md:text-lg text-gray-600 max-w-2xl">
                Comprehensive customer management platform for efficient
                relationship management
              </p>
            </div>

            {/* Add Customer Button */}
            <div className="flex items-center space-x-3">
              <button className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm hover:shadow-md font-medium">
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </button>
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
                    className={`relative flex items-center space-x-2.5 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap ${
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
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
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
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-emerald-50/30 rounded-3xl" />

          {/* Content Container */}
          <div className="relative bg-white/80 backdrop-blur-sm border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
            {/* Content Header */}
            <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white/50 px-6 py-4">
              <div className="flex items-center justify-between">
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

                {/* Quick Actions */}
                <div className="hidden md:flex items-center space-x-2">
                  {activeTab === "customerList" && (
                    <>
                      <button
                        onClick={() => setActiveTab("customerMap")}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors duration-200"
                      >
                        <MapPin className="w-4 h-4 mr-1" />
                        View on Map
                      </button>
                    </>
                  )}
                  {activeTab === "customerMap" && (
                    <>
                      <button
                        onClick={() => setActiveTab("customerList")}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                      >
                        <Users className="w-4 h-4 mr-1" />
                        View List
                      </button>
                    </>
                  )}
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

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <div className="flex flex-col space-y-3">
          {/* Switch View Button */}
          <button
            onClick={() =>
              setActiveTab(
                activeTab === "customerList" ? "customerMap" : "customerList"
              )
            }
            className={`p-3 rounded-full shadow-lg transition-all duration-200 ${
              activeTab === "customerList"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {activeTab === "customerList" ? (
              <MapPin className="w-5 h-5" />
            ) : (
              <Users className="w-5 h-5" />
            )}
          </button>

          {/* Add Customer Button */}
          <button className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Customers;
