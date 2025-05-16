import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
  limit,
} from "firebase/firestore";
import { toast } from "react-hot-toast";

const ViewPaddyStock = () => {
  // States
  const [stocks, setStocks] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterBuyer, setFilterBuyer] = useState("");
  const [filterDateRange, setFilterDateRange] = useState({
    start: "",
    end: "",
  });
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [expandedRows, setExpandedRows] = useState({});
  const [debugInfo, setDebugInfo] = useState({
    businessId: null,
    queryAttempted: false,
    queryResult: null,
    error: null,
  });

  // Get current business ID from localStorage
  useEffect(() => {
    try {
      const businessId = localStorage.getItem("currentBusinessId");
      console.log("Business ID from localStorage:", businessId);
      setDebugInfo((prev) => ({ ...prev, businessId }));

      if (businessId) {
        setCurrentBusiness(businessId);
      } else {
        // Handle case when no business is selected
        toast.error("Please select a business first");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error);
      setDebugInfo((prev) => ({
        ...prev,
        error: "localStorage error: " + error.message,
      }));
      toast.error("Failed to load business information");
      setLoading(false);
    }
  }, []);

  // Fetch stocks and buyers when current business changes
  useEffect(() => {
    if (currentBusiness) {
      console.log("Fetching data for business:", currentBusiness);
      fetchStocks();
      fetchBuyers();
    }
  }, [currentBusiness, sortField, sortDirection]);

  // Calculate totals when stocks change
  useEffect(() => {
    if (stocks.length > 0) {
      calculateTotals();
    }
  }, [stocks, filterType, filterBuyer, searchTerm, filterDateRange]);

  // Fetch paddy stocks from Firestore
  const fetchStocks = async () => {
    if (!currentBusiness) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("Constructing query with business ID:", currentBusiness);
      console.log("Sort field:", sortField, "Sort direction:", sortDirection);

      setDebugInfo((prev) => ({
        ...prev,
        queryAttempted: true,
        queryParams: {
          collection: "paddyStock",
          businessId: currentBusiness,
          sortField,
          sortDirection,
        },
      }));

      // First try a simpler query to test connection
      const testQuery = query(collection(db, "paddyStock"), limit(1));

      console.log("Testing basic query first...");
      const testSnapshot = await getDocs(testQuery);
      console.log("Basic query test result count:", testSnapshot.size);

      // Now try the actual query
      let stocksQuery = query(
        collection(db, "paddyStock"),
        where("businessId", "==", currentBusiness),
        orderBy(sortField, sortDirection)
      );

      console.log("Executing main query...");
      const querySnapshot = await getDocs(stocksQuery);
      console.log("Query returned documents:", querySnapshot.size);

      setDebugInfo((prev) => ({
        ...prev,
        queryResult: {
          attempted: true,
          documentCount: querySnapshot.size,
          firstDocId: querySnapshot.size > 0 ? querySnapshot.docs[0].id : null,
        },
      }));

      const stocksList = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log("Document data:", doc.id, data);

        stocksList.push({
          id: doc.id,
          ...data,
          // Convert Firestore timestamps to JS Date objects
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      console.log("Processed stocks list:", stocksList.length);
      setStocks(stocksList);
    } catch (error) {
      console.error("Error fetching paddy stocks:", error);
      setError(`Failed to load purchase history: ${error.message}`);
      setDebugInfo((prev) => ({ ...prev, error: error.message }));
      toast.error(`Failed to load purchase history: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch buyers from Firestore
  const fetchBuyers = async () => {
    if (!currentBusiness) return;

    try {
      const buyersQuery = query(
        collection(db, "buyers"),
        where("businessId", "==", currentBusiness)
      );

      const querySnapshot = await getDocs(buyersQuery);
      console.log("Buyers query returned:", querySnapshot.size);

      const buyersList = [];

      querySnapshot.forEach((doc) => {
        buyersList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setBuyers(buyersList);
    } catch (error) {
      console.error("Error fetching buyers:", error);
      toast.error(`Failed to load buyers: ${error.message}`);
    }
  };

  // Calculate total quantity and value
  const calculateTotals = () => {
    const filteredStocks = getFilteredStocks();

    let quantity = 0;
    let value = 0;

    filteredStocks.forEach((stock) => {
      quantity += stock.quantity || 0;
      value += (stock.quantity || 0) * (stock.price || 0);
    });

    setTotalQuantity(quantity);
    setTotalValue(value);
  };

  // Handle sort change
  const handleSortChange = (field) => {
    if (field === sortField) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Default to descending for a new field
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setFilterType("");
    setFilterBuyer("");
    setFilterDateRange({ start: "", end: "" });
  };

  // Manual refresh function
  const refreshData = () => {
    fetchStocks();
    fetchBuyers();
    toast.success("Refreshing data...");
  };

  // Handle date range filter change
  const handleDateFilterChange = (e) => {
    const { name, value } = e.target;
    setFilterDateRange((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Get all unique paddy types from the stocks
  const getPaddyTypes = () => {
    const types = new Set();
    stocks.forEach((stock) => {
      if (stock.paddyType) {
        types.add(stock.paddyType);
      }
    });
    return Array.from(types).sort();
  };

  // Toggle row expansion
  const toggleRowExpand = (id) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Apply filters to stocks
  const getFilteredStocks = () => {
    return stocks.filter((stock) => {
      // Search term filter (case insensitive)
      const matchesSearch =
        searchTerm === "" ||
        stock.paddyType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      // Paddy type filter
      const matchesType = filterType === "" || stock.paddyType === filterType;

      // Buyer filter
      const matchesBuyer = filterBuyer === "" || stock.buyerId === filterBuyer;

      // Date range filter
      let matchesDateRange = true;
      if (filterDateRange.start) {
        const startDate = new Date(filterDateRange.start);
        startDate.setHours(0, 0, 0, 0);
        matchesDateRange = matchesDateRange && stock.createdAt >= startDate;
      }
      if (filterDateRange.end) {
        const endDate = new Date(filterDateRange.end);
        endDate.setHours(23, 59, 59, 999);
        matchesDateRange = matchesDateRange && stock.createdAt <= endDate;
      }

      return matchesSearch && matchesType && matchesBuyer && matchesDateRange;
    });
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return "—";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    })
      .format(amount)
      .replace("LKR", "Rs.");
  };

  // Get filtered and sorted stocks
  const filteredStocks = getFilteredStocks();

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Paddy Purchase History
          </h1>
          <p className="text-gray-600 mt-1">
            Track and manage all your paddy stock purchases
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2 mt-4 md:mt-0">
          <button
            onClick={refreshData}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm flex items-center"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="bg-white shadow-sm rounded-lg p-4 min-w-40">
          <p className="text-sm text-gray-500">Total Quantity</p>
          <p className="text-xl font-bold">{totalQuantity.toFixed(2)} kg</p>
        </div>
        <div className="bg-white shadow-sm rounded-lg p-4 min-w-40">
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">All Paddy Types</option>
              {getPaddyTypes().map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Buyer Filter */}
          <div>
            <select
              value={filterBuyer}
              onChange={(e) => setFilterBuyer(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">All Buyers</option>
              {buyers.map((buyer) => (
                <option key={buyer.id} value={buyer.id}>
                  {buyer.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <div className="flex space-x-2">
              <input
                type="date"
                name="start"
                placeholder="Start Date"
                value={filterDateRange.start}
                onChange={handleDateFilterChange}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <input
                type="date"
                name="end"
                placeholder="End Date"
                value={filterDateRange.end}
                onChange={handleDateFilterChange}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Reset Filters Button */}
        {(searchTerm ||
          filterType ||
          filterBuyer ||
          filterDateRange.start ||
          filterDateRange.end) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={resetFilters}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Debug Info */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          <h3 className="font-medium">Error loading data</h3>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Stocks List */}
      {loading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      ) : !currentBusiness ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
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
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            No business selected
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Please select a business from the business selector.
          </p>
          <div className="mt-4 p-3 bg-gray-100 rounded text-left text-xs">
            <p className="font-bold">Debug Info:</p>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        </div>
      ) : stocks.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
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
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            No purchase history found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Add paddy stock to see purchase history here.
          </p>
          <button
            onClick={() => (window.location.href = "/add-paddy-stock")}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg
              className="-ml-1 mr-2 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Add New Paddy Stock
          </button>
          <div className="mt-4 p-3 bg-gray-100 rounded text-left text-xs">
            <p className="font-bold">Debug Info:</p>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        </div>
      ) : filteredStocks.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-gray-500">
            No purchases match your search criteria.
          </p>
          <button
            className="mt-4 text-indigo-600 hover:text-indigo-900 text-sm font-medium"
            onClick={resetFilters}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-10 px-4 py-3"></th>{" "}
                {/* Expand/collapse column */}
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange("createdAt")}
                >
                  <div className="flex items-center">
                    Date
                    {sortField === "createdAt" && (
                      <svg
                        className="ml-1 h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        {sortDirection === "asc" ? (
                          <path
                            fillRule="evenodd"
                            d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                            clipRule="evenodd"
                          />
                        ) : (
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        )}
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange("buyerName")}
                >
                  <div className="flex items-center">
                    Buyer
                    {sortField === "buyerName" && (
                      <svg
                        className="ml-1 h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        {sortDirection === "asc" ? (
                          <path
                            fillRule="evenodd"
                            d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                            clipRule="evenodd"
                          />
                        ) : (
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        )}
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange("paddyType")}
                >
                  <div className="flex items-center">
                    Type
                    {sortField === "paddyType" && (
                      <svg
                        className="ml-1 h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        {sortDirection === "asc" ? (
                          <path
                            fillRule="evenodd"
                            d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                            clipRule="evenodd"
                          />
                        ) : (
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        )}
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange("quantity")}
                >
                  <div className="flex items-center">
                    Quantity (kg)
                    {sortField === "quantity" && (
                      <svg
                        className="ml-1 h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        {sortDirection === "asc" ? (
                          <path
                            fillRule="evenodd"
                            d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                            clipRule="evenodd"
                          />
                        ) : (
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        )}
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortChange("price")}
                >
                  <div className="flex items-center">
                    Price (Rs/kg)
                    {sortField === "price" && (
                      <svg
                        className="ml-1 h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        {sortDirection === "asc" ? (
                          <path
                            fillRule="evenodd"
                            d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                            clipRule="evenodd"
                          />
                        ) : (
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        )}
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Total Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStocks.map((stock) => (
                <React.Fragment key={stock.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => toggleRowExpand(stock.id)}
                        className="text-gray-500 hover:text-gray-700 focus:outline-none"
                      >
                        {expandedRows[stock.id] ? (
                          <svg
                            className="h-5 w-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-5 w-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(stock.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {stock.buyerName || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {stock.paddyType || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {stock.quantity ? stock.quantity.toFixed(2) : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {stock.price ? stock.price.toFixed(2) : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {stock.quantity && stock.price
                          ? formatCurrency(stock.quantity * stock.price)
                          : "—"}
                      </div>
                    </td>
                  </tr>
                  {expandedRows[stock.id] && (
                    <tr className="bg-gray-50">
                      <td className="px-4 py-3"></td>
                      <td colSpan="6" className="px-4 py-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-1">
                              Transaction Details
                            </h4>
                            <div className="bg-white p-3 rounded-md shadow-sm space-y-2">
                              <div>
                                <span className="text-xs text-gray-500">
                                  Transaction ID:
                                </span>
                                <p className="text-sm text-gray-800">
                                  {stock.id}
                                </p>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500">
                                  Created:
                                </span>
                                <p className="text-sm text-gray-800">
                                  {stock.createdAt?.toLocaleString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500">
                                  Last Updated:
                                </span>
                                <p className="text-sm text-gray-800">
                                  {stock.updatedAt?.toLocaleString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-1">
                              Additional Information
                            </h4>
                            <div className="bg-white p-3 rounded-md shadow-sm">
                              <div>
                                <span className="text-xs text-gray-500">
                                  Notes:
                                </span>
                                <p className="text-sm text-gray-800 mt-1">
                                  {stock.notes || "No additional notes"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ViewPaddyStock;
