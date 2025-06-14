import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { SubItemsDropdown } from "./SubItemsDropdown";

// Stock Card Component
const StockCard = ({ stock, item, onRefresh }) => {
  const isLowStock =
    item?.minStockLevel && stock.currentStock <= item.minStockLevel;
  const isCriticalStock =
    stock.currentStock <= (item?.minStockLevel || 0) * 0.5;

  const getStockStatus = () => {
    if (isCriticalStock) return { text: "Critical", color: "red" };
    if (isLowStock) return { text: "Low Stock", color: "yellow" };
    return { text: "Good", color: "green" };
  };

  const status = getStockStatus();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {stock.itemName}
          </h3>
          <p className="text-sm text-gray-600">
            {item?.category || "Unknown Category"}
          </p>
        </div>
        <div className="text-right">
          <span
            className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
              status.color === "green"
                ? "bg-green-100 text-green-800"
                : status.color === "yellow"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {status.text}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">
            {stock.currentStock.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600">{stock.unitType}</p>
          <p className="text-xs text-gray-500 mt-1">Current Stock</p>
        </div>

        {item?.minStockLevel && (
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-lg font-semibold text-gray-700">
              {item.minStockLevel}
            </p>
            <p className="text-sm text-gray-600">{stock.unitType}</p>
            <p className="text-xs text-gray-500 mt-1">Min Level</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div>
          <span className="text-gray-600">Unit Type:</span>
          <p className="font-medium text-gray-900">{stock.unitType}</p>
        </div>
        {item?.itemsPerPack && (
          <div>
            <span className="text-gray-600">Items/Pack:</span>
            <p className="font-medium text-gray-900">{item.itemsPerPack}</p>
          </div>
        )}
        <div>
          <span className="text-gray-600">Total Value:</span>
          <p className="font-medium text-gray-900">
            Rs. {stock.totalValue?.toFixed(2) || "0.00"}
          </p>
        </div>
      </div>

      {stock.lastMovement && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Last Movement
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-600">Type:</span>
              <span
                className={`ml-1 font-medium ${
                  stock.lastMovement.type === "IN"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {stock.lastMovement.type}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Quantity:</span>
              <span className="ml-1 font-medium text-gray-900">
                {stock.lastMovement.quantity}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Date:</span>
              <span className="ml-1 font-medium text-gray-900">
                {stock.lastMovement.date}
              </span>
            </div>
          </div>
        </div>
      )}

      {stock.movements && stock.movements.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-700 mb-2">
            Recent Activity
          </h4>
          <div className="text-xs text-gray-600">
            <span className="font-medium">{stock.movements.length}</span> total
            movements
            <br />
            Total added:{" "}
            <span className="font-medium text-green-600">
              {stock.totalAdded?.toFixed(2) || 0} {stock.unitType}
            </span>
            <br />
            Total removed:{" "}
            <span className="font-medium text-red-600">
              {stock.totalRemoved?.toFixed(2) || 0} {stock.unitType}
            </span>
          </div>
        </div>
      )}

      {(isLowStock || isCriticalStock) && (
        <div
          className={`mt-4 p-3 rounded-lg border ${
            isCriticalStock
              ? "bg-red-50 border-red-200"
              : "bg-yellow-50 border-yellow-200"
          }`}
        >
          <div className="flex items-center space-x-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ${
                isCriticalStock ? "text-red-600" : "text-yellow-600"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p
              className={`text-sm font-medium ${
                isCriticalStock ? "text-red-800" : "text-yellow-800"
              }`}
            >
              {isCriticalStock ? "Critical Stock Level!" : "Low Stock Alert!"}
            </p>
          </div>
          <p
            className={`text-xs mt-1 ${
              isCriticalStock ? "text-red-700" : "text-yellow-700"
            }`}
          >
            Consider restocking this item soon.
          </p>
        </div>
      )}
    </div>
  );
};

// Summary Stats Component
const StockSummary = ({ stocks, items }) => {
  const totalItems = stocks.length;
  const lowStockItems = stocks.filter((stock) => {
    const item = items.find((i) => i.id === stock.itemId);
    return item?.minStockLevel && stock.currentStock <= item.minStockLevel;
  }).length;

  const criticalStockItems = stocks.filter((stock) => {
    const item = items.find((i) => i.id === stock.itemId);
    return stock.currentStock <= (item?.minStockLevel || 0) * 0.5;
  }).length;

  const totalValue = stocks.reduce(
    (sum, stock) => sum + (stock.totalValue || 0),
    0
  );
  const totalQuantity = stocks.reduce(
    (sum, stock) => sum + stock.currentStock,
    0
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">Total Items</p>
            <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
          </div>
          <div className="p-3 rounded-full bg-blue-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">Low Stock</p>
            <p className="text-2xl font-bold text-yellow-600">
              {lowStockItems}
            </p>
          </div>
          <div className="p-3 rounded-full bg-yellow-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">Critical Stock</p>
            <p className="text-2xl font-bold text-red-600">
              {criticalStockItems}
            </p>
          </div>
          <div className="p-3 rounded-full bg-red-100">
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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">Total Value</p>
            <p className="text-2xl font-bold text-green-600">
              Rs. {totalValue.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">
              {totalQuantity.toFixed(2)} total units
            </p>
          </div>
          <div className="p-3 rounded-full bg-green-100">
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
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SubStock = () => {
  const [stocks, setStocks] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterCategory, setFilterCategory] = useState("All");
  const [sortBy, setSortBy] = useState("name"); // name, stock, status

  // Get current business ID
  const getCurrentBusinessId = () => {
    return localStorage.getItem("currentBusinessId");
  };

  // Calculate current stock from movements
  const calculateStockFromMovements = (movements, itemDetails) => {
    console.log("Processing movements:", movements.length);
    const stockData = {};

    movements.forEach((movement) => {
      const {
        itemId,
        itemName,
        unitType,
        quantity,
        unitPrice,
        total,
        movementType,
      } = movement;

      // Default to "IN" if movementType is not specified (for AddItems entries)
      const type = movementType || "IN";

      if (!stockData[itemId]) {
        stockData[itemId] = {
          itemId,
          itemName: itemName || itemDetails[itemId]?.itemName || "Unknown Item",
          unitType: unitType || itemDetails[itemId]?.unitType || "units",
          currentStock: 0,
          totalValue: 0,
          movements: [],
          totalAdded: 0,
          totalRemoved: 0,
          lastMovement: null,
        };
      }

      const stock = stockData[itemId];

      // Add movement to history
      stock.movements.push({
        ...movement,
        date: movement.createdAt?.toDate?.()?.toLocaleDateString() || "Unknown",
      });

      // Calculate stock based on movement type
      if (type === "IN") {
        stock.currentStock += quantity || 0;
        stock.totalValue += total || quantity * unitPrice || 0;
        stock.totalAdded += quantity || 0;
      } else if (type === "OUT") {
        stock.currentStock -= quantity || 0;
        stock.totalValue -= total || quantity * unitPrice || 0;
        stock.totalRemoved += quantity || 0;
      }

      // Update last movement
      if (
        !stock.lastMovement ||
        movement.createdAt?.toDate?.() > new Date(stock.lastMovement.date)
      ) {
        stock.lastMovement = {
          type: type,
          quantity: quantity || 0,
          date:
            movement.createdAt?.toDate?.()?.toLocaleDateString() || "Unknown",
        };
      }
    });

    const result = Object.values(stockData);
    console.log("Calculated stocks:", result);
    return result; // Return all items, not just those with stock > 0
  };

  // Fetch current stock data
  const fetchStocks = async () => {
    const businessId = getCurrentBusinessId();
    if (!businessId) {
      console.log("No business ID found");
      setLoading(false);
      return;
    }

    try {
      console.log("Fetching data for business:", businessId);

      // Fetch item movements - try without orderBy first in case of index issues
      const movementsQuery = query(
        collection(db, "itemMovements"),
        where("businessId", "==", businessId)
      );

      const movementsSnapshot = await getDocs(movementsQuery);
      const movements = [];

      movementsSnapshot.forEach((doc) => {
        movements.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      console.log("Found movements:", movements);

      // Fetch item details
      const itemQuery = query(
        collection(db, "items"),
        where("businessId", "==", businessId)
      );

      const itemSnapshot = await getDocs(itemQuery);
      const itemList = [];
      const itemDetails = {};

      itemSnapshot.forEach((doc) => {
        const itemData = { id: doc.id, ...doc.data() };
        itemList.push(itemData);
        itemDetails[doc.id] = itemData;
      });

      console.log("Found items:", itemList);

      // Calculate current stock from movements
      const calculatedStocks = calculateStockFromMovements(
        movements,
        itemDetails
      );

      setStocks(calculatedStocks);
      setItems(itemList);
    } catch (error) {
      console.error("Error fetching stock data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  // Filter and sort stocks
  const getFilteredAndSortedStocks = () => {
    let filtered = stocks;

    // Filter by selected item
    if (selectedItem) {
      filtered = filtered.filter((stock) => stock.itemId === selectedItem.id);
    }

    // Filter by category
    if (filterCategory !== "All") {
      filtered = filtered.filter((stock) => {
        const item = items.find((i) => i.id === stock.itemId);
        return item?.category === filterCategory;
      });
    }

    // Sort stocks
    filtered.sort((a, b) => {
      const itemA = items.find((i) => i.id === a.itemId);
      const itemB = items.find((i) => i.id === b.itemId);

      switch (sortBy) {
        case "name":
          return (a.itemName || "").localeCompare(b.itemName || "");
        case "stock":
          return b.currentStock - a.currentStock;
        case "status":
          const statusA = getStockPriority(a, itemA);
          const statusB = getStockPriority(b, itemB);
          return statusB - statusA;
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Get stock priority for sorting
  const getStockPriority = (stock, item) => {
    if (stock.currentStock <= (item?.minStockLevel || 0) * 0.5) return 3; // Critical
    if (item?.minStockLevel && stock.currentStock <= item.minStockLevel)
      return 2; // Low
    return 1; // Good
  };

  // Get unique categories
  const getCategories = () => {
    const categories = [...new Set(items.map((item) => item.category))].filter(
      Boolean
    );
    return ["All", ...categories];
  };

  const filteredStocks = getFilteredAndSortedStocks();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Current Stock</h1>
          <p className="text-gray-600">
            Monitor your inventory levels and stock status
          </p>
        </div>
        <button
          onClick={fetchStocks}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Stats */}
      <StockSummary stocks={stocks} items={items} />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Filters & Sorting
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SubItemsDropdown
            selectedItem={selectedItem}
            onItemSelect={setSelectedItem}
            label="Filter by Item"
            placeholder="All items"
            showCategory={false}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {getCategories().map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="name">Item Name</option>
              <option value="stock">Stock Quantity</option>
              <option value="status">Stock Status</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(selectedItem || filterCategory !== "All") && (
          <div className="mt-4 flex items-center space-x-2">
            <button
              onClick={() => {
                setSelectedItem(null);
                setFilterCategory("All");
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear all filters
            </button>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-gray-600">
              Showing {filteredStocks.length} of {stocks.length} items
            </span>
          </div>
        )}
      </div>

      {/* Stock Grid */}
      {filteredStocks.length === 0 ? (
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
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No stock data found
          </h3>
          <p className="text-gray-600 mb-4">
            {selectedItem || filterCategory !== "All"
              ? "No items match your current filters"
              : stocks.length === 0
              ? "No inventory movements found. Start adding items to see stock levels."
              : "All items are currently out of stock."}
          </p>
          {stocks.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 mt-4 max-w-md mx-auto">
              <p className="text-sm text-blue-700">
                <strong>Debug Info:</strong>
                <br />
                Total items in database: {items.length}
                <br />
                Total stock records: {stocks.length}
                <br />
                Filtered results: {filteredStocks.length}
              </p>
              {stocks.length > 0 && (
                <details className="mt-2 text-left">
                  <summary className="text-sm font-medium text-blue-800 cursor-pointer">
                    View stock details
                  </summary>
                  <pre className="text-xs mt-2 bg-white p-2 rounded border overflow-auto">
                    {JSON.stringify(stocks.slice(0, 2), null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
          {(selectedItem || filterCategory !== "All") && (
            <button
              onClick={() => {
                setSelectedItem(null);
                setFilterCategory("All");
              }}
              className="text-blue-600 hover:text-blue-800 font-medium mt-2"
            >
              Clear filters to see all items
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStocks.map((stock) => {
            const item = items.find((i) => i.id === stock.itemId);
            return (
              <StockCard
                key={stock.itemId}
                stock={stock}
                item={item}
                onRefresh={fetchStocks}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
