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

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterBuyer, setFilterBuyer] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");

  // Summary states
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [totalValue, setTotalValue] = useState(0);

  // Fetch available stock
  useEffect(() => {
    if (currentBusiness?.id && currentUser?.uid) {
      fetchAvailableStock();
      fetchBuyers();
    } else {
      setLoading(false);
    }
  }, [currentBusiness?.id, currentUser?.uid, sortField, sortDirection]);

  // Calculate totals when stocks change
  useEffect(() => {
    if (availableStock.length > 0) {
      calculateTotals();
    }
  }, [availableStock, filterType, filterBuyer, searchTerm]);

  const fetchAvailableStock = async () => {
    if (!currentBusiness?.id || !currentUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const stockQuery = query(
        collection(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/rawProcessedStock/stock`
        ),
        where("status", "==", "available"),
        orderBy(sortField, sortDirection)
      );

      const querySnapshot = await getDocs(stockQuery);
      const stockList = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        stockList.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      setAvailableStock(stockList);
    } catch (error) {
      console.error("Error fetching available stock:", error);
      setError(`Failed to load available stock: ${error.message}`);
      toast.error(`Failed to load available stock: ${error.message}`);
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

  // Get all unique paddy types from the stocks
  const getPaddyTypes = () => {
    const types = new Set();
    availableStock.forEach((stock) => {
      if (stock.paddyTypeName) {
        types.add(stock.paddyTypeName);
      }
    });
    return Array.from(types).sort();
  };

  // Apply filters to stocks
  const getFilteredStocks = () => {
    return availableStock.filter((stock) => {
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
    fetchAvailableStock();
    fetchBuyers();
    toast.success("Refreshing data...");
  };

  // Handle convert stock
  const handleConvertStock = (stock) => {
    setSelectedStock(stock);
    setShowConvertModal(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowConvertModal(false);
    setSelectedStock(null);
    // Refresh the stock list after conversion
    fetchAvailableStock();
  };

  // Handle conversion submission
  const handleConversionSubmit = async (conversionData) => {
    console.log("Conversion data received:", conversionData);
    // The modal handles the price calculation flow
    // This is called when user proceeds from conversion form
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

  // No business selected state
  if (!currentBusiness?.id || !currentUser?.uid) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg max-w-md text-center">
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No business selected
          </h3>
          <p className="text-sm text-gray-600">
            Please select a business to view available stock.
          </p>
        </div>
      </div>
    );
  }

  // Get filtered stocks for display
  const filteredStock = getFilteredStocks();

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200 bg-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Creating Products
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Convert available paddy stock into processed products
            </p>
          </div>
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
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-xs text-blue-600 mb-1">Available Quantity</p>
            <p className="text-lg font-semibold text-blue-900">
              {totalQuantity.toFixed(2)} kg
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-xs text-green-600 mb-1">Total Value</p>
            <p className="text-lg font-semibold text-green-900">
              {formatCurrency(totalValue)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-3 gap-3">
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
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
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
            className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">All Buyers</option>
            {buyers.map((buyer) => (
              <option key={buyer.id} value={buyer.id}>
                {buyer.name}
              </option>
            ))}
          </select>
        </div>

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

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Error Display */}
        {error && (
          <div className="m-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <h3 className="font-medium">Error loading stock</h3>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Stock List */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : availableStock.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
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
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                No available stock found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Add some paddy stock first to start creating products.
              </p>
            </div>
          ) : filteredStock.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
              <p className="text-gray-500">
                No stock matches your search criteria.
              </p>
              <button
                className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
                onClick={resetFilters}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSortChange("createdAt")}
                      >
                        <div className="flex items-center">
                          Date Added
                          <SortIcon field="createdAt" />
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
                        onClick={() => handleSortChange("paddyTypeName")}
                      >
                        <div className="flex items-center">
                          Paddy Type
                          <SortIcon field="paddyTypeName" />
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
                          Price/kg
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
                          <div className="text-sm font-semibold text-gray-900">
                            {stock.quantity ? stock.quantity.toFixed(2) : "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatCurrency(stock.price || 0)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(
                              (stock.quantity || 0) * (stock.price || 0)
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleConvertStock(stock)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs transition-colors inline-flex items-center"
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
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
