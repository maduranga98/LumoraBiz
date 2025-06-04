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
} from "firebase/firestore";
import { SubItemsDropdown } from "./SubItemsDropdown";

// Movement Card Component
const MovementCard = ({ movement }) => {
  const isIncoming = movement.movementType === "IN";
  const formatDate = (timestamp) => {
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleString();
    }
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-muted p-4 hover:shadow-md transition-shadow">
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
            <h3 className="font-semibold text-text">{movement.itemName}</h3>
            <p className="text-sm text-muted">
              {movement.purpose || "No purpose specified"}
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
          <span className="text-muted">Quantity:</span>
          <p className="font-medium text-text">
            {movement.quantity} {movement.unitType}
          </p>
        </div>
        <div>
          <span className="text-muted">{isIncoming ? "From:" : "To:"}</span>
          <p className="font-medium text-text">
            {movement.supplier || movement.recipient || "N/A"}
          </p>
        </div>
        <div>
          <span className="text-muted">Previous Stock:</span>
          <p className="font-medium text-text">
            {movement.previousStock} {movement.unitType}
          </p>
        </div>
        <div>
          <span className="text-muted">New Stock:</span>
          <p className="font-medium text-text">
            {movement.newStock} {movement.unitType}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted border-t border-muted pt-3">
        <div>
          <span>By: {movement.movedByName || "Unknown"}</span>
        </div>
        <div>
          <span>{formatDate(movement.timestamp || movement.createdAt)}</span>
        </div>
      </div>

      {movement.notes && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
          <span className="text-muted">Notes: </span>
          <span className="text-text">{movement.notes}</span>
        </div>
      )}
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, icon, color = "primary" }) => (
  <div className="bg-white rounded-lg shadow-sm border border-muted p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-muted text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </div>
      <div className={`p-3 rounded-full bg-${color} bg-opacity-10`}>{icon}</div>
    </div>
  </div>
);

export const History = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [movementType, setMovementType] = useState("ALL");
  const [dateRange, setDateRange] = useState("7"); // Last 7 days
  const [stats, setStats] = useState({
    totalIn: 0,
    totalOut: 0,
    totalMovements: 0,
  });

  // Get current business ID
  const getCurrentBusinessId = () => {
    return localStorage.getItem("currentBusinessId");
  };

  // Fetch movement history
  const fetchMovements = async () => {
    const businessId = getCurrentBusinessId();
    if (!businessId) {
      setLoading(false);
      return;
    }

    setLoading(true);
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
      if (dateRange !== "ALL") {
        const days = parseInt(dateRange);
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);

        movementsQuery = query(
          movementsQuery,
          where("createdAt", ">=", dateLimit)
        );
      }

      // Order by timestamp descending and limit results
      movementsQuery = query(
        movementsQuery,
        orderBy("createdAt", "desc"),
        limit(50)
      );

      const querySnapshot = await getDocs(movementsQuery);
      const movementsList = [];

      querySnapshot.forEach((doc) => {
        movementsList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setMovements(movementsList);
      calculateStats(movementsList);
    } catch (error) {
      console.error("Error fetching movements:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (movementsList) => {
    const stats = movementsList.reduce(
      (acc, movement) => {
        if (movement.movementType === "IN") {
          acc.totalIn += movement.quantity;
        } else {
          acc.totalOut += movement.quantity;
        }
        acc.totalMovements++;
        return acc;
      },
      { totalIn: 0, totalOut: 0, totalMovements: 0 }
    );

    setStats(stats);
  };

  useEffect(() => {
    fetchMovements();
  }, [selectedItem, movementType, dateRange]);

  // Handle filter reset
  const handleResetFilters = () => {
    setSelectedItem(null);
    setMovementType("ALL");
    setDateRange("7");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text">Movement History</h1>
          <p className="text-muted">
            Track all inventory movements and transactions
          </p>
        </div>
        <button
          onClick={handleResetFilters}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          Reset Filters
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Total Items In"
          value={stats.totalIn.toLocaleString()}
          color="green"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
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
          title="Total Items Out"
          value={stats.totalOut.toLocaleString()}
          color="red"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
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
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-primary"
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
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-muted p-4">
        <h3 className="text-lg font-medium text-text mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <label className="block text-sm font-medium text-muted mb-1">
              Movement Type
            </label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              className="w-full px-3 py-2 border border-muted rounded-lg focus:ring-primary focus:border-primary outline-none"
            >
              <option value="ALL">All Movements</option>
              <option value="IN">Incoming Only</option>
              <option value="OUT">Outgoing Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-muted rounded-lg focus:ring-primary focus:border-primary outline-none"
            >
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
              <option value="ALL">All time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Movement History */}
      <div className="bg-white rounded-lg shadow-sm border border-muted p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-text">Recent Movements</h3>
          <span className="text-sm text-muted">
            Showing {movements.length} movements
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : movements.length === 0 ? (
          <div className="text-center py-12">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-muted mx-auto mb-4"
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
            <h3 className="text-lg font-medium text-text mb-2">
              No movements found
            </h3>
            <p className="text-muted">
              No item movements match your current filters. Try adjusting the
              filters or check back later.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {movements.map((movement) => (
              <MovementCard key={movement.id} movement={movement} />
            ))}
          </div>
        )}
      </div>

      {/* Export Options */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-blue-800">
              Export History
            </h3>
            <p className="text-sm text-blue-600">
              Download movement history for reporting
            </p>
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
              Export CSV
            </button>
            <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
              Export PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
