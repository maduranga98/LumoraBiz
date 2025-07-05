import React, { useState, useEffect } from "react";
import AddingPaddyStock from "../../stock/AddingPaddyStock";
import Buyers from "../../../components/Buyers/Buyers";
import ViewPaddyStock from "../../stock/ViewPaddyStock";
import ProcessedProducts from "../../stock/Processed";
import CreatingProducts from "../../stock/CreatingProducts";
import { Plus, Package, History, Users, Factory } from "lucide-react";

export const Stock = () => {
  const [activeTab, setActiveTab] = useState("addPaddy");
  const [loading, setLoading] = useState(false);

  const menuItems = [
    {
      id: "addPaddy",
      title: "Add Paddy",
      description: "Record new paddy purchases",
      icon: <Plus className="w-5 h-5" />,
      gradient: "from-emerald-500 to-emerald-600",
      color: "emerald",
    },
    {
      id: "creatingProducts",
      title: "Creating Products",
      description: "Process paddy into products",
      icon: <Factory className="w-5 h-5" />,
      gradient: "from-blue-500 to-blue-600",
      color: "blue",
    },
    {
      id: "products",
      title: "Products",
      description: "Manage processed inventory",
      icon: <Package className="w-5 h-5" />,
      gradient: "from-violet-500 to-violet-600",
      color: "violet",
    },
    {
      id: "purchaseHistory",
      title: "Purchase History",
      description: "View purchase records",
      icon: <History className="w-5 h-5" />,
      gradient: "from-amber-500 to-amber-600",
      color: "amber",
    },
    {
      id: "manageBuyers",
      title: "Manage Buyers",
      description: "Edit buyer information",
      icon: <Users className="w-5 h-5" />,
      gradient: "from-indigo-500 to-indigo-600",
      color: "indigo",
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "addPaddy":
        return (
          <AddingPaddyStock
            key="add-paddy"
            onSuccessfulAdd={() => {
              setTimeout(() => {
                setActiveTab("purchaseHistory");
              }, 1000);
            }}
          />
        );
      case "creatingProducts":
        return <CreatingProducts key="creating-products" />;
      case "products":
        return <ProcessedProducts key="products" />;
      case "purchaseHistory":
        return <ViewPaddyStock key="purchase-history" />;
      case "manageBuyers":
        return <Buyers key="manage-buyers" />;
      default:
        return (
          <AddingPaddyStock
            key="add-paddy"
            onSuccessfulAdd={() => {
              setTimeout(() => {
                setActiveTab("purchaseHistory");
              }, 1000);
            }}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full animate-spin border-t-indigo-500" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-indigo-300" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-gray-700">
            Loading Stock Management
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
                Stock Management
              </h1>
              <p className="text-base md:text-lg text-gray-600 max-w-2xl">
                Comprehensive inventory management platform for rice mill
                operations
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
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-indigo-500 rounded-full" />
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
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 to-blue-50/30 rounded-3xl" />

          {/* Content Container */}
          <div className="relative bg-white/80 backdrop-blur-sm border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
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

export default Stock;
