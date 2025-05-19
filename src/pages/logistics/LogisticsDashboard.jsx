import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  getDocs,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import {
  format,
  parseISO,
  isAfter,
  isBefore,
  addMonths,
  isToday,
} from "date-fns";

const LogisticsDashboard = ({ handleTabChange }) => {
  // State for loading and data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryData, setSummaryData] = useState({
    totalVehicles: 0,
    activeVehicles: 0,
    totalExpensesThisMonth: 0,
    fuelExpensesThisMonth: 0,
    pendingMaintenance: 0,
    vehiclesUnderRepair: 0,
  });

  // State for interactive elements
  const [expenseSort, setExpenseSort] = useState({
    field: "date",
    direction: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCard, setActiveCard] = useState(null);

  // Fetch all necessary data on component mount and when refreshing
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch vehicles data
      const vehiclesQuery = query(collection(db, "vehicles"));
      const vehiclesSnapshot = await getDocs(vehiclesQuery);
      const vehiclesData = [];
      vehiclesSnapshot.forEach((doc) => {
        vehiclesData.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      setVehicles(vehiclesData);

      // Fetch recent expenses
      const today = new Date();
      const firstDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );
      const lastDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      );

      const expensesQuery = query(
        collection(db, "vehicleExpenses"),
        orderBy("date", "desc")
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      const expensesData = [];
      expensesSnapshot.forEach((doc) => {
        expensesData.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      setExpenses(expensesData);

      // Fetch maintenance data
      const maintenanceQuery = query(
        collection(db, "maintenance"),
        orderBy("dueDate", "asc")
      );
      const maintenanceSnapshot = await getDocs(maintenanceQuery);
      const maintenanceData = [];
      maintenanceSnapshot.forEach((doc) => {
        // Process each maintenance item
        const data = doc.data();
        let status = "upcoming";
        const dueDate = parseISO(data.dueDate);

        if (data.completed) {
          status = "completed";
        } else if (data.canceled) {
          status = "canceled";
        } else if (isBefore(dueDate, today) && !isToday(dueDate)) {
          status = "overdue";
        } else if (
          isAfter(dueDate, today) &&
          isBefore(dueDate, addMonths(today, 1))
        ) {
          status = "due-soon";
        }

        const vehicle = vehiclesData.find((v) => v.id === data.vehicleId);

        maintenanceData.push({
          id: doc.id,
          ...data,
          status,
          dueDateObj: dueDate,
          formattedDueDate: format(dueDate, "MMM dd, yyyy"),
          vehicleNumber: vehicle?.vehicleNumber || "Unknown",
          vehicleName: vehicle?.vehicleName || "",
        });
      });
      setMaintenance(maintenanceData);

      // Calculate summary data
      const activeVehicles = vehiclesData.filter(
        (v) => v.status === "active"
      ).length;

      // Calculate this month's expenses
      const thisMonthExpenses = expensesData.filter((expense) => {
        const expenseDate = parseISO(expense.date);
        return expenseDate >= firstDayOfMonth && expenseDate <= lastDayOfMonth;
      });

      const totalExpensesThisMonth = thisMonthExpenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
      );

      const fuelExpensesThisMonth = thisMonthExpenses
        .filter((expense) => expense.expenseType === "fuel")
        .reduce((sum, expense) => sum + expense.amount, 0);

      // Count pending maintenance and vehicles under repair
      const pendingMaintenance = maintenanceData.filter(
        (item) => !item.completed && !item.canceled
      ).length;

      const vehiclesUnderRepair = new Set(
        maintenanceData
          .filter(
            (item) =>
              item.status === "overdue" ||
              (item.maintenanceType === "repair" &&
                !item.completed &&
                !item.canceled)
          )
          .map((item) => item.vehicleId)
      ).size;

      // Update summary data
      setSummaryData({
        totalVehicles: vehiclesData.length,
        activeVehicles,
        totalExpensesThisMonth,
        fuelExpensesThisMonth,
        pendingMaintenance,
        vehiclesUnderRepair,
      });
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Refresh data
  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Get maintenance alerts (upcoming and overdue)
  const getMaintenanceAlerts = () => {
    return maintenance
      .filter(
        (item) =>
          (item.status === "due-soon" || item.status === "overdue") &&
          !item.completed &&
          !item.canceled
      )
      .sort((a, b) => {
        // Sort overdue first, then by due date
        if (a.status === "overdue" && b.status !== "overdue") return -1;
        if (a.status !== "overdue" && b.status === "overdue") return 1;
        return a.dueDateObj - b.dueDateObj;
      })
      .slice(0, 5); // Show only 5 alerts
  };

  // Get recent expenses with sorting and filtering
  const getRecentExpenses = () => {
    let filteredExpenses = [...expenses];

    // Apply search filter if term exists
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredExpenses = filteredExpenses.filter(
        (expense) =>
          expense.vehicleNumber.toLowerCase().includes(term) ||
          expense.expenseType.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    filteredExpenses.sort((a, b) => {
      if (expenseSort.field === "date") {
        const dateA = parseISO(a.date);
        const dateB = parseISO(b.date);
        return expenseSort.direction === "asc" ? dateA - dateB : dateB - dateA;
      } else if (expenseSort.field === "amount") {
        return expenseSort.direction === "asc"
          ? a.amount - b.amount
          : b.amount - a.amount;
      } else if (expenseSort.field === "vehicle") {
        return expenseSort.direction === "asc"
          ? a.vehicleNumber.localeCompare(b.vehicleNumber)
          : b.vehicleNumber.localeCompare(a.vehicleNumber);
      } else if (expenseSort.field === "type") {
        return expenseSort.direction === "asc"
          ? a.expenseType.localeCompare(b.expenseType)
          : b.expenseType.localeCompare(a.expenseType);
      }
      return 0;
    });

    return filteredExpenses.slice(0, 5); // Show only 5 recent expenses
  };

  // Handle sort change
  const handleSort = (field) => {
    setExpenseSort((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `Rs.${amount.toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`;
  };

  // Helper function to get maintenance type label
  const getMaintenanceTypeLabel = (type) => {
    const labels = {
      oil_change: "Oil Change",
      tire_rotation: "Tire Rotation",
      filter_replacement: "Filter Replacement",
      brake_service: "Brake Service",
      transmission_service: "Transmission Service",
      air_conditioning: "Air Conditioning Service",
      fluid_check: "Fluid Check & Top-up",
      battery_check: "Battery Check",
      regular_service: "Regular Service",
      major_service: "Major Service",
      other: "Other Maintenance",
    };
    return labels[type] || "Maintenance";
  };

  // Navigate to expense details
  const handleExpenseClick = (expense) => {
    // Store the expense ID in localStorage to highlight it in the expenses list
    localStorage.setItem("selectedExpenseId", expense.id);
    handleTabChange("expenses");
  };

  // Navigate to maintenance with specific item
  const handleScheduleMaintenance = (maintenanceItem) => {
    // Store the maintenance ID in localStorage to highlight it in the maintenance list
    localStorage.setItem("selectedMaintenanceId", maintenanceItem.id);
    handleTabChange("maintenance");
  };

  // Loading indicator
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Error message
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Get maintenance alerts and recent expenses
  const maintenanceAlerts = getMaintenanceAlerts();
  const recentExpenses = getRecentExpenses();

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Fleet Dashboard</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`flex items-center px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors ${
            refreshing ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {refreshing ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 transform transition-all duration-200 ${
            activeCard === "vehicles"
              ? "scale-105 border-blue-300 shadow-md"
              : "hover:shadow-md hover:border-blue-200"
          }`}
          onMouseEnter={() => setActiveCard("vehicles")}
          onMouseLeave={() => setActiveCard(null)}
          onClick={() => handleTabChange("vehicles")}
        >
          <h3 className="text-sm font-medium text-gray-500">Total Vehicles</h3>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-2xl font-bold text-gray-800">
              {summaryData.totalVehicles}
            </p>
            <div className="p-2 bg-blue-100 rounded-full">
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
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {summaryData.activeVehicles} active
          </p>
        </div>

        <div
          className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 transform transition-all duration-200 ${
            activeCard === "expenses"
              ? "scale-105 border-red-300 shadow-md"
              : "hover:shadow-md hover:border-red-200"
          }`}
          onMouseEnter={() => setActiveCard("expenses")}
          onMouseLeave={() => setActiveCard(null)}
          onClick={() => handleTabChange("expenses")}
        >
          <h3 className="text-sm font-medium text-gray-500">
            This Month's Expenses
          </h3>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-2xl font-bold text-gray-800">
              {formatCurrency(summaryData.totalExpensesThisMonth)}
            </p>
            <div className="p-2 bg-red-100 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-red-600"
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
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Fuel: {formatCurrency(summaryData.fuelExpensesThisMonth)}
          </p>
        </div>

        <div
          className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 transform transition-all duration-200 ${
            activeCard === "maintenance"
              ? "scale-105 border-yellow-300 shadow-md"
              : "hover:shadow-md hover:border-yellow-200"
          }`}
          onMouseEnter={() => setActiveCard("maintenance")}
          onMouseLeave={() => setActiveCard(null)}
          onClick={() => handleTabChange("maintenance")}
        >
          <h3 className="text-sm font-medium text-gray-500">
            Maintenance Status
          </h3>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-2xl font-bold text-gray-800">
              {summaryData.pendingMaintenance}
            </p>
            <div className="p-2 bg-yellow-100 rounded-full">
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
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {summaryData.vehiclesUnderRepair} vehicles under repair
          </p>
        </div>
      </div>

      {/* Maintenance Alerts */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-800">
            Upcoming Maintenance
          </h3>
          {maintenanceAlerts.length > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {
                maintenanceAlerts.filter((alert) => alert.status === "overdue")
                  .length
              }{" "}
              overdue
            </span>
          )}
        </div>
        <div className="p-4">
          {maintenanceAlerts.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {maintenanceAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="py-3 flex items-start hover:bg-gray-50 rounded p-2 cursor-pointer transform transition-transform duration-100 hover:translate-x-1"
                  onClick={() => handleScheduleMaintenance(alert)}
                >
                  <div
                    className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${
                      alert.status === "overdue"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                    }`}
                  ></div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-800">
                      {alert.vehicleNumber}{" "}
                      {alert.vehicleName && `(${alert.vehicleName})`}
                    </p>
                    <p className="text-sm text-gray-500">
                      {getMaintenanceTypeLabel(alert.maintenanceType)} - Due{" "}
                      {alert.formattedDueDate}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleScheduleMaintenance(alert);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-md px-2 py-1 transition-colors"
                    >
                      Schedule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              No upcoming maintenance alerts
            </p>
          )}
        </div>
        {maintenanceAlerts.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 text-right">
            <button
              onClick={() => handleTabChange("maintenance")}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-md px-2 py-1 transition-colors"
            >
              View All Maintenance →
            </button>
          </div>
        )}
      </div>

      {/* Recent Expenses */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            Recent Expenses
          </h3>
          <div className="flex items-center space-x-4">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg
                  className="h-4 w-4 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("vehicle")}
                >
                  <div className="flex items-center">
                    Vehicle
                    {expenseSort.field === "vehicle" && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`ml-1 h-4 w-4 ${
                          expenseSort.direction === "asc"
                            ? "transform rotate-180"
                            : ""
                        }`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("type")}
                >
                  <div className="flex items-center">
                    Type
                    {expenseSort.field === "type" && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`ml-1 h-4 w-4 ${
                          expenseSort.direction === "asc"
                            ? "transform rotate-180"
                            : ""
                        }`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("amount")}
                >
                  <div className="flex items-center">
                    Amount
                    {expenseSort.field === "amount" && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`ml-1 h-4 w-4 ${
                          expenseSort.direction === "asc"
                            ? "transform rotate-180"
                            : ""
                        }`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("date")}
                >
                  <div className="flex items-center">
                    Date
                    {expenseSort.field === "date" && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`ml-1 h-4 w-4 ${
                          expenseSort.direction === "asc"
                            ? "transform rotate-180"
                            : ""
                        }`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentExpenses.length > 0 ? (
                recentExpenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleExpenseClick(expense)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {expense.vehicleNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {expense.expenseType.charAt(0).toUpperCase() +
                        expense.expenseType.slice(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(parseISO(expense.date), "MMM dd, yyyy")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    {searchTerm
                      ? "No matching expenses found"
                      : "No recent expenses found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-200 text-right">
          <button
            onClick={() => handleTabChange("expenses")}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-md px-2 py-1 transition-colors"
          >
            View All Expenses →
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <h3 className="text-lg font-medium text-gray-800 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => handleTabChange("addVehicle")}
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all hover:shadow-md active:transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="mt-2 text-sm text-gray-800">Add Vehicle</span>
          </button>

          <button
            onClick={() => handleTabChange("addExpense")}
            className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-all hover:shadow-md active:transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-300"
          >
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
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="mt-2 text-sm text-gray-800">Record Expense</span>
          </button>

          <button
            onClick={() => handleTabChange("maintenance")}
            className="flex flex-col items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-all hover:shadow-md active:transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-yellow-300"
          >
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <span className="mt-2 text-sm text-gray-800">Schedule Service</span>
          </button>

          <button
            onClick={() => handleTabChange("reports")}
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-all hover:shadow-md active:transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-purple-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="mt-2 text-sm text-gray-800">View Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogisticsDashboard;
