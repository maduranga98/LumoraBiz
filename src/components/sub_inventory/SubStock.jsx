import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
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
    <div className="bg-white rounded-xl shadow-sm border border-muted p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text">{stock.itemName}</h3>
          <p className="text-sm text-muted">
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
        <div className="text-center p-4 bg-primary bg-opacity-5 rounded-lg">
          <p className="text-2xl font-bold text-primary">
            {stock.currentStock}
          </p>
          <p className="text-sm text-muted">{stock.unitType}</p>
          <p className="text-xs text-muted mt-1">Current Stock</p>
        </div>

        {item?.minStockLevel && (
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-lg font-semibold text-gray-700">
              {item.minStockLevel}
            </p>
            <p className="text-sm text-muted">{stock.unitType}</p>
            <p className="text-xs text-muted mt-1">Min Level</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div>
          <span className="text-muted">Unit Type:</span>
          <p className="font-medium text-text">{stock.unitType}</p>
        </div>
        {item?.itemsPerPack && (
          <div>
            <span className="text-muted">Items/Pack:</span>
            <p className="font-medium text-text">{item.itemsPerPack}</p>
          </div>
        )}
        <div>
          <span className="text-muted">Last Updated:</span>
          <p className="font-medium text-text">
            {stock.lastUpdated?.toDate?.()?.toLocaleDateString() || "N/A"}
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
              <span className="text-muted">Type:</span>
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
              <span className="text-muted">Quantity:</span>
              <span className="ml-1 font-medium text-text">
                {stock.lastMovement.quantity}
              </span>
            </div>
            {stock.lastMovement.recipient && (
              <div className="col-span-2">
                <span className="text-muted">
                  {stock.lastMovement.type === "IN" ? "From:" : "To:"}
                </span>
                <span className="ml-1 font-medium text-text">
                  {stock.lastMovement.recipient}
                </span>
              </div>
            )}
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

  const totalValue = stocks.reduce((sum, stock) => sum + stock.currentStock, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg shadow-sm border border-muted p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted text-sm font-medium">Total Items</p>
            <p className="text-2xl font-bold text-text">{totalItems}</p>
          </div>
          <div className="p-3 rounded-full bg-primary bg-opacity-10">
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
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-muted p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted text-sm font-medium">Low Stock</p>
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

      <div className="bg-white rounded-lg shadow-sm border border-muted p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted text-sm font-medium">Critical Stock</p>
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

      <div className="bg-white rounded-lg shadow-sm border border-muted p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted text-sm font-medium">Total Stock Value</p>
            <p className="text-2xl font-bold text-accent">
              {totalValue.toLocaleString()}
            </p>
            <p className="text-xs text-muted">Units</p>
          </div>
          <div className="p-3 rounded-full bg-accent bg-opacity-10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-accent"
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

  // Fetch current stock data
  const fetchStocks = async () => {
    const businessId = getCurrentBusinessId();
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch inventory data
      const stockQuery = query(
        collection(db, "inventory"),
        where("businessId", "==", businessId)
      );

      const stockSnapshot = await getDocs(stockQuery);
      const stockList = [];

      stockSnapshot.forEach((doc) => {
        stockList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // Fetch item details
      const itemQuery = query(
        collection(db, "items"),
        where("businessId", "==", businessId)
      );

      const itemSnapshot = await getDocs(itemQuery);
      const itemList = [];

      itemSnapshot.forEach((doc) => {
        itemList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setStocks(stockList);
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text">Current Stock</h1>
          <p className="text-muted">
            Monitor your inventory levels and stock status
          </p>
        </div>
        <button
          onClick={fetchStocks}
          className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
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
      <div className="bg-white rounded-lg shadow-sm border border-muted p-4">
        <h3 className="text-lg font-medium text-text mb-4">
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
            <label className="block text-sm font-medium text-muted mb-1">
              Filter by Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-muted rounded-lg focus:ring-primary focus:border-primary outline-none"
            >
              {getCategories().map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-muted rounded-lg focus:ring-primary focus:border-primary outline-none"
            >
              <option value="name">Item Name</option>
              <option value="stock">Stock Quantity</option>
              <option value="status">Stock Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stock Grid */}
      {filteredStocks.length === 0 ? (
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
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <h3 className="text-lg font-medium text-text mb-2">
            No stock data found
          </h3>
          <p className="text-muted">
            {selectedItem || filterCategory !== "All"
              ? "No items match your current filters"
              : "Start adding items to your inventory to see stock levels"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStocks.map((stock) => {
            const item = items.find((i) => i.id === stock.itemId);
            return (
              <StockCard
                key={stock.id}
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
