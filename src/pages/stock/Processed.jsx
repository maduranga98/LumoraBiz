import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { toast } from "react-hot-toast";

const ProcessedProducts = () => {
  // States
  const [products, setProducts] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProductType, setFilterProductType] = useState("");
  const [filterDateRange, setFilterDateRange] = useState({
    start: "",
    end: "",
  });
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [expandedRows, setExpandedRows] = useState({});
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [productSummary, setProductSummary] = useState({});

  // Get current business ID from localStorage
  useEffect(() => {
    try {
      const businessId = localStorage.getItem("currentBusinessId");
      if (businessId) {
        setCurrentBusiness(businessId);
      } else {
        toast.error("Please select a business first");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error);
      toast.error("Failed to load business information");
      setLoading(false);
    }
  }, []);

  // Fetch data when current business changes
  useEffect(() => {
    if (currentBusiness) {
      fetchProcessedProducts();
      fetchConversions();
    }
  }, [currentBusiness, sortField, sortDirection]);

  // Calculate totals when products change
  useEffect(() => {
    if (products.length > 0) {
      calculateTotals();
    }
  }, [products, filterProductType, searchTerm, filterDateRange]);

  // Fetch processed products from Firestore
  const fetchProcessedProducts = async () => {
    if (!currentBusiness) return;

    setLoading(true);
    setError(null);

    try {
      const productsQuery = query(
        collection(db, "processedProducts"),
        where("businessId", "==", currentBusiness),
        orderBy(sortField, sortDirection)
      );

      const querySnapshot = await getDocs(productsQuery);
      const productsList = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        productsList.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      setProducts(productsList);
    } catch (error) {
      console.error("Error fetching processed products:", error);
      setError(`Failed to load processed products: ${error.message}`);
      toast.error(`Failed to load processed products: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch conversion records for additional context
  const fetchConversions = async () => {
    if (!currentBusiness) return;

    try {
      const conversionsQuery = query(
        collection(db, "conversions"),
        where("businessId", "==", currentBusiness),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(conversionsQuery);
      const conversionsList = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        conversionsList.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          conversionDate: data.conversionDate?.toDate() || new Date(),
        });
      });

      setConversions(conversionsList);
    } catch (error) {
      console.error("Error fetching conversions:", error);
    }
  };

  // Calculate totals and summary
  const calculateTotals = () => {
    const filteredProducts = getFilteredProducts();

    let totalQty = 0;
    const summary = {};

    filteredProducts.forEach((product) => {
      totalQty += product.quantity || 0;

      // Group by product type
      if (!summary[product.productType]) {
        summary[product.productType] = 0;
      }
      summary[product.productType] += product.quantity || 0;
    });

    setTotalQuantity(totalQty);
    setProductSummary(summary);
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
    setFilterProductType("");
    setFilterDateRange({ start: "", end: "" });
  };

  // Manual refresh function
  const refreshData = () => {
    fetchProcessedProducts();
    fetchConversions();
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

  // Get all unique product types
  const getProductTypes = () => {
    const types = new Set();
    products.forEach((product) => {
      if (product.productType) {
        types.add(product.productType);
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

  // Apply filters to products
  const getFilteredProducts = () => {
    return products.filter((product) => {
      // Search term filter
      const matchesSearch =
        searchTerm === "" ||
        product.productType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sourceStockId?.toLowerCase().includes(searchTerm.toLowerCase());

      // Product type filter
      const matchesType =
        filterProductType === "" || product.productType === filterProductType;

      // Date range filter
      let matchesDateRange = true;
      if (filterDateRange.start) {
        const startDate = new Date(filterDateRange.start);
        startDate.setHours(0, 0, 0, 0);
        matchesDateRange = matchesDateRange && product.createdAt >= startDate;
      }
      if (filterDateRange.end) {
        const endDate = new Date(filterDateRange.end);
        endDate.setHours(23, 59, 59, 999);
        matchesDateRange = matchesDateRange && product.createdAt <= endDate;
      }

      return matchesSearch && matchesType && matchesDateRange;
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

  // Get conversion details for a product
  const getConversionDetails = (conversionId) => {
    return conversions.find((conv) => conv.id === conversionId);
  };

  // Format product type for display
  const formatProductType = (type) => {
    const typeMap = {
      rice: "Rice (Hal)",
      blackSeeds: "Black Seeds (Kalu Ata)",
      brokenRice: "Broken Rice (Kadunu Hal)",
      hunuRice: "Hunu Sahal",
      dahaiya: "Dahaiya",
      ricePolish: "Rice Polish",
    };
    return typeMap[type] || type;
  };

  const filteredProducts = getFilteredProducts();

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Processed Products Inventory
          </h1>
          <p className="text-gray-600 mt-1">
            View all products from paddy processing operations
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2 mt-4 md:mt-0">
          <button
            onClick={refreshData}
            className="bg-primary hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm flex items-center transition-opacity"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow-sm rounded-xl p-4 border border-muted">
          <p className="text-sm text-muted">Total Products</p>
          <p className="text-2xl font-bold text-text">
            {filteredProducts.length}
          </p>
        </div>
        <div className="bg-white shadow-sm rounded-xl p-4 border border-muted">
          <p className="text-sm text-muted">Total Quantity</p>
          <p className="text-2xl font-bold text-text">
            {totalQuantity.toFixed(2)} kg
          </p>
        </div>
        <div className="bg-white shadow-sm rounded-xl p-4 border border-muted">
          <p className="text-sm text-muted">Product Types</p>
          <p className="text-2xl font-bold text-text">
            {Object.keys(productSummary).length}
          </p>
        </div>
        <div className="bg-white shadow-sm rounded-xl p-4 border border-muted">
          <p className="text-sm text-muted">Conversion Batches</p>
          <p className="text-2xl font-bold text-text">{conversions.length}</p>
        </div>
      </div>

      {/* Product Summary */}
      {Object.keys(productSummary).length > 0 && (
        <div className="bg-white shadow-sm rounded-xl p-6 mb-6 border border-muted">
          <h3 className="text-lg font-semibold text-text mb-4">
            Product Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(productSummary).map(([type, quantity]) => (
              <div
                key={type}
                className="text-center p-3 bg-primary bg-opacity-5 rounded-lg"
              >
                <p className="text-xs text-muted font-medium">
                  {formatProductType(type)}
                </p>
                <p className="text-lg font-bold text-primary">
                  {quantity.toFixed(2)} kg
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Section */}
      <div className="bg-white shadow-sm rounded-xl p-4 mb-6 border border-muted">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-muted"
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
                placeholder="Search products..."
                className="pl-10 pr-4 py-2 border border-muted rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Product Type Filter */}
          <div>
            <select
              value={filterProductType}
              onChange={(e) => setFilterProductType(e.target.value)}
              className="block w-full border border-muted rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">All Product Types</option>
              {getProductTypes().map((type) => (
                <option key={type} value={type}>
                  {formatProductType(type)}
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
                value={filterDateRange.start}
                onChange={handleDateFilterChange}
                className="block w-full border border-muted rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <input
                type="date"
                name="end"
                value={filterDateRange.end}
                onChange={handleDateFilterChange}
                className="block w-full border border-muted rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Reset Filters Button */}
        {(searchTerm ||
          filterProductType ||
          filterDateRange.start ||
          filterDateRange.end) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={resetFilters}
              className="text-sm text-primary hover:opacity-80 font-medium"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-error bg-opacity-10 border border-error border-opacity-20 text-error px-4 py-3 rounded-xl mb-6">
          <h3 className="font-medium">Error loading data</h3>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Products List */}
      {loading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent"></div>
        </div>
      ) : !currentBusiness ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-muted">
          <svg
            className="mx-auto h-12 w-12 text-muted"
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
          <h3 className="mt-2 text-lg font-medium text-text">
            No business selected
          </h3>
          <p className="mt-1 text-sm text-muted">
            Please select a business from the business selector.
          </p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-muted">
          <svg
            className="mx-auto h-12 w-12 text-muted"
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
          <h3 className="mt-2 text-lg font-medium text-text">
            No processed products found
          </h3>
          <p className="mt-1 text-sm text-muted">
            Process some paddy stock to see products here.
          </p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-muted">
          <p className="text-muted">No products match your search criteria.</p>
          <button
            className="mt-4 text-primary hover:opacity-80 text-sm font-medium"
            onClick={resetFilters}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-muted">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-muted">
              <thead className="bg-bg">
                <tr>
                  <th className="w-10 px-4 py-3"></th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider cursor-pointer"
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
                    className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange("productType")}
                  >
                    <div className="flex items-center">
                      Product Type
                      {sortField === "productType" && (
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
                    className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider cursor-pointer"
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
                    className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider"
                  >
                    Source
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider"
                  >
                    Conversion ID
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-muted">
                {filteredProducts.map((product) => (
                  <React.Fragment key={product.id}>
                    <tr className="hover:bg-primary hover:bg-opacity-5 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => toggleRowExpand(product.id)}
                          className="text-muted hover:text-text focus:outline-none transition-colors"
                        >
                          {expandedRows[product.id] ? (
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
                        <div className="text-sm text-text">
                          {formatDate(product.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-text">
                          {formatProductType(product.productType)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-text font-semibold">
                          {product.quantity ? product.quantity.toFixed(2) : "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-muted">
                          {product.sourceType === "paddy_conversion"
                            ? "Paddy Stock"
                            : product.sourceType}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-muted font-mono">
                          {product.conversionId
                            ? product.conversionId.slice(-8)
                            : "—"}
                        </div>
                      </td>
                    </tr>
                    {expandedRows[product.id] && (
                      <tr className="bg-primary bg-opacity-5">
                        <td className="px-4 py-3"></td>
                        <td colSpan="5" className="px-4 py-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                            <div>
                              <h4 className="text-sm font-medium text-text mb-2">
                                Product Details
                              </h4>
                              <div className="bg-white p-3 rounded-lg shadow-sm space-y-2 border border-muted">
                                <div>
                                  <span className="text-xs text-muted">
                                    Product ID:
                                  </span>
                                  <p className="text-sm text-text font-mono">
                                    {product.id}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-xs text-muted">
                                    Source Stock ID:
                                  </span>
                                  <p className="text-sm text-text font-mono">
                                    {product.sourceStockId}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-xs text-muted">
                                    Created:
                                  </span>
                                  <p className="text-sm text-text">
                                    {product.createdAt?.toLocaleString(
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
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-text mb-2">
                                Conversion Information
                              </h4>
                              <div className="bg-white p-3 rounded-lg shadow-sm border border-muted">
                                {(() => {
                                  const conversionDetails =
                                    getConversionDetails(product.conversionId);
                                  return conversionDetails ? (
                                    <div className="space-y-2">
                                      <div>
                                        <span className="text-xs text-muted">
                                          Source Paddy Type:
                                        </span>
                                        <p className="text-sm text-text">
                                          {conversionDetails.sourcePaddyType}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-xs text-muted">
                                          Source Quantity:
                                        </span>
                                        <p className="text-sm text-text">
                                          {conversionDetails.sourceQuantity?.toFixed(
                                            2
                                          )}{" "}
                                          kg
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-xs text-muted">
                                          Conversion Date:
                                        </span>
                                        <p className="text-sm text-text">
                                          {formatDate(
                                            conversionDetails.conversionDate
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted">
                                      Conversion details not available
                                    </p>
                                  );
                                })()}
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
    </div>
  );
};

export default ProcessedProducts;
