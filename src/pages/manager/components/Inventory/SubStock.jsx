import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { SubItemsDropdown } from "./ManagerSubItemDropDown";
import { db } from "../../../../services/firebase";
import { useAuth } from "../../../../contexts/AuthContext";
import { useBusiness } from "../../../../contexts/ManagerBusinessContext";
import { toast } from "react-hot-toast";

// Compact Stock Row Component
const StockRow = ({ stock, item, index }) => {
  const isLowStock =
    item?.minStockLevel && stock.currentStock <= item.minStockLevel;
  const isCriticalStock =
    stock.currentStock <= (item?.minStockLevel || 0) * 0.5;

  const getStatusColor = () => {
    if (isCriticalStock) return "bg-red-100 text-red-800";
    if (isLowStock) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  const getStatusText = () => {
    if (isCriticalStock) return "Critical";
    if (isLowStock) return "Low";
    return "Good";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <tr
      className={`${
        index % 2 === 0 ? "bg-white" : "bg-gray-50"
      } hover:bg-blue-50 transition-colors`}
    >
      <td className="px-3 py-3 text-sm">
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isCriticalStock
                ? "bg-red-500"
                : isLowStock
                ? "bg-yellow-500"
                : "bg-green-500"
            }`}
          ></div>
          <div>
            <div className="font-medium text-gray-900">{stock.itemName}</div>
            <div className="text-xs text-gray-500">
              {item?.category || "Unknown"}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-sm text-center">
        <span
          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor()}`}
        >
          {getStatusText()}
        </span>
      </td>
      <td className="px-3 py-3 text-sm text-right">
        <div className="font-medium text-gray-900">
          {stock.currentStock.toFixed(1)} {stock.unitType}
        </div>
      </td>
      <td className="px-3 py-3 text-sm text-right">
        {item?.minStockLevel ? (
          <div className="text-gray-700">
            {item.minStockLevel} {stock.unitType}
          </div>
        ) : (
          <div className="text-gray-400">Not set</div>
        )}
      </td>
      <td className="px-3 py-3 text-sm text-right">
        <div className="font-medium text-gray-900">
          {formatCurrency(stock.totalValue)}
        </div>
      </td>
      <td className="px-3 py-3 text-sm">
        {stock.lastMovement ? (
          <div>
            <div
              className={`text-xs font-medium ${
                stock.lastMovement.type === "IN"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {stock.lastMovement.type} - {stock.lastMovement.quantity}
            </div>
            <div className="text-xs text-gray-500">
              {stock.lastMovement.date}
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-400">No movements</div>
        )}
      </td>
      <td className="px-3 py-3 text-sm text-center">
        {item?.itemsPerPack || 1}
      </td>
      <td className="px-3 py-3 text-sm">
        <div className="text-xs">
          <div className="text-green-600">
            +{stock.totalAdded?.toFixed(1) || 0}
          </div>
          <div className="text-red-600">
            -{stock.totalRemoved?.toFixed(1) || 0}
          </div>
        </div>
      </td>
    </tr>
  );
};

// Compact Summary Stats Component
const CompactStockSummary = ({ stocks, items }) => {
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-xs font-medium">Total Items</p>
            <p className="text-xl font-bold text-gray-900">{totalItems}</p>
          </div>
          <div className="p-2 rounded-full bg-blue-100">
            <svg
              className="h-4 w-4 text-blue-600"
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-xs font-medium">Low Stock</p>
            <p className="text-xl font-bold text-yellow-600">{lowStockItems}</p>
          </div>
          <div className="p-2 rounded-full bg-yellow-100">
            <svg
              className="h-4 w-4 text-yellow-600"
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-xs font-medium">Critical Stock</p>
            <p className="text-xl font-bold text-red-600">
              {criticalStockItems}
            </p>
          </div>
          <div className="p-2 rounded-full bg-red-100">
            <svg
              className="h-4 w-4 text-red-600"
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-xs font-medium">Total Value</p>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(totalValue)}
            </p>
            <p className="text-xs text-gray-500">
              {totalQuantity.toFixed(1)} units
            </p>
          </div>
          <div className="p-2 rounded-full bg-green-100">
            <svg
              className="h-4 w-4 text-green-600"
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
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();
  const [stocks, setStocks] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterCategory, setFilterCategory] = useState("All");
  const [sortBy, setSortBy] = useState("name");

  // Calculate current stock from movements
  const calculateStockFromMovements = (movements, itemDetails) => {
    console.log("Processing movements:", movements.length);
    const stockData = {};

    movements.forEach((movement) => {
      const {
        itemId,
        itemName,
        unitType,
        totalQuantity,
        quantity,
        unitPrice,
        total,
        movementType,
      } = movement;

      const qty = totalQuantity || quantity || 0;
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

      stock.movements.push({
        ...movement,
        date: movement.createdAt?.toDate?.()?.toLocaleDateString() || "Unknown",
      });

      if (type === "IN") {
        stock.currentStock += qty;
        stock.totalValue += total || qty * unitPrice || 0;
        stock.totalAdded += qty;
      } else if (type === "OUT") {
        stock.currentStock -= qty;
        stock.totalValue -= total || qty * unitPrice || 0;
        stock.totalRemoved += qty;
      }

      if (
        !stock.lastMovement ||
        movement.createdAt?.toDate?.() > new Date(stock.lastMovement.date)
      ) {
        stock.lastMovement = {
          type: type,
          quantity: qty,
          date:
            movement.createdAt?.toDate?.()?.toLocaleDateString() || "Unknown",
        };
      }
    });

    return Object.values(stockData);
  };

  // Fetch current stock data
  const fetchStocks = async () => {
    const businessId = currentBusiness?.id;
    const ownerId = currentUser?.ownerId;

    if (!businessId || !ownerId) {
      setLoading(false);
      return;
    }

    try {
      console.log("Fetching data for business:", businessId, "owner:", ownerId);

      const stockCollectionPath = `owners/${ownerId}/businesses/${businessId}/stock/materialStock/stock`;
      const movementsCollectionPath = `owners/${ownerId}/businesses/${businessId}/stock/materialStock/movements`;

      // Fetch IN movements (stock additions)
      const stockQuery = query(
        collection(db, stockCollectionPath),
        orderBy("createdAt", "desc")
      );

      const stockSnapshot = await getDocs(stockQuery);
      const stockMovements = [];

      stockSnapshot.forEach((doc) => {
        stockMovements.push({
          id: doc.id,
          movementType: "IN",
          ...doc.data(),
        });
      });

      // Fetch OUT movements
      const movementsQuery = query(
        collection(db, movementsCollectionPath),
        where("movementType", "==", "OUT"),
        orderBy("createdAt", "desc")
      );

      const movementsSnapshot = await getDocs(movementsQuery);
      const outMovements = [];

      movementsSnapshot.forEach((doc) => {
        outMovements.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      const allMovements = [...stockMovements, ...outMovements];

      // Fetch item details
      const itemsCollectionPath = `owners/${ownerId}/businesses/${businessId}/items`;
      const itemQuery = query(
        collection(db, itemsCollectionPath),
        orderBy("itemName")
      );

      const itemSnapshot = await getDocs(itemQuery);
      const itemList = [];
      const itemDetails = {};

      itemSnapshot.forEach((doc) => {
        const itemData = { id: doc.id, ...doc.data() };
        itemList.push(itemData);
        itemDetails[doc.id] = itemData;
      });

      const calculatedStocks = calculateStockFromMovements(
        allMovements,
        itemDetails
      );

      setStocks(calculatedStocks);
      setItems(itemList);

      // Fixed: Use toast() instead of toast.info()
      if (calculatedStocks.length === 0 && allMovements.length === 0) {
        toast("No inventory movements found. Add items to see stock levels.", {
          icon: "ℹ️",
          duration: 4000,
        });
      }
    } catch (error) {
      console.error("Error fetching stock data:", error);
      if (error.code === "permission-denied") {
        toast.error("Permission denied. Please check your access rights.");
      } else if (error.code === "failed-precondition") {
        toast.error(
          "Database index required. Please check console for details."
        );
      } else {
        toast.error("Failed to fetch stock data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && currentBusiness) {
      fetchStocks();
    }
  }, [currentUser, currentBusiness]);

  // Filter and sort stocks
  const getFilteredAndSortedStocks = () => {
    let filtered = stocks;

    if (selectedItem) {
      filtered = filtered.filter((stock) => stock.itemId === selectedItem.id);
    }

    if (filterCategory !== "All") {
      filtered = filtered.filter((stock) => {
        const item = items.find((i) => i.id === stock.itemId);
        return item?.category === filterCategory;
      });
    }

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

  const getStockPriority = (stock, item) => {
    if (stock.currentStock <= (item?.minStockLevel || 0) * 0.5) return 3;
    if (item?.minStockLevel && stock.currentStock <= item.minStockLevel)
      return 2;
    return 1;
  };

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
    <div className="space-y-4">
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
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          <svg
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
          <span>{loading ? "Loading..." : "Refresh"}</span>
        </button>
      </div>

      {/* Compact Summary Stats */}
      <CompactStockSummary stocks={stocks} items={items} />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            >
              <option value="name">Item Name</option>
              <option value="stock">Stock Quantity</option>
              <option value="status">Stock Status</option>
            </select>
          </div>
        </div>

        {(selectedItem || filterCategory !== "All") && (
          <div className="mt-3 flex items-center space-x-2">
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

      {/* Stock Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Stock Overview</h3>
          <span className="text-sm text-gray-500">
            Showing {filteredStocks.length} items
          </span>
        </div>

        {filteredStocks.length === 0 ? (
          <div className="text-center py-12">
            <svg
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
            <div className="text-gray-600 space-y-2">
              {selectedItem || filterCategory !== "All" ? (
                <div>
                  <p>No items match your current filters.</p>
                  <button
                    onClick={() => {
                      setSelectedItem(null);
                      setFilterCategory("All");
                    }}
                    className="text-blue-600 hover:text-blue-800 font-medium mt-2"
                  >
                    Clear filters to see all items
                  </button>
                </div>
              ) : stocks.length === 0 ? (
                <div>
                  <p>No inventory movements found.</p>
                  <p className="text-sm">
                    Start adding items to see stock levels.
                  </p>
                </div>
              ) : (
                <p>All items are currently out of stock.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Min Level
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Value
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Movement
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pack Size
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    +/-
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStocks.map((stock, index) => {
                  const item = items.find((i) => i.id === stock.itemId);
                  return (
                    <StockRow
                      key={stock.itemId}
                      stock={stock}
                      item={item}
                      index={index}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
