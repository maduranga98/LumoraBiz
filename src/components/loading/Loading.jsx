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
  setDoc,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { useBusiness } from "../../contexts/BusinessContext";
import { Package } from "lucide-react";

// Import the separate components
import SalesRepRouteInfo from "./SalesRepRouteInfo";
import DailyPaddyPrices from "./DailyPaddyPrices";
import LoadingSummary from "./LoadingSummary";
import ProductsTable from "./ProductsTab";

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
  const [todayPaddyPrices, setTodayPaddyPrices] = useState({});

  // Initialize stock totals document if it doesn't exist
  const initializeStockTotals = async () => {
    if (!currentUser || !currentBusiness) return;

    try {
      const stockTotalsRef = doc(
        db,
        `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/stockTotals`
      );

      const stockTotalsDoc = await getDoc(stockTotalsRef);

      if (!stockTotalsDoc.exists()) {
        console.log("Creating stock totals document...");
        const initialStockTotals = {
          // Raw materials
          paddy_total: 0,
          paddy_bagged_total: 0,
          paddy_bags_count: 0,
          paddy_loaded_total: 0,
          paddy_loaded_bags_count: 0,

          // Rice types - covering all common varieties
          rice_samba_total: 0,
          rice_samba_bagged_total: 0,
          rice_samba_bags_count: 0,
          rice_samba_loaded_total: 0,
          rice_samba_loaded_bags_count: 0,

          rice_nadu_total: 0,
          rice_nadu_bagged_total: 0,
          rice_nadu_bags_count: 0,
          rice_nadu_loaded_total: 0,
          rice_nadu_loaded_bags_count: 0,

          rice_keeri_samba_total: 0,
          rice_keeri_samba_bagged_total: 0,
          rice_keeri_samba_bags_count: 0,
          rice_keeri_samba_loaded_total: 0,
          rice_keeri_samba_loaded_bags_count: 0,

          rice_red_rice_total: 0,
          rice_red_rice_bagged_total: 0,
          rice_red_rice_bags_count: 0,
          rice_red_rice_loaded_total: 0,
          rice_red_rice_loaded_bags_count: 0,

          rice_basmati_total: 0,
          rice_basmati_bagged_total: 0,
          rice_basmati_bags_count: 0,
          rice_basmati_loaded_total: 0,
          rice_basmati_loaded_bags_count: 0,

          rice_white_rice_total: 0,
          rice_white_rice_bagged_total: 0,
          rice_white_rice_bags_count: 0,
          rice_white_rice_loaded_total: 0,
          rice_white_rice_loaded_bags_count: 0,

          rice_sudu_kakulu_total: 0,
          rice_sudu_kakulu_bagged_total: 0,
          rice_sudu_kakulu_bags_count: 0,
          rice_sudu_kakulu_loaded_total: 0,
          rice_sudu_kakulu_loaded_bags_count: 0,

          rice_kalu_heenati_total: 0,
          rice_kalu_heenati_bagged_total: 0,
          rice_kalu_heenati_bags_count: 0,
          rice_kalu_heenati_loaded_total: 0,
          rice_kalu_heenati_loaded_bags_count: 0,

          // General rice type
          rice_total: 0,
          rice_bagged_total: 0,
          rice_bags_count: 0,
          rice_loaded_total: 0,
          rice_loaded_bags_count: 0,

          // By-products
          hunuSahal_total: 0,
          hunuSahal_bagged_total: 0,
          hunuSahal_bags_count: 0,
          hunuSahal_loaded_total: 0,
          hunuSahal_loaded_bags_count: 0,

          kadunuSahal_total: 0,
          kadunuSahal_bagged_total: 0,
          kadunuSahal_bags_count: 0,
          kadunuSahal_loaded_total: 0,
          kadunuSahal_loaded_bags_count: 0,

          ricePolish_total: 0,
          ricePolish_bagged_total: 0,
          ricePolish_bags_count: 0,
          ricePolish_loaded_total: 0,
          ricePolish_loaded_bags_count: 0,

          dahaiyya_total: 0,
          dahaiyya_bagged_total: 0,
          dahaiyya_bags_count: 0,
          dahaiyya_loaded_total: 0,
          dahaiyya_loaded_bags_count: 0,

          flour_total: 0,
          flour_bagged_total: 0,
          flour_bags_count: 0,
          flour_loaded_total: 0,
          flour_loaded_bags_count: 0,

          // Metadata
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
          businessId: String(currentBusiness.id || ""),
          ownerId: String(currentUser.uid || ""),
        };

        await setDoc(stockTotalsRef, initialStockTotals);
        console.log("Stock totals document initialized successfully");
      } else {
        console.log("Stock totals document already exists");
      }
    } catch (error) {
      console.error("Error initializing stock totals:", error);
    }
  };

  // Helper functions
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

  // Get formatted item name for saving
  const getFormattedItemName = (productData, uniqueKey) => {
    if (productData.itemName) {
      return productData.itemName;
    }

    const productName = formatProductType(productData.originalProductType);
    const bagSize = getBagSize(uniqueKey);
    return `${productName} ${bagSize}kg`;
  };

  // Get bag size for selected option
  const getBagSize = (uniqueKey) => {
    const productData = groupedProducts[uniqueKey];
    return productData?.bagSize || 0;
  };

  // Get current price for a product
  const getCurrentPrice = (uniqueKey) => {
    const productData = groupedProducts[uniqueKey];
    return productData?.price || 0;
  };

  // Calculate total weight for a product
  const calculateProductWeight = (uniqueKey) => {
    const selection = selectedProducts[uniqueKey];
    if (!selection || !selection.bagQuantity || selection.bagQuantity === "") {
      return 0;
    }

    const bagSize = getBagSize(uniqueKey);
    const bagQuantity = parseInt(selection.bagQuantity) || 0;
    return bagQuantity * bagSize;
  };

  // Calculate total value for a product
  const calculateProductTotal = (uniqueKey) => {
    const totalWeight = calculateProductWeight(uniqueKey);
    const price = getCurrentPrice(uniqueKey);
    return totalWeight * price;
  };

  // Validate bag quantity input
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

  // Get max available bags for a product
  const getMaxAvailableBags = (uniqueKey) => {
    const productData = groupedProducts[uniqueKey];
    return productData?.totalAvailableBags || 0;
  };

  // Calculate grand total
  const calculateGrandTotal = () => {
    return Object.keys(groupedProducts).reduce((total, uniqueKey) => {
      return total + calculateProductTotal(uniqueKey);
    }, 0);
  };

  // Get total selected weight
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

  // Get today's day format
  const formatTodayInfo = () => {
    const today = new Date();
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
    const dayNumber = today.getDate();
    const monthName = today.toLocaleDateString("en-US", { month: "long" });
    return `${dayName}, ${monthName} ${dayNumber}`;
  };

  // Fetch bagged stocks
  const fetchBaggedStocks = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Fetching bagged stocks from single collection...");

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

      setBaggedStocks(baggedStocksData);
    } catch (error) {
      console.error("Error fetching bagged stocks:", error);
      setError(`Failed to load bagged stocks: ${error.message}`);
      toast.error(`Failed to load bagged stocks: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Process grouped products
  const processGroupedProducts = () => {
    console.log("Processing grouped products from baggedStocks:", baggedStocks);
    const grouped = {};

    Object.entries(baggedStocks).forEach(([productType, bags]) => {
      const itemGroups = {};

      bags.forEach((bag) => {
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
            uniqueKey: `${productType}_${key}`,
            originalProductType: productType,
          };
        }

        itemGroups[key].bags.push(bag);

        const bagQuantity = bag.quantity || 1;
        const bagWeight =
          bag.totalWeight || bag.weight || bag.bagSize * bagQuantity || 0;

        itemGroups[key].totalBags += bagQuantity;
        itemGroups[key].totalWeight += bagWeight;
      });

      Object.values(itemGroups).forEach((group) => {
        const uniqueKey = group.uniqueKey;

        grouped[uniqueKey] = {
          ...group,
          displayName: `${group.itemName} (Batch: ${group.sourceBatchNumber})`,
          shortDisplayName: `${group.bagSize}kg @ ${formatCurrency(
            group.recommendedSellingPrice
          )}/kg`,
          totalAvailableWeight: group.totalWeight,
          totalAvailableBags: group.totalBags,
          price: group.recommendedSellingPrice,
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

    setGroupedProducts(grouped);
  };

  // FIXED: Create loading function with proper product code handling
  const createLoading = async () => {
    const validSelections = Object.entries(selectedProducts).filter(
      ([uniqueKey, selection]) => {
        const bagQuantity = parseInt(selection?.bagQuantity) || 0;
        const hasPrice = getCurrentPrice(uniqueKey) > 0;
        const isValid = isBagQuantityValid(uniqueKey);
        return bagQuantity > 0 && hasPrice && isValid;
      }
    );

    if (validSelections.length === 0) {
      toast.error(
        "Please select at least one product with valid bag quantity and price"
      );
      return;
    }

    if (!selectedSalesRep) {
      toast.error("Please select a sales representative");
      return;
    }

    setIsProcessingLoading(true);

    try {
      // FIXED: Initialize stock totals document first
      await initializeStockTotals();

      const batch = writeBatch(db);
      const loadingItems = [];
      let totalValue = 0;
      let totalWeight = 0;
      let totalBags = 0;

      const selectedSalesRepData = salesReps.find(
        (rep) => rep.id === selectedSalesRep
      );

      // Process each selected product with quantity reduction logic
      for (const [uniqueKey, selection] of validSelections) {
        const bagQuantity = parseInt(selection.bagQuantity);
        const price = getCurrentPrice(uniqueKey);
        const bagSize = getBagSize(uniqueKey);
        const productData = groupedProducts[uniqueKey];
        const originalProductType = productData.originalProductType;

        const priceOption = productData.priceOptions[0];
        let remainingBags = bagQuantity;
        const usedBags = [];

        // FIFO allocation with quantity reduction
        for (const bag of priceOption.bags) {
          if (remainingBags <= 0) break;

          const bagRef = doc(
            db,
            `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/stock`,
            bag.id
          );

          const bagsToTakeFromThisBag = Math.min(remainingBags, bag.quantity);

          usedBags.push({
            bagId: bag.bagId || bag.id,
            bagDocId: bag.id,
            weight: bagSize * bagsToTakeFromThisBag,
            bagSize: bagSize,
            pricePerKg: price,
            quantityTaken: bagsToTakeFromThisBag,
            // ADDED: Include product code from the bag
            productCode: bag.productCode || null,
          });

          // Reduce quantity instead of changing status
          if (bagsToTakeFromThisBag === bag.quantity) {
            batch.update(bagRef, {
              quantity: 0,
              totalWeight: 0,
              status: "empty",
              loadedAt: serverTimestamp(),
              salesRepId: selectedSalesRep,
              salesRepName: selectedSalesRepData?.name || "",
              updatedAt: serverTimestamp(),
            });
          } else {
            batch.update(bagRef, {
              quantity: increment(-bagsToTakeFromThisBag),
              totalWeight: increment(-bagSize * bagsToTakeFromThisBag),
              lastLoadedAt: serverTimestamp(),
              salesRepId: selectedSalesRep,
              salesRepName: selectedSalesRepData?.name || "",
              updatedAt: serverTimestamp(),
            });
          }

          remainingBags -= bagsToTakeFromThisBag;
        }

        const productWeight = bagQuantity * bagSize;
        const productTotal = productWeight * price;

        let productType,
          riceType = null;
        if (originalProductType.startsWith("rice_")) {
          productType = "rice";
          riceType = originalProductType.replace("rice_", "");
        } else {
          productType = originalProductType;
        }

        const formattedItemName =
          getFormattedItemName(productData, uniqueKey) ||
          `${productType} ${bagSize}kg`;

        // Get product code from the first bag (they should all have the same product code for the same product)
        const productCode =
          usedBags.length > 0 ? usedBags[0].productCode : null;

        loadingItems.push({
          itemName: String(formattedItemName),
          productType: String(productType || "unknown"),
          productCode: String(productCode || ""), // Product code from bagged stock
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
          // ADDED: Additional product identification fields
          originalPaddyType: productData.originalPaddyType
            ? String(productData.originalPaddyType)
            : null,
        });

        totalValue += productTotal;
        totalWeight += productWeight;
        totalBags += bagQuantity;
      }

      // Create loading record
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0];

      const loadingRef = doc(
        collection(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/loadings`
        )
      );

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

      const cleanLoadingData = cleanObjectForFirestore(loadingData);
      batch.set(loadingRef, cleanLoadingData);

      // FIXED: Update stock totals with proper document handling
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

      // FIXED: Use set with merge instead of update to handle non-existent documents
      batch.set(stockTotalsRef, stockUpdates, { merge: true });

      await batch.commit();

      // Reset form
      setSelectedProducts({});
      setSelectedSalesRep("");
      setTodayPaddyPrices({});

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
      toast.error(`Failed to create loading: ${error.message}`);
    } finally {
      setIsProcessingLoading(false);
    }
  };

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

  // Fetch all routes
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
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      const currentDay = today.getDate();
      const planId = `${currentYear}-${currentMonth
        .toString()
        .padStart(2, "0")}`;

      const selectedRep = salesReps.find((rep) => rep.id === repId);
      if (!selectedRep) {
        setTodayRouteInfo(null);
        return;
      }

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

      const monthlyPlanDoc = await getDoc(monthlyPlanDocRef);

      if (!monthlyPlanDoc.exists()) {
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
      const dailyPlans = planData.dailyPlans || {};
      const todayPlan = dailyPlans[currentDay];

      if (!todayPlan) {
        setTodayRouteInfo({
          dayType: "no_plan",
          isWorkingDay: false,
          hasRoute: false,
          route: null,
          message: `No plan found for day ${currentDay}`,
        });
        return;
      }

      if (todayPlan.dayType === "sunday" || !todayPlan.selectedRoute) {
        setTodayRouteInfo({
          dayType: todayPlan.dayType,
          isWorkingDay: todayPlan.dayType === "working",
          hasRoute: false,
          route: null,
        });
        return;
      }

      const routeDetails = allRoutes.find(
        (route) => route.id === todayPlan.selectedRoute
      );

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

  // Product change handler
  const handleProductChange = (uniqueKey, field, value) => {
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

      return updated;
    });
  };

  // Clear all selections
  const handleClearAll = () => {
    setSelectedProducts({});
    setSelectedSalesRep("");
    setTodayPaddyPrices({});
  };

  // Sales rep change handler
  const handleSalesRepChange = (value) => {
    setSelectedSalesRep(value);
  };

  // Check if can create loading
  const canCreateLoading = () => {
    return (
      getTotalSelectedBags() > 0 && selectedSalesRep && !isProcessingLoading
    );
  };

  // Effects
  useEffect(() => {
    if (currentBusiness?.id && currentUser?.uid) {
      Promise.all([fetchBaggedStocks(), fetchSalesReps(), fetchAllRoutes()]);
    } else {
      setLoading(false);
    }
  }, [currentBusiness?.id, currentUser?.uid]);

  useEffect(() => {
    if (selectedSalesRep) {
      fetchTodayRoute(selectedSalesRep);
    } else {
      setTodayRouteInfo(null);
    }
  }, [selectedSalesRep, allRoutes]);

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
    }
  }, [groupedProducts]);

  useEffect(() => {
    if (Object.keys(baggedStocks).length > 0) {
      processGroupedProducts();
    }
  }, [baggedStocks]);

  // Initialize stock totals on component mount
  useEffect(() => {
    if (currentUser && currentBusiness) {
      initializeStockTotals();
    }
  }, [currentUser, currentBusiness]);

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 md:p-6">
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
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
              className="px-3 py-2 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
            >
              🐛 Debug
            </button>
            <button
              onClick={() => fetchBaggedStocks()}
              className="px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {!hasProducts ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                {Object.entries(baggedStocks).map(([productType, bags]) => (
                  <div
                    key={productType}
                    className="bg-white p-3 rounded-lg border shadow-sm"
                  >
                    <div className="font-medium text-gray-900 mb-1">
                      {formatProductType(productType)}
                    </div>
                    <div className="text-gray-600 flex items-center gap-2">
                      <Package className="h-3 w-3" />
                      <span>{bags.length} bags</span>
                      <span>•</span>
                      <span>
                        {bags
                          .reduce((sum, bag) => sum + (bag.weight || 0), 0)
                          .toFixed(1)}{" "}
                        kg
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sales Rep and Route Info Component */}
          <SalesRepRouteInfo
            salesReps={salesReps}
            selectedSalesRep={selectedSalesRep}
            onSalesRepChange={handleSalesRepChange}
            selectedRep={selectedRep}
            todayRouteInfo={todayRouteInfo}
            formatTodayInfo={formatTodayInfo}
          />

          {/* Daily Paddy Prices Component */}
          <DailyPaddyPrices
            uniqueProductTypes={getUniqueProductTypes()}
            todayPaddyPrices={todayPaddyPrices}
            onPaddyPriceChange={handlePaddyPriceChange}
            formatProductType={formatProductType}
          />

          {/* Products Table Component */}
          <ProductsTable
            groupedProducts={groupedProducts}
            selectedProducts={selectedProducts}
            onProductChange={handleProductChange}
            formatCurrency={formatCurrency}
            formatNumber={formatNumber}
            formatProductType={formatProductType}
          />

          {/* Loading Summary Component */}
          <LoadingSummary
            totalSelectedBags={getTotalSelectedBags()}
            totalSelectedWeight={getTotalSelectedWeight()}
            grandTotal={calculateGrandTotal()}
            isProcessingLoading={isProcessingLoading}
            onClearAll={handleClearAll}
            onCreateLoading={createLoading}
            canCreateLoading={canCreateLoading()}
            formatNumber={formatNumber}
            formatCurrency={formatCurrency}
          />
        </div>
      )}
    </div>
  );
};

export default Loading;
