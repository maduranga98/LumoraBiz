import React from "react";
import { Package, TrendingUp, DollarSign } from "lucide-react";

const LoadingSummary = ({
  totalSelectedBags,
  totalSelectedWeight,
  grandTotal,
  isProcessingLoading,
  onClearAll,
  onCreateLoading,
  canCreateLoading,
  formatNumber,
  formatCurrency,
}) => {
  return (
    <div className="bg-white shadow-sm rounded-xl p-4 md:p-6 border border-gray-200">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Loading Summary
          </h3>
          <div className="text-sm text-gray-600 mt-1 space-y-1">
            <p className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Bags: {totalSelectedBags} bags
            </p>
            <p className="flex items-center gap-2">
              <span className="h-4 w-4 bg-blue-100 rounded flex items-center justify-center text-xs font-bold text-blue-600">
                kg
              </span>
              Total Weight: {formatNumber(totalSelectedWeight)} kg
            </p>
            <p className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Value: {formatCurrency(grandTotal)}
            </p>
          </div>
        </div>
        <div className="text-center lg:text-right">
          <div className="text-2xl font-bold text-gray-900">
            {totalSelectedBags} bags
          </div>
          <p className="text-sm text-gray-600">Selected for Loading</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
        <button
          onClick={onClearAll}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 order-2 sm:order-1 transition-colors"
          disabled={isProcessingLoading}
        >
          Clear All
        </button>
        <button
          onClick={onCreateLoading}
          disabled={!canCreateLoading || isProcessingLoading}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2 transition-colors flex items-center justify-center gap-2"
        >
          {isProcessingLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Creating Loading...
            </>
          ) : (
            <>
              <Package className="h-4 w-4" />
              Create Loading
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default LoadingSummary;
