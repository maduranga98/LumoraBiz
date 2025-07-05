import React, { useState } from "react";
import {
  formatNumber,
  formatCurrency,
  formatDate,
  formatProductType,
} from "../../utils/formatters";

const BaggedInventory = ({
  baggedStocks,
  onViewDetails,
  onSellBag,
  loading = false,
}) => {
  const [expandedSections, setExpandedSections] = useState({});

  // Toggle section expansion
  const toggleSection = (sectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Group bags by type for better organization
  const groupBagsByType = (baggedStocks) => {
    const grouped = {};

    Object.entries(baggedStocks).forEach(([productTypeKey, items]) => {
      // Group items by item name and batch for display
      const itemGroups = {};

      items.forEach((item) => {
        const key = `${item.itemName}-${item.sourceBatchNumber}`;
        if (!itemGroups[key]) {
          itemGroups[key] = {
            itemName: item.itemName,
            productType: item.productType,
            riceType: item.riceType,
            bagSize: item.bagSize,
            sourceBatchNumber: item.sourceBatchNumber,
            sourceBatchId: item.sourceBatchId,
            pricePerKg: item.pricePerKg,
            recommendedSellingPrice: item.recommendedSellingPrice,
            originalPaddyType: item.originalPaddyType,
            createdAt: item.createdAt,
            items: [],
            totalQuantity: 0,
            totalWeight: 0,
          };
        }

        itemGroups[key].items.push(item);
        itemGroups[key].totalQuantity += item.quantity || 0;
        itemGroups[key].totalWeight += item.totalWeight || 0;
      });

      grouped[productTypeKey] = Object.values(itemGroups);
    });

    return grouped;
  };

  // Summary calculations
  const calculateSummary = (groupedBags) => {
    let totalItems = 0;
    let totalWeight = 0;
    let totalValue = 0;
    let productCount = 0;

    Object.values(groupedBags).forEach((itemGroups) => {
      productCount++;
      itemGroups.forEach((group) => {
        totalItems += group.totalQuantity;
        totalWeight += group.totalWeight;
        totalValue += group.totalWeight * group.recommendedSellingPrice;
      });
    });

    return {
      totalItems,
      totalWeight,
      totalValue,
      productCount,
    };
  };

  const hasAnyBags = Object.keys(baggedStocks).length > 0;

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (!hasAnyBags) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
          Bagged Stock Inventory
        </h3>
        <div className="text-center py-8 text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <p className="text-sm sm:text-base">No bagged stocks available.</p>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Start by creating some bags from batches!
          </p>
        </div>
      </div>
    );
  }

  const groupedBags = groupBagsByType(baggedStocks);
  const summary = calculateSummary(groupedBags);

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
      {/* Header with Summary */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            Bagged Stock Inventory
          </h3>
          <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-gray-600">
            <span className="bg-blue-50/80 px-2 py-1 rounded-lg">
              {summary.productCount} Product Types
            </span>
            <span className="bg-green-50/80 px-2 py-1 rounded-lg">
              {summary.totalItems} Total Bags
            </span>
            <span className="bg-purple-50/80 px-2 py-1 rounded-lg">
              {formatNumber(summary.totalWeight)} kg Total Weight
            </span>
            <span className="bg-yellow-50/80 px-2 py-1 rounded-lg">
              {formatCurrency(summary.totalValue)} Estimated Value
            </span>
          </div>
        </div>
      </div>

      {/* Product Sections */}
      <div className="space-y-4">
        {Object.entries(groupedBags).map(([productTypeKey, itemGroups]) => {
          let displayName;
          if (productTypeKey.startsWith("rice_")) {
            const riceType = productTypeKey.replace("rice_", "");
            displayName = `Rice (${riceType})`;
          } else {
            displayName = formatProductType(productTypeKey);
          }

          const totalItems = itemGroups.reduce(
            (sum, group) => sum + (group.totalQuantity || 0),
            0
          );
          const totalWeight = itemGroups.reduce(
            (sum, group) => sum + (group.totalWeight || 0),
            0
          );
          const isExpanded = expandedSections[productTypeKey];

          return (
            <div
              key={productTypeKey}
              className="bg-white/60 backdrop-blur-lg rounded-xl border border-white/30 overflow-hidden"
            >
              {/* Section Header */}
              <div
                className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 sm:p-4 cursor-pointer hover:bg-white/40 transition-colors"
                onClick={() => toggleSection(productTypeKey)}
              >
                <div className="flex items-center gap-3">
                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    {isExpanded ? (
                      <svg
                        className="w-5 h-5"
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
                        className="w-5 h-5"
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
                  <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                    {displayName}
                  </h4>
                </div>
                <div className="flex gap-2 mt-2 sm:mt-0">
                  <span className="text-xs sm:text-sm text-gray-500 bg-gray-100/80 px-2 py-1 rounded-lg">
                    {totalItems} bags
                  </span>
                  <span className="text-xs sm:text-sm text-gray-500 bg-gray-100/80 px-2 py-1 rounded-lg">
                    {formatNumber(totalWeight)} kg
                  </span>
                </div>
              </div>

              {/* Expandable Content */}
              {isExpanded && (
                <div className="border-t border-white/30">
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50/80 backdrop-blur-lg">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Item Name
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Batch
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Available
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                            Price/kg
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                            Created
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/40 backdrop-blur-lg divide-y divide-gray-200/50">
                        {itemGroups.map((group, index) => (
                          <tr
                            key={index}
                            className="hover:bg-white/60 transition-colors"
                          >
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {group.itemName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {group.bagSize} kg per bag
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {group.sourceBatchNumber}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-1">
                                  {group.totalQuantity} bags
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatNumber(group.totalWeight)} kg total
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {formatCurrency(
                                    group.recommendedSellingPrice
                                  )}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Cost: {formatCurrency(group.pricePerKg)}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                              {formatDate(group.createdAt)}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onViewDetails(group);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50/80 transition-colors"
                                  title="View details"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                    />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSellBag(group.items[0]);
                                  }}
                                  className="text-green-600 hover:text-green-800 p-2 rounded-lg hover:bg-green-50/80 transition-colors"
                                  title="Sell bags"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Actions Footer */}
      <div className="mt-6 pt-4 border-t border-white/30">
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <span>
            💡 Tip: Click on product sections to expand/collapse details
          </span>
        </div>
      </div>
    </div>
  );
};

export default BaggedInventory;
