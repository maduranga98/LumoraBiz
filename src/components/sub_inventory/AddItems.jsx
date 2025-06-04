import React, { useState } from "react";
import { SubItemsDropdown } from "./SubItemsDropdown";
import Input from "../Input";
import Button from "../Button";

export const AddItems = () => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedItem) {
      alert("Please select an item");
      return;
    }

    if (!quantity || quantity <= 0) {
      alert("Please enter a valid quantity");
      return;
    }

    setLoading(true);

    // Add your submission logic here
    console.log("Adding item:", {
      item: selectedItem,
      quantity: parseFloat(quantity),
    });

    // Reset form after submission
    setTimeout(() => {
      setSelectedItem(null);
      setQuantity("");
      setLoading(false);
    }, 1000);
  };

  // Handle form reset
  const handleReset = () => {
    setSelectedItem(null);
    setQuantity("");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-muted p-6">
        <h2 className="text-xl font-semibold text-text mb-6">
          Add Items to Inventory
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Item Selection */}
            <SubItemsDropdown
              selectedItem={selectedItem}
              onItemSelect={setSelectedItem}
              label="Item Name"
              placeholder="Select an item"
              required
              className="col-span-1"
            />

            {/* Quantity Input */}
            <Input
              label="Quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              min="0.01"
              step="0.01"
              required
              className="col-span-1"
            />
          </div>

          {/* Selected Item Details */}
          {selectedItem && (
            <div className="bg-primary bg-opacity-5 rounded-lg p-4 border border-primary border-opacity-20">
              <h3 className="text-sm font-medium text-primary mb-2">
                Selected Item Details
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted">Category:</span>
                  <p className="font-medium text-text">
                    {selectedItem.category}
                  </p>
                </div>
                <div>
                  <span className="text-muted">Unit Type:</span>
                  <p className="font-medium text-text">
                    {selectedItem.unitType}
                  </p>
                </div>
                <div>
                  <span className="text-muted">Items per Pack:</span>
                  <p className="font-medium text-text">
                    {selectedItem.itemsPerPack}
                  </p>
                </div>
                {selectedItem.minStockLevel && (
                  <div>
                    <span className="text-muted">Min Stock:</span>
                    <p className="font-medium text-text">
                      {selectedItem.minStockLevel} {selectedItem.unitType}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quantity Summary */}
          {selectedItem && quantity && (
            <div className="bg-accent bg-opacity-5 rounded-lg p-4 border border-accent border-opacity-20">
              <h3 className="text-sm font-medium text-accent mb-2">
                Addition Summary
              </h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Adding to inventory:</span>
                <span className="font-semibold text-text">
                  {quantity} {selectedItem.unitType} of {selectedItem.itemName}
                </span>
              </div>
              {selectedItem.itemsPerPack && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted">Equivalent packs:</span>
                  <span className="font-medium text-text">
                    {(parseFloat(quantity) / selectedItem.itemsPerPack).toFixed(
                      2
                    )}{" "}
                    packs
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              onClick={handleReset}
              className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300"
              disabled={loading}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedItem || !quantity}
              className="flex-1"
            >
              {loading ? "Adding..." : "Add to Inventory"}
            </Button>
          </div>
        </form>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-start space-x-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-800">Quick Guide</h3>
            <ul className="text-sm text-blue-700 mt-1 space-y-1">
              <li>• Select an item from the dropdown or search by name</li>
              <li>• Enter the quantity you want to add to inventory</li>
              <li>• Review the summary before confirming</li>
              <li>• Click "Add to Inventory" to complete the addition</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
