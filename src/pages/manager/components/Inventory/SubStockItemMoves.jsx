import React, { useState } from "react";
import { SubItemsDropdown } from "./ManagerSubItemDropDown";
import Input from "../../../../components/Input";
import Button from "../../../../components/Button";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  doc,
  updateDoc,
  writeBatch,
  runTransaction,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import { db } from "../../../../services/firebase";
import { useAuth } from "../../../../contexts/AuthContext";
import { useBusiness } from "../../../../contexts/ManagerBusinessContext";

export const SubStockItemMoves = () => {
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [recipient, setRecipient] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [stockBatches, setStockBatches] = useState([]);
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [totalAvailableStock, setTotalAvailableStock] = useState(0);

  const businessId = currentBusiness?.id;
  const ownerId = currentUser?.ownerId;

  // Calculate stock batches with FIFO logic
  const calculateStockBatches = (movements) => {
    const batches = [];

    // Group movements by price and date for FIFO tracking
    const inMovements = movements
      .filter((m) => (m.movementType || "IN") === "IN")
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateA - dateB; // Oldest first for FIFO
      });

    const outMovements = movements
      .filter((m) => m.movementType === "OUT")
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateA - dateB;
      });

    // Create initial batches from IN movements
    inMovements.forEach((movement) => {
      if (movement.totalQuantity > 0) {
        batches.push({
          id: movement.id,
          originalQuantity: movement.totalQuantity,
          remainingQuantity: movement.totalQuantity,
          unitPrice: movement.unitPrice || 0,
          total: movement.total || 0,
          date:
            movement.createdAt?.toDate?.()?.toLocaleDateString() || "Unknown",
          createdAt: movement.createdAt,
          supplier: movement.supplier || "Direct Entry",
          stockDocRef: movement.stockDocRef || movement.id, // Reference to original stock document
        });
      }
    });

    // Apply OUT movements using FIFO
    outMovements.forEach((outMovement) => {
      let remainingToDeduct = outMovement.totalQuantity || 0;

      for (let i = 0; i < batches.length && remainingToDeduct > 0; i++) {
        const batch = batches[i];
        if (batch.remainingQuantity > 0) {
          const deductAmount = Math.min(
            batch.remainingQuantity,
            remainingToDeduct
          );
          batch.remainingQuantity -= deductAmount;
          remainingToDeduct -= deductAmount;
        }
      }
    });

    // Filter out empty batches and return available stock
    const availableBatches = batches.filter(
      (batch) => batch.remainingQuantity > 0
    );
    const totalStock = availableBatches.reduce(
      (sum, batch) => sum + batch.remainingQuantity,
      0
    );

    return { batches: availableBatches, totalStock };
  };

  // Fetch current stock for selected item from movements
  const fetchCurrentStock = async (itemId) => {
    if (!businessId || !itemId || !ownerId) return;

    try {
      // Fetch all movements for this item from the stock collection
      const movementsQuery = query(
        collection(
          db,
          `owners/${ownerId}/businesses/${businessId}/stock/materialStock/stock`
        ),
        where("itemId", "==", itemId)
      );

      const querySnapshot = await getDocs(movementsQuery);
      const movements = [];

      querySnapshot.forEach((doc) => {
        movements.push({
          id: doc.id,
          stockDocRef: doc.id, // Store document reference for updates
          ...doc.data(),
        });
      });

      // Calculate stock batches
      const { batches, totalStock } = calculateStockBatches(movements);

      setStockBatches(batches);
      setTotalAvailableStock(totalStock);
      setSelectedBatches([]); // Reset selection when item changes
    } catch (error) {
      console.error("Error fetching current stock:", error);
      setStockBatches([]);
      setTotalAvailableStock(0);
      toast.error("Failed to fetch current stock information");
    }
  };

  // Handle item selection
  const handleItemSelect = (item) => {
    setSelectedItem(item);
    setQuantity(""); // Reset quantity when item changes
    if (item) {
      fetchCurrentStock(item.id);
    } else {
      setStockBatches([]);
      setTotalAvailableStock(0);
      setSelectedBatches([]);
    }
  };

  // Handle batch selection for movement
  const handleBatchQuantityChange = (batchId, newQuantity) => {
    const batch = stockBatches.find((b) => b.id === batchId);
    if (!batch) return;

    const maxQuantity = batch.remainingQuantity;
    const quantity = Math.min(
      Math.max(0, parseFloat(newQuantity) || 0),
      maxQuantity
    );

    setSelectedBatches((prev) => {
      let updatedBatches;
      const existing = prev.find((s) => s.batchId === batchId);
      if (existing) {
        if (quantity === 0) {
          updatedBatches = prev.filter((s) => s.batchId !== batchId);
        } else {
          updatedBatches = prev.map((s) =>
            s.batchId === batchId ? { ...s, quantity } : s
          );
        }
      } else if (quantity > 0) {
        updatedBatches = [
          ...prev,
          {
            batchId,
            quantity,
            unitPrice: batch.unitPrice,
            stockDocRef: batch.stockDocRef,
          },
        ];
      } else {
        updatedBatches = prev;
      }

      // Update the quantity field to reflect total selected
      const totalSelected = updatedBatches.reduce(
        (sum, batch) => sum + batch.quantity,
        0
      );
      setQuantity(totalSelected.toString());

      return updatedBatches;
    });
  };

  // Get total selected quantity
  const getTotalSelectedQuantity = () => {
    return selectedBatches.reduce((sum, batch) => sum + batch.quantity, 0);
  };

  // Auto-select batches using FIFO when quantity is entered
  const handleQuantityChange = (e) => {
    const newQuantity = e.target.value;
    setQuantity(newQuantity);

    if (newQuantity && stockBatches.length > 0) {
      const targetQuantity = parseFloat(newQuantity) || 0;
      let remainingToSelect = targetQuantity;
      const autoSelected = [];

      // Auto-select using FIFO (oldest first)
      for (const batch of stockBatches) {
        if (remainingToSelect <= 0) break;

        const selectQuantity = Math.min(
          remainingToSelect,
          batch.remainingQuantity
        );
        if (selectQuantity > 0) {
          autoSelected.push({
            batchId: batch.id,
            quantity: selectQuantity,
            unitPrice: batch.unitPrice,
            stockDocRef: batch.stockDocRef,
          });
          remainingToSelect -= selectQuantity;
        }
      }

      setSelectedBatches(autoSelected);
    } else {
      setSelectedBatches([]);
    }
  };

  // Handle form submission with transaction
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!selectedItem) {
      toast.error("Please select an item");
      return;
    }

    if (selectedBatches.length === 0) {
      toast.error("Please select quantities from stock batches to move");
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

    if (!businessId || !ownerId) {
      toast.error("Missing business or user information");
      return;
    }

    const totalMoveQuantity = getTotalSelectedQuantity();
    setLoading(true);

    try {
      // Use transaction to ensure data consistency
      await runTransaction(db, async (transaction) => {
        const stockCollectionPath = `owners/${ownerId}/businesses/${businessId}/stock/materialStock/stock`;
        const movementsCollectionPath = `owners/${ownerId}/businesses/${businessId}/stock/materialStock/movements`;

        // First, verify stock availability and prepare updates
        const stockUpdates = [];
        for (const selectedBatch of selectedBatches) {
          const stockDocRef = doc(
            db,
            stockCollectionPath,
            selectedBatch.stockDocRef
          );
          const stockDoc = await transaction.get(stockDocRef);

          if (!stockDoc.exists()) {
            throw new Error(`Stock batch ${selectedBatch.batchId} not found`);
          }

          const stockData = stockDoc.data();
          const currentQuantity = stockData.totalQuantity || 0;

          if (currentQuantity < selectedBatch.quantity) {
            throw new Error(
              `Insufficient stock in batch ${selectedBatch.batchId}. Available: ${currentQuantity}, Requested: ${selectedBatch.quantity}`
            );
          }

          stockUpdates.push({
            docRef: stockDocRef,
            newQuantity: currentQuantity - selectedBatch.quantity,
            selectedBatch,
            originalData: stockData,
          });
        }

        // Update stock quantities
        for (const update of stockUpdates) {
          transaction.update(update.docRef, {
            totalQuantity: update.newQuantity,
            updatedAt: serverTimestamp(),
          });
        }

        // Create movement records
        for (const update of stockUpdates) {
          const batch = stockBatches.find(
            (b) => b.id === update.selectedBatch.batchId
          );

          const movementData = {
            businessId,
            itemId: selectedItem.id,
            itemName: selectedItem.itemName,
            category: selectedItem.category,
            unitType: selectedItem.unitType,
            movementType: "OUT",
            numberOfPacks: 0,
            numberOfUnits: update.selectedBatch.quantity,
            totalQuantity: update.selectedBatch.quantity,
            itemsPerPack: selectedItem.itemsPerPack || 1,
            unitPrice: update.selectedBatch.unitPrice,
            discount: 0,
            subtotal:
              update.selectedBatch.quantity * update.selectedBatch.unitPrice,
            discountAmount: 0,
            total:
              update.selectedBatch.quantity * update.selectedBatch.unitPrice,
            recipient: recipient.trim(),
            purpose: purpose.trim(),
            notes: notes.trim() || null,
            batchId: update.selectedBatch.batchId,
            stockBatchRef: update.selectedBatch.stockDocRef,
            originalBatchDate: batch?.date,
            movedBy: ownerId,
            movedByName:
              currentUser?.name || currentUser?.email || "Unknown User",
            ownerId: ownerId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            // Additional tracking fields
            remainingStockAfterMove: update.newQuantity,
            originalStockBeforeMove: update.originalData.totalQuantity,
          };

          const newMovementRef = doc(collection(db, movementsCollectionPath));
          transaction.set(newMovementRef, movementData);
        }
      });

      toast.success(
        `Successfully moved ${totalMoveQuantity.toFixed(2)} ${
          selectedItem.unitType
        } of ${selectedItem.itemName} to ${recipient}`
      );

      // Reset form
      handleReset();

      // Refresh stock data
      await fetchCurrentStock(selectedItem.id);
    } catch (error) {
      console.error("Error processing item movement:", error);

      if (error.message.includes("Insufficient stock")) {
        toast.error(error.message);
      } else {
        toast.error("Failed to process item movement. Please try again.");
      }
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
    setSelectedBatches([]);
  };

  // Calculate total value of selected batches
  const getTotalValue = () => {
    return selectedBatches.reduce((sum, batch) => {
      return sum + batch.quantity * batch.unitPrice;
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Item Movement (Outgoing)
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Item Selection */}
          <div className="grid grid-cols-1 gap-4">
            <SubItemsDropdown
              selectedItem={selectedItem}
              onItemSelect={handleItemSelect}
              label="Select Item"
              placeholder="Choose item to move out"
              required
              className="w-full"
            />
          </div>

          {/* Quick Quantity Entry */}
          {selectedItem && totalAvailableStock > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Quick Entry (Auto-select using FIFO)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={`Total Quantity to Move (Units)`}
                  type="number"
                  value={quantity}
                  onChange={handleQuantityChange}
                  placeholder="Enter total quantity"
                  min="0"
                  max={totalAvailableStock}
                  step="0.01"
                  helperText="System will auto-select batches using FIFO method"
                />
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={() => {
                      setQuantity("");
                      setSelectedBatches([]);
                    }}
                    variant="outline"
                    className="h-10"
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Stock Batches Selection */}
          {selectedItem && stockBatches.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-sm font-medium text-blue-800 mb-3">
                Available Stock Batches - Select Quantities to Move
              </h3>
              <div className="text-xs text-blue-600 mb-3">
                Total Available: {totalAvailableStock.toFixed(2)} Units
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {stockBatches.map((batch, index) => {
                  const selectedBatch = selectedBatches.find(
                    (s) => s.batchId === batch.id
                  );
                  const selectedQty = selectedBatch?.quantity || 0;

                  return (
                    <div key={batch.id} className="bg-white rounded border p-3">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center text-sm">
                        <div>
                          <span className="text-gray-600">
                            Batch #{index + 1}:
                          </span>
                          <p className="font-medium text-gray-900">
                            {batch.date}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Available:</span>
                          <p className="font-medium text-gray-900">
                            {batch.remainingQuantity.toFixed(2)} Units
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Unit Price:</span>
                          <p className="font-medium text-gray-900">
                            Rs. {batch.unitPrice.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Supplier:</span>
                          <p className="font-medium text-gray-900 text-xs">
                            {batch.supplier}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Move Quantity (Units):
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={batch.remainingQuantity}
                            step="0.01"
                            value={selectedQty}
                            onChange={(e) =>
                              handleBatchQuantityChange(
                                batch.id,
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      {selectedQty > 0 && (
                        <div className="mt-2 p-2 bg-green-50 rounded text-xs">
                          <span className="text-green-700">
                            Selected: {selectedQty} {selectedItem.unitType} ×
                            Rs. {batch.unitPrice.toFixed(2)} =
                            <strong>
                              {" "}
                              Rs. {(selectedQty * batch.unitPrice).toFixed(2)}
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Selection Summary */}
              {selectedBatches.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                  <h4 className="text-sm font-medium text-green-800 mb-2">
                    Movement Selection Summary
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-green-600">Total to Move:</span>
                      <p className="font-semibold text-green-800">
                        {getTotalSelectedQuantity().toFixed(2)} Units
                      </p>
                    </div>
                    <div>
                      <span className="text-green-600">Total Value:</span>
                      <p className="font-semibold text-green-800">
                        Rs. {getTotalValue().toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-green-600">Avg Price:</span>
                      <p className="font-semibold text-green-800">
                        Rs.{" "}
                        {getTotalSelectedQuantity() > 0
                          ? (
                              getTotalValue() / getTotalSelectedQuantity()
                            ).toFixed(2)
                          : "0.00"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No Stock Warning */}
          {selectedItem &&
            stockBatches.length === 0 &&
            totalAvailableStock === 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <svg
                    className="h-5 w-5 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-red-800 font-medium text-sm">
                    No Stock Available
                  </p>
                </div>
                <p className="text-red-700 text-xs mt-1">
                  This item has no available stock to move. Please add inventory
                  first.
                </p>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes (optional)"
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={handleReset}
              variant="outline"
              disabled={loading}
              className="flex-1"
            >
              Reset Form
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !selectedItem ||
                !recipient ||
                !purpose ||
                selectedBatches.length === 0 ||
                getTotalSelectedQuantity() <= 0
              }
              className="flex-1"
            >
              {loading ? "Processing..." : "Move Items Out"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
