import React, { useState } from "react";
import { db, auth } from "../../services/firebase";
import { collection, addDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import Input from "../../components/Input";
import Button from "../../components/Button";

export const Items = () => {
  const [itemName, setItemName] = useState("");
  const [unitType, setUnitType] = useState("");
  const [itemsPerPack, setItemsPerPack] = useState("");
  const [loading, setLoading] = useState(false);

  // Get current business ID from localStorage
  const getCurrentBusinessId = () => {
    return localStorage.getItem("currentBusinessId");
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!itemName.trim()) {
      toast.error("Please enter item name");
      return;
    }

    if (!unitType.trim()) {
      toast.error("Please enter unit type");
      return;
    }

    if (!itemsPerPack || parseInt(itemsPerPack) <= 0) {
      toast.error("Please enter a valid number of items per pack");
      return;
    }

    const businessId = getCurrentBusinessId();
    if (!businessId) {
      toast.error("Please select a business first");
      return;
    }

    setLoading(true);

    try {
      // Prepare item data
      const itemData = {
        itemName: itemName.trim(),
        unitType: unitType.trim(),
        itemsPerPack: parseInt(itemsPerPack),
        category: "General", // Default category
        businessId,
        ownerId: auth.currentUser?.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add document to 'items' collection
      await addDoc(collection(db, "items"), itemData);

      // Show success message
      toast.success("Item added successfully");

      // Reset form
      setItemName("");
      setUnitType("");
      setItemsPerPack("");
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Failed to add item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle form reset
  const handleReset = () => {
    setItemName("");
    setUnitType("");
    setItemsPerPack("");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-muted p-6">
        <h2 className="text-xl font-semibold mb-6">Items Details</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Input
              label="Item Name"
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Enter Item Name"
            />

            <Input
              label="Unit Type"
              type="text"
              value={unitType}
              onChange={(e) => setUnitType(e.target.value)}
              placeholder="Enter Unit Type"
            />

            <Input
              label="Number Of Items for a pack"
              type="number"
              value={itemsPerPack}
              onChange={(e) => setItemsPerPack(e.target.value)}
              placeholder="Enter No.of items per pack"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" loading={loading} className="flex-1">
              {loading ? "Saving..." : "Save Item"}
            </Button>

            <Button
              type="button"
              onClick={handleReset}
              variant="outline"
              disabled={loading}
            >
              Reset
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
