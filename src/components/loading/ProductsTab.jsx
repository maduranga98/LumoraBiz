import React from "react";
import { Package } from "lucide-react";

const ProductsTable = ({
  groupedProducts,
  selectedProducts,
  onProductChange,
  formatCurrency,
  formatNumber,
  formatProductType,
}) => {
  // Get max available bags for a product
  const getMaxAvailableBags = (uniqueKey) => {
    const productData = groupedProducts[uniqueKey];
    return productData?.totalAvailableBags || 0;
  };

  // Get bag size for selected option
  const getBagSize = (uniqueKey) => {
    const productData = groupedProducts[uniqueKey];
    return productData?.bagSize || 0;
  };

  // Get current price for a product
  const getCurrentPrice = (uniqueKey) => {
    const productData = groupedProducts[uniqueKey];
    return productData?.price || 0;
  };

  // Calculate total weight for a product
  const calculateProductWeight = (uniqueKey) => {
    const selection = selectedProducts[uniqueKey];
    if (!selection || !selection.bagQuantity || selection.bagQuantity === "") {
      return 0;
    }

    const bagSize = getBagSize(uniqueKey);
    const bagQuantity = parseInt(selection.bagQuantity) || 0;

    return bagQuantity * bagSize;
  };

  // Validate bag quantity input
  const isBagQuantityValid = (uniqueKey) => {
    const selection = selectedProducts[uniqueKey];
    if (!selection || !selection.bagQuantity || selection.bagQuantity === "")
      return true;

    const bagQuantity = parseInt(selection.bagQuantity);
    const maxAvailableBags = getMaxAvailableBags(uniqueKey);

    return (
      bagQuantity > 0 && bagQuantity <= maxAvailableBags && !isNaN(bagQuantity)
    );
  };

  if (!groupedProducts || Object.keys(groupedProducts).length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-xl p-8 text-center border border-gray-200">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">
          No bagged stocks available
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Create some bags from processed batches to start preparing loadings.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
      <div className="px-4 md:px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Package className="h-5 w-5" />
          Available Products (Bags)
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Select number of bags to load. Each bag has a specific size and
          weight.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product Name
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Available Quantity
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price/kg
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price/bag
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Required Quantity
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Min Price
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Max Price
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(groupedProducts).map(([uniqueKey, productData]) => {
              const selection = selectedProducts[uniqueKey] || {};
              const maxAvailableBags = getMaxAvailableBags(uniqueKey);
              const currentPricePerKg = getCurrentPrice(uniqueKey);
              const bagSize = getBagSize(uniqueKey);
              const pricePerBag = currentPricePerKg * bagSize;
              const bagQuantityError = !isBagQuantityValid(uniqueKey);
              const selectedWeight = calculateProductWeight(uniqueKey);

              return (
                <tr
                  key={uniqueKey}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Product Name */}
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {productData.itemName ||
                            formatProductType(productData.originalProductType)}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          Batch: {productData.sourceBatchNumber} • {bagSize}kg
                          bags
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Available Quantity */}
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-semibold">
                      {maxAvailableBags} bags
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatNumber(maxAvailableBags * bagSize)} kg total
                    </div>
                  </td>

                  {/* Price per kg */}
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-green-600">
                      {formatCurrency(currentPricePerKg)}
                    </div>
                  </td>

                  {/* Price per bag */}
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-blue-600">
                      {formatCurrency(pricePerBag)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {bagSize}kg × {formatCurrency(currentPricePerKg)}
                    </div>
                  </td>

                  {/* Required Quantity Input */}
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          max={maxAvailableBags}
                          step="1"
                          value={selection.bagQuantity || ""}
                          onChange={(e) =>
                            onProductChange(
                              uniqueKey,
                              "bagQuantity",
                              e.target.value
                            )
                          }
                          className={`w-16 md:w-20 px-2 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors ${
                            bagQuantityError
                              ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                              : "border-gray-300"
                          }`}
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          bags
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Max: {maxAvailableBags}
                      </div>
                      {bagQuantityError && (
                        <div className="text-xs text-red-600">
                          Exceeds available
                        </div>
                      )}
                      {selection.bagQuantity && (
                        <div className="text-xs text-blue-600">
                          = {formatNumber(selectedWeight)} kg
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Min Price Input */}
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          Rs.
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={selection.minPrice || ""}
                          onChange={(e) =>
                            onProductChange(
                              uniqueKey,
                              "minPrice",
                              e.target.value
                            )
                          }
                          className="w-16 md:w-20 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm transition-colors"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="text-xs text-gray-500">per kg</div>
                    </div>
                  </td>

                  {/* Max Price Input */}
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          Rs.
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={selection.maxPrice || ""}
                          onChange={(e) =>
                            onProductChange(
                              uniqueKey,
                              "maxPrice",
                              e.target.value
                            )
                          }
                          className="w-16 md:w-20 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm transition-colors"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="text-xs text-gray-500">per kg</div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductsTable;
