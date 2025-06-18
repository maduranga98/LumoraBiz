import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import {
  collection,
  query,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { useBusiness } from "../../contexts/BusinessContext";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";
import Modal from "../../components/Modal";
import { BuyerPayment } from "./BuyerPayment";

export const AddingPaddyStock = () => {
  const { currentBusiness } = useBusiness();
  const { currentUser } = useAuth();

  // States
  const [buyers, setBuyers] = useState([]);
  const [paddyTypes, setPaddyTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPaddyTypes, setLoadingPaddyTypes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    buyerId: "",
    buyerName: "",
    paddyTypeId: "",
    paddyTypeName: "",
    paddyCode: "",
    quantity: "",
    price: "",
    notes: "",
  });

  // Add new paddy type modal states
  const [isAddPaddyTypeModalOpen, setIsAddPaddyTypeModalOpen] = useState(false);
  const [newPaddyTypeData, setNewPaddyTypeData] = useState({
    name: "",
    generatedCode: "",
  });
  const [addingPaddyType, setAddingPaddyType] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  // Payment modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [savedStockData, setSavedStockData] = useState(null);

  // Fetch buyers and paddy types when component mounts
  useEffect(() => {
    if (currentUser && currentBusiness?.id) {
      fetchBuyers();
      fetchPaddyTypes();
    } else {
      setLoading(false);
    }
  }, [currentUser, currentBusiness]);

  // Fetch buyers from Firestore
  const fetchBuyers = async () => {
    if (!currentUser || !currentBusiness?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const buyersCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/buyers`;
      const buyersQuery = query(collection(db, buyersCollectionPath));
      const querySnapshot = await getDocs(buyersQuery);
      const buyersList = [];

      querySnapshot.forEach((doc) => {
        buyersList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setBuyers(buyersList);
    } catch (error) {
      console.error("Error fetching buyers:", error);
      if (error.code === 'permission-denied') {
        toast.error("Permission denied. Check your Firestore rules.");
      } else if (error.code === 'not-found') {
        toast.error("Buyers collection not found.");
      } else {
        toast.error("Failed to load buyers data");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch paddy types from Firestore
  const fetchPaddyTypes = async () => {
    if (!currentUser || !currentBusiness?.id) {
      return;
    }

    setLoadingPaddyTypes(true);
    try {
      const paddyTypesCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/productsTypes`;
      const paddyTypesQuery = query(collection(db, paddyTypesCollectionPath));
      const querySnapshot = await getDocs(paddyTypesQuery);
      const paddyTypesList = [];

      querySnapshot.forEach((doc) => {
        paddyTypesList.push({
          id: doc.id,
          code: doc.id,
          ...doc.data(),
        });
      });

      setPaddyTypes(paddyTypesList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Error fetching paddy types:", error);
      if (error.code === 'permission-denied') {
        toast.error("Permission denied accessing paddy types.");
      } else {
        toast.error("Failed to load paddy types");
      }
    } finally {
      setLoadingPaddyTypes(false);
    }
  };

  // Handle input changes with validation
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Add validation for numerical fields
    if (name === "quantity" || name === "price") {
      if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    }

    // If selecting a buyer, update both buyerId and buyerName
    if (name === "buyerId") {
      const selectedBuyer = buyers.find((buyer) => buyer.id === value);
      setFormData((prev) => ({
        ...prev,
        buyerId: value,
        buyerName: selectedBuyer ? selectedBuyer.name : "",
      }));
    } else if (name === "paddyTypeId") {
      // If selecting a paddy type, update related fields
      const selectedPaddyType = paddyTypes.find((type) => type.id === value);
      setFormData((prev) => ({
        ...prev,
        paddyTypeId: value,
        paddyTypeName: selectedPaddyType ? selectedPaddyType.name : "",
        paddyCode: selectedPaddyType ? selectedPaddyType.code : "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Check if code exists in database
  const checkCodeExistsInDB = async (code) => {
    if (!code || !currentUser || !currentBusiness?.id) return false;
    
    try {
      const paddyTypeDocPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/productsTypes/${code}`;
      const docRef = doc(db, paddyTypeDocPath);
      const docSnap = await getDoc(docRef);
      
      return docSnap.exists();
    } catch (error) {
      console.error("Error checking code existence:", error);
      return false;
    }
  };

  // Generate meaningful paddy code from name
  const generatePaddyCode = (name) => {
    if (!name || !name.trim()) return "";
    
    const cleanName = name.trim().toLowerCase();
    let code = "";
    
    // Split by spaces and take first letters
    const words = cleanName.split(/\s+/);
    
    if (words.length === 1) {
      // Single word - take first 2-3 letters based on length
      const word = words[0];
      if (word.length <= 3) {
        code = word.toUpperCase();
      } else if (word.length <= 6) {
        code = word.substring(0, 2).toUpperCase();
      } else {
        code = word.substring(0, 3).toUpperCase();
      }
    } else if (words.length === 2) {
      // Two words - take first letter of each
      code = (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    } else {
      // Multiple words - take first letter of each up to 3 letters
      code = words.slice(0, 3).map(word => word.charAt(0)).join("").toUpperCase();
    }
    
    return code;
  };

  // Check if code already exists and generate unique one
  const generateUniqueCode = async (baseName) => {
    const baseCode = generatePaddyCode(baseName);
    if (!baseCode) return "";
    
    // First check local state for quick validation
    const localExistingCodes = paddyTypes.map(type => type.code);
    
    // Then check database for the base code
    const baseCodeExistsInDB = await checkCodeExistsInDB(baseCode);
    
    if (!localExistingCodes.includes(baseCode) && !baseCodeExistsInDB) {
      return baseCode;
    }
    
    // If base code exists, try with numbers
    for (let i = 1; i <= 99; i++) {
      const numberedCode = `${baseCode}${i}`;
      const numberedCodeExistsInDB = await checkCodeExistsInDB(numberedCode);
      
      if (!localExistingCodes.includes(numberedCode) && !numberedCodeExistsInDB) {
        return numberedCode;
      }
    }
    
    // If all numbered codes are taken, use timestamp
    const timestampCode = `${baseCode}${Date.now().toString().slice(-3)}`;
    const timestampCodeExistsInDB = await checkCodeExistsInDB(timestampCode);
    
    if (!timestampCodeExistsInDB) {
      return timestampCode;
    }
    
    // Final fallback - use full timestamp
    return `${baseCode}${Date.now()}`;
  };

  // Handle new paddy type form changes
  const handleNewPaddyTypeChange = async (e) => {
    const { name, value } = e.target;
    
    if (name === "name") {
      setGeneratingCode(true);
      
      // Generate code when name changes
      try {
        const generatedCode = await generateUniqueCode(value);
        setNewPaddyTypeData((prev) => ({
          ...prev,
          [name]: value,
          generatedCode: generatedCode,
        }));
      } catch (error) {
        console.error("Error generating code:", error);
        setNewPaddyTypeData((prev) => ({
          ...prev,
          [name]: value,
          generatedCode: "",
        }));
      } finally {
        setGeneratingCode(false);
      }
    } else {
      setNewPaddyTypeData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Add new paddy type
  const handleAddPaddyType = async (e) => {
    e.preventDefault();

    if (!newPaddyTypeData.name || !newPaddyTypeData.generatedCode) {
      toast.error("Please enter a paddy name");
      return;
    }

    if (!currentUser || !currentBusiness?.id) {
      toast.error("Authentication error");
      return;
    }

    setAddingPaddyType(true);

    try {
      // Final check for code uniqueness before saving
      const finalCode = await generateUniqueCode(newPaddyTypeData.name);
      
      if (!finalCode) {
        toast.error("Unable to generate a unique code. Please try a different name.");
        return;
      }

      // Double-check that the final code doesn't exist in database
      const codeExists = await checkCodeExistsInDB(finalCode);
      if (codeExists) {
        toast.error("Generated code already exists. Please try again or use a different name.");
        return;
      }
      
      const paddyTypeData = {
        name: newPaddyTypeData.name.trim(),
        businessId: currentBusiness.id,
        ownerId: currentUser.uid,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Use the generated code as document ID
      const paddyTypeDocPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/productsTypes/${finalCode}`;
      await setDoc(doc(db, paddyTypeDocPath), paddyTypeData);

      toast.success(`Paddy type added successfully! Code: ${finalCode}`);
      
      // Reset form and close modal
      setNewPaddyTypeData({ name: "", generatedCode: "" });
      setGeneratingCode(false);
      setIsAddPaddyTypeModalOpen(false);
      
      // Refresh paddy types list
      await fetchPaddyTypes();
    } catch (error) {
      console.error("Error adding paddy type:", error);
      if (error.code === 'permission-denied') {
        toast.error("Permission denied. Check your Firestore rules.");
      } else if (error.code === 'already-exists') {
        toast.error("A paddy type with this code already exists. Please try again.");
      } else {
        toast.error("Failed to add paddy type. Please try again.");
      }
    } finally {
      setAddingPaddyType(false);
    }
  };

  // Reset form data
  const resetForm = () => {
    setFormData({
      buyerId: "",
      buyerName: "",
      paddyTypeId: "",
      paddyTypeName: "",
      paddyCode: "",
      quantity: "",
      price: "",
      notes: "",
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.buyerId) {
      toast.error("Please select a buyer");
      return;
    }

    if (!formData.paddyTypeId) {
      toast.error("Please select a paddy type");
      return;
    }

    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    if (!currentUser) {
      toast.error("Authentication error. Please sign in again.");
      return;
    }

    if (!currentBusiness?.id) {
      toast.error("No business selected");
      return;
    }

    setSubmitting(true);

    try {
      const totalAmount = parseFloat(formData.quantity) * parseFloat(formData.price);

      // First, create purchase record in buyer's subcollection
      const purchaseData = {
        buyerId: formData.buyerId,
        buyerName: formData.buyerName,
        paddyTypeId: formData.paddyTypeId,
        paddyTypeName: formData.paddyTypeName,
        paddyCode: formData.paddyCode,
        quantity: parseFloat(formData.quantity),
        price: parseFloat(formData.price),
        totalAmount: totalAmount,
        notes: formData.notes || null,
        businessId: currentBusiness.id,
        ownerId: currentUser.uid,
        purchaseType: "paddy_stock",
        status: "completed",
        paymentId: null,
        stockId: null,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add purchase to buyer's purchases subcollection
      const purchaseCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/buyers/${formData.buyerId}/purchases`;
      const purchaseDocRef = await addDoc(collection(db, purchaseCollectionPath), purchaseData);
      const purchaseId = purchaseDocRef.id;

      // Then, create stock record with purchaseId reference
      const stockData = {
        buyerId: formData.buyerId,
        buyerName: formData.buyerName,
        paddyTypeId: formData.paddyTypeId,
        paddyTypeName: formData.paddyTypeName,
        paddyCode: formData.paddyCode,
        quantity: parseFloat(formData.quantity),
        price: parseFloat(formData.price),
        totalAmount: totalAmount,
        notes: formData.notes || null,
        businessId: currentBusiness.id,
        ownerId: currentUser.uid,
        stockType: "raw",
        status: "available",
        purchaseId: purchaseId,
        paymentId: null,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Use the correct collection path for stock
      const stockCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/rawProcessedStock/stock`;
      const stockDocRef = await addDoc(collection(db, stockCollectionPath), stockData);
      const stockId = stockDocRef.id;

      // Update purchase record with stockId
      const purchaseDocPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/buyers/${formData.buyerId}/purchases/${purchaseId}`;
      await updateDoc(doc(db, purchaseDocPath), {
        stockId: stockId,
        updatedAt: serverTimestamp(),
      });

      toast.success("Paddy stock and purchase record added successfully");

      // Save stock data and open payment modal
      setSavedStockData({
        buyerId: formData.buyerId,
        buyerName: formData.buyerName,
        totalAmount: totalAmount,
        stockData: stockData,
        stockId: stockId,
        purchaseId: purchaseId,
      });
      setIsPaymentModalOpen(true);
    } catch (error) {
      console.error("Error adding paddy stock:", error);
      if (error.code === 'permission-denied') {
        toast.error("Permission denied. Check your Firestore rules.");
      } else {
        toast.error("Failed to add paddy stock. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle payment completion
  const handlePaymentComplete = async (paymentData) => {
    try {
      const paymentsCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/payments`;
      
      const paymentRecord = {
        ...paymentData,
        type: "stock_purchase",
        stockReference: savedStockData?.stockData,
        stockId: savedStockData?.stockId,
        purchaseId: savedStockData?.purchaseId,
        businessId: currentBusiness.id,
        ownerId: currentUser.uid,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
      };

      const paymentDocRef = await addDoc(collection(db, paymentsCollectionPath), paymentRecord);
      const paymentId = paymentDocRef.id;

      // Update stock record with paymentId
      const stockDocPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/rawProcessedStock/stock/${savedStockData.stockId}`;
      await updateDoc(doc(db, stockDocPath), {
        paymentId: paymentId,
        updatedAt: serverTimestamp(),
      });

      // Update purchase record with paymentId
      const purchaseDocPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/buyers/${savedStockData.buyerId}/purchases/${savedStockData.purchaseId}`;
      await updateDoc(doc(db, purchaseDocPath), {
        paymentId: paymentId,
        updatedAt: serverTimestamp(),
      });

      toast.success("Payment recorded and linked successfully!");
      setIsPaymentModalOpen(false);
      resetForm();
      setSavedStockData(null);
    } catch (error) {
      console.error("Error saving payment:", error);
      toast.error("Failed to record payment. Please try again.");
    }
  };

  // Handle payment modal close
  const handlePaymentModalClose = () => {
    setIsPaymentModalOpen(false);
    resetForm();
    setSavedStockData(null);
  };

  // Skip payment and just close
  const handleSkipPayment = () => {
    setIsPaymentModalOpen(false);
    resetForm();
    setSavedStockData(null);
    toast.success("Stock entry completed. Payment can be recorded later.");
  };

  // Check if user is authenticated and has business selected
  if (!currentUser) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg max-w-md">
          <p className="text-yellow-800 text-sm">
            Please log in to add paddy stock.
          </p>
        </div>
      </div>
    );
  }

  if (!currentBusiness?.id) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg max-w-md">
          <p className="text-yellow-800 text-sm">
            Please select a business to add paddy stock.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      ) : buyers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
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
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">
              No buyers found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              You need to add buyers before recording paddy stock.
            </p>
            <button
              onClick={() => (window.location.href = "/buyers")}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Add Buyers
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Buyer Selection */}
              <div>
                <label
                  htmlFor="buyerId"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Buyer <span className="text-red-500">*</span>
                </label>
                <select
                  id="buyerId"
                  name="buyerId"
                  value={formData.buyerId}
                  onChange={handleChange}
                  className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  required
                >
                  <option value="">Select a Buyer</option>
                  {buyers.map((buyer) => (
                    <option key={buyer.id} value={buyer.id}>
                      {buyer.name}
                      {buyer.contactNumber && ` - ${buyer.contactNumber}`}
                      {buyer.location && ` (${buyer.location})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Paddy Type Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="paddyTypeId"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Paddy Type <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddPaddyTypeModalOpen(true)}
                    className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Type
                  </button>
                </div>
                
                {loadingPaddyTypes ? (
                  <div className="flex items-center justify-center py-3 border border-gray-300 rounded-lg">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading...</span>
                  </div>
                ) : (
                  <select
                    id="paddyTypeId"
                    name="paddyTypeId"
                    value={formData.paddyTypeId}
                    onChange={handleChange}
                    className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    required
                  >
                    <option value="">Select Paddy Type</option>
                    {paddyTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.code} - {type.name}
                      </option>
                    ))}
                  </select>
                )}
                
                {paddyTypes.length === 0 && !loadingPaddyTypes && (
                  <div className="mt-1 text-xs text-gray-500">
                    No paddy types found. Click "Add Type" to create one.
                  </div>
                )}
              </div>

              {/* Display selected paddy code */}
              {formData.paddyCode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paddy Code
                  </label>
                  <div className="py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 font-medium text-sm">
                    {formData.paddyCode}
                  </div>
                </div>
              )}

              {/* Quantity and Price Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="quantity"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Quantity (kg) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="price"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Price per kg (Rs.) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Total Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Amount (Rs.)
                </label>
                <div className="py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 font-semibold">
                  Rs. {formData.quantity && formData.price
                    ? (parseFloat(formData.quantity) * parseFloat(formData.price)).toLocaleString('en-IN', { maximumFractionDigits: 2 })
                    : "0.00"}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows="3"
                  value={formData.notes}
                  onChange={handleChange}
                  className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="Additional information..."
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    "Save Stock Entry"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Paddy Type Modal */}
      <Modal
        isOpen={isAddPaddyTypeModalOpen}
        onClose={() => {
          setIsAddPaddyTypeModalOpen(false);
          setNewPaddyTypeData({ name: "", generatedCode: "" });
          setGeneratingCode(false);
        }}
        title="Add New Paddy Type"
        size="md"
      >
        <form onSubmit={handleAddPaddyType} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Paddy Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={newPaddyTypeData.name}
              onChange={handleNewPaddyTypeChange}
              className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              placeholder="e.g., Kiri Samba, Basmathi"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Code will be auto-generated (e.g., "Kiri Samba" → "KS")
            </p>
          </div>

          {/* Auto-generated Code Display */}
          {(newPaddyTypeData.generatedCode || generatingCode) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Generated Code
              </label>
              {generatingCode ? (
                <div className="py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-600 mr-2"></div>
                  <span className="text-gray-600 text-sm">Checking availability...</span>
                </div>
              ) : (
                <div className="py-2 px-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-800 font-medium text-sm">
                  {newPaddyTypeData.generatedCode}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsAddPaddyTypeModalOpen(false);
                setNewPaddyTypeData({ name: "", generatedCode: "" });
                setGeneratingCode(false);
              }}
              disabled={addingPaddyType}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addingPaddyType || generatingCode || !newPaddyTypeData.generatedCode}
              className="px-6 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {addingPaddyType ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Adding...
                </>
              ) : generatingCode ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                "Add Paddy Type"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={handlePaymentModalClose}
        title="Record Payment"
        size="xl"
      >
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">
              Stock Entry Completed Successfully!
            </h4>
            <p className="text-green-700 text-sm">
              Would you like to record the payment for this purchase now?
            </p>
          </div>

          {savedStockData && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-2">Purchase Summary:</h5>
              <div className="text-sm text-gray-700 space-y-1">
                <p><span className="font-medium">Buyer:</span> {savedStockData.buyerName}</p>
                <p><span className="font-medium">Total Amount:</span> Rs. {savedStockData.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                <p><span className="font-medium">Stock ID:</span> {savedStockData.stockId}</p>
                <p><span className="font-medium">Purchase ID:</span> {savedStockData.purchaseId}</p>
              </div>
            </div>
          )}

          {savedStockData && (
            <BuyerPayment
              buyerId={savedStockData.buyerId}
              buyerName={savedStockData.buyerName}
              totalAmount={savedStockData.totalAmount}
              onPaymentComplete={handlePaymentComplete}
              onCancel={handleSkipPayment}
              stockId={savedStockData.stockId}
              purchaseId={savedStockData.purchaseId}
            />
          )}

          <div className="flex justify-center pt-4">
            <button
              onClick={handleSkipPayment}
              className="text-gray-500 hover:text-gray-700 text-sm underline"
            >
              Skip payment for now
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AddingPaddyStock;