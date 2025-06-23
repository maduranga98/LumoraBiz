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

  // Initialize selected products when grouped products change
  useEffect(() => {
    if (Object.keys(groupedProducts).length > 0) {
      const initialSelections = {};
      Object.keys(groupedProducts).forEach((productType) => {
        const productData = groupedProducts[productType];
        initialSelections[productType] = {
          selectedPriceIndex: productData.priceOptions.length === 1 ? 0 : null,
          quantity: "",
          maxAvailable:
            productData.priceOptions.length === 1
              ? productData.priceOptions[0].totalWeight
              : 0,
        };
      });
      setSelectedProducts(initialSelections);
    }
  }, [groupedProducts]);

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

  // Process grouped products when bagged stocks change
  useEffect(() => {
    if (Object.keys(baggedStocks).length > 0) {
      processGroupedProducts();
    }
  }, [baggedStocks]);

  // Fetch bagged stocks from the database
  const fetchBaggedStocks = async () => {
    setLoading(true);
    setError(null);

    try {
      const baggedStocksData = {};
      const productTypes = [
        "rice",
        "hunuSahal",
        "kadunuSahal",
        "ricePolish",
        "dahaiyya",
        "flour",
      ];

      for (const productType of productTypes) {
        const productCode = getProductTypeCode(productType);
        const baggedStockQuery = query(
          collection(
            db,
            `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/${productCode}`
          ),
          where("status", "==", "available"),
          orderBy("createdAt", "desc")
        );

        try {
          const querySnapshot = await getDocs(baggedStockQuery);
          const bags = [];

          querySnapshot.forEach((doc) => {
            const data = doc.data();
            bags.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
            });
          });

          if (bags.length > 0) {
            baggedStocksData[productType] = bags;
          }
        } catch (error) {
          console.error(`Error fetching ${productType} bagged stocks:`, error);
        }
      }

      setBaggedStocks(baggedStocksData);
    } catch (error) {
      console.error("Error fetching bagged stocks:", error);
      setError(`Failed to load bagged stocks: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get product type code for path
  const getProductTypeCode = (productType) => {
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

  // Process grouped products by type and price
  const processGroupedProducts = () => {
    const grouped = {};

    Object.entries(baggedStocks).forEach(([productType, bags]) => {
      // Group bags by recommended selling price
      const priceGroups = {};

      bags.forEach((bag) => {
        const price = bag.recommendedSellingPrice || bag.pricePerKg || 0;
        const priceKey = price.toString();

        if (!priceGroups[priceKey]) {
          priceGroups[priceKey] = {
            price: price,
            bags: [],
            totalWeight: 0,
            totalBags: 0,
          };
        }

        priceGroups[priceKey].bags.push(bag);
        priceGroups[priceKey].totalWeight += bag.weight || 0;
        priceGroups[priceKey].totalBags += 1;
      });

      // Convert to array and sort by price
      const priceOptions = Object.values(priceGroups).sort(
        (a, b) => a.price - b.price
      );

      grouped[productType] = {
        productType,
        priceOptions,
        totalAvailableWeight: bags.reduce(
          (sum, bag) => sum + (bag.weight || 0),
          0
        ),
        totalAvailableBags: bags.length,
      };
    });

    setGroupedProducts(grouped);
  };

  // FIXED: Enhanced product selection handling
  const handleProductChange = (productType, field, value) => {
    setSelectedProducts((prev) => {
      const updated = { ...prev };

      if (!updated[productType]) {
        updated[productType] = {
          selectedPriceIndex: null,
          quantity: "",
          maxAvailable: 0,
        };
      }

      if (field === "selectedPriceIndex") {
        const priceIndex = parseInt(value);
        const priceOption =
          groupedProducts[productType]?.priceOptions[priceIndex];

        updated[productType] = {
          ...updated[productType],
          selectedPriceIndex: priceIndex,
          maxAvailable: priceOption?.totalWeight || 0,
          // Don't reset quantity automatically - let user keep their input
        };
      } else if (field === "quantity") {
        // Handle quantity input more carefully
        const numValue = value === "" ? "" : Number(value);
        updated[productType] = {
          ...updated[productType],
          quantity: numValue,
        };
      }

      return updated;
    });
  };

  // FIXED: Get max available quantity for a product
  const getMaxAvailable = (productType) => {
    const selection = selectedProducts[productType];
    if (!selection || selection.selectedPriceIndex === null) {
      const productData = groupedProducts[productType];
      if (productData?.priceOptions.length === 1) {
        return productData.priceOptions[0].totalWeight;
      }
      return 0;
    }

    const priceOption =
      groupedProducts[productType]?.priceOptions[selection.selectedPriceIndex];
    return priceOption?.totalWeight || 0;
  };

  // FIXED: Get current price for a product
  const getCurrentPrice = (productType) => {
    const selection = selectedProducts[productType];
    const productData = groupedProducts[productType];

    if (!productData) return 0;

    if (productData.priceOptions.length === 1) {
      return productData.priceOptions[0].price;
    }

    if (
      selection?.selectedPriceIndex !== null &&
      selection?.selectedPriceIndex !== undefined
    ) {
      return productData.priceOptions[selection.selectedPriceIndex]?.price || 0;
    }

    return 0;
  };

  // Calculate total for a product
  const calculateProductTotal = (productType) => {
    const selection = selectedProducts[productType];
    if (!selection || !selection.quantity) {
      return 0;
    }

    const price = getCurrentPrice(productType);
    const quantity = Number(selection.quantity) || 0;

    return quantity * price;
  };

  // Calculate grand total
  const calculateGrandTotal = () => {
    return Object.keys(groupedProducts).reduce((total, productType) => {
      return total + calculateProductTotal(productType);
    }, 0);
  };

  // Get total selected quantity
  const getTotalSelectedQuantity = () => {
    return Object.values(selectedProducts).reduce((total, selection) => {
      return total + (Number(selection?.quantity) || 0);
    }, 0);
  };

  // FIXED: Validate quantity input
  const isQuantityValid = (productType) => {
    const selection = selectedProducts[productType];
    if (!selection || !selection.quantity) return true;

    const quantity = Number(selection.quantity);
    const maxAvailable = getMaxAvailable(productType);

    return quantity > 0 && quantity <= maxAvailable;
  };

  // Handle loading creation
  const createLoading = async () => {
    // Validate selections
    const validSelections = Object.entries(selectedProducts).filter(
      ([productType, selection]) => {
        const quantity = Number(selection?.quantity) || 0;
        const hasPrice = getCurrentPrice(productType) > 0;
        return quantity > 0 && hasPrice && isQuantityValid(productType);
      }
    );

    if (validSelections.length === 0) {
      toast.error(
        "Please select at least one product with valid quantity and price"
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

      // Get selected sales rep details
      const selectedSalesRepData = salesReps.find(
        (rep) => rep.id === selectedSalesRep
      );

      // Process each selected product
      for (const [productType, selection] of validSelections) {
        const quantity = Number(selection.quantity);
        const price = getCurrentPrice(productType);
        const productCode = getProductTypeCode(productType);

        // Get the appropriate price option
        let priceOption;
        if (groupedProducts[productType].priceOptions.length === 1) {
          priceOption = groupedProducts[productType].priceOptions[0];
        } else {
          priceOption =
            groupedProducts[productType].priceOptions[
              selection.selectedPriceIndex
            ];
        }

        let remainingQuantity = quantity;
        const usedBags = [];

        // Allocate bags for this quantity (FIFO - first in, first out)
        for (const bag of priceOption.bags) {
          if (remainingQuantity <= 0) break;

          const bagWeight = bag.weight || 0;
          if (bagWeight <= remainingQuantity) {
            // Use entire bag
            usedBags.push({
              bagId: bag.bagId,
              bagDocId: bag.id,
              weight: bagWeight,
              pricePerKg: price,
            });
            remainingQuantity -= bagWeight;

            // Mark bag as loaded
            const bagRef = doc(
              db,
              `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/${productCode}`,
              bag.id
            );
            batch.update(bagRef, {
              status: "loaded",
              loadedAt: serverTimestamp(),
              salesRepId: selectedSalesRep,
              salesRepName: selectedSalesRepData?.name || "",
              updatedAt: serverTimestamp(),
            });
          } else {
            // Partial bag usage
            usedBags.push({
              bagId: bag.bagId,
              bagDocId: bag.id,
              weight: remainingQuantity,
              pricePerKg: price,
            });
            remainingQuantity = 0;

            // For partial usage, mark as loaded
            const bagRef = doc(
              db,
              `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/${productCode}`,
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
        }

        const productTotal = quantity * price;
        loadingItems.push({
          productType,
          productCode,
          quantity: quantity,
          pricePerKg: price,
          totalValue: productTotal,
          bagsUsed: usedBags,
          bagsCount: usedBags.length,
        });

        totalValue += productTotal;
        totalWeight += quantity;
      }

      // Create loading record
      const loadingRef = doc(
        collection(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/loadings`
        )
      );
      batch.set(loadingRef, {
        loadingId: loadingRef.id,
        items: loadingItems,
        totalWeight: totalWeight,
        totalValue: totalValue,
        itemCount: loadingItems.length,
        salesRepId: selectedSalesRep,
        salesRepName: selectedSalesRepData?.name || "",
        salesRepPhone: selectedSalesRepData?.phone || "",
        salesRepEmail: selectedSalesRepData?.email || "",
        todayRoute: todayRouteInfo?.route || null,
        routeId: todayRouteInfo?.routeId || null,
        status: "prepared",
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        businessId: currentBusiness.id,
        ownerId: currentUser.uid,
      });

      // Update stock totals
      const stockTotalsRef = doc(
        db,
        `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/stockTotals`
      );
      const stockUpdates = {};

      loadingItems.forEach((item) => {
        stockUpdates[`${item.productType}_bagged_total`] = increment(
          -item.quantity
        );
        stockUpdates[`${item.productType}_bags_count`] = increment(
          -item.bagsCount
        );
        stockUpdates[`${item.productType}_loaded_total`] = increment(
          item.quantity
        );
        stockUpdates[`${item.productType}_loaded_bags_count`] = increment(
          item.bagsCount
        );
      });

      stockUpdates.lastUpdated = serverTimestamp();
      batch.update(stockTotalsRef, stockUpdates);

      await batch.commit();

      // Reset form
      setSelectedProducts({});
      setSelectedSalesRep("");

      // Refresh data
      await fetchBaggedStocks();

      toast.success(
        `Loading created successfully for ${
          selectedSalesRepData?.name
        }! Total value: ${formatCurrency(totalValue)} for ${totalWeight}kg`
      );
    } catch (error) {
      console.error("Error creating loading:", error);
      toast.error("Failed to create loading");
    } finally {
      setIsProcessingLoading(false);
    }
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

  // Format product type for display
  const formatProductType = (type) => {
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

  // Get today's day of week for route scheduling
  const formatTodayInfo = () => {
    const today = new Date();
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
    const dayNumber = today.getDate();
    const monthName = today.toLocaleDateString("en-US", { month: "long" });
    return `${dayName}, ${monthName} ${dayNumber}`;
  };

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
        <h1 className="text-2xl font-bold text-gray-800">Create Loading</h1>
        <p className="text-gray-600 mt-1">
          Select products and quantities to prepare for loading
        </p>
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

          {/* Products Table */}
          <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Available Products
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Available Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price per kg
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity to Load
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Value
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(groupedProducts).map(
                    ([productType, productData]) => {
                      const selection = selectedProducts[productType] || {};
                      const maxAvailable = getMaxAvailable(productType);
                      const currentPrice = getCurrentPrice(productType);
                      const quantityError = !isQuantityValid(productType);

                      return (
                        <tr key={productType} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {formatProductType(productType)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {productData.totalAvailableBags} bags
                                  available
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-semibold">
                              {formatNumber(productData.totalAvailableWeight)}{" "}
                              kg
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {productData.priceOptions.length === 1 ? (
                              <div className="text-sm text-gray-900 font-semibold">
                                {formatCurrency(
                                  productData.priceOptions[0].price
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <select
                                  value={selection.selectedPriceIndex ?? ""}
                                  onChange={(e) =>
                                    handleProductChange(
                                      productType,
                                      "selectedPriceIndex",
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                >
                                  <option value="">Select price</option>
                                  {productData.priceOptions.map(
                                    (option, index) => (
                                      <option key={index} value={index}>
                                        {formatCurrency(option.price)} (
                                        {formatNumber(option.totalWeight)}kg
                                        available)
                                      </option>
                                    )
                                  )}
                                </select>
                                {currentPrice > 0 && (
                                  <div className="text-xs text-green-600 font-medium">
                                    Selected: {formatCurrency(currentPrice)}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={maxAvailable}
                                  step="0.01"
                                  value={selection.quantity || ""}
                                  onChange={(e) =>
                                    handleProductChange(
                                      productType,
                                      "quantity",
                                      e.target.value
                                    )
                                  }
                                  disabled={currentPrice <= 0}
                                  className={`w-24 px-2 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 ${
                                    quantityError
                                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                                      : "border-gray-300"
                                  }`}
                                  placeholder="0"
                                />
                                <span className="text-xs text-gray-500">
                                  kg
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                Max: {formatNumber(maxAvailable)} kg
                              </div>
                              {quantityError && (
                                <div className="text-xs text-red-600">
                                  Exceeds available quantity
                                </div>
                              )}
                              {currentPrice <= 0 &&
                                productData.priceOptions.length > 1 && (
                                  <div className="text-xs text-amber-600">
                                    Select price first
                                  </div>
                                )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">
                              {formatCurrency(
                                calculateProductTotal(productType)
                              )}
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
                <p className="text-sm text-gray-600 mt-1">
                  Total Quantity: {formatNumber(getTotalSelectedQuantity())} kg
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(calculateGrandTotal())}
                </div>
                <p className="text-sm text-gray-600">Total Value</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setSelectedProducts({});
                  setSelectedSalesRep("");
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
                  calculateGrandTotal() <= 0 ||
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
