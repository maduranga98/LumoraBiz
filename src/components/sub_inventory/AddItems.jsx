import React, { useState } from "react";
import { SubItemsDropdown } from "./SubItemsDropdown";
import Input from "../Input";
import Button from "../Button";
import Modal from "../Modal";
import { Items } from "./Items";
import { db, auth } from "../../services/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "react-hot-toast";

export const AddItems = () => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const getCurrentBusinessId = () => {
    return localStorage.getItem("currentBusinessId");
  };

  // Calculate totals
  const calculateTotals = () => {
    if (!quantity || !unitPrice)
      return { subtotal: 0, discountAmount: 0, total: 0 };

    const subtotal = parseFloat(quantity) * parseFloat(unitPrice);
    const discountAmount = discount
      ? (subtotal * parseFloat(discount)) / 100
      : 0;
    const total = subtotal - discountAmount;

    return { subtotal, discountAmount, total };
  };

  const { subtotal, discountAmount, total } = calculateTotals();

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedItem) {
      toast.error("Please select an item");
      return;
    }

    if (!quantity || quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (!unitPrice || unitPrice <= 0) {
      toast.error("Please enter a valid unit price");
      return;
    }

    const businessId = getCurrentBusinessId();
    if (!businessId) {
      toast.error("Please select a business first");
      return;
    }

    setLoading(true);

    try {
      const storingData = {
        businessId,
        itemId: selectedItem.id,
        itemName: selectedItem.itemName,
        category: selectedItem.category,
        unitType: selectedItem.unitType,
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
        discount: discount ? parseFloat(discount) : 0,
        subtotal: subtotal,
        discountAmount: discountAmount,
        total: total,
        movementType: "IN", // Indicates this is adding to inventory
        ownerId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "itemMovements"), storingData);

      toast.success("Item added to inventory successfully!");

      console.log("Adding item:", {
        item: selectedItem,
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
        discount: discount ? parseFloat(discount) : 0,
        subtotal: subtotal,
        discountAmount: discountAmount,
        total: total,
      });

      // Reset form after submission
      setSelectedItem(null);
      setQuantity("");
      setUnitPrice("");
      setDiscount("");
    } catch (error) {
      console.error("Error adding item to inventory:", error);
      toast.error("Failed to add item to inventory. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle form reset
  const handleReset = () => {
    setSelectedItem(null);
    setQuantity("");
    setUnitPrice("");
    setDiscount("");
  };

  // Handle modal close and refresh items list
  const handleModalClose = () => {
    setIsModalOpen(false);
    // Trigger refresh of items in dropdown
    setRefreshTrigger((prev) => prev + 1);
  };

  // Handle opening modal for adding new item
  const handleAddNewItem = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Add Items to Inventory
            </h2>
            <Button
              type="button"
              onClick={handleAddNewItem}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span>Add New Item</span>
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Item Selection */}
              <SubItemsDropdown
                selectedItem={selectedItem}
                onItemSelect={setSelectedItem}
                label="Item Name"
                placeholder="Select an item"
                required
                className="col-span-1 md:col-span-2 lg:col-span-1"
                refreshTrigger={refreshTrigger}
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

              {/* Unit Price Input */}
              <Input
                label={`Unit Price ${
                  selectedItem ? `(per ${selectedItem.unitType})` : ""
                }`}
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="Enter unit price"
                min="0.01"
                step="0.01"
                required
                className="col-span-1"
              />

              {/* Discount Input */}
              <Input
                label="Discount (%)"
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="Enter discount %"
                min="0"
                max="100"
                step="0.01"
                className="col-span-1"
              />
            </div>

            {/* Total Value Display */}
            {selectedItem && quantity && unitPrice && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">
                    Total Value:
                  </span>
                  <div className="text-right">
                    {discount && parseFloat(discount) > 0 ? (
                      <>
                        <div className="text-sm text-gray-500 line-through">
                          Rs. {subtotal.toFixed(2)}
                        </div>
                        <div className="text-lg font-bold text-green-600">
                          Rs. {total.toFixed(2)}
                        </div>
                      </>
                    ) : (
                      <div className="text-lg font-bold text-green-600">
                        Rs. {total.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Selected Item Details */}
            {selectedItem && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-sm font-medium text-blue-700 mb-2">
                  Selected Item Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Category:</span>
                    <p className="font-medium text-gray-900">
                      {selectedItem.category}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Unit Type:</span>
                    <p className="font-medium text-gray-900">
                      {selectedItem.unitType}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Items per Pack:</span>
                    <p className="font-medium text-gray-900">
                      {selectedItem.itemsPerPack}
                    </p>
                  </div>
                  {selectedItem.minStockLevel && (
                    <div>
                      <span className="text-gray-600">Min Stock:</span>
                      <p className="font-medium text-gray-900">
                        {selectedItem.minStockLevel} {selectedItem.unitType}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Addition Summary */}
            {selectedItem && quantity && unitPrice && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h3 className="text-sm font-medium text-green-700 mb-3">
                  Addition Summary
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Adding to inventory:</span>
                    <span className="font-semibold text-gray-900">
                      {quantity} {selectedItem.unitType} of{" "}
                      {selectedItem.itemName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Unit price:</span>
                    <span className="font-medium text-gray-900">
                      Rs. {parseFloat(unitPrice).toFixed(2)} per{" "}
                      {selectedItem.unitType}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium text-gray-900">
                      Rs. {subtotal.toFixed(2)}
                    </span>
                  </div>

                  {discount && parseFloat(discount) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">
                        Discount ({discount}%):
                      </span>
                      <span className="font-medium text-red-600">
                        - Rs. {discountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-green-200 pt-3">
                    <span className="text-gray-600 font-semibold">
                      Final Total:
                    </span>
                    <span className="font-bold text-green-700 text-lg">
                      Rs. {total.toFixed(2)}
                    </span>
                  </div>

                  {selectedItem.itemsPerPack && (
                    <div className="flex items-center justify-between pt-2 border-t border-green-200">
                      <span className="text-gray-600">Equivalent packs:</span>
                      <span className="font-medium text-gray-900">
                        {(
                          parseFloat(quantity) / selectedItem.itemsPerPack
                        ).toFixed(2)}{" "}
                        packs
                      </span>
                    </div>
                  )}

                  {discount && parseFloat(discount) > 0 && (
                    <div className="bg-green-100 rounded-md p-2 mt-3">
                      <div className="flex items-center space-x-2">
                        <svg
                          className="h-4 w-4 text-green-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12z"
                          />
                        </svg>
                        <span className="text-xs text-green-700 font-medium">
                          You saved Rs. {discountAmount.toFixed(2)} with this
                          discount!
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                onClick={handleReset}
                variant="outline"
                disabled={loading}
                className="flex-1"
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={loading || !selectedItem || !quantity || !unitPrice}
                className="flex-1"
              >
                {loading ? "Adding..." : "Add to Inventory"}
              </Button>
            </div>
          </form>
        </div>

        {/* Instructions */}
      </div>

      {/* Modal for Adding New Item */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title="Add New Item"
        size="md"
      >
        <Items onItemAdded={handleModalClose} />
      </Modal>
    </>
  );
};
