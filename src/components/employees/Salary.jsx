import React, { useState } from "react";
import PaySheet from "./PaySheet";
import Advanced from "./Advanced";

const Salary = () => {
  const [activeTab, setActiveTab] = useState("paysheet"); // 'paysheet' or 'advanced'

  const tabs = [
    {
      id: "paysheet",
      name: "Monthly Paysheet",
      description: "Generate monthly salary slips",
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
            strokeWidth="2"
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
      color: "blue",
    },
    {
      id: "advanced",
      name: "Advance & Daily Wages",
      description: "Process advance payments and daily wages",
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
            strokeWidth="2"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: "green",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Navigation */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? `bg-white shadow-sm text-${tab.color}-600 border border-${tab.color}-200`
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`mr-2 ${
                    activeTab === tab.id
                      ? `text-${tab.color}-600`
                      : "text-gray-400"
                  }`}
                >
                  {tab.icon}
                </span>
                <div className="text-left">
                  <div className="font-medium">{tab.name}</div>
                  <div className="text-xs opacity-75">{tab.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-300 ease-in-out">
        {activeTab === "paysheet" && (
          <div className="animate-fadeIn">
            <PaySheet />
          </div>
        )}

        {activeTab === "advanced" && (
          <div className="animate-fadeIn">
            <Advanced />
          </div>
        )}
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .bg-blue-100 {
          background-color: rgb(219 234 254);
        }

        .text-blue-600 {
          color: rgb(37 99 235);
        }

        .text-blue-700 {
          color: rgb(29 78 216);
        }

        .border-blue-200 {
          border-color: rgb(191 219 254);
        }

        .bg-green-100 {
          background-color: rgb(220 252 231);
        }

        .text-green-600 {
          color: rgb(22 163 74);
        }

        .text-green-700 {
          color: rgb(21 128 61);
        }

        .border-green-200 {
          border-color: rgb(187 247 208);
        }
      `}</style>
    </div>
  );
};

export default Salary;
