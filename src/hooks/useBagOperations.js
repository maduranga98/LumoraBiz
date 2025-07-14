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

  // Helper function to generate product code abbreviations
  const generateProductAbbreviation = (productType, riceType) => {
    if (productType === "rice" && riceType) {
      // Rice type abbreviations
      const riceAbbreviations = {
        "Sudu Kakulu": "SK",
        "Samba Kakulu": "SAK",
        "Kiri Samba": "KS",
        "Rathu Kakulu": "RK",
        "Samba Rathu": "SR",
        Basmathi: "BS",
        "Keeri Samba": "KES",
        Madathawalu: "MD",
        Pokkali: "PK",
        "Red Basmathi": "RB",
        "White Basmathi": "WB",
        Nadu: "ND",
        "Kalu Heenati": "KH",
        Pachchaperumal: "PP",
        "At 362": "AT",
        "At 401": "AT4",
        "Bg 300": "BG3",
        "Bg 352": "BG35",
        "Bg 358": "BG38",
        "Bg 359": "BG39",
        "Bg 360": "BG36",
        "Bg 366": "BG66",
        "Bg 379-2": "BG79",
        "Bg 94-1": "BG94",
        "Bw 272-6b": "BW27",
        "Bw 451": "BW45",
        "H 4": "H4",
        "Ld 356": "LD35",
        "Ld 365": "LD36",
        "Ld 366": "LD66",
        "Ld 368": "LD68",
      };

      return (
        riceAbbreviations[riceType] || riceType.substring(0, 2).toUpperCase()
      );
    }

    // Byproduct abbreviations
    const byproductAbbreviations = {
      hunuSahal: "HS",
      kadunuSahal: "KS",
      ricePolish: "RP",
      dahaiyya: "DH",
      flour: "FL",
    };

    return (
      byproductAbbreviations[productType] ||
      productType.substring(0, 2).toUpperCase()
    );
  };

  // Helper function to extract batch reference from batch number
  const extractBatchReference = (batchNumber) => {
    if (!batchNumber) return "000";

    // Extract last 3 digits from batch number (e.g., "B250705-003" -> "003")
    const match = batchNumber.match(/(\d{3})$/);
    if (match) {
      return match[1];
    }

    // If no pattern found, use last 3 characters or pad with zeros
    const lastPart = batchNumber.slice(-3);
    return lastPart.padStart(3, "0");
  };

  // Helper function to generate unique product code
  const generateProductCode = (productType, riceType, bagSize, batchNumber) => {
    const productAbbr = generateProductAbbreviation(productType, riceType);
    const batchRef = extractBatchReference(batchNumber);

    // Format: {ProductAbbr}{BagSize}-{BatchRef}
    // Examples: SK5-003, SAK10-005, HS25-001
    return `${productAbbr}${bagSize}-${batchRef}`;
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

  // Helper function to sanitize document IDs (remove spaces and special characters)
  const sanitizeDocumentId = (text) => {
    return text
      .toLowerCase()
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .replace(/[^a-z0-9_]/g, "") // Remove special characters except underscores
      .replace(/_+/g, "_") // Replace multiple underscores with single underscore
      .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
  };

  // FIXED: Update individual product tracking with proper document references
  const updateIndividualProductTracking = async (byproducts, paddyType) => {
    try {
      console.log("📦 Updating individual product tracking...");

      const productTrackingPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/productInventory`;
      console.log("Product tracking path:", productTrackingPath);

      // Rice tracking with paddy type - FIXED: Use collection and document structure
      if (byproducts.rice && parseFloat(byproducts.rice) > 0) {
        const sanitizedPaddyType = sanitizeDocumentId(paddyType);
        const riceDocId = `rice_${sanitizedPaddyType}`;

        console.log("Updating rice document:", riceDocId);

        // FIXED: Use proper document reference
        const riceDocRef = doc(db, productTrackingPath, riceDocId);

        await setDoc(
          riceDocRef,
          {
            productType: "rice",
            subType: sanitizedPaddyType,
            originalPaddyType: paddyType, // Keep original for display
            currentStock: increment(parseFloat(byproducts.rice)),
            unitType: "kg",
            category: "main_product",
            lastUpdated: serverTimestamp(),
            metadata: {
              businessId: currentBusiness.id,
              ownerId: currentUser.uid,
              displayName: `Rice - ${paddyType}`,
            },
          },
          { merge: true }
        );
      }

      // By-products tracking - FIXED: Use proper document references
      const byproductMap = {
        hunuSahal: "hunu_sahal",
        kadunuSahal: "kadunu_sahal",
        ricePolish: "rice_polish",
        dahaiyya: "dahaiyya",
        flour: "flour",
      };

      for (const [key, value] of Object.entries(byproducts)) {
        if (key !== "rice" && value && parseFloat(value) > 0) {
          const sanitizedKey = byproductMap[key] || sanitizeDocumentId(key);

          console.log(`Updating byproduct document: ${sanitizedKey}`);

          // FIXED: Use proper document reference
          const byproductDocRef = doc(db, productTrackingPath, sanitizedKey);

          await setDoc(
            byproductDocRef,
            {
              productType: key,
              currentStock: increment(parseFloat(value)),
              unitType: "kg",
              category: "byproduct",
              lastUpdated: serverTimestamp(),
              metadata: {
                businessId: currentBusiness.id,
                ownerId: currentUser.uid,
                displayName: key.charAt(0).toUpperCase() + key.slice(1),
              },
            },
            { merge: true }
          );
        }
      }

      console.log("✅ Individual product tracking updated successfully");
    } catch (error) {
      console.error("❌ Error updating individual product tracking:", error);
      throw error;
    }
  };

  // FIXED: Update central stock totals with proper document creation
  const updateCentralStockTotals = async (byproducts, paddyType) => {
    try {
      console.log("📊 Updating central stock totals...");

      const centralStockDocPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/stockTotals`;
      console.log("Central stock path:", centralStockDocPath);

      const stockTotalsRef = doc(db, centralStockDocPath);

      try {
        // Try to update existing document first
        const stockDoc = await getDoc(stockTotalsRef);

        if (!stockDoc.exists()) {
          console.log("📋 Creating new stockTotals document...");

          // FIXED: Create initial structure for stockTotals document
          const initialData = {
            businessId: currentBusiness.id,
            ownerId: currentUser.uid,
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
            totals: {
              rice: {},
              hunuSahal: 0,
              kadunuSahal: 0,
              ricePolish: 0,
              dahaiyya: 0,
              flour: 0,
            },
          };

          // Initialize rice totals
          if (byproducts.rice && parseFloat(byproducts.rice) > 0) {
            initialData.totals.rice[paddyType.toLowerCase()] = parseFloat(
              byproducts.rice
            );
          }

          // Initialize other byproducts
          for (const [key, value] of Object.entries(byproducts)) {
            if (key !== "rice" && value && parseFloat(value) > 0) {
              initialData.totals[key] = parseFloat(value);
            }
          }

          await setDoc(stockTotalsRef, initialData);
          console.log("✅ Created new stockTotals document");
        } else {
          console.log("📝 Updating existing stockTotals document...");

          // Update existing document
          const updateData = {
            lastUpdated: serverTimestamp(),
          };

          // Update rice totals
          if (byproducts.rice && parseFloat(byproducts.rice) > 0) {
            updateData[`totals.rice.${paddyType.toLowerCase()}`] = increment(
              parseFloat(byproducts.rice)
            );
          }

          // Update other byproducts
          for (const [key, value] of Object.entries(byproducts)) {
            if (key !== "rice" && value && parseFloat(value) > 0) {
              updateData[`totals.${key}`] = increment(parseFloat(value));
            }
          }

          await updateDoc(stockTotalsRef, updateData);
          console.log("✅ Updated existing stockTotals document");
        }
      } catch (firestoreError) {
        if (firestoreError.code === "not-found") {
          console.log(
            "📋 Document not found, creating new stockTotals document..."
          );

          const initialData = {
            businessId: currentBusiness.id,
            ownerId: currentUser.uid,
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
            totals: {
              rice: {},
              hunuSahal: 0,
              kadunuSahal: 0,
              ricePolish: 0,
              dahaiyya: 0,
              flour: 0,
            },
          };

          // Set initial values for all byproducts
          if (byproducts.rice && parseFloat(byproducts.rice) > 0) {
            initialData.totals.rice[paddyType.toLowerCase()] = parseFloat(
              byproducts.rice
            );
          }

          for (const [key, value] of Object.entries(byproducts)) {
            if (key !== "rice" && value && parseFloat(value) > 0) {
              initialData.totals[key] = parseFloat(value);
            }
          }

          await setDoc(stockTotalsRef, initialData);
          console.log("✅ Created new stockTotals document");
        } else {
          throw firestoreError;
        }
      }

      // Also update individual product tracking
      await updateIndividualProductTracking(byproducts, paddyType);
    } catch (error) {
      console.error("❌ Error updating central stock totals:", error);
      throw error;
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
      // Create item name - FIXED: Use correct rice type from batch
      const riceType =
        productType === "rice"
          ? batch.paddyTypeName || batch.originalPaddyType
          : null;
      const itemName = createItemName(productType, riceType, sizeKgNum);

      console.log("📝 Creating item:", {
        productType,
        riceType,
        bagSize: sizeKgNum,
        itemName,
        batchData: batch,
      });

      // FIXED: Save directly to baggedStock collection (no subcollections)
      const collectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/stock`;

      // Check if similar item already exists
      const existingItemQuery = query(
        collection(db, collectionPath),
        where("sourceBatchNumber", "==", batch.batchNumber),
        where("productType", "==", productType),
        where("bagSize", "==", sizeKgNum),
        where("status", "==", "available")
      );

      // Add riceType filter only for rice products
      let finalQuery = existingItemQuery;
      if (productType === "rice" && riceType) {
        finalQuery = query(
          collection(db, collectionPath),
          where("sourceBatchNumber", "==", batch.batchNumber),
          where("productType", "==", productType),
          where("riceType", "==", riceType),
          where("bagSize", "==", sizeKgNum),
          where("status", "==", "available")
        );
      }

      const existingSnapshot = await getDocs(finalQuery);

      if (!existingSnapshot.empty) {
        // Update existing item quantity
        const existingDoc = existingSnapshot.docs[0];
        const existingData = existingDoc.data();

        await updateDoc(doc(db, collectionPath, existingDoc.id), {
          quantity: (existingData.quantity || 0) + quantityNum,
          totalWeight: (existingData.totalWeight || 0) + totalWeight,
          updatedAt: serverTimestamp(),
        });

        console.log("✅ Updated existing bagged item");
      } else {
        // Create new bagged item document - FIXED: Proper structure with product code
        const productCode = generateProductCode(
          productType,
          riceType,
          sizeKgNum,
          batch.batchNumber
        );

        const bagData = {
          bagSize: sizeKgNum,
          batchInfo: {
            batchNumber: batch.batchNumber,
            buyerName: batch.buyerName || "Direct Sale",
            originalPricePerKg: batch.pricingData?.adjustedRicePrice || 0,
            originalQuantity: batch.products[productType] || 0,
          },
          businessId: currentBusiness.id,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid,
          itemName,
          ownerId: currentUser.uid,
          pricePerKg: batch.pricingData?.adjustedRicePrice || 0, // ✅ Fixed: Get from pricingData
          productCode, // ✅ Added unique product code
          productType,
          quantity: quantityNum,
          recommendedSellingPrice:
            batch.pricingData?.recommendedSellingPrice || 0, // ✅ Fixed: Get from pricingData
          sourceBatchId: batchId,
          sourceBatchNumber: batch.batchNumber,
          status: "available",
          totalWeight: totalWeight,
        };

        // Add rice-specific fields only for rice products
        if (productType === "rice" && riceType) {
          bagData.riceType = riceType;
          bagData.originalPaddyType = riceType; // ✅ Use the extracted riceType instead of batch.paddyTypeName
        }

        console.log(
          "📦 Creating new bagged item with product code:",
          productCode,
          bagData
        );

        // Add the document
        await addDoc(collection(db, collectionPath), bagData);
        console.log(
          "✅ Created new bagged item with product code:",
          productCode
        );
      }

      // Update batch to reduce available quantity
      const batchDocRef = doc(
        db,
        `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/processedStock/stock`,
        batchId
      );

      await updateDoc(batchDocRef, {
        [`products.${productType}`]: increment(-totalWeight),
        updatedAt: serverTimestamp(),
      });

      console.log("✅ Updated batch quantities");

      toast.success(`${quantityNum} bags created successfully`);

      // Reset form
      setBagCreationData({
        sizeKg: "",
        quantity: "",
        productType: "",
        batchId: "",
      });

      // Refresh data
      await fetchAllData();
    } catch (error) {
      console.error("Error creating bags:", error);
      toast.error("Failed to create bags");
    } finally {
      setIsCreatingBags(false);
    }
  };

  return {
    isCreatingBags,
    addBagSize,
    removeBagSize,
    createBags,
    updateCentralStockTotals,
    updateIndividualProductTracking,
  };
};
