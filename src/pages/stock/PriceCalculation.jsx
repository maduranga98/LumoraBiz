import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import {
  collection,
  query,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  where,
  getDoc,
  setDoc,
  increment,
} from "firebase/firestore";
import { useBusiness } from "../../contexts/BusinessContext";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";
import {
  Calculator,
  ArrowLeft,
  X,
  ChevronDown,
  Zap,
  Users,
  DollarSign,
  TrendingUp,
  BarChart3,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  Save,
  Database,
  Package,
  Edit3,
  RotateCcw,
  CheckCircle,
} from "lucide-react";

const PriceCalculation = ({
  conversionData = null,
  onClose = null,
  onBack = null,
}) => {
  const { currentBusiness } = useBusiness();
  const { currentUser } = useAuth();

  // States
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [electricityUnitPrice, setElectricityUnitPrice] = useState(25);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [otherExpenses, setOtherExpenses] = useState([
    { name: "Transport Cost", amount: "" },
    { name: "Food Cost", amount: "" },
  ]);
  const [byproductRates, setByproductRates] = useState({
    hunuSahalRate: 120,
    kadunuSahalRate: 100,
    dahiyaRate: 60,
    ricePolishRate: 80,
  });
  const [riceOutputKg, setRiceOutputKg] = useState(0);
  const [profitPercentage, setProfitPercentage] = useState(10);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [secondaryStocks, setSecondaryStocks] = useState([]);
  const [selectedSecondaryStocks, setSelectedSecondaryStocks] = useState([]);
  const [isManualPriceMode, setIsManualPriceMode] = useState(false);
  const [manualRicePrice, setManualRicePrice] = useState(0);
  const [manualProfitMargin, setManualProfitMargin] = useState(0);

  const [results, setResults] = useState({
    adjustedRicePrice: 0,
    profitFromByproducts: 0,
    totalProcessingExpense: 0,
    paddyCostPer100kg: 0,
    recommendedSellingPrice: 0,
    breakdown: {
      electricityCost: 0,
      laborCost: 0,
      otherExpensesCost: 0,
      secondaryStocksCost: 0,
      expensePerKgRice: 0,
      totalCostFor100kg: 0,
    },
  });

  // ENHANCED: Generate short batch number
  const generateBatchNumber = async () => {
    try {
      // Get current date in YYMMDD format
      const date = new Date();
      const dateStr = date.toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD format

      // Get daily counter for uniqueness
      const counterDocPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/system/batchCounter`;

      try {
        const counterDoc = await getDoc(doc(db, counterDocPath));
        let dailyCounter = 1;

        if (counterDoc.exists()) {
          const data = counterDoc.data();
          const lastDate = data.lastDate;

          if (lastDate === dateStr) {
            dailyCounter = (data.counter || 0) + 1;
          } else {
            dailyCounter = 1; // Reset counter for new day
          }
        }

        // Update counter
        await setDoc(doc(db, counterDocPath), {
          lastDate: dateStr,
          counter: dailyCounter,
          updatedAt: serverTimestamp(),
        });

        // Format: B240705-001 (B + YYMMDD + 3-digit counter)
        const batchNumber = `B${dateStr}-${dailyCounter
          .toString()
          .padStart(3, "0")}`;
        return batchNumber;
      } catch (error) {
        console.error("Counter error, using fallback:", error);
        // Fallback: Use timestamp + 2-digit random
        const timeStr = date.toISOString().slice(8, 16).replace(/[-:]/g, ""); // DDHHMMSS
        const random = Math.floor(Math.random() * 100)
          .toString()
          .padStart(2, "0");
        return `B${timeStr}${random}`;
      }
    } catch (error) {
      console.error("Batch generation error:", error);
      return `B${Date.now().toString().slice(-8)}`; // Last resort
    }
  };

  // Save byproducts to buyer's purchase record
  const saveByproductsToPurchase = async (
    purchaseId,
    byproducts,
    batchNumber,
    pricingData
  ) => {
    if (!conversionData?.originalStock?.buyerId || !purchaseId) {
      console.log("❌ Missing buyerId or purchaseId");
      return;
    }

    try {
      const purchaseDocPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/buyers/${conversionData.originalStock.buyerId}/purchases/${purchaseId}`;

      await updateDoc(doc(db, purchaseDocPath), {
        byproducts: byproducts,
        batchNumber: batchNumber,
        processedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        pricingData: pricingData,
        processingExpenses: {
          electricityCost: results.breakdown.electricityCost,
          laborCost: results.breakdown.laborCost,
          secondaryStocksCost: results.breakdown.secondaryStocksCost,
          otherExpenses: results.breakdown.otherExpensesCost,
          totalProcessingCost: results.totalProcessingExpense,
        },
        secondaryStocksUsed: selectedSecondaryStocks
          .map((stock) => {
            const stockItem = secondaryStocks.find(
              (s) => s.itemId === stock.itemId
            );
            return {
              itemId: stock.itemId,
              itemName: stockItem?.itemName || "Unknown",
              usedQuantity: parseFloat(stock.usedQuantity) || 0,
              unitType: stockItem?.unitType || "units",
              averagePrice: stockItem?.averagePrice || 0,
              totalCost:
                (stockItem?.averagePrice || 0) *
                (parseFloat(stock.usedQuantity) || 0),
            };
          })
          .filter((stock) => stock.usedQuantity > 0),
      });

      console.log("✅ Byproducts saved to purchase record");
    } catch (error) {
      console.error("❌ Error saving byproducts to purchase:", error);
      console.warn("⚠️ Continuing without updating purchase record");
    }
  };

  // fetch function for secondary stocks
  const fetchSecondaryStocks = async () => {
    if (!currentUser || !currentBusiness?.id) {
      return;
    }

    try {
      const stockCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/materialStock/stock`;

      const stockQuery = query(collection(db, stockCollectionPath));
      const stockSnapshot = await getDocs(stockQuery);

      const stockData = {};
      stockSnapshot.forEach((doc) => {
        const movement = doc.data();
        const {
          itemId,
          itemName,
          unitType,
          totalQuantity,
          quantity,
          unitPrice,
          total,
          movementType,
        } = movement;

        const qty = totalQuantity || quantity || 0;
        const movementValue = total || qty * unitPrice || 0;

        if (!stockData[itemId]) {
          stockData[itemId] = {
            itemId,
            itemName: itemName || "Unknown Item",
            unitType: unitType || "units",
            currentStock: 0,
            averagePrice: 0,
            totalValue: 0,
            totalInValue: 0,
            totalInQty: 0,
          };
        }

        if (movementType === "IN") {
          stockData[itemId].currentStock += qty;
          stockData[itemId].totalInValue += movementValue;
          stockData[itemId].totalInQty += qty;
        } else if (movementType === "OUT") {
          stockData[itemId].currentStock -= qty;
        }

        stockData[itemId].averagePrice =
          stockData[itemId].totalInQty > 0
            ? stockData[itemId].totalInValue / stockData[itemId].totalInQty
            : 0;
      });

      const availableStocks = Object.values(stockData).filter(
        (stock) => stock.currentStock > 0
      );

      setSecondaryStocks(availableStocks);
      console.log("📦 Loaded secondary stocks:", availableStocks);
    } catch (error) {
      console.error("Error fetching secondary stocks:", error);
      toast.error("Failed to load secondary stocks");
    }
  };

  // ENHANCED: Get current price values (calculated or manual) - Manual price is FINAL price
  const getCurrentPriceData = () => {
    if (isManualPriceMode) {
      return {
        ricePrice: manualRicePrice, // This is the FINAL rice price
        sellingPrice: manualRicePrice * (1 + manualProfitMargin / 100),
        profitMargin: manualProfitMargin,
        isManual: true,
        finalRicePrice: manualRicePrice, // Explicitly mark as final price
      };
    } else {
      return {
        ricePrice: results.adjustedRicePrice,
        sellingPrice: results.recommendedSellingPrice,
        profitMargin: profitPercentage,
        isManual: false,
        finalRicePrice: results.adjustedRicePrice,
      };
    }
  };

  // Toggle between calculated and manual price mode
  const togglePriceMode = () => {
    if (!isManualPriceMode) {
      setManualRicePrice(results.adjustedRicePrice);
      setManualProfitMargin(profitPercentage);
    }
    setIsManualPriceMode(!isManualPriceMode);
  };

  // Reset to calculated price
  const resetToCalculatedPrice = () => {
    setIsManualPriceMode(false);
    setManualRicePrice(0);
    setManualProfitMargin(0);
  };

  const addSecondaryStock = () => {
    if (secondaryStocks.length === 0) return;
    setSelectedSecondaryStocks((prev) => [
      ...prev,
      { itemId: "", quantity: "", usedQuantity: "" },
    ]);
  };

  const removeSecondaryStock = (index) => {
    setSelectedSecondaryStocks((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSelectedSecondaryStock = (index, field, value) => {
    setSelectedSecondaryStocks((prev) =>
      prev.map((stock, i) =>
        i === index ? { ...stock, [field]: value } : stock
      )
    );
  };

  // ENHANCED: Update central stock with categories
  const updateCentralStockTotals = async (
    byproducts,
    paddyType = "unknown"
  ) => {
    try {
      console.log("📊 Updating central stock totals with categorization...");

      const centralStockDocPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/centralStock`;

      // Categorize products properly
      const stockUpdates = {};

      // Rice categorization by paddy type
      if (byproducts.rice && parseFloat(byproducts.rice) > 0) {
        const riceKey = `rice.${paddyType.toLowerCase()}`;
        stockUpdates[`totals.${riceKey}`] = increment(
          parseFloat(byproducts.rice)
        );
        stockUpdates[`lastUpdated.${riceKey}`] = serverTimestamp();
        console.log(`📈 Will increment ${riceKey}: +${byproducts.rice} kg`);
      }

      // Byproducts categorization
      const byproductCategories = {
        hunuSahal: "byproducts.hunuSahal",
        kadunuSahal: "byproducts.kadunuSahal",
        ricePolish: "byproducts.ricePolish",
        dahaiyya: "byproducts.dahaiyya",
        flour: "byproducts.flour",
      };

      for (const [productKey, quantity] of Object.entries(byproducts)) {
        if (byproductCategories[productKey] && parseFloat(quantity) > 0) {
          const categoryKey = byproductCategories[productKey];
          stockUpdates[`totals.${categoryKey}`] = increment(
            parseFloat(quantity)
          );
          stockUpdates[`lastUpdated.${categoryKey}`] = serverTimestamp();
          console.log(`📈 Will increment ${categoryKey}: +${quantity} kg`);
        }
      }

      if (Object.keys(stockUpdates).length > 0) {
        // Add metadata
        stockUpdates["metadata.lastProcessedBatch"] =
          conversionData?.originalStock?.stockId || null;
        stockUpdates["metadata.lastProcessedAt"] = serverTimestamp();
        stockUpdates["metadata.lastPaddyType"] = paddyType;

        try {
          await updateDoc(doc(db, centralStockDocPath), stockUpdates);
          console.log("✅ Updated central stock totals");
        } catch (error) {
          if (error.code === "not-found") {
            console.log("📝 Creating new central stock document...");

            // Create initial structure
            const initialData = {
              totals: {
                rice: {},
                byproducts: {
                  hunuSahal: 0,
                  kadunuSahal: 0,
                  ricePolish: 0,
                  dahaiyya: 0,
                  flour: 0,
                },
              },
              lastUpdated: {},
              metadata: {
                businessId: currentBusiness.id,
                ownerId: currentUser.uid,
                stockType: "central_totals",
                status: "active",
                createdBy: currentUser.uid,
                createdAt: serverTimestamp(),
                lastProcessedBatch:
                  conversionData?.originalStock?.stockId || null,
                lastPaddyType: paddyType,
              },
            };

            // Apply the updates to initial data
            for (const [key, value] of Object.entries(stockUpdates)) {
              if (key.startsWith("totals.")) {
                const path = key.replace("totals.", "").split(".");
                let obj = initialData.totals;
                for (let i = 0; i < path.length - 1; i++) {
                  if (!obj[path[i]]) obj[path[i]] = {};
                  obj = obj[path[i]];
                }
                const finalKey = path[path.length - 1];
                const originalKey = Object.keys(byproducts).find((k) =>
                  key.includes(k)
                );
                obj[finalKey] = originalKey
                  ? parseFloat(byproducts[originalKey])
                  : 0;
              }
            }

            await setDoc(doc(db, centralStockDocPath), initialData);
            console.log("✅ Created new central stock document");
          } else {
            throw error;
          }
        }
      }

      // Also update individual product tracking
      await updateIndividualProductTracking(byproducts, paddyType);
    } catch (error) {
      console.error("❌ Error updating central stock totals:", error);
      throw error;
    }
  };

  // ENHANCED: Individual product tracking for detailed inventory
  const updateIndividualProductTracking = async (byproducts, paddyType) => {
    try {
      console.log("📦 Updating individual product tracking...");

      const productTrackingPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/productInventory`;

      // Rice tracking with paddy type
      if (byproducts.rice && parseFloat(byproducts.rice) > 0) {
        const riceDocPath = `${productTrackingPath}/rice_${paddyType.toLowerCase()}`;

        await setDoc(
          doc(db, riceDocPath),
          {
            productType: "rice",
            subType: paddyType.toLowerCase(),
            currentStock: increment(parseFloat(byproducts.rice)),
            unitType: "kg",
            category: "main_product",
            lastUpdated: serverTimestamp(),
            metadata: {
              businessId: currentBusiness.id,
              ownerId: currentUser.uid,
              originalPaddyType: paddyType,
            },
          },
          { merge: true }
        );
      }

      // Byproducts tracking
      const byproductItems = [
        { key: "hunuSahal", name: "Hunu Sahal", category: "byproduct" },
        { key: "kadunuSahal", name: "Kadunu Sahal", category: "byproduct" },
        { key: "ricePolish", name: "Rice Polish", category: "byproduct" },
        { key: "dahaiyya", name: "Dahaiyya", category: "byproduct" },
        { key: "flour", name: "Flour", category: "byproduct" },
      ];

      for (const item of byproductItems) {
        if (byproducts[item.key] && parseFloat(byproducts[item.key]) > 0) {
          const productDocPath = `${productTrackingPath}/${item.key}`;

          await setDoc(
            doc(db, productDocPath),
            {
              productType: "byproduct",
              subType: item.key,
              displayName: item.name,
              currentStock: increment(parseFloat(byproducts[item.key])),
              unitType: "kg",
              category: item.category,
              lastUpdated: serverTimestamp(),
              metadata: {
                businessId: currentBusiness.id,
                ownerId: currentUser.uid,
                sourcePaddyType: paddyType,
              },
            },
            { merge: true }
          );
        }
      }

      console.log("✅ Individual product tracking updated");
    } catch (error) {
      console.error("❌ Error updating individual product tracking:", error);
    }
  };

  // ENHANCED: Find existing batch with same price or create new one
  const findOrCreateBatch = async (byproducts, batchNumber, pricingData) => {
    try {
      console.log("🔍 Creating batch with enhanced categorization...");

      const processedStockPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/processedStock/stock`;
      const currentPriceData = getCurrentPriceData();
      const paddyType = conversionData?.originalStock?.paddyType || "mixed";

      // Always create new batch with short batch number and proper categorization
      console.log("📝 Creating new batch with enhanced data structure...");

      const validProducts = {};
      Object.entries(byproducts).forEach(([key, value]) => {
        if (parseFloat(value) > 0) {
          validProducts[key] = parseFloat(value);
        }
      });

      // Enhanced product categorization
      const categorizedProducts = {
        rice: {
          [paddyType.toLowerCase()]: validProducts.rice || 0,
        },
        byproducts: {
          hunuSahal: validProducts.hunuSahal || 0,
          kadunuSahal: validProducts.kadunuSahal || 0,
          ricePolish: validProducts.ricePolish || 0,
          dahaiyya: validProducts.dahaiyya || 0,
          flour: validProducts.flour || 0,
        },
      };

      const safeValue = (value, defaultValue = null) => {
        return value !== undefined && value !== null ? value : defaultValue;
      };

      const batchData = {
        batchNumber: batchNumber,
        stockType: "processed_batch",
        status: "available",

        // Enhanced product structure
        products: validProducts, // Keep original for compatibility
        categorizedProducts: categorizedProducts, // New categorized structure
        paddyType: paddyType,
        totalQuantity: getTotalConverted(),

        // Enhanced pricing data with manual price support
        pricingData: {
          ...pricingData,
          finalRicePrice: currentPriceData.finalRicePrice,
          isManualPrice: currentPriceData.isManual,
          originalCalculatedPrice: results.adjustedRicePrice,
          appliedPrice: currentPriceData.ricePrice,
          recommendedSellingPrice: currentPriceData.sellingPrice,
          profitMargin: currentPriceData.profitMargin,
          calculatedAt: serverTimestamp(),
        },

        processingConfig: {
          electricityUnitPrice: electricityUnitPrice,
          selectedEmployees: selectedEmployees,
          selectedSecondaryStocks: selectedSecondaryStocks
            .map((stock) => {
              const stockItem = secondaryStocks.find(
                (s) => s.itemId === stock.itemId
              );
              return {
                itemId: stock.itemId,
                itemName: stockItem?.itemName || "Unknown",
                usedQuantity: parseFloat(stock.usedQuantity) || 0,
                unitType: stockItem?.unitType || "units",
                averagePrice: stockItem?.averagePrice || 0,
                totalCost:
                  (stockItem?.averagePrice || 0) *
                  (parseFloat(stock.usedQuantity) || 0),
              };
            })
            .filter((stock) => stock.usedQuantity > 0),
          otherExpenses: otherExpenses,
          byproductRates: byproductRates,
        },

        // Enhanced metadata
        metadata: {
          paddyType: paddyType,
          originalQuantity: conversionData?.originalStock?.originalQuantity,
          processingDate: new Date().toISOString().slice(0, 10),
          businessId: currentBusiness.id,
          ownerId: currentUser.uid,
          batchVersion: "2.0", // Version for tracking enhancements
        },

        ...(conversionData?.originalStock?.buyerId && {
          buyerId: conversionData.originalStock.buyerId,
        }),
        ...(conversionData?.originalStock?.buyerName && {
          buyerName: conversionData.originalStock.buyerName,
        }),
        ...(conversionData?.originalStock?.purchaseId && {
          purchaseId: conversionData.originalStock.purchaseId,
        }),
        ...(conversionData?.originalStock?.paymentId && {
          paymentId: conversionData.originalStock.paymentId,
        }),
        ...(conversionData?.originalStock?.stockId && {
          rawStockId: conversionData.originalStock.stockId,
        }),

        ...(conversionData?.originalStock?.paddyType && {
          originalPaddyType: conversionData.originalStock.paddyType,
        }),
        ...(conversionData?.originalStock?.originalQuantity && {
          originalQuantity: conversionData.originalStock.originalQuantity,
        }),
        ...(conversionData?.originalStock?.pricePerKg && {
          originalPricePerKg: conversionData.originalStock.pricePerKg,
        }),

        electricityData: {
          startNumber: safeValue(conversionData.startElectricityNumber, 0),
          endNumber: safeValue(conversionData.endElectricityNumber, 0),
          consumption:
            parseFloat(conversionData.endElectricityNumber || 0) -
            parseFloat(conversionData.startElectricityNumber || 0),
          cost: results.breakdown.electricityCost,
        },

        businessId: currentBusiness.id,
        ownerId: currentUser.uid,

        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        processedAt: serverTimestamp(),
      };

      console.log("📝 Enhanced batch data prepared:", batchData);

      const docRef = await addDoc(
        collection(db, processedStockPath),
        batchData
      );

      console.log(`✅ Created new enhanced batch: ${batchNumber}`);

      return {
        id: docRef.id,
        batchNumber: batchNumber,
        merged: false,
        ...batchData,
      };
    } catch (error) {
      console.error("❌ Error in enhanced findOrCreateBatch:", error);
      throw error;
    }
  };

  const updateSecondaryStockQuantities = async () => {
    if (selectedSecondaryStocks.length === 0) return;

    try {
      console.log("📦 Updating secondary stock quantities...");

      const stockCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/materialStock/movements`;

      for (const stock of selectedSecondaryStocks) {
        const usedQuantity = parseFloat(stock.usedQuantity);
        if (usedQuantity > 0) {
          const stockItem = secondaryStocks.find(
            (s) => s.itemId === stock.itemId
          );

          if (stockItem) {
            await addDoc(collection(db, stockCollectionPath), {
              itemId: stock.itemId,
              itemName: stockItem.itemName,
              unitType: stockItem.unitType,
              quantity: usedQuantity,
              totalQuantity: usedQuantity,
              unitPrice: stockItem.averagePrice,
              total: stockItem.averagePrice * usedQuantity,
              movementType: "OUT",
              reason: "Used in rice processing",
              batchNumber: await generateBatchNumber(),
              processedBatchReference:
                conversionData?.originalStock?.stockId || null,
              businessId: currentBusiness.id,
              ownerId: currentUser.uid,
              createdBy: currentUser.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });

            console.log(
              `✅ Recorded OUT movement for ${stockItem.itemName}: ${usedQuantity} ${stockItem.unitType}`
            );
          }
        }
      }
    } catch (error) {
      console.error("❌ Error updating secondary stock quantities:", error);
    }
  };

  // Update raw stock status to processed (optional - only if raw stock exists)
  const updateRawStockStatus = async (batchId, batchNumber) => {
    if (!conversionData?.originalStock?.stockId) {
      console.log("ℹ️ No raw stock ID provided - skipping raw stock update");
      return;
    }
    const updateRawStockStatus = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/rawProcessedStock/stock`;

    try {
      console.log(
        `🔍 Attempting to update raw stock: ${conversionData.originalStock.stockId}`
      );

      await updateDoc(
        doc(db, updateRawStockStatus, conversionData.originalStock.stockId),
        {
          status: "processed",
          processedBatchId: batchId,
          batchNumber: batchNumber,
          processedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          pricingData: {
            adjustedRicePrice: results.adjustedRicePrice,
            recommendedSellingPrice: results.recommendedSellingPrice,
            profitFromByproducts: results.profitFromByproducts,
          },
        }
      );
    } catch (error) {
      console.log("ℹ️ Raw stock update skipped:", error.message);
    }
  };

  // ENHANCED: MAIN SAVE FUNCTION with all improvements
  const handleSaveData = async () => {
    console.log("💾 Save Data with enhancements clicked");

    if (!currentUser || !currentBusiness?.id) {
      toast.error("Authentication or business context missing");
      return;
    }

    if (isManualPriceMode && (!manualRicePrice || manualRicePrice <= 0)) {
      toast.error("Please enter a valid manual rice price");
      return;
    }

    if (!conversionData) {
      toast.error("No conversion data available to save");
      return;
    }

    setSaving(true);

    try {
      const batchNumber = await generateBatchNumber(); // Use new short batch generator
      console.log("🏷️ Generated short batch number:", batchNumber);

      const paddyType = conversionData?.originalStock?.paddyType || "mixed";
      const currentPriceData = getCurrentPriceData();

      const byproducts = {
        rice: conversionData.rice || "0",
        hunuSahal: conversionData.hunuSahal || "0",
        kadunuSahal: conversionData.kadunuSahal || "0",
        ricePolish: conversionData.ricePolish || "0",
        dahaiyya: conversionData.dahaiyya || "0",
        flour: conversionData.flour || "0",
      };

      console.log("📦 Prepared byproducts:", byproducts);

      const enhancedPricingData = {
        adjustedRicePrice: results.adjustedRicePrice,
        recommendedSellingPrice: results.recommendedSellingPrice,
        profitPercentage: profitPercentage,
        profitFromByproducts: results.profitFromByproducts,
        totalProcessingExpense: results.totalProcessingExpense,
        paddyCostPer100kg: results.paddyCostPer100kg,
        riceOutputKg: riceOutputKg,
        breakdown: results.breakdown,
        byproductRates: byproductRates,
        electricityUnitPrice: electricityUnitPrice,
        calculatedAt: new Date().toISOString(),
        finalRicePrice: currentPriceData.finalRicePrice,
        isManualPrice: currentPriceData.isManual,
        manualPriceData: currentPriceData.isManual
          ? {
              manualRicePrice: manualRicePrice,
              manualProfitMargin: manualProfitMargin,
              originalCalculatedPrice: results.adjustedRicePrice,
              priceOverrideReason: "Manual price adjustment",
              overrideTimestamp: new Date().toISOString(),
            }
          : null,
        appliedPrice: currentPriceData.ricePrice,
        paddyType: paddyType,
      };

      console.log("🏭 Creating enhanced batch with categorization...");
      const batchDocument = await findOrCreateBatch(
        byproducts,
        batchNumber,
        enhancedPricingData
      );

      console.log("📊 Updating central stock with categorization...");
      await updateCentralStockTotals(byproducts, paddyType);

      console.log("📦 Updating secondary stock quantities...");
      await updateSecondaryStockQuantities();

      if (conversionData?.originalStock?.purchaseId) {
        console.log("📝 Updating purchase record with enhanced data...");
        await saveByproductsToPurchase(
          conversionData.originalStock.purchaseId,
          {
            ...byproducts,
            paddyType: paddyType,
            finalRicePrice: currentPriceData.finalRicePrice,
            electricityData: {
              startNumber: conversionData.startElectricityNumber,
              endNumber: conversionData.endElectricityNumber,
              consumption:
                parseFloat(conversionData.endElectricityNumber) -
                parseFloat(conversionData.startElectricityNumber),
              cost: results.breakdown.electricityCost,
            },
            batchId: batchDocument.id,
            totalProcessedQuantity: getTotalConverted(),
          },
          batchNumber,
          enhancedPricingData
        );
      }

      console.log("📦 Checking for raw stock to update...");
      await updateRawStockStatus(batchDocument.id, batchDocument.batchNumber);

      const successMessage = `Batch ${batchNumber} created successfully! 
        ${paddyType} Rice: ${formatCurrency(currentPriceData.finalRicePrice)}/kg
        ${currentPriceData.isManual ? "(Manual Price Applied)" : ""}`;

      toast.success(successMessage);

      console.log("✅ All enhanced data saved successfully");
    } catch (error) {
      console.error("❌ Error in enhanced handleSaveData:", error);
      toast.error("Failed to save processing data. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Calculate total converted quantity
  const getTotalConverted = () => {
    if (!conversionData) return 0;
    return Object.entries(conversionData)
      .filter(
        ([key]) =>
          !key.includes("Electric") &&
          !key.includes("original") &&
          !key.includes("batch")
      )
      .reduce((total, [_, value]) => {
        const num = parseFloat(value) || 0;
        return total + num;
      }, 0);
  };

  // Fetch employees
  const fetchEmployees = async () => {
    if (!currentUser || !currentBusiness?.id) {
      setLoading(false);
      return;
    }

    try {
      const employeesCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/employees`;
      const employeesQuery = query(collection(db, employeesCollectionPath));
      const querySnapshot = await getDocs(employeesQuery);

      const employeesList = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        employeesList.push({
          employeeId: doc.id,
          name: data.name || data.employeeName || "Unknown",
          payRate: data.payRate || data.salary || data.dailyRate || 0,
          ...data,
        });
      });

      setEmployees(employeesList);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  // Calculate everything
  const calculateAll = () => {
    if (!conversionData) return;

    const originalStock = conversionData.originalStock || {};
    const currentRiceOutput =
      riceOutputKg > 0 ? riceOutputKg : parseFloat(conversionData.rice) || 0;

    const actualQuantities = {
      hunuSahal: parseFloat(conversionData.hunuSahal) || 0,
      kadunuSahal: parseFloat(conversionData.kadunuSahal) || 0,
      dahaiyya: parseFloat(conversionData.dahaiyya) || 0,
      ricePolish: parseFloat(conversionData.ricePolish) || 0,
      rice: parseFloat(conversionData.rice) || 0,
    };

    const totalPaddyProcessed = originalStock.originalQuantity || 100;
    const paddyPricePerKg = originalStock.pricePerKg || 0;

    const totalPaddyCost = totalPaddyProcessed * paddyPricePerKg;

    const startReading = parseFloat(conversionData.startElectricityNumber) || 0;
    const endReading = parseFloat(conversionData.endElectricityNumber) || 0;
    const electricityCost = (endReading - startReading) * electricityUnitPrice;

    const laborCost = selectedEmployees.reduce((total, emp) => {
      const employee = employees.find((e) => e.employeeId === emp.employeeId);
      const dailyRate = employee ? employee.payRate : 0;
      const days = parseFloat(emp.days) || 0;
      return total + dailyRate * days;
    }, 0);

    const secondaryStocksCost = calculateSecondaryStocksCost();

    const otherExpensesCost = otherExpenses.reduce((total, expense) => {
      return total + (parseFloat(expense.amount) || 0);
    }, 0);

    const totalProcessingCost =
      electricityCost + laborCost + secondaryStocksCost + otherExpensesCost;

    const totalByproductRevenue =
      actualQuantities.hunuSahal * byproductRates.hunuSahalRate +
      actualQuantities.dahaiyya * byproductRates.dahiyaRate +
      actualQuantities.ricePolish * byproductRates.ricePolishRate;

    const totalRiceQty = currentRiceOutput;

    const ricePrice =
      totalRiceQty > 0
        ? (totalPaddyCost + totalProcessingCost - totalByproductRevenue) /
          totalRiceQty
        : 0;

    const recommendedSellingPrice = ricePrice * (1 + profitPercentage / 100);

    const detailedBreakdown = {
      totalPaddyCost,
      totalProcessingCost,
      totalByproductRevenue,
      totalRiceQty,

      electricityCost,
      laborCost,
      secondaryStocksCost,
      otherExpensesCost,

      totalPaddyProcessed,
      paddyPricePerKg,

      byproductDetails: {
        hunuSahal: {
          quantity: actualQuantities.hunuSahal,
          rate: byproductRates.hunuSahalRate,
          revenue: actualQuantities.hunuSahal * byproductRates.hunuSahalRate,
        },
        dahaiyya: {
          quantity: actualQuantities.dahaiyya,
          rate: byproductRates.dahiyaRate,
          revenue: actualQuantities.dahaiyya * byproductRates.dahiyaRate,
        },
        ricePolish: {
          quantity: actualQuantities.ricePolish,
          rate: byproductRates.ricePolishRate,
          revenue: actualQuantities.ricePolish * byproductRates.ricePolishRate,
        },
        kadunuSahal: {
          quantity: actualQuantities.kadunuSahal,
          rate: byproductRates.kadunuSahalRate,
          revenue:
            actualQuantities.kadunuSahal * byproductRates.kadunuSahalRate,
          excluded: true,
        },
      },

      finalCalculation: {
        totalPaddyCost,
        totalProcessingCost,
        totalByproductRevenue,
        netCost: totalPaddyCost + totalProcessingCost - totalByproductRevenue,
        totalRiceQty,
        pricePerKg: ricePrice,
        formula:
          "(TotalPaddyCost + TotalProcessingCost - TotalByproductRevenue) / TotalRiceQty",
      },

      paddyCostFor100kg: totalPaddyCost,
      expensePerKgRice: totalProcessingCost / totalRiceQty,
      byproductRevenue100kg: totalByproductRevenue,
    };

    setResults({
      adjustedRicePrice: ricePrice,
      profitFromByproducts: totalByproductRevenue,
      totalProcessingExpense: totalProcessingCost,
      paddyCostPer100kg: totalPaddyCost,
      recommendedSellingPrice,
      breakdown: detailedBreakdown,
    });
  };

  const calculateSecondaryStocksCost = () => {
    return selectedSecondaryStocks.reduce((total, stock) => {
      const stockItem = secondaryStocks.find((s) => s.itemId === stock.itemId);
      const averagePrice = stockItem ? stockItem.averagePrice : 0;
      const usedQuantity = parseFloat(stock.usedQuantity) || 0;
      return total + averagePrice * usedQuantity;
    }, 0);
  };

  // Event handlers
  const addEmployee = () => {
    if (employees.length === 0) return;
    setSelectedEmployees((prev) => [...prev, { employeeId: "", days: "" }]);
  };

  const removeEmployee = (index) => {
    setSelectedEmployees((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSelectedEmployee = (index, field, value) => {
    setSelectedEmployees((prev) =>
      prev.map((emp, i) => (i === index ? { ...emp, [field]: value } : emp))
    );
  };

  const updateOtherExpense = (index, field, value) => {
    setOtherExpenses((prev) =>
      prev.map((expense, i) =>
        i === index ? { ...expense, [field]: value } : expense
      )
    );
  };

  const addOtherExpense = () => {
    setOtherExpenses((prev) => [...prev, { name: "", amount: "" }]);
  };

  const removeOtherExpense = (index) => {
    if (otherExpenses.length > 1) {
      setOtherExpenses((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleByproductRateChange = (product, value) => {
    setByproductRates((prev) => ({
      ...prev,
      [product]: parseFloat(value) || 0,
    }));
  };

  // Effects
  useEffect(() => {
    if (currentUser && currentBusiness?.id) {
      fetchEmployees();
      fetchSecondaryStocks();
    }
  }, [currentUser, currentBusiness]);

  useEffect(() => {
    if (conversionData && riceOutputKg === 0) {
      setRiceOutputKg(parseFloat(conversionData.rice) || 0);
    }
  }, [conversionData]);

  useEffect(() => {
    calculateAll();
  }, [
    conversionData,
    electricityUnitPrice,
    selectedEmployees,
    selectedSecondaryStocks,
    otherExpenses,
    employees,
    byproductRates,
    secondaryStocks,
    riceOutputKg,
    profitPercentage,
  ]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    })
      .format(amount)
      .replace("LKR", "Rs.");
  };

  if (!currentUser || !currentBusiness?.id) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <p className="text-yellow-700 text-sm">
            Please log in and select a business to access price calculation.
          </p>
        </div>
      </div>
    );
  }

  // Get current price data for display
  const currentPriceData = getCurrentPriceData();

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Responsive Header */}
      <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calculator className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                Rice Cost Calculator
              </h1>
              <p className="text-xs sm:text-sm text-gray-600">
                Calculate optimal rice pricing with categorized stock tracking
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm flex-1 sm:flex-initial justify-center"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
            <button
              onClick={handleSaveData}
              disabled={saving}
              className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50 flex-1 sm:flex-initial justify-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Data</span>
                </>
              )}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center space-x-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex-1 sm:flex-initial justify-center"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Results Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rice Cost Result with Manual Override */}
        <div className="lg:col-span-2 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <h2 className="text-base sm:text-lg font-semibold text-yellow-800">
                Final Rice Price per 1kg
              </h2>
              {currentPriceData.isManual && (
                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium whitespace-nowrap">
                  Manual Override
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={togglePriceMode}
                className={`flex items-center space-x-1 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm transition-colors ${
                  isManualPriceMode
                    ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                }`}
              >
                <Edit3 className="w-3 h-3" />
                <span className="hidden sm:inline">
                  {isManualPriceMode ? "Manual Mode" : "Set Manual Price"}
                </span>
                <span className="sm:hidden">
                  {isManualPriceMode ? "Manual" : "Manual"}
                </span>
              </button>
              {isManualPriceMode && (
                <button
                  onClick={resetToCalculatedPrice}
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 text-xs sm:text-sm"
                  title="Reset to calculated price"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="flex items-center space-x-1 text-yellow-700 hover:text-yellow-800 text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">
                  {showBreakdown ? "Hide" : "Show"} breakdown
                </span>
                <span className="sm:hidden">
                  {showBreakdown ? "Hide" : "Show"}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    showBreakdown ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Manual Price Input Section */}
          {isManualPriceMode && (
            <div className="mb-4 p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <Edit3 className="w-4 h-4 text-orange-600" />
                <h3 className="font-medium text-orange-800 text-sm sm:text-base">
                  Manual Final Rice Price
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-orange-700 mb-1">
                    Final Rice Price per kg (Rs.)
                  </label>
                  <input
                    type="number"
                    value={manualRicePrice}
                    onChange={(e) =>
                      setManualRicePrice(parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter final rice price"
                    step="0.01"
                  />
                  <p className="text-xs text-orange-600 mt-1">
                    Calculated: {formatCurrency(results.adjustedRicePrice)}
                  </p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-orange-700 mb-1">
                    Additional Profit Margin (%)
                  </label>
                  <input
                    type="number"
                    value={manualProfitMargin}
                    onChange={(e) =>
                      setManualProfitMargin(parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter additional margin"
                    step="0.1"
                  />
                  <p className="text-xs text-orange-600 mt-1">
                    Selling Price:{" "}
                    {formatCurrency(
                      manualRicePrice * (1 + manualProfitMargin / 100)
                    )}
                  </p>
                </div>
              </div>

              {manualRicePrice > 0 && (
                <div className="mt-3 p-3 bg-white rounded border">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-800">
                      Manual Price Summary
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <span className="text-gray-600">Calculated Price:</span>
                      <span className="ml-2 font-medium">
                        {formatCurrency(results.adjustedRicePrice)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Final Rice Price:</span>
                      <span className="ml-2 font-medium text-orange-600">
                        {formatCurrency(manualRicePrice)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Difference:</span>
                      <span
                        className={`ml-2 font-medium ${
                          manualRicePrice > results.adjustedRicePrice
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {manualRicePrice > results.adjustedRicePrice ? "+" : ""}
                        {formatCurrency(
                          manualRicePrice - results.adjustedRicePrice
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Selling Price:</span>
                      <span className="ml-2 font-medium text-green-600">
                        {formatCurrency(
                          manualRicePrice * (1 + manualProfitMargin / 100)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Current Price Display */}
          <div className="text-2xl sm:text-3xl font-bold text-yellow-900 mb-2">
            {formatCurrency(currentPriceData.ricePrice)}
          </div>
          <p className="text-xs sm:text-sm text-yellow-700">
            {currentPriceData.isManual
              ? "Manual final rice price - ready for sale"
              : "Calculated rice cost - add margin for selling"}
          </p>

          {/* Show paddy type */}
          {conversionData?.originalStock?.paddyType && (
            <div className="mt-2 inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              {conversionData.originalStock.paddyType} Rice
            </div>
          )}

          {/* Compact Breakdown */}
          {showBreakdown && (
            <div className="mt-4 p-3 sm:p-4 bg-white rounded-lg border space-y-4">
              <div className="text-sm font-medium text-gray-800 mb-3 border-b pb-2">
                📊 Rice Price Calculation:
              </div>

              {/* Show calculation method */}
              {currentPriceData.isManual ? (
                <div className="bg-orange-50 p-3 sm:p-4 rounded-lg border-2 border-orange-200">
                  <h4 className="text-sm font-semibold text-orange-800 mb-2">
                    🎯 Manual Final Price Override Active
                  </h4>
                  <div className="bg-white p-3 rounded border">
                    <div className="grid grid-cols-1 gap-2 text-xs sm:text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">
                          Original Calculated Price:
                        </span>
                        <span className="font-medium text-gray-500 line-through">
                          {formatCurrency(results.adjustedRicePrice)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">
                          Manual Final Price:
                        </span>
                        <span className="font-bold text-orange-600">
                          {formatCurrency(manualRicePrice)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">
                          Additional Margin ({manualProfitMargin}%):
                        </span>
                        <span className="font-medium">
                          +
                          {formatCurrency(
                            (manualRicePrice * manualProfitMargin) / 100
                          )}
                        </span>
                      </div>
                      <div className="border-t-2 pt-2 flex justify-between items-center border-orange-300">
                        <span className="text-orange-800 font-bold">
                          Final Selling Price:
                        </span>
                        <span className="text-orange-800 font-bold text-base sm:text-lg">
                          {formatCurrency(
                            manualRicePrice * (1 + manualProfitMargin / 100)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-indigo-50 p-3 sm:p-4 rounded-lg border-2 border-indigo-200">
                  <h4 className="text-xs sm:text-sm font-semibold text-indigo-800 mb-2">
                    🎯 Formula: ricePrice = (TotalPaddyCost +
                    TotalProcessingCost - TotalByproductRevenue) / TotalRiceQty
                  </h4>
                  <div className="bg-white p-3 rounded border font-mono text-xs sm:text-sm overflow-x-auto">
                    <div className="grid grid-cols-1 gap-2 min-w-max">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Paddy Cost:</span>
                        <span className="font-semibold">
                          {results.breakdown.totalPaddyProcessed}kg ×{" "}
                          {formatCurrency(results.breakdown.paddyPricePerKg)} =
                          <span className="text-blue-600 ml-1">
                            {formatCurrency(results.breakdown.totalPaddyCost)}
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Total Processing Cost:
                        </span>
                        <span className="text-purple-600 font-semibold">
                          +{" "}
                          {formatCurrency(
                            results.breakdown.totalProcessingCost
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Total Byproduct Revenue:
                        </span>
                        <span className="text-green-600 font-semibold">
                          -{" "}
                          {formatCurrency(
                            results.breakdown.totalByproductRevenue
                          )}
                        </span>
                      </div>
                      <div className="border-t pt-2 flex justify-between">
                        <span className="text-gray-600">Net Cost:</span>
                        <span className="font-semibold">
                          ={" "}
                          {formatCurrency(
                            results.breakdown.finalCalculation.netCost
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Total Rice Quantity:
                        </span>
                        <span className="font-semibold">
                          ÷ {results.breakdown.totalRiceQty}kg
                        </span>
                      </div>
                      <div className="border-t-2 pt-2 flex justify-between border-indigo-300">
                        <span className="text-indigo-800 font-bold">
                          Final Rice Price:
                        </span>
                        <span className="text-indigo-800 font-bold text-base sm:text-lg">
                          = {formatCurrency(results.adjustedRicePrice)}/kg
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Breakdown Sections - Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* 1. Paddy Cost Breakdown */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">
                    1️⃣ Total Paddy Cost
                  </h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity Processed:</span>
                      <span>{results.breakdown.totalPaddyProcessed}kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price per kg:</span>
                      <span>
                        {formatCurrency(results.breakdown.paddyPricePerKg)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span className="text-blue-700">Total Cost:</span>
                      <span className="text-blue-700">
                        {formatCurrency(results.breakdown.totalPaddyCost)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Processing Cost Breakdown */}
                <div className="bg-purple-50 p-3 rounded-lg">
                  <h4 className="text-sm font-semibold text-purple-800 mb-2">
                    2️⃣ Total Processing Cost
                  </h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Electricity:</span>
                      <span>
                        {formatCurrency(results.breakdown.electricityCost)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Labor:</span>
                      <span>{formatCurrency(results.breakdown.laborCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Secondary Stocks:</span>
                      <span>
                        {formatCurrency(results.breakdown.secondaryStocksCost)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Other Expenses:</span>
                      <span>
                        {formatCurrency(results.breakdown.otherExpensesCost)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span className="text-purple-700">Total Cost:</span>
                      <span className="text-purple-700">
                        {formatCurrency(results.breakdown.totalProcessingCost)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Byproduct Revenue Breakdown */}
                <div className="bg-green-50 p-3 rounded-lg sm:col-span-2 lg:col-span-1">
                  <h4 className="text-sm font-semibold text-green-800 mb-2">
                    3️⃣ Total Byproduct Revenue
                  </h4>
                  <div className="space-y-1 text-xs">
                    {results.breakdown.byproductDetails &&
                      Object.entries(results.breakdown.byproductDetails).map(
                        ([key, details]) => (
                          <div
                            key={key}
                            className={`flex justify-between items-center ${
                              details.excluded
                                ? "text-gray-400 line-through"
                                : ""
                            }`}
                          >
                            <span className="text-gray-600">
                              {details.quantity.toFixed(1)}kg ×{" "}
                              {formatCurrency(details.rate)}:
                            </span>
                            <span
                              className={
                                details.excluded
                                  ? "text-gray-400"
                                  : "text-gray-700"
                              }
                            >
                              {formatCurrency(details.revenue)}
                              {details.excluded && (
                                <span className="ml-1 text-red-500 text-xs">
                                  (excluded)
                                </span>
                              )}
                            </span>
                          </div>
                        )
                      )}
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span className="text-green-700">Total Revenue:</span>
                      <span className="text-green-700">
                        {formatCurrency(
                          results.breakdown.totalByproductRevenue
                        )}
                      </span>
                    </div>
                    <div className="text-xs text-green-600 mt-1 italic">
                      (Kadunu Sahal excluded from calculation)
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 p-3 rounded-lg border">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">
                  📝 Calculation Summary:
                </h4>
                <div className="text-xs space-y-1 overflow-x-auto">
                  <div>
                    <strong>Total Cost:</strong>{" "}
                    {formatCurrency(results.breakdown.totalPaddyCost)} +
                    {formatCurrency(results.breakdown.totalProcessingCost)} =
                    {formatCurrency(
                      results.breakdown.totalPaddyCost +
                        results.breakdown.totalProcessingCost
                    )}
                  </div>
                  <div>
                    <strong>Less Byproduct Revenue:</strong>
                    {formatCurrency(
                      results.breakdown.totalPaddyCost +
                        results.breakdown.totalProcessingCost
                    )}{" "}
                    -{formatCurrency(results.breakdown.totalByproductRevenue)} =
                    {formatCurrency(results.breakdown.finalCalculation.netCost)}
                  </div>
                  <div>
                    <strong>Divided by Rice Quantity:</strong>
                    {formatCurrency(
                      results.breakdown.finalCalculation.netCost
                    )}{" "}
                    ÷{results.breakdown.totalRiceQty}kg =
                    <span className="font-bold text-indigo-600">
                      {formatCurrency(results.adjustedRicePrice)}/kg
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Selling Price */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-800">Selling Price</h3>
          </div>

          {!isManualPriceMode && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mb-2">
              <label className="text-sm text-green-700 whitespace-nowrap">
                Profit %:
              </label>
              <input
                type="number"
                value={profitPercentage}
                onChange={(e) =>
                  setProfitPercentage(parseFloat(e.target.value) || 0)
                }
                className="w-full sm:w-16 px-2 py-1 border border-green-300 rounded text-sm text-center"
              />
            </div>
          )}

          <div className="text-xl sm:text-2xl font-bold text-green-600">
            {formatCurrency(currentPriceData.sellingPrice)}
          </div>
          <p className="text-xs text-green-600 mt-1">
            {formatCurrency(currentPriceData.ricePrice)} +{" "}
            {currentPriceData.profitMargin}%
            {currentPriceData.isManual && (
              <span className="block text-orange-600 font-medium mt-1">
                (Final Price + Additional Margin)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Input Sections - Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rice Output & Electricity */}
        <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 space-y-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-gray-800">Configuration</h3>
          </div>

          {/* Rice Output */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rice Output (kg)
            </label>
            <input
              type="number"
              value={riceOutputKg}
              onChange={(e) => setRiceOutputKg(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Rice yield from paddy"
            />
            <p className="text-xs text-gray-500 mt-1">
              Original: {parseFloat(conversionData?.rice) || 0} kg
            </p>
          </div>

          {/* Electricity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Zap className="inline w-3 h-3 mr-1" />
              Electricity Rate (Rs/kWh)
            </label>
            <input
              type="number"
              value={electricityUnitPrice}
              onChange={(e) =>
                setElectricityUnitPrice(parseFloat(e.target.value) || 0)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Units used:{" "}
              {(parseFloat(conversionData?.endElectricityNumber) || 0) -
                (parseFloat(conversionData?.startElectricityNumber) || 0)}{" "}
              kWh
            </p>
          </div>
        </div>

        {/* Labor & Expenses */}
        <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-purple-600" />
              <h3 className="font-semibold text-gray-800">Labor & Expenses</h3>
            </div>
            <button
              onClick={addEmployee}
              disabled={employees.length === 0}
              className="flex items-center space-x-1 bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded text-xs disabled:opacity-50"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>

          {/* Employee List */}
          <div className="space-y-2 mb-3">
            {selectedEmployees.map((emp, index) => (
              <div key={index} className="flex space-x-2">
                <select
                  value={emp.employeeId}
                  onChange={(e) =>
                    updateSelectedEmployee(index, "employeeId", e.target.value)
                  }
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="">Select Employee</option>
                  {employees.map((employee) => (
                    <option
                      key={employee.employeeId}
                      value={employee.employeeId}
                    >
                      {employee.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Days"
                  value={emp.days}
                  onChange={(e) =>
                    updateSelectedEmployee(index, "days", e.target.value)
                  }
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-xs"
                />
                <button
                  onClick={() => removeEmployee(index)}
                  className="p-1 text-red-500 hover:text-red-700 flex-shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {selectedEmployees.length === 0 && (
              <p className="text-xs text-gray-500 py-2">
                No employees selected
              </p>
            )}
          </div>

          {/* Secondary Stock */}
          <div className="mb-4 border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <Package className="w-3 h-3 mr-1" />
                Secondary Stocks
              </label>
              <button
                onClick={addSecondaryStock}
                disabled={secondaryStocks.length === 0}
                className="flex items-center space-x-1 bg-orange-100 hover:bg-orange-200 text-orange-700 px-2 py-1 rounded text-xs disabled:opacity-50"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-3 mb-2">
              {selectedSecondaryStocks.map((stock, index) => {
                const stockItem = secondaryStocks.find(
                  (s) => s.itemId === stock.itemId
                );
                const usedQuantity = parseFloat(stock.usedQuantity) || 0;
                const itemCost = stockItem
                  ? stockItem.averagePrice * usedQuantity
                  : 0;

                return (
                  <div
                    key={index}
                    className="space-y-2 p-3 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    {/* Item Selection */}
                    <div className="flex space-x-2">
                      <select
                        value={stock.itemId}
                        onChange={(e) =>
                          updateSelectedSecondaryStock(
                            index,
                            "itemId",
                            e.target.value
                          )
                        }
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                      >
                        <option value="">Select Stock Item</option>
                        {secondaryStocks.map((stockItem) => (
                          <option
                            key={stockItem.itemId}
                            value={stockItem.itemId}
                          >
                            {stockItem.itemName}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeSecondaryStock(index)}
                        className="p-1 text-red-500 hover:text-red-700 flex-shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Stock Details */}
                    {stockItem && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Available:</span>
                            <span className="font-medium">
                              {stockItem.currentStock.toFixed(1)}{" "}
                              {stockItem.unitType}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Avg Price:</span>
                            <span className="font-medium">
                              {formatCurrency(stockItem.averagePrice)}/
                              {stockItem.unitType}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div>
                            <label className="text-gray-600 block">
                              Use Quantity:
                            </label>
                            <input
                              type="number"
                              placeholder={`Max ${stockItem.currentStock.toFixed(
                                1
                              )}`}
                              value={stock.usedQuantity}
                              onChange={(e) =>
                                updateSelectedSecondaryStock(
                                  index,
                                  "usedQuantity",
                                  e.target.value
                                )
                              }
                              max={stockItem.currentStock}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                          </div>
                          {usedQuantity > 0 && (
                            <div className="flex justify-between font-medium text-orange-700">
                              <span>Cost:</span>
                              <span>{formatCurrency(itemCost)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Validation */}
                    {stockItem && usedQuantity > stockItem.currentStock && (
                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        ⚠️ Quantity exceeds available stock (
                        {stockItem.currentStock.toFixed(1)} {stockItem.unitType}
                        )
                      </div>
                    )}
                  </div>
                );
              })}

              {selectedSecondaryStocks.length === 0 && (
                <p className="text-xs text-gray-500 py-2">
                  No secondary stocks selected
                </p>
              )}
            </div>

            {/* Total Secondary Stocks Cost */}
            {selectedSecondaryStocks.some((stock) => stock.usedQuantity) && (
              <div className="mt-2 p-2 bg-orange-50 rounded border">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-orange-800">
                    Total Secondary Stock Cost:
                  </span>
                  <span className="text-sm font-bold text-orange-600">
                    {formatCurrency(calculateSecondaryStocksCost())}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Other Expenses */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Other Expenses
              </label>
              <button
                onClick={addOtherExpense}
                className="flex items-center space-x-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>
            <div className="space-y-2">
              {otherExpenses.map((expense, index) => (
                <div key={index} className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Expense name"
                    value={expense.name}
                    onChange={(e) =>
                      updateOtherExpense(index, "name", e.target.value)
                    }
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-purple-500"
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={expense.amount}
                    onChange={(e) =>
                      updateOtherExpense(index, "amount", e.target.value)
                    }
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-purple-500"
                  />
                  {otherExpenses.length > 1 && (
                    <button
                      onClick={() => removeOtherExpense(index)}
                      className="p-1 text-red-500 hover:text-red-700 flex-shrink-0"
                      title="Remove expense"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {otherExpenses.length === 0 && (
                <p className="text-xs text-gray-500 py-2">
                  No additional expenses
                </p>
              )}
            </div>

            {/* Show total other expenses */}
            {otherExpenses.some((exp) => exp.amount) && (
              <div className="mt-2 p-2 bg-purple-50 rounded border">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-purple-800">
                    Total Other Expenses:
                  </span>
                  <span className="text-sm font-bold text-purple-600">
                    {formatCurrency(
                      otherExpenses.reduce(
                        (total, expense) =>
                          total + (parseFloat(expense.amount) || 0),
                        0
                      )
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Byproduct Rates */}
        <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
          <div className="flex items-center space-x-2 mb-3">
            <DollarSign className="w-4 h-4 text-green-600" />
            <h3 className="font-semibold text-gray-800">Byproduct Rates</h3>
          </div>

          <div className="text-xs text-gray-600 mb-3 italic">
            * Set rates per kg. Revenue calculated for current quantities shown
            below.
          </div>

          <div className="space-y-3">
            {[
              {
                key: "hunuSahalRate",
                label: "Hunu Sahal",
                dataKey: "hunuSahal",
              },
              {
                key: "kadunuSahalRate",
                label: "Kadunu Sahal",
                dataKey: "kadunuSahal",
                excluded: true,
              },
              {
                key: "dahiyaRate",
                label: "Dahaiyya",
                dataKey: "dahaiyya",
              },
              {
                key: "ricePolishRate",
                label: "Rice Polish",
                dataKey: "ricePolish",
              },
            ].map((product) => (
              <div
                key={product.key}
                className={product.excluded ? "opacity-60" : ""}
              >
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {product.label} (Rs/kg){" "}
                  {product.excluded && "(Not used in calculation)"}
                </label>
                <input
                  type="number"
                  value={byproductRates[product.key]}
                  onChange={(e) =>
                    handleByproductRateChange(product.key, e.target.value)
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-green-500"
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-gray-500">
                    Current:{" "}
                    {parseFloat(conversionData?.[product.dataKey]) || 0} kg
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      product.excluded
                        ? "text-gray-400 line-through"
                        : "text-green-600"
                    }`}
                  >
                    ={" "}
                    {formatCurrency(
                      (parseFloat(conversionData?.[product.dataKey]) || 0) *
                        byproductRates[product.key]
                    )}
                    {product.excluded && (
                      <span className="text-red-500 ml-1">(excluded)</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 p-2 bg-green-50 rounded border">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-green-800">
                Total Current Revenue:
              </span>
              <span className="text-sm font-bold text-green-600">
                {formatCurrency(
                  (parseFloat(conversionData?.hunuSahal) || 0) *
                    byproductRates.hunuSahalRate +
                    (parseFloat(conversionData?.dahaiyya) || 0) *
                      byproductRates.dahiyaRate +
                    (parseFloat(conversionData?.ricePolish) || 0) *
                      byproductRates.ricePolishRate
                )}
              </span>
            </div>
            <div className="text-xs text-green-600 mt-1">
              (Kadunu Sahal excluded:{" "}
              {formatCurrency(
                (parseFloat(conversionData?.kadunuSahal) || 0) *
                  byproductRates.kadunuSahalRate
              )}
              )
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceCalculation;
