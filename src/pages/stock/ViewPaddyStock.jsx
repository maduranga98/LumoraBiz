import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import {
  collection,
  query,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { useBusiness } from "../../contexts/BusinessContext";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";

const ViewPaddyStock = () => {
  const { currentBusiness } = useBusiness();
  const { currentUser } = useAuth();

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
      
      const errorMessage = error.code === 'permission-denied' 
        ? "Permission denied. Check your Firestore rules."
        : error.code === 'not-found'
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

      const matchesType = filterType === "" || stock.paddyTypeName === filterType;
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

  // Check authentication
  if (!currentUser) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg max-w-md">
          <p className="text-yellow-800 text-sm">
            Please log in to view processed stock.
          </p>
        </div>
      </div>
    );
  }

  if (!currentBusiness?.id) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg max-w-md">
          <p className="text-yellow-800 text-sm">
            Please select a business to view processed stock.
          </p>
        </div>
      </div>
    );
  }

  // Get filtered and sorted stocks
  const filteredStocks = getFilteredStocks();

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200 bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Processed Stock History
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              View all processed paddy stock and conversion history
            </p>
          </div>
          <button
            onClick={refreshData}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm flex items-center transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-xs text-green-600 mb-1">Total Processed Quantity</p>
            <p className="text-lg font-semibold text-green-900">
              {totalQuantity.toFixed(2)} kg
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-xs text-green-600 mb-1">Total Processed Value</p>
            <p className="text-lg font-semibold text-green-900">
              {formatCurrency(totalValue)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-3 gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          >
            <option value="">All Types</option>
            {getPaddyTypes().map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={filterBuyer}
            onChange={(e) => setFilterBuyer(e.target.value)}
            className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          >
            <option value="">All Buyers</option>
            {buyers.map((buyer) => (
              <option key={buyer.id} value={buyer.id}>{buyer.name}</option>
            ))}
          </select>
        </div>

        {/* Reset Filters */}
        {(searchTerm || filterType || filterBuyer) && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={resetFilters}
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Error Display */}
        {error && (
          <div className="m-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <h3 className="font-medium">Error loading data</h3>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Main Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        ) : stocks.length === 0 ? (
          <div className="m-6 text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">
              No processed stock found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Process some paddy stock to see the history here.
            </p>
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="m-6 text-center py-12">
            <p className="text-gray-500">No processed stock matches your search criteria.</p>
            <button
              className="mt-4 text-indigo-600 hover:text-indigo-900 text-sm font-medium"
              onClick={resetFilters}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="w-10 px-4 py-3"></th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortChange("createdAt")}
                  >
                    <div className="flex items-center">
                      Purchase Date
                      <SortIcon field="createdAt" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortChange("processedAt")}
                  >
                    <div className="flex items-center">
                      Processed Date
                      <SortIcon field="processedAt" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortChange("buyerName")}
                  >
                    <div className="flex items-center">
                      Buyer
                      <SortIcon field="buyerName" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortChange("paddyType")}
                  >
                    <div className="flex items-center">
                      Type
                      <SortIcon field="paddyType" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortChange("quantity")}
                  >
                    <div className="flex items-center">
                      Quantity (kg)
                      <SortIcon field="quantity" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
                    Conversion ID
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
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
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
                        <div className="text-xs text-gray-500 font-mono">
                          {stock.conversionId || "—"}
                        </div>
                      </td>
                    </tr>
                    {expandedRows[stock.id] && (
                      <tr className="bg-gray-50">
                        <td className="px-4 py-3"></td>
                        <td colSpan="8" className="px-4 py-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                Transaction Details
                              </h4>
                              <div className="bg-white p-3 rounded-lg shadow-sm space-y-2">
                                <div>
                                  <span className="text-xs text-gray-500">Stock ID:</span>
                                  <p className="text-sm text-gray-800 font-mono">{stock.id}</p>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500">Created:</span>
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
                                {stock.processedAt && (
                                  <div>
                                    <span className="text-xs text-gray-500">Processed:</span>
                                    <p className="text-sm text-gray-800">
                                      {stock.processedAt?.toLocaleString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
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
                                  <span className="text-xs text-gray-500">Notes:</span>
                                  <p className="text-sm text-gray-800 mt-1">
                                    {stock.notes || "No additional notes"}
                                  </p>
                                </div>
                                {stock.conversionId && (
                                  <div>
                                    <span className="text-xs text-gray-500">Conversion ID:</span>
                                    <p className="text-sm text-gray-800 font-mono">{stock.conversionId}</p>
                                  </div>
                                )}
                                <div>
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
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
        )}
      </div>
    </div>
  );
};

export default ViewPaddyStock;