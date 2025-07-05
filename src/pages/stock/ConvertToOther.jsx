import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import PriceCalculation from "./PriceCalculation";

const ConvertToOtherModal = ({ isOpen, onClose, onSubmit, stock = null }) => {
  const [convertedData, setConvertedData] = useState({
    rice: "",
    hunuSahal: "",
    kadunuSahal: "",
    ricePolish: "",
    dahaiyya: "",
    flour: "",
    startElectricityNumber: "",
    endElectricityNumber: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPriceCalculation, setShowPriceCalculation] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConvertedData({
        rice: "",
        hunuSahal: "",
        kadunuSahal: "",
        ricePolish: "",
        dahaiyya: "",
        flour: "",
        startElectricityNumber: "",
        endElectricityNumber: "",
      });
      setErrors({});
      setShowPriceCalculation(false);
      setSubmittedData(null);
      setCurrentStep(1);
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConvertedData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const getTotalConverted = () => {
    return [
      "rice",
      "hunuSahal",
      "kadunuSahal",
      "ricePolish",
      "dahaiyya",
      "flour",
    ].reduce((total, key) => total + (parseFloat(convertedData[key]) || 0), 0);
  };

  const validateForm = () => {
    const newErrors = {};

    if (getTotalConverted() === 0) {
      newErrors.general = "Please enter at least one product quantity";
    }

    if (!convertedData.startElectricityNumber.trim()) {
      newErrors.startElectricityNumber = "Start electricity number is required";
    }

    if (!convertedData.endElectricityNumber.trim()) {
      newErrors.endElectricityNumber = "End electricity number is required";
    }

    const startNum = parseFloat(convertedData.startElectricityNumber);
    const endNum = parseFloat(convertedData.endElectricityNumber);

    if (!isNaN(startNum) && !isNaN(endNum) && startNum >= endNum) {
      newErrors.endElectricityNumber =
        "End number must be greater than start number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const submissionData = {
        ...convertedData,
        originalStock: {
          stockId: stock?.id,
          buyerId: stock?.buyerId,
          buyerName: stock?.buyerName,
          purchaseId: stock?.purchaseId,
          paymentId: stock?.paymentId,
          originalQuantity: stock?.quantity,
          pricePerKg: stock?.price,
          totalAmount: (stock?.quantity || 0) * (stock?.price || 0),
          paddyType: stock?.paddyTypeName,
        },
        batchNumber: `BATCH_${Date.now()}`,
        electricityConsumption: (() => {
          const start = parseFloat(convertedData.startElectricityNumber);
          const end = parseFloat(convertedData.endElectricityNumber);
          return !isNaN(start) && !isNaN(end) && end > start ? end - start : 0;
        })(),
        totalConverted: getTotalConverted(),
      };

      setSubmittedData(submissionData);
      if (onSubmit) await onSubmit(submissionData);
      setShowPriceCalculation(true);
      toast.success("Conversion data prepared successfully!");
    } catch (error) {
      toast.error("Failed to prepare conversion data");
      setErrors({ general: "Failed to prepare conversion data" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const products = [
    { name: "rice", label: "Rice", icon: "🌾" },
    { name: "flour", label: "Flour", icon: "🌾" },
    { name: "hunuSahal", label: "Hunu Sahal", icon: "🌾" },
    { name: "kadunuSahal", label: "Kadunu Sahal", icon: "🌾" },
    { name: "ricePolish", label: "Rice Polish", icon: "🌾" },
    { name: "dahaiyya", label: "Dahaiyya", icon: "🌾" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">
        {showPriceCalculation && submittedData ? (
          <PriceCalculation
            conversionData={submittedData}
            isModal={true}
            onClose={() => {
              setShowPriceCalculation(false);
              onClose();
            }}
            onBack={() => setShowPriceCalculation(false)}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mr-3">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                    Convert Paddy to Products
                  </h2>
                  <p className="text-sm text-gray-600 hidden sm:block">
                    Transform your raw paddy into processed products
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 min-h-0">
              {/* Stock Info */}
              {stock && (
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center mr-3">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m4-8v2m4-2v2"
                        />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900">
                      Original Stock Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Buyer</p>
                      <p className="font-semibold text-gray-900 text-sm">
                        {stock.buyerName}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Paddy Type</p>
                      <p className="font-semibold text-gray-900 text-sm">
                        {stock.paddyTypeName}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Quantity</p>
                      <p className="font-semibold text-gray-900 text-sm">
                        {stock.quantity} kg
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Price/kg</p>
                      <p className="font-semibold text-gray-900 text-sm">
                        Rs. {stock.price}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Electricity Numbers */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 sm:p-5">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-yellow-600 rounded-lg flex items-center justify-center mr-3">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900">
                    Electricity Meter Readings
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Start Reading <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="startElectricityNumber"
                      value={convertedData.startElectricityNumber}
                      onChange={handleInputChange}
                      placeholder="Enter start reading"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm ${
                        errors.startElectricityNumber
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300 bg-white"
                      }`}
                    />
                    {errors.startElectricityNumber && (
                      <p className="text-sm text-red-600 mt-1 flex items-center">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {errors.startElectricityNumber}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      End Reading <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="endElectricityNumber"
                      value={convertedData.endElectricityNumber}
                      onChange={handleInputChange}
                      placeholder="Enter end reading"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm ${
                        errors.endElectricityNumber
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300 bg-white"
                      }`}
                    />
                    {errors.endElectricityNumber && (
                      <p className="text-sm text-red-600 mt-1 flex items-center">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {errors.endElectricityNumber}
                      </p>
                    )}
                  </div>
                </div>

                {/* Consumption Display */}
                {convertedData.startElectricityNumber &&
                  convertedData.endElectricityNumber && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-yellow-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">
                          Electricity Consumption:
                        </span>
                        <span className="font-bold text-yellow-800">
                          {(() => {
                            const start = parseFloat(
                              convertedData.startElectricityNumber
                            );
                            const end = parseFloat(
                              convertedData.endElectricityNumber
                            );
                            if (!isNaN(start) && !isNaN(end) && end > start) {
                              return `${(end - start).toFixed(2)} kWh`;
                            }
                            return "0.00 kWh";
                          })()}
                        </span>
                      </div>
                    </div>
                  )}
              </div>

              {/* Product Quantities */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 sm:p-5">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                    <svg
                      className="w-5 h-5 text-white"
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
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Converted Products
                    </h3>
                    <p className="text-sm text-gray-600">
                      Enter quantities in kilograms
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map(({ name, label, icon }) => (
                    <div
                      key={name}
                      className="bg-white rounded-lg p-4 border border-green-200"
                    >
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <span className="mr-2">{icon}</span>
                        {label}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          name={name}
                          value={convertedData[name]}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full px-4 py-3 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                          kg
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Display */}
                <div className="mt-4 p-4 bg-white rounded-lg border-2 border-green-300">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      Total Converted
                    </span>
                    <span className="text-xl font-bold text-green-700">
                      {getTotalConverted().toFixed(2)} kg
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-red-500 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm text-red-700 font-medium">
                      {errors.general}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-gray-200 p-4 sm:p-6 bg-gray-50">
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Preparing...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      Calculate Price
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ConvertToOtherModal;
