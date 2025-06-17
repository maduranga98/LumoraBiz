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
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { useBusiness } from "../../contexts/BusinessContext";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";
import ConvertToOtherModal from "./ConvertToOther";

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
  const [filterStatus, setFilterStatus] = useState("");
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
    ownerId: null,
    queryAttempted: false,
    queryResult: null,
    error: null,
  });

  // Modal states
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [processingStock, setProcessingStock] = useState(null);

  // Initialize component and check authentication
  useEffect(() => {
    if (currentUser && currentBusiness?.id) {
      setDebugInfo((prev) => ({
        ...prev,
        businessId: currentBusiness.id,
        ownerId: currentUser.uid,
      }));
      
      console.log("User and business loaded:", {
        userId: currentUser.uid,
        businessId: currentBusiness.id,
        businessName: currentBusiness.name,
      });
      
      fetchStocks();
      fetchBuyers();
    } else {
      setLoading(false);
      console.log("Missing user or business:", {
        hasUser: !!currentUser,
        hasBusiness: !!currentBusiness?.id,
      });
    }
  }, [currentUser, currentBusiness, sortField, sortDirection]);

  // Calculate totals when stocks change
  useEffect(() => {
    if (stocks.length > 0) {
      calculateTotals();
    }
  }, [stocks, filterType, filterBuyer, filterStatus, searchTerm, filterDateRange]);

  // Fetch paddy stocks from Firestore using the correct path
  const fetchStocks = async () => {
    if (!currentUser || !currentBusiness?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Correct collection path for your structure
      const stockCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/rawProcessedStock/stock`;
      console.log("Fetching stocks from:", stockCollectionPath);

      setDebugInfo((prev) => ({
        ...prev,
        queryAttempted: true,
        queryParams: {
          collection: stockCollectionPath,
          businessId: currentBusiness.id,
          ownerId: currentUser.uid,
          sortField,
          sortDirection,
        },
      }));

      // First test basic query access
      const testQuery = query(collection(db, stockCollectionPath), limit(1));
      console.log("Testing basic query access...");
      
      const testSnapshot = await getDocs(testQuery);
      console.log("Basic query test result count:", testSnapshot.size);

      // Build the main query
      let stocksQuery = query(
        collection(db, stockCollectionPath),
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
          processedAt: data.processedAt?.toDate() || null,
        });
      });

      console.log("Processed stocks list:", stocksList.length);
      setStocks(stocksList);
    } catch (error) {
      console.error("Error fetching paddy stocks:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      const errorMessage = error.code === 'permission-denied' 
        ? "Permission denied. Check your Firestore rules."
        : error.code === 'not-found'
        ? "Stock collection not found."
        : `Failed to load purchase history: ${error.message}`;
      
      setError(errorMessage);
      setDebugInfo((prev) => ({ ...prev, error: error.message }));
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch buyers from Firestore using the correct path
  const fetchBuyers = async () => {
    if (!currentUser || !currentBusiness?.id) return;

    try {
      // Correct collection path for buyers
      const buyersCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/buyers`;
      console.log("Fetching buyers from:", buyersCollectionPath);

      const buyersQuery = query(collection(db, buyersCollectionPath));
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

  // Handle process button click
  const handleProcessStock = (stock) => {
    setSelectedStock(stock);
    setIsConvertModalOpen(true);
  };

  // Handle conversion submission
  const handleConversionSubmit = async (conversionData) => {
    if (!selectedStock) return;
  
    setProcessingStock(selectedStock.id);
  
    try {
      console.log('💾 Parent: Saving conversion data to database...');
      
      // Create a conversion record using the correct path
      const conversionsPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/conversions`;
      
      const conversionRecord = {
        businessId: currentBusiness.id,
        ownerId: currentUser.uid,
        sourceStockId: selectedStock.id,
        sourcePaddyType: selectedStock.paddyType,
        sourceQuantity: selectedStock.quantity,
        sourcePrice: selectedStock.price,
        conversionDate: new Date(),
        products: conversionData,
        totalConvertedQuantity: Object.entries(conversionData)
          .filter(([key]) => !key.includes('Electric'))
          .reduce((sum, [_, qty]) => sum + (parseFloat(qty) || 0), 0),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
  
      // Add conversion record to database
      const conversionRef = await addDoc(
        collection(db, conversionsPath),
        conversionRecord
      );
  
      // Update the original stock to mark it as processed
      const stockPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/rawProcessedStock/stock`;
      const stockRef = doc(db, stockPath, selectedStock.id);
      
      await updateDoc(stockRef, {
        status: "processed",
        processed: true,
        conversionId: conversionRef.id,
        processedAt: new Date(),
        updatedAt: new Date(),
      });
  
      // Add individual product records to processed products inventory
      const processedProductsPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/processedProducts`;
      
      const productPromises = Object.entries(conversionData)
        .filter(([key]) => !key.includes('Electric'))
        .map(async ([productType, quantity]) => {
          const qty = parseFloat(quantity) || 0;
          if (qty > 0) {
            const productRecord = {
              businessId: currentBusiness.id,
              ownerId: currentUser.uid,
              productType,
              quantity: qty,
              sourceStockId: selectedStock.id,
              conversionId: conversionRef.id,
              sourceType: "paddy_conversion",
              status: "available",
              createdAt: new Date(),
              updatedAt: new Date(),
            };
  
            return addDoc(collection(db, processedProductsPath), productRecord);
          }
        });
  
      await Promise.all(productPromises.filter(Boolean));
  
      console.log('✅ Parent: Data saved successfully!');
      toast.success("Paddy stock processed successfully!");
  
      // Refresh the stocks to show updated status
      fetchStocks();
      
      // 🎯 KEY CHANGE: DON'T close the modal here!
      // Let the child component (ConvertToOtherModal) handle the modal flow
      // The child will now show PriceCalculation component
      
      console.log('🧮 Parent: Allowing child to show PriceCalculation...');
      
    } catch (error) {
      console.error("Error processing stock:", error);
      console.error("Error code:", error.code);
      
      const errorMessage = error.code === 'permission-denied'
        ? "Permission denied. Check your Firestore rules."
        : `Failed to process stock: ${error.message}`;
      
      toast.error(errorMessage);
    } finally {
      setProcessingStock(null);
    }
  };
  const handleModalClose = () => {
    console.log('🚪 Parent: Modal closing...');
    setIsConvertModalOpen(false);
    setSelectedStock(null);
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
    setFilterStatus("");
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

      // Status filter
      const matchesStatus = filterStatus === "" || 
        (filterStatus === "processed" && (stock.processed || stock.status === "processed")) ||
        (filterStatus === "available" && (!stock.processed && stock.status !== "processed"));

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

      return matchesSearch && matchesType && matchesBuyer && matchesStatus && matchesDateRange;
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
      <div className="space-y-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Please log in to view paddy stock.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentBusiness?.id) {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Please select a business to view paddy stock.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get filtered and sorted stocks
  const filteredStocks = getFilteredStocks();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center transition-colors"
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
          <p className="text-sm text-gray-500 mb-1">Total Quantity</p>
          <p className="text-2xl font-bold text-gray-900">
            {totalQuantity.toFixed(2)} kg
          </p>
        </div>
        <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
          <p className="text-sm text-gray-500 mb-1">Total Value</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalValue)}
          </p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
              className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Buyers</option>
              {buyers.map((buyer) => (
                <option key={buyer.id} value={buyer.id}>
                  {buyer.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Status</option>
              <option value="available">Available</option>
              <option value="processed">Processed</option>
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
                className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <input
                type="date"
                name="end"
                placeholder="End Date"
                value={filterDateRange.end}
                onChange={handleDateFilterChange}
                className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Reset Filters Button */}
        {(searchTerm ||
          filterType ||
          filterBuyer ||
          filterStatus ||
          filterDateRange.start ||
          filterDateRange.end) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <h3 className="font-medium">Error loading data</h3>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : stocks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
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
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg
              className="-ml-1 mr-2 h-5 w-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Add New Paddy Stock
          </button>
          
        </div>
      ) : filteredStocks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-gray-500">
            No purchases match your search criteria.
          </p>
          <button
            className="mt-4 text-blue-600 hover:text-blue-900 text-sm font-medium"
            onClick={resetFilters}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-10 px-4 py-3"></th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortChange("createdAt")}
                  >
                    <div className="flex items-center">
                      Date
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
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
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
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          {stock.processed || stock.status === "processed" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <svg
                                className="w-3 h-3 mr-1"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Processed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <svg
                                className="w-3 h-3 mr-1"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Available
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        {!(stock.processed || stock.status === "processed") ? (
                          <button
                            onClick={() => handleProcessStock(stock)}
                            disabled={processingStock === stock.id}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {processingStock === stock.id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1"></div>
                                Processing...
                              </>
                            ) : (
                              <>
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
                                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                </svg>
                                Process
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500">
                            Processed on {formatDate(stock.processedAt)}
                          </span>
                        )}
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
                                {(stock.processed || stock.status === "processed") && stock.processedAt && (
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
                                {stock.stockType && (
                                  <div>
                                    <span className="text-xs text-gray-500">
                                      Stock Type:
                                    </span>
                                    <p className="text-sm text-gray-800 capitalize">
                                      {stock.stockType}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                Additional Information
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
                                {stock.buyerId && (
                                  <div>
                                    <span className="text-xs text-gray-500">
                                      Buyer ID:
                                    </span>
                                    <p className="text-sm text-gray-800 font-mono">
                                      {stock.buyerId}
                                    </p>
                                  </div>
                                )}
                                {stock.createdBy && (
                                  <div>
                                    <span className="text-xs text-gray-500">
                                      Created By:
                                    </span>
                                    <p className="text-sm text-gray-800 font-mono">
                                      {stock.createdBy}
                                    </p>
                                  </div>
                                )}
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
      )}

      {/* Convert to Other Modal */}
      <ConvertToOtherModal
      isOpen={isConvertModalOpen}
      onClose={handleModalClose}  // 🔧 Use the new close handler
      stock={selectedStock}
      onSubmit={handleConversionSubmit}  // This will save data but NOT close modal
    />
    </div>
  );
};

export default ViewPaddyStock;