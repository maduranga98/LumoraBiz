import React, { useState, useEffect } from "react";
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
import { SubItemsDropdown } from "./ManagerSubItemDropDown";
import { toast } from "react-hot-toast";
import { db } from "../../../../services/firebase";
import { useAuth } from "../../../../contexts/AuthContext";
import { useBusiness } from "../../../../contexts/ManagerBusinessContext";

// Compact Movement Row Component
const MovementRow = ({ movement, index }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    try {
      if (timestamp?.toDate) {
        return timestamp.toDate().toLocaleDateString();
      }
      if (timestamp?.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
      }
      return new Date(timestamp).toLocaleDateString();
    } catch (error) {
      return "Invalid";
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getQuantity = () => {
    return movement.totalQuantity || movement.quantity || 0;
  };

  return (
    <tr
      className={`${
        index % 2 === 0 ? "bg-white" : "bg-gray-50"
      } hover:bg-blue-50 transition-colors`}
    >
      <td className="px-3 py-3 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <div>
            <div className="font-medium text-gray-900">{movement.itemName}</div>
            <div className="text-xs text-gray-500">{movement.category}</div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-sm text-right">
        <div className="font-medium">
          {getQuantity().toFixed(1)} {movement.unitType}
        </div>
        {movement.numberOfPacks > 0 && (
          <div className="text-xs text-gray-500">
            {movement.numberOfPacks}P + {movement.numberOfUnits}U
          </div>
        )}
      </td>
      <td className="px-3 py-3 text-sm text-right">
        <div className="font-medium">{formatCurrency(movement.unitPrice)}</div>
      </td>
      <td className="px-3 py-3 text-sm text-right">
        <div className="font-medium">{formatCurrency(movement.total)}</div>
      </td>
      <td className="px-3 py-3 text-sm">
        <div className="max-w-32 truncate" title={movement.recipient || "N/A"}>
          {movement.recipient || "N/A"}
        </div>
      </td>
      <td className="px-3 py-3 text-sm">
        <div className="max-w-24 truncate" title={movement.purpose || "N/A"}>
          {movement.purpose || "N/A"}
        </div>
      </td>
      <td className="px-3 py-3 text-sm">
        <div>{formatDate(movement.createdAt)}</div>
        <div className="text-xs text-gray-500">
          {movement.movedByName?.split(" ")[0] || "Unknown"}
        </div>
      </td>
      <td className="px-3 py-3 text-sm">
        {movement.batchId && (
          <div className="text-xs text-gray-500 font-mono">
            {movement.batchId.substring(0, 8)}...
          </div>
        )}
        {movement.notes && (
          <div
            className="text-xs text-gray-400 max-w-20 truncate"
            title={movement.notes}
          >
            📝 {movement.notes}
          </div>
        )}
      </td>
    </tr>
  );
};

// Stats Card Component (kept compact)
const StatsCard = ({ title, value, icon, color = "blue", subtitle }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-2 rounded-full bg-${color}-100`}>{icon}</div>
    </div>
  </div>
);

export const SubStockHistory = () => {
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dateRange, setDateRange] = useState("7");
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({
    limit: 50, // Increased since table is more compact
    lastDoc: null,
    hasMore: true,
  });
  const [stats, setStats] = useState({
    totalOut: 0,
    totalMovements: 0,
    totalValueOut: 0,
  });

  // Get date range filter
  const getDateFilter = () => {
    if (dateRange === "ALL") return null;
    const days = parseInt(dateRange);
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    return Timestamp.fromDate(dateLimit);
  };

  // Fetch movement history (OUT movements only)
  const fetchMovements = async (isLoadMore = false) => {
    const businessId = currentBusiness?.id;
    const ownerId = currentUser?.ownerId;
    if (!businessId || !ownerId) {
      setLoading(false);
      return;
    }

    if (!isLoadMore) {
      setLoading(true);
      setPagination((prev) => ({ ...prev, lastDoc: null, hasMore: true }));
    }

    try {
      let movementsQuery = query(
        collection(
          db,
          `owners/${ownerId}/businesses/${businessId}/stock/materialStock/movements`
        )
      );

      if (selectedItem) {
        movementsQuery = query(
          movementsQuery,
          where("itemId", "==", selectedItem.id)
        );
      }

      const dateFilter = getDateFilter();
      if (dateFilter) {
        movementsQuery = query(
          movementsQuery,
          where("createdAt", ">=", dateFilter)
        );
      }

      movementsQuery = query(movementsQuery, orderBy("createdAt", "desc"));

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

      let filteredMovements = movementsList;
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filteredMovements = movementsList.filter(
          (movement) =>
            movement.itemName?.toLowerCase().includes(searchLower) ||
            movement.recipient?.toLowerCase().includes(searchLower) ||
            movement.purpose?.toLowerCase().includes(searchLower) ||
            movement.notes?.toLowerCase().includes(searchLower) ||
            movement.batchId?.toLowerCase().includes(searchLower) ||
            movement.category?.toLowerCase().includes(searchLower)
        );
      }

      if (isLoadMore) {
        setMovements((prev) => [...prev, ...filteredMovements]);
      } else {
        setMovements(filteredMovements);
        calculateStats(filteredMovements);
      }

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

  // Calculate statistics (OUT movements only)
  const calculateStats = (movementsList) => {
    const stats = movementsList.reduce(
      (acc, movement) => {
        const quantity = movement.totalQuantity || movement.quantity || 0;
        const value = movement.total || 0;

        acc.totalOut += quantity;
        acc.totalValueOut += value;
        acc.totalMovements++;
        return acc;
      },
      { totalOut: 0, totalMovements: 0, totalValueOut: 0 }
    );
    setStats(stats);
  };

  const loadMoreMovements = () => {
    if (pagination.hasMore && !loading) {
      fetchMovements(true);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [selectedItem, dateRange]);

  // Handle search with debounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchMovements();
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleResetFilters = () => {
    setSelectedItem(null);
    setDateRange("7");
    setSearchTerm("");
  };

  const exportToCSV = () => {
    if (movements.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Date",
      "Item Name",
      "Category",
      "Total Quantity",
      "Unit Type",
      "Unit Price",
      "Total Value",
      "Recipient",
      "Purpose",
      "Batch ID",
      "Moved By",
    ];

    const csvData = movements.map((movement) => [
      movement.createdAt?.toDate?.()?.toLocaleDateString() || "Unknown",
      movement.itemName || "",
      movement.category || "",
      movement.totalQuantity || movement.quantity || 0,
      movement.unitType || "",
      movement.unitPrice || 0,
      movement.total || 0,
      movement.recipient || "",
      movement.purpose || "",
      movement.batchId || "",
      movement.movedByName || "",
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `item_movements_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
    toast.success("CSV exported successfully");
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Item Movement History
          </h1>
          <p className="text-gray-600">
            Track all outgoing inventory movements
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Items Moved Out"
          value={stats.totalOut.toLocaleString()}
          subtitle={formatCurrency(stats.totalValueOut)}
          color="red"
          icon={
            <svg
              className="h-5 w-5 text-red-600"
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
              className="h-5 w-5 text-blue-600"
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
          title="Average Value per Movement"
          value={formatCurrency(
            stats.totalMovements > 0
              ? stats.totalValueOut / stats.totalMovements
              : 0
          )}
          subtitle="Per movement"
          color="purple"
          icon={
            <svg
              className="h-5 w-5 text-purple-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          }
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search items, recipients, notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
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
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
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

      {/* Movement Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
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
              No item movements match your current filters.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      To
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purpose
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {movements.map((movement, index) => (
                    <MovementRow
                      key={movement.id}
                      movement={movement}
                      index={index}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.hasMore && (
              <div className="text-center py-4 border-t border-gray-200">
                <button
                  onClick={loadMoreMovements}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors text-sm"
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
