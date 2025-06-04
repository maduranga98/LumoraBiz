// src/components/modals/ConvertToOtherModal.jsx
import React, { useState } from "react";
import Input from "../../components/Input";

const ConvertToOtherModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    rice: "",
    blackSeeds: "",
    brokenRice: "",
    hunuRice: "",
    dahaiya: "",
    ricePolish: "",
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
      // Convert string values to numbers for calculation
      const convertedData = Object.entries(formData).reduce(
        (acc, [key, value]) => {
          acc[key] = parseFloat(value) || 0;
          return acc;
        },
        {}
      );

      await onSubmit(convertedData);

      // Reset form on successful submission
      setFormData({
        rice: "",
        blackSeeds: "",
        brokenRice: "",
        hunuRice: "",
        dahaiya: "",
        ricePolish: "",
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
      blackSeeds: "",
      brokenRice: "",
      hunuRice: "",
      dahaiya: "",
      ricePolish: "",
    });
    onClose();
  };

  // Calculate total quantity
  const totalQuantity = Object.values(formData).reduce((sum, value) => {
    return sum + (parseFloat(value) || 0);
  }, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-primary bg-opacity-5 px-6 py-4 border-b border-muted">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text">
              Convert to Other Products
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-primary hover:bg-opacity-10 rounded-full transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-muted"
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
          <p className="text-sm text-muted mt-1">
            Enter the quantities for rice mill by-products
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Rice Quantity */}
            <Input
              label="Rice Quantity (Hal)"
              type="number"
              value={formData.rice}
              onChange={(e) => handleInputChange("rice", e.target.value)}
              placeholder="0.00"
              className="mb-4"
            />

            {/* By-products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Black Seeds (Kalu Ata)"
                type="number"
                value={formData.blackSeeds}
                onChange={(e) =>
                  handleInputChange("blackSeeds", e.target.value)
                }
                placeholder="0.00"
              />

              <Input
                label="Broken Rice (Kadunu Hal)"
                type="number"
                value={formData.brokenRice}
                onChange={(e) =>
                  handleInputChange("brokenRice", e.target.value)
                }
                placeholder="0.00"
              />

              <Input
                label="Hunu Sahal"
                type="number"
                value={formData.hunuRice}
                onChange={(e) => handleInputChange("hunuRice", e.target.value)}
                placeholder="0.00"
              />

              <Input
                label="Dahaiya"
                type="number"
                value={formData.dahaiya}
                onChange={(e) => handleInputChange("dahaiya", e.target.value)}
                placeholder="0.00"
              />

              <Input
                label="Rice Polish"
                type="number"
                value={formData.ricePolish}
                onChange={(e) =>
                  handleInputChange("ricePolish", e.target.value)
                }
                placeholder="0.00"
                className="md:col-span-2"
              />
            </div>

            {/* Total Summary */}
            {totalQuantity > 0 && (
              <div className="bg-primary bg-opacity-5 rounded-xl p-4 mt-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-text">
                    Total Quantity:
                  </span>
                  <span className="text-lg font-semibold text-primary">
                    {totalQuantity.toFixed(2)} kg
                  </span>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="bg-bg px-6 py-4 border-t border-muted flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-muted hover:text-text transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || totalQuantity === 0}
            className="bg-primary text-white px-6 py-2 rounded-xl font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
