import React, { useState } from "react";
import { SubStock } from "../../../components/sub_inventory/SubStock";
import { Items } from "../../../components/sub_inventory/items";
import { AddItems } from "../../../components/sub_inventory/AddItems";
import { ItemMove } from "../../../components/sub_inventory/ItemMove";

// Tab Navigation Component
const TabNavigation = ({ activeTab, setActiveTab, tabs }) => (
  <div className="border-b border-muted bg-white rounded-t-xl">
    <nav className="flex space-x-1 px-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab.id
              ? "border-primary text-primary bg-primary bg-opacity-5"
              : "border-transparent text-muted hover:text-text hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center space-x-2">
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">
                {tab.badge}
              </span>
            )}
          </div>
        </button>
      ))}
    </nav>
  </div>
);

// Quick Stats Component
const QuickStats = () => {
  const stats = [
    {
      title: "Active Items",
      value: "24",
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
      color: "primary",
      trend: "+2 this week",
    },
    {
      title: "Low Stock Alerts",
      value: "3",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-yellow-600"
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
      color: "yellow",
      trend: "Requires attention",
    },
    {
      title: "Today's Movements",
      value: "12",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-accent"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      ),
      color: "accent",
      trend: "8 in, 4 out",
    },
    {
      title: "Total Stock Value",
      value: "Rs.1.2M",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-green-600"
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
      color: "green",
      trend: "+5.2% from last month",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-xl shadow-sm border border-muted p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`p-3 rounded-full bg-${stat.color} bg-opacity-10`}>
              {stat.icon}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </div>
          <div>
            <p className="text-muted text-sm font-medium">{stat.title}</p>
            <p className="text-xs text-muted mt-1">{stat.trend}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// Quick Actions Component
const QuickActions = ({ setActiveTab }) => {
  const actions = [
    {
      title: "Add New Stock",
      description: "Add items to inventory",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
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
      color: "bg-primary",
      onClick: () => setActiveTab("add"),
    },
    {
      title: "Move Items Out",
      description: "Process outgoing inventory",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      ),
      color: "bg-accent",
      onClick: () => setActiveTab("move"),
    },
    {
      title: "View Stock Levels",
      description: "Check current inventory",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      color: "bg-green-600",
      onClick: () => setActiveTab("overview"),
    },
    {
      title: "Manage Items",
      description: "Add/edit item definitions",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      color: "bg-purple-600",
      onClick: () => setActiveTab("items"),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={action.onClick}
          className={`${action.color} text-white p-4 rounded-xl hover:opacity-90 transition-opacity text-left`}
        >
          <div className="flex items-center space-x-3 mb-2">
            {action.icon}
            <h3 className="font-semibold">{action.title}</h3>
          </div>
          <p className="text-sm opacity-90">{action.description}</p>
        </button>
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
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2V5z"
          />
        </svg>
      ),
    },
    {
      id: "overview",
      label: "Current Stock",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      id: "items",
      label: "Manage Items",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
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
    },
    {
      id: "add",
      label: "Add Stock",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
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
    },
    {
      id: "move",
      label: "Move Items",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      ),
    },
    {
      id: "history",
      label: "Movement History",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
    },
  ];

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold text-text mb-4">
                Quick Actions
              </h3>
              <QuickActions setActiveTab={setActiveTab} />
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-muted p-6">
              <h3 className="text-lg font-semibold text-text mb-4">
                Recent Activity
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <div className="p-2 bg-green-100 rounded-full">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-green-600"
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
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text">
                      Added 500 KG of Rice to inventory
                    </p>
                    <p className="text-xs text-muted">2 hours ago</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
                  <div className="p-2 bg-red-100 rounded-full">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-red-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text">
                      Moved 200 KG Rice to Production
                    </p>
                    <p className="text-xs text-muted">4 hours ago</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-yellow-600"
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
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text">
                      Low stock alert: Paddy Bags
                    </p>
                    <p className="text-xs text-muted">1 day ago</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-muted">
                <button
                  onClick={() => setActiveTab("history")}
                  className="text-sm text-primary hover:opacity-80 font-medium"
                >
                  View all activity →
                </button>
              </div>
            </div>

            {/* Inventory Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-muted p-6">
                <h3 className="text-lg font-semibold text-text mb-4">
                  Stock Alerts
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-red-800">Raw Paddy</p>
                      <p className="text-sm text-red-600">
                        Critical: 50 KG remaining
                      </p>
                    </div>
                    <button className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                      Restock
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="font-medium text-yellow-800">
                        Packaging Bags
                      </p>
                      <p className="text-sm text-yellow-600">
                        Low: 200 pieces remaining
                      </p>
                    </div>
                    <button className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Order
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-muted p-6">
                <h3 className="text-lg font-semibold text-text mb-4">
                  Top Items by Value
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text">Premium Rice</span>
                    <span className="font-medium">Rs.2,40,000</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text">Standard Rice</span>
                    <span className="font-medium">Rs.1,80,000</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text">Rice Bran</span>
                    <span className="font-medium">Rs.45,000</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text">Broken Rice</span>
                    <span className="font-medium">Rs.25,000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "overview":
        return <SubStock />;
      case "items":
        return <Items />;
      case "add":
        return <AddItems />;
      case "move":
        return <ItemMove />;
      case "history":
        return <History />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text">Inventory Management</h1>
          <p className="text-muted mt-1">
            Complete stock management system for your rice mill operations
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>Export</span>
          </button>

          <button
            onClick={() => setActiveTab("add")}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
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
            <span>Add Stock</span>
          </button>
        </div>
      </div>

      {/* Quick Stats - Only show on dashboard */}
      {activeTab === "dashboard" && <QuickStats />}

      {/* Main Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-muted overflow-hidden">
        {/* Tab Navigation */}
        <TabNavigation
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tabs={tabs}
        />

        {/* Tab Content */}
        <div className="p-6">{renderTabContent()}</div>
      </div>

      {/* Help Section - Only show on dashboard */}
      {activeTab === "dashboard" && (
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                Rice Mill Inventory Management
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
                <div>
                  <h4 className="font-medium mb-1">Setup Process:</h4>
                  <ul className="space-y-1">
                    <li>• Define your items (paddy, rice, by-products)</li>
                    <li>• Set minimum stock levels for alerts</li>
                    <li>• Add initial inventory quantities</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Daily Operations:</h4>
                  <ul className="space-y-1">
                    <li>• Record incoming raw materials</li>
                    <li>• Track production outputs</li>
                    <li>• Monitor outgoing shipments</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Monitoring:</h4>
                  <ul className="space-y-1">
                    <li>• Check current stock levels</li>
                    <li>• Review movement history</li>
                    <li>• Respond to stock alerts</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
