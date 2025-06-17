import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  query,
  where,
  getDocs,
  increment,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useBusiness } from '../../contexts/BusinessContext';
import { toast } from 'react-hot-toast';
import PriceCalculation from './PriceCalculation'; 

const ConvertToOtherModal = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  stock = null
}) => {
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();

  // State for converted quantities
  const [convertedData, setConvertedData] = useState({
    rice: '',
    hunuSahal: '',
    kadunuSahal: '',
    ricePolish: '',
    dahaiyya: '',
    flour: '',
    startElectricityNumber: '',
    endElectricityNumber: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 🎯 Key states for price calculation flow
  const [showPriceCalculation, setShowPriceCalculation] = useState(false);
  const [submittedConversionData, setSubmittedConversionData] = useState(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      console.log('🔄 Modal closed, resetting state');
      setConvertedData({
        rice: '',
        hunuSahal: '',
        kadunuSahal: '',
        ricePolish: '',
        dahaiyya: '',
        flour: '',
        startElectricityNumber: '',
        endElectricityNumber: ''
      });
      setErrors({});
      setShowPriceCalculation(false);
      setSubmittedConversionData(null);
    }
  }, [isOpen]);

  // Generate batch number
  const generateBatchNumber = () => {
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BATCH_${timestamp}_${random}`;
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Allow only positive numbers for quantity fields
    if (['rice', 'hunuSahal', 'kadunuSahal', 'ricePolish', 'dahaiyya', 'flour'].includes(name)) {
      if (value === '' || (parseFloat(value) >= 0 && !isNaN(parseFloat(value)))) {
        setConvertedData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    } else {
      // For electricity numbers, allow any text/number
      setConvertedData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Calculate total converted quantity
  const getTotalConverted = () => {
    return Object.entries(convertedData)
      .filter(([key]) => !key.includes('Electric')) // Exclude electricity numbers from total
      .reduce((total, [_, value]) => {
        const num = parseFloat(value) || 0;
        return total + num;
      }, 0);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    const totalConverted = getTotalConverted();

    // Validate required fields
    if (totalConverted === 0) {
      newErrors.general = 'Please enter at least one product quantity';
    }

    // Validate electricity board numbers
    if (!convertedData.startElectricityNumber.trim()) {
      newErrors.startElectricityNumber = 'Start electricity board number is required';
    }
    
    if (!convertedData.endElectricityNumber.trim()) {
      newErrors.endElectricityNumber = 'End electricity board number is required';
    }

    // Check if start number is less than end number (if both are numeric)
    const startNum = parseFloat(convertedData.startElectricityNumber);
    const endNum = parseFloat(convertedData.endElectricityNumber);
    
    if (!isNaN(startNum) && !isNaN(endNum) && startNum >= endNum) {
      newErrors.endElectricityNumber = 'End number must be greater than start number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 🆕 NEW: Update centralized product stock totals
  const updateCentralizedStockTotals = async (byproducts, batchNumber) => {
    try {
      console.log('📊 Updating centralized product stock totals...');
      
      // Path to the centralized stock totals document
      const stockTotalsDocPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/stockTotals`;
      
      // Prepare the update data - increment each product quantity
      const updateData = {};
      
      for (const [productKey, quantity] of Object.entries(byproducts)) {
        const quantityNum = parseFloat(quantity);
        if (quantityNum > 0) {
          // Use increment to add to existing totals
          updateData[productKey] = increment(quantityNum);
          console.log(`📈 Will increment ${productKey}: +${quantityNum} kg`);
        }
      }

      if (Object.keys(updateData).length > 0) {
        try {
          // Try to update existing document
          await updateDoc(doc(db, stockTotalsDocPath), {
            ...updateData,
            lastUpdated: serverTimestamp(),
            lastBatchNumber: batchNumber,
            lastProcessedAt: serverTimestamp()
          });
          console.log('✅ Updated existing centralized stock totals');
        } catch (error) {
          if (error.code === 'not-found') {
            // Document doesn't exist, create it with initial totals
            console.log('📝 Creating new centralized stock totals document...');
            
            const initialData = {
              // Initialize all product totals
              rice: 0,
              hunuSahal: 0,
              kadunuSahal: 0,
              ricePolish: 0,
              dahaiyya: 0,
              flour: 0,
              
              // Add the new quantities
              ...Object.fromEntries(
                Object.entries(byproducts)
                  .filter(([_, quantity]) => parseFloat(quantity) > 0)
                  .map(([key, quantity]) => [key, parseFloat(quantity)])
              ),
              
              // Metadata
              businessId: currentBusiness.id,
              ownerId: currentUser.uid,
              stockType: 'centralized_totals',
              createdAt: serverTimestamp(),
              lastUpdated: serverTimestamp(),
              lastBatchNumber: batchNumber,
              lastProcessedAt: serverTimestamp()
            };

            await setDoc(doc(db, stockTotalsDocPath), initialData);
            console.log('✅ Created new centralized stock totals document');
          } else {
            throw error;
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Error updating centralized stock totals:', error);
      throw error;
    }
  };

  // Save byproducts to buyer's purchase record
  const saveByproductsToPurchase = async (purchaseId, byproducts, batchNumber) => {
    if (!stock?.buyerId || !purchaseId) {
      console.log('❌ Missing buyerId or purchaseId');
      return;
    }

    try {
      // Fixed path - buyers collection (odd number of segments: 7)
      const purchaseDocPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/buyers/${stock.buyerId}/purchases/${purchaseId}`;
      
      await updateDoc(doc(db, purchaseDocPath), {
        byproducts: byproducts,
        batchNumber: batchNumber,
        processedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log('✅ Byproducts saved to purchase record');
    } catch (error) {
      console.error('❌ Error saving byproducts to purchase:', error);
      // Don't throw error to prevent breaking the entire process
      console.warn('⚠️ Continuing without updating purchase record');
    }
  };

  // Update or create stock totals in processedStock document
  const updateStockTotals = async (byproducts) => {
    try {
      console.log('📊 Updating stock totals in processedStock document...');
      
      // Path to the processedStock document
      const processedStockDocPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/processedStock`;
      
      // Prepare the update data for the 'data' field
      const updateData = {};
      
      for (const [productKey, quantity] of Object.entries(byproducts)) {
        const quantityNum = parseFloat(quantity);
        if (quantityNum > 0) {
          // Use increment to add to existing totals
          updateData[`data.${productKey}`] = increment(quantityNum);
          console.log(`📈 Will increment ${productKey}: +${quantityNum} kg`);
        }
      }

      if (Object.keys(updateData).length > 0) {
        try {
          // Try to update existing document
          await updateDoc(doc(db, processedStockDocPath), {
            ...updateData,
            updatedAt: serverTimestamp(),
            lastProcessedBatch: stock?.id || null
          });
          console.log('✅ Updated existing processedStock totals');
        } catch (error) {
          if (error.code === 'not-found') {
            // Document doesn't exist, create it
            console.log('📝 Creating new processedStock document with initial totals...');
            
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
              stockType: 'processed_totals',
              status: 'active',
              createdBy: currentUser.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              lastProcessedBatch: stock?.id || null
            };

            await setDoc(doc(db, processedStockDocPath), newDocData);
            console.log('✅ Created new processedStock document with totals');
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('❌ Error updating stock totals:', error);
      throw error;
    }
  };

  // Create single batch document for processed products
  const createProcessedBatchDocument = async (byproducts, batchNumber) => {
    try {
      console.log('🏭 Creating single batch document...');
      
      // Filter out products with 0 quantity for cleaner data
      const validProducts = {};
      Object.entries(byproducts).forEach(([key, value]) => {
        if (parseFloat(value) > 0) {
          validProducts[key] = parseFloat(value);
        }
      });

      const batchData = {
        batchNumber: batchNumber,
        stockType: 'processed_batch',
        status: 'available',
        
        // All products in this batch
        products: validProducts,
        totalQuantity: getTotalConverted(),
        
        // Reference data
        buyerId: stock?.buyerId,
        buyerName: stock?.buyerName,
        purchaseId: stock?.purchaseId || null,
        paymentId: stock?.paymentId || null,
        rawStockId: stock?.id || null,
        
        // Original paddy data
        originalPaddyType: stock?.paddyType,
        originalQuantity: stock?.quantity,
        originalPricePerKg: stock?.price,
        
        // Processing data
        electricityData: {
          startNumber: convertedData.startElectricityNumber,
          endNumber: convertedData.endElectricityNumber,
          consumption: (() => {
            const start = parseFloat(convertedData.startElectricityNumber);
            const end = parseFloat(convertedData.endElectricityNumber);
            return (!isNaN(start) && !isNaN(end) && end > start) ? (end - start) : 0;
          })()
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

      // Add to processed stock collection
      const processedStockPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/processedStock/stock`;
      const docRef = await addDoc(collection(db, processedStockPath), batchData);
      
      console.log(`✅ Created batch document: ${batchNumber}`);
      
      return {
        id: docRef.id,
        batchNumber: batchNumber,
        ...batchData
      };
    } catch (error) {
      console.error('❌ Error creating batch document:', error);
      throw error;
    }
  };

  // Update raw stock status to processed (optional - only if raw stock exists)
  const updateRawStockStatus = async (batchId, batchNumber) => {
    if (!stock?.id) {
      console.log('ℹ️ No raw stock ID provided - skipping raw stock update');
      return;
    }

    try {
      console.log(`🔍 Attempting to update raw stock: ${stock.id}`);
      
      // Try different possible paths for raw stock (only odd segment paths)
      const possiblePaths = [
        `owners/${currentUser.uid}/businesses/${currentBusiness.id}/rawStock`,
        `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock`,
        `owners/${currentUser.uid}/businesses/${currentBusiness.id}/inventory`,
        ...(stock.buyerId ? [`owners/${currentUser.uid}/businesses/${currentBusiness.id}/buyers/${stock.buyerId}/stock`] : []),
      ];

      let updateSuccessful = false;

      for (const path of possiblePaths) {
        try {
          console.log(`🔍 Trying path: ${path}/${stock.id}`);
          
          await updateDoc(doc(db, path, stock.id), {
            status: 'processed',
            processedBatchId: batchId,
            batchNumber: batchNumber,
            processedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          console.log(`✅ Raw stock status updated successfully at: ${path}`);
          updateSuccessful = true;
          break;
        } catch (pathError) {
          // Don't log every path error as it's expected when starting fresh
          continue;
        }
      }

      if (!updateSuccessful) {
        console.log('ℹ️ Raw stock document not found - this is normal for initial setup');
        console.log('💡 The system will work perfectly without updating raw stock status');
        console.log('📋 All processing data is safely stored in the batch document');
      }

    } catch (error) {
      console.log('ℹ️ Raw stock update skipped:', error.message);
      // This is completely normal for initial setup
    }
  };

  // 🎯 UPDATED: Handle form submission with enhanced database operations
  const handleSubmit = async () => {
    console.log('🔄 Convert & Calculate Price clicked');
    
    if (!validateForm()) {
      console.log('❌ Validation failed');
      return;
    }

    if (!currentUser || !currentBusiness?.id) {
      toast.error('Authentication or business context missing');
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate unique batch number
      const batchNumber = generateBatchNumber();
      console.log('🏷️ Generated batch number:', batchNumber);

      // Prepare byproducts data (excluding electricity numbers)
      const byproducts = {
        rice: convertedData.rice || '0',
        hunuSahal: convertedData.hunuSahal || '0',
        kadunuSahal: convertedData.kadunuSahal || '0',
        ricePolish: convertedData.ricePolish || '0',
        dahaiyya: convertedData.dahaiyya || '0',
        flour: convertedData.flour || '0',
      };

      console.log('📦 Prepared byproducts:', byproducts);

      // 1. Create single batch document for all processed products
      console.log('🏭 Creating single batch document...');
      const batchDocument = await createProcessedBatchDocument(byproducts, batchNumber);
      
      // 2. Update stock totals in processedStock document (existing functionality)
      console.log('📊 Updating stock totals in processedStock document...');
      await updateStockTotals(byproducts);
      
      // 3. 🆕 Update centralized product stock totals (new functionality)
      console.log('📊 Updating centralized product stock totals...');
      await updateCentralizedStockTotals(byproducts, batchNumber);

      // 4. Update buyer's purchase record with byproducts (with graceful error handling)
      if (stock?.purchaseId) {
        console.log('📝 Updating purchase record with byproducts...');
        await saveByproductsToPurchase(stock.purchaseId, {
          ...byproducts,
          electricityData: {
            startNumber: convertedData.startElectricityNumber,
            endNumber: convertedData.endElectricityNumber,
            consumption: (() => {
              const start = parseFloat(convertedData.startElectricityNumber);
              const end = parseFloat(convertedData.endElectricityNumber);
              return (!isNaN(start) && !isNaN(end) && end > start) ? (end - start) : 0;
            })()
          },
          batchId: batchDocument.id,
          totalProcessedQuantity: getTotalConverted()
        }, batchNumber);
      }

      // 5. Update raw stock status (optional - only if exists)
      console.log('📦 Checking for raw stock to update...');
      await updateRawStockStatus(batchDocument.id, batchNumber);

      // 📊 Prepare data for PriceCalculation component
      const submissionData = {
        // All converted product data
        rice: convertedData.rice,
        hunuSahal: convertedData.hunuSahal,
        kadunuSahal: convertedData.kadunuSahal,
        ricePolish: convertedData.ricePolish,
        dahaiyya: convertedData.dahaiyya,
        flour: convertedData.flour,
        startElectricityNumber: convertedData.startElectricityNumber,
        endElectricityNumber: convertedData.endElectricityNumber,
        
        // Include original stock data
        originalStock: {
          stockId: stock?.id,
          buyerId: stock?.buyerId,
          buyerName: stock?.buyerName,
          originalQuantity: stock?.quantity,
          pricePerKg: stock?.price,
          totalAmount: (stock?.quantity || 0) * (stock?.price || 0),
          paddyType: stock?.paddyType,
          purchaseId: stock?.purchaseId,
          paymentId: stock?.paymentId
        },
        
        // Include batch information
        batchDocument: batchDocument,
        batchNumber: batchNumber,
        
        // Add metadata
        conversionTimestamp: new Date().toISOString()
      };

      console.log('📊 Prepared data for PriceCalculation:', submissionData);

      // 💾 Store the data FIRST (this is critical!)
      setSubmittedConversionData(submissionData);
      console.log('✅ Data stored in state');
      
      // 📤 Call parent onSubmit (optional - for additional processing)
      if (onSubmit) {
        console.log('📤 Calling parent onSubmit function');
        try {
          await onSubmit(submissionData);
          console.log('✅ Parent onSubmit completed');
        } catch (error) {
          console.error('❌ Parent onSubmit failed (but continuing):', error);
          // Don't stop the flow even if parent fails
        }
      }
      
      // 🧮 Show price calculation (this triggers the switch to PriceCalculation component)
      console.log('🧮 Setting showPriceCalculation to true');
      setShowPriceCalculation(true);
      console.log('✅ Price calculation should now be visible');
      
      toast.success(`Batch ${batchNumber} processed and centralized stock totals updated successfully!`);
      
    } catch (error) {
      console.error('❌ Error in handleSubmit:', error);
      toast.error('Failed to process conversion. Please try again.');
      setErrors({ general: 'Failed to submit conversion. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle back from price calculation
  const handleBackFromPriceCalculation = () => {
    console.log('⬅️ Back button clicked from PriceCalculation');
    setShowPriceCalculation(false);
    setSubmittedConversionData(null);
    // Don't close the entire modal, just go back to conversion form
  };

  // Handle close from price calculation
  const handleCloseFromPriceCalculation = () => {
    console.log('❌ Close button clicked from PriceCalculation');
    setShowPriceCalculation(false);
    setSubmittedConversionData(null);
    onClose(); // Close the entire modal
  };

  // Handle direct close (skip price calculation)
  const handleDirectClose = () => {
    console.log('❌ Cancel button clicked');
    setShowPriceCalculation(false);
    setSubmittedConversionData(null);
    onClose();
  };

  if (!isOpen) return null;

  const totalConverted = getTotalConverted();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* 🎯 CRITICAL: Conditional content - NO nested modals! */}
        {showPriceCalculation && submittedConversionData ? (
          // Show PriceCalculation INSIDE the same modal
          <PriceCalculation 
            conversionData={submittedConversionData}
            onClose={handleCloseFromPriceCalculation}  // Close entire modal
            onBack={handleBackFromPriceCalculation}    // Go back to form
          />
        ) : (
          // Show conversion form
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Convert Paddy to Products
              </h2>
              <button
                onClick={handleDirectClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Enhanced Batch Info Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
              <h3 className="text-lg font-medium text-purple-900 mb-2">
                🏷️ Centralized Stock Management System
              </h3>
              <div className="text-sm text-purple-700 space-y-1">
                <p>✅ Creates batch tracking for full traceability</p>
                <p>✅ Updates centralized stock totals for easy inventory management</p>
                <p>✅ Maintains running totals for rice, hunu sahal, kadunu sahal, rice polish, dahaiyya, and flour</p>
                <p>✅ Updates buyer purchase records with processing details</p>
              </div>
            </div>

            {/* Stock Path Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <h3 className="text-lg font-medium text-blue-900 mb-2">
                📁 Stock Storage Structure
              </h3>
              <div className="text-xs text-blue-700 space-y-1 font-mono">
                <p>Centralized Totals: /stock/stockTotals (document)</p>
                <p>Batch Records: /stock/processedStock/stock/</p>
                <p>Summary Data: /stock/processedStock (document)</p>
                <p>Buyer Updates: /buyers/[buyerId]/purchases/[purchaseId]</p>
              </div>
            </div>

            {/* Original Stock Information */}
            {stock && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Original Stock Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Stock ID:</span>
                    <span className="ml-2 text-gray-600">{stock.id}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Buyer:</span>
                    <span className="ml-2 text-gray-600">{stock.buyerName}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Paddy Type:</span>
                    <span className="ml-2 text-gray-600">{stock.paddyType}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Original Quantity:</span>
                    <span className="ml-2 text-gray-600">{stock.quantity} kg</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Price per kg:</span>
                    <span className="ml-2 text-gray-600">Rs. {stock.price}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Total Amount:</span>
                    <span className="ml-2 text-gray-600">Rs. {((stock.quantity || 0) * (stock.price || 0)).toLocaleString('en-IN')}</span>
                  </div>
                  {stock.purchaseId && (
                    <div>
                      <span className="font-medium text-gray-700">Purchase ID:</span>
                      <span className="ml-2 text-gray-600">{stock.purchaseId}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Electricity Board Numbers Section */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Electricity Board Numbers
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Electricity Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Electricity Board Number *
                  </label>
                  <input
                    type="text"
                    name="startElectricityNumber"
                    value={convertedData.startElectricityNumber}
                    onChange={handleInputChange}
                    placeholder="Enter start number"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.startElectricityNumber ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.startElectricityNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.startElectricityNumber}</p>
                  )}
                </div>

                {/* End Electricity Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Electricity Board Number *
                  </label>
                  <input
                    type="text"
                    name="endElectricityNumber"
                    value={convertedData.endElectricityNumber}
                    onChange={handleInputChange}
                    placeholder="Enter end number"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.endElectricityNumber ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.endElectricityNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.endElectricityNumber}</p>
                  )}
                </div>
              </div>

              {/* Power Consumption Calculation */}
              {convertedData.startElectricityNumber && convertedData.endElectricityNumber && (
                <div className="mt-4 p-3 bg-white rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Power Consumption:
                    </span>
                    <span className="text-sm font-semibold text-blue-600">
                      {(() => {
                        const start = parseFloat(convertedData.startElectricityNumber);
                        const end = parseFloat(convertedData.endElectricityNumber);
                        if (!isNaN(start) && !isNaN(end) && end > start) {
                          return `${(end - start).toFixed(2)} kWh`;
                        }
                        return 'Invalid range';
                      })()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Product Conversion Section */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Converted Products (kg)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Rice */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rice (kg) - Main Product
                  </label>
                  <input
                    type="number"
                    name="rice"
                    value={convertedData.rice}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Hunu Sahal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hunu Sahal (kg) - Byproduct
                  </label>
                  <input
                    type="number"
                    name="hunuSahal"
                    value={convertedData.hunuSahal}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Kadunu Sahal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kadunu Sahal (kg) - Byproduct
                  </label>
                  <input
                    type="number"
                    name="kadunuSahal"
                    value={convertedData.kadunuSahal}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Rice Polish */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rice Polish (kg) - Byproduct
                  </label>
                  <input
                    type="number"
                    name="ricePolish"
                    value={convertedData.ricePolish}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Dahaiyya */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dahaiyya (kg) - Byproduct
                  </label>
                  <input
                    type="number"
                    name="dahaiyya"
                    value={convertedData.dahaiyya}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Flour */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Flour (kg) - Main Product
                  </label>
                  <input
                    type="number"
                    name="flour"
                    value={convertedData.flour}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Total Converted Display */}
              <div className="mt-4 p-3 bg-white rounded-lg border">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Total Converted:
                  </span>
                  <span className="text-sm font-semibold text-green-600">
                    {totalConverted.toFixed(2)} kg
                  </span>
                </div>
                {stock && (
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-green-200">
                    <span className="text-sm font-medium text-gray-700">
                      Processing from:
                    </span>
                    <span className="text-sm font-semibold text-blue-600">
                      {stock.quantity} kg {stock.paddyType}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Error Display */}
            {errors.general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleDirectClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Processing & Updating Totals...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 002 2z" />
                    </svg>
                    Process Batch & Calculate Price
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConvertToOtherModal;