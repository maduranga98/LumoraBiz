import React, { useState } from "react";
import { SubItemsDropdown } from "./SubItemsDropdown";
import Input from "../Input";
import Button from "../Button";
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

export const ItemMove = () => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [recipient, setRecipient] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStock, setCurrentStock] = useState(null);

  // Get current business ID
  const getCurrentBusinessId = () => {
    return localStorage.getItem("currentBusinessId");
  };

  // Fetch current stock for selected item
  const fetchCurrentStock = async (itemId) => {
    const businessId = getCurrentBusinessId();
    if (!businessId || !itemId) return;

    try {
      const stockQuery = query(
        collection(db, "inventory"),
        where("businessId", "==", businessId),
        where("itemId", "==", itemId)
      );

      const querySnapshot = await getDocs(stockQuery);

      if (!querySnapshot.empty) {
        const stockData = querySnapshot.docs[0].data();
        setCurrentStock({
          id: querySnapshot.docs[0].id,
          ...stockData,
        });
      } else {
        setCurrentStock(null);
      }
    } catch (error) {
      console.error("Error fetching current stock:", error);
      setCurrentStock(null);
    }
  };

  // Handle item selection
  const handleItemSelect = (item) => {
    setSelectedItem(item);
    if (item) {
      fetchCurrentStock(item.id);
    } else {
      setCurrentStock(null);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!selectedItem) {
      toast.error("Please select an item");
      return;
    }

    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (!recipient.trim()) {
      toast.error("Please enter recipient information");
      return;
    }

    if (!purpose.trim()) {
      toast.error("Please enter the purpose");
      return;
    }

    const moveQuantity = parseFloat(quantity);

    // Check if enough stock available
    if (!currentStock || currentStock.currentStock < moveQuantity) {
      toast.error(
        `Insufficient stock. Available: ${currentStock?.currentStock || 0} ${
          selectedItem.unitType
        }`
      );
      return;
    }

    setLoading(true);
    const businessId = getCurrentBusinessId();

    try {
      // 1. Record the item movement in history
      const movementData = {
        businessId,
        itemId: selectedItem.id,
        itemName: selectedItem.itemName,
        unitType: selectedItem.unitType,
        movementType: "OUT",
        quantity: moveQuantity,
        recipient: recipient.trim(),
        purpose: purpose.trim(),
        notes: notes.trim() || null,
        previousStock: currentStock.currentStock,
        newStock: currentStock.currentStock - moveQuantity,
        movedBy: auth.currentUser?.uid,
        movedByName: auth.currentUser?.displayName || "Unknown User",
        timestamp: serverTimestamp(),
        createdAt: new Date(),
      };

      await addDoc(collection(db, "itemMovements"), movementData);

      // 2. Update current stock
      const newStockQuantity = currentStock.currentStock - moveQuantity;
      await updateDoc(doc(db, "inventory", currentStock.id), {
        currentStock: newStockQuantity,
        lastUpdated: serverTimestamp(),
        lastMovement: {
          type: "OUT",
          quantity: moveQuantity,
          date: new Date(),
          recipient: recipient.trim(),
        },
      });

      toast.success(
        `Successfully moved ${moveQuantity} ${selectedItem.unitType} of ${selectedItem.itemName}`
      );

      // Reset form
      handleReset();

      // Refresh stock data
      fetchCurrentStock(selectedItem.id);
    } catch (error) {
      console.error("Error processing item movement:", error);
      toast.error("Failed to process item movement. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle form reset
  const handleReset = () => {
    setQuantity("");
    setRecipient("");
    setPurpose("");
    setNotes("");
  };

  // Calculate remaining stock after movement
  const getRemainingStock = () => {
    if (!currentStock || !quantity) return null;
    const moveQty = parseFloat(quantity) || 0;
    return Math.max(0, currentStock.currentStock - moveQty);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-muted p-6">
        <h2 className="text-xl font-semibold text-text mb-6">
          Item Movement (Outgoing)
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Item Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SubItemsDropdown
              selectedItem={selectedItem}
              onItemSelect={handleItemSelect}
              label="Select Item"
              placeholder="Choose item to move out"
              required
              className="col-span-1"
            />

            <Input
              label="Quantity to Move Out"
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

          {/* Current Stock Info */}
          {selectedItem && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                Current Stock Information
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-blue-600">Available Stock:</span>
                  <p className="font-semibold text-blue-800">
                    {currentStock
                      ? `${currentStock.currentStock} ${selectedItem.unitType}`
                      : "No stock data"}
                  </p>
                </div>
                <div>
                  <span className="text-blue-600">Unit Type:</span>
                  <p className="font-medium text-blue-800">
                    {selectedItem.unitType}
                  </p>
                </div>
                <div>
                  <span className="text-blue-600">Category:</span>
                  <p className="font-medium text-blue-800">
                    {selectedItem.category}
                  </p>
                </div>
                {selectedItem.minStockLevel && (
                  <div>
                    <span className="text-blue-600">Min Stock Level:</span>
                    <p className="font-medium text-blue-800">
                      {selectedItem.minStockLevel} {selectedItem.unitType}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Movement Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Recipient"
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Enter recipient name/department"
              required
              className="col-span-1"
            />

            <Input
              label="Purpose"
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Enter purpose/reason"
              required
              className="col-span-1"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes (optional)"
              rows="3"
              className="w-full px-3 py-2 border border-muted rounded-lg focus:ring-primary focus:border-primary outline-none resize-none"
            />
          </div>

          {/* Movement Summary */}
          {selectedItem && quantity && currentStock && (
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <h3 className="text-sm font-medium text-orange-800 mb-2">
                Movement Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-orange-600">Item:</span>
                  <span className="font-medium text-orange-800">
                    {selectedItem.itemName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-600">Quantity Moving Out:</span>
                  <span className="font-semibold text-orange-800">
                    {quantity} {selectedItem.unitType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-600">Current Stock:</span>
                  <span className="font-medium text-orange-800">
                    {currentStock.currentStock} {selectedItem.unitType}
                  </span>
                </div>
                <div className="flex justify-between border-t border-orange-200 pt-2">
                  <span className="text-orange-600">Remaining Stock:</span>
                  <span
                    className={`font-bold ${
                      getRemainingStock() < (selectedItem.minStockLevel || 0)
                        ? "text-red-600"
                        : "text-orange-800"
                    }`}
                  >
                    {getRemainingStock()} {selectedItem.unitType}
                  </span>
                </div>
                {getRemainingStock() < (selectedItem.minStockLevel || 0) && (
                  <div className="bg-red-100 border border-red-200 rounded p-2 mt-2">
                    <p className="text-red-700 text-xs font-medium">
                      ⚠️ Warning: Stock will fall below minimum level!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-muted">
            <Button
              type="button"
              onClick={handleReset}
              className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300"
              disabled={loading}
            >
              Reset Form
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !selectedItem ||
                !quantity ||
                !recipient ||
                !purpose ||
                !currentStock
              }
              className="flex-1"
            >
              {loading ? "Processing..." : "Move Items Out"}
            </Button>
          </div>
        </form>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
        <div className="flex items-start space-x-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-yellow-800">
              Important Notes
            </h3>
            <ul className="text-sm text-yellow-700 mt-1 space-y-1">
              <li>• This action will reduce your current inventory stock</li>
              <li>• All movements are tracked and cannot be undone</li>
              <li>• Ensure recipient and purpose information is accurate</li>
              <li>• Check minimum stock levels before proceeding</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
