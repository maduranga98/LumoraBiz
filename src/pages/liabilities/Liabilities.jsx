import React, { useState, useMemo } from "react";

const Liabilities = () => {
  // Mock data - replace with your actual data source (Firebase, props, etc.)
  const [liabilities] = useState([
    {
      id: 1,
      name: "Home Mortgage",
      type: "Mortgage",
      totalAmount: 250000,
      remainingBalance: 180000,
      monthlyPayment: 1850,
      interestRate: 3.5,
      dueDate: "2025-07-01",
      status: "active",
    },
    {
      id: 2,
      name: "Car Loan",
      type: "Auto Loan",
      totalAmount: 35000,
      remainingBalance: 22000,
      monthlyPayment: 650,
      interestRate: 4.2,
      dueDate: "2025-06-15",
      status: "active",
    },
    {
      id: 3,
      name: "Credit Card - Visa",
      type: "Credit Card",
      totalAmount: 15000,
      remainingBalance: 8500,
      monthlyPayment: 250,
      interestRate: 18.9,
      dueDate: "2025-06-20",
      status: "active",
    },
    {
      id: 4,
      name: "Student Loan",
      type: "Education",
      totalAmount: 45000,
      remainingBalance: 12000,
      monthlyPayment: 340,
      interestRate: 6.8,
      dueDate: "2025-06-25",
      status: "active",
    },
    {
      id: 5,
      name: "Personal Loan",
      type: "Personal",
      totalAmount: 10000,
      remainingBalance: 0,
      monthlyPayment: 0,
      interestRate: 8.5,
      dueDate: "2025-05-15",
      status: "paid",
    },
  ]);

  const [activeTab, setActiveTab] = useState("overview");
  const [selectedType, setSelectedType] = useState("all");

  // Calculate totals and metrics
  const metrics = useMemo(() => {
    const activeLiabilities = liabilities.filter((l) => l.status === "active");
    const totalDebt = activeLiabilities.reduce(
      (sum, l) => sum + l.remainingBalance,
      0
    );
    const totalMonthlyPayments = activeLiabilities.reduce(
      (sum, l) => sum + l.monthlyPayment,
      0
    );
    const totalOriginalDebt = liabilities.reduce(
      (sum, l) => sum + l.totalAmount,
      0
    );
    const paidOffDebt = totalOriginalDebt - totalDebt;
    const averageInterestRate =
      activeLiabilities.length > 0
        ? activeLiabilities.reduce((sum, l) => sum + l.interestRate, 0) /
          activeLiabilities.length
        : 0;

    // Group by type
    const byType = activeLiabilities.reduce((acc, l) => {
      acc[l.type] = (acc[l.type] || 0) + l.remainingBalance;
      return acc;
    }, {});

    return {
      totalDebt,
      totalMonthlyPayments,
      totalOriginalDebt,
      paidOffDebt,
      averageInterestRate,
      activeLiabilities: activeLiabilities.length,
      byType,
    };
  }, [liabilities]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getProgressPercentage = (remaining, total) => {
    return ((total - remaining) / total) * 100;
  };

  const getStatusColor = (status) => {
    return status === "paid" ? "text-green-600" : "text-orange-600";
  };

  const getTypeIcon = (type) => {
    const icons = {
      Mortgage: "🏠",
      "Auto Loan": "🚗",
      "Credit Card": "💳",
      Education: "🎓",
      Personal: "💼",
    };
    return icons[type] || "📄";
  };

  const filteredLiabilities = useMemo(() => {
    let filtered = liabilities;
    if (selectedType !== "all") {
      filtered = filtered.filter((l) => l.type === selectedType);
    }
    return filtered;
  }, [liabilities, selectedType]);

  const LiabilityCard = ({ liability }) => {
    const progress = getProgressPercentage(
      liability.remainingBalance,
      liability.totalAmount
    );

    return (
      <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors duration-200">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getTypeIcon(liability.type)}</span>
            <div>
              <h4 className="font-semibold text-gray-900">{liability.name}</h4>
              <p className="text-sm text-gray-500">{liability.type}</p>
            </div>
          </div>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              liability.status === "paid"
                ? "bg-green-100 text-green-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            {liability.status === "paid" ? "Paid Off" : "Active"}
          </span>
        </div>

        <div className="space-y-3">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">{progress.toFixed(1)}% paid</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Financial Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Remaining</p>
              <p className="font-semibold text-gray-900">
                {formatCurrency(liability.remainingBalance)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Monthly Payment</p>
              <p className="font-semibold text-gray-900">
                {formatCurrency(liability.monthlyPayment)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Interest Rate</p>
              <p className="font-semibold text-gray-900">
                {liability.interestRate}%
              </p>
            </div>
            <div>
              <p className="text-gray-600">Next Due</p>
              <p className="font-semibold text-gray-900">
                {formatDate(liability.dueDate)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Liabilities</h1>
          <p className="text-gray-600">
            Track and manage your debts and financial obligations
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Debt</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(metrics.totalDebt)}
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
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {metrics.activeLiabilities} active debts
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Monthly Payments
                </p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {formatCurrency(metrics.totalMonthlyPayments)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <svg
                  className="w-6 h-6 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Monthly obligation</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Paid Off</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(metrics.paidOffDebt)}
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {(
                (metrics.paidOffDebt / metrics.totalOriginalDebt) *
                100
              ).toFixed(1)}
              % of total
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg Interest
                </p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {metrics.averageInterestRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Weighted average</p>
          </div>
        </div>

        {/* Tab Navigation and Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                  onClick={() => setActiveTab("details")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "details"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  All Liabilities
                </button>
              </nav>
            </div>

            {activeTab === "details" && (
              <div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="Mortgage">Mortgage</option>
                  <option value="Auto Loan">Auto Loan</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Education">Education</option>
                  <option value="Personal">Personal</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {activeTab === "overview" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Debt Breakdown by Type
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {Object.entries(metrics.byType).map(([type, amount]) => (
                  <div key={type} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getTypeIcon(type)}</span>
                      <span className="font-medium text-gray-900">{type}</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(amount)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {((amount / metrics.totalDebt) * 100).toFixed(1)}% of
                      total
                    </p>
                  </div>
                ))}
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Liabilities
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {liabilities
                  .filter((l) => l.status === "active")
                  .slice(0, 4)
                  .map((liability) => (
                    <LiabilityCard key={liability.id} liability={liability} />
                  ))}
              </div>
            </div>
          )}

          {activeTab === "details" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                {selectedType === "all"
                  ? "All Liabilities"
                  : `${selectedType} Liabilities`}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredLiabilities.map((liability) => (
                  <LiabilityCard key={liability.id} liability={liability} />
                ))}
              </div>
              {filteredLiabilities.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No liabilities found for the selected filter</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Liabilities;
