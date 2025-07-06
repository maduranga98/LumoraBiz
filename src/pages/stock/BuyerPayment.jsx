import React, { useState, useEffect, useRef, Component } from "react";
import {
  Plus,
  Trash2,
  CreditCard,
  Banknote,
  FileText,
  CheckCircle,
} from "lucide-react";
import { db } from "../../services/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useBusiness } from "../../contexts/BusinessContext";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";
import PrintableBill from "../../components/stock/PrintableBill";

// Responsive Input Component
const ResponsiveInput = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  error,
  ...props
}) => (
  <div className="space-y-1 sm:space-y-2">
    {label && (
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base transition-all duration-200 ${
        error ? "border-red-500" : ""
      }`}
      {...props}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

// Responsive Select Component
const ResponsiveSelect = ({
  label,
  value,
  onChange,
  options,
  required = false,
  error,
}) => (
  <div className="space-y-1 sm:space-y-2">
    {label && (
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <select
      value={value}
      onChange={onChange}
      className={`w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base transition-all duration-200 ${
        error ? "border-red-500" : ""
      }`}
    >
      <option value="">Select {label}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Bill component error:", error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Fallback Bill Component
const FallbackBill = ({ paymentData, businessInfo, onClose }) => (
  <div className="p-6 space-y-6">
    <div className="text-center border-b pb-4">
      <h1 className="text-2xl font-bold text-gray-900">Payment Receipt</h1>
      <p className="text-gray-600">{businessInfo?.name || "Business Name"}</p>
      <p className="text-sm text-gray-500">
        Date: {new Date().toLocaleDateString()}
      </p>
    </div>

    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600">
            Payment ID
          </label>
          <p className="text-lg font-semibold">
            {paymentData?.paymentId || "N/A"}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600">
            Buyer Name
          </label>
          <p className="text-lg font-semibold">
            {paymentData?.buyerName || "N/A"}
          </p>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-3">Payment Details</h3>
        <div className="space-y-2">
          {paymentData?.methods?.map((method, index) => (
            <div key={index} className="flex justify-between">
              <span className="capitalize">{method.type}</span>
              <span>Rs. {method.amount?.toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between text-xl font-bold">
          <span>Total Amount:</span>
          <span>Rs. {paymentData?.amount?.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </div>

    <div className="flex justify-center space-x-4 pt-6">
      <button
        onClick={() => window.print()}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
      >
        Print
      </button>
      <button
        onClick={onClose}
        className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
      >
        Close
      </button>
    </div>
  </div>
);
const PaymentSuccessModal = ({
  isOpen,
  onClose,
  onGenerateBill,
  paymentData,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Payment Recorded Successfully!
          </h3>

          <p className="text-gray-600 mb-6">
            Payment of Rs. {paymentData?.amount?.toLocaleString("en-IN")} has
            been recorded for {paymentData?.buyerName}.
          </p>

          <div className="space-y-3">
            <button
              onClick={onGenerateBill}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="h-5 w-5" />
              Generate Bill
            </button>

            <button
              onClick={onClose}
              className="w-full border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Utility function to clean data for Firestore
const cleanFirestoreData = (data) => {
  const cleaned = {};

  Object.keys(data).forEach((key) => {
    const value = data[key];

    // Skip undefined values
    if (value === undefined) {
      return;
    }

    // Handle nested objects
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      value.constructor === Object
    ) {
      const cleanedNested = cleanFirestoreData(value);
      // Only include if the cleaned object has properties
      if (Object.keys(cleanedNested).length > 0) {
        cleaned[key] = cleanedNested;
      }
    } else if (Array.isArray(value)) {
      // Handle arrays - filter out undefined values
      const cleanedArray = value.filter((item) => item !== undefined);
      if (cleanedArray.length > 0) {
        cleaned[key] = cleanedArray;
      }
    } else {
      // Include all other values (including null, which is valid in Firestore)
      cleaned[key] = value;
    }
  });

  return cleaned;
};

export const BuyerPayment = ({
  buyerId,
  buyerName,
  totalAmount,
  stockId,
  stockDetails,
  purchaseId, // Add purchaseId prop
  category = "paddy_purchase",
  onPaymentComplete,
  onCancel,
}) => {
  const { currentBusiness } = useBusiness();
  const { currentUser } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const billRef = useRef();

  // Payment states
  const [payments, setPayments] = useState([
    { id: 1, type: "", amount: "", chequeDetails: {} },
  ]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(totalAmount || 0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Bill generation states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [savedPaymentData, setSavedPaymentData] = useState(null);
  const [billError, setBillError] = useState(false);

  // Debug modal states
  useEffect(() => {
    console.log("Modal states changed:", {
      showSuccessModal,
      showBill,
      hasSavedPaymentData: !!savedPaymentData,
    });
  }, [showSuccessModal, showBill, savedPaymentData]);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Buyer data with fallbacks
  const buyerData = {
    id: buyerId || "B001",
    name: buyerName || "John Doe",
    totalAmount: totalAmount || 15000,
  };

  const paymentTypes = [
    { value: "cash", label: "Cash", icon: Banknote },
    { value: "cheque", label: "Cheque", icon: FileText },
    { value: "credit", label: "Credit", icon: CreditCard },
    { value: "bank_transfer", label: "Bank Transfer", icon: CreditCard },
  ];

  useEffect(() => {
    const total = payments.reduce((sum, payment) => {
      return sum + (parseFloat(payment.amount) || 0);
    }, 0);
    setTotalPaid(total);
    setRemainingAmount((totalAmount || 0) - total);
  }, [payments, totalAmount]);

  const addPaymentMethod = () => {
    const newId = Math.max(...payments.map((p) => p.id)) + 1;
    setPayments([
      ...payments,
      {
        id: newId,
        type: "",
        amount: "",
        chequeDetails: {},
      },
    ]);
  };

  const removePaymentMethod = (id) => {
    if (payments.length > 1) {
      setPayments(payments.filter((payment) => payment.id !== id));
    }
  };

  const updatePayment = (id, field, value) => {
    setPayments(
      payments.map((payment) => {
        if (payment.id === id) {
          if (field.startsWith("cheque.")) {
            const chequeField = field.split(".")[1];
            return {
              ...payment,
              chequeDetails: {
                ...payment.chequeDetails,
                [chequeField]: value,
              },
            };
          }
          return { ...payment, [field]: value };
        }
        return payment;
      })
    );
  };

  const validateForm = () => {
    const newErrors = {};

    payments.forEach((payment, index) => {
      if (!payment.type) {
        newErrors[`payment_${payment.id}_type`] = "Payment type is required";
      }
      if (!payment.amount || parseFloat(payment.amount) <= 0) {
        newErrors[`payment_${payment.id}_amount`] = "Valid amount is required";
      }

      if (payment.type === "cheque") {
        if (!payment.chequeDetails.number) {
          newErrors[`payment_${payment.id}_cheque_number`] =
            "Cheque number is required";
        }
        if (!payment.chequeDetails.bank) {
          newErrors[`payment_${payment.id}_bank`] = "Bank name is required";
        }
        if (!payment.chequeDetails.branch) {
          newErrors[`payment_${payment.id}_branch`] = "Branch is required";
        }
        if (!payment.chequeDetails.date) {
          newErrors[`payment_${payment.id}_date`] = "Cheque date is required";
        }
      }
    });

    if (totalPaid > (totalAmount || 0)) {
      newErrors.totalAmount = "Total payment cannot exceed the due amount";
    }

    if (totalPaid === 0) {
      newErrors.totalAmount = "At least one payment method must have an amount";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!currentUser || !currentBusiness?.id) {
      toast.error("Authentication error. Please sign in again.");
      return;
    }

    if (!buyerId) {
      toast.error("Buyer ID is required");
      return;
    }

    setSubmitting(true);

    try {
      // Prepare payment methods data
      const paymentMethods = payments
        .filter((p) => p.type && p.amount)
        .map((payment) => {
          const method = {
            type: payment.type,
            amount: parseFloat(payment.amount),
          };

          // Add cheque details if payment type is cheque
          if (payment.type === "cheque" && payment.chequeDetails) {
            method.chequeDetails = {
              number: payment.chequeDetails.number,
              bank: payment.chequeDetails.bank,
              branch: payment.chequeDetails.branch,
              date: payment.chequeDetails.date,
            };
          }

          return method;
        });

      // Prepare the payment document data
      const paymentData = {
        buyerId: buyerData.id,
        buyerName: buyerData.name,
        amount: totalPaid,
        methods: paymentMethods,
        date: new Date().toISOString().split("T")[0], // YYYY-MM-DD format
        category: category,
        totalAmount: buyerData.totalAmount,
        remainingAmount: remainingAmount,
        businessId: currentBusiness.id,
        ownerId: currentUser.uid,
        createdBy: currentUser.uid,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add optional fields only if they have valid values
      if (stockId) {
        paymentData.relatedStockId = stockId;
      }

      if (purchaseId) {
        paymentData.relatedPurchaseId = purchaseId;
      }

      // Only add stockDetails if it's not undefined and has content
      if (
        stockDetails &&
        typeof stockDetails === "object" &&
        Object.keys(stockDetails).length > 0
      ) {
        paymentData.stockDetails = stockDetails;
      }

      // Clean the data to remove any undefined values
      const cleanedPaymentData = cleanFirestoreData(paymentData);

      console.log("Saving payment data:", cleanedPaymentData);

      // Save to buyer-specific payments collection
      const buyerPaymentsPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/buyers/${buyerData.id}/payments`;
      console.log("Saving to buyer payments:", buyerPaymentsPath);

      const buyerPaymentRef = await addDoc(
        collection(db, buyerPaymentsPath),
        cleanedPaymentData
      );

      // Save to all payments collection with reference to buyer payment
      const allPaymentsPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/allPayments`;
      console.log("Saving to all payments:", allPaymentsPath);

      await addDoc(collection(db, allPaymentsPath), {
        ...cleanedPaymentData,
        buyerPaymentId: buyerPaymentRef.id, // Reference to the payment in buyer's collection
      });

      // Store payment data for bill generation
      const dataForBill = {
        ...cleanedPaymentData,
        paymentId: buyerPaymentRef.id,
        // Ensure we have stock details from either prop or saved data
        stockDetails: stockDetails ||
          cleanedPaymentData.stockDetails || {
            stockId: stockId,
            purchaseId: purchaseId,
            category: category,
            paddyInfo: {
              code: cleanedPaymentData.paddyCode || "N/A",
              type: cleanedPaymentData.paddyTypeName || "N/A",
            },
          },
      };

      console.log("Data prepared for bill:", dataForBill);
      setSavedPaymentData(dataForBill);

      // Show success modal - this should stay open until user chooses
      setShowSuccessModal(true);

      toast.success("Payment recorded successfully!");

      // Don't call onPaymentComplete here - let the user decide in the modal
      console.log("Payment saved successfully, showing success modal");
    } catch (error) {
      console.error("Error saving payment:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);

      if (error.code === "permission-denied") {
        toast.error("Permission denied. Check your Firestore rules.");
      } else {
        toast.error("Failed to record payment. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleGenerateBill = () => {
    console.log("Generating bill with data:", savedPaymentData);
    console.log("Business info:", currentBusiness);
    console.log("Stock details:", stockDetails);

    setBillError(false); // Reset any previous bill errors
    setShowSuccessModal(false); // Close the success modal
    setShowBill(true); // Open the bill modal
  };

  const handleCloseSuccessModal = () => {
    console.log("Closing success modal");
    setShowSuccessModal(false);

    // Call parent callback when modal is closed (user chose not to generate bill)
    if (onPaymentComplete && savedPaymentData) {
      onPaymentComplete({
        ...savedPaymentData,
        paymentId: savedPaymentData.paymentId,
      });
    }

    // Reset form after closing success modal
    setPayments([{ id: 1, type: "", amount: "", chequeDetails: {} }]);
    setErrors({});
  };

  const handleCloseBill = () => {
    console.log("Closing bill");
    setShowBill(false);

    // Call parent callback when bill is closed
    if (onPaymentComplete && savedPaymentData) {
      onPaymentComplete({
        ...savedPaymentData,
        paymentId: savedPaymentData.paymentId,
      });
    }

    // Reset form after closing bill
    setPayments([{ id: 1, type: "", amount: "", chequeDetails: {} }]);
    setErrors({});
  };

  const getPaymentIcon = (type) => {
    const paymentType = paymentTypes.find((pt) => pt.value === type);
    return paymentType ? paymentType.icon : Banknote;
  };

  // Check if user is authenticated and has business selected
  if (!currentUser || !currentBusiness?.id) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <p className="text-yellow-800 text-sm">
            Please ensure you are logged in and have selected a business.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Record Payment
          </h1>
          <div className="h-1 w-16 sm:w-20 bg-blue-500 rounded"></div>
          {currentBusiness?.name && (
            <p className="text-xs sm:text-sm text-gray-600">
              Business: {currentBusiness.name}
            </p>
          )}
        </div>

        {/* Buyer Information - Mobile Responsive */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg sm:rounded-xl p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
            Buyer Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-600">
                Buyer ID
              </label>
              <div className="bg-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg border text-sm sm:text-base">
                {buyerData.id}
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-600">
                Buyer Name
              </label>
              <div className="bg-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg border text-sm sm:text-base">
                {buyerData.name}
              </div>
            </div>
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-600">
                Total Amount Due
              </label>
              <div className="bg-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg border font-semibold text-blue-600 text-sm sm:text-base">
                Rs. {buyerData.totalAmount.toLocaleString("en-IN")}
              </div>
            </div>
          </div>
          {category && (
            <div className="mt-3 sm:mt-4 space-y-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-600">
                Payment Category
              </label>
              <div className="bg-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg border text-sm sm:text-base">
                {category
                  .replace("_", " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </div>
            </div>
          )}
        </div>

        {/* Payment Methods - Mobile Optimized */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              Payment Methods
            </h2>
            <button
              onClick={addPaymentMethod}
              disabled={submitting}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-blue-500 text-white px-4 py-2 sm:py-2.5 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm sm:text-base"
            >
              <Plus className="h-4 w-4" />
              <span>Add Payment</span>
            </button>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {payments.map((payment, index) => {
              const PaymentIcon = getPaymentIcon(payment.type);

              return (
                <div
                  key={payment.id}
                  className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-4 sm:p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <PaymentIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                      </div>
                      <h3 className="text-base sm:text-lg font-medium text-gray-800">
                        Payment {index + 1}
                      </h3>
                    </div>
                    {payments.length > 1 && (
                      <button
                        onClick={() => removePaymentMethod(payment.id)}
                        disabled={submitting}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <ResponsiveSelect
                      label="Payment Type"
                      value={payment.type}
                      onChange={(e) =>
                        updatePayment(payment.id, "type", e.target.value)
                      }
                      options={paymentTypes}
                      required
                      error={errors[`payment_${payment.id}_type`]}
                    />
                    <ResponsiveInput
                      label="Amount (Rs.)"
                      type="number"
                      value={payment.amount}
                      onChange={(e) =>
                        updatePayment(payment.id, "amount", e.target.value)
                      }
                      placeholder="Enter amount"
                      step="0.01"
                      min="0"
                      error={errors[`payment_${payment.id}_amount`]}
                    />
                  </div>

                  {/* Cheque Details - Mobile Responsive */}
                  {payment.type === "cheque" && (
                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mt-4">
                      <h4 className="text-sm sm:text-base font-medium text-gray-700 mb-3">
                        Cheque Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <ResponsiveInput
                          label="Cheque Number"
                          value={payment.chequeDetails.number || ""}
                          onChange={(e) =>
                            updatePayment(
                              payment.id,
                              "cheque.number",
                              e.target.value
                            )
                          }
                          placeholder="Enter cheque number"
                          error={errors[`payment_${payment.id}_cheque_number`]}
                        />
                        <ResponsiveInput
                          label="Bank Name"
                          value={payment.chequeDetails.bank || ""}
                          onChange={(e) =>
                            updatePayment(
                              payment.id,
                              "cheque.bank",
                              e.target.value
                            )
                          }
                          placeholder="Enter bank name"
                          error={errors[`payment_${payment.id}_bank`]}
                        />
                        <ResponsiveInput
                          label="Branch"
                          value={payment.chequeDetails.branch || ""}
                          onChange={(e) =>
                            updatePayment(
                              payment.id,
                              "cheque.branch",
                              e.target.value
                            )
                          }
                          placeholder="Enter branch"
                          error={errors[`payment_${payment.id}_branch`]}
                        />
                        <ResponsiveInput
                          label="Cheque Date"
                          type="date"
                          value={payment.chequeDetails.date || ""}
                          onChange={(e) =>
                            updatePayment(
                              payment.id,
                              "cheque.date",
                              e.target.value
                            )
                          }
                          error={errors[`payment_${payment.id}_date`]}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Summary - Mobile Responsive */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
            Payment Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            <div className="bg-white rounded-lg p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">
                Rs. {totalPaid.toLocaleString("en-IN")}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Total Paid</div>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4 text-center">
              <div
                className={`text-lg sm:text-xl lg:text-2xl font-bold ${
                  remainingAmount < 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                Rs. {Math.abs(remainingAmount).toLocaleString("en-IN")}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                {remainingAmount < 0 ? "Overpaid" : "Remaining"}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4 text-center sm:col-span-3 lg:col-span-1">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">
                Rs. {buyerData.totalAmount.toLocaleString("en-IN")}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Total Due</div>
            </div>
          </div>
          {errors.totalAmount && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-700 text-sm">{errors.totalAmount}</p>
            </div>
          )}
        </div>

        {/* Action Buttons - Proper Footer */}
        <div className="border-t border-gray-200 pt-6 mt-8">
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full sm:flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-8 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
                  <span>Recording Payment...</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5 mr-3" />
                  <span>Record Payment</span>
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 text-base"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <PaymentSuccessModal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccessModal}
        onGenerateBill={handleGenerateBill}
        paymentData={savedPaymentData}
      />

      {/* Printable Bill */}
      {showBill && savedPaymentData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 p-4">
          <div className="w-full h-full flex items-center justify-center">
            <div className="bg-white rounded-lg w-full max-w-4xl h-full max-h-[90vh] overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold">Payment Bill</h3>
                <button
                  onClick={handleCloseBill}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                  ×
                </button>
              </div>
              <div className="h-full overflow-auto">
                {!billError ? (
                  <ErrorBoundary
                    fallback={
                      <FallbackBill
                        paymentData={savedPaymentData}
                        businessInfo={currentBusiness}
                        onClose={handleCloseBill}
                      />
                    }
                    onError={() => {
                      console.error(
                        "PrintableBill component failed, using fallback"
                      );
                      setBillError(true);
                    }}
                  >
                    <PrintableBill
                      ref={billRef}
                      paymentData={savedPaymentData}
                      businessInfo={currentBusiness}
                      stockDetails={
                        stockDetails || savedPaymentData.stockDetails
                      }
                      onClose={handleCloseBill}
                    />
                  </ErrorBoundary>
                ) : (
                  <FallbackBill
                    paymentData={savedPaymentData}
                    businessInfo={currentBusiness}
                    onClose={handleCloseBill}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
