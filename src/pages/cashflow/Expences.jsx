import React, { useState } from "react";
import Input from "../../components/Input";

const Expenses = () => {
  const [formData, setFormData] = useState({
    expense: "",
    value: "",
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

    if (!formData.expense.trim()) {
      newErrors.expense = "Expense name is required";
    }

    if (!formData.value.trim()) {
      newErrors.value = "Amount is required";
    } else if (
      isNaN(parseFloat(formData.value)) ||
      parseFloat(formData.value) <= 0
    ) {
      newErrors.value = "Please enter a valid amount";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      // Handle form submission here
      console.log("Expense data:", formData);

      // Reset form after successful submission
      setFormData({
        expense: "",
        value: "",
      });
    }
  };

  const handleReset = () => {
    setFormData({
      expense: "",
      value: "",
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
              Add Expense
            </h2>
            <p className="text-sm text-gray-600">
              Track your expenses efficiently
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Expense Name Field */}
            <div className="space-y-1">
              <label
                htmlFor="expense"
                className="block text-sm font-medium text-gray-700"
              >
                Expense Name
              </label>
              <Input
                id="expense"
                label="Expense Name"
                type="text"
                value={formData.expense}
                onChange={handleInputChange("expense")}
                placeholder="Enter expense name"
                className={`w-full ${
                  errors.expense
                    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                    : ""
                }`}
              />
              {errors.expense && (
                <p className="text-xs text-red-600 mt-1">{errors.expense}</p>
              )}
            </div>

            {/* Amount Field */}
            <div className="space-y-1">
              <label
                htmlFor="value"
                className="block text-sm font-medium text-gray-700"
              >
                Amount
              </label>
              <Input
                id="value"
                label="Amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.value}
                onChange={handleInputChange("value")}
                placeholder="0.00"
                className={`w-full ${
                  errors.value
                    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                    : ""
                }`}
              />
              {errors.value && (
                <p className="text-xs text-red-600 mt-1">{errors.value}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Add Expense
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
        {(formData.expense || formData.value) && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Preview</h3>
            <div className="text-sm text-blue-800">
              <p>
                <span className="font-medium">Expense:</span>{" "}
                {formData.expense || "Not entered"}
              </p>
              <p>
                <span className="font-medium">Amount:</span> $
                {formData.value || "0.00"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Expenses;
