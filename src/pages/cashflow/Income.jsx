import React, { useState } from "react";
import Input from "../../components/Input";

const Income = () => {
  const [formData, setFormData] = useState({
    incomeName: "",
    amount: "",
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (field) => (e) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.incomeName.trim()) {
      newErrors.incomeName = "Income name is required";
    }

    if (!formData.amount.trim()) {
      newErrors.amount = "Amount is required";
    } else if (
      isNaN(parseFloat(formData.amount)) ||
      parseFloat(formData.amount) <= 0
    ) {
      newErrors.amount = "Please enter a valid amount";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      // Handle form submission here
      console.log("Income data:", formData);

      // Reset form after successful submission
      setFormData({
        incomeName: "",
        amount: "",
      });
    }
  };

  const handleReset = () => {
    setFormData({
      incomeName: "",
      amount: "",
    });
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">
              Add Income
            </h2>
            <p className="text-sm text-gray-600">Track your income sources</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Income Name Field */}
            <div className="space-y-1">
              <label
                htmlFor="incomeName"
                className="block text-sm font-medium text-gray-700"
              >
                Income Name
              </label>
              <Input
                id="incomeName"
                label="Income Name"
                type="text"
                value={formData.incomeName}
                onChange={handleInputChange("incomeName")}
                placeholder="Enter income name"
                className={`w-full ${
                  errors.incomeName
                    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                    : ""
                }`}
              />
              {errors.incomeName && (
                <p className="text-xs text-red-600 mt-1">{errors.incomeName}</p>
              )}
            </div>

            {/* Amount Field */}
            <div className="space-y-1">
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-700"
              >
                Amount
              </label>
              <Input
                id="amount"
                label="Amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={handleInputChange("amount")}
                placeholder="0.00"
                className={`w-full ${
                  errors.amount
                    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                    : ""
                }`}
              />
              {errors.amount && (
                <p className="text-xs text-red-600 mt-1">{errors.amount}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Add Income
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Summary Card (Optional) */}
        {(formData.incomeName || formData.amount) && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-green-900 mb-2">Preview</h3>
            <div className="text-sm text-green-800">
              <p>
                <span className="font-medium">Income:</span>{" "}
                {formData.incomeName || "Not entered"}
              </p>
              <p>
                <span className="font-medium">Amount:</span> $
                {formData.amount || "0.00"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Income;
