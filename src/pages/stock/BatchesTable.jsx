import React from "react";

// Local formatter functions
const formatNumber = (value, decimals = 2) => {
  const num = Number(value || 0);
  return isNaN(num) ? "0.00" : num.toFixed(decimals);
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  })
    .format(amount)
    .replace("LKR", "Rs.");
};

const formatDate = (date) => {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatProductType = (type, riceType = null) => {
  if (type === "rice" && riceType) {
    return `Rice (${riceType})`;
  }

  const typeMap = {
    rice: "Rice (Hal)",
    hunuSahal: "Hunu Sahal",
    kadunuSahal: "Kadunu Sahal",
    ricePolish: "Rice Polish",
    dahaiyya: "Dahaiyya",
    flour: "Flour",
  };
  return typeMap[type] || type;
};

const BatchesTable = ({
  batches,
  loading,
  sortField,
  sortDirection,
  expandedRows,
  handleSortChange,
  toggleRowExpand,
  openBagCreationModal,
  canCreateBags,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 sm:p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400"
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
        </div>
        <h3 className="mt-2 text-lg font-medium text-gray-900">
          No processed batches found
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Process some paddy stock to see batches here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200/50">
          <thead className="bg-gray-50/80 backdrop-blur-lg sticky top-0">
            <tr>
              <th className="w-8 sm:w-10 px-2 sm:px-4 py-3"></th>
              <th
                scope="col"
                className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSortChange("batchNumber")}
              >
                <div className="flex items-center">
                  <span className="hidden sm:inline">Batch Number</span>
                  <span className="sm:hidden">Batch</span>
                  {sortField === "batchNumber" && (
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
                className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hidden sm:table-cell"
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
                className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell"
              >
                Paddy Type
              </th>
              <th
                scope="col"
                className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <span className="hidden sm:inline">Total Quantity</span>
                <span className="sm:hidden">Qty</span>
              </th>
              <th
                scope="col"
                className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Price/kg
              </th>
            </tr>
          </thead>
          <tbody className="bg-white/60 backdrop-blur-lg divide-y divide-gray-200/50">
            {batches.map((batch) => (
              <React.Fragment key={batch.id}>
                <tr className="hover:bg-blue-50/60 transition-colors">
                  <td className="px-2 sm:px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => toggleRowExpand(batch.id)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors p-1 rounded-lg hover:bg-white/50"
                    >
                      {expandedRows[batch.id] ? (
                        <svg
                          className="h-4 w-4"
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
                          className="h-4 w-4"
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
                  <td className="px-2 sm:px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {batch.batchNumber}
                    </div>
                    {batch.buyerName && (
                      <div className="text-xs text-gray-500 truncate max-w-24 sm:max-w-none">
                        {batch.buyerName}
                      </div>
                    )}
                  </td>
                  <td className="px-2 sm:px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                    <div className="text-sm text-gray-900">
                      {formatDate(batch.createdAt)}
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-3 whitespace-nowrap hidden md:table-cell">
                    <div className="text-sm text-gray-900">
                      {batch.originalPaddyType || "—"}
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-semibold">
                      {formatNumber(batch.totalQuantity)} kg
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-3 whitespace-nowrap">
                    {batch.pricingData?.recommendedSellingPrice && (
                      <div className="text-sm text-gray-900 font-semibold">
                        {formatCurrency(
                          batch.pricingData.recommendedSellingPrice
                        )}
                      </div>
                    )}
                  </td>
                </tr>
                {expandedRows[batch.id] && (
                  <tr className="bg-blue-50/60 backdrop-blur-lg">
                    <td className="px-2 sm:px-4 py-3"></td>
                    <td colSpan="5" className="px-2 sm:px-4 py-3">
                      <div className="space-y-3 sm:space-y-4">
                        {/* Products in this batch */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">
                            Products in this Batch
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {batch.products &&
                              Object.entries(batch.products).map(
                                ([productType, quantity]) => {
                                  if (quantity <= 0) return null;
                                  return (
                                    <div
                                      key={productType}
                                      className="bg-white/80 backdrop-blur-lg p-3 rounded-xl border border-white/30 shadow-sm"
                                    >
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-900 truncate">
                                          {formatProductType(productType)}
                                        </span>
                                        <span className="text-sm font-bold text-blue-600 ml-2">
                                          {formatNumber(quantity)} kg
                                        </span>
                                      </div>
                                      {canCreateBags(productType) && (
                                        <button
                                          onClick={() =>
                                            openBagCreationModal(
                                              productType,
                                              batch.id
                                            )
                                          }
                                          className="w-full text-xs text-green-600 hover:text-green-700 bg-green-50/80 hover:bg-green-100/80 py-1.5 rounded-lg transition-colors backdrop-blur-sm"
                                        >
                                          📦 Create Bags
                                        </button>
                                      )}
                                    </div>
                                  );
                                }
                              )}
                          </div>
                        </div>

                        {/* Pricing information */}
                        {batch.pricingData && (
                          <div className="bg-white/80 backdrop-blur-lg p-3 rounded-xl border border-white/30 shadow-sm">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">
                              Pricing Information
                            </h4>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                              <div>
                                <span className="text-gray-500 block">
                                  Cost per kg:
                                </span>
                                <p className="font-semibold text-gray-900">
                                  {formatCurrency(
                                    batch.pricingData.adjustedRicePrice
                                  )}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500 block">
                                  Recommended selling:
                                </span>
                                <p className="font-semibold text-green-600">
                                  {formatCurrency(
                                    batch.pricingData.recommendedSellingPrice
                                  )}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500 block">
                                  Profit margin:
                                </span>
                                <p className="font-semibold text-blue-600">
                                  {batch.pricingData.profitPercentage || 0}%
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500 block">
                                  Byproduct revenue:
                                </span>
                                <p className="font-semibold text-purple-600">
                                  {formatCurrency(
                                    batch.pricingData.profitFromByproducts
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
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
  );
};

export default BatchesTable;
