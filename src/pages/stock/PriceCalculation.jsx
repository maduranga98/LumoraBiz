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

  // New states
  const [riceOutputKg, setRiceOutputKg] = useState(0);
  const [profitPercentage, setProfitPercentage] = useState(10);
  const [showBreakdown, setShowBreakdown] = useState(false);

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
      expensePerKgRice: 0,
      totalCostFor100kg: 0,
    },
  });

  // Generate batch number
  const generateBatchNumber = () => {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:.]/g, "")
      .slice(0, 15);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BATCH_${timestamp}_${random}`;
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
          otherExpenses: results.breakdown.otherExpensesCost,
          totalProcessingCost: results.totalProcessingExpense,
        },
      });

      console.log("✅ Byproducts saved to purchase record");
    } catch (error) {
      console.error("❌ Error saving byproducts to purchase:", error);
      console.warn("⚠️ Continuing without updating purchase record");
    }
  };

  // Update or create stock totals in processedStock document
  const updateStockTotals = async (byproducts) => {
    try {
      console.log("📊 Updating stock totals in processedStock document...");

      const processedStockDocPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/processedStock`;

      const updateData = {};

      for (const [productKey, quantity] of Object.entries(byproducts)) {
        const quantityNum = parseFloat(quantity);
        if (quantityNum > 0) {
          updateData[`data.${productKey}`] = increment(quantityNum);
          console.log(`📈 Will increment ${productKey}: +${quantityNum} kg`);
        }
      }

      if (Object.keys(updateData).length > 0) {
        try {
          await updateDoc(doc(db, processedStockDocPath), {
            ...updateData,
            updatedAt: serverTimestamp(),
            lastProcessedBatch: conversionData?.originalStock?.stockId || null,
          });
          console.log("✅ Updated existing processedStock totals");
        } catch (error) {
          if (error.code === "not-found") {
            console.log(
              "📝 Creating new processedStock document with initial totals..."
            );

            const initialData = {};
            for (const [productKey, quantity] of Object.entries(byproducts)) {
              const quantityNum = parseFloat(quantity);
              if (quantityNum > 0) {
                initialData[productKey] = quantityNum;
              }
            }

            const newDocData = {
              data: initialData,
              businessId: currentBusiness.id,
              ownerId: currentUser.uid,
              stockType: "processed_totals",
              status: "active",
              createdBy: currentUser.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              lastProcessedBatch:
                conversionData?.originalStock?.stockId || null,
            };

            await setDoc(doc(db, processedStockDocPath), newDocData);
            console.log("✅ Created new processedStock document with totals");
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error("❌ Error updating stock totals:", error);
      throw error;
    }
  };

  // Find existing batch with same price or create new one

  // Find existing batch with same price or create new one
  const findOrCreateBatch = async (byproducts, batchNumber, pricingData) => {
    try {
      console.log("🔍 Looking for existing batch with same pricing...");

      const processedStockPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/processedStock/stock`;

      // Query for existing batches with same adjusted rice price (rounded to 2 decimal places)
      const priceQuery = query(
        collection(db, processedStockPath),
        where("status", "==", "available"),
        where(
          "pricingData.adjustedRicePrice",
          "==",
          Math.round(results.adjustedRicePrice * 100) / 100
        )
      );

      const querySnapshot = await getDocs(priceQuery);

      if (!querySnapshot.empty) {
        // Found existing batch with same price - update it
        const existingBatch = querySnapshot.docs[0];
        const existingData = existingBatch.data();

        console.log(
          "📦 Found existing batch with same price:",
          existingBatch.id
        );

        // Merge products - add quantities to existing batch
        const mergedProducts = { ...existingData.products };
        for (const [productKey, quantity] of Object.entries(byproducts)) {
          const quantityNum = parseFloat(quantity);
          if (quantityNum > 0) {
            mergedProducts[productKey] =
              (mergedProducts[productKey] || 0) + quantityNum;
          }
        }

        // Update existing batch
        await updateDoc(doc(db, processedStockPath, existingBatch.id), {
          products: mergedProducts,
          totalQuantity: increment(getTotalConverted()),
          updatedAt: serverTimestamp(),
          lastMergedAt: serverTimestamp(),
          mergedBatches: [...(existingData.mergedBatches || []), batchNumber],
          processingHistory: [
            ...(existingData.processingHistory || []),
            {
              batchNumber: batchNumber,
              timestamp: serverTimestamp(),
              addedProducts: byproducts,
              electricityData: {
                startNumber: conversionData.startElectricityNumber,
                endNumber: conversionData.endElectricityNumber,
                consumption:
                  results.breakdown.electricityCost / electricityUnitPrice,
              },
            },
          ],
        });

        console.log("✅ Merged with existing batch");
        return {
          id: existingBatch.id,
          batchNumber: existingData.batchNumber,
          merged: true,
          originalBatchNumber: batchNumber,
        };
      } else {
        // No existing batch found - create new one
        console.log("📝 Creating new batch with calculated pricing...");

        const validProducts = {};
        Object.entries(byproducts).forEach(([key, value]) => {
          if (parseFloat(value) > 0) {
            validProducts[key] = parseFloat(value);
          }
        });

        // Helper function to handle undefined values
        const safeValue = (value, defaultValue = null) => {
          return value !== undefined && value !== null ? value : defaultValue;
        };

        const batchData = {
          batchNumber: batchNumber,
          stockType: "processed_batch",
          status: "available",

          // All products in this batch
          products: validProducts,
          totalQuantity: getTotalConverted(),

          // 🎯 Pricing data from calculations
          pricingData: {
            adjustedRicePrice:
              Math.round(results.adjustedRicePrice * 100) / 100,
            recommendedSellingPrice:
              Math.round(results.recommendedSellingPrice * 100) / 100,
            profitPercentage: profitPercentage,
            profitFromByproducts: results.profitFromByproducts,
            totalProcessingExpense: results.totalProcessingExpense,
            paddyCostPer100kg: results.paddyCostPer100kg,
            riceOutputKg: riceOutputKg,
            breakdown: results.breakdown,
            calculatedAt: serverTimestamp(),
          },

          // Processing configuration
          processingConfig: {
            electricityUnitPrice: electricityUnitPrice,
            selectedEmployees: selectedEmployees,
            otherExpenses: otherExpenses,
            byproductRates: byproductRates,
          },

          // Reference data - using safeValue to handle undefined values
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

          // Original paddy data - using safeValue to handle undefined values
          ...(conversionData?.originalStock?.paddyType && {
            originalPaddyType: conversionData.originalStock.paddyType,
          }),
          ...(conversionData?.originalStock?.originalQuantity && {
            originalQuantity: conversionData.originalStock.originalQuantity,
          }),
          ...(conversionData?.originalStock?.pricePerKg && {
            originalPricePerKg: conversionData.originalStock.pricePerKg,
          }),

          // Processing data
          electricityData: {
            startNumber: safeValue(conversionData.startElectricityNumber, 0),
            endNumber: safeValue(conversionData.endElectricityNumber, 0),
            consumption:
              parseFloat(conversionData.endElectricityNumber || 0) -
              parseFloat(conversionData.startElectricityNumber || 0),
            cost: results.breakdown.electricityCost,
          },

          // Business data
          businessId: currentBusiness.id,
          ownerId: currentUser.uid,

          // Timestamps
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          processedAt: serverTimestamp(),
        };

        console.log("📝 Batch data prepared:", batchData);

        const docRef = await addDoc(
          collection(db, processedStockPath),
          batchData
        );

        console.log(`✅ Created new batch document: ${batchNumber}`);

        return {
          id: docRef.id,
          batchNumber: batchNumber,
          merged: false,
          ...batchData,
        };
      }
    } catch (error) {
      console.error("❌ Error in findOrCreateBatch:", error);
      throw error;
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

      let updateSuccessful = false;

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

      if (!updateSuccessful) {
        console.log(
          "ℹ️ Raw stock document not found - this is normal for initial setup"
        );
      }
    } catch (error) {
      console.log("ℹ️ Raw stock update skipped:", error.message);
    }
  };

  // 🎯 MAIN SAVE FUNCTION
  const handleSaveData = async () => {
    console.log("💾 Save Data clicked");

    if (!currentUser || !currentBusiness?.id) {
      toast.error("Authentication or business context missing");
      return;
    }

    if (!conversionData) {
      toast.error("No conversion data available to save");
      return;
    }

    setSaving(true);

    try {
      // Generate unique batch number
      const batchNumber = generateBatchNumber();
      console.log("🏷️ Generated batch number:", batchNumber);

      // Prepare byproducts data (excluding electricity numbers)
      const byproducts = {
        rice: conversionData.rice || "0",
        hunuSahal: conversionData.hunuSahal || "0",
        kadunuSahal: conversionData.kadunuSahal || "0",
        ricePolish: conversionData.ricePolish || "0",
        dahaiyya: conversionData.dahaiyya || "0",
        flour: conversionData.flour || "0",
      };

      console.log("📦 Prepared byproducts:", byproducts);

      // Prepare comprehensive pricing data
      const pricingData = {
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
      };

      // 1. Find existing batch with same price or create new batch document
      console.log("🏭 Finding/Creating batch document with pricing...");
      const batchDocument = await findOrCreateBatch(
        byproducts,
        batchNumber,
        pricingData
      );

      // 2. Update stock totals in processedStock document
      console.log("📊 Updating stock totals in processedStock document...");
      await updateStockTotals(byproducts);

      // 3. Update buyer's purchase record with byproducts and pricing
      if (conversionData?.originalStock?.purchaseId) {
        console.log(
          "📝 Updating purchase record with byproducts and pricing..."
        );
        await saveByproductsToPurchase(
          conversionData.originalStock.purchaseId,
          {
            ...byproducts,
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
          batchDocument.merged
            ? batchDocument.originalBatchNumber
            : batchDocument.batchNumber,
          pricingData
        );
      }

      // 4. Update raw stock status (optional - only if exists)
      console.log("📦 Checking for raw stock to update...");
      await updateRawStockStatus(batchDocument.id, batchDocument.batchNumber);

      // Success message
      const successMessage = batchDocument.merged
        ? `Products merged with existing batch! Cost: ${formatCurrency(
            results.adjustedRicePrice
          )}/kg`
        : `New batch ${
            batchDocument.batchNumber
          } created! Cost: ${formatCurrency(results.adjustedRicePrice)}/kg`;

      toast.success(successMessage);

      console.log("✅ All data saved successfully");
    } catch (error) {
      console.error("❌ Error in handleSaveData:", error);
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

    // Basic calculations
    const startReading = parseFloat(conversionData.startElectricityNumber) || 0;
    const endReading = parseFloat(conversionData.endElectricityNumber) || 0;
    const electricityCost = (endReading - startReading) * electricityUnitPrice;

    const laborCost = selectedEmployees.reduce((total, emp) => {
      const employee = employees.find((e) => e.employeeId === emp.employeeId);
      const dailyRate = employee ? employee.payRate : 0;
      const days = parseFloat(emp.days) || 0;
      return total + dailyRate * days;
    }, 0);

    const otherExpensesCost = otherExpenses.reduce((total, expense) => {
      return total + (parseFloat(expense.amount) || 0);
    }, 0);

    const totalProcessingExpense =
      electricityCost + laborCost + otherExpensesCost;
    const paddyCostPer100kg = 100 * (originalStock.pricePerKg || 0);

    // Advanced calculations
    const expensePerKgRice =
      currentRiceOutput > 0 ? totalProcessingExpense / currentRiceOutput : 0;
    const totalCostFor100kg =
      paddyCostPer100kg + expensePerKgRice * currentRiceOutput;

    const profitFromByproducts =
      (parseFloat(conversionData.hunuSahal) || 0) *
        byproductRates.hunuSahalRate +
      (parseFloat(conversionData.kadunuSahal) || 0) *
        byproductRates.kadunuSahalRate +
      (parseFloat(conversionData.dahaiyya) || 0) * byproductRates.dahiyaRate +
      (parseFloat(conversionData.ricePolish) || 0) *
        byproductRates.ricePolishRate;

    const adjustedRicePrice =
      currentRiceOutput > 0
        ? (totalCostFor100kg - profitFromByproducts) / currentRiceOutput
        : 0;
    const recommendedSellingPrice =
      adjustedRicePrice * (1 + profitPercentage / 100);

    setResults({
      adjustedRicePrice,
      profitFromByproducts,
      totalProcessingExpense,
      paddyCostPer100kg,
      recommendedSellingPrice,
      breakdown: {
        electricityCost,
        laborCost,
        otherExpensesCost,
        expensePerKgRice,
        totalCostFor100kg,
      },
    });
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
    otherExpenses,
    employees,
    byproductRates,
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
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <p className="text-yellow-700">
            Please log in and select a business to access price calculation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Compact Header */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calculator className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Rice Cost Calculator
              </h1>
              <p className="text-sm text-gray-600">
                Calculate optimal rice pricing
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
            {/* 🎯 NEW: Save Data Button */}
            <button
              onClick={handleSaveData}
              disabled={saving}
              className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50"
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
                className="flex items-center space-x-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-blue-600" />
          <p className="text-blue-800 text-sm font-medium">
            Clicking "Save Data" will create batch records, update stock totals,
            and save pricing information to the database.
          </p>
        </div>
      </div>

      {/* Main Results Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rice Cost Result */}
        <div className="lg:col-span-2 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-yellow-600" />
              <h2 className="text-lg font-semibold text-yellow-800">
                Cost per 1kg Rice
              </h2>
            </div>
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="flex items-center space-x-1 text-yellow-700 hover:text-yellow-800 text-sm"
            >
              <span>{showBreakdown ? "Hide" : "Show"} breakdown</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  showBreakdown ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          <div className="text-3xl font-bold text-yellow-900 mb-2">
            {formatCurrency(results.adjustedRicePrice)}
          </div>
          <p className="text-sm text-yellow-700">
            Add profit margin for selling price
          </p>

          {/* Compact Breakdown */}
          {showBreakdown && (
            <div className="mt-4 p-3 bg-white rounded-lg border space-y-2">
              <div className="text-sm font-medium text-gray-800 mb-2">
                Calculation Steps:
              </div>
              {[
                {
                  label: "Paddy cost (100kg)",
                  value: results.paddyCostPer100kg,
                },
                {
                  label: "Processing cost",
                  value: results.totalProcessingExpense,
                },
                {
                  label: "Byproduct revenue",
                  value: -results.profitFromByproducts,
                  negative: true,
                },
                {
                  label: "Final cost per kg",
                  value: results.adjustedRicePrice,
                  isFinal: true,
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className={`flex justify-between text-xs ${
                    item.isFinal ? "border-t pt-2 font-semibold" : ""
                  }`}
                >
                  <span className="text-gray-600">{item.label}:</span>
                  <span
                    className={
                      item.negative ? "text-green-600" : "text-gray-900"
                    }
                  >
                    {item.negative ? "-" : ""}
                    {formatCurrency(Math.abs(item.value))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selling Price */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-800">Selling Price</h3>
          </div>
          <div className="flex items-center space-x-2 mb-2">
            <label className="text-sm text-green-700">Profit %:</label>
            <input
              type="number"
              value={profitPercentage}
              onChange={(e) =>
                setProfitPercentage(parseFloat(e.target.value) || 0)
              }
              className="w-16 px-2 py-1 border border-green-300 rounded text-sm text-center"
            />
          </div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(results.recommendedSellingPrice)}
          </div>
          <p className="text-xs text-green-600 mt-1">
            {formatCurrency(results.adjustedRicePrice)} + {profitPercentage}%
          </p>
        </div>
      </div>

      {/* Input Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rice Output & Electricity */}
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
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
              placeholder="Rice yield from 100kg paddy"
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
        <div className="bg-white rounded-lg shadow-sm border p-4">
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
                  className="p-1 text-red-500 hover:text-red-700"
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
                      className="p-1 text-red-500 hover:text-red-700"
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
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center space-x-2 mb-3">
            <DollarSign className="w-4 h-4 text-green-600" />
            <h3 className="font-semibold text-gray-800">Byproduct Rates</h3>
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
              },
              { key: "dahiyaRate", label: "Dahaiyya", dataKey: "dahaiyya" },
              {
                key: "ricePolishRate",
                label: "Rice Polish",
                dataKey: "ricePolish",
              },
            ].map((product) => (
              <div key={product.key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {product.label} (Rs/kg)
                </label>
                <input
                  type="number"
                  value={byproductRates[product.key]}
                  onChange={(e) =>
                    handleByproductRateChange(product.key, e.target.value)
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {parseFloat(conversionData?.[product.dataKey]) || 0} kg ={" "}
                  {formatCurrency(
                    (parseFloat(conversionData?.[product.dataKey]) || 0) *
                      byproductRates[product.key]
                  )}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 p-2 bg-green-50 rounded border">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-green-800">
                Total Revenue:
              </span>
              <span className="text-sm font-bold text-green-600">
                {formatCurrency(results.profitFromByproducts)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center space-x-2 mb-3">
          <BarChart3 className="w-4 h-4 text-gray-600" />
          <h3 className="font-semibold text-gray-800">Summary</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            {
              label: "Paddy Cost",
              value: results.paddyCostPer100kg,
              icon: "🌾",
            },
            {
              label: "Processing",
              value: results.totalProcessingExpense,
              icon: "⚙️",
            },
            {
              label: "Byproduct Revenue",
              value: results.profitFromByproducts,
              icon: "💰",
              isPositive: true,
            },
            {
              label: "Rice Output",
              value: riceOutputKg,
              icon: "🍚",
              unit: "kg",
            },
          ].map((item, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-lg">
              <div className="text-lg mb-1">{item.icon}</div>
              <div className="text-xs text-gray-600 mb-1">{item.label}</div>
              <div
                className={`text-sm font-semibold ${
                  item.isPositive ? "text-green-600" : "text-gray-900"
                }`}
              >
                {item.unit
                  ? `${item.value} ${item.unit}`
                  : formatCurrency(item.value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PriceCalculation;
