import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { useBusiness } from "../../contexts/BusinessContext";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";
import {
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Package,
  DollarSign,
  Eye,
  Filter,
  X,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  BarChart3,
} from "lucide-react";

const ViewPaddyStock = () => {
  const { currentBusiness } = useBusiness();
  const { currentUser } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // States
  const [stocks, setStocks] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterBuyer, setFilterBuyer] = useState("");
  const [sortField, setSortField] = useState("processedAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [expandedRows, setExpandedRows] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  // Initialize component and check authentication
  useEffect(() => {
    if (currentUser && currentBusiness?.id) {
      fetchStocks();
      fetchBuyers();
    } else {
      setLoading(false);
    }
  }, [currentUser, currentBusiness, sortField, sortDirection]);

  // Calculate totals when stocks change
  useEffect(() => {
    if (stocks.length > 0) {
      calculateTotals();
    }
  }, [stocks, filterType, filterBuyer, searchTerm]);

  // Fetch paddy stocks from Firestore (processed only)
  const fetchStocks = async () => {
    if (!currentUser || !currentBusiness?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const stockCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/rawProcessedStock/stock`;

      let stocksQuery = query(
        collection(db, stockCollectionPath),
        orderBy(sortField, sortDirection)
      );

      const querySnapshot = await getDocs(stocksQuery);
      const stocksList = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        // Only include processed stock
        const isProcessed = data.processed || data.status === "processed";

        if (isProcessed) {
          stocksList.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            processedAt: data.processedAt?.toDate() || null,
          });
        }
      });

      setStocks(stocksList);
    } catch (error) {
      console.error("Error fetching paddy stocks:", error);

      const errorMessage =
        error.code === "permission-denied"
          ? "Permission denied. Check your Firestore rules."
          : error.code === "not-found"
          ? "Stock collection not found."
          : `Failed to load processed stock: ${error.message}`;

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch buyers from Firestore
  const fetchBuyers = async () => {
    if (!currentUser || !currentBusiness?.id) return;

    try {
      const buyersCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/buyers`;
      const buyersQuery = query(collection(db, buyersCollectionPath));
      const querySnapshot = await getDocs(buyersQuery);
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
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setFilterType("");
    setFilterBuyer("");
    setShowFilters(false);
  };

  // Manual refresh function
  const refreshData = () => {
    fetchStocks();
    fetchBuyers();
    toast.success("Refreshing data...");
  };

  // Get all unique paddy types from the stocks
  const getPaddyTypes = () => {
    const types = new Set();
    stocks.forEach((stock) => {
      if (stock.paddyTypeName) {
        types.add(stock.paddyTypeName);
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
      const matchesSearch =
        searchTerm === "" ||
        stock.paddyTypeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        filterType === "" || stock.paddyTypeName === filterType;
      const matchesBuyer = filterBuyer === "" || stock.buyerId === filterBuyer;

      return matchesSearch && matchesType && matchesBuyer;
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

  // Sort icon component
  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;

    return (
      <div className="ml-1 h-4 w-4">
        {sortDirection === "asc" ? (
          <ChevronDown className="h-4 w-4 transform rotate-180" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </div>
    );
  };

  // Mobile Card Component
  const MobileStockCard = ({ stock }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Package className="h-5 w-5 text-indigo-600" />
          <span className="font-medium text-gray-900">
            {stock.paddyTypeName || "—"}
          </span>
        </div>
        <button
          onClick={() => toggleRowExpand(stock.id)}
          className="p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          {expandedRows[stock.id] ? (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-500" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-500">Buyer:</span>
          <p className="font-medium text-gray-900">{stock.buyerName || "—"}</p>
        </div>
        <div>
          <span className="text-gray-500">Quantity:</span>
          <p className="font-medium text-gray-900">
            {stock.quantity ? `${stock.quantity.toFixed(2)} kg` : "—"}
          </p>
        </div>
        <div>
          <span className="text-gray-500">Price:</span>
          <p className="font-medium text-gray-900">
            {stock.price ? `Rs. ${stock.price.toFixed(2)}/kg` : "—"}
          </p>
        </div>
        <div>
          <span className="text-gray-500">Total Value:</span>
          <p className="font-medium text-green-600">
            {stock.quantity && stock.price
              ? formatCurrency(stock.quantity * stock.price)
              : "—"}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Processed: {formatDate(stock.processedAt)}</span>
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Processed
          </span>
        </div>
      </div>

      {expandedRows[stock.id] && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-xs font-medium text-gray-700 mb-2">
                Transaction Details
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Stock ID:</span>
                  <span className="font-mono text-gray-800">
                    {stock.id.slice(-8)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Purchase Date:</span>
                  <span className="text-gray-800">
                    {formatDate(stock.createdAt)}
                  </span>
                </div>
                {stock.conversionId && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Conversion ID:</span>
                    <span className="font-mono text-gray-800">
                      {stock.conversionId.slice(-8)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {stock.notes && (
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-xs font-medium text-gray-700 mb-2">
                  Notes
                </h4>
                <p className="text-xs text-gray-800">{stock.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Check authentication
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="bg-yellow-50 border border-yellow-200 p-4 sm:p-6 rounded-lg max-w-md w-full">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <p className="text-yellow-800 text-sm sm:text-base">
              Please log in to view processed stock.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentBusiness?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="bg-yellow-50 border border-yellow-200 p-4 sm:p-6 rounded-lg max-w-md w-full">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <p className="text-yellow-800 text-sm sm:text-base">
              Please select a business to view processed stock.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get filtered and sorted stocks
  const filteredStocks = getFilteredStocks();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                Processed Stock History
              </h1>
              <p className="text-sm text-gray-600 mt-1 hidden sm:block">
                View all processed paddy stock and conversion history
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {isMobile && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  <Filter className="w-4 h-4 mr-1" />
                  Filters
                </button>
              )}
              <button
                onClick={refreshData}
                className="flex items-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                {isMobile ? "" : "Refresh"}
              </button>
            </div>
          </div>

          {/* Summary Cards - Responsive */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 sm:p-4 border border-green-200">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-green-600 font-medium">
                    Total Quantity
                  </p>
                  <p className="text-sm sm:text-lg font-bold text-green-900 truncate">
                    {totalQuantity.toFixed(0)} kg
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 sm:p-4 border border-blue-200">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-600 font-medium">
                    Total Value
                  </p>
                  <p className="text-sm sm:text-lg font-bold text-blue-900 truncate">
                    {isMobile
                      ? `Rs.${(totalValue / 1000).toFixed(0)}K`
                      : formatCurrency(totalValue)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-3 sm:p-4 border border-purple-200">
              <div className="flex items-center">
                <BarChart3 className="h-5 w-5 text-purple-600 mr-2" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-purple-600 font-medium">Records</p>
                  <p className="text-sm sm:text-lg font-bold text-purple-900 truncate">
                    {filteredStocks.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-3 sm:p-4 border border-orange-200">
              <div className="flex items-center">
                <Package className="h-5 w-5 text-orange-600 mr-2" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-orange-600 font-medium">
                    Avg Price
                  </p>
                  <p className="text-sm sm:text-lg font-bold text-orange-900 truncate">
                    Rs.
                    {totalQuantity > 0
                      ? (totalValue / totalQuantity).toFixed(0)
                      : 0}
                    /kg
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div
            className={`mt-4 space-y-3 ${
              isMobile && !showFilters ? "hidden" : ""
            }`}
          >
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by buyer, type, or notes..."
                className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="">All Types</option>
                {getPaddyTypes().map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <select
                value={filterBuyer}
                onChange={(e) => setFilterBuyer(e.target.value)}
                className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="">All Buyers</option>
                {buyers.map((buyer) => (
                  <option key={buyer.id} value={buyer.id}>
                    {buyer.name}
                  </option>
                ))}
              </select>

              {/* Reset Filters Button */}
              {(searchTerm || filterType || filterBuyer) && (
                <button
                  onClick={resetFilters}
                  className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <X className="w-4 h-4 mr-1" />
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <div>
                <h3 className="font-medium">Error loading data</h3>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-sm sm:text-base text-gray-600">
                Loading processed stock...
              </p>
            </div>
          </div>
        ) : stocks.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mb-4" />
            <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">
              No processed stock found
            </h3>
            <p className="text-sm sm:text-base text-gray-500">
              Process some paddy stock to see the history here.
            </p>
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="text-center py-12">
            <Search className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mb-4" />
            <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">
              No matches found
            </h3>
            <p className="text-sm sm:text-base text-gray-500 mb-4">
              No processed stock matches your search criteria.
            </p>
            <button
              className="px-4 py-2 text-indigo-600 hover:text-indigo-900 text-sm font-medium border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"
              onClick={resetFilters}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            {/* Mobile View - Cards */}
            <div className="md:hidden space-y-4">
              {filteredStocks.map((stock) => (
                <MobileStockCard key={stock.id} stock={stock} />
              ))}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-10 px-4 py-3"></th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSortChange("createdAt")}
                      >
                        <div className="flex items-center">
                          Purchase Date
                          <SortIcon field="createdAt" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSortChange("processedAt")}
                      >
                        <div className="flex items-center">
                          Processed Date
                          <SortIcon field="processedAt" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSortChange("buyerName")}
                      >
                        <div className="flex items-center">
                          Buyer
                          <SortIcon field="buyerName" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSortChange("paddyType")}
                      >
                        <div className="flex items-center">
                          Type
                          <SortIcon field="paddyType" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSortChange("quantity")}
                      >
                        <div className="flex items-center">
                          Quantity (kg)
                          <SortIcon field="quantity" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSortChange("price")}
                      >
                        <div className="flex items-center">
                          Price (Rs/kg)
                          <SortIcon field="price" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Total Value
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStocks.map((stock) => (
                      <React.Fragment key={stock.id}>
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => toggleRowExpand(stock.id)}
                              className="text-gray-500 hover:text-gray-700 focus:outline-none p-1 rounded transition-colors"
                            >
                              {expandedRows[stock.id] ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(stock.createdAt)}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-green-700">
                              {formatDate(stock.processedAt)}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {stock.buyerName || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {stock.paddyTypeName || "—"}
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
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Processed
                            </span>
                          </td>
                        </tr>
                        {expandedRows[stock.id] && (
                          <tr className="bg-gray-50">
                            <td className="px-4 py-3"></td>
                            <td colSpan="8" className="px-4 py-3">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                                    Transaction Details
                                  </h4>
                                  <div className="bg-white p-3 rounded-lg shadow-sm space-y-2">
                                    <div>
                                      <span className="text-xs text-gray-500">
                                        Stock ID:
                                      </span>
                                      <p className="text-sm text-gray-800 font-mono">
                                        {stock.id}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-xs text-gray-500">
                                        Created:
                                      </span>
                                      <p className="text-sm text-gray-800">
                                        {stock.createdAt?.toLocaleString(
                                          "en-US",
                                          {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          }
                                        )}
                                      </p>
                                    </div>
                                    {stock.processedAt && (
                                      <div>
                                        <span className="text-xs text-gray-500">
                                          Processed:
                                        </span>
                                        <p className="text-sm text-gray-800">
                                          {stock.processedAt?.toLocaleString(
                                            "en-US",
                                            {
                                              year: "numeric",
                                              month: "long",
                                              day: "numeric",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            }
                                          )}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                                    Processing Information
                                  </h4>
                                  <div className="bg-white p-3 rounded-lg shadow-sm space-y-2">
                                    <div>
                                      <span className="text-xs text-gray-500">
                                        Notes:
                                      </span>
                                      <p className="text-sm text-gray-800 mt-1">
                                        {stock.notes || "No additional notes"}
                                      </p>
                                    </div>
                                    {stock.conversionId && (
                                      <div>
                                        <span className="text-xs text-gray-500">
                                          Conversion ID:
                                        </span>
                                        <p className="text-sm text-gray-800 font-mono">
                                          {stock.conversionId}
                                        </p>
                                      </div>
                                    )}
                                    <div>
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Processed
                                      </span>
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
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ViewPaddyStock;
