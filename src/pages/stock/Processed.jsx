import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
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
import { useAuth } from "../../contexts/AuthContext";
import { useBusiness } from "../../contexts/BusinessContext";

const ProcessedProducts = () => {
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();

  // States
  const [batches, setBatches] = useState([]);
  const [stockTotals, setStockTotals] = useState({});
  const [baggedInventory, setBaggedInventory] = useState({});
  const [baggedStocks, setBaggedStocks] = useState({});
  const [bagSizes, setBagSizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [expandedRows, setExpandedRows] = useState({});

  // Modal states
  const [showBagSizeModal, setShowBagSizeModal] = useState(false);
  const [showBagCreationModal, setShowBagCreationModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showIndividualBagSellModal, setShowIndividualBagSellModal] =
    useState(false);
  const [showBagDetailsModal, setShowBagDetailsModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedBag, setSelectedBag] = useState(null);
  const [selectedProductForBagging, setSelectedProductForBagging] =
    useState(null);
  const [bagCreationData, setBagCreationData] = useState({
    sizeKg: "",
    quantity: "",
    productType: "",
    batchId: "",
  });
  const [sellData, setSellData] = useState({
    products: {},
    customerName: "",
    customerPhone: "",
    notes: "",
  });
  const [individualBagSellData, setIndividualBagSellData] = useState({
    customerName: "",
    customerPhone: "",
    sellingPrice: 0,
    notes: "",
  });
  const [newBagSize, setNewBagSize] = useState("");
  const [isCreatingBags, setIsCreatingBags] = useState(false);
  const [isSelling, setIsSelling] = useState(false);

  // Fetch data when current business changes
  useEffect(() => {
    if (currentBusiness?.id && currentUser?.uid) {
      fetchAllData();
    } else {
      setLoading(false);
    }
  }, [currentBusiness?.id, currentUser?.uid, sortField, sortDirection]);

  // Fetch all data
  // Updated fetchAllData function with proper sequence
  const fetchAllData = async () => {
    if (!currentBusiness?.id || !currentUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Fetch batches first since we need them for product type discovery
      await fetchProcessedBatches();

      // Step 2: Wait a moment for batches state to update, then fetch other data
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Step 3: Fetch other data in parallel
      await Promise.all([
        fetchStockTotals(),
        fetchBaggedInventory(),
        fetchBagSizes(),
      ]);

      // Step 4: Fetch bagged stocks last, after we have batches data
      // This needs to be separate to ensure batches state is updated
      setTimeout(() => {
        fetchBaggedStocks();
      }, 200);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Alternative: More robust approach using state callback
  const fetchAllDataRobust = async () => {
    if (!currentBusiness?.id || !currentUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch batches first
      await fetchProcessedBatches();

      // Fetch other static data
      await Promise.all([
        fetchStockTotals(),
        fetchBaggedInventory(),
        fetchBagSizes(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add a separate useEffect for bagged stocks that depends on batches
  useEffect(() => {
    if (batches.length > 0 && currentBusiness?.id && currentUser?.uid) {
      fetchBaggedStocks();
    }
  }, [batches.length, currentBusiness?.id, currentUser?.uid]);
  // Helper function to discover all product types from multiple sources
  const discoverAllProductTypes = () => {
    const productTypes = new Set();
    const riceTypes = new Set();

    // From batches
    batches.forEach((batch) => {
      if (batch.products) {
        Object.keys(batch.products).forEach((productType) => {
          productTypes.add(productType);
          if (productType === "rice" && batch.originalPaddyType) {
            riceTypes.add(batch.originalPaddyType);
          }
        });
      }
    });

    // From stock totals (extract from keys)
    if (stockTotals) {
      Object.keys(stockTotals).forEach((key) => {
        // Extract rice types from stock totals keys like "rice_samba", "rice_nadu_bagged_total"
        if (
          key.startsWith("rice_") &&
          !key.includes("_bagged_") &&
          !key.includes("_bags_")
        ) {
          const riceType = key.replace("rice_", "");
          if (riceType && riceType !== "rice") {
            riceTypes.add(riceType);
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
            productTypes.add(product);
          }
        });
      });
    }

    // Add rice as a product type if we have rice types
    if (riceTypes.size > 0) {
      productTypes.add("rice");
    }

    return {
      productTypes: Array.from(productTypes),
      riceTypes: Array.from(riceTypes),
    };
  };

  // Enhanced fetchBaggedStocks using the discovery helper
  const fetchBaggedStocksWithDiscovery = async () => {
    try {
      console.log("Starting enhanced bagged stocks fetch with discovery...");

      const { productTypes, riceTypes } = discoverAllProductTypes();
      console.log("Discovered product types:", productTypes);
      console.log("Discovered rice types:", riceTypes);

      const baggedStocksData = {};

      // Check each discovered product type
      for (const productType of productTypes) {
        if (productType === "rice") {
          // Handle each rice type
          for (const riceType of riceTypes) {
            const productCode = getProductTypeCode("rice", riceType);
            const displayName = `rice_${riceType}`;
            const collectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/${productCode}`;

            try {
              const baggedStockQuery = query(
                collection(db, collectionPath),
                where("status", "==", "available"),
                orderBy("createdAt", "desc")
              );

              const querySnapshot = await getDocs(baggedStockQuery);

              if (!querySnapshot.empty) {
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

                console.log(`Found ${bags.length} bags for rice ${riceType}`);
                baggedStocksData[displayName] = bags;
              }
            } catch (error) {
              console.log(`No bags found for rice ${riceType}:`, error.message);
            }
          }
        } else {
          // Handle non-rice products
          const productCode = getProductTypeCode(productType);
          const collectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/${productCode}`;

          try {
            const baggedStockQuery = query(
              collection(db, collectionPath),
              where("status", "==", "available"),
              orderBy("createdAt", "desc")
            );

            const querySnapshot = await getDocs(baggedStockQuery);

            if (!querySnapshot.empty) {
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

              console.log(`Found ${bags.length} bags for ${productType}`);
              baggedStocksData[productType] = bags;
            }
          } catch (error) {
            console.log(`No bags found for ${productType}:`, error.message);
          }
        }
      }

      console.log("Final discovered baggedStocksData:", baggedStocksData);
      setBaggedStocks(baggedStocksData);
    } catch (error) {
      console.error("Error in discovery-based fetch:", error);
      toast.error(`Failed to load bagged stocks: ${error.message}`);
    }
  };
  // Fetch processed batches from the correct path
  const fetchProcessedBatches = async () => {
    try {
      const batchesQuery = query(
        collection(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/processedStock/stock`
        ),
        where("status", "==", "available"),
        orderBy(sortField, sortDirection)
      );

      const querySnapshot = await getDocs(batchesQuery);
      const batchesList = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        batchesList.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          processedAt: data.processedAt?.toDate() || new Date(),
        });
      });

      setBatches(batchesList);
    } catch (error) {
      console.error("Error fetching processed batches:", error);
      setError(`Failed to load processed batches: ${error.message}`);
      toast.error(`Failed to load processed batches: ${error.message}`);
    }
  };

  // Fetch bagged stocks from the new structure
  // Enhanced fetchBaggedStocks function that dynamically discovers all product collections
  const fetchBaggedStocks = async () => {
    try {
      console.log("Starting enhanced fetchBaggedStocks...");
      const baggedStocksData = {};

      // Step 1: Get all available product types from current batches
      const availableProductTypes = new Set();
      const availableRiceTypes = new Set();

      // Extract product types from batches
      batches.forEach((batch) => {
        if (batch.products) {
          Object.keys(batch.products).forEach((productType) => {
            if (batch.products[productType] > 0) {
              availableProductTypes.add(productType);

              // If it's rice, also track the rice type
              if (productType === "rice" && batch.originalPaddyType) {
                availableRiceTypes.add(batch.originalPaddyType);
              }
            }
          });
        }
      });

      console.log(
        "Available product types from batches:",
        Array.from(availableProductTypes)
      );
      console.log(
        "Available rice types from batches:",
        Array.from(availableRiceTypes)
      );

      // Step 2: Check each discovered product type for bagged stocks
      for (const productType of availableProductTypes) {
        if (productType === "rice") {
          // Handle rice types separately
          for (const riceType of availableRiceTypes) {
            const productCode = getProductTypeCode("rice", riceType);
            const displayName = `rice_${riceType}`;
            const collectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/${productCode}`;

            console.log(`Checking rice ${riceType} at path: ${collectionPath}`);

            try {
              const baggedStockQuery = query(
                collection(db, collectionPath),
                where("status", "==", "available"),
                orderBy("createdAt", "desc")
              );

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

              console.log(
                `Found ${bags.length} available bags for rice ${riceType}`
              );

              if (bags.length > 0) {
                baggedStocksData[displayName] = bags;
              }
            } catch (error) {
              console.log(
                `No rice bags found for ${riceType} or access error:`,
                error.message
              );
            }
          }
        } else {
          // Handle non-rice products
          const productCode = getProductTypeCode(productType);
          const collectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/${productCode}`;

          console.log(`Checking ${productType} at path: ${collectionPath}`);

          try {
            const baggedStockQuery = query(
              collection(db, collectionPath),
              where("status", "==", "available"),
              orderBy("createdAt", "desc")
            );

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

            console.log(
              `Found ${bags.length} available bags for ${productType}`
            );

            if (bags.length > 0) {
              baggedStocksData[productType] = bags;
            }
          } catch (error) {
            console.log(
              `No bags found for ${productType} or access error:`,
              error.message
            );
          }
        }
      }

      // Step 3: Also check for any additional product types that might exist in Firebase
      // but aren't in current batches (in case there are historical bags)
      const additionalProductTypes = [
        "hunuSahal",
        "kadunuSahal",
        "ricePolish",
        "dahaiyya",
        "flour",
      ];

      for (const productType of additionalProductTypes) {
        if (!availableProductTypes.has(productType)) {
          const productCode = getProductTypeCode(productType);
          const collectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/${productCode}`;

          console.log(
            `Checking additional product ${productType} at path: ${collectionPath}`
          );

          try {
            const baggedStockQuery = query(
              collection(db, collectionPath),
              where("status", "==", "available"),
              orderBy("createdAt", "desc")
            );

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

            console.log(
              `Found ${bags.length} additional available bags for ${productType}`
            );

            if (bags.length > 0) {
              baggedStocksData[productType] = bags;
            }
          } catch (error) {
            console.log(
              `No additional bags found for ${productType}:`,
              error.message
            );
          }
        }
      }

      console.log("Final baggedStocksData:", baggedStocksData);
      setBaggedStocks(baggedStocksData);
    } catch (error) {
      console.error("Error fetching bagged stocks:", error);
      toast.error(`Failed to load bagged stocks: ${error.message}`);
    }
  };

  // Alternative approach using Firestore collection listing (if you want to be more comprehensive)
  const fetchBaggedStocksComprehensive = async () => {
    try {
      console.log("Starting comprehensive fetchBaggedStocks...");
      const baggedStocksData = {};

      // Get the base path for bagged stock
      const basePath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock`;

      // Since we can't list collections directly in the web SDK, we'll use a hybrid approach
      // First, get product types from current batches
      const knownProductTypes = new Set();
      const knownRiceTypes = new Set();

      batches.forEach((batch) => {
        if (batch.products) {
          Object.keys(batch.products).forEach((productType) => {
            knownProductTypes.add(productType);
            if (productType === "rice" && batch.originalPaddyType) {
              knownRiceTypes.add(batch.originalPaddyType);
            }
          });
        }
      });

      // Add common product types that might not be in current batches
      const commonProductTypes = [
        "hunuSahal",
        "kadunuSahal",
        "ricePolish",
        "dahaiyya",
        "flour",
      ];
      commonProductTypes.forEach((type) => knownProductTypes.add(type));

      // Add common rice types
      const commonRiceTypes = [
        "samba",
        "nadu",
        "keeri_samba",
        "red_rice",
        "basmati",
        "white_rice",
      ];
      commonRiceTypes.forEach((type) => knownRiceTypes.add(type));

      // Check each product type
      for (const productType of knownProductTypes) {
        if (productType === "rice") {
          // Handle rice types
          for (const riceType of knownRiceTypes) {
            const productCode = getProductTypeCode("rice", riceType);
            const displayName = `rice_${riceType}`;

            try {
              const baggedStockQuery = query(
                collection(db, `${basePath}/${productCode}`),
                where("status", "==", "available"),
                orderBy("createdAt", "desc")
              );

              const querySnapshot = await getDocs(baggedStockQuery);

              if (!querySnapshot.empty) {
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

                console.log(`Found ${bags.length} bags for rice ${riceType}`);
                baggedStocksData[displayName] = bags;
              }
            } catch (error) {
              // Collection doesn't exist or no permission - this is normal
              console.log(`No collection found for rice ${riceType}`);
            }
          }
        } else {
          // Handle non-rice products
          const productCode = getProductTypeCode(productType);

          try {
            const baggedStockQuery = query(
              collection(db, `${basePath}/${productCode}`),
              where("status", "==", "available"),
              orderBy("createdAt", "desc")
            );

            const querySnapshot = await getDocs(baggedStockQuery);

            if (!querySnapshot.empty) {
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

              console.log(`Found ${bags.length} bags for ${productType}`);
              baggedStocksData[productType] = bags;
            }
          } catch (error) {
            // Collection doesn't exist or no permission - this is normal
            console.log(`No collection found for ${productType}`);
          }
        }
      }

      console.log("Final comprehensive baggedStocksData:", baggedStocksData);
      setBaggedStocks(baggedStocksData);
    } catch (error) {
      console.error("Error in comprehensive fetch:", error);
      toast.error(`Failed to load bagged stocks: ${error.message}`);
    }
  };

  const debugBaggedStocks = async () => {
    try {
      console.log("=== DEBUG: Checking all bagged stock collections ===");

      const standardProductTypes = [
        "hunuSahal",
        "kadunuSahal",
        "ricePolish",
        "dahaiyya",
        "flour",
      ];

      for (const productType of standardProductTypes) {
        const productCode = getProductTypeCode(productType);
        const collectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/${productCode}`;

        console.log(`Checking collection: ${collectionPath}`);

        try {
          const querySnapshot = await getDocs(collection(db, collectionPath));

          console.log(
            `${productType} (${productCode}): ${querySnapshot.size} documents`
          );

          querySnapshot.forEach((doc) => {
            console.log(`  - ${doc.id}:`, doc.data());
          });
        } catch (error) {
          console.log(`  Error accessing ${productType}:`, error.message);
        }
      }
    } catch (error) {
      console.error("Debug error:", error);
    }
  };

  // Get product type code for path
  const getProductTypeCode = (productType, riceType = null) => {
    const codeMap = {
      rice: riceType
        ? `rice_${riceType.toLowerCase().replace(/\s+/g, "_")}`
        : "rice",
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

  // Simplified fetchStockTotals - no auto-creation needed now
  const fetchStockTotals = async () => {
    try {
      const stockTotalsDoc = await getDoc(
        doc(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/stockTotals`
        )
      );

      if (stockTotalsDoc.exists()) {
        setStockTotals(stockTotalsDoc.data());
      } else {
        setStockTotals({});
      }
    } catch (error) {
      console.error("Error fetching stock totals:", error);
      setStockTotals({});
    }
  };

  // Simplified fetchBaggedInventory - no auto-creation needed now
  const fetchBaggedInventory = async () => {
    try {
      const baggedInventoryDoc = await getDoc(
        doc(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/inventory/baggedInventory`
        )
      );

      if (baggedInventoryDoc.exists()) {
        setBaggedInventory(baggedInventoryDoc.data());
      } else {
        setBaggedInventory({});
      }
    } catch (error) {
      console.error("Error fetching bagged inventory:", error);
      setBaggedInventory({});
    }
  };

  // Updated fetchBagSizes function - removed automatic default bag sizes creation
  const fetchBagSizes = async () => {
    try {
      const bagSizesDoc = await getDoc(
        doc(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/settings/bagSizes`
        )
      );
      console.log(
        `owners/${currentUser.uid}/businesses/${currentBusiness.id}/settings/bagSizes`
      );
      if (bagSizesDoc.exists()) {
        setBagSizes(bagSizesDoc.data().sizes || []);
      } else {
        // Don't automatically create default sizes - let user add them manually
        setBagSizes([]);
      }
    } catch (error) {
      console.error("Error fetching bag sizes:", error);
      setBagSizes([]);
    }
  };

  // Updated addBagSize function with better error handling
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
      setBagSizes(updatedSizes);

      // Check if document exists, if not create it
      const bagSizesDocRef = doc(
        db,
        `owners/${currentUser.uid}/businesses/${currentBusiness.id}/settings/bagSizes`
      );

      const bagSizesDoc = await getDoc(bagSizesDocRef);

      if (bagSizesDoc.exists()) {
        // Update existing document
        await updateDoc(bagSizesDocRef, {
          sizes: updatedSizes,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create new document if it doesn't exist
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
    } catch (error) {
      console.error("Error adding bag size:", error);
      toast.error("Failed to add bag size");
      // Revert the local state change if database update failed
      setBagSizes(bagSizes);
    }
  };

  // Remove bag size
  const removeBagSize = async (sizeToRemove) => {
    try {
      const updatedSizes = bagSizes.filter((size) => size !== sizeToRemove);
      setBagSizes(updatedSizes);

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
    } catch (error) {
      console.error("Error removing bag size:", error);
      toast.error("Failed to remove bag size");
    }
  };

  // Enhanced createBags function with proper first-stock handling
  const createBags = async () => {
    const { sizeKg, quantity, productType, batchId } = bagCreationData;

    if (!sizeKg || !quantity || !productType || !batchId) {
      toast.error("Please fill all required fields");
      return;
    }

    const sizeKgNum = parseFloat(sizeKg);
    const quantityNum = parseInt(quantity);
    const totalWeight = sizeKgNum * quantityNum;
    const bagSizeKey = `${sizeKgNum}kg`;

    // Find the batch and check available quantity
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
      // Get product code with rice type consideration
      let productCode, stockTotalKey, baggedTotalKey, bagCountKey;

      if (productType === "rice") {
        const riceType = batch.originalPaddyType;
        productCode = getProductTypeCode(productType, riceType);
        stockTotalKey = `rice_${riceType}`;
        baggedTotalKey = `rice_${riceType}_bagged_total`;
        bagCountKey = `rice_${riceType}_bags_count`;
      } else {
        productCode = getProductTypeCode(productType);
        stockTotalKey = productType;
        baggedTotalKey = `${productType}_bagged_total`;
        bagCountKey = `${productType}_bags_count`;
      }

      console.log("Creating bags with productCode:", productCode); // Debug log
      console.log(
        "Collection path will be:",
        `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/${productCode}`
      ); // Debug log

      // Step 1: Check if documents exist and get current values
      const stockTotalsRef = doc(
        db,
        `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/stockTotals`
      );

      const baggedInventoryRef = doc(
        db,
        `owners/${currentUser.uid}/businesses/${currentBusiness.id}/inventory/baggedInventory`
      );

      const [stockTotalsSnap, baggedInventorySnap] = await Promise.all([
        getDoc(stockTotalsRef),
        getDoc(baggedInventoryRef),
      ]);

      // Step 2: Calculate new values based on current state
      let newStockTotals;
      let newBaggedInventory;

      if (stockTotalsSnap.exists()) {
        const currentData = stockTotalsSnap.data();
        newStockTotals = {
          ...currentData,
          [stockTotalKey]: (currentData[stockTotalKey] || 0) - totalWeight,
          [baggedTotalKey]: (currentData[baggedTotalKey] || 0) + totalWeight,
          [bagCountKey]: (currentData[bagCountKey] || 0) + quantityNum,
          lastUpdated: serverTimestamp(),
        };
      } else {
        // Initialize with rice type specific fields
        const riceTypes = [
          ...new Set(batches.map((b) => b.originalPaddyType).filter(Boolean)),
        ];
        newStockTotals = {
          businessId: currentBusiness.id,
          ownerId: currentUser.uid,
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
          // Standard product types
          hunuSahal: 0,
          kadunuSahal: 0,
          ricePolish: 0,
          dahaiyya: 0,
          flour: 0,
          hunuSahal_bagged_total: 0,
          kadunuSahal_bagged_total: 0,
          ricePolish_bagged_total: 0,
          dahaiyya_bagged_total: 0,
          flour_bagged_total: 0,
          hunuSahal_bags_count: 0,
          kadunuSahal_bags_count: 0,
          ricePolish_bags_count: 0,
          dahaiyya_bags_count: 0,
          flour_bags_count: 0,
        };

        // Add rice type specific fields
        riceTypes.forEach((riceType) => {
          newStockTotals[`rice_${riceType}`] = 0;
          newStockTotals[`rice_${riceType}_bagged_total`] = 0;
          newStockTotals[`rice_${riceType}_bags_count`] = 0;
        });

        // Set actual values for this operation
        newStockTotals[stockTotalKey] = -totalWeight;
        newStockTotals[baggedTotalKey] = totalWeight;
        newStockTotals[bagCountKey] = quantityNum;
      }

      if (baggedInventorySnap.exists()) {
        const currentData = baggedInventorySnap.data();
        newBaggedInventory = {
          ...currentData,
          lastUpdated: serverTimestamp(),
        };

        // Handle nested bag size counting with rice type consideration
        const inventoryKey =
          productType === "rice"
            ? `rice_${batch.originalPaddyType}`
            : productType;
        if (!newBaggedInventory[inventoryKey]) {
          newBaggedInventory[inventoryKey] = {};
        }
        newBaggedInventory[inventoryKey][bagSizeKey] =
          (currentData[inventoryKey]?.[bagSizeKey] || 0) + quantityNum;
      } else {
        const inventoryKey =
          productType === "rice"
            ? `rice_${batch.originalPaddyType}`
            : productType;
        newBaggedInventory = {
          businessId: currentBusiness.id,
          ownerId: currentUser.uid,
          lastUpdated: serverTimestamp(),
          createdAt: serverTimestamp(),
          [inventoryKey]: {
            [bagSizeKey]: quantityNum,
          },
        };
      }

      // Step 3: Execute all operations in a batch
      const batch_write = writeBatch(db);
      const createdBagIds = [];

      // Create individual bag documents
      for (let i = 0; i < quantityNum; i++) {
        const bagId = `BAG_${Date.now()}_${i + 1}`;
        const bagRef = doc(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/${productCode}`,
          bagId
        );

        const bagData = {
          bagId: bagId,
          productType: productType,
          productCode: productCode,
          bagSize: sizeKgNum,
          weight: sizeKgNum,
          sourceBatchId: batchId,
          sourceBatchNumber: batch.batchNumber,
          originalPaddyType: batch.originalPaddyType,
          riceType: productType === "rice" ? batch.originalPaddyType : null, // Store rice type explicitly
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

        console.log(`Creating bag ${bagId} with data:`, bagData); // Debug log

        batch_write.set(bagRef, bagData);
        createdBagIds.push(bagId);
      }

      // Update batch - reduce product quantity
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

      // Set/update stock totals
      batch_write.set(stockTotalsRef, newStockTotals);

      // Set/update bagged inventory
      batch_write.set(baggedInventoryRef, newBaggedInventory);

      // Execute all operations atomically
      await batch_write.commit();

      console.log("Batch write completed successfully"); // Debug log

      // Refresh data
      await fetchAllData();

      // Reset form and close modal
      setBagCreationData({
        sizeKg: "",
        quantity: "",
        productType: "",
        batchId: "",
      });
      setShowBagCreationModal(false);
      setSelectedProductForBagging(null);

      const riceTypeText =
        productType === "rice" ? ` (${batch.originalPaddyType})` : "";
      toast.success(
        `Successfully created ${quantityNum} bags of ${sizeKgNum}kg ${formatProductType(
          productType
        )}${riceTypeText}. Bag IDs: ${createdBagIds.slice(0, 3).join(", ")}${
          quantityNum > 3 ? "..." : ""
        }`
      );
    } catch (error) {
      console.error("Error creating bags:", error);
      toast.error(`Failed to create bags: ${error.message}`);
    } finally {
      setIsCreatingBags(false);
    }
  };

  const DebugButton = () => (
    <button
      onClick={debugBaggedStocks}
      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm flex items-center transition-colors"
    >
      🐛 Debug Stocks
    </button>
  );
  // Sell individual bag
  const sellIndividualBag = (bag) => {
    setSelectedBag(bag);
    setIndividualBagSellData({
      customerName: "",
      customerPhone: "",
      sellingPrice: bag.recommendedSellingPrice || bag.pricePerKg,
      notes: "",
    });
    setShowIndividualBagSellModal(true);
  };

  // Enhanced handleIndividualBagSale with same approach
  const handleIndividualBagSale = async () => {
    if (!selectedBag) return;

    const { customerName, customerPhone, sellingPrice, notes } =
      individualBagSellData;

    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (!sellingPrice || parseFloat(sellingPrice) <= 0) {
      toast.error("Valid selling price is required");
      return;
    }

    const finalPrice = parseFloat(sellingPrice);
    const totalAmount = finalPrice * selectedBag.weight;

    try {
      // Get product code with rice type consideration
      let productCode, stockTotalKey, baggedTotalKey, bagCountKey;

      if (selectedBag.productType === "rice") {
        const riceType = selectedBag.riceType || selectedBag.originalPaddyType;
        productCode = getProductTypeCode("rice", riceType);
        stockTotalKey = `rice_${riceType}`;
        baggedTotalKey = `rice_${riceType}_bagged_total`;
        bagCountKey = `rice_${riceType}_bags_count`;
      } else {
        productCode = getProductTypeCode(selectedBag.productType);
        stockTotalKey = selectedBag.productType;
        baggedTotalKey = `${selectedBag.productType}_bagged_total`;
        bagCountKey = `${selectedBag.productType}_bags_count`;
      }

      // Step 1: Check if stock totals document exists
      const stockTotalsRef = doc(
        db,
        `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/stockTotals`
      );

      const stockTotalsSnap = await getDoc(stockTotalsRef);

      // Step 2: Calculate new values
      let newStockTotals;

      if (stockTotalsSnap.exists()) {
        const currentData = stockTotalsSnap.data();
        newStockTotals = {
          ...currentData,
          [baggedTotalKey]: Math.max(
            0,
            (currentData[baggedTotalKey] || 0) - selectedBag.weight
          ),
          [bagCountKey]: Math.max(0, (currentData[bagCountKey] || 0) - 1),
          lastUpdated: serverTimestamp(),
        };
      } else {
        // Initialize if doesn't exist (shouldn't happen for sales, but handle gracefully)
        const riceTypes = [
          ...new Set(batches.map((b) => b.originalPaddyType).filter(Boolean)),
        ];
        newStockTotals = {
          businessId: currentBusiness.id,
          ownerId: currentUser.uid,
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
          hunuSahal: 0,
          kadunuSahal: 0,
          ricePolish: 0,
          dahaiyya: 0,
          flour: 0,
          hunuSahal_bagged_total: 0,
          kadunuSahal_bagged_total: 0,
          ricePolish_bagged_total: 0,
          dahaiyya_bagged_total: 0,
          flour_bagged_total: 0,
          hunuSahal_bags_count: 0,
          kadunuSahal_bags_count: 0,
          ricePolish_bags_count: 0,
          dahaiyya_bags_count: 0,
          flour_bags_count: 0,
        };

        // Add rice type specific fields
        riceTypes.forEach((riceType) => {
          newStockTotals[`rice_${riceType}`] = 0;
          newStockTotals[`rice_${riceType}_bagged_total`] = 0;
          newStockTotals[`rice_${riceType}_bags_count`] = 0;
        });

        // Set current operation values
        newStockTotals[baggedTotalKey] = 0;
        newStockTotals[bagCountKey] = 0;
      }

      // Step 3: Execute operations in batch
      const batch_write = writeBatch(db);

      // Update bag status to sold
      const bagRef = doc(
        db,
        `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/${productCode}`,
        selectedBag.id
      );
      batch_write.update(bagRef, {
        status: "sold",
        soldAt: serverTimestamp(),
        soldTo: customerName,
        customerPhone: customerPhone,
        sellingPrice: finalPrice,
        totalAmount: totalAmount,
        saleNotes: notes,
        updatedAt: serverTimestamp(),
      });

      // Create sale record
      const saleRef = doc(
        collection(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/sales`
        )
      );
      batch_write.set(saleRef, {
        saleType: "individual_bag",
        bagId: selectedBag.bagId,
        bagDocId: selectedBag.id,
        productType: selectedBag.productType,
        productCode: productCode,
        riceType: selectedBag.riceType || selectedBag.originalPaddyType,
        weight: selectedBag.weight,
        bagSize: selectedBag.bagSize,
        sourceBatchId: selectedBag.sourceBatchId,
        sourceBatchNumber: selectedBag.sourceBatchNumber,
        originalPaddyType: selectedBag.originalPaddyType,
        costPerKg: selectedBag.pricePerKg,
        sellingPrice: finalPrice,
        totalAmount: totalAmount,
        profit: (finalPrice - selectedBag.pricePerKg) * selectedBag.weight,
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
      batch_write.set(stockTotalsRef, newStockTotals);

      await batch_write.commit();
      await fetchAllData();

      setShowIndividualBagSellModal(false);
      setSelectedBag(null);
      setIndividualBagSellData({
        customerName: "",
        customerPhone: "",
        sellingPrice: 0,
        notes: "",
      });

      const riceTypeText =
        selectedBag.productType === "rice"
          ? ` (${selectedBag.riceType || selectedBag.originalPaddyType})`
          : "";
      toast.success(
        `Successfully sold ${selectedBag.weight}kg ${formatProductType(
          selectedBag.productType
        )}${riceTypeText} bag for ${formatCurrency(totalAmount)}`
      );
    } catch (error) {
      console.error("Error selling individual bag:", error);
      toast.error(`Failed to sell bag: ${error.message}`);
    }
  };

  // View bag details
  const viewBagDetails = (bag) => {
    setSelectedBag(bag);
    setShowBagDetailsModal(true);
  };

  // Open bag creation modal
  const openBagCreationModal = (productType, batchId) => {
    setSelectedProductForBagging(productType);
    setBagCreationData({
      sizeKg: "",
      quantity: "",
      productType: productType,
      batchId: batchId,
    });
    setShowBagCreationModal(true);
  };

  // Open sell modal
  const openSellModal = (batch) => {
    setSelectedBatch(batch);

    // Initialize sell data with available products
    const products = {};
    Object.keys(batch.products || {}).forEach((productType) => {
      if (batch.products[productType] > 0) {
        products[productType] = {
          available: batch.products[productType],
          selling: 0,
          pricePerKg: batch.pricingData?.adjustedRicePrice || 0,
        };
      }
    });

    setSellData({
      products: products,
      customerName: "",
      customerPhone: "",
      notes: "",
    });
    setShowSellModal(true);
  };

  // Handle sell products
  const handleSellProducts = async () => {
    if (!selectedBatch) return;

    // Validate sell data
    const sellingProducts = Object.entries(sellData.products).filter(
      ([_, data]) => data.selling > 0
    );
    if (sellingProducts.length === 0) {
      toast.error("Please specify quantities to sell");
      return;
    }

    if (!sellData.customerName.trim()) {
      toast.error("Please enter customer name");
      return;
    }

    setIsSelling(true);

    try {
      const batch_write = writeBatch(db);

      let totalRevenue = 0;
      let totalWeight = 0;

      // Update batch quantities and calculate totals
      sellingProducts.forEach(([productType, data]) => {
        if (data.selling > data.available) {
          throw new Error(`Cannot sell more ${productType} than available`);
        }

        totalRevenue += data.selling * data.pricePerKg;
        totalWeight += data.selling;

        // Update batch
        const batchRef = doc(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/processedStock/stock`,
          selectedBatch.id
        );
        batch_write.update(batchRef, {
          [`products.${productType}`]: increment(-data.selling),
          totalQuantity: increment(-data.selling),
          updatedAt: serverTimestamp(),
        });

        // Update stock totals
        const stockTotalsRef = doc(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/stockTotals`
        );
        batch_write.update(stockTotalsRef, {
          [productType]: increment(-data.selling),
          lastUpdated: serverTimestamp(),
        });
      });

      // Create sale record
      const saleRef = doc(
        collection(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/sales`
        )
      );
      batch_write.set(saleRef, {
        saleType: "batch_products",
        sourceBatchId: selectedBatch.id,
        sourceBatchNumber: selectedBatch.batchNumber,
        products: Object.fromEntries(
          sellingProducts.map(([productType, data]) => [
            productType,
            {
              quantity: data.selling,
              pricePerKg: data.pricePerKg,
              total: data.selling * data.pricePerKg,
            },
          ])
        ),
        customerName: sellData.customerName,
        customerPhone: sellData.customerPhone,
        notes: sellData.notes,
        totalWeight: totalWeight,
        totalRevenue: totalRevenue,
        saleDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        businessId: currentBusiness.id,
        ownerId: currentUser.uid,
        status: "completed",
      });

      await batch_write.commit();

      // Refresh data
      await fetchAllData();

      // Close modal
      setShowSellModal(false);
      setSelectedBatch(null);
      setSellData({
        products: {},
        customerName: "",
        customerPhone: "",
        notes: "",
      });

      toast.success(
        `Sale completed! Revenue: Rs. ${totalRevenue.toLocaleString()}`
      );
    } catch (error) {
      console.error("Error processing sale:", error);
      toast.error(error.message || "Failed to process sale");
    } finally {
      setIsSelling(false);
    }
  };

  // Handle sort change
  const handleSortChange = (field) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Manual refresh function
  const refreshData = () => {
    fetchAllData();
    toast.success("Refreshing data...");
  };

  // Toggle row expansion
  const toggleRowExpand = (id) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Apply filters to batches
  const getFilteredBatches = () => {
    return batches;
  };

  // Format number safely
  const formatNumber = (value, decimals = 2) => {
    const num = Number(value || 0);
    return isNaN(num) ? "0.00" : num.toFixed(decimals);
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

  // Format date for display
  const formatDate = (date) => {
    if (!date) return "—";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format product type for display
  const formatProductType = (type, riceType = null) => {
    if (type === "rice" && riceType) {
      return `Rice (${riceType})`;
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

  // Check if product can be bagged
  const canCreateBags = (productType) => {
    return true; // All products can be bagged
  };

  // Group bags by batch and size for compact display
  const groupBagsByBatchAndSize = (bags) => {
    const grouped = {};

    bags.forEach((bag) => {
      const key = `${bag.sourceBatchNumber}-${bag.bagSize}`;
      if (!grouped[key]) {
        grouped[key] = {
          sourceBatchNumber: bag.sourceBatchNumber,
          sourceBatchId: bag.sourceBatchId,
          bagSize: bag.bagSize,
          weight: bag.weight,
          pricePerKg: bag.pricePerKg,
          recommendedSellingPrice: bag.recommendedSellingPrice,
          originalPaddyType: bag.originalPaddyType,
          productType: bag.productType,
          createdAt: bag.createdAt,
          bags: [],
          availableCount: 0,
          soldCount: 0,
          totalWeight: 0,
        };
      }

      grouped[key].bags.push(bag);
      grouped[key].totalWeight += bag.weight;

      if (bag.status === "available") {
        grouped[key].availableCount++;
      } else if (bag.status === "sold") {
        grouped[key].soldCount++;
      }
    });

    return Object.values(grouped);
  };

  // Render individual bagged stocks display
  const renderBaggedInventory = () => {
    const hasAnyBags = Object.keys(baggedStocks).length > 0;

    if (!hasAnyBags) {
      return (
        <div className="bg-white p-4 mb-4 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Individual Bagged Stocks
          </h3>
          <div className="text-center py-6 text-gray-500">
            No bagged stocks available. Start by creating some bags from
            batches!
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white p-4 mb-4 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Individual Bagged Stocks
        </h3>

        {Object.entries(baggedStocks).map(([productTypeKey, bags]) => {
          const groupedBags = groupBagsByBatchAndSize(bags);

          // Determine display name for product type
          let displayName;
          if (productTypeKey.startsWith("rice_")) {
            const riceType = productTypeKey.replace("rice_", "");
            displayName = `Rice (${riceType})`;
          } else {
            displayName = formatProductType(productTypeKey);
          }

          return (
            <div key={productTypeKey} className="mb-4 last:mb-0">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-gray-900">{displayName}</h4>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {bags.length} bags (
                  {formatNumber(
                    bags.reduce((sum, bag) => sum + (bag.weight || 0), 0)
                  )}{" "}
                  kg total)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batch
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bag Size
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Available
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price/kg
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rice Type
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {groupedBags.map((group, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {group.sourceBatchNumber}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          {group.bagSize} kg
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {group.availableCount} bags
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(group.recommendedSellingPrice)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                          {group.originalPaddyType || "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(group.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const filteredBatches = getFilteredBatches();

  // No business selected state
  if (!currentBusiness?.id || !currentUser?.uid) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg max-w-md text-center">
          <svg
            className="mx-auto h-8 w-8 text-yellow-600 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No business selected or user not authenticated
          </h3>
          <p className="text-sm text-gray-600">
            Please ensure you are logged in and have selected a business.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200 bg-white">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Processed Batches & Products
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage processed batches, create bags, and sell products
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => setShowBagSizeModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm flex items-center transition-colors"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Manage Bags
            </button>
            <button
              onClick={refreshData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center transition-colors"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Error Display */}
        {error && (
          <div className="m-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <h3 className="font-medium">Error loading data</h3>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Bagged Inventory Section */}
        <div className="px-4">{renderBaggedInventory()}</div>

        {/* Batches List */}
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : batches.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
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
                No processed batches found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Process some paddy stock to see batches here.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="w-10 px-4 py-3"></th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSortChange("batchNumber")}
                      >
                        <div className="flex items-center">
                          Batch Number
                          {sortField === "batchNumber" && (
                            <svg
                              className="ml-1 h-4 w-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              {sortDirection === "asc" ? (
                                <path
                                  fillRule="evenodd"
                                  d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                                  clipRule="evenodd"
                                />
                              ) : (
                                <path
                                  fillRule="evenodd"
                                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              )}
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSortChange("createdAt")}
                      >
                        <div className="flex items-center">
                          Date
                          {sortField === "createdAt" && (
                            <svg
                              className="ml-1 h-4 w-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              {sortDirection === "asc" ? (
                                <path
                                  fillRule="evenodd"
                                  d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                                  clipRule="evenodd"
                                />
                              ) : (
                                <path
                                  fillRule="evenodd"
                                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              )}
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Paddy Type
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Total Quantity
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Price/kg
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBatches.map((batch) => (
                      <React.Fragment key={batch.id}>
                        <tr className="hover:bg-blue-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => toggleRowExpand(batch.id)}
                              className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                            >
                              {expandedRows[batch.id] ? (
                                <svg
                                  className="h-4 w-4"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="h-4 w-4"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {batch.batchNumber}
                            </div>
                            {batch.buyerName && (
                              <div className="text-xs text-gray-500">
                                {batch.buyerName}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(batch.createdAt)}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {batch.originalPaddyType || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-semibold">
                              {formatNumber(batch.totalQuantity)} kg
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-semibold">
                              {batch.pricingData?.adjustedRicePrice
                                ? formatCurrency(
                                    batch.pricingData.adjustedRicePrice
                                  )
                                : "—"}
                            </div>
                            {batch.pricingData?.recommendedSellingPrice && (
                              <div className="text-xs text-green-600">
                                Sell:{" "}
                                {formatCurrency(
                                  batch.pricingData.recommendedSellingPrice
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                        {expandedRows[batch.id] && (
                          <tr className="bg-blue-50">
                            <td className="px-4 py-3"></td>
                            <td colSpan="5" className="px-4 py-3">
                              <div className="space-y-3">
                                {/* Products in this batch */}
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                                    Products in this Batch
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {batch.products &&
                                      Object.entries(batch.products).map(
                                        ([productType, quantity]) => {
                                          if (quantity <= 0) return null;
                                          return (
                                            <div
                                              key={productType}
                                              className="bg-white p-2 rounded border border-gray-200"
                                            >
                                              <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-gray-900">
                                                  {formatProductType(
                                                    productType
                                                  )}
                                                </span>
                                                <span className="text-sm font-bold text-blue-600">
                                                  {formatNumber(quantity)} kg
                                                </span>
                                              </div>
                                              {canCreateBags(productType) && (
                                                <button
                                                  onClick={() =>
                                                    openBagCreationModal(
                                                      productType,
                                                      batch.id
                                                    )
                                                  }
                                                  className="w-full text-xs text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 py-1 rounded transition-colors"
                                                >
                                                  📦 Create Bags
                                                </button>
                                              )}
                                            </div>
                                          );
                                        }
                                      )}
                                  </div>
                                </div>

                                {/* Pricing information */}
                                {batch.pricingData && (
                                  <div className="bg-white p-2 rounded border border-gray-200">
                                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                                      Pricing Information
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                      <div>
                                        <span className="text-gray-500">
                                          Cost per kg:
                                        </span>
                                        <p className="font-semibold text-gray-900">
                                          {formatCurrency(
                                            batch.pricingData.adjustedRicePrice
                                          )}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">
                                          Recommended selling:
                                        </span>
                                        <p className="font-semibold text-green-600">
                                          {formatCurrency(
                                            batch.pricingData
                                              .recommendedSellingPrice
                                          )}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">
                                          Profit margin:
                                        </span>
                                        <p className="font-semibold text-blue-600">
                                          {batch.pricingData.profitPercentage ||
                                            0}
                                          %
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">
                                          Byproduct revenue:
                                        </span>
                                        <p className="font-semibold text-purple-600">
                                          {formatCurrency(
                                            batch.pricingData
                                              .profitFromByproducts
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Bag Size Management Modal */}
      {showBagSizeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold text-gray-900">
                  Manage Bag Sizes
                </h2>
                <button
                  onClick={() => setShowBagSizeModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Add new bag size */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add New Bag Size
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="Bag size (kg)"
                    value={newBagSize}
                    onChange={(e) => setNewBagSize(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        addBagSize();
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <button
                    onClick={addBagSize}
                    disabled={!newBagSize || parseFloat(newBagSize) <= 0}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Add
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter bag size in kilograms (e.g., 1, 2.5, 10, 25, 50)
                </p>
              </div>

              {/* Current bag sizes */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Current Bag Sizes ({bagSizes.length})
                </h3>

                {bagSizes.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <svg
                      className="mx-auto h-8 w-8 text-gray-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                    <p className="text-sm text-gray-500 mb-1">
                      No bag sizes added yet
                    </p>
                    <p className="text-xs text-gray-400">
                      Add your first bag size above to start creating bags
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {bagSizes.map((size) => (
                      <div
                        key={size}
                        className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-sm font-medium text-gray-900">
                          {size} kg
                        </span>
                        <button
                          onClick={() => removeBagSize(size)}
                          className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Remove this bag size"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Common bag sizes suggestion */}
              {bagSizes.length === 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-medium text-blue-800 mb-2">
                    Suggested common bag sizes:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {[1, 2, 5, 10, 20, 25, 50].map((size) => (
                      <button
                        key={size}
                        onClick={() => {
                          setNewBagSize(size.toString());
                          addBagSize();
                        }}
                        className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
                      >
                        {size}kg
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <button
                  onClick={() => setShowBagSizeModal(false)}
                  className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Bag Creation Modal */}
      {showBagCreationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold text-gray-900">
                  Create {formatProductType(bagCreationData.productType)} Bags
                </h2>
                <button
                  onClick={() => {
                    setShowBagCreationModal(false);
                    setBagCreationData({
                      sizeKg: "",
                      quantity: "",
                      productType: "",
                      batchId: "",
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Available stock info */}
              {(() => {
                const batch = batches.find(
                  (b) => b.id === bagCreationData.batchId
                );
                const availableQuantity =
                  batch?.products[bagCreationData.productType] || 0;
                return (
                  <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
                    <p className="text-sm text-blue-800">
                      Available {formatProductType(bagCreationData.productType)}{" "}
                      in batch:{" "}
                      <span className="font-semibold">
                        {formatNumber(availableQuantity)} kg
                      </span>
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Batch: {batch?.batchNumber}
                    </p>
                  </div>
                );
              })()}

              <div className="space-y-3">
                {/* Check if bag sizes exist */}
                {bagSizes.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
                    <div className="flex items-start">
                      <svg
                        className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 15c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-yellow-800">
                          No Bag Sizes Available
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          You need to add bag sizes first before creating bags.
                        </p>
                        <button
                          onClick={() => {
                            setShowBagCreationModal(false);
                            setShowBagSizeModal(true);
                          }}
                          className="mt-2 text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded transition-colors"
                        >
                          Add Bag Sizes
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Bag size selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bag Size *
                      </label>
                      <select
                        value={bagCreationData.sizeKg}
                        onChange={(e) =>
                          setBagCreationData((prev) => ({
                            ...prev,
                            sizeKg: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="">Select bag size</option>
                        {bagSizes.map((size) => (
                          <option key={size} value={size}>
                            {size} kg
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Don't see your size?{" "}
                        <button
                          onClick={() => {
                            setShowBagCreationModal(false);
                            setShowBagSizeModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 underline"
                        >
                          Add new size
                        </button>
                      </p>
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Bags *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={bagCreationData.quantity}
                        onChange={(e) =>
                          setBagCreationData((prev) => ({
                            ...prev,
                            quantity: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Enter number of bags"
                      />
                    </div>

                    {/* Total weight calculation */}
                    {bagCreationData.sizeKg && bagCreationData.quantity && (
                      <div className="bg-green-50 border border-green-200 rounded p-2">
                        <p className="text-sm text-green-800">
                          Total weight:{" "}
                          <span className="font-semibold">
                            {formatNumber(
                              parseFloat(bagCreationData.sizeKg) *
                                parseInt(bagCreationData.quantity)
                            )}{" "}
                            kg
                          </span>
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Action buttons */}
                <div className="flex space-x-2 pt-3">
                  <button
                    onClick={() => {
                      setShowBagCreationModal(false);
                      setBagCreationData({
                        sizeKg: "",
                        quantity: "",
                        productType: "",
                        batchId: "",
                      });
                    }}
                    className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createBags}
                    disabled={
                      isCreatingBags ||
                      !bagCreationData.sizeKg ||
                      !bagCreationData.quantity ||
                      bagSizes.length === 0
                    }
                    className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingBags ? "Creating..." : "Create Bags"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Bag Sell Modal */}
      {showIndividualBagSellModal && selectedBag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold text-gray-900">
                  Sell {formatProductType(selectedBag.productType)} Bag
                </h2>
                <button
                  onClick={() => {
                    setShowIndividualBagSellModal(false);
                    setSelectedBag(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Bag info */}
              <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Bag ID:</span>{" "}
                  {selectedBag.bagId}
                </p>
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Weight:</span>{" "}
                  {selectedBag.weight} kg
                </p>
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Cost/kg:</span>{" "}
                  {formatCurrency(selectedBag.pricePerKg)}
                </p>
              </div>

              <div className="space-y-3">
                {/* Customer name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={individualBagSellData.customerName}
                    onChange={(e) =>
                      setIndividualBagSellData((prev) => ({
                        ...prev,
                        customerName: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Enter customer name"
                  />
                </div>

                {/* Customer phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Phone
                  </label>
                  <input
                    type="tel"
                    value={individualBagSellData.customerPhone}
                    onChange={(e) =>
                      setIndividualBagSellData((prev) => ({
                        ...prev,
                        customerPhone: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Enter phone number"
                  />
                </div>

                {/* Selling price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selling Price per kg *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={individualBagSellData.sellingPrice}
                    onChange={(e) =>
                      setIndividualBagSellData((prev) => ({
                        ...prev,
                        sellingPrice: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Enter selling price"
                  />
                </div>

                {/* Total amount calculation */}
                {individualBagSellData.sellingPrice > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded p-2">
                    <p className="text-sm text-green-800">
                      Total amount:{" "}
                      <span className="font-semibold">
                        {formatCurrency(
                          individualBagSellData.sellingPrice *
                            selectedBag.weight
                        )}
                      </span>
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Profit:{" "}
                      {formatCurrency(
                        (individualBagSellData.sellingPrice -
                          selectedBag.pricePerKg) *
                          selectedBag.weight
                      )}
                    </p>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    value={individualBagSellData.notes}
                    onChange={(e) =>
                      setIndividualBagSellData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Additional notes (optional)"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex space-x-2 pt-3">
                  <button
                    onClick={() => {
                      setShowIndividualBagSellModal(false);
                      setSelectedBag(null);
                    }}
                    className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleIndividualBagSale}
                    disabled={
                      !individualBagSellData.customerName.trim() ||
                      !individualBagSellData.sellingPrice ||
                      individualBagSellData.sellingPrice <= 0
                    }
                    className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sell Bag
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessedProducts;
