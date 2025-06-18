import React, { useState } from "react";
import { BarChart3, Plus, ArrowRightLeft, FileText } from "lucide-react";
import { SubStock } from "../../../components/sub_inventory/SubStock";
import { AddItems } from "../../../components/sub_inventory/AddItems";
import { ItemMove } from "../../../components/sub_inventory/ItemMove";
import { History } from "../../../components/sub_inventory/History";

export const SubStockPage = () => {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    {
      id: "overview",
      label: "Current Stock",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    { id: "add", label: "Add Stock", icon: <Plus className="h-4 w-4" /> },
    {
      id: "move",
      label: "Move Items",
      icon: <ArrowRightLeft className="h-4 w-4" />,
    },
    {
      id: "history",
      label: "Movement History",
      icon: <FileText className="h-4 w-4" />,
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <SubStock />;
      case "add":
        return <AddItems />;
      case "move":
        return <ItemMove />;
      case "history":
        return <History />;
      default:
        return <SubStock />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="px-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Secondary Inventory Management
        </h1>
        <p className="text-gray-600 mt-1">Manage your secondary inventory</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "text-blue-600 border-blue-600"
                    : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-6">{renderTabContent()}</div>
    </div>
  );
};
