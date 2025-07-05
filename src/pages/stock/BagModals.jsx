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

// Glass Modal Component
const GlassModal = ({
  show,
  onClose,
  title,
  children,
  maxWidth = "max-w-md",
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
      <div
        className={`bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 ${maxWidth} w-full max-h-[90vh] overflow-hidden`}
      >
        <div className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-white/20 p-4 sm:p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-white/50"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

const BagModals = ({
  // Bag Size Modal
  showBagSizeModal,
  setShowBagSizeModal,
  bagSizes,
  newBagSize,
  setNewBagSize,
  addBagSize,
  removeBagSize,

  // Bag Creation Modal
  showBagCreationModal,
  setShowBagCreationModal,
  bagCreationData,
  setBagCreationData,
  batches,
  createBags,
  isCreatingBags,

  // Bag Sell Modal
  showIndividualBagSellModal,
  setShowIndividualBagSellModal,
  selectedBag,
  setSelectedBag,
  individualBagSellData,
  setIndividualBagSellData,
  handleIndividualBagSale,

  // Bag Details Modal
  showBagDetailsModal,
  setShowBagDetailsModal,
  viewBagDetails,
  sellIndividualBag,
}) => {
  return (
    <>
      {/* Enhanced Bag Size Management Modal */}
      <GlassModal
        show={showBagSizeModal}
        onClose={() => setShowBagSizeModal(false)}
        title="Manage Bag Sizes"
        maxWidth="max-w-lg"
      >
        {/* Add new bag size */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add New Bag Size
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.1"
              min="0.1"
              placeholder="Bag size (kg)"
              value={newBagSize}
              onChange={(e) => setNewBagSize(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  addBagSize();
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white/80 backdrop-blur-sm"
            />
            <button
              onClick={addBagSize}
              disabled={!newBagSize || parseFloat(newBagSize) <= 0}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm transition-all duration-200"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Enter bag size in kilograms (e.g., 1, 2.5, 10, 25, 50)
          </p>
        </div>

        {/* Current bag sizes */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Current Bag Sizes ({bagSizes.length})
          </h3>

          {bagSizes.length === 0 ? (
            <div className="bg-gray-50/80 backdrop-blur-lg border border-gray-200/50 rounded-xl p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-gray-400"
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
              <p className="text-sm text-gray-500 mb-1">
                No bag sizes added yet
              </p>
              <p className="text-xs text-gray-400">
                Add your first bag size above to start creating bags
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {bagSizes.map((size) => (
                <div
                  key={size}
                  className="flex justify-between items-center p-3 bg-gray-50/80 backdrop-blur-lg rounded-xl border border-gray-200/50 hover:bg-gray-100/80 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {size} kg
                  </span>
                  <button
                    onClick={() => removeBagSize(size)}
                    className="text-red-600 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50/80 transition-colors"
                    title="Remove this bag size"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Common bag sizes suggestion */}
        {bagSizes.length === 0 && (
          <div className="mt-6 p-4 bg-blue-50/80 backdrop-blur-lg border border-blue-200/50 rounded-xl">
            <p className="text-xs font-medium text-blue-800 mb-3">
              Suggested common bag sizes:
            </p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 5, 10, 20, 25, 50].map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    setNewBagSize(size.toString());
                    setTimeout(addBagSize, 100);
                  }}
                  className="text-xs bg-blue-100/80 hover:bg-blue-200/80 text-blue-700 px-3 py-1.5 rounded-lg transition-colors backdrop-blur-sm"
                >
                  {size}kg
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200/50">
          <button
            onClick={() => setShowBagSizeModal(false)}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100/80 hover:bg-gray-200/80 rounded-xl transition-colors backdrop-blur-sm"
          >
            Done
          </button>
        </div>
      </GlassModal>

      {/* Enhanced Bag Creation Modal */}
      <GlassModal
        show={showBagCreationModal}
        onClose={() => {
          setShowBagCreationModal(false);
          setBagCreationData({
            sizeKg: "",
            quantity: "",
            productType: "",
            batchId: "",
          });
        }}
        title={`Create ${formatProductType(bagCreationData.productType)} Bags`}
        maxWidth="max-w-lg"
      >
        {/* Available stock info */}
        {(() => {
          const batch = batches.find((b) => b.id === bagCreationData.batchId);
          const availableQuantity =
            batch?.products[bagCreationData.productType] || 0;
          return (
            <div className="bg-blue-50/80 backdrop-blur-lg border border-blue-200/50 rounded-xl p-3 mb-4">
              <p className="text-sm text-blue-800">
                Available {formatProductType(bagCreationData.productType)} in
                batch:{" "}
                <span className="font-semibold">
                  {formatNumber(availableQuantity)} kg
                </span>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Batch: {batch?.batchNumber}
              </p>
            </div>
          );
        })()}

        <div className="space-y-4">
          {/* Check if bag sizes exist */}
          {bagSizes.length === 0 ? (
            <div className="bg-yellow-50/80 backdrop-blur-lg border border-yellow-200/50 rounded-xl p-4 mb-4">
              <div className="flex items-start">
                <div className="w-6 h-6 text-yellow-600 mt-0.5 mr-3 flex-shrink-0">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 15c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    No Bag Sizes Available
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    You need to add bag sizes first before creating bags.
                  </p>
                  <button
                    onClick={() => {
                      setShowBagCreationModal(false);
                      setShowBagSizeModal(true);
                    }}
                    className="mt-3 text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Add Bag Sizes
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Bag size selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bag Size *
                </label>
                <select
                  value={bagCreationData.sizeKg}
                  onChange={(e) =>
                    setBagCreationData((prev) => ({
                      ...prev,
                      sizeKg: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white/80 backdrop-blur-sm"
                >
                  <option value="">Select bag size</option>
                  {bagSizes.map((size) => (
                    <option key={size} value={size}>
                      {size} kg
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Don't see your size?{" "}
                  <button
                    onClick={() => {
                      setShowBagCreationModal(false);
                      setShowBagSizeModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    Add new size
                  </button>
                </p>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Bags *
                </label>
                <input
                  type="number"
                  min="1"
                  value={bagCreationData.quantity}
                  onChange={(e) =>
                    setBagCreationData((prev) => ({
                      ...prev,
                      quantity: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white/80 backdrop-blur-sm"
                  placeholder="Enter number of bags"
                />
              </div>

              {/* Total weight calculation */}
              {bagCreationData.sizeKg && bagCreationData.quantity && (
                <div className="bg-green-50/80 backdrop-blur-lg border border-green-200/50 rounded-xl p-3">
                  <p className="text-sm text-green-800">
                    Total weight:{" "}
                    <span className="font-semibold">
                      {formatNumber(
                        parseFloat(bagCreationData.sizeKg) *
                          parseInt(bagCreationData.quantity)
                      )}{" "}
                      kg
                    </span>
                  </p>
                </div>
              )}
            </>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => {
                setShowBagCreationModal(false);
                setBagCreationData({
                  sizeKg: "",
                  quantity: "",
                  productType: "",
                  batchId: "",
                });
              }}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white/80 border border-gray-300/50 rounded-xl hover:bg-gray-50/80 backdrop-blur-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={createBags}
              disabled={
                isCreatingBags ||
                !bagCreationData.sizeKg ||
                !bagCreationData.quantity ||
                bagSizes.length === 0
              }
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 border border-transparent rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isCreatingBags ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Creating...
                </div>
              ) : (
                "Create Bags"
              )}
            </button>
          </div>
        </div>
      </GlassModal>

      {/* Enhanced Individual Bag Sell Modal */}
      <GlassModal
        show={showIndividualBagSellModal}
        onClose={() => {
          setShowIndividualBagSellModal(false);
          setSelectedBag(null);
        }}
        title={`Sell ${selectedBag ? selectedBag.itemName : ""} Bags`}
        maxWidth="max-w-lg"
      >
        {selectedBag && (
          <>
            {/* Bag info */}
            <div className="bg-blue-50/80 backdrop-blur-lg border border-blue-200/50 rounded-xl p-3 mb-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-blue-800">Item:</span>
                  <p className="text-blue-700">{selectedBag.itemName}</p>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Available:</span>
                  <p className="text-blue-700">{selectedBag.quantity} bags</p>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Bag Size:</span>
                  <p className="text-blue-700">{selectedBag.bagSize} kg</p>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Cost/kg:</span>
                  <p className="text-blue-700">
                    {formatCurrency(selectedBag.pricePerKg)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Customer name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={individualBagSellData.customerName}
                  onChange={(e) =>
                    setIndividualBagSellData((prev) => ({
                      ...prev,
                      customerName: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white/80 backdrop-blur-sm"
                  placeholder="Enter customer name"
                />
              </div>

              {/* Customer phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Phone
                </label>
                <input
                  type="tel"
                  value={individualBagSellData.customerPhone}
                  onChange={(e) =>
                    setIndividualBagSellData((prev) => ({
                      ...prev,
                      customerPhone: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white/80 backdrop-blur-sm"
                  placeholder="Enter phone number"
                />
              </div>

              {/* Quantity to sell */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity to Sell *
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedBag.quantity}
                  value={individualBagSellData.quantityToSell}
                  onChange={(e) =>
                    setIndividualBagSellData((prev) => ({
                      ...prev,
                      quantityToSell: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="w-full px-3 py-2.5 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white/80 backdrop-blur-sm"
                  placeholder="Number of bags to sell"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available: {selectedBag.quantity} bags
                </p>
              </div>

              {/* Selling price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selling Price per kg *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={individualBagSellData.sellingPrice}
                  onChange={(e) =>
                    setIndividualBagSellData((prev) => ({
                      ...prev,
                      sellingPrice: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2.5 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white/80 backdrop-blur-sm"
                  placeholder="Enter selling price"
                />
              </div>

              {/* Total amount calculation */}
              {individualBagSellData.sellingPrice > 0 &&
                individualBagSellData.quantityToSell > 0 && (
                  <div className="bg-green-50/80 backdrop-blur-lg border border-green-200/50 rounded-xl p-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-green-700">Total amount:</span>
                        <p className="font-semibold text-green-800">
                          {formatCurrency(
                            individualBagSellData.sellingPrice *
                              selectedBag.bagSize *
                              individualBagSellData.quantityToSell
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-green-700">Profit:</span>
                        <p className="font-semibold text-green-800">
                          {formatCurrency(
                            (individualBagSellData.sellingPrice -
                              selectedBag.pricePerKg) *
                              selectedBag.bagSize *
                              individualBagSellData.quantityToSell
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={individualBagSellData.notes}
                  onChange={(e) =>
                    setIndividualBagSellData((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white/80 backdrop-blur-sm resize-none"
                  placeholder="Additional notes (optional)"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowIndividualBagSellModal(false);
                    setSelectedBag(null);
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white/80 border border-gray-300/50 rounded-xl hover:bg-gray-50/80 backdrop-blur-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleIndividualBagSale}
                  disabled={
                    !individualBagSellData.customerName.trim() ||
                    !individualBagSellData.sellingPrice ||
                    individualBagSellData.sellingPrice <= 0 ||
                    !individualBagSellData.quantityToSell ||
                    individualBagSellData.quantityToSell <= 0 ||
                    individualBagSellData.quantityToSell > selectedBag.quantity
                  }
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 border border-transparent rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Sell Bags
                </button>
              </div>
            </div>
          </>
        )}
      </GlassModal>

      {/* Bag Details Modal */}
      <GlassModal
        show={showBagDetailsModal}
        onClose={() => {
          setShowBagDetailsModal(false);
          setSelectedBag(null);
        }}
        title="Bag Details"
        maxWidth="max-w-lg"
      >
        {selectedBag && (
          <div className="space-y-4">
            <div className="bg-blue-50/80 backdrop-blur-lg border border-blue-200/50 rounded-xl p-4">
              <h4 className="font-medium text-blue-900 mb-3">
                Item Information
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Item Name:</span>
                  <p className="text-blue-800">{selectedBag.itemName}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">
                    Product Type:
                  </span>
                  <p className="text-blue-800">
                    {formatProductType(
                      selectedBag.productType,
                      selectedBag.riceType
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Bag Size:</span>
                  <p className="text-blue-800">{selectedBag.bagSize} kg</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">
                    Available Quantity:
                  </span>
                  <p className="text-blue-800">{selectedBag.quantity} bags</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">
                    Total Weight:
                  </span>
                  <p className="text-blue-800">
                    {formatNumber(selectedBag.totalWeight)} kg
                  </p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Status:</span>
                  <p className="text-blue-800 capitalize">
                    {selectedBag.status}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50/80 backdrop-blur-lg border border-green-200/50 rounded-xl p-4">
              <h4 className="font-medium text-green-900 mb-3">
                Pricing Information
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-green-700 font-medium">
                    Cost per kg:
                  </span>
                  <p className="text-green-800">
                    {formatCurrency(selectedBag.pricePerKg)}
                  </p>
                </div>
                <div>
                  <span className="text-green-700 font-medium">
                    Recommended Price:
                  </span>
                  <p className="text-green-800">
                    {formatCurrency(selectedBag.recommendedSellingPrice)}
                  </p>
                </div>
                <div>
                  <span className="text-green-700 font-medium">
                    Total Cost:
                  </span>
                  <p className="text-green-800">
                    {formatCurrency(
                      selectedBag.pricePerKg * selectedBag.totalWeight
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-green-700 font-medium">
                    Potential Revenue:
                  </span>
                  <p className="text-green-800">
                    {formatCurrency(
                      selectedBag.recommendedSellingPrice *
                        selectedBag.totalWeight
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50/80 backdrop-blur-lg border border-gray-200/50 rounded-xl p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                Source Information
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-700 font-medium">
                    Source Batch:
                  </span>
                  <p className="text-gray-800">
                    {selectedBag.sourceBatchNumber}
                  </p>
                </div>
                <div>
                  <span className="text-gray-700 font-medium">
                    Original Paddy Type:
                  </span>
                  <p className="text-gray-800">
                    {selectedBag.originalPaddyType || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-700 font-medium">
                    Created Date:
                  </span>
                  <p className="text-gray-800">
                    {formatDate(selectedBag.createdAt)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-700 font-medium">
                    Last Updated:
                  </span>
                  <p className="text-gray-800">
                    {formatDate(selectedBag.updatedAt)}
                  </p>
                </div>
              </div>
            </div>

            {selectedBag.batchInfo && (
              <div className="bg-purple-50/80 backdrop-blur-lg border border-purple-200/50 rounded-xl p-4">
                <h4 className="font-medium text-purple-900 mb-3">
                  Batch Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-purple-700 font-medium">
                      Buyer Name:
                    </span>
                    <p className="text-purple-800">
                      {selectedBag.batchInfo.buyerName || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-purple-700 font-medium">
                      Original Quantity:
                    </span>
                    <p className="text-purple-800">
                      {formatNumber(selectedBag.batchInfo.originalQuantity)} kg
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-purple-700 font-medium">
                      Original Price per kg:
                    </span>
                    <p className="text-purple-800">
                      {formatCurrency(selectedBag.batchInfo.originalPricePerKg)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowBagDetailsModal(false);
                  setSelectedBag(null);
                }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white/80 border border-gray-300/50 rounded-xl hover:bg-gray-50/80 backdrop-blur-sm transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowBagDetailsModal(false);
                  sellIndividualBag(selectedBag);
                }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 border border-transparent rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200"
              >
                Sell This Item
              </button>
            </div>
          </div>
        )}
      </GlassModal>
    </>
  );
};

export default BagModals;
