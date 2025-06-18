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
import { useAuth } from '../../contexts/AuthContext';
import { useBusiness } from '../../contexts/BusinessContext';

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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProductType, setFilterProductType] = useState("");
  const [filterPaddyType, setFilterPaddyType] = useState("");
  const [filterDateRange, setFilterDateRange] = useState({
    start: "",
    end: "",
  });
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [expandedRows, setExpandedRows] = useState({});
  const [viewByPaddyType, setViewByPaddyType] = useState(false);

  // Modal states
  const [showBagSizeModal, setShowBagSizeModal] = useState(false);
  const [showBagCreationModal, setShowBagCreationModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showIndividualBagSellModal, setShowIndividualBagSellModal] = useState(false);
  const [showBagDetailsModal, setShowBagDetailsModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedBag, setSelectedBag] = useState(null);
  const [selectedProductForBagging, setSelectedProductForBagging] = useState(null);
  const [bagCreationData, setBagCreationData] = useState({
    sizeKg: '',
    quantity: '',
    productType: '',
    batchId: '',
  });
  const [sellData, setSellData] = useState({
    products: {},
    customerName: '',
    customerPhone: '',
    notes: '',
  });
  const [individualBagSellData, setIndividualBagSellData] = useState({
    customerName: '',
    customerPhone: '',
    sellingPrice: 0,
    notes: '',
  });
  const [newBagSize, setNewBagSize] = useState('');
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
  const fetchAllData = async () => {
    if (!currentBusiness?.id || !currentUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchStockTotals(),
        fetchBaggedInventory(),
        fetchBaggedStocks(),
        fetchBagSizes(),
        fetchProcessedBatches(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch processed batches from the correct path
  const fetchProcessedBatches = async () => {
    try {
      const batchesQuery = query(
        collection(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/processedStock/stock`),
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
  const fetchBaggedStocks = async () => {
    try {
      const baggedStocksData = {};
      const productTypes = ['rice', 'hunuSahal', 'kadunuSahal', 'ricePolish', 'dahaiyya', 'flour'];
      
      for (const productType of productTypes) {
        const productCode = getProductTypeCode(productType);
        const baggedStockQuery = query(
          collection(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/${productCode}`),
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
    return codeMap[productType] || productType.toLowerCase().replace(/\s+/g, '_');
  };

  // Fetch centralized stock totals
  const fetchStockTotals = async () => {
    try {
      const stockTotalsDoc = await getDoc(
        doc(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/stockTotals`)
      );
      
      if (stockTotalsDoc.exists()) {
        setStockTotals(stockTotalsDoc.data());
      } else {
        setStockTotals({});
      }
    } catch (error) {
      console.error("Error fetching stock totals:", error);
    }
  };

  // Fetch centralized bagged inventory
  const fetchBaggedInventory = async () => {
    try {
      const baggedInventoryDoc = await getDoc(
        doc(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/inventory/baggedInventory`)
      );
      
      if (baggedInventoryDoc.exists()) {
        setBaggedInventory(baggedInventoryDoc.data());
      } else {
        const initialInventory = {
          businessId: currentBusiness.id,
          ownerId: currentUser.uid,
          lastUpdated: serverTimestamp(),
          createdAt: serverTimestamp()
        };
        
        setBaggedInventory(initialInventory);
        
        await setDoc(
          doc(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/inventory/baggedInventory`),
          initialInventory
        );
      }
    } catch (error) {
      console.error("Error fetching bagged inventory:", error);
      setBaggedInventory({});
    }
  };

  // Fetch bag sizes
  const fetchBagSizes = async () => {
    try {
      const bagSizesDoc = await getDoc(
        doc(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/settings/bagSizes`)
      );
      
      if (bagSizesDoc.exists()) {
        setBagSizes(bagSizesDoc.data().sizes || []);
      } else {
        const defaultSizes = [1, 2, 5, 10, 20, 25, 50];
        setBagSizes(defaultSizes);
        
        await setDoc(
          doc(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/settings/bagSizes`),
          {
            sizes: defaultSizes,
            businessId: currentBusiness.id,
            ownerId: currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );
      }
    } catch (error) {
      console.error("Error fetching bag sizes:", error);
      setBagSizes([1, 2, 5, 10, 20, 25, 50]);
    }
  };

  // Add new bag size
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

      await updateDoc(
        doc(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/settings/bagSizes`),
        {
          sizes: updatedSizes,
          updatedAt: serverTimestamp(),
        }
      );

      setNewBagSize('');
      toast.success("Bag size added successfully");
    } catch (error) {
      console.error("Error adding bag size:", error);
      toast.error("Failed to add bag size");
    }
  };

  // Remove bag size
  const removeBagSize = async (sizeToRemove) => {
    try {
      const updatedSizes = bagSizes.filter(size => size !== sizeToRemove);
      setBagSizes(updatedSizes);

      await updateDoc(
        doc(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/settings/bagSizes`),
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

  // Create bags from batch products
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
    const batch = batches.find(b => b.id === batchId);
    if (!batch) {
      toast.error("Batch not found");
      return;
    }

    const availableQuantity = batch.products[productType] || 0;
    if (totalWeight > availableQuantity) {
      toast.error(`Not enough ${productType} in batch. Available: ${availableQuantity} kg, Required: ${totalWeight} kg`);
      return;
    }

    setIsCreatingBags(true);

    try {
      const batch_write = writeBatch(db);
      const createdBagIds = [];
      const productCode = getProductTypeCode(productType);

      // Create individual bag documents
      for (let i = 0; i < quantityNum; i++) {
        const bagId = `BAG_${Date.now()}_${i + 1}`;
        const bagRef = doc(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/${productCode}`, bagId);
        
        batch_write.set(bagRef, {
          bagId: bagId,
          productType: productType,
          productCode: productCode,
          bagSize: sizeKgNum,
          weight: sizeKgNum,
          sourceBatchId: batchId,
          sourceBatchNumber: batch.batchNumber,
          originalPaddyType: batch.originalPaddyType,
          pricePerKg: batch.pricingData?.adjustedRicePrice || 0,
          recommendedSellingPrice: batch.pricingData?.recommendedSellingPrice || 0,
          status: 'available',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: currentUser.uid,
          businessId: currentBusiness.id,
          ownerId: currentUser.uid,
          batchInfo: {
            batchNumber: batch.batchNumber,
            buyerName: batch.buyerName || '',
            originalQuantity: batch.originalQuantity,
            originalPricePerKg: batch.originalPricePerKg
          }
        });

        createdBagIds.push(bagId);
      }

      // Update batch - reduce product quantity
      const batchRef = doc(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/processedStock/stock`, batchId);
      batch_write.update(batchRef, {
        [`products.${productType}`]: increment(-totalWeight),
        totalQuantity: increment(-totalWeight),
        updatedAt: serverTimestamp()
      });

      // Update centralized bagged inventory - increment bag count
      const baggedInventoryRef = doc(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/inventory/baggedInventory`);
      batch_write.update(baggedInventoryRef, {
        [`${productType}.${bagSizeKey}`]: increment(quantityNum),
        lastUpdated: serverTimestamp()
      });

      // Update stock totals - reduce raw product, increase bagged totals
      const stockTotalsRef = doc(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/stockTotals`);
      batch_write.update(stockTotalsRef, {
        [productType]: increment(-totalWeight),
        [`${productType}_bagged_total`]: increment(totalWeight),
        [`${productType}_bags_count`]: increment(quantityNum),
        lastUpdated: serverTimestamp()
      });

      // Execute all updates atomically
      await batch_write.commit();

      // Refresh data
      await fetchAllData();

      // Reset form and close modal
      setBagCreationData({ sizeKg: '', quantity: '', productType: '', batchId: '' });
      setShowBagCreationModal(false);
      setSelectedProductForBagging(null);

      toast.success(`Successfully created ${quantityNum} bags of ${sizeKgNum}kg ${productType}. Bag IDs: ${createdBagIds.slice(0, 3).join(', ')}${quantityNum > 3 ? '...' : ''}`);
    } catch (error) {
      console.error("Error creating bags:", error);
      toast.error("Failed to create bags");
    } finally {
      setIsCreatingBags(false);
    }
  };

  // Sell individual bag
  const sellIndividualBag = (bag) => {
    setSelectedBag(bag);
    setIndividualBagSellData({
      customerName: '',
      customerPhone: '',
      sellingPrice: bag.recommendedSellingPrice || bag.pricePerKg,
      notes: '',
    });
    setShowIndividualBagSellModal(true);
  };

  // Handle individual bag sale
  const handleIndividualBagSale = async () => {
    if (!selectedBag) return;

    const { customerName, customerPhone, sellingPrice, notes } = individualBagSellData;

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
      const batch_write = writeBatch(db);
      const productCode = getProductTypeCode(selectedBag.productType);

      // Update bag status to sold
      const bagRef = doc(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/${productCode}`, selectedBag.id);
      batch_write.update(bagRef, {
        status: 'sold',
        soldAt: serverTimestamp(),
        soldTo: customerName,
        customerPhone: customerPhone,
        sellingPrice: finalPrice,
        totalAmount: totalAmount,
        saleNotes: notes,
        updatedAt: serverTimestamp()
      });

      // Create sale record
      const saleRef = doc(collection(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/sales`));
      batch_write.set(saleRef, {
        saleType: 'individual_bag',
        bagId: selectedBag.bagId,
        bagDocId: selectedBag.id,
        productType: selectedBag.productType,
        productCode: productCode,
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
        status: 'completed'
      });

      // Update stock totals
      const stockTotalsRef = doc(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/stockTotals`);
      batch_write.update(stockTotalsRef, {
        [`${selectedBag.productType}_bagged_total`]: increment(-selectedBag.weight),
        [`${selectedBag.productType}_bags_count`]: increment(-1),
        lastUpdated: serverTimestamp()
      });

      await batch_write.commit();
      await fetchAllData();

      setShowIndividualBagSellModal(false);
      setSelectedBag(null);
      setIndividualBagSellData({
        customerName: '',
        customerPhone: '',
        sellingPrice: 0,
        notes: '',
      });

      toast.success(`Successfully sold ${selectedBag.weight}kg ${formatProductType(selectedBag.productType)} bag for ${formatCurrency(totalAmount)}`);
    } catch (error) {
      console.error("Error selling individual bag:", error);
      toast.error("Failed to sell bag");
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
      sizeKg: '', 
      quantity: '', 
      productType: productType,
      batchId: batchId
    });
    setShowBagCreationModal(true);
  };

  // Open sell modal
  const openSellModal = (batch) => {
    setSelectedBatch(batch);
    
    // Initialize sell data with available products
    const products = {};
    Object.keys(batch.products || {}).forEach(productType => {
      if (batch.products[productType] > 0) {
        products[productType] = {
          available: batch.products[productType],
          selling: 0,
          pricePerKg: batch.pricingData?.adjustedRicePrice || 0
        };
      }
    });
    
    setSellData({
      products: products,
      customerName: '',
      customerPhone: '',
      notes: ''
    });
    setShowSellModal(true);
  };

  // Handle sell products
  const handleSellProducts = async () => {
    if (!selectedBatch) return;

    // Validate sell data
    const sellingProducts = Object.entries(sellData.products).filter(([_, data]) => data.selling > 0);
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
        const batchRef = doc(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/processedStock/stock`, selectedBatch.id);
        batch_write.update(batchRef, {
          [`products.${productType}`]: increment(-data.selling),
          totalQuantity: increment(-data.selling),
          updatedAt: serverTimestamp()
        });

        // Update stock totals
        const stockTotalsRef = doc(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/stockTotals`);
        batch_write.update(stockTotalsRef, {
          [productType]: increment(-data.selling),
          lastUpdated: serverTimestamp()
        });
      });

      // Create sale record
      const saleRef = doc(collection(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/sales`));
      batch_write.set(saleRef, {
        saleType: 'batch_products',
        sourceBatchId: selectedBatch.id,
        sourceBatchNumber: selectedBatch.batchNumber,
        products: Object.fromEntries(
          sellingProducts.map(([productType, data]) => [
            productType, 
            {
              quantity: data.selling,
              pricePerKg: data.pricePerKg,
              total: data.selling * data.pricePerKg
            }
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
        status: 'completed'
      });

      await batch_write.commit();

      // Refresh data
      await fetchAllData();

      // Close modal
      setShowSellModal(false);
      setSelectedBatch(null);
      setSellData({
        products: {},
        customerName: '',
        customerPhone: '',
        notes: ''
      });

      toast.success(`Sale completed! Revenue: Rs. ${totalRevenue.toLocaleString()}`);
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

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setFilterProductType("");
    setFilterPaddyType("");
    setFilterDateRange({ start: "", end: "" });
  };

  // Manual refresh function
  const refreshData = () => {
    fetchAllData();
    toast.success("Refreshing data...");
  };

  // Handle date range filter change
  const handleDateFilterChange = (e) => {
    const { name, value } = e.target;
    setFilterDateRange((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Get all unique product types from batches
  const getProductTypes = () => {
    const types = new Set();
    batches.forEach((batch) => {
      if (batch.products) {
        Object.keys(batch.products).forEach(productType => {
          if (batch.products[productType] > 0) {
            types.add(productType);
          }
        });
      }
    });
    return Array.from(types).sort();
  };

  // Get all unique paddy types from batches
  const getPaddyTypes = () => {
    const types = new Set();
    batches.forEach((batch) => {
      if (batch.originalPaddyType) {
        types.add(batch.originalPaddyType);
      }
    });
    return Array.from(types).sort();
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
    return batches.filter((batch) => {
      // Search term filter
      const matchesSearch =
        searchTerm === "" ||
        batch.batchNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.originalPaddyType?.toLowerCase().includes(searchTerm.toLowerCase());

      // Product type filter
      const matchesProductType =
        filterProductType === "" || 
        (batch.products && batch.products[filterProductType] > 0);

      // Paddy type filter
      const matchesPaddyType =
        filterPaddyType === "" || batch.originalPaddyType === filterPaddyType;

      // Date range filter
      let matchesDateRange = true;
      if (filterDateRange.start) {
        const startDate = new Date(filterDateRange.start);
        startDate.setHours(0, 0, 0, 0);
        matchesDateRange = matchesDateRange && batch.createdAt >= startDate;
      }
      if (filterDateRange.end) {
        const endDate = new Date(filterDateRange.end);
        endDate.setHours(23, 59, 59, 999);
        matchesDateRange = matchesDateRange && batch.createdAt <= endDate;
      }

      return matchesSearch && matchesProductType && matchesPaddyType && matchesDateRange;
    });
  };

  // Group batches by paddy type
  const getBatchesByPaddyType = () => {
    const filtered = getFilteredBatches();
    const grouped = {};
    
    filtered.forEach(batch => {
      const paddyType = batch.originalPaddyType || 'Unknown';
      if (!grouped[paddyType]) {
        grouped[paddyType] = [];
      }
      grouped[paddyType].push(batch);
    });
    
    return grouped;
  };

  // Calculate totals by paddy type
  const calculatePaddyTypeTotals = () => {
    const totals = {};
    
    batches.forEach(batch => {
      const paddyType = batch.originalPaddyType || 'Unknown';
      if (!totals[paddyType]) {
        totals[paddyType] = {};
      }
      
      if (batch.products) {
        Object.entries(batch.products).forEach(([productType, quantity]) => {
          if (quantity > 0) {
            totals[paddyType][productType] = (totals[paddyType][productType] || 0) + quantity;
          }
        });
      }
    });
    
    return totals;
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

  // Check if product can be bagged
  const canCreateBags = (productType) => {
    return true; // All products can be bagged
  };

  // Get bagged inventory stats from individual bags
  const getBaggedInventoryStats = () => {
    const stats = {
      totalProducts: 0,
      totalBags: 0,
      totalWeight: 0
    };

    Object.entries(baggedStocks).forEach(([productType, bags]) => {
      if (bags && bags.length > 0) {
        stats.totalProducts++;
        stats.totalBags += bags.length;
        stats.totalWeight += bags.reduce((sum, bag) => sum + (bag.weight || 0), 0);
      }
    });

    return stats;
  };

  // Render individual bagged stocks display
  const renderBaggedInventory = () => {
    const hasAnyBags = Object.keys(baggedStocks).length > 0;

    if (!hasAnyBags) {
      return (
        <div className="bg-white shadow-sm rounded-xl p-6 mb-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Individual Bagged Stocks
          </h3>
          <div className="text-center py-8 text-gray-500">
            No bagged stocks available. Start by creating some bags from batches!
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white shadow-sm rounded-xl p-6 mb-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Individual Bagged Stocks
        </h3>
        
        {Object.entries(baggedStocks).map(([productType, bags]) => (
          <div key={productType} className="mb-6 last:mb-0">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-gray-900 text-lg">
                {formatProductType(productType)}
              </h4>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {bags.length} bags ({formatNumber(bags.reduce((sum, bag) => sum + (bag.weight || 0), 0))} kg total)
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {bags.map((bag) => (
                <div key={bag.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {bag.bagSize}kg Bag
                      </span>
                      <p className="text-xs text-gray-500">
                        ID: {bag.bagId}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      bag.status === 'available' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {bag.status}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Weight:</span>
                      <span className="font-medium">{formatNumber(bag.weight)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Price:</span>
                      <span className="font-medium">{formatCurrency(bag.pricePerKg)}/kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Batch:</span>
                      <span className="font-medium">{bag.sourceBatchNumber}</span>
                    </div>
                    {bag.originalPaddyType && (
                      <div className="flex justify-between">
                        <span>Paddy:</span>
                        <span className="font-medium">{bag.originalPaddyType}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Created:</span>
                      <span className="font-medium">{formatDate(bag.createdAt)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex space-x-1">
                    <button
                      onClick={() => sellIndividualBag(bag)}
                      className="flex-1 text-xs text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 py-1 px-2 rounded transition-colors"
                      disabled={bag.status !== 'available'}
                    >
                      💰 Sell
                    </button>
                    <button
                      onClick={() => viewBagDetails(bag)}
                      className="flex-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 py-1 px-2 rounded transition-colors"
                    >
                      👁️ View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render paddy type summary
  const renderPaddyTypeSummary = () => {
    const paddyTypeTotals = calculatePaddyTypeTotals();
    
    return (
      <div className="bg-white shadow-sm rounded-xl p-6 mb-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Summary by Paddy Type
          </h3>
          <button
            onClick={() => setViewByPaddyType(!viewByPaddyType)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {viewByPaddyType ? 'Show All Batches' : 'Group by Paddy Type'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(paddyTypeTotals).map(([paddyType, products]) => (
            <div key={paddyType} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">{paddyType}</h4>
              <div className="space-y-2">
                {Object.entries(products).map(([productType, quantity]) => (
                  <div key={productType} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{formatProductType(productType)}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatNumber(quantity)} kg
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const filteredBatches = getFilteredBatches();
  const batchesByPaddyType = getBatchesByPaddyType();
  const baggedStats = getBaggedInventoryStats();

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Processed Batches & Products
          </h1>
          <p className="text-gray-600 mt-1">
            Manage processed batches, create bags, and sell products
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2 mt-4 md:mt-0">
          <button
            onClick={() => setShowBagSizeModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm flex items-center transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage Bag Sizes
          </button>
          <button
            onClick={refreshData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm flex items-center transition-colors"
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow-sm rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Total Batches</p>
          <p className="text-2xl font-bold text-gray-900">
            {filteredBatches.length}
          </p>
        </div>
        <div className="bg-white shadow-sm rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Total Quantity</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatNumber(filteredBatches.reduce((sum, batch) => sum + (batch.totalQuantity || 0), 0))} kg
          </p>
        </div>
        <div className="bg-white shadow-sm rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Bagged Products</p>
          <p className="text-2xl font-bold text-gray-900">
            {baggedStats.totalProducts}
          </p>
        </div>
        <div className="bg-white shadow-sm rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Total Bags</p>
          <p className="text-2xl font-bold text-gray-900">
            {baggedStats.totalBags}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {formatNumber(baggedStats.totalWeight)} kg total
          </p>
        </div>
      </div>

      {/* Paddy Type Summary */}
      {renderPaddyTypeSummary()}

      {/* Bagged Inventory Section */}
      {renderBaggedInventory()}

      {/* Filter Section */}
      <div className="bg-white shadow-sm rounded-xl p-4 mb-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search batches..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Product Type Filter */}
          <div>
            <select
              value={filterProductType}
              onChange={(e) => setFilterProductType(e.target.value)}
              className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Product Types</option>
              {getProductTypes().map((type) => (
                <option key={type} value={type}>
                  {formatProductType(type)}
                </option>
              ))}
            </select>
          </div>

          {/* Paddy Type Filter */}
          <div>
            <select
              value={filterPaddyType}
              onChange={(e) => setFilterPaddyType(e.target.value)}
              className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Paddy Types</option>
              {getPaddyTypes().map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <div className="flex space-x-2">
              <input
                type="date"
                name="start"
                value={filterDateRange.start}
                onChange={handleDateFilterChange}
                className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="date"
                name="end"
                value={filterDateRange.end}
                onChange={handleDateFilterChange}
                className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Reset Filters Button */}
        {(searchTerm ||
          filterProductType ||
          filterPaddyType ||
          filterDateRange.start ||
          filterDateRange.end) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
          <h3 className="font-medium">Error loading data</h3>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Batches List */}
      {loading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      ) : !currentBusiness?.id || !currentUser?.uid ? (
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
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            No business selected or user not authenticated
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Please ensure you are logged in and have selected a business.
          </p>
        </div>
      ) : batches.length === 0 ? (
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
            No processed batches found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Process some paddy stock to see batches here.
          </p>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-200">
          <p className="text-gray-500">No batches match your search criteria.</p>
          <button
            className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
            onClick={resetFilters}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
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
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
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
                              className="h-5 w-5"
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
                              className="h-5 w-5"
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
                          {batch.originalPaddyType || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-semibold">
                          {formatNumber(batch.totalQuantity)} kg
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-semibold">
                          {batch.pricingData?.adjustedRicePrice ? 
                            formatCurrency(batch.pricingData.adjustedRicePrice) : '—'}
                        </div>
                        {batch.pricingData?.recommendedSellingPrice && (
                          <div className="text-xs text-green-600">
                            Sell: {formatCurrency(batch.pricingData.recommendedSellingPrice)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openSellModal(batch)}
                            className="text-green-600 hover:text-green-700 bg-green-50 px-3 py-1 rounded transition-colors"
                          >
                            💰 Sell
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRows[batch.id] && (
                      <tr className="bg-blue-50">
                        <td className="px-4 py-3"></td>
                        <td colSpan="6" className="px-4 py-3">
                          <div className="space-y-4">
                            {/* Products in this batch */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-3">
                                Products in this Batch
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {batch.products && Object.entries(batch.products).map(([productType, quantity]) => {
                                  if (quantity <= 0) return null;
                                  return (
                                    <div key={productType} className="bg-white p-3 rounded-lg border border-gray-200">
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-900">
                                          {formatProductType(productType)}
                                        </span>
                                        <span className="text-sm font-bold text-blue-600">
                                          {formatNumber(quantity)} kg
                                        </span>
                                      </div>
                                      {canCreateBags(productType) && (
                                        <button
                                          onClick={() => openBagCreationModal(productType, batch.id)}
                                          className="w-full text-xs text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 py-1 rounded transition-colors"
                                        >
                                          📦 Create Bags
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Pricing information */}
                            {batch.pricingData && (
                              <div className="bg-white p-3 rounded-lg border border-gray-200">
                                <h4 className="text-sm font-medium text-gray-900 mb-2">
                                  Pricing Information
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                  <div>
                                    <span className="text-gray-500">Cost per kg:</span>
                                    <p className="font-semibold text-gray-900">
                                      {formatCurrency(batch.pricingData.adjustedRicePrice)}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Recommended selling:</span>
                                    <p className="font-semibold text-green-600">
                                      {formatCurrency(batch.pricingData.recommendedSellingPrice)}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Profit margin:</span>
                                    <p className="font-semibold text-blue-600">
                                      {batch.pricingData.profitPercentage || 0}%
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Byproduct revenue:</span>
                                    <p className="font-semibold text-purple-600">
                                      {formatCurrency(batch.pricingData.profitFromByproducts)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Original data */}
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                              <h4 className="text-sm font-medium text-gray-900 mb-2">
                                Original Paddy Details
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                <div>
                                  <span className="text-gray-500">Paddy type:</span>
                                  <p className="text-gray-900">{batch.originalPaddyType}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Original quantity:</span>
                                  <p className="text-gray-900">{formatNumber(batch.originalQuantity)} kg</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Original price:</span>
                                  <p className="text-gray-900">{formatCurrency(batch.originalPricePerKg)}/kg</p>
                                </div>
                              </div>
                            </div>
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

      {/* Bag Size Management Modal */}
      {showBagSizeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Manage Bag Sizes
                </h2>
                <button
                  onClick={() => setShowBagSizeModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Add new bag size */}
              <div className="mb-4">
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="Bag size (kg)"
                    value={newBagSize}
                    onChange={(e) => setNewBagSize(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={addBagSize}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Current bag sizes */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Current Bag Sizes
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {bagSizes.map((size) => (
                    <div
                      key={size}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {size} kg
                      </span>
                      <button
                        onClick={() => removeBagSize(size)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bag Creation Modal */}
      {showBagCreationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Create {formatProductType(bagCreationData.productType)} Bags
                </h2>
                <button
                  onClick={() => {
                    setShowBagCreationModal(false);
                    setBagCreationData({ sizeKg: '', quantity: '', productType: '', batchId: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Available stock info */}
              {(() => {
                const batch = batches.find(b => b.id === bagCreationData.batchId);
                const availableQuantity = batch?.products[bagCreationData.productType] || 0;
                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      Available {formatProductType(bagCreationData.productType)} in batch: {' '}
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

              <div className="space-y-4">
                {/* Bag size selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bag Size *
                  </label>
                  <select
                    value={bagCreationData.sizeKg}
                    onChange={(e) => setBagCreationData(prev => ({ ...prev, sizeKg: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select bag size</option>
                    {bagSizes.map(size => (
                      <option key={size} value={size}>{size} kg</option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Bags *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bagCreationData.quantity}
                    onChange={(e) => setBagCreationData(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter number of bags"
                  />
                </div>

                {/* Total weight calculation */}
                {bagCreationData.sizeKg && bagCreationData.quantity && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      Total weight: {' '}
                      <span className="font-semibold">
                        {formatNumber(parseFloat(bagCreationData.sizeKg) * parseInt(bagCreationData.quantity))} kg
                      </span>
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowBagCreationModal(false);
                      setBagCreationData({ sizeKg: '', quantity: '', productType: '', batchId: '' });
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createBags}
                    disabled={isCreatingBags || !bagCreationData.sizeKg || !bagCreationData.quantity}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingBags ? 'Creating...' : 'Create Bags'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sell Products Modal */}
      {showSellModal && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Sell Products from {selectedBatch.batchNumber}
                </h2>
                <button
                  onClick={() => {
                    setShowSellModal(false);
                    setSelectedBatch(null);
                    setSellData({ products: {}, customerName: '', customerPhone: '', notes: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Customer Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Customer Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        value={sellData.customerName}
                        onChange={(e) => setSellData(prev => ({ ...prev, customerName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter customer name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={sellData.customerPhone}
                        onChange={(e) => setSellData(prev => ({ ...prev, customerPhone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={sellData.notes}
                      onChange={(e) => setSellData(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="2"
                      placeholder="Additional notes (optional)"
                    />
                  </div>
                </div>

                {/* Products to Sell */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Products to Sell</h3>
                  <div className="space-y-3">
                    {Object.entries(sellData.products).map(([productType, data]) => (
                      <div key={productType} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{formatProductType(productType)}</h4>
                            <p className="text-sm text-gray-500">
                              Available: {formatNumber(data.available)} kg at {formatCurrency(data.pricePerKg)}/kg
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quantity to Sell (kg)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={data.available}
                              step="0.01"
                              value={data.selling}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                setSellData(prev => ({
                                  ...prev,
                                  products: {
                                    ...prev.products,
                                    [productType]: {
                                      ...prev.products[productType],
                                      selling: value
                                    }
                                  }
                                }));
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Total Amount
                            </label>
                            <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-semibold">
                              {formatCurrency(data.selling * data.pricePerKg)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sale Summary */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-green-800 mb-2">Sale Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-green-700">Total Weight:</span>
                      <span className="ml-2 font-semibold text-green-900">
                        {formatNumber(Object.values(sellData.products).reduce((sum, data) => sum + data.selling, 0))} kg
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">Total Revenue:</span>
                      <span className="ml-2 font-semibold text-green-900">
                        {formatCurrency(Object.values(sellData.products).reduce((sum, data) => sum + (data.selling * data.pricePerKg), 0))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowSellModal(false);
                      setSelectedBatch(null);
                      setSellData({ products: {}, customerName: '', customerPhone: '', notes: '' });
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSellProducts}
                    disabled={isSelling || !sellData.customerName.trim() || Object.values(sellData.products).every(data => data.selling === 0)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSelling ? 'Processing Sale...' : 'Complete Sale'}
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
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Sell {formatProductType(selectedBag.productType)} Bag
                </h2>
                <button
                  onClick={() => {
                    setShowIndividualBagSellModal(false);
                    setSelectedBag(null);
                    setIndividualBagSellData({
                      customerName: '',
                      customerPhone: '',
                      sellingPrice: 0,
                      notes: '',
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Bag Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-blue-700">Bag ID:</span>
                    <p className="font-semibold text-blue-900">{selectedBag.bagId}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Weight:</span>
                    <p className="font-semibold text-blue-900">{selectedBag.weight} kg</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Cost:</span>
                    <p className="font-semibold text-blue-900">{formatCurrency(selectedBag.pricePerKg)}/kg</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Recommended:</span>
                    <p className="font-semibold text-green-600">{formatCurrency(selectedBag.recommendedSellingPrice)}/kg</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Customer Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={individualBagSellData.customerName}
                    onChange={(e) => setIndividualBagSellData(prev => ({ ...prev, customerName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter customer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={individualBagSellData.customerPhone}
                    onChange={(e) => setIndividualBagSellData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selling Price per kg *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={individualBagSellData.sellingPrice}
                    onChange={(e) => setIndividualBagSellData(prev => ({ ...prev, sellingPrice: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter selling price per kg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={individualBagSellData.notes}
                    onChange={(e) => setIndividualBagSellData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="2"
                    placeholder="Additional notes (optional)"
                  />
                </div>

                {/* Sale Summary */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h3 className="text-sm font-medium text-green-800 mb-2">Sale Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-green-700">Total Amount:</span>
                      <span className="ml-2 font-semibold text-green-900">
                        {formatCurrency(individualBagSellData.sellingPrice * selectedBag.weight)}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">Profit:</span>
                      <span className="ml-2 font-semibold text-green-900">
                        {formatCurrency((individualBagSellData.sellingPrice - selectedBag.pricePerKg) * selectedBag.weight)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowIndividualBagSellModal(false);
                      setSelectedBag(null);
                      setIndividualBagSellData({
                        customerName: '',
                        customerPhone: '',
                        sellingPrice: 0,
                        notes: '',
                      });
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleIndividualBagSale}
                    disabled={!individualBagSellData.customerName.trim() || individualBagSellData.sellingPrice <= 0}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Complete Sale
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bag Details Modal */}
      {showBagDetailsModal && selectedBag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Bag Details
                </h2>
                <button
                  onClick={() => {
                    setShowBagDetailsModal(false);
                    setSelectedBag(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Bag Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Bag Information</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Bag ID:</span>
                      <p className="font-medium text-gray-900">{selectedBag.bagId}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Product:</span>
                      <p className="font-medium text-gray-900">{formatProductType(selectedBag.productType)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Weight:</span>
                      <p className="font-medium text-gray-900">{selectedBag.weight} kg</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <p className={`font-medium ${selectedBag.status === 'available' ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedBag.status}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pricing Information */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Pricing Information</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Cost Price:</span>
                      <p className="font-medium text-gray-900">{formatCurrency(selectedBag.pricePerKg)}/kg</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Recommended Price:</span>
                      <p className="font-medium text-green-600">{formatCurrency(selectedBag.recommendedSellingPrice)}/kg</p>
                    </div>
                  </div>
                </div>

                {/* Source Information */}
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Source Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Source Batch:</span>
                      <span className="font-medium text-gray-900">{selectedBag.sourceBatchNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Original Paddy:</span>
                      <span className="font-medium text-gray-900">{selectedBag.originalPaddyType || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Created:</span>
                      <span className="font-medium text-gray-900">{formatDate(selectedBag.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Original Batch Info */}
                {selectedBag.batchInfo && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Original Batch Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Buyer:</span>
                        <span className="font-medium text-gray-900">{selectedBag.batchInfo.buyerName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Original Quantity:</span>
                        <span className="font-medium text-gray-900">{selectedBag.batchInfo.originalQuantity} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Original Price:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(selectedBag.batchInfo.originalPricePerKg)}/kg</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sale Information (if sold) */}
                {selectedBag.status === 'sold' && (
                  <div className="bg-red-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Sale Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Sold To:</span>
                        <span className="font-medium text-gray-900">{selectedBag.soldTo}</span>
                      </div>
                      {selectedBag.customerPhone && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Phone:</span>
                          <span className="font-medium text-gray-900">{selectedBag.customerPhone}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">Selling Price:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(selectedBag.sellingPrice)}/kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Amount:</span>
                        <span className="font-medium text-green-600">{formatCurrency(selectedBag.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Sold At:</span>
                        <span className="font-medium text-gray-900">{selectedBag.soldAt?.toDate()?.toLocaleString() || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action button */}
                <div className="pt-4">
                  <button
                    onClick={() => {
                      setShowBagDetailsModal(false);
                      setSelectedBag(null);
                    }}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
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