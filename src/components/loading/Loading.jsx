import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  addDoc,
  updateDoc,
  increment,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useBusiness } from '../../contexts/BusinessContext';

const Loading = () => {
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();

  // States
  const [baggedStocks, setBaggedStocks] = useState({});
  const [groupedProducts, setGroupedProducts] = useState({});
  const [selectedProducts, setSelectedProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingNotes, setLoadingNotes] = useState('');
  const [isProcessingLoading, setIsProcessingLoading] = useState(false);

  // Fetch data when current business changes
  useEffect(() => {
    if (currentBusiness?.id && currentUser?.uid) {
      fetchBaggedStocks();
    } else {
      setLoading(false);
    }
  }, [currentBusiness?.id, currentUser?.uid]);

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
    return codeMap[productType] || productType.toLowerCase().replace(/\s+/g, '_');
  };

  // Process grouped products by type and price
  const processGroupedProducts = () => {
    const grouped = {};

    Object.entries(baggedStocks).forEach(([productType, bags]) => {
      // Group bags by recommended selling price
      const priceGroups = {};
      
      bags.forEach(bag => {
        const price = bag.recommendedSellingPrice || bag.pricePerKg || 0;
        const priceKey = price.toString();
        
        if (!priceGroups[priceKey]) {
          priceGroups[priceKey] = {
            price: price,
            bags: [],
            totalWeight: 0,
            totalBags: 0
          };
        }
        
        priceGroups[priceKey].bags.push(bag);
        priceGroups[priceKey].totalWeight += bag.weight || 0;
        priceGroups[priceKey].totalBags += 1;
      });

      // Convert to array and sort by price
      const priceOptions = Object.values(priceGroups).sort((a, b) => a.price - b.price);

      grouped[productType] = {
        productType,
        priceOptions,
        totalAvailableWeight: bags.reduce((sum, bag) => sum + (bag.weight || 0), 0),
        totalAvailableBags: bags.length
      };
    });

    setGroupedProducts(grouped);
  };

  // Handle product selection change
  const handleProductChange = (productType, field, value) => {
    setSelectedProducts(prev => ({
      ...prev,
      [productType]: {
        ...prev[productType],
        [field]: value,
        // Reset quantity when price changes
        ...(field === 'selectedPriceIndex' ? { quantity: 0 } : {})
      }
    }));
  };

  // Calculate total for a product
  const calculateProductTotal = (productType) => {
    const selection = selectedProducts[productType];
    if (!selection || !selection.quantity || selection.selectedPriceIndex === undefined) {
      return 0;
    }

    const priceOption = groupedProducts[productType]?.priceOptions[selection.selectedPriceIndex];
    if (!priceOption) return 0;

    return selection.quantity * priceOption.price;
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
      return total + (selection?.quantity || 0);
    }, 0);
  };

  // Handle loading creation
  const createLoading = async () => {
    // Validate selections
    const validSelections = Object.entries(selectedProducts).filter(
      ([_, selection]) => selection?.quantity > 0 && selection?.selectedPriceIndex !== undefined
    );

    if (validSelections.length === 0) {
      toast.error("Please select at least one product to add to loading");
      return;
    }

    // Validate quantities
    for (const [productType, selection] of validSelections) {
      const priceOption = groupedProducts[productType]?.priceOptions[selection.selectedPriceIndex];
      if (!priceOption) {
        toast.error(`Invalid price selection for ${formatProductType(productType)}`);
        return;
      }

      if (selection.quantity > priceOption.totalWeight) {
        toast.error(`Not enough ${formatProductType(productType)} available. Max: ${priceOption.totalWeight} kg`);
        return;
      }
    }

    setIsProcessingLoading(true);

    try {
      const batch = writeBatch(db);
      const loadingItems = [];
      let totalValue = 0;
      let totalWeight = 0;

      // Process each selected product
      for (const [productType, selection] of validSelections) {
        const priceOption = groupedProducts[productType].priceOptions[selection.selectedPriceIndex];
        const productCode = getProductTypeCode(productType);
        
        let remainingQuantity = selection.quantity;
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
              pricePerKg: priceOption.price
            });
            remainingQuantity -= bagWeight;

            // Mark bag as loaded (still available but in loading)
            const bagRef = doc(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/${productCode}`, bag.id);
            batch.update(bagRef, {
              status: 'loaded',
              loadedAt: serverTimestamp(),
              loadingNotes: loadingNotes,
              updatedAt: serverTimestamp()
            });
          } else {
            // Partial bag usage (this shouldn't happen in typical bag sales, but handling it)
            usedBags.push({ 
              bagId: bag.bagId,
              bagDocId: bag.id,
              weight: remainingQuantity,
              pricePerKg: priceOption.price
            });
            remainingQuantity = 0;
            
            // For partial usage, mark as loaded
            const bagRef = doc(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/${productCode}`, bag.id);
            batch.update(bagRef, {
              status: 'loaded',
              loadedAt: serverTimestamp(),
              loadingNotes: loadingNotes,
              updatedAt: serverTimestamp()
            });
          }
        }

        const productTotal = selection.quantity * priceOption.price;
        loadingItems.push({
          productType,
          productCode,
          quantity: selection.quantity,
          pricePerKg: priceOption.price,
          totalValue: productTotal,
          bagsUsed: usedBags,
          bagsCount: usedBags.length
        });

        totalValue += productTotal;
        totalWeight += selection.quantity;
      }

      // Create loading record
      const loadingRef = doc(collection(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/loadings`));
      batch.set(loadingRef, {
        loadingId: loadingRef.id,
        items: loadingItems,
        totalWeight: totalWeight,
        totalValue: totalValue,
        itemCount: loadingItems.length,
        notes: loadingNotes,
        status: 'prepared',
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        businessId: currentBusiness.id,
        ownerId: currentUser.uid
      });

      // Update stock totals
      const stockTotalsRef = doc(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/stockTotals`);
      const stockUpdates = {};
      
      loadingItems.forEach(item => {
        stockUpdates[`${item.productType}_bagged_total`] = increment(-item.quantity);
        stockUpdates[`${item.productType}_bags_count`] = increment(-item.bagsCount);
        stockUpdates[`${item.productType}_loaded_total`] = increment(item.quantity);
        stockUpdates[`${item.productType}_loaded_bags_count`] = increment(item.bagsCount);
      });
      
      stockUpdates.lastUpdated = serverTimestamp();
      batch.update(stockTotalsRef, stockUpdates);

      await batch.commit();

      // Reset form
      setSelectedProducts({});
      setLoadingNotes('');

      // Refresh data
      await fetchBaggedStocks();

      toast.success(`Loading created successfully! Total value: ${formatCurrency(totalValue)} for ${totalWeight}kg`);

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
            onClick={fetchBaggedStocks}
            className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const hasProducts = Object.keys(groupedProducts).length > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Create Loading
        </h1>
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
          {/* Loading Notes */}
          <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Loading Information
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={loadingNotes}
                onChange={(e) => setLoadingNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Add any notes about this loading..."
              />
            </div>
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
                  {Object.entries(groupedProducts).map(([productType, productData]) => (
                    <tr key={productType} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatProductType(productType)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {productData.totalAvailableBags} bags available
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-semibold">
                          {formatNumber(productData.totalAvailableWeight)} kg
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {productData.priceOptions.length === 1 ? (
                          <div className="text-sm text-gray-900 font-semibold">
                            {formatCurrency(productData.priceOptions[0].price)}
                          </div>
                        ) : (
                          <select
                            value={selectedProducts[productType]?.selectedPriceIndex || ''}
                            onChange={(e) => handleProductChange(productType, 'selectedPriceIndex', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          >
                            <option value="">Select price</option>
                            {productData.priceOptions.map((option, index) => (
                              <option key={index} value={index}>
                                {formatCurrency(option.price)} ({formatNumber(option.totalWeight)}kg available)
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          max={
                            productData.priceOptions.length === 1 
                              ? productData.priceOptions[0].totalWeight
                              : selectedProducts[productType]?.selectedPriceIndex !== undefined
                                ? productData.priceOptions[selectedProducts[productType].selectedPriceIndex].totalWeight
                                : 0
                          }
                          step="0.01"
                          value={selectedProducts[productType]?.quantity || ''}
                          onChange={(e) => handleProductChange(productType, 'quantity', parseFloat(e.target.value) || 0)}
                          disabled={
                            productData.priceOptions.length > 1 && 
                            selectedProducts[productType]?.selectedPriceIndex === undefined
                          }
                          className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100"
                          placeholder="0"
                        />
                        <span className="ml-1 text-xs text-gray-500">kg</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(calculateProductTotal(productType))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Loading Summary</h3>
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
                  setLoadingNotes('');
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
                  calculateGrandTotal() <= 0
                }
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessingLoading ? 'Creating Loading...' : 'Create Loading'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loading;