// src/components/modals/ConvertToOtherModal.jsx
import React, { useState } from "react";
import Input from "../../components/Input";

const ConvertToOtherModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    rice: "",
    hunuSahal: "",
    kadunuSahal: "",
    ricePolish: "",
    dahaiyya: "",
    flour: "",
    electricDashboardNumber: "",
  });

  const [loading, setLoading] = useState(false);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert string values to numbers for calculation (except electricDashboardNumber)
      const convertedData = Object.entries(formData).reduce(
        (acc, [key, value]) => {
          if (key === "electricDashboardNumber") {
            acc[key] = value; // Keep as string for dashboard number
          } else {
            acc[key] = parseFloat(value) || 0;
          }
          return acc;
        },
        {}
      );

      await onSubmit(convertedData);

      // Reset form on successful submission
      setFormData({
        rice: "",
        hunuSahal: "",
        kadunuSahal: "",
        ricePolish: "",
        dahaiyya: "",
        flour: "",
        electricDashboardNumber: "",
      });

      onClose();
    } catch (error) {
      console.error("Error submitting conversion data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    setFormData({
      rice: "",
      hunuSahal: "",
      kadunuSahal: "",
      ricePolish: "",
      dahaiyya: "",
      flour: "",
      electricDashboardNumber: "",
    });
    onClose();
  };

  // Calculate total quantity (excluding electric dashboard number)
  const totalQuantity = Object.entries(formData).reduce((sum, [key, value]) => {
    if (key === "electricDashboardNumber") return sum;
    return sum + (parseFloat(value) || 0);
  }, 0);

  // Check if form has required data
  const hasRequiredData =
    totalQuantity > 0 && formData.electricDashboardNumber.trim() !== "";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Convert to Other Products
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Enter the quantities for rice mill by-products and dashboard
                number
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-500 group-hover:text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
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

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Electric Dashboard Number */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <Input
                label="Electric Dashboard Number"
                type="text"
                value={formData.electricDashboardNumber}
                onChange={(e) =>
                  handleInputChange("electricDashboardNumber", e.target.value)
                }
                placeholder="Enter dashboard number"
                className="bg-white"
                required
              />
            </div>

            {/* Products Grid */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                Product Quantities
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Rice (Hal)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.rice}
                  onChange={(e) => handleInputChange("rice", e.target.value)}
                  placeholder="0.00"
                />

                <Input
                  label="Hunu Sahal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hunuSahal}
                  onChange={(e) =>
                    handleInputChange("hunuSahal", e.target.value)
                  }
                  placeholder="0.00"
                />

                <Input
                  label="Kadunu Sahal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.kadunuSahal}
                  onChange={(e) =>
                    handleInputChange("kadunuSahal", e.target.value)
                  }
                  placeholder="0.00"
                />

                <Input
                  label="Rice Polish"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.ricePolish}
                  onChange={(e) =>
                    handleInputChange("ricePolish", e.target.value)
                  }
                  placeholder="0.00"
                />

                <Input
                  label="Dahaiyya"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.dahaiyya}
                  onChange={(e) =>
                    handleInputChange("dahaiyya", e.target.value)
                  }
                  placeholder="0.00"
                />

                <Input
                  label="Flour"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.flour}
                  onChange={(e) => handleInputChange("flour", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Total Summary */}
            {totalQuantity > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Total Product Quantity:
                  </span>
                  <span className="text-xl font-bold text-green-600">
                    {totalQuantity.toFixed(2)} kg
                  </span>
                </div>
                {formData.electricDashboardNumber && (
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-green-200">
                    <span className="text-sm font-medium text-gray-700">
                      Dashboard Number:
                    </span>
                    <span className="text-sm font-semibold text-blue-600">
                      {formData.electricDashboardNumber}
                    </span>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !hasRequiredData}
            className="bg-primary text-white px-8 py-2.5 rounded-xl font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Processing...</span>
              </div>
            ) : (
              "Convert Products"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConvertToOtherModal;
