// src/hooks/useBagOperations.js
import { useState } from "react";
import { db } from "../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  setDoc,
  increment,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { toast } from "react-hot-toast";

export const useBagOperations = (
  currentUser,
  currentBusiness,
  batches,
  bagSizes,
  newBagSize,
  setNewBagSize,
  bagCreationData,
  setBagCreationData,
  individualBagSellData,
  setIndividualBagSellData,
  selectedBag,
  fetchAllData
) => {
  const [isCreatingBags, setIsCreatingBags] = useState(false);

  // Helper function to create item name
  const createItemName = (productType, riceType, bagSize) => {
    if (productType === "rice" && riceType) {
      return `${riceType} ${bagSize}kg`;
    }

    const productMap = {
      hunuSahal: "Hunu Sahal",
      kadunuSahal: "Kadunu Sahal",
      ricePolish: "Rice Polish",
      dahaiyya: "Dahaiyya",
      flour: "Flour",
    };

    const displayName = productMap[productType] || productType;
    return `${displayName} ${bagSize}kg`;
  };

  // Add bag size
  const addBagSize = async () => {
    if (!newBagSize || parseFloat(newBagSize) <= 0) {
      toast.error("Please enter a valid bag size");
      return;
    }

    const size = parseFloat(newBagSize);

    if (bagSizes.includes(size)) {
      toast.error("This bag size already exists");
      return;
    }

    try {
      const updatedSizes = [...bagSizes, size].sort((a, b) => a - b);

      const bagSizesDocRef = doc(
        db,
        `owners/${currentUser.uid}/businesses/${currentBusiness.id}/settings/bagSizes`
      );

      const bagSizesDoc = await getDoc(bagSizesDocRef);

      if (bagSizesDoc.exists()) {
        await updateDoc(bagSizesDocRef, {
          sizes: updatedSizes,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(bagSizesDocRef, {
          sizes: updatedSizes,
          businessId: currentBusiness.id,
          ownerId: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setNewBagSize("");
      toast.success("Bag size added successfully");
      await fetchAllData();
    } catch (error) {
      console.error("Error adding bag size:", error);
      toast.error("Failed to add bag size");
    }
  };

  // Remove bag size
  const removeBagSize = async (sizeToRemove) => {
    try {
      const updatedSizes = bagSizes.filter((size) => size !== sizeToRemove);

      await updateDoc(
        doc(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/settings/bagSizes`
        ),
        {
          sizes: updatedSizes,
          updatedAt: serverTimestamp(),
        }
      );

      toast.success("Bag size removed successfully");
      await fetchAllData();
    } catch (error) {
      console.error("Error removing bag size:", error);
      toast.error("Failed to remove bag size");
    }
  };

  // Create bags
  const createBags = async () => {
    const { sizeKg, quantity, productType, batchId } = bagCreationData;

    if (!sizeKg || !quantity || !productType || !batchId) {
      toast.error("Please fill all required fields");
      return;
    }

    const sizeKgNum = parseFloat(sizeKg);
    const quantityNum = parseInt(quantity);
    const totalWeight = sizeKgNum * quantityNum;

    const batch = batches.find((b) => b.id === batchId);
    if (!batch) {
      toast.error("Batch not found");
      return;
    }

    const availableQuantity = batch.products[productType] || 0;
    if (totalWeight > availableQuantity) {
      toast.error(
        `Not enough ${productType} in batch. Available: ${availableQuantity} kg, Required: ${totalWeight} kg`
      );
      return;
    }

    setIsCreatingBags(true);

    try {
      // Create item name
      const riceType = productType === "rice" ? batch.originalPaddyType : null;
      const itemName = createItemName(productType, riceType, sizeKgNum);

      // Updated collection path
      const collectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/stock`;

      // Check for existing item with same properties
      let existingItemQuery = query(
        collection(db, collectionPath),
        where("sourceBatchNumber", "==", batch.batchNumber),
        where("productType", "==", productType),
        where("bagSize", "==", sizeKgNum),
        where("pricePerKg", "==", batch.pricingData?.adjustedRicePrice || 0),
        where("status", "==", "available")
      );

      if (productType === "rice" && riceType) {
        // Add rice type filter for rice products
        existingItemQuery = query(
          collection(db, collectionPath),
          where("sourceBatchNumber", "==", batch.batchNumber),
          where("productType", "==", productType),
          where("riceType", "==", riceType),
          where("bagSize", "==", sizeKgNum),
          where("pricePerKg", "==", batch.pricingData?.adjustedRicePrice || 0),
          where("status", "==", "available")
        );
      }

      const existingSnapshot = await getDocs(existingItemQuery);

      if (!existingSnapshot.empty) {
        // Update existing item quantity
        const existingDoc = existingSnapshot.docs[0];
        const existingData = existingDoc.data();

        await updateDoc(doc(db, collectionPath, existingDoc.id), {
          quantity: (existingData.quantity || 0) + quantityNum,
          totalWeight: (existingData.totalWeight || 0) + totalWeight,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create new item
        const itemData = {
          itemName: itemName,
          productType: productType,
          bagSize: sizeKgNum,
          quantity: quantityNum,
          totalWeight: totalWeight,
          sourceBatchId: batchId,
          sourceBatchNumber: batch.batchNumber,
          originalPaddyType: batch.originalPaddyType,
          pricePerKg: batch.pricingData?.adjustedRicePrice || 0,
          recommendedSellingPrice:
            batch.pricingData?.recommendedSellingPrice || 0,
          status: "available",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: currentUser.uid,
          businessId: currentBusiness.id,
          ownerId: currentUser.uid,
          batchInfo: {
            batchNumber: batch.batchNumber,
            buyerName: batch.buyerName || "",
            originalQuantity: batch.originalQuantity,
            originalPricePerKg: batch.originalPricePerKg,
          },
        };

        if (productType === "rice" && riceType) {
          itemData.riceType = riceType;
        }

        await addDoc(collection(db, collectionPath), itemData);
      }

      // Update batch and stock totals
      const batch_write = writeBatch(db);

      // Update batch
      const batchRef = doc(
        db,
        `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/processedStock/stock`,
        batchId
      );
      batch_write.update(batchRef, {
        [`products.${productType}`]: increment(-totalWeight),
        totalQuantity: increment(-totalWeight),
        updatedAt: serverTimestamp(),
      });

      // Update stock totals
      const stockTotalsRef = doc(
        db,
        `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/stockTotals`
      );

      let stockTotalKey, baggedTotalKey, bagCountKey;

      if (productType === "rice") {
        stockTotalKey = `rice_${riceType}`;
        baggedTotalKey = `rice_${riceType}_bagged_total`;
        bagCountKey = `rice_${riceType}_bags_count`;
      } else {
        stockTotalKey = productType;
        baggedTotalKey = `${productType}_bagged_total`;
        bagCountKey = `${productType}_bags_count`;
      }

      batch_write.update(stockTotalsRef, {
        [stockTotalKey]: increment(-totalWeight),
        [baggedTotalKey]: increment(totalWeight),
        [bagCountKey]: increment(quantityNum),
        lastUpdated: serverTimestamp(),
      });

      await batch_write.commit();
      await fetchAllData();

      setBagCreationData({
        sizeKg: "",
        quantity: "",
        productType: "",
        batchId: "",
      });

      toast.success(
        `Successfully created/updated ${itemName} - ${quantityNum} bags`
      );
    } catch (error) {
      console.error("Error creating bags:", error);
      toast.error(`Failed to create bags: ${error.message}`);
    } finally {
      setIsCreatingBags(false);
    }
  };

  // Handle individual bag sale
  const handleIndividualBagSale = async () => {
    if (!selectedBag) return;

    const { customerName, customerPhone, sellingPrice, notes, quantityToSell } =
      individualBagSellData;

    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (!sellingPrice || parseFloat(sellingPrice) <= 0) {
      toast.error("Valid selling price is required");
      return;
    }

    if (
      !quantityToSell ||
      quantityToSell <= 0 ||
      quantityToSell > selectedBag.quantity
    ) {
      toast.error("Invalid quantity to sell");
      return;
    }

    const finalPrice = parseFloat(sellingPrice);
    const quantityNum = parseInt(quantityToSell);
    const totalAmount = finalPrice * selectedBag.bagSize * quantityNum;

    try {
      const batch_write = writeBatch(db);
      const collectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/stock`;

      // Update the bagged stock item
      const bagRef = doc(db, collectionPath, selectedBag.id);

      if (quantityNum === selectedBag.quantity) {
        // Sell all - mark as sold
        batch_write.update(bagRef, {
          status: "sold",
          soldAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Partial sale - reduce quantity
        batch_write.update(bagRef, {
          quantity: increment(-quantityNum),
          totalWeight: increment(-selectedBag.bagSize * quantityNum),
          updatedAt: serverTimestamp(),
        });
      }

      // Create sale record
      const saleRef = doc(
        collection(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/sales`
        )
      );
      batch_write.set(saleRef, {
        saleType: "bagged_stock",
        itemId: selectedBag.id,
        itemName: selectedBag.itemName,
        productType: selectedBag.productType,
        riceType: selectedBag.riceType || null,
        bagSize: selectedBag.bagSize,
        quantity: quantityNum,
        totalWeight: selectedBag.bagSize * quantityNum,
        sourceBatchId: selectedBag.sourceBatchId,
        sourceBatchNumber: selectedBag.sourceBatchNumber,
        originalPaddyType: selectedBag.originalPaddyType,
        costPerKg: selectedBag.pricePerKg,
        sellingPrice: finalPrice,
        totalAmount: totalAmount,
        profit:
          (finalPrice - selectedBag.pricePerKg) *
          selectedBag.bagSize *
          quantityNum,
        customerName: customerName,
        customerPhone: customerPhone,
        notes: notes,
        saleDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        businessId: currentBusiness.id,
        ownerId: currentUser.uid,
        status: "completed",
      });

      // Update stock totals
      const stockTotalsRef = doc(
        db,
        `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/stockTotals`
      );

      let baggedTotalKey, bagCountKey;

      if (selectedBag.productType === "rice") {
        baggedTotalKey = `rice_${selectedBag.riceType}_bagged_total`;
        bagCountKey = `rice_${selectedBag.riceType}_bags_count`;
      } else {
        baggedTotalKey = `${selectedBag.productType}_bagged_total`;
        bagCountKey = `${selectedBag.productType}_bags_count`;
      }

      batch_write.update(stockTotalsRef, {
        [baggedTotalKey]: increment(-selectedBag.bagSize * quantityNum),
        [bagCountKey]: increment(-quantityNum),
        lastUpdated: serverTimestamp(),
      });

      await batch_write.commit();
      await fetchAllData();

      setIndividualBagSellData({
        customerName: "",
        customerPhone: "",
        sellingPrice: 0,
        notes: "",
        quantityToSell: 1,
      });

      const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-LK", {
          style: "currency",
          currency: "LKR",
          minimumFractionDigits: 2,
        })
          .format(amount)
          .replace("LKR", "Rs.");
      };

      toast.success(
        `Successfully sold ${quantityNum} bags of ${
          selectedBag.itemName
        } for ${formatCurrency(totalAmount)}`
      );
    } catch (error) {
      console.error("Error selling bags:", error);
      toast.error(`Failed to sell bags: ${error.message}`);
    }
  };

  return {
    addBagSize,
    removeBagSize,
    createBags,
    handleIndividualBagSale,
    isCreatingBags,
  };
};
