import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import PriceCalculation from './PriceCalculation'; 

const ConvertToOtherModal = ({ isOpen, onClose, onSubmit, stock = null }) => {
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
  const [showPriceCalculation, setShowPriceCalculation] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConvertedData({
        rice: '', hunuSahal: '', kadunuSahal: '', 
        ricePolish: '', dahaiyya: '', flour: '',
        startElectricityNumber: '', endElectricityNumber: ''
      });
      setErrors({});
      setShowPriceCalculation(false);
      setSubmittedData(null);
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConvertedData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const getTotalConverted = () => {
    return ['rice', 'hunuSahal', 'kadunuSahal', 'ricePolish', 'dahaiyya', 'flour']
      .reduce((total, key) => total + (parseFloat(convertedData[key]) || 0), 0);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (getTotalConverted() === 0) {
      newErrors.general = 'Please enter at least one product quantity';
    }
    
    if (!convertedData.startElectricityNumber.trim()) {
      newErrors.startElectricityNumber = 'Start electricity number is required';
    }
    
    if (!convertedData.endElectricityNumber.trim()) {
      newErrors.endElectricityNumber = 'End electricity number is required';
    }

    const startNum = parseFloat(convertedData.startElectricityNumber);
    const endNum = parseFloat(convertedData.endElectricityNumber);
    
    if (!isNaN(startNum) && !isNaN(endNum) && startNum >= endNum) {
      newErrors.endElectricityNumber = 'End number must be greater than start number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const submissionData = {
        ...convertedData,
        originalStock: {
          stockId: stock?.id,
          buyerName: stock?.buyerName,
          originalQuantity: stock?.quantity,
          pricePerKg: stock?.price,
          totalAmount: (stock?.quantity || 0) * (stock?.price || 0),
          paddyType: stock?.paddyTypeName,
        },
        batchNumber: `BATCH_${Date.now()}`,
        electricityConsumption: (() => {
          const start = parseFloat(convertedData.startElectricityNumber);
          const end = parseFloat(convertedData.endElectricityNumber);
          return (!isNaN(start) && !isNaN(end) && end > start) ? (end - start) : 0;
        })(),
        totalConverted: getTotalConverted()
      };

      setSubmittedData(submissionData);
      if (onSubmit) await onSubmit(submissionData);
      setShowPriceCalculation(true);
      toast.success('Conversion data prepared successfully!');
      
    } catch (error) {
      toast.error('Failed to prepare conversion data');
      setErrors({ general: 'Failed to prepare conversion data' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        
        {showPriceCalculation && submittedData ? (
          <PriceCalculation 
            conversionData={submittedData}
            onClose={() => { setShowPriceCalculation(false); onClose(); }}
            onBack={() => setShowPriceCalculation(false)}
          />
        ) : (
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Convert Paddy to Products</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Stock Info */}
            {stock && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-gray-900 mb-2">Original Stock</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="font-medium">Buyer:</span> {stock.buyerName}</div>
                  <div><span className="font-medium">Type:</span> {stock.paddyTypeName}</div>
                  <div><span className="font-medium">Quantity:</span> {stock.quantity} kg</div>
                  <div><span className="font-medium">Price:</span> Rs. {stock.price}/kg</div>
                </div>
              </div>
            )}

            {/* Electricity Numbers */}
            <div className="bg-yellow-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Electricity Board Numbers</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Number *</label>
                  <input
                    type="text"
                    name="startElectricityNumber"
                    value={convertedData.startElectricityNumber}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.startElectricityNumber ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.startElectricityNumber && (
                    <p className="text-sm text-red-600 mt-1">{errors.startElectricityNumber}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Number *</label>
                  <input
                    type="text"
                    name="endElectricityNumber"
                    value={convertedData.endElectricityNumber}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.endElectricityNumber ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.endElectricityNumber && (
                    <p className="text-sm text-red-600 mt-1">{errors.endElectricityNumber}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Product Quantities */}
            <div className="bg-green-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Converted Products (kg)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { name: 'rice', label: 'Rice' },
                  { name: 'flour', label: 'Flour' },
                  { name: 'hunuSahal', label: 'Hunu Sahal' },
                  { name: 'kadunuSahal', label: 'Kadunu Sahal' },
                  { name: 'ricePolish', label: 'Rice Polish' },
                  { name: 'dahaiyya', label: 'Dahaiyya' }
                ].map(({ name, label }) => (
                  <div key={name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      type="number"
                      name={name}
                      value={convertedData[name]}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-white rounded-lg border">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Total Converted:</span>
                  <span className="font-semibold text-green-600">{getTotalConverted().toFixed(2)} kg</span>
                </div>
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
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Preparing...
                  </>
                ) : (
                  'Calculate Price'
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