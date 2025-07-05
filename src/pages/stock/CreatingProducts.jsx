import React, { useState, useEffect } from "react";
import ConvertToOtherModal from "../stock/ConvertToOther";
import { useAuth } from "../../contexts/AuthContext";
import { useBusiness } from "../../contexts/BusinessContext";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { toast } from "react-hot-toast";

const CreatingProducts = () => {
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();
  const [availableStock, setAvailableStock] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterBuyer, setFilterBuyer] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");

  // Summary states
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [totalValue, setTotalValue] = useState(0);

  // Mobile responsive states
  const [showFilters, setShowFilters] = useState(false);
  const [isGridView, setIsGridView] = useState(false);

  // Debug logging
  useEffect(() => {
    const debug = {
      currentUser: !!currentUser,
      currentUserId: currentUser?.uid || "null",
      currentBusiness: !!currentBusiness,
      currentBusinessId: currentBusiness?.id || "null",
      currentBusinessName: currentBusiness?.name || "null",
      availableStockCount: availableStock.length,
      buyersCount: buyers.length,
      loading,
      error: error || "none",
    };
    setDebugInfo(debug);
    console.log("🔍 CreatingProducts Debug Info:", debug);
  }, [currentUser, currentBusiness, availableStock, buyers, loading, error]);

  // Fetch available stock
  useEffect(() => {
    console.log("📊 useEffect triggered for fetchAvailableStock");
    console.log("currentBusiness?.id:", currentBusiness?.id);
    console.log("currentUser?.uid:", currentUser?.uid);

    if (currentBusiness?.id && currentUser?.uid) {
      fetchAvailableStock();
      fetchBuyers();
    } else {
      console.log("❌ Missing required context, setting loading to false");
      setLoading(false);
    }
  }, [currentBusiness?.id, currentUser?.uid, sortField, sortDirection]);

  // Calculate totals when stocks change
  useEffect(() => {
    if (availableStock.length > 0) {
      calculateTotals();
    } else {
      setTotalQuantity(0);
      setTotalValue(0);
    }
  }, [availableStock, filterType, filterBuyer, searchTerm]);

  const fetchAvailableStock = async () => {
    if (!currentBusiness?.id || !currentUser?.uid) {
      console.log("❌ fetchAvailableStock: Missing required context");
      setLoading(false);
      return;
    }

    console.log("🔄 Starting to fetch available stock...");
    setLoading(true);
    setError(null);

    try {
      const stockPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/rawProcessedStock/stock`;
      console.log("📁 Firestore path:", stockPath);

      const stockQuery = query(
        collection(db, stockPath),
        where("status", "==", "available"),
        orderBy(sortField, sortDirection)
      );

      console.log("🔍 Executing Firestore query...");
      const querySnapshot = await getDocs(stockQuery);
      console.log("📊 Query snapshot size:", querySnapshot.size);

      const stockList = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log("📄 Document:", doc.id, data);

        stockList.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      console.log("📋 Final stock list:", stockList);
      setAvailableStock(stockList);

      if (stockList.length === 0) {
        console.log('⚠️ No stock found with status "available"');
      }
    } catch (error) {
      console.error("❌ Error fetching available stock:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);

      setError(`Failed to load available stock: ${error.message}`);
      toast.error(`Failed to load available stock: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch buyers from Firestore
  const fetchBuyers = async () => {
    if (!currentUser || !currentBusiness?.id) {
      console.log("❌ fetchBuyers: Missing required context");
      return;
    }

    try {
      const buyersCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/buyers`;
      console.log("👥 Fetching buyers from:", buyersCollectionPath);

      const buyersQuery = query(collection(db, buyersCollectionPath));
      const querySnapshot = await getDocs(buyersQuery);
      console.log("👥 Buyers query snapshot size:", querySnapshot.size);

      const buyersList = [];

      querySnapshot.forEach((doc) => {
        console.log("👤 Buyer document:", doc.id, doc.data());
        buyersList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      console.log("👥 Final buyers list:", buyersList);
      setBuyers(buyersList);
    } catch (error) {
      console.error("❌ Error fetching buyers:", error);
      toast.error(`Failed to load buyers: ${error.message}`);
    }
  };

  // Calculate total quantity and value
  const calculateTotals = () => {
    const filteredStocks = getFilteredStocks();
    console.log(
      "🧮 Calculating totals for",
      filteredStocks.length,
      "filtered stocks"
    );

    let quantity = 0;
    let value = 0;

    filteredStocks.forEach((stock) => {
      const stockQuantity = stock.quantity || 0;
      const stockPrice = stock.price || 0;
      quantity += stockQuantity;
      value += stockQuantity * stockPrice;

      console.log(
        `📊 Stock ${stock.id}: ${stockQuantity}kg × ${stockPrice} = ${
          stockQuantity * stockPrice
        }`
      );
    });

    console.log("📊 Total quantity:", quantity, "Total value:", value);
    setTotalQuantity(quantity);
    setTotalValue(value);
  };

  // Get all unique paddy types from the stocks
  const getPaddyTypes = () => {
    const types = new Set();
    availableStock.forEach((stock) => {
      if (stock.paddyTypeName) {
        types.add(stock.paddyTypeName);
      }
    });
    const typesArray = Array.from(types).sort();
    console.log("🌾 Unique paddy types:", typesArray);
    return typesArray;
  };

  // Apply filters to stocks
  const getFilteredStocks = () => {
    const filtered = availableStock.filter((stock) => {
      const matchesSearch =
        searchTerm === "" ||
        stock.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.paddyTypeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.id?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        filterType === "" || stock.paddyTypeName === filterType;
      const matchesBuyer = filterBuyer === "" || stock.buyerId === filterBuyer;

      return matchesSearch && matchesType && matchesBuyer;
    });

    console.log(
      "🔍 Filtered stocks:",
      filtered.length,
      "out of",
      availableStock.length
    );
    return filtered;
  };

  // Handle sort change
  const handleSortChange = (field) => {
    console.log("🔄 Sort change:", field);
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Reset filters
  const resetFilters = () => {
    console.log("🔄 Resetting filters");
    setSearchTerm("");
    setFilterType("");
    setFilterBuyer("");
    setShowFilters(false);
  };

  // Manual refresh function
  const refreshData = () => {
    console.log("🔄 Manual refresh triggered");
    fetchAvailableStock();
    fetchBuyers();
    toast.success("Refreshing data...");
  };

  // Handle convert stock
  const handleConvertStock = (stock) => {
    console.log("🔄 Converting stock:", stock);
    setSelectedStock(stock);
    setShowConvertModal(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    console.log("❌ Closing modal");
    setShowConvertModal(false);
    setSelectedStock(null);
    fetchAvailableStock();
  };

  // Handle conversion submission
  const handleConversionSubmit = async (conversionData) => {
    console.log("✅ Conversion data received:", conversionData);
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

  // Format date
  const formatDate = (date) => {
    if (!date) return "—";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Sort icon component
  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;

    return (
      <svg className="ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
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
    );
  };

  console.log("🎨 Rendering CreatingProducts component");
  console.log(
    "Current state - loading:",
    loading,
    "availableStock:",
    availableStock.length,
    "error:",
    error
  );

  // No business selected state
  if (!currentBusiness?.id || !currentUser?.uid) {
    console.log("⚠️ Rendering no business selected state");
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl max-w-md text-center">
          <svg
            className="mx-auto h-8 w-8 text-yellow-600 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No business selected
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Please select a business to view available stock.
          </p>

          {/* Debug Info */}
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-left">
            <strong>Debug Info:</strong>
            <div>
              User: {currentUser ? "✅" : "❌"} ({currentUser?.uid || "none"})
            </div>
            <div>
              Business: {currentBusiness ? "✅" : "❌"} (
              {currentBusiness?.id || "none"})
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredStock = getFilteredStocks();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Debug Panel - Remove this in production */}
      <div className="bg-gray-800 text-white p-2 text-xs font-mono">
        <div className="max-w-7xl mx-auto">
          <strong>🔍 DEBUG:</strong> Loading: {loading ? "⏳" : "✅"} | Stock:{" "}
          {availableStock.length} | Filtered: {filteredStock.length} | Error:{" "}
          {error ? "❌" : "✅"} | User:{" "}
          {currentUser?.uid?.slice(0, 8) || "none"} | Business:{" "}
          {currentBusiness?.id || "none"}
        </div>
      </div>

      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 py-4">
          {/* Title and Actions Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                Creating Products
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Convert paddy stock into processed products
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="hidden sm:flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setIsGridView(false)}
                  className={`p-2 rounded-md transition-colors ${
                    !isGridView
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 10h16M4 14h16M4 18h16"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setIsGridView(true)}
                  className={`p-2 rounded-md transition-colors ${
                    isGridView
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                </button>
              </div>

              {/* Filter Toggle (Mobile) */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="sm:hidden bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z"
                  />
                </svg>
              </button>

              {/* Refresh Button */}
              <button
                onClick={refreshData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4">
              <p className="text-xs text-blue-700 font-medium mb-1">
                Available Quantity
              </p>
              <p className="text-lg sm:text-xl font-bold text-blue-900">
                {totalQuantity.toFixed(2)}{" "}
                <span className="text-sm font-medium">kg</span>
              </p>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4">
              <p className="text-xs text-green-700 font-medium mb-1">
                Total Value
              </p>
              <p className="text-lg sm:text-xl font-bold text-green-900">
                {formatCurrency(totalValue)}
              </p>
            </div>
          </div>

          {/* Filters - Desktop */}
          <div className="hidden sm:grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by buyer, paddy type, or stock ID..."
                className="pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="block w-full border border-gray-300 rounded-xl py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
            >
              <option value="">All Paddy Types</option>
              {getPaddyTypes().map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={filterBuyer}
              onChange={(e) => setFilterBuyer(e.target.value)}
              className="block w-full border border-gray-300 rounded-xl py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
            >
              <option value="">All Buyers</option>
              {buyers.map((buyer) => (
                <option key={buyer.id} value={buyer.id}>
                  {buyer.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mobile Filters Dropdown */}
          {showFilters && (
            <div className="sm:hidden mt-4 space-y-3 bg-gray-50 rounded-xl p-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="block w-full border border-gray-300 rounded-xl py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
              >
                <option value="">All Paddy Types</option>
                {getPaddyTypes().map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <select
                value={filterBuyer}
                onChange={(e) => setFilterBuyer(e.target.value)}
                className="block w-full border border-gray-300 rounded-xl py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
              >
                <option value="">All Buyers</option>
                {buyers.map((buyer) => (
                  <option key={buyer.id} value={buyer.id}>
                    {buyer.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset Filters */}
          {(searchTerm || filterType || filterBuyer) && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={resetFilters}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 py-6">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            <h3 className="font-semibold">Error loading stock</h3>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            <span className="ml-3 text-gray-600">Loading stock data...</span>
          </div>
        ) : availableStock.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m4-8v2m4-2v2"
              />
            </svg>
            <h3 className="mt-2 text-lg font-semibold text-gray-900">
              No available stock found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Add some paddy stock first to start creating products.
            </p>

            {/* Debug info for empty state */}
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-left">
              <strong>Debug Info:</strong>
              <div>
                Firestore Path: owners/{currentUser?.uid}/businesses/
                {currentBusiness?.id}/stock/rawProcessedStock/stock
              </div>
              <div>Query Filter: status == "available"</div>
              <div>
                Check if documents exist at this path with status="available"
              </div>
            </div>
          </div>
        ) : filteredStock.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center border border-gray-200">
            <p className="text-gray-500">
              No stock matches your search criteria.
            </p>
            <button
              className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-semibold"
              onClick={resetFilters}
            >
              Clear Filters
            </button>

            {/* Debug info for filtered empty state */}
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-left">
              <strong>Filter Debug:</strong>
              <div>Total stock: {availableStock.length}</div>
              <div>Search term: "{searchTerm}"</div>
              <div>Filter type: "{filterType}"</div>
              <div>Filter buyer: "{filterBuyer}"</div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Grid View */}
            {isGridView ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredStock.map((stock) => (
                  <div
                    key={stock.id}
                    className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="text-xs text-gray-500">
                          {formatDate(stock.createdAt)}
                        </div>
                        <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Available
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {stock.buyerName || "—"}
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                          {stock.paddyTypeName || "—"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Quantity:</span>
                          <div className="font-semibold">
                            {stock.quantity ? stock.quantity.toFixed(2) : "—"}{" "}
                            kg
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Price/kg:</span>
                          <div className="font-semibold">
                            {formatCurrency(stock.price || 0)}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500">Total:</span>
                          <span className="font-bold text-gray-900">
                            {formatCurrency(
                              (stock.quantity || 0) * (stock.price || 0)
                            )}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleConvertStock(stock)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center"
                      >
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        Convert to Products
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Table View */
              <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
                {/* Mobile Table */}
                <div className="sm:hidden">
                  {filteredStock.map((stock) => (
                    <div
                      key={stock.id}
                      className="border-b border-gray-200 p-4 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {stock.buyerName || "—"}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {stock.paddyTypeName || "—"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(stock.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            {stock.quantity ? stock.quantity.toFixed(2) : "—"}{" "}
                            kg
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(stock.price || 0)}/kg
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-sm">
                          <span className="text-gray-500">Total: </span>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(
                              (stock.quantity || 0) * (stock.price || 0)
                            )}
                          </span>
                        </div>
                        <button
                          onClick={() => handleConvertStock(stock)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center"
                        >
                          <svg
                            className="w-3 h-3 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          Convert
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSortChange("createdAt")}
                        >
                          <div className="flex items-center">
                            Date Added
                            <SortIcon field="createdAt" />
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSortChange("buyerName")}
                        >
                          <div className="flex items-center">
                            Buyer
                            <SortIcon field="buyerName" />
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSortChange("paddyTypeName")}
                        >
                          <div className="flex items-center">
                            Paddy Type
                            <SortIcon field="paddyTypeName" />
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSortChange("quantity")}
                        >
                          <div className="flex items-center">
                            Quantity (kg)
                            <SortIcon field="quantity" />
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSortChange("price")}
                        >
                          <div className="flex items-center">
                            Price/kg
                            <SortIcon field="price" />
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                        >
                          Total Value
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                        >
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStock.map((stock) => (
                        <tr
                          key={stock.id}
                          className="hover:bg-blue-50 transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(stock.createdAt)}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">
                              {stock.buyerName || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {stock.paddyTypeName || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">
                              {stock.quantity ? stock.quantity.toFixed(2) : "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatCurrency(stock.price || 0)}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">
                              {formatCurrency(
                                (stock.quantity || 0) * (stock.price || 0)
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => handleConvertStock(stock)}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs transition-colors inline-flex items-center"
                            >
                              <svg
                                className="w-3 h-3 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                              Convert
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Convert Modal */}
      {showConvertModal && selectedStock && (
        <ConvertToOtherModal
          isOpen={showConvertModal}
          onClose={handleModalClose}
          onSubmit={handleConversionSubmit}
          stock={selectedStock}
        />
      )}
    </div>
  );
};

export default CreatingProducts;
