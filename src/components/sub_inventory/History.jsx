import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  startAfter,
  Timestamp,
} from "firebase/firestore";
import { SubItemsDropdown } from "./SubItemsDropdown";
import { toast } from "react-hot-toast";

// Movement Card Component
const MovementCard = ({ movement }) => {
  const isIncoming = movement.movementType === "IN";
  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown Date";

    try {
      if (timestamp?.toDate) {
        return timestamp.toDate().toLocaleString();
      }
      if (timestamp?.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleString();
      }
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div
            className={`p-2 rounded-full ${
              isIncoming
                ? "bg-green-100 text-green-600"
                : "bg-red-100 text-red-600"
            }`}
          >
            {isIncoming ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8l-8-8-8 8"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 20V4m-8 8l8 8 8-8"
                />
              </svg>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{movement.itemName}</h3>
            <p className="text-sm text-gray-600">
              {movement.category && (
                <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mr-2">
                  {movement.category}
                </span>
              )}
              {movement.purpose || movement.supplier || "No description"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              isIncoming
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {movement.movementType}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
        <div>
          <span className="text-gray-500">Quantity:</span>
          <p className="font-medium text-gray-900">
            {movement.quantity?.toFixed(2) || 0} {movement.unitType}
          </p>
        </div>
        <div>
          <span className="text-gray-500">Unit Price:</span>
          <p className="font-medium text-gray-900">
            {formatCurrency(movement.unitPrice)}
          </p>
        </div>
        <div>
          <span className="text-gray-500">Total Value:</span>
          <p className="font-medium text-gray-900">
            {formatCurrency(movement.total)}
          </p>
        </div>
        <div>
          <span className="text-gray-500">{isIncoming ? "From:" : "To:"}</span>
          <p className="font-medium text-gray-900">
            {movement.supplier || movement.recipient || "N/A"}
          </p>
        </div>
      </div>

      {/* Stock Information */}
      {(movement.previousStock !== undefined ||
        movement.newStock !== undefined) && (
        <div className="grid grid-cols-2 gap-3 text-sm mb-3 p-2 bg-gray-50 rounded">
          <div>
            <span className="text-gray-500">Previous Stock:</span>
            <p className="font-medium text-gray-900">
              {movement.previousStock?.toFixed(2) || 0} {movement.unitType}
            </p>
          </div>
          <div>
            <span className="text-gray-500">New Stock:</span>
            <p className="font-medium text-gray-900">
              {movement.newStock?.toFixed(2) || 0} {movement.unitType}
            </p>
          </div>
        </div>
      )}

      {/* Discount Information for IN movements */}
      {isIncoming && (movement.discount > 0 || movement.discountAmount > 0) && (
        <div className="grid grid-cols-2 gap-3 text-sm mb-3 p-2 bg-blue-50 rounded">
          <div>
            <span className="text-blue-600">Discount:</span>
            <p className="font-medium text-blue-800">
              {movement.discount}% ({formatCurrency(movement.discountAmount)})
            </p>
          </div>
          <div>
            <span className="text-blue-600">Subtotal:</span>
            <p className="font-medium text-blue-800">
              {formatCurrency(movement.subtotal)}
            </p>
          </div>
        </div>
      )}

      {/* Batch Information for OUT movements */}
      {!isIncoming && movement.batchId && (
        <div className="text-sm mb-3 p-2 bg-orange-50 rounded">
          <span className="text-orange-600">Batch ID:</span>
          <span className="font-medium text-orange-800 ml-2">
            {movement.batchId}
          </span>
          {movement.originalBatchDate && (
            <span className="text-orange-600 ml-4">
              Original Date:{" "}
              <span className="font-medium">{movement.originalBatchDate}</span>
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-200 pt-3">
        <div className="flex items-center space-x-4">
          <span>By: {movement.movedByName || "Unknown"}</span>
          {movement.invoiceNumber && (
            <span>Invoice: {movement.invoiceNumber}</span>
          )}
        </div>
        <div>
          <span>{formatDate(movement.createdAt || movement.timestamp)}</span>
        </div>
      </div>

      {movement.notes && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
          <span className="text-gray-500">Notes: </span>
          <span className="text-gray-900">{movement.notes}</span>
        </div>
      )}
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, icon, color = "blue", subtitle }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-full bg-${color}-100`}>{icon}</div>
    </div>
  </div>
);

export const History = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [movementType, setMovementType] = useState("ALL");
  const [dateRange, setDateRange] = useState("7"); // Last 7 days
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({
    limit: 20,
    lastDoc: null,
    hasMore: true,
  });
  const [stats, setStats] = useState({
    totalIn: 0,
    totalOut: 0,
    totalMovements: 0,
    totalValueIn: 0,
    totalValueOut: 0,
  });

  // Get current business ID
  const getCurrentBusinessId = () => {
    return localStorage.getItem("currentBusinessId");
  };

  // Get date range filter
  const getDateFilter = () => {
    if (dateRange === "ALL") return null;

    const days = parseInt(dateRange);
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    return Timestamp.fromDate(dateLimit);
  };

  // Fetch movement history
  const fetchMovements = async (isLoadMore = false) => {
    const businessId = getCurrentBusinessId();
    if (!businessId) {
      setLoading(false);
      return;
    }

    if (!isLoadMore) {
      setLoading(true);
      setPagination((prev) => ({ ...prev, lastDoc: null, hasMore: true }));
    }

    try {
      let movementsQuery = query(
        collection(db, "itemMovements"),
        where("businessId", "==", businessId)
      );

      // Filter by item if selected
      if (selectedItem) {
        movementsQuery = query(
          movementsQuery,
          where("itemId", "==", selectedItem.id)
        );
      }

      // Filter by movement type
      if (movementType !== "ALL") {
        movementsQuery = query(
          movementsQuery,
          where("movementType", "==", movementType)
        );
      }

      // Add date range filter
      const dateFilter = getDateFilter();
      if (dateFilter) {
        movementsQuery = query(
          movementsQuery,
          where("createdAt", ">=", dateFilter)
        );
      }

      // Order by timestamp descending
      movementsQuery = query(movementsQuery, orderBy("createdAt", "desc"));

      // Add pagination
      if (isLoadMore && pagination.lastDoc) {
        movementsQuery = query(
          movementsQuery,
          startAfter(pagination.lastDoc),
          limit(pagination.limit)
        );
      } else {
        movementsQuery = query(movementsQuery, limit(pagination.limit));
      }

      const querySnapshot = await getDocs(movementsQuery);
      const movementsList = [];

      querySnapshot.forEach((doc) => {
        movementsList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // Filter by search term if provided
      let filteredMovements = movementsList;
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filteredMovements = movementsList.filter(
          (movement) =>
            movement.itemName?.toLowerCase().includes(searchLower) ||
            movement.supplier?.toLowerCase().includes(searchLower) ||
            movement.recipient?.toLowerCase().includes(searchLower) ||
            movement.purpose?.toLowerCase().includes(searchLower) ||
            movement.notes?.toLowerCase().includes(searchLower) ||
            movement.invoiceNumber?.toLowerCase().includes(searchLower)
        );
      }

      if (isLoadMore) {
        setMovements((prev) => [...prev, ...filteredMovements]);
      } else {
        setMovements(filteredMovements);
        calculateStats(filteredMovements);
      }

      // Update pagination
      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      setPagination((prev) => ({
        ...prev,
        lastDoc: lastVisible,
        hasMore: querySnapshot.docs.length === pagination.limit,
      }));
    } catch (error) {
      console.error("Error fetching movements:", error);
      toast.error("Failed to fetch movement history");
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (movementsList) => {
    const stats = movementsList.reduce(
      (acc, movement) => {
        const quantity = movement.quantity || 0;
        const value = movement.total || 0;

        if (movement.movementType === "IN") {
          acc.totalIn += quantity;
          acc.totalValueIn += value;
        } else {
          acc.totalOut += quantity;
          acc.totalValueOut += value;
        }
        acc.totalMovements++;
        return acc;
      },
      {
        totalIn: 0,
        totalOut: 0,
        totalMovements: 0,
        totalValueIn: 0,
        totalValueOut: 0,
      }
    );

    setStats(stats);
  };

  // Load more movements
  const loadMoreMovements = () => {
    if (pagination.hasMore && !loading) {
      fetchMovements(true);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [selectedItem, movementType, dateRange]);

  // Handle search with debounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchMovements();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Handle filter reset
  const handleResetFilters = () => {
    setSelectedItem(null);
    setMovementType("ALL");
    setDateRange("7");
    setSearchTerm("");
  };

  // Export to CSV
  const exportToCSV = () => {
    if (movements.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Date",
      "Item Name",
      "Category",
      "Movement Type",
      "Quantity",
      "Unit Type",
      "Unit Price",
      "Total Value",
      "Supplier/Recipient",
      "Purpose",
      "Notes",
      "Moved By",
    ];

    const csvData = movements.map((movement) => [
      movement.createdAt?.toDate?.()?.toLocaleDateString() || "Unknown",
      movement.itemName || "",
      movement.category || "",
      movement.movementType || "",
      movement.quantity || 0,
      movement.unitType || "",
      movement.unitPrice || 0,
      movement.total || 0,
      movement.supplier || movement.recipient || "",
      movement.purpose || "",
      movement.notes || "",
      movement.movedByName || "",
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `movement_history_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();

    toast.success("CSV exported successfully");
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Movement History</h1>
          <p className="text-gray-600">
            Track all inventory movements and transactions
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={exportToCSV}
            disabled={movements.length === 0}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Items In"
          value={stats.totalIn.toLocaleString()}
          subtitle={formatCurrency(stats.totalValueIn)}
          color="green"
          icon={
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 11l5-5m0 0l5 5m-5-5v12"
              />
            </svg>
          }
        />
        <StatsCard
          title="Items Out"
          value={stats.totalOut.toLocaleString()}
          subtitle={formatCurrency(stats.totalValueOut)}
          color="red"
          icon={
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 13l-5 5m0 0l-5-5m5 5V6"
              />
            </svg>
          }
        />
        <StatsCard
          title="Total Movements"
          value={stats.totalMovements}
          subtitle={`${movements.length} shown`}
          icon={
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
        />
        <StatsCard
          title="Net Value"
          value={formatCurrency(stats.totalValueIn - stats.totalValueOut)}
          subtitle={`${
            stats.totalValueIn > stats.totalValueOut ? "Positive" : "Negative"
          } flow`}
          color="purple"
          icon={
            <svg
              className="h-6 w-6 text-purple-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
          }
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Filters & Search
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search items, suppliers, notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <SubItemsDropdown
              selectedItem={selectedItem}
              onItemSelect={setSelectedItem}
              label="Filter by Item"
              placeholder="All items"
              showCategory={false}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Movement Type
            </label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="ALL">All Movements</option>
              <option value="IN">Incoming Only</option>
              <option value="OUT">Outgoing Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
              <option value="365">Last year</option>
              <option value="ALL">All time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Movement History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Movement Records
          </h3>
          <span className="text-sm text-gray-500">
            Showing {movements.length} movements
          </span>
        </div>

        {loading && movements.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : movements.length === 0 ? (
          <div className="text-center py-12">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-gray-400 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No movements found
            </h3>
            <p className="text-gray-500">
              No item movements match your current filters. Try adjusting the
              filters or check back later.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {movements.map((movement) => (
                <MovementCard key={movement.id} movement={movement} />
              ))}
            </div>

            {/* Load More Button */}
            {pagination.hasMore && (
              <div className="text-center mt-6">
                <button
                  onClick={loadMoreMovements}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                >
                  {loading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
