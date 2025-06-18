import React, { useState } from "react";
import { SubItemsDropdown } from "./SubItemsDropdown";
import Input from "../Input";
import Button from "../Button";
import Modal from "../Modal";
import { Items } from "./Items";
import { db } from "../../services/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { useBusiness } from "../../contexts/BusinessContext";

export const AddItems = () => {
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();
  const [selectedItem, setSelectedItem] = useState(null);
  const [numberOfPacks, setNumberOfPacks] = useState("");
  const [numberOfUnits, setNumberOfUnits] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Calculate total quantity from packs and units
  const getTotalQuantity = () => {
    const packs = parseFloat(numberOfPacks) || 0;
    const units = parseFloat(numberOfUnits) || 0;
    const itemsPerPack = selectedItem?.itemsPerPack || 1;

    return packs * itemsPerPack + units;
  };

  // Calculate totals
  const calculateTotals = () => {
    const totalQuantity = getTotalQuantity();

    if (!totalQuantity || !unitPrice)
      return { subtotal: 0, discountAmount: 0, total: 0, totalQuantity: 0 };

    const subtotal = totalQuantity * parseFloat(unitPrice);
    const discountAmount = discount
      ? (subtotal * parseFloat(discount)) / 100
      : 0;
    const total = subtotal - discountAmount;

    return { subtotal, discountAmount, total, totalQuantity };
  };

  const { subtotal, discountAmount, total, totalQuantity } = calculateTotals();

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedItem) {
      toast.error("Please select an item");
      return;
    }

    if (totalQuantity <= 0) {
      toast.error("Please enter a valid number of packs or units");
      return;
    }

    if (!unitPrice || unitPrice <= 0) {
      toast.error("Please enter a valid unit price");
      return;
    }

    const businessId = currentBusiness.id;
    const ownerId = currentUser.uid;

    if (!businessId) {
      toast.error("Please select a business first");
      return;
    }

    if (!ownerId) {
      toast.error("User authentication required");
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
        numberOfPacks: parseFloat(numberOfPacks) || 0,
        numberOfUnits: parseFloat(numberOfUnits) || 0,
        totalQuantity: totalQuantity,
        itemsPerPack: selectedItem.itemsPerPack,
        unitPrice: parseFloat(unitPrice),
        discount: discount ? parseFloat(discount) : 0,
        subtotal: subtotal,
        discountAmount: discountAmount,
        total: total,
        movementType: "IN", // Indicates this is adding to inventory
        ownerId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const materialStockPath = `owners/${ownerId}/businesses/${businessId}/stock/materialStock/stock`;

      // Add document to nested collection
      await addDoc(collection(db, materialStockPath), storingData);

      toast.success("Item added to inventory successfully!");

      console.log("Adding item:", {
        item: selectedItem,
        numberOfPacks: parseFloat(numberOfPacks) || 0,
        numberOfUnits: parseFloat(numberOfUnits) || 0,
        totalQuantity: totalQuantity,
        unitPrice: parseFloat(unitPrice),
        discount: discount ? parseFloat(discount) : 0,
        subtotal: subtotal,
        discountAmount: discountAmount,
        total: total,
        path: materialStockPath,
      });

      // Reset form after submission
      setSelectedItem(null);
      setNumberOfPacks("");
      setNumberOfUnits("");
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
    setNumberOfPacks("");
    setNumberOfUnits("");
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Item Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SubItemsDropdown
                selectedItem={selectedItem}
                onItemSelect={setSelectedItem}
                label="Item Name"
                placeholder="Select an item"
                required
                className="md:col-span-2"
                refreshTrigger={refreshTrigger}
              />
            </div>

            {/* Quantity Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Quantity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Packs"
                  type="number"
                  value={numberOfPacks}
                  onChange={(e) => setNumberOfPacks(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  helperText={
                    selectedItem
                      ? `${selectedItem.itemsPerPack} ${selectedItem.unitType} per pack`
                      : ""
                  }
                />
                <Input
                  label="Individual Units"
                  type="number"
                  value={numberOfUnits}
                  onChange={(e) => setNumberOfUnits(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  helperText={selectedItem ? `${selectedItem.unitType}` : ""}
                />
              </div>
            </div>

            {/* Price Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Unit Price"
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  required
                  helperText={
                    selectedItem ? `Per ${selectedItem.unitType}` : ""
                  }
                />
                <Input
                  label="Discount (%)"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
            </div>

            {/* Quantity Summary */}
            {selectedItem && totalQuantity > 0 && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700">
                    Total Quantity:
                  </span>
                  <span className="text-lg font-bold text-blue-700">
                    {totalQuantity.toFixed(2)} {selectedItem.unitType}
                  </span>
                </div>
                {(numberOfPacks > 0 || numberOfUnits > 0) && (
                  <div className="mt-2 text-xs text-blue-600">
                    {numberOfPacks > 0 && `${numberOfPacks} packs`}
                    {numberOfPacks > 0 && numberOfUnits > 0 && " + "}
                    {numberOfUnits > 0 && `${numberOfUnits} units`}
                  </div>
                )}
              </div>
            )}

            {/* Total Value */}
            {selectedItem && totalQuantity > 0 && unitPrice && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-700">
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
                {discount && parseFloat(discount) > 0 && (
                  <div className="mt-2 text-xs text-green-600">
                    Saved Rs. {discountAmount.toFixed(2)} ({discount}% discount)
                  </div>
                )}
              </div>
            )}

            {/* Selected Item Details */}
            {selectedItem && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Item Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Category:</span>
                    <p className="font-medium">{selectedItem.category}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Unit:</span>
                    <p className="font-medium">{selectedItem.unitType}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Pack Size:</span>
                    <p className="font-medium">{selectedItem.itemsPerPack}</p>
                  </div>
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
                disabled={
                  loading || !selectedItem || totalQuantity <= 0 || !unitPrice
                }
                className="flex-1"
              >
                {loading ? "Adding..." : "Add to Inventory"}
              </Button>
            </div>
          </form>
        </div>
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
