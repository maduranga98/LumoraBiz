import React, { useState, useEffect } from 'react';
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

  // Generate batch number for reference
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

  // 🎯 UPDATED: Handle form submission - NO DATABASE OPERATIONS
  const handleSubmit = async () => {
    console.log('🔄 Calculate Price clicked');
    
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
      // Generate unique batch number for reference only
      const batchNumber = generateBatchNumber();
      console.log('🏷️ Generated batch number for reference:', batchNumber);

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

      // 📊 Prepare data for PriceCalculation component (NO DATABASE SAVING)
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
          paddyType: stock?.paddyTypeName,
          purchaseId: stock?.purchaseId,
          paymentId: stock?.paymentId
        },
        
        // Include batch information for reference
        batchNumber: batchNumber,
        
        // Add metadata
        conversionTimestamp: new Date().toISOString(),
        
        // Add electricity consumption calculation
        electricityConsumption: (() => {
          const start = parseFloat(convertedData.startElectricityNumber);
          const end = parseFloat(convertedData.endElectricityNumber);
          return (!isNaN(start) && !isNaN(end) && end > start) ? (end - start) : 0;
        })(),
        
        // Add total converted quantity
        totalConverted: getTotalConverted()
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
      
      toast.success(`Conversion data prepared successfully! Use the price calculator to analyze costs.`);
      
    } catch (error) {
      console.error('❌ Error in handleSubmit:', error);
      toast.error('Failed to prepare conversion data. Please try again.');
      setErrors({ general: 'Failed to prepare conversion data. Please try again.' });
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

            

            {/* Original Stock Information */}
            {stock && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
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
                    <span className="ml-2 text-gray-600">{stock.paddyTypeName}</span>
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
                      {stock.quantity} kg {stock.paddyTypeName}
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
                    Preparing Data...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 002 2z" />
                    </svg>
                    Calculate Price Only
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