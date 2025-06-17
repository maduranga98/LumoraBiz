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
  const [products, setProducts] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [stockTotals, setStockTotals] = useState({});
  const [baggedInventory, setBaggedInventory] = useState({});
  const [bagSizes, setBagSizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProductType, setFilterProductType] = useState("");
  const [filterDateRange, setFilterDateRange] = useState({
    start: "",
    end: "",
  });
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [expandedRows, setExpandedRows] = useState({});
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [productSummary, setProductSummary] = useState({});

  // Modal states
  const [showBagSizeModal, setShowBagSizeModal] = useState(false);
  const [showBagCreationModal, setShowBagCreationModal] = useState(false);
  const [selectedProductForBagging, setSelectedProductForBagging] = useState(null);
  const [bagCreationData, setBagCreationData] = useState({
    sizeKg: '',
    quantity: '',
    productType: '',
  });
  const [newBagSize, setNewBagSize] = useState('');
  const [isCreatingBags, setIsCreatingBags] = useState(false);

  // Fetch data when current business changes
  useEffect(() => {
    if (currentBusiness?.id && currentUser?.uid) {
      fetchAllData();
    } else {
      setLoading(false);
    }
  }, [currentBusiness?.id, currentUser?.uid, sortField, sortDirection]);

  // Calculate totals when products change
  useEffect(() => {
    if (products.length > 0) {
      calculateTotals();
    }
  }, [products, filterProductType, searchTerm, filterDateRange]);

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
        fetchBagSizes(),
        fetchProcessedProducts(),
        fetchConversions(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
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
        // Initialize empty inventory structure
        const initialInventory = {
          businessId: currentBusiness.id,
          ownerId: currentUser.uid,
          lastUpdated: serverTimestamp(),
          createdAt: serverTimestamp()
        };
        
        setBaggedInventory(initialInventory);
        
        // Create the document
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
        // Set default bag sizes
        const defaultSizes = [5, 10, 20, 25, 50];
        setBagSizes(defaultSizes);
        
        // Save default sizes to database
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
      setBagSizes([5, 10, 20, 25, 50]); // Fallback to default
    }
  };

  // Fetch processed products from Firestore
  const fetchProcessedProducts = async () => {
    try {
      const productsQuery = query(
        collection(db, "processedProducts"),
        where("businessId", "==", currentBusiness.id),
        orderBy(sortField, sortDirection)
      );

      const querySnapshot = await getDocs(productsQuery);
      const productsList = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        productsList.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      setProducts(productsList);
    } catch (error) {
      console.error("Error fetching processed products:", error);
      setError(`Failed to load processed products: ${error.message}`);
      toast.error(`Failed to load processed products: ${error.message}`);
    }
  };

  // Fetch conversion records for additional context
  const fetchConversions = async () => {
    try {
      const conversionsQuery = query(
        collection(db, "conversions"),
        where("businessId", "==", currentBusiness.id),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(conversionsQuery);
      const conversionsList = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        conversionsList.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          conversionDate: data.conversionDate?.toDate() || new Date(),
        });
      });

      setConversions(conversionsList);
    } catch (error) {
      console.error("Error fetching conversions:", error);
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

  // Create bags with centralized inventory update
  const createBags = async () => {
    const { sizeKg, quantity, productType } = bagCreationData;

    if (!sizeKg || !quantity || !productType) {
      toast.error("Please fill all required fields");
      return;
    }

    const sizeKgNum = parseFloat(sizeKg);
    const quantityNum = parseInt(quantity);
    const totalWeight = sizeKgNum * quantityNum;
    const bagSizeKey = `${sizeKgNum}kg`;

    // Check if enough stock is available
    const availableStock = stockTotals[productType] || 0;
    if (totalWeight > availableStock) {
      toast.error(`Not enough ${productType} stock. Available: ${availableStock} kg, Required: ${totalWeight} kg`);
      return;
    }

    setIsCreatingBags(true);

    try {
      const batch = writeBatch(db);

      // Update centralized bagged inventory - increment bag count
      const baggedInventoryRef = doc(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/inventory/baggedInventory`);
      batch.update(baggedInventoryRef, {
        [`${productType}.${bagSizeKey}`]: increment(quantityNum),
        lastUpdated: serverTimestamp()
      });

      // Update stock totals - reduce raw product, increase bagged totals
      const stockTotalsRef = doc(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/stockTotals`);
      batch.update(stockTotalsRef, {
        [productType]: increment(-totalWeight),
        [`${productType}_bagged_total`]: increment(totalWeight),
        [`${productType}_bags_count`]: increment(quantityNum),
        lastUpdated: serverTimestamp()
      });

      // Create transaction log for audit trail (5 segments - correct path)
      // Temporarily disabled to avoid path issues
      /* 
      const transactionRef = doc(collection(db, `transactions`));
      batch.set(transactionRef, {
        type: 'bag_creation',
        productType: productType,
        bagSize: bagSizeKey,
        quantity: quantityNum,
        totalWeight: totalWeight,
        batchNumber: `BAG_${Date.now()}`,
        createdAt: serverTimestamp(),
        businessId: currentBusiness.id,
        ownerId: currentUser.uid
      });
      */

      // Execute all updates atomically
      await batch.commit();

      // Refresh data
      await fetchAllData();

      // Reset form and close modal
      setBagCreationData({ sizeKg: '', quantity: '', productType: '' });
      setShowBagCreationModal(false);
      setSelectedProductForBagging(null);

      const currentBagCount = baggedInventory[productType]?.[bagSizeKey] || 0;
      toast.success(`Successfully created ${quantityNum} bags of ${sizeKgNum}kg ${productType}. Total ${bagSizeKey} ${productType} bags: ${currentBagCount + quantityNum}`);
    } catch (error) {
      console.error("Error creating bags:", error);
      toast.error("Failed to create bags");
    } finally {
      setIsCreatingBags(false);
    }
  };

  // Open bag creation modal
  const openBagCreationModal = (productType) => {
    setSelectedProductForBagging(productType);
    setBagCreationData({ 
      sizeKg: '', 
      quantity: '', 
      productType: productType 
    });
    setShowBagCreationModal(true);
  };

  // Calculate totals and summary
  const calculateTotals = () => {
    const filteredProducts = getFilteredProducts();

    let totalQty = 0;
    const summary = {};

    filteredProducts.forEach((product) => {
      totalQty += product.quantity || 0;

      // Group by product type
      if (!summary[product.productType]) {
        summary[product.productType] = 0;
      }
      summary[product.productType] += product.quantity || 0;
    });

    setTotalQuantity(totalQty);
    setProductSummary(summary);
  };

  // Get bagged inventory stats
  const getBaggedInventoryStats = () => {
    const stats = {
      totalProducts: 0,
      totalBags: 0,
      totalWeight: 0
    };

    Object.entries(baggedInventory).forEach(([productType, bagSizes]) => {
      if (['businessId', 'ownerId', 'lastUpdated', 'createdAt'].includes(productType)) return;
      
      stats.totalProducts++;
      
      if (bagSizes && typeof bagSizes === 'object') {
        Object.entries(bagSizes).forEach(([bagSize, quantity]) => {
          const sizeKg = parseFloat(bagSize.replace('kg', ''));
          if (!isNaN(sizeKg) && !isNaN(quantity)) {
            stats.totalBags += quantity;
            stats.totalWeight += (quantity * sizeKg);
          }
        });
      }
    });

    return stats;
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

  // Get all unique product types
  const getProductTypes = () => {
    const types = new Set();
    products.forEach((product) => {
      if (product.productType) {
        types.add(product.productType);
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

  // Apply filters to products
  const getFilteredProducts = () => {
    return products.filter((product) => {
      // Search term filter
      const matchesSearch =
        searchTerm === "" ||
        product.productType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sourceStockId?.toLowerCase().includes(searchTerm.toLowerCase());

      // Product type filter
      const matchesType =
        filterProductType === "" || product.productType === filterProductType;

      // Date range filter
      let matchesDateRange = true;
      if (filterDateRange.start) {
        const startDate = new Date(filterDateRange.start);
        startDate.setHours(0, 0, 0, 0);
        matchesDateRange = matchesDateRange && product.createdAt >= startDate;
      }
      if (filterDateRange.end) {
        const endDate = new Date(filterDateRange.end);
        endDate.setHours(23, 59, 59, 999);
        matchesDateRange = matchesDateRange && product.createdAt <= endDate;
      }

      return matchesSearch && matchesType && matchesDateRange;
    });
  };

  // Format number safely
  const formatNumber = (value, decimals = 2) => {
    const num = Number(value || 0);
    return isNaN(num) ? "0.00" : num.toFixed(decimals);
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

  // Get conversion details for a product
  const getConversionDetails = (conversionId) => {
    return conversions.find((conv) => conv.id === conversionId);
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
    return ['rice', 'flour'].includes(productType);
  };

  // Render bagged inventory display
  const renderBaggedInventory = () => {
    const productTypes = Object.keys(baggedInventory).filter(key => 
      !['businessId', 'ownerId', 'lastUpdated', 'createdAt'].includes(key)
    );

    if (productTypes.length === 0) {
      return (
        <div className="bg-white shadow-sm rounded-xl p-6 mb-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Bagged Inventory
          </h3>
          <div className="text-center py-8 text-gray-500">
            No bagged inventory available. Start by creating some bags!
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white shadow-sm rounded-xl p-6 mb-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Bagged Inventory Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {productTypes.map((productType) => {
            const bagSizes = baggedInventory[productType] || {};
            const bagSizeKeys = Object.keys(bagSizes);
            
            if (bagSizeKeys.length === 0) return null;

            return (
              <div key={productType} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 capitalize">
                  {formatProductType(productType)}
                </h4>
                <div className="space-y-2">
                  {bagSizeKeys.map((bagSize) => {
                    const quantity = bagSizes[bagSize];
                    const sizeKg = parseFloat(bagSize.replace('kg', ''));
                    const totalWeight = quantity * sizeKg;
                    
                    return (
                      <div key={bagSize} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {bagSize} bags
                          </span>
                          <p className="text-xs text-gray-500">
                            {formatNumber(totalWeight)}kg total
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-blue-600">
                            {quantity}
                          </span>
                          <p className="text-xs text-gray-500">units</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Quick action button */}
                <button
                  onClick={() => openBagCreationModal(productType)}
                  className="w-full mt-3 text-sm text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 py-2 rounded transition-colors"
                >
                  + Add More Bags
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const filteredProducts = getFilteredProducts();
  const baggedStats = getBaggedInventoryStats();

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Processed Products Inventory
          </h1>
          <p className="text-gray-600 mt-1">
            View all products from paddy processing operations
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
          <p className="text-sm text-gray-600">Total Products</p>
          <p className="text-2xl font-bold text-gray-900">
            {filteredProducts.length}
          </p>
        </div>
        <div className="bg-white shadow-sm rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Total Quantity</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatNumber(totalQuantity)} kg
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

      {/* Product Summary */}
      {Object.keys(productSummary).length > 0 && (
        <div className="bg-white shadow-sm rounded-xl p-6 mb-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Raw Product Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(productSummary).map(([type, quantity]) => (
              <div
                key={type}
                className="text-center p-3 bg-blue-50 rounded-lg"
              >
                <p className="text-xs text-gray-600 font-medium">
                  {formatProductType(type)}
                </p>
                <p className="text-lg font-bold text-blue-600">
                  {formatNumber(quantity)} kg
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Stock Totals Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {Object.entries(stockTotals).map(([productType, quantity]) => {
          if (productType.includes('_') || ['businessId', 'ownerId', 'lastUpdated', 'lastBatchNumber'].includes(productType)) return null;
          
          return (
            <div key={productType} className="bg-white shadow-sm rounded-xl p-4 border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm text-gray-600">{formatProductType(productType)}</p>
                {canCreateBags(productType) && (
                  <button
                    onClick={() => openBagCreationModal(productType)}
                    className="text-green-600 hover:text-green-700 text-xs bg-green-50 px-2 py-1 rounded transition-colors"
                    title={`Create ${productType} bags`}
                  >
                    📦 Bag
                  </button>
                )}
              </div>
              <p className="text-xl font-bold text-gray-900">
                {formatNumber(quantity)} kg
              </p>
              {stockTotals[`${productType}_bagged_total`] && (
                <p className="text-xs text-green-600 mt-1">
                  {formatNumber(stockTotals[`${productType}_bagged_total`])} kg bagged
                </p>
              )}
              {stockTotals[`${productType}_bags_count`] && (
                <p className="text-xs text-blue-600">
                  {stockTotals[`${productType}_bags_count`]} bags
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Bagged Inventory Section */}
      {renderBaggedInventory()}

      {/* Filter Section */}
      <div className="bg-white shadow-sm rounded-xl p-4 mb-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                placeholder="Search products..."
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

      {/* Products List */}
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
      ) : products.length === 0 ? (
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
            No processed products found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Process some paddy stock to see products here.
          </p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-200">
          <p className="text-gray-500">No products match your search criteria.</p>
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
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSortChange("productType")}
                  >
                    <div className="flex items-center">
                      Product Type
                      {sortField === "productType" && (
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
                    onClick={() => handleSortChange("quantity")}
                  >
                    <div className="flex items-center">
                      Quantity (kg)
                      {sortField === "quantity" && (
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
                    Source
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
                {filteredProducts.map((product) => (
                  <React.Fragment key={product.id}>
                    <tr className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => toggleRowExpand(product.id)}
                          className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                        >
                          {expandedRows[product.id] ? (
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
                        <div className="text-sm text-gray-900">
                          {formatDate(product.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatProductType(product.productType)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-semibold">
                          {product.quantity ? formatNumber(product.quantity) : "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {product.sourceType === "paddy_conversion"
                            ? "Paddy Stock"
                            : product.sourceType}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {canCreateBags(product.productType) && (
                          <button
                            onClick={() => openBagCreationModal(product.productType)}
                            className="text-green-600 hover:text-green-700 text-sm bg-green-50 px-3 py-1 rounded transition-colors"
                          >
                            📦 Create Bags
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedRows[product.id] && (
                      <tr className="bg-blue-50">
                        <td className="px-4 py-3"></td>
                        <td colSpan="5" className="px-4 py-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">
                                Product Details
                              </h4>
                              <div className="bg-white p-3 rounded-lg shadow-sm space-y-2 border border-gray-200">
                                <div>
                                  <span className="text-xs text-gray-500">
                                    Product ID:
                                  </span>
                                  <p className="text-sm text-gray-900 font-mono">
                                    {product.id}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500">
                                    Source Stock ID:
                                  </span>
                                  <p className="text-sm text-gray-900 font-mono">
                                    {product.sourceStockId}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500">
                                    Created:
                                  </span>
                                  <p className="text-sm text-gray-900">
                                    {product.createdAt?.toLocaleString(
                                      "en-US",
                                      {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      }
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">
                                Conversion Information
                              </h4>
                              <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                                {(() => {
                                  const conversionDetails =
                                    getConversionDetails(product.conversionId);
                                  return conversionDetails ? (
                                    <div className="space-y-2">
                                      <div>
                                        <span className="text-xs text-gray-500">
                                          Source Paddy Type:
                                        </span>
                                        <p className="text-sm text-gray-900">
                                          {conversionDetails.sourcePaddyType}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-xs text-gray-500">
                                          Source Quantity:
                                        </span>
                                        <p className="text-sm text-gray-900">
                                          {formatNumber(conversionDetails.sourceQuantity)} kg
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-xs text-gray-500">
                                          Conversion Date:
                                        </span>
                                        <p className="text-sm text-gray-900">
                                          {formatDate(
                                            conversionDetails.conversionDate
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500">
                                      Conversion details not available
                                    </p>
                                  );
                                })()}
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
                    setBagCreationData({ sizeKg: '', quantity: '', productType: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Available stock info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  Available {formatProductType(bagCreationData.productType)} stock: {' '}
                  <span className="font-semibold">
                    {formatNumber(stockTotals[bagCreationData.productType])} kg
                  </span>
                </p>
              </div>

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
                    {baggedInventory[bagCreationData.productType]?.[`${bagCreationData.sizeKg}kg`] && (
                      <p className="text-xs text-blue-600 mt-1">
                        Current {bagCreationData.sizeKg}kg bags: {baggedInventory[bagCreationData.productType][`${bagCreationData.sizeKg}kg`]}
                      </p>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowBagCreationModal(false);
                      setBagCreationData({ sizeKg: '', quantity: '', productType: '' });
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
    </div>
  );
};

export default ProcessedProducts;