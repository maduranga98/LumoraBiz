import React, { useState } from "react";
import PaddyReport from "../../reports/PaddyReport";

export const Reports = () => {
  const [activeReport, setActiveReport] = useState("paddy");

  // Report tabs configuration
  const reportTabs = [
    { id: "paddy", name: "Paddy Purchase Reports", component: PaddyReport },
    // Add more report types here in the future
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Reports Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Reports Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Access and analyze your business data
        </p>
      </div>

      {/* Report Type Tabs */}
      {reportTabs.length > 1 && (
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {reportTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveReport(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeReport === tab.id
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Active Report Content */}
      <div>
        {reportTabs.map((tab) => {
          const ReportComponent = tab.component;
          return activeReport === tab.id ? (
            <ReportComponent key={tab.id} />
          ) : null;
        })}
      </div>
    </div>
  );
};

export default Reports;
