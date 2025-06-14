import React, { useState, useMemo } from "react";

const Cashflow = () => {
  // Mock data - replace with your actual data source (Firebase, props, etc.)
  const [inflows] = useState([
    {
      id: 1,
      name: "Salary",
      amount: 5000,
      date: "2025-06-01",
      category: "Job",
    },
    {
      id: 2,
      name: "Freelance",
      amount: 1200,
      date: "2025-06-03",
      category: "Side Hustle",
    },
    {
      id: 3,
      name: "Investment Returns",
      amount: 300,
      date: "2025-06-05",
      category: "Investment",
    },
  ]);

  const [outflows] = useState([
    {
      id: 1,
      name: "Rent",
      amount: 1500,
      date: "2025-06-01",
      category: "Housing",
    },
    {
      id: 2,
      name: "Groceries",
      amount: 400,
      date: "2025-06-02",
      category: "Food",
    },
    {
      id: 3,
      name: "Utilities",
      amount: 200,
      date: "2025-06-03",
      category: "Bills",
    },
    {
      id: 4,
      name: "Transportation",
      amount: 150,
      date: "2025-06-04",
      category: "Transport",
    },
    {
      id: 5,
      name: "Entertainment",
      amount: 100,
      date: "2025-06-05",
      category: "Leisure",
    },
  ]);

  const [activeTab, setActiveTab] = useState("overview");

  // Calculate totals
  const totals = useMemo(() => {
    const totalInflows = inflows.reduce((sum, item) => sum + item.amount, 0);
    const totalOutflows = outflows.reduce((sum, item) => sum + item.amount, 0);
    const netCashflow = totalInflows - totalOutflows;

    return { totalInflows, totalOutflows, netCashflow };
  }, [inflows, outflows]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const FlowItem = ({ item, type }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{item.name}</h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500">{item.category}</span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-500">{formatDate(item.date)}</span>
        </div>
      </div>
      <div
        className={`font-semibold ${
          type === "inflow" ? "text-green-600" : "text-red-600"
        }`}
      >
        {type === "inflow" ? "+" : "-"}
        {formatCurrency(item.amount)}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cash Flow</h1>
          <p className="text-gray-600">
            Track your financial inflows and outflows
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Inflows
                </p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(totals.totalInflows)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 11l5-5m0 0l5 5m-5-5v12"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {inflows.length} income sources
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Outflows
                </p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(totals.totalOutflows)}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 13l-5 5m0 0l-5-5m5 5V6"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {outflows.length} expenses
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Net Cash Flow
                </p>
                <p
                  className={`text-2xl font-bold mt-1 ${
                    totals.netCashflow >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(totals.netCashflow)}
                </p>
              </div>
              <div
                className={`p-3 rounded-full ${
                  totals.netCashflow >= 0 ? "bg-green-100" : "bg-red-100"
                }`}
              >
                <svg
                  className={`w-6 h-6 ${
                    totals.netCashflow >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {totals.netCashflow >= 0 ? "Positive flow" : "Negative flow"}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("overview")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "overview"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("inflows")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "inflows"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Inflows ({inflows.length})
              </button>
              <button
                onClick={() => setActiveTab("outflows")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "outflows"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Outflows ({outflows.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Content based on active tab */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Inflows */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Inflows
                </h3>
                <div className="space-y-3">
                  {inflows.slice(0, 3).map((item) => (
                    <FlowItem
                      key={`inflow-${item.id}`}
                      item={item}
                      type="inflow"
                    />
                  ))}
                </div>
                {inflows.length > 3 && (
                  <button
                    onClick={() => setActiveTab("inflows")}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View all inflows →
                  </button>
                )}
              </div>

              {/* Recent Outflows */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Outflows
                </h3>
                <div className="space-y-3">
                  {outflows.slice(0, 3).map((item) => (
                    <FlowItem
                      key={`outflow-${item.id}`}
                      item={item}
                      type="outflow"
                    />
                  ))}
                </div>
                {outflows.length > 3 && (
                  <button
                    onClick={() => setActiveTab("outflows")}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View all outflows →
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === "inflows" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                All Inflows
              </h3>
              <div className="space-y-3">
                {inflows.map((item) => (
                  <FlowItem
                    key={`inflow-${item.id}`}
                    item={item}
                    type="inflow"
                  />
                ))}
              </div>
              {inflows.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No inflows recorded yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "outflows" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                All Outflows
              </h3>
              <div className="space-y-3">
                {outflows.map((item) => (
                  <FlowItem
                    key={`outflow-${item.id}`}
                    item={item}
                    type="outflow"
                  />
                ))}
              </div>
              {outflows.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No outflows recorded yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cashflow;
