import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  orderBy,
  doc,
  addDoc,
  updateDoc,
  increment,
  serverTimestamp,
  writeBatch,
  limit,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { useBusiness } from "../../contexts/BusinessContext";
import { MapPin, Clock, Navigation, User } from "lucide-react";

const Loading = () => {
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();

  // States
  const [baggedStocks, setBaggedStocks] = useState({});
  const [groupedProducts, setGroupedProducts] = useState({});
  const [selectedProducts, setSelectedProducts] = useState({});
  const [salesReps, setSalesReps] = useState([]);
  const [selectedSalesRep, setSelectedSalesRep] = useState("");
  const [todayRouteInfo, setTodayRouteInfo] = useState(null);
  const [allRoutes, setAllRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProcessingLoading, setIsProcessingLoading] = useState(false);

  // New state for today's paddy prices
  const [todayPaddyPrices, setTodayPaddyPrices] = useState({});

  // Enhanced get product type code with rice type support
  const getProductTypeCode = (productType, riceType = null) => {
    if (productType === "rice" && riceType) {
      return `rice_${riceType.toLowerCase().replace(/\s+/g, "_")}`;
    }

    const codeMap = {
      rice: "rice",
      hunuSahal: "hunu_sahal",
      kadunuSahal: "kadunu_sahal",
      ricePolish: "rice_polish",
      dahaiyya: "dahaiyya",
      flour: "flour",
    };
    return (
      codeMap[productType] || productType.toLowerCase().replace(/\s+/g, "_")
    );
  };

  // Helper function to recursively remove undefined values
  const cleanObjectForFirestore = (obj) => {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (Array.isArray(obj)) {
      return obj
        .map(cleanObjectForFirestore)
        .filter((item) => item !== undefined);
    }

    if (typeof obj === "object" && obj !== null) {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = cleanObjectForFirestore(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
      return cleaned;
    }

    return obj;
  };

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

  // Format number safely
  const formatNumber = (value, decimals = 2) => {
    const num = Number(value || 0);
    return isNaN(num) ? "0.00" : num.toFixed(decimals);
  };

  // Enhanced format product type for display with rice types
  const formatProductType = (type) => {
    if (type.startsWith("rice_")) {
      const riceType = type.replace("rice_", "");
      const riceTypeMap = {
        samba: "Samba Rice",
        nadu: "Nadu Rice",
        keeri_samba: "Keeri Samba Rice",
        red_rice: "Red Rice",
        basmati: "Basmati Rice",
        white_rice: "White Rice",
        sudu_kakulu: "Sudu Kakulu",
        kalu_heenati: "Kalu Heenati",
      };
      return (
        riceTypeMap[riceType] ||
        `${
          riceType.charAt(0).toUpperCase() +
          riceType.slice(1).replace(/_/g, " ")
        }`
      );
    }

    const typeMap = {
      rice: "Rice (Hal)",
      hunuSahal: "Hunu Sahal",
      kadunuSahal: "Kadunu Sahal",
      ricePolish: "Rice Polish",
      dahaiyya: "Dahaiyya",
      flour: "Flour",
    };
    return typeMap[type] || type;
  };

  // Get unique product types for paddy price inputs
  const getUniqueProductTypes = () => {
    const productTypes = new Set();
    Object.entries(baggedStocks).forEach(([productType, bags]) => {
      if (productType.startsWith("rice_")) {
        const riceType = productType.replace("rice_", "");
        productTypes.add(riceType);
      } else {
        productTypes.add(productType);
      }
    });
    return Array.from(productTypes);
  };

  // Handle paddy price changes
  const handlePaddyPriceChange = (productType, value) => {
    setTodayPaddyPrices((prev) => ({
      ...prev,
      [productType]: value,
    }));
  };

  // Get formatted item name for saving (updated to use actual itemName from bag data)
  const getFormattedItemName = (productData, uniqueKey) => {
    // Use the actual itemName from the bag data if available
    if (productData.itemName) {
      return productData.itemName;
    }

    // Fallback to constructing the name
    const productName = formatProductType(productData.originalProductType);
    const bagSize = getBagSize(uniqueKey);
    return `${productName} ${bagSize}kg`;
  };

  // Helper function to discover product types from existing data
  const discoverProductTypes = async () => {
    try {
      const discoveredTypes = {
        productTypes: new Set(),
        riceTypes: new Set(),
      };

      // 1. Discover from batches
      try {
        const batchesQuery = query(
          collection(
            db,
            `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/processedStock/stock`
          ),
          where("status", "==", "available")
        );

        const querySnapshot = await getDocs(batchesQuery);

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.products) {
            Object.keys(data.products).forEach((productType) => {
              if (data.products[productType] > 0) {
                discoveredTypes.productTypes.add(productType);

                // If it's rice, also track the rice type
                if (productType === "rice" && data.originalPaddyType) {
                  discoveredTypes.riceTypes.add(data.originalPaddyType);
                }
              }
            });
          }
        });
      } catch (error) {
        console.log("Error discovering from batches:", error);
      }

      // 2. Discover from stock totals
      try {
        const stockTotalsRef = doc(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/stockTotals`
        );

        const stockTotalsDoc = await getDoc(stockTotalsRef);

        if (stockTotalsDoc.exists()) {
          const data = stockTotalsDoc.data();

          Object.keys(data).forEach((key) => {
            // Extract rice types from keys like "rice_samba_bagged_total"
            if (
              key.startsWith("rice_") &&
              !key.includes("_bagged_") &&
              !key.includes("_bags_") &&
              !key.includes("_loaded_")
            ) {
              const riceType = key.replace("rice_", "");
              if (riceType && riceType !== "rice") {
                discoveredTypes.riceTypes.add(riceType);
                discoveredTypes.productTypes.add("rice");
              }
            }

            // Extract other product types
            const nonRiceProducts = [
              "hunuSahal",
              "kadunuSahal",
              "ricePolish",
              "dahaiyya",
              "flour",
            ];
            nonRiceProducts.forEach((product) => {
              if (key === product || key.startsWith(`${product}_`)) {
                discoveredTypes.productTypes.add(product);
              }
            });
          });
        }
      } catch (error) {
        console.log("Error discovering from stock totals:", error);
      }

      // 3. Add common fallbacks if nothing discovered
      if (discoveredTypes.productTypes.size === 0) {
        const commonProductTypes = [
          "hunuSahal",
          "kadunuSahal",
          "ricePolish",
          "dahaiyya",
          "flour",
        ];
        commonProductTypes.forEach((type) =>
          discoveredTypes.productTypes.add(type)
        );
      }

      if (discoveredTypes.riceTypes.size === 0) {
        const commonRiceTypes = [
          "samba",
          "nadu",
          "keeri_samba",
          "red_rice",
          "basmati",
          "white_rice",
        ];
        commonRiceTypes.forEach((type) => discoveredTypes.riceTypes.add(type));
      }

      return {
        productTypes: Array.from(discoveredTypes.productTypes),
        riceTypes: Array.from(discoveredTypes.riceTypes),
      };
    } catch (error) {
      console.error("Error in product type discovery:", error);
      return {
        productTypes: [
          "hunuSahal",
          "kadunuSahal",
          "ricePolish",
          "dahaiyya",
          "flour",
        ],
        riceTypes: [
          "samba",
          "nadu",
          "keeri_samba",
          "red_rice",
          "basmati",
          "white_rice",
        ],
      };
    }
  };

  // FIXED: Updated fetchBaggedStocks to match useDataFetching hook structure
  const fetchBaggedStocks = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Fetching bagged stocks from single collection...");

      // Use the same path as your useDataFetching hook
      const collectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/stock`;

      const baggedStockQuery = query(
        collection(db, collectionPath),
        where("status", "==", "available"),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(baggedStockQuery);
      const baggedStocksData = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const bagData = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };

        // Group by product type for display - same logic as useDataFetching
        let groupKey;
        if (data.productType === "rice" && data.riceType) {
          groupKey = `rice_${data.riceType}`;
        } else {
          groupKey = data.productType;
        }

        if (!baggedStocksData[groupKey]) {
          baggedStocksData[groupKey] = [];
        }

        baggedStocksData[groupKey].push(bagData);
      });

      console.log("=== BAGGED STOCKS RESULT ===");
      console.log(
        `Total product types found: ${Object.keys(baggedStocksData).length}`
      );
      console.log("Product types:", Object.keys(baggedStocksData));
      Object.entries(baggedStocksData).forEach(([type, bags]) => {
        console.log(`  ${type}: ${bags.length} bags`);
      });

      setBaggedStocks(baggedStocksData);
    } catch (error) {
      console.error("Error fetching bagged stocks:", error);
      setError(`Failed to load bagged stocks: ${error.message}`);
      toast.error(`Failed to load bagged stocks: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Enhanced process grouped products with correct quantity calculation
  const processGroupedProducts = () => {
    console.log("Processing grouped products from baggedStocks:", baggedStocks);
    const grouped = {};

    Object.entries(baggedStocks).forEach(([productType, bags]) => {
      console.log(`Processing ${productType} with ${bags.length} bags`);

      // Group bags by itemName, batch, and price (like BaggedInventory does)
      const itemGroups = {};

      bags.forEach((bag) => {
        // Create key based on itemName and batch (matching BaggedInventory logic)
        const key = `${bag.itemName}-${bag.sourceBatchNumber}`;

        if (!itemGroups[key]) {
          itemGroups[key] = {
            itemName: bag.itemName,
            productType: bag.productType,
            riceType: bag.riceType,
            bagSize: bag.bagSize,
            sourceBatchNumber: bag.sourceBatchNumber,
            sourceBatchId: bag.sourceBatchId,
            pricePerKg: bag.pricePerKg,
            recommendedSellingPrice: bag.recommendedSellingPrice,
            originalPaddyType: bag.originalPaddyType,
            createdAt: bag.createdAt,
            bags: [],
            totalBags: 0,
            totalWeight: 0,
            uniqueKey: `${productType}_${key}`, // Unique identifier for this item group
            originalProductType: productType,
          };
        }

        itemGroups[key].bags.push(bag);

        // FIXED: Use the quantity field from bag data (number of individual bags)
        const bagQuantity = bag.quantity || 1; // Each bag document represents X individual bags
        const bagWeight =
          bag.totalWeight || bag.weight || bag.bagSize * bagQuantity || 0;

        itemGroups[key].totalBags += bagQuantity; // Sum up actual quantities
        itemGroups[key].totalWeight += bagWeight; // Sum up actual weights

        console.log(
          `Bag ${bag.id}: quantity=${bagQuantity}, weight=${bagWeight}, totalBags now=${itemGroups[key].totalBags}`
        );
      });

      // Add each item group as a separate entry (one per itemName + batch combination)
      Object.values(itemGroups).forEach((group) => {
        const uniqueKey = group.uniqueKey;
        console.log(
          `Group ${uniqueKey}: ${group.totalBags} total bags, ${group.totalWeight} total weight`
        );

        grouped[uniqueKey] = {
          ...group,
          displayName: `${group.itemName} (Batch: ${group.sourceBatchNumber})`,
          shortDisplayName: `${group.bagSize}kg @ ${formatCurrency(
            group.recommendedSellingPrice
          )}/kg`,
          totalAvailableWeight: group.totalWeight,
          totalAvailableBags: group.totalBags,
          price: group.recommendedSellingPrice,
          // Single option since each entry represents one item+batch combination
          priceOptions: [
            {
              bagSize: group.bagSize,
              price: group.recommendedSellingPrice,
              bags: group.bags,
              totalWeight: group.totalWeight,
              totalBags: group.totalBags,
            },
          ],
        };
      });
    });

    console.log("Final grouped products with correct quantities:", grouped);
    setGroupedProducts(grouped);
  };

  // FIXED: Updated createLoading function with new data structure
  const createLoading = async () => {
    // Validate selections
    const validSelections = Object.entries(selectedProducts).filter(
      ([uniqueKey, selection]) => {
        const bagQuantity = parseInt(selection?.bagQuantity) || 0;
        const hasPrice = getCurrentPrice(uniqueKey) > 0;
        const isValid = isBagQuantityValid(uniqueKey);
        console.log(
          `Validating ${uniqueKey}: bagQuantity=${bagQuantity}, hasPrice=${hasPrice}, isValid=${isValid}`
        );
        return bagQuantity > 0 && hasPrice && isValid;
      }
    );

    console.log("Valid selections:", validSelections);

    if (validSelections.length === 0) {
      toast.error(
        "Please select at least one product with valid bag quantity and price"
      );
      return;
    }

    // Validate sales rep selection
    if (!selectedSalesRep) {
      toast.error("Please select a sales representative");
      return;
    }

    setIsProcessingLoading(true);

    try {
      const batch = writeBatch(db);
      const loadingItems = [];
      let totalValue = 0;
      let totalWeight = 0;
      let totalBags = 0;

      // Get selected sales rep details
      const selectedSalesRepData = salesReps.find(
        (rep) => rep.id === selectedSalesRep
      );

      // Process each selected product
      for (const [uniqueKey, selection] of validSelections) {
        const bagQuantity = parseInt(selection.bagQuantity);
        const price = getCurrentPrice(uniqueKey);
        const bagSize = getBagSize(uniqueKey);
        const productData = groupedProducts[uniqueKey];
        const originalProductType = productData.originalProductType;

        console.log(
          `Processing ${uniqueKey}: ${bagQuantity} bags of ${bagSize}kg each at ${price}/kg`
        );

        // Get the bags from this specific option
        const priceOption = productData.priceOptions[0]; // Always index 0 since each row has one option

        let remainingBags = bagQuantity;
        const usedBags = [];

        // Allocate specific bags for this quantity (FIFO - first in, first out)
        for (const bag of priceOption.bags) {
          if (remainingBags <= 0) break;

          // Use entire bag
          usedBags.push({
            bagId: bag.bagId,
            bagDocId: bag.id,
            weight: bag.weight || bagSize,
            bagSize: bagSize,
            pricePerKg: price,
          });
          remainingBags -= 1;

          // FIXED: Mark bag as loaded using correct single collection path
          const bagRef = doc(
            db,
            `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/stock`,
            bag.id
          );
          batch.update(bagRef, {
            status: "loaded",
            loadedAt: serverTimestamp(),
            salesRepId: selectedSalesRep,
            salesRepName: selectedSalesRepData?.name || "",
            updatedAt: serverTimestamp(),
          });
        }

        const productWeight = bagQuantity * bagSize;
        const productTotal = productWeight * price;

        // Determine product type for loading item
        let productType,
          riceType = null;
        if (originalProductType.startsWith("rice_")) {
          productType = "rice";
          riceType = originalProductType.replace("rice_", "");
        } else {
          productType = originalProductType;
        }

        // NEW: Format item name as requested (e.g., "Sudu Kakulu 0.5kg") with validation
        const formattedItemName =
          getFormattedItemName(productData, uniqueKey) ||
          `${productType} ${bagSize}kg`;

        loadingItems.push({
          // NEW: Updated structure with formatted item name - all fields validated
          itemName: String(formattedItemName),
          productType: String(productType || "unknown"),
          productCode: String(originalProductType || productType || "unknown"),
          riceType: riceType ? String(riceType) : null,
          displayName: String(productData.displayName || formattedItemName),
          bagQuantity: Number(bagQuantity) || 0,
          bagSize: Number(bagSize) || 0,
          totalWeight: Number(productWeight) || 0,
          pricePerKg: Number(price) || 0,
          totalValue: Number(productTotal) || 0,
          minPrice: Number(parseFloat(selection.minPrice)) || 0,
          maxPrice: Number(parseFloat(selection.maxPrice)) || 0,
          bagsUsed: usedBags || [],
          bagsCount: Number(usedBags.length) || 0,
          sourceBatchNumber: productData.sourceBatchNumber
            ? String(productData.sourceBatchNumber)
            : null,
          sourceBatchId: productData.sourceBatchId
            ? String(productData.sourceBatchId)
            : null,
        });

        totalValue += productTotal;
        totalWeight += productWeight;
        totalBags += bagQuantity;
      }

      // Get today's date for paddy prices
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD format

      // Create loading record with enhanced structure and validation
      const loadingRef = doc(
        collection(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/loadings`
        )
      );

      // Validate all data before saving
      const loadingData = {
        loadingId: loadingRef.id,
        items: loadingItems,
        totalWeight: Number(totalWeight) || 0,
        totalValue: Number(totalValue) || 0,
        totalBags: Number(totalBags) || 0,
        itemCount: Number(loadingItems.length) || 0,
        salesRepId: String(selectedSalesRep || ""),
        salesRepName: String(selectedSalesRepData?.name || ""),
        salesRepPhone: String(selectedSalesRepData?.phone || ""),
        salesRepEmail: String(selectedSalesRepData?.email || ""),
        todayRoute: todayRouteInfo?.route || null,
        routeId: String(todayRouteInfo?.routeId || ""),
        todayPaddyPrices: todayPaddyPrices || {},
        paddyPriceDate: String(dateStr || ""),
        status: "prepared",
        createdAt: serverTimestamp(),
        createdBy: String(currentUser.uid || ""),
        businessId: String(currentBusiness.id || ""),
        ownerId: String(currentUser.uid || ""),
      };

      // Deep clean to remove all undefined values
      const cleanLoadingData = cleanObjectForFirestore(loadingData);

      console.log("Final loading data to save:", cleanLoadingData);

      batch.set(loadingRef, cleanLoadingData);

      // Update stock totals
      const stockTotalsRef = doc(
        db,
        `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/stockTotals`
      );
      const stockUpdates = {};

      loadingItems.forEach((item) => {
        const stockKey = item.riceType
          ? `rice_${item.riceType}`
          : item.productType;
        stockUpdates[`${stockKey}_bagged_total`] = increment(-item.totalWeight);
        stockUpdates[`${stockKey}_bags_count`] = increment(-item.bagsCount);
        stockUpdates[`${stockKey}_loaded_total`] = increment(item.totalWeight);
        stockUpdates[`${stockKey}_loaded_bags_count`] = increment(
          item.bagsCount
        );
      });

      stockUpdates.lastUpdated = serverTimestamp();
      batch.update(stockTotalsRef, stockUpdates);

      await batch.commit();

      // Reset form
      setSelectedProducts({});
      setSelectedSalesRep("");
      setTodayPaddyPrices({});

      // Refresh data
      await fetchBaggedStocks();

      toast.success(
        `Loading created successfully for ${
          selectedSalesRepData?.name
        }! Total: ${totalBags} bags (${formatNumber(
          totalWeight
        )}kg) worth ${formatCurrency(totalValue)}`
      );
    } catch (error) {
      console.error("Error creating loading:", error);
      toast.error("Failed to create loading");
    } finally {
      setIsProcessingLoading(false);
    }
  };

  // Keep all your other existing functions (fetchSalesReps, fetchAllRoutes, fetchTodayRoute, etc.)
  // ... (copy all remaining functions from your original component)

  // Fetch sales representatives
  const fetchSalesReps = async () => {
    try {
      const salesRepsRef = collection(
        db,
        "owners",
        currentUser.uid,
        "businesses",
        currentBusiness.id,
        "salesReps"
      );

      const snapshot = await getDocs(salesRepsRef);
      const repsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setSalesReps(repsData);
    } catch (error) {
      console.error("Error fetching sales reps:", error);
      toast.error("Failed to load sales representatives");
    }
  };

  // Fetch all routes for reference
  const fetchAllRoutes = async () => {
    try {
      const routesRef = collection(
        db,
        "owners",
        currentUser.uid,
        "businesses",
        currentBusiness.id,
        "routes"
      );

      const snapshot = await getDocs(routesRef);
      const routesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setAllRoutes(routesData);
    } catch (error) {
      console.error("Error fetching routes:", error);
      toast.error("Failed to load routes");
    }
  };

  // Fetch today's route for selected sales rep
  const fetchTodayRoute = async (repId) => {
    try {
      // Get current date info
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      const currentDay = today.getDate();
      const planId = `${currentYear}-${currentMonth
        .toString()
        .padStart(2, "0")}`;

      console.log("Fetching route for:", { repId, planId, currentDay });

      // Find the selected rep to get their details
      const selectedRep = salesReps.find((rep) => rep.id === repId);
      if (!selectedRep) {
        console.log("Selected rep not found");
        setTodayRouteInfo(null);
        return;
      }

      // Fetch monthly plan for this rep using the repId
      const monthlyPlanDocRef = doc(
        db,
        "owners",
        currentUser.uid,
        "businesses",
        currentBusiness.id,
        "salesReps",
        repId,
        "monthlyPlans",
        planId
      );

      console.log("Monthly plan path:", monthlyPlanDocRef.path);

      const monthlyPlanDoc = await getDoc(monthlyPlanDocRef);

      if (!monthlyPlanDoc.exists()) {
        console.log("No monthly plan found for", planId);
        setTodayRouteInfo({
          dayType: "no_plan",
          isWorkingDay: false,
          hasRoute: false,
          route: null,
          message: `No monthly plan found for ${planId}`,
        });
        return;
      }

      const planData = monthlyPlanDoc.data();
      console.log("Plan data:", planData);

      const dailyPlans = planData.dailyPlans || {};
      const todayPlan = dailyPlans[currentDay];

      console.log("Today's plan:", todayPlan);

      if (!todayPlan) {
        console.log("No plan found for day", currentDay);
        setTodayRouteInfo({
          dayType: "no_plan",
          isWorkingDay: false,
          hasRoute: false,
          route: null,
          message: `No plan found for day ${currentDay}`,
        });
        return;
      }

      // Check if it's a working day and has a route assigned
      if (todayPlan.dayType === "sunday" || !todayPlan.selectedRoute) {
        setTodayRouteInfo({
          dayType: todayPlan.dayType,
          isWorkingDay: todayPlan.dayType === "working",
          hasRoute: false,
          route: null,
        });
        return;
      }

      // Find the actual route details
      const routeDetails = allRoutes.find(
        (route) => route.id === todayPlan.selectedRoute
      );

      console.log("Route details found:", routeDetails);

      setTodayRouteInfo({
        dayType: todayPlan.dayType,
        isWorkingDay: true,
        hasRoute: true,
        route: routeDetails || null,
        routeId: todayPlan.selectedRoute,
      });
    } catch (error) {
      console.error("Error fetching today's route:", error);
      setTodayRouteInfo({
        dayType: "error",
        isWorkingDay: false,
        hasRoute: false,
        route: null,
        error: error.message,
      });
    }
  };

  // Enhanced product selection handling with min/max price support
  const handleProductChange = (uniqueKey, field, value) => {
    console.log(`handleProductChange: ${uniqueKey}, ${field}, ${value}`);

    setSelectedProducts((prev) => {
      const updated = { ...prev };

      if (!updated[uniqueKey]) {
        updated[uniqueKey] = {
          selectedPriceIndex: 0,
          bagQuantity: "",
          maxAvailableBags: 0,
          maxAvailableWeight: 0,
          minPrice: "",
          maxPrice: "",
        };
      }

      if (field === "bagQuantity") {
        updated[uniqueKey] = {
          ...updated[uniqueKey],
          bagQuantity: value,
        };
      } else if (field === "minPrice") {
        updated[uniqueKey] = {
          ...updated[uniqueKey],
          minPrice: value,
        };
      } else if (field === "maxPrice") {
        updated[uniqueKey] = {
          ...updated[uniqueKey],
          maxPrice: value,
        };
      }

      console.log("Updated selected products:", updated);
      return updated;
    });
  };

  // Get max available bags for a product (simplified)
  const getMaxAvailableBags = (uniqueKey) => {
    const productData = groupedProducts[uniqueKey];
    return productData?.totalAvailableBags || 0;
  };

  // Get bag size for selected option (simplified)
  const getBagSize = (uniqueKey) => {
    const productData = groupedProducts[uniqueKey];
    return productData?.bagSize || 0;
  };

  // Get current price for a product (simplified)
  const getCurrentPrice = (uniqueKey) => {
    const productData = groupedProducts[uniqueKey];
    return productData?.price || 0;
  };

  // Calculate total weight for a product (bags × kg per bag) - updated for unique keys
  const calculateProductWeight = (uniqueKey) => {
    const selection = selectedProducts[uniqueKey];
    if (!selection || !selection.bagQuantity || selection.bagQuantity === "") {
      return 0;
    }

    const bagSize = getBagSize(uniqueKey);
    const bagQuantity = parseInt(selection.bagQuantity) || 0;

    return bagQuantity * bagSize;
  };

  // Calculate total value for a product - updated for unique keys
  const calculateProductTotal = (uniqueKey) => {
    const totalWeight = calculateProductWeight(uniqueKey);
    const price = getCurrentPrice(uniqueKey);

    return totalWeight * price;
  };

  // Validate bag quantity input - updated for unique keys
  const isBagQuantityValid = (uniqueKey) => {
    const selection = selectedProducts[uniqueKey];
    if (!selection || !selection.bagQuantity || selection.bagQuantity === "")
      return true;

    const bagQuantity = parseInt(selection.bagQuantity);
    const maxAvailableBags = getMaxAvailableBags(uniqueKey);

    return (
      bagQuantity > 0 && bagQuantity <= maxAvailableBags && !isNaN(bagQuantity)
    );
  };

  // Calculate grand total - updated for unique keys
  const calculateGrandTotal = () => {
    return Object.keys(groupedProducts).reduce((total, uniqueKey) => {
      return total + calculateProductTotal(uniqueKey);
    }, 0);
  };

  // Get total selected weight - updated for unique keys
  const getTotalSelectedWeight = () => {
    return Object.keys(groupedProducts).reduce((total, uniqueKey) => {
      return total + calculateProductWeight(uniqueKey);
    }, 0);
  };

  // Get total selected bags
  const getTotalSelectedBags = () => {
    return Object.values(selectedProducts).reduce((total, selection) => {
      const bagQuantity = parseInt(selection?.bagQuantity) || 0;
      return total + bagQuantity;
    }, 0);
  };

  // Get today's day of week for route scheduling
  const formatTodayInfo = () => {
    const today = new Date();
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
    const dayNumber = today.getDate();
    const monthName = today.toLocaleDateString("en-US", { month: "long" });
    return `${dayName}, ${monthName} ${dayNumber}`;
  };

  // Fetch data when current business changes
  useEffect(() => {
    if (currentBusiness?.id && currentUser?.uid) {
      Promise.all([fetchBaggedStocks(), fetchSalesReps(), fetchAllRoutes()]);
    } else {
      setLoading(false);
    }
  }, [currentBusiness?.id, currentUser?.uid]);

  // Update today's route when sales rep is selected
  useEffect(() => {
    if (selectedSalesRep) {
      fetchTodayRoute(selectedSalesRep);
    } else {
      setTodayRouteInfo(null);
    }
  }, [selectedSalesRep, allRoutes]);

  // Initialize selected products when grouped products change - updated with min/max price
  useEffect(() => {
    if (Object.keys(groupedProducts).length > 0) {
      const initialSelections = {};
      Object.keys(groupedProducts).forEach((uniqueKey) => {
        const productData = groupedProducts[uniqueKey];
        initialSelections[uniqueKey] = {
          selectedPriceIndex: 0,
          bagQuantity: "",
          maxAvailableBags: productData.totalAvailableBags,
          maxAvailableWeight: productData.totalAvailableWeight,
          minPrice: "",
          maxPrice: "",
        };
      });
      setSelectedProducts(initialSelections);
      console.log(
        "Initialized selected products for all bag sizes:",
        initialSelections
      );
    }
  }, [groupedProducts]);

  // Process grouped products when bagged stocks change
  useEffect(() => {
    if (Object.keys(baggedStocks).length > 0) {
      processGroupedProducts();
    }
  }, [baggedStocks]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          <h3 className="font-medium">Error loading bagged stocks</h3>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => Promise.all([fetchBaggedStocks(), fetchSalesReps()])}
            className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const hasProducts = Object.keys(groupedProducts).length > 0;
  const selectedRep = salesReps.find((rep) => rep.id === selectedSalesRep);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Create Loading</h1>
            <p className="text-gray-600 mt-1">
              Select products and bag quantities to prepare for loading
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                console.log("=== DEBUG INFO ===");
                console.log("baggedStocks:", baggedStocks);
                console.log("groupedProducts:", groupedProducts);
                console.log("selectedProducts:", selectedProducts);
              }}
              className="px-3 py-2 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
            >
              🐛 Debug
            </button>
            <button
              onClick={() => fetchBaggedStocks()}
              className="px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {!hasProducts ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            No bagged stocks available
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Create some bags from processed batches to start preparing loadings.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Debug Info Panel */}
          {Object.keys(baggedStocks).length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Available Product Summary ({Object.keys(baggedStocks).length}{" "}
                types found)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                {Object.entries(baggedStocks).map(([productType, bags]) => (
                  <div
                    key={productType}
                    className="bg-white p-2 rounded border"
                  >
                    <div className="font-medium text-gray-900">
                      {formatProductType(productType)}
                    </div>
                    <div className="text-gray-600">
                      {bags.length} bags •{" "}
                      {bags
                        .reduce((sum, bag) => sum + (bag.weight || 0), 0)
                        .toFixed(1)}{" "}
                      kg
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading Information */}
          <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Loading Information
            </h2>

            {/* Sales Representative Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sales Representative <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSalesRep}
                onChange={(e) => setSelectedSalesRep(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a sales representative</option>
                {salesReps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name} {rep.employeeId ? `(${rep.employeeId})` : ""}
                  </option>
                ))}
              </select>
              {salesReps.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  No sales representatives found. Please add sales reps first.
                </p>
              )}
            </div>

            {/* Selected Sales Rep Info with Routes */}
            {selectedSalesRep && selectedRep && (
              <div className="mt-4 space-y-4">
                {/* Sales Rep Details */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-blue-900">
                        {selectedRep.name}
                      </h3>
                      <div className="flex items-center space-x-4 text-xs text-blue-700 mt-1">
                        {selectedRep.employeeId && (
                          <span>ID: {selectedRep.employeeId}</span>
                        )}
                        {selectedRep.phone && (
                          <span>📞 {selectedRep.phone}</span>
                        )}
                        {selectedRep.email && (
                          <span>📧 {selectedRep.email}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Today's Route */}
                {todayRouteInfo ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-3">
                      <Navigation className="h-5 w-5 text-green-600" />
                      <h3 className="text-sm font-medium text-green-900">
                        Today's Route - {formatTodayInfo()}
                      </h3>
                    </div>

                    {todayRouteInfo.error ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-red-600" />
                          <p className="text-sm text-red-700">
                            Error loading route: {todayRouteInfo.error}
                          </p>
                        </div>
                      </div>
                    ) : todayRouteInfo.message ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-amber-600" />
                          <p className="text-sm text-amber-700">
                            {todayRouteInfo.message}
                          </p>
                        </div>
                      </div>
                    ) : !todayRouteInfo.isWorkingDay ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-amber-600" />
                          <p className="text-sm text-amber-700">
                            {todayRouteInfo.dayType === "sunday"
                              ? "Sunday - Non-working day"
                              : "Non-working day"}
                          </p>
                        </div>
                      </div>
                    ) : !todayRouteInfo.hasRoute ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-amber-600" />
                          <p className="text-sm text-amber-700">
                            No route assigned for today
                          </p>
                        </div>
                      </div>
                    ) : todayRouteInfo.route ? (
                      <div className="bg-white p-3 rounded-lg border border-green-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <MapPin className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-green-900">
                                {todayRouteInfo.route.name}
                              </span>
                            </div>
                            <div className="space-y-1 text-xs text-green-700">
                              <p>
                                <span className="font-medium">Areas:</span>{" "}
                                {todayRouteInfo.route.areas?.length > 0
                                  ? todayRouteInfo.route.areas
                                      .slice(0, 3)
                                      .join(", ") +
                                    (todayRouteInfo.route.areas.length > 3
                                      ? "..."
                                      : "")
                                  : "No areas specified"}
                              </p>
                              <div className="flex items-center space-x-4">
                                {todayRouteInfo.route.estimatedDistance && (
                                  <span>
                                    📍 {todayRouteInfo.route.estimatedDistance}{" "}
                                    km
                                  </span>
                                )}
                                {todayRouteInfo.route.estimatedTime && (
                                  <span className="flex items-center space-x-1">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {todayRouteInfo.route.estimatedTime} min
                                    </span>
                                  </span>
                                )}
                              </div>
                              {todayRouteInfo.route.description && (
                                <p className="mt-1">
                                  <span className="font-medium">Notes:</span>{" "}
                                  {todayRouteInfo.route.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-red-600" />
                          <p className="text-sm text-red-700">
                            Route assigned but route details not found (Route
                            ID: {todayRouteInfo.routeId})
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : selectedSalesRep ? (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-gray-600" />
                      <p className="text-sm text-gray-600">
                        Loading route information...
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Today's Paddy Prices Section */}
          <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Today's Paddy Prices
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter today's market prices for different paddy types (per kg)
            </p>

            {getUniqueProductTypes().length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {getUniqueProductTypes().map((productType) => (
                  <div key={productType} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {formatProductType(
                        productType.startsWith("rice_")
                          ? productType
                          : `rice_${productType}`
                      )}
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Rs.</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={todayPaddyPrices[productType] || ""}
                        onChange={(e) =>
                          handlePaddyPriceChange(productType, e.target.value)
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="0.00"
                      />
                      <span className="text-xs text-gray-500">per kg</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  No product types available for pricing.
                </p>
              </div>
            )}
          </div>

          {/* Products Table */}
          <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Available Products (Bags)
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Select number of bags to load. Each bag has a specific size and
                weight.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Available Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price/kg
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price/bag
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Required Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Min Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Max Price
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(groupedProducts).map(
                    ([uniqueKey, productData]) => {
                      const selection = selectedProducts[uniqueKey] || {};
                      const maxAvailableBags = getMaxAvailableBags(uniqueKey);
                      const currentPricePerKg = getCurrentPrice(uniqueKey);
                      const bagSize = getBagSize(uniqueKey);
                      const pricePerBag = currentPricePerKg * bagSize;
                      const bagQuantityError = !isBagQuantityValid(uniqueKey);
                      const selectedWeight = calculateProductWeight(uniqueKey);

                      return (
                        <tr key={uniqueKey} className="hover:bg-gray-50">
                          {/* Product Name */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {productData.itemName ||
                                    formatProductType(
                                      productData.originalProductType
                                    )}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Batch: {productData.sourceBatchNumber} •{" "}
                                  {bagSize}kg bags
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Available Quantity */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-semibold">
                              {maxAvailableBags} bags
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatNumber(maxAvailableBags * bagSize)} kg
                              total
                            </div>
                          </td>

                          {/* Price per kg */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-green-600">
                              {formatCurrency(currentPricePerKg)}
                            </div>
                          </td>

                          {/* Price per bag */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-blue-600">
                              {formatCurrency(pricePerBag)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {bagSize}kg × {formatCurrency(currentPricePerKg)}
                            </div>
                          </td>

                          {/* Required Quantity Input */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={maxAvailableBags}
                                  step="1"
                                  value={selection.bagQuantity || ""}
                                  onChange={(e) =>
                                    handleProductChange(
                                      uniqueKey,
                                      "bagQuantity",
                                      e.target.value
                                    )
                                  }
                                  className={`w-20 px-2 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                                    bagQuantityError
                                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                                      : "border-gray-300"
                                  }`}
                                  placeholder="0"
                                />
                                <span className="text-xs text-gray-500">
                                  bags
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                Max: {maxAvailableBags}
                              </div>
                              {bagQuantityError && (
                                <div className="text-xs text-red-600">
                                  Exceeds available
                                </div>
                              )}
                              {selection.bagQuantity && (
                                <div className="text-xs text-blue-600">
                                  = {formatNumber(selectedWeight)} kg
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Min Price Input */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-gray-500">
                                  Rs.
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={selection.minPrice || ""}
                                  onChange={(e) =>
                                    handleProductChange(
                                      uniqueKey,
                                      "minPrice",
                                      e.target.value
                                    )
                                  }
                                  className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="text-xs text-gray-500">
                                per kg
                              </div>
                            </div>
                          </td>

                          {/* Max Price Input */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-gray-500">
                                  Rs.
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={selection.maxPrice || ""}
                                  onChange={(e) =>
                                    handleProductChange(
                                      uniqueKey,
                                      "maxPrice",
                                      e.target.value
                                    )
                                  }
                                  className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="text-xs text-gray-500">
                                per kg
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Loading Summary
                </h3>
                <div className="text-sm text-gray-600 mt-1 space-y-1">
                  <p>Total Bags: {getTotalSelectedBags()} bags</p>
                  <p>
                    Total Weight: {formatNumber(getTotalSelectedWeight())} kg
                  </p>
                  <p>Total Value: {formatCurrency(calculateGrandTotal())}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {getTotalSelectedBags()} bags
                </div>
                <p className="text-sm text-gray-600">Selected for Loading</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setSelectedProducts({});
                  setSelectedSalesRep("");
                  setTodayPaddyPrices({});
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isProcessingLoading}
              >
                Clear All
              </button>
              <button
                onClick={createLoading}
                disabled={
                  isProcessingLoading ||
                  getTotalSelectedBags() <= 0 ||
                  !selectedSalesRep
                }
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessingLoading ? "Creating Loading..." : "Create Loading"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loading;
