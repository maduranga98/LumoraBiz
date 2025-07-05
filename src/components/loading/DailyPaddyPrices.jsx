import React from "react";
import { DollarSign, TrendingUp } from "lucide-react";

const DailyPaddyPrices = ({
  uniqueProductTypes,
  todayPaddyPrices,
  onPaddyPriceChange,
  formatProductType,
}) => {
  return (
    <div className="bg-white shadow-sm rounded-xl p-4 md:p-6 border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <DollarSign className="h-5 w-5" />
        Today's Paddy Prices
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Enter today's market prices for different paddy types (per kg)
      </p>

      {uniqueProductTypes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {uniqueProductTypes.map((productType) => (
            <div key={productType} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {formatProductType(
                  productType.startsWith("rice_")
                    ? productType
                    : `rice_${productType}`
                )}
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 flex-shrink-0">Rs.</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={todayPaddyPrices[productType] || ""}
                  onChange={(e) =>
                    onPaddyPriceChange(productType, e.target.value)
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
                  placeholder="0.00"
                />
                <span className="text-xs text-gray-500 flex-shrink-0">
                  per kg
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <TrendingUp className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-gray-500">
            No product types available for pricing.
          </p>
        </div>
      )}
    </div>
  );
};

export default DailyPaddyPrices;
