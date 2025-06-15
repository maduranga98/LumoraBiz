import React, { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useBusiness } from "../../contexts/BusinessContext";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";
import { format } from "date-fns";

const ExpensesList = () => {
  const { currentBusiness } = useBusiness();
  const { currentUser } = useAuth();
  
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vehicles, setVehicles] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    vehicle: "all",
    expenseType: "all",
    dateFrom: "",
    dateTo: "",
    minAmount: "",
    maxAmount: "",
    searchTerm: "",
  });

  // Summary statistics
  const [summary, setSummary] = useState({
    totalExpenses: 0,
    fuelExpenses: 0,
    serviceExpenses: 0,
    repairExpenses: 0,
    insuranceExpenses: 0,
    taxExpenses: 0,
    otherExpenses: 0,
  });

  // Sorting
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "desc",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [expensesPerPage] = useState(10);

  // Fetch expenses data
  useEffect(() => {
    const fetchExpenses = async () => {
      if (!currentUser || !currentBusiness?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Correct collection path for your structure
        const expensesCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/vehicleExpenses`;
        const vehiclesCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/vehicles`;
        
        console.log("Fetching expenses from:", expensesCollectionPath);
        console.log("Fetching vehicles from:", vehiclesCollectionPath);

        // Get all expenses, ordered by date
        const expensesQuery = query(
          collection(db, expensesCollectionPath),
          orderBy("date", "desc")
        );
        const querySnapshot = await getDocs(expensesQuery);

        const expensesData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          expensesData.push({
            id: doc.id,
            ...data,
            // Format date if needed
            formattedDate: data.date
              ? format(new Date(data.date), "MMM dd, yyyy")
              : "Unknown date",
          });
        });

        console.log("Fetched expenses:", expensesData);
        setExpenses(expensesData);
        setFilteredExpenses(expensesData);
        calculateSummary(expensesData);

        // Fetch vehicles for the filter dropdown
        const vehiclesQuery = query(collection(db, vehiclesCollectionPath));
        const vehiclesSnapshot = await getDocs(vehiclesQuery);
        const vehiclesData = [];
        vehiclesSnapshot.forEach((doc) => {
          vehiclesData.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        
        console.log("Fetched vehicles:", vehiclesData);
        setVehicles(vehiclesData);
      } catch (err) {
        console.error("Error fetching expenses:", err);
        console.error("Error code:", err.code);
        console.error("Error message:", err.message);
        
        if (err.code === 'permission-denied') {
          setError("Permission denied. Check your Firestore rules.");
        } else if (err.code === 'not-found') {
          setError("Expenses collection not found.");
        } else {
          setError("Failed to load expenses. Please try again later.");
        }
        toast.error("Error loading expenses");
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [currentUser, currentBusiness]);

  // Calculate summary statistics
  const calculateSummary = (expensesData) => {
    const summary = {
      totalExpenses: 0,
      fuelExpenses: 0,
      serviceExpenses: 0,
      repairExpenses: 0,
      insuranceExpenses: 0,
      taxExpenses: 0,
      otherExpenses: 0,
    };

    expensesData.forEach((expense) => {
      const amount = parseFloat(expense.amount) || 0;
      summary.totalExpenses += amount;

      switch (expense.expenseType) {
        case "fuel":
          summary.fuelExpenses += amount;
          break;
        case "service":
          summary.serviceExpenses += amount;
          break;
        case "repair":
          summary.repairExpenses += amount;
          break;
        case "insurance":
          summary.insuranceExpenses += amount;
          break;
        case "tax":
          summary.taxExpenses += amount;
          break;
        default:
          summary.otherExpenses += amount;
          break;
      }
    });

    setSummary(summary);
  };

  // Apply filters
  useEffect(() => {
    let result = [...expenses];

    // Filter by vehicle
    if (filters.vehicle !== "all") {
      result = result.filter(
        (expense) => expense.vehicleId === filters.vehicle
      );
    }

    // Filter by expense type
    if (filters.expenseType !== "all") {
      result = result.filter(
        (expense) => expense.expenseType === filters.expenseType
      );
    }

    // Filter by date range
    if (filters.dateFrom) {
      result = result.filter(
        (expense) => new Date(expense.date) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      result = result.filter(
        (expense) => new Date(expense.date) <= new Date(filters.dateTo)
      );
    }

    // Filter by amount range
    if (filters.minAmount) {
      result = result.filter(
        (expense) => parseFloat(expense.amount) >= parseFloat(filters.minAmount)
      );
    }

    if (filters.maxAmount) {
      result = result.filter(
        (expense) => parseFloat(expense.amount) <= parseFloat(filters.maxAmount)
      );
    }

    // Filter by search term (vehicle number, name, description)
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      result = result.filter(
        (expense) =>
          (expense.vehicleNumber &&
            expense.vehicleNumber.toLowerCase().includes(searchLower)) ||
          (expense.vehicleName &&
            expense.vehicleName.toLowerCase().includes(searchLower)) ||
          (expense.description &&
            expense.description.toLowerCase().includes(searchLower)) ||
          (expense.serviceProvider &&
            expense.serviceProvider.toLowerCase().includes(searchLower)) ||
          (expense.vehicle_id &&
            expense.vehicle_id.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortConfig.key === "date") {
        // Parse dates for comparison
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);

        if (sortConfig.direction === "asc") {
          return dateA - dateB;
        } else {
          return dateB - dateA;
        }
      } else if (sortConfig.key === "amount") {
        const amountA = parseFloat(a.amount) || 0;
        const amountB = parseFloat(b.amount) || 0;

        if (sortConfig.direction === "asc") {
          return amountA - amountB;
        } else {
          return amountB - amountA;
        }
      } else {
        // For string comparisons
        const valueA = (a[sortConfig.key] || "").toLowerCase();
        const valueB = (b[sortConfig.key] || "").toLowerCase();

        if (sortConfig.direction === "asc") {
          return valueA.localeCompare(valueB);
        } else {
          return valueB.localeCompare(valueA);
        }
      }
    });

    setFilteredExpenses(result);
    calculateSummary(result); // Update summary with filtered data
    setCurrentPage(1); // Reset to first page when filters change
  }, [filters, expenses, sortConfig]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle sorting
  const handleSort = (key) => {
    let direction = "desc";
    if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      vehicle: "all",
      expenseType: "all",
      dateFrom: "",
      dateTo: "",
      minAmount: "",
      maxAmount: "",
      searchTerm: "",
    });
  };

  // Get current expenses for pagination
  const indexOfLastExpense = currentPage * expensesPerPage;
  const indexOfFirstExpense = indexOfLastExpense - expensesPerPage;
  const currentExpenses = filteredExpenses.slice(
    indexOfFirstExpense,
    indexOfLastExpense
  );

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Function to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Render expense type badge
  const renderExpenseTypeBadge = (type) => {
    let bgColor = "";
    let textColor = "";
    let label = type.charAt(0).toUpperCase() + type.slice(1);

    switch (type) {
      case "fuel":
        bgColor = "bg-blue-100";
        textColor = "text-blue-800";
        break;
      case "service":
        bgColor = "bg-green-100";
        textColor = "text-green-800";
        break;
      case "repair":
        bgColor = "bg-orange-100";
        textColor = "text-orange-800";
        break;
      case "insurance":
        bgColor = "bg-purple-100";
        textColor = "text-purple-800";
        break;
      case "tax":
        bgColor = "bg-indigo-100";
        textColor = "text-indigo-800";
        label = "Tax/Registration";
        break;
      default:
        bgColor = "bg-gray-100";
        textColor = "text-gray-800";
        break;
    }

    return (
      <span
        className={`px-2 py-1 text-xs font-medium ${bgColor} ${textColor} rounded-full`}
      >
        {label}
      </span>
    );
  };

  // Check if user is authenticated and has business selected
  if (!currentUser) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Please log in to view expenses.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentBusiness?.id) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Please select a business to view expenses.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900">Vehicle Expenses</h2>
        <p className="text-sm text-gray-600 mt-1">
          Business: {currentBusiness.name || currentBusiness.id}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-xs font-medium text-gray-500 uppercase">
            Total Expenses
          </h3>
          <p className="mt-2 text-2xl font-bold text-gray-800">
            {formatCurrency(summary.totalExpenses)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-xs font-medium text-gray-500 uppercase">
            Fuel
          </h3>
          <p className="mt-2 text-2xl font-bold text-blue-600">
            {formatCurrency(summary.fuelExpenses)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {summary.totalExpenses
              ? Math.round((summary.fuelExpenses / summary.totalExpenses) * 100)
              : 0}
            % of total
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-xs font-medium text-gray-500 uppercase">
            Service
          </h3>
          <p className="mt-2 text-2xl font-bold text-green-600">
            {formatCurrency(summary.serviceExpenses)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {summary.totalExpenses
              ? Math.round(
                  (summary.serviceExpenses / summary.totalExpenses) * 100
                )
              : 0}
            % of total
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-xs font-medium text-gray-500 uppercase">
            Repair
          </h3>
          <p className="mt-2 text-2xl font-bold text-orange-600">
            {formatCurrency(summary.repairExpenses)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {summary.totalExpenses
              ? Math.round(
                  (summary.repairExpenses / summary.totalExpenses) * 100
                )
              : 0}
            % of total
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-xs font-medium text-gray-500 uppercase">
            Insurance
          </h3>
          <p className="mt-2 text-2xl font-bold text-purple-600">
            {formatCurrency(summary.insuranceExpenses)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {summary.totalExpenses
              ? Math.round(
                  (summary.insuranceExpenses / summary.totalExpenses) * 100
                )
              : 0}
            % of total
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-xs font-medium text-gray-500 uppercase">
            Tax & Other
          </h3>
          <p className="mt-2 text-2xl font-bold text-gray-600">
            {formatCurrency(summary.taxExpenses + summary.otherExpenses)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {summary.totalExpenses
              ? Math.round(
                  ((summary.taxExpenses + summary.otherExpenses) / summary.totalExpenses) * 100
                )
              : 0}
            % of total
          </p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 md:mb-0">
            Filter Expenses
          </h3>
          <button
            onClick={resetFilters}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search Field */}
          <div>
            <label
              htmlFor="searchTerm"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Search
            </label>
            <input
              type="text"
              id="searchTerm"
              name="searchTerm"
              value={filters.searchTerm}
              onChange={handleFilterChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              placeholder="Search by vehicle, description, etc."
            />
          </div>

          {/* Vehicle Filter */}
          <div>
            <label
              htmlFor="vehicle"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Vehicle
            </label>
            <select
              id="vehicle"
              name="vehicle"
              value={filters.vehicle}
              onChange={handleFilterChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            >
              <option value="all">All Vehicles</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicleNumber || "No Number"}{" "}
                  {vehicle.vehicleName && `(${vehicle.vehicleName})`}
                </option>
              ))}
            </select>
          </div>

          {/* Expense Type Filter */}
          <div>
            <label
              htmlFor="expenseType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Expense Type
            </label>
            <select
              id="expenseType"
              name="expenseType"
              value={filters.expenseType}
              onChange={handleFilterChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            >
              <option value="all">All Types</option>
              <option value="fuel">Fuel</option>
              <option value="service">Service/Maintenance</option>
              <option value="repair">Repair</option>
              <option value="insurance">Insurance</option>
              <option value="tax">Tax/Registration</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Date Range Filter - From */}
          <div>
            <label
              htmlFor="dateFrom"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Date From
            </label>
            <input
              type="date"
              id="dateFrom"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
          </div>

          {/* Date Range Filter - To */}
          <div>
            <label
              htmlFor="dateTo"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Date To
            </label>
            <input
              type="date"
              id="dateTo"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
          </div>

          {/* Amount Range */}
          <div className="flex space-x-2">
            <div className="flex-1">
              <label
                htmlFor="minAmount"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Min Amount
              </label>
              <input
                type="number"
                id="minAmount"
                name="minAmount"
                value={filters.minAmount}
                onChange={handleFilterChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                placeholder="Rs. Min"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="maxAmount"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Max Amount
              </label>
              <input
                type="number"
                id="maxAmount"
                name="maxAmount"
                value={filters.maxAmount}
                onChange={handleFilterChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                placeholder="Rs. Max"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Expenses List{" "}
            {filteredExpenses.length > 0 && `(${filteredExpenses.length})`}
          </h3>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-3-3v6m5 2H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">
              No expenses found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.searchTerm || filters.vehicle !== "all" || filters.expenseType !== "all"
                ? "No expenses match your current filters."
                : "You haven't added any expenses yet."}
            </p>
            <div className="mt-6 space-x-3">
              {(filters.searchTerm || filters.vehicle !== "all" || filters.expenseType !== "all") && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                >
                  Clear filters
                </button>
              )}
              <button
                type="button"
                onClick={() => (window.location.href = "/add-expense")}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                Add Expense
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("date")}
                    >
                      <div className="flex items-center">
                        Date
                        {sortConfig.key === "date" && (
                          <svg
                            className={`ml-1 w-4 h-4 ${
                              sortConfig.direction === "desc" ? "transform rotate-180" : ""
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
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
                      onClick={() => handleSort("vehicleNumber")}
                    >
                      <div className="flex items-center">
                        Vehicle
                        {sortConfig.key === "vehicleNumber" && (
                          <svg
                            className={`ml-1 w-4 h-4 ${
                              sortConfig.direction === "desc" ? "transform rotate-180" : ""
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
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
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Type
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("amount")}
                    >
                      <div className="flex items-center">
                        Amount
                        {sortConfig.key === "amount" && (
                          <svg
                            className={`ml-1 w-4 h-4 ${
                              sortConfig.direction === "desc" ? "transform rotate-180" : ""
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
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
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentExpenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {expense.formattedDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {expense.vehicleNumber || "No Number"}
                        </div>
                        {expense.vehicleName && (
                          <div className="text-xs text-gray-500">
                            {expense.vehicleName}
                          </div>
                        )}
                        {expense.vehicle_id && (
                          <div className="text-xs text-gray-400">
                            ID: {expense.vehicle_id}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderExpenseTypeBadge(expense.expenseType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="max-w-xs">
                          {expense.expenseType === "fuel" &&
                            expense.quantity && (
                              <div>
                                <span className="font-medium">
                                  {expense.quantity} liters
                                </span>
                                {expense.odometer &&
                                  ` • ${expense.odometer} km`}
                              </div>
                            )}
                          {(expense.expenseType === "service" ||
                            expense.expenseType === "repair") &&
                            expense.serviceType && (
                              <div>
                                <span className="font-medium">
                                  {expense.serviceType.replace("_", " ")}
                                </span>
                                {expense.serviceProvider &&
                                  ` • ${expense.serviceProvider}`}
                              </div>
                            )}
                          {expense.expenseType === "insurance" &&
                            expense.serviceProvider && (
                              <div>
                                <span className="font-medium">
                                  {expense.serviceProvider}
                                </span>
                              </div>
                            )}
                          {expense.expenseType === "tax" &&
                            expense.serviceType && (
                              <div>
                                <span className="font-medium">
                                  {expense.serviceType.replace("_", " ")}
                                </span>
                              </div>
                            )}
                          {expense.billNumber && (
                            <div className="text-xs text-gray-400">
                              Bill: {expense.billNumber}
                            </div>
                          )}
                          {expense.description && (
                            <div className="mt-1 text-xs italic truncate">
                              {expense.description}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredExpenses.length > expensesPerPage && (
              <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      currentPage === 1
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={
                      currentPage ===
                      Math.ceil(filteredExpenses.length / expensesPerPage)
                    }
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      currentPage ===
                      Math.ceil(filteredExpenses.length / expensesPerPage)
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{" "}
                      <span className="font-medium">
                        {Math.min(
                          (currentPage - 1) * expensesPerPage + 1,
                          filteredExpenses.length
                        )}
                      </span>{" "}
                      to{" "}
                      <span className="font-medium">
                        {Math.min(
                          currentPage * expensesPerPage,
                          filteredExpenses.length
                        )}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium">
                        {filteredExpenses.length}
                      </span>{" "}
                      results
                    </p>
                  </div>
                  <div>
                    <nav
                      className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                      aria-label="Pagination"
                    >
                      <button
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                          currentPage === 1
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        <span className="sr-only">Previous</span>
                        <svg
                          className="h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>

                      {/* Page number buttons */}
                      {[
                        ...Array(
                          Math.ceil(filteredExpenses.length / expensesPerPage)
                        ).keys(),
                      ].map((number) => (
                        <button
                          key={number + 1}
                          onClick={() => paginate(number + 1)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === number + 1
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {number + 1}
                        </button>
                      ))}

                      <button
                        onClick={() => paginate(currentPage + 1)}
                        disabled={
                          currentPage ===
                          Math.ceil(filteredExpenses.length / expensesPerPage)
                        }
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                          currentPage ===
                          Math.ceil(filteredExpenses.length / expensesPerPage)
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        <span className="sr-only">Next</span>
                        <svg
                          className="h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Export Options */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Total {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} 
          {filteredExpenses.length > 0 && ` • ${formatCurrency(summary.totalExpenses)} total`}
        </div>
        <div className="space-x-3">
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
            Export as CSV
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
            Export as PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpensesList;