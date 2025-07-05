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
import { BuyerPayment } from "./BuyerPayment";
import {
  Plus,
  User,
  Package,
  DollarSign,
  FileText,
  AlertCircle,
  Users,
  Check,
  X,
  RefreshCw,
} from "lucide-react";

// Custom Glass Modal Component
const GlassModal = ({ isOpen, onClose, title, children, size = "md" }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-full mx-4",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`relative w-full ${sizeClasses[size]} transform transition-all`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glass effect modal */}
          <div className="relative bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl overflow-hidden">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 backdrop-blur-sm border-b border-white/20 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="relative">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AddingPaddyStock = () => {
  const { currentBusiness } = useBusiness();
  const { currentUser } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

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
      if (error.code === "permission-denied") {
        toast.error("Permission denied. Check your Firestore rules.");
      } else if (error.code === "not-found") {
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

      setPaddyTypes(
        paddyTypesList.sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (error) {
      console.error("Error fetching paddy types:", error);
      if (error.code === "permission-denied") {
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
      code = words
        .slice(0, 3)
        .map((word) => word.charAt(0))
        .join("")
        .toUpperCase();
    }

    return code;
  };

  // Check if code already exists and generate unique one
  const generateUniqueCode = async (baseName) => {
    const baseCode = generatePaddyCode(baseName);
    if (!baseCode) return "";

    // First check local state for quick validation
    const localExistingCodes = paddyTypes.map((type) => type.code);

    // Then check database for the base code
    const baseCodeExistsInDB = await checkCodeExistsInDB(baseCode);

    if (!localExistingCodes.includes(baseCode) && !baseCodeExistsInDB) {
      return baseCode;
    }

    // If base code exists, try with numbers
    for (let i = 1; i <= 99; i++) {
      const numberedCode = `${baseCode}${i}`;
      const numberedCodeExistsInDB = await checkCodeExistsInDB(numberedCode);

      if (
        !localExistingCodes.includes(numberedCode) &&
        !numberedCodeExistsInDB
      ) {
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
        toast.error(
          "Unable to generate a unique code. Please try a different name."
        );
        return;
      }

      // Double-check that the final code doesn't exist in database
      const codeExists = await checkCodeExistsInDB(finalCode);
      if (codeExists) {
        toast.error(
          "Generated code already exists. Please try again or use a different name."
        );
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
      if (error.code === "permission-denied") {
        toast.error("Permission denied. Check your Firestore rules.");
      } else if (error.code === "already-exists") {
        toast.error(
          "A paddy type with this code already exists. Please try again."
        );
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
      const totalAmount =
        parseFloat(formData.quantity) * parseFloat(formData.price);

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
      const purchaseDocRef = await addDoc(
        collection(db, purchaseCollectionPath),
        purchaseData
      );
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
      const stockDocRef = await addDoc(
        collection(db, stockCollectionPath),
        stockData
      );
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
      if (error.code === "permission-denied") {
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

      const paymentDocRef = await addDoc(
        collection(db, paymentsCollectionPath),
        paymentRecord
      );
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

  // Input field component for responsive design
  const InputField = ({
    label,
    name,
    type = "text",
    placeholder,
    required = false,
    icon: Icon,
    children,
  }) => (
    <div className="space-y-1 sm:space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          </div>
        )}
        {children || (
          <input
            type={type}
            id={name}
            name={name}
            value={formData[name] || ""}
            onChange={handleChange}
            className={`block w-full ${
              Icon ? "pl-10" : "pl-3"
            } pr-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all duration-200`}
            placeholder={placeholder}
            required={required}
          />
        )}
      </div>
    </div>
  );

  // Check if user is authenticated and has business selected
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="bg-yellow-50 border border-yellow-200 p-4 sm:p-6 rounded-lg max-w-md w-full">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <p className="text-yellow-800 text-sm sm:text-base">
              Please log in to add paddy stock.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentBusiness?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="bg-yellow-50 border border-yellow-200 p-4 sm:p-6 rounded-lg max-w-md w-full">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <p className="text-yellow-800 text-sm sm:text-base">
              Please select a business to add paddy stock.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-32 sm:pb-20 lg:pb-16">
      {loading ? (
        <div className="flex items-center justify-center py-12 sm:py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-sm sm:text-base text-gray-600">
              Loading data...
            </p>
          </div>
        </div>
      ) : buyers.length === 0 ? (
        <div className="flex items-center justify-center py-12 sm:py-20 px-4">
          <div className="text-center max-w-md w-full">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm p-6 sm:p-8 border border-white/20">
              <Users className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mb-4" />
              <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">
                No buyers found
              </h3>
              <p className="text-sm sm:text-base text-gray-500 mb-6">
                You need to add buyers before recording paddy stock.
              </p>
              <button
                onClick={() => (window.location.href = "/buyers")}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 sm:px-6 sm:py-3 border border-transparent shadow-sm text-sm sm:text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Add Buyers
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-4 sm:p-6 lg:p-8 mb-8">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* Buyer Selection */}
                <InputField label="Buyer" name="buyerId" required icon={User}>
                  <select
                    id="buyerId"
                    name="buyerId"
                    value={formData.buyerId}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all duration-200"
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
                </InputField>

                {/* Paddy Type Selection */}
                <div className="space-y-1 sm:space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <label className="block text-sm font-medium text-gray-700">
                      Paddy Type <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddPaddyTypeModalOpen(true)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs sm:text-sm font-medium rounded-lg text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 self-start sm:self-auto"
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      Add Type
                    </button>
                  </div>

                  {loadingPaddyTypes ? (
                    <div className="flex items-center justify-center py-3 border border-gray-300 rounded-lg">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-600"></div>
                      <span className="ml-2 text-sm text-gray-600">
                        Loading...
                      </span>
                    </div>
                  ) : (
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                      <select
                        id="paddyTypeId"
                        name="paddyTypeId"
                        value={formData.paddyTypeId}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base transition-all duration-200"
                        required
                      >
                        <option value="">Select Paddy Type</option>
                        {paddyTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.code} - {type.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {paddyTypes.length === 0 && !loadingPaddyTypes && (
                    <div className="text-xs sm:text-sm text-gray-500">
                      No paddy types found. Click "Add Type" to create one.
                    </div>
                  )}
                </div>

                {/* Display selected paddy code */}
                {formData.paddyCode && (
                  <div className="space-y-1 sm:space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Paddy Code
                    </label>
                    <div className="py-2 sm:py-3 px-3 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg text-gray-800 font-medium text-sm sm:text-base">
                      {formData.paddyCode}
                    </div>
                  </div>
                )}

                {/* Quantity and Price Grid - Responsive */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <InputField
                    label="Quantity (kg)"
                    name="quantity"
                    placeholder="0.00"
                    required
                    icon={Package}
                  />
                  <InputField
                    label="Price per kg (Rs.)"
                    name="price"
                    placeholder="0.00"
                    required
                    icon={DollarSign}
                  />
                </div>

                {/* Total Amount - Responsive Display */}
                <div className="space-y-1 sm:space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Total Amount (Rs.)
                  </label>
                  <div className="py-3 sm:py-4 px-3 sm:px-4 bg-gradient-to-r from-green-50 to-blue-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                        Rs.{" "}
                        {formData.quantity && formData.price
                          ? (
                              parseFloat(formData.quantity) *
                              parseFloat(formData.price)
                            ).toLocaleString("en-IN", {
                              maximumFractionDigits: 2,
                            })
                          : "0.00"}
                      </span>
                      {formData.quantity && formData.price && (
                        <Check className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    {formData.quantity && formData.price && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {formData.quantity} kg × Rs. {formData.price}/kg
                      </p>
                    )}
                  </div>
                </div>

                {/* Notes - Mobile Optimized */}
                <div className="space-y-1 sm:space-y-2">
                  <label
                    htmlFor="notes"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Notes
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <textarea
                      id="notes"
                      name="notes"
                      rows={isMobile ? "3" : "4"}
                      value={formData.notes}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base resize-none transition-all duration-200"
                      placeholder="Additional information..."
                    />
                  </div>
                </div>

                {/* Action Buttons - Enhanced Visibility for All Screens */}
                <div className="sticky bottom-0 bg-white/90 backdrop-blur-sm pt-6 pb-6 sm:pt-8 sm:pb-8 lg:pt-10 lg:pb-10 sm:static border-t sm:border-t-0 -mx-4 sm:mx-0 px-4 sm:px-0 mt-8 z-10 shadow-lg sm:shadow-none">
                  <div className="flex flex-col sm:flex-row justify-end space-y-4 sm:space-y-0 sm:space-x-4 lg:space-x-6">
                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={submitting}
                      className="w-full sm:w-auto min-w-[120px] lg:min-w-[140px] px-6 py-3 lg:px-8 lg:py-4 border border-gray-300 rounded-lg text-sm sm:text-base lg:text-lg font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-200"
                    >
                      <RefreshCw className="h-4 w-4 lg:h-5 lg:w-5 mr-2 inline" />
                      Reset
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto min-w-[160px] lg:min-w-[200px] px-8 py-3 lg:px-10 lg:py-4 border border-transparent rounded-lg text-sm sm:text-base lg:text-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 lg:h-6 lg:w-6 border-t-2 border-b-2 border-white mr-3"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-5 w-5 lg:h-6 lg:w-6 mr-3" />
                          <span>Save Stock Entry</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Paddy Type Modal - Glass Effect */}
      <GlassModal
        isOpen={isAddPaddyTypeModalOpen}
        onClose={() => {
          setIsAddPaddyTypeModalOpen(false);
          setNewPaddyTypeData({ name: "", generatedCode: "" });
          setGeneratingCode(false);
        }}
        title="Add New Paddy Type"
        size={isMobile ? "full" : "md"}
      >
        <div className="p-6">
          <form onSubmit={handleAddPaddyType} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="paddyName"
                className="block text-sm font-medium text-gray-700"
              >
                Paddy Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="paddyName"
                  name="name"
                  value={newPaddyTypeData.name}
                  onChange={handleNewPaddyTypeChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base transition-all duration-200"
                  placeholder="e.g., Kiri Samba, Basmathi"
                  required
                />
              </div>
              <p className="text-sm text-gray-500">
                Code will be auto-generated (e.g., "Kiri Samba" → "KS")
              </p>
            </div>

            {/* Auto-generated Code Display */}
            {(newPaddyTypeData.generatedCode || generatingCode) && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Generated Code
                </label>
                {generatingCode ? (
                  <div className="py-3 px-4 bg-gray-50/80 backdrop-blur-sm border border-gray-200 rounded-lg flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-600 mr-3"></div>
                    <span className="text-gray-600">
                      Checking availability...
                    </span>
                  </div>
                ) : (
                  <div className="py-3 px-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg">
                    <span className="text-indigo-800 font-semibold text-lg">
                      {newPaddyTypeData.generatedCode}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsAddPaddyTypeModalOpen(false);
                  setNewPaddyTypeData({ name: "", generatedCode: "" });
                  setGeneratingCode(false);
                }}
                disabled={addingPaddyType}
                className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-200"
              >
                <X className="h-5 w-5 mr-2 inline" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  addingPaddyType ||
                  generatingCode ||
                  !newPaddyTypeData.generatedCode
                }
                className="w-full sm:w-auto px-8 py-3 border border-transparent rounded-lg text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {addingPaddyType ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : generatingCode ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    Add Paddy Type
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </GlassModal>

      {/* Payment Modal - Glass Effect */}
      <GlassModal
        isOpen={isPaymentModalOpen}
        onClose={handlePaymentModalClose}
        title="Record Payment"
        size={isMobile ? "full" : "xl"}
      >
        <div className="p-6 space-y-6">
          {/* Success Message */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-6 rounded-lg">
            <div className="flex items-start">
              <Check className="h-6 w-6 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-green-900 text-base mb-2">
                  Stock Entry Completed Successfully!
                </h4>
                <p className="text-green-700 text-sm">
                  Would you like to record the payment for this purchase now?
                </p>
              </div>
            </div>
          </div>

          {/* Purchase Summary */}
          {savedStockData && (
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-lg border border-gray-200">
              <h5 className="font-semibold text-gray-900 text-base mb-4">
                Purchase Summary:
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Buyer:</span>{" "}
                    {savedStockData.buyerName}
                  </p>
                  <p>
                    <span className="font-medium">Total Amount:</span> Rs.{" "}
                    {savedStockData.totalAmount.toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Stock ID:</span>{" "}
                    <span className="font-mono text-xs">
                      {savedStockData.stockId}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">Purchase ID:</span>{" "}
                    <span className="font-mono text-xs">
                      {savedStockData.purchaseId}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Component */}
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

          {/* Skip Payment Option */}
          <div className="flex justify-center pt-4">
            <button
              onClick={handleSkipPayment}
              className="text-gray-500 hover:text-gray-700 text-sm underline transition-colors"
            >
              Skip payment for now
            </button>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};

export default AddingPaddyStock;
