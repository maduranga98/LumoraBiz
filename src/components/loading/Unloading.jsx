import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  updateDoc,
  increment,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { useBusiness } from "../../contexts/BusinessContext";
import { Package, TrendingUp, User, Calculator, Save } from "lucide-react";

const Unloading = () => {
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();

  // States
  const [salesReps, setSalesReps] = useState([]);
  const [selectedSalesRep, setSelectedSalesRep] = useState("");
  const [loadings, setLoadings] = useState([]);
  const [selectedLoading, setSelectedLoading] = useState(null);
  const [remainingQuantities, setRemainingQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch sales representatives
  useEffect(() => {
    if (currentBusiness?.id && currentUser?.uid) {
      fetchSalesReps();
    }
  }, [currentBusiness?.id, currentUser?.uid]);

  // Fetch loadings when sales rep is selected
  useEffect(() => {
    if (selectedSalesRep) {
      fetchLoadings(selectedSalesRep);
    } else {
      setLoadings([]);
      setSelectedLoading(null);
    }
  }, [selectedSalesRep]);

  // Initialize remaining quantities when loading is selected
  useEffect(() => {
    if (selectedLoading) {
      const initialQuantities = {};
      selectedLoading.items.forEach((item, index) => {
        initialQuantities[index] = 0;
      });
      setRemainingQuantities(initialQuantities);
    }
  }, [selectedLoading]);

  // Fetch sales representatives
  const fetchSalesReps = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  // Fetch loadings for selected sales rep
  const fetchLoadings = async (repId) => {
    try {
      setLoading(true);
      const loadingsRef = collection(
        db,
        "owners",
        currentUser.uid,
        "businesses",
        currentBusiness.id,
        "loadings"
      );

      const loadingsQuery = query(
        loadingsRef,
        where("salesRepId", "==", repId),
        where("status", "==", "prepared")
      );

      const snapshot = await getDocs(loadingsQuery);
      const loadingsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));

      // Sort by creation date (newest first)
      loadingsData.sort((a, b) => b.createdAt - a.createdAt);
      setLoadings(loadingsData);

      // Auto-select the first loading if available
      if (loadingsData.length > 0) {
        setSelectedLoading(loadingsData[0]);
      } else {
        setSelectedLoading(null);
      }
    } catch (error) {
      console.error("Error fetching loadings:", error);
      toast.error("Failed to load loading data");
    } finally {
      setLoading(false);
    }
  };

  // Handle remaining quantity change
  const handleRemainingQuantityChange = (itemIndex, value) => {
    const numValue = parseFloat(value) || 0;
    const maxQuantity = selectedLoading.items[itemIndex].quantity;

    // Ensure remaining quantity doesn't exceed loaded quantity
    const validValue = Math.min(numValue, maxQuantity);

    setRemainingQuantities((prev) => ({
      ...prev,
      [itemIndex]: validValue,
    }));
  };

  // Calculate sold quantity for an item
  const calculateSoldQuantity = (itemIndex) => {
    const loadedQuantity = selectedLoading.items[itemIndex].quantity;
    const remainingQuantity = remainingQuantities[itemIndex] || 0;
    return Math.max(0, loadedQuantity - remainingQuantity);
  };

  // Calculate sold value for an item
  const calculateSoldValue = (itemIndex) => {
    const soldQuantity = calculateSoldQuantity(itemIndex);
    const pricePerKg = selectedLoading.items[itemIndex].pricePerKg;
    return soldQuantity * pricePerKg;
  };

  // Calculate total sold quantities and values
  const calculateTotals = () => {
    if (!selectedLoading)
      return {
        totalSoldQuantity: 0,
        totalSoldValue: 0,
        totalRemainingQuantity: 0,
      };

    let totalSoldQuantity = 0;
    let totalSoldValue = 0;
    let totalRemainingQuantity = 0;

    selectedLoading.items.forEach((_, index) => {
      totalSoldQuantity += calculateSoldQuantity(index);
      totalSoldValue += calculateSoldValue(index);
      totalRemainingQuantity += remainingQuantities[index] || 0;
    });

    return { totalSoldQuantity, totalSoldValue, totalRemainingQuantity };
  };

  // Handle unloading submission
  const handleUnloading = async () => {
    if (!selectedLoading) {
      toast.error("Please select a loading to process");
      return;
    }

    // Validate that all remaining quantities are entered
    const hasInvalidQuantities = selectedLoading.items.some((item, index) => {
      const remaining = remainingQuantities[index];
      return (
        remaining === undefined || remaining < 0 || remaining > item.quantity
      );
    });

    if (hasInvalidQuantities) {
      toast.error("Please enter valid remaining quantities for all items");
      return;
    }

    setIsProcessing(true);

    try {
      const batch = writeBatch(db);
      const totals = calculateTotals();

      // Prepare loading report data
      const reportItems = selectedLoading.items.map((item, index) => {
        const remainingQty = remainingQuantities[index] || 0;
        const soldQty = calculateSoldQuantity(index);
        const soldValue = calculateSoldValue(index);

        return {
          productType: item.productType,
          productCode: item.productCode,
          loadedQuantity: item.quantity,
          remainingQuantity: remainingQty,
          soldQuantity: soldQty,
          pricePerKg: item.pricePerKg,
          soldValue: soldValue,
          bagsUsed: item.bagsUsed,
          bagsCount: item.bagsCount,
        };
      });

      // Create loading report
      const loadingReportRef = doc(
        collection(
          db,
          "owners",
          currentUser.uid,
          "businesses",
          currentBusiness.id,
          "loadingReports"
        )
      );

      batch.set(loadingReportRef, {
        reportId: loadingReportRef.id,
        originalLoadingId: selectedLoading.id,
        salesRepId: selectedLoading.salesRepId,
        salesRepName: selectedLoading.salesRepName,
        salesRepPhone: selectedLoading.salesRepPhone,
        salesRepEmail: selectedLoading.salesRepEmail,
        route: selectedLoading.todayRoute,
        routeId: selectedLoading.routeId,

        // Summary totals
        totalLoadedQuantity: selectedLoading.totalWeight,
        totalLoadedValue: selectedLoading.totalValue,
        totalRemainingQuantity: totals.totalRemainingQuantity,
        totalSoldQuantity: totals.totalSoldQuantity,
        totalSoldValue: totals.totalSoldValue,

        // Detailed items
        items: reportItems,
        itemCount: reportItems.length,

        // Timestamps
        loadingDate: selectedLoading.createdAt,
        unloadingDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        businessId: currentBusiness.id,
        ownerId: currentUser.uid,
      });

      // Update stock for remaining items
      const stockTotalsRef = doc(
        db,
        "owners",
        currentUser.uid,
        "businesses",
        currentBusiness.id,
        "stock",
        "stockTotals"
      );

      const stockUpdates = {};
      reportItems.forEach((item) => {
        if (item.remainingQuantity > 0) {
          // Add remaining quantity back to bagged stock
          stockUpdates[`${item.productType}_bagged_total`] = increment(
            item.remainingQuantity
          );
          stockUpdates[`${item.productType}_loaded_total`] = increment(
            -item.remainingQuantity
          );
        }

        // Update sold quantities
        stockUpdates[`${item.productType}_sold_total`] = increment(
          item.soldQuantity
        );
        stockUpdates[`${item.productType}_sold_value`] = increment(
          item.soldValue
        );
      });

      stockUpdates.lastUpdated = serverTimestamp();
      batch.update(stockTotalsRef, stockUpdates);

      // Update bag statuses for remaining quantities
      for (const item of reportItems) {
        if (item.remainingQuantity > 0) {
          // Update bag statuses back to available for remaining quantity
          // This is a simplified approach - in reality, you might need more complex logic
          // to handle partial bag returns
          for (const bagInfo of item.bagsUsed) {
            const bagRef = doc(
              db,
              "owners",
              currentUser.uid,
              "businesses",
              currentBusiness.id,
              "stock",
              "baggedStock",
              item.productCode,
              bagInfo.bagDocId
            );

            // For simplicity, mark as available if there's remaining quantity
            // In a real scenario, you'd need to calculate partial quantities
            if (item.remainingQuantity > 0) {
              batch.update(bagRef, {
                status: "available",
                salesRepId: null,
                salesRepName: null,
                loadedAt: null,
                updatedAt: serverTimestamp(),
              });
            }
          }
        }
      }

      // Delete the original loading document
      const loadingDocRef = doc(
        db,
        "owners",
        currentUser.uid,
        "businesses",
        currentBusiness.id,
        "loadings",
        selectedLoading.id
      );
      batch.delete(loadingDocRef);

      await batch.commit();

      // Reset form
      setSelectedLoading(null);
      setRemainingQuantities({});
      setSelectedSalesRep("");

      toast.success(
        `Unloading completed! Total sales: ${formatCurrency(
          totals.totalSoldValue
        )}`
      );
    } catch (error) {
      console.error("Error processing unloading:", error);
      toast.error("Failed to process unloading");
    } finally {
      setIsProcessing(false);
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

  // Format date
  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const totals = calculateTotals();
  const selectedRep = salesReps.find((rep) => rep.id === selectedSalesRep);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Unloading & Sales Report
        </h1>
        <p className="text-gray-600 mt-1">
          Process returns and calculate sales for completed routes
        </p>
      </div>

      <div className="space-y-6">
        {/* Sales Representative Selection */}
        <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Select Sales Representative
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
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
            </div>

            {selectedSalesRep && loadings.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loading to Process
                </label>
                <select
                  value={selectedLoading?.id || ""}
                  onChange={(e) => {
                    const loading = loadings.find(
                      (l) => l.id === e.target.value
                    );
                    setSelectedLoading(loading);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {loadings.map((loading) => (
                    <option key={loading.id} value={loading.id}>
                      {formatDate(loading.createdAt)} -{" "}
                      {formatCurrency(loading.totalValue)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Selected Rep Info */}
          {selectedSalesRep && selectedRep && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
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
                    {selectedRep.phone && <span>📞 {selectedRep.phone}</span>}
                    <span>Loadings Available: {loadings.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Loading Details */}
        {selectedLoading && (
          <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  Loading Details
                </h2>
                <div className="text-sm text-gray-600">
                  <span className="inline-flex items-center space-x-1">
                    <Package className="h-4 w-4" />
                    <span>Loaded: {formatDate(selectedLoading.createdAt)}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loaded Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price per kg
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remaining Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sold Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sales Value
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedLoading.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatProductType(item.productType)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.bagsCount} bags
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-semibold">
                          {formatNumber(item.quantity)} kg
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-semibold">
                          {formatCurrency(item.pricePerKg)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          step="0.01"
                          value={remainingQuantities[index] || ""}
                          onChange={(e) =>
                            handleRemainingQuantityChange(index, e.target.value)
                          }
                          className="w-24 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="0.00"
                        />
                        <span className="ml-1 text-xs text-gray-500">kg</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-600">
                          {formatNumber(calculateSoldQuantity(index))} kg
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-600">
                          {formatCurrency(calculateSoldValue(index))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sales Summary */}
        {selectedLoading && (
          <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Sales Summary
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">
                  Total Loaded
                </div>
                <div className="text-xl font-bold text-blue-900">
                  {formatNumber(selectedLoading.totalWeight)} kg
                </div>
                <div className="text-sm text-blue-700">
                  {formatCurrency(selectedLoading.totalValue)}
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-lg">
                <div className="text-sm text-amber-600 font-medium">
                  Remaining
                </div>
                <div className="text-xl font-bold text-amber-900">
                  {formatNumber(totals.totalRemainingQuantity)} kg
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Sold</div>
                <div className="text-xl font-bold text-green-900">
                  {formatNumber(totals.totalSoldQuantity)} kg
                </div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-lg">
                <div className="text-sm text-emerald-600 font-medium">
                  Total Sales
                </div>
                <div className="text-2xl font-bold text-emerald-900">
                  {formatCurrency(totals.totalSoldValue)}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setSelectedLoading(null);
                  setRemainingQuantities({});
                  setSelectedSalesRep("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isProcessing}
              >
                Clear
              </button>
              <button
                onClick={handleUnloading}
                disabled={isProcessing || !selectedLoading}
                className="px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>
                  {isProcessing ? "Processing..." : "Complete Unloading"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* No Loadings Message */}
        {selectedSalesRep && loadings.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-200">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">
              No loadings found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              No prepared loadings found for {selectedRep?.name}. Create a
              loading first before processing unloading.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Unloading;
