import React, { useState, useEffect } from "react";
import { Plus, Trash2, CreditCard, Banknote, FileText } from "lucide-react";
import { db } from "../../services/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useBusiness } from "../../contexts/BusinessContext";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";
import Input from "../../components/Input";

const Select = ({
  label,
  value,
  onChange,
  options,
  required = false,
  error,
}) => (
  <div className="flex flex-col">
    {label && (
      <label className="text-gray-700 font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <select
      value={value}
      onChange={onChange}
      className={`border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-2.5 rounded-lg outline-none ${
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

export const BuyerPayment = ({
  buyerId,
  buyerName,
  totalAmount,
  stockId,
  category = "paddy_purchase",
  onPaymentComplete,
  onCancel,
}) => {
  const { currentBusiness } = useBusiness();
  const { currentUser } = useAuth();

  const [payments, setPayments] = useState([
    { id: 1, type: "", amount: "", chequeDetails: {} },
  ]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(totalAmount || 0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

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
        relatedStockId: stockId,
        totalAmount: buyerData.totalAmount,
        remainingAmount: remainingAmount,
        businessId: currentBusiness.id,
        ownerId: currentUser.uid,
        createdBy: currentUser.uid,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log("Saving payment data:", paymentData);

      // Save to buyer-specific payments collection
      const buyerPaymentsPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/buyers/${buyerData.id}/payments`;
      console.log("Saving to buyer payments:", buyerPaymentsPath);

      const buyerPaymentRef = await addDoc(
        collection(db, buyerPaymentsPath),
        paymentData
      );

      // Save to all payments collection with reference to buyer payment
      const allPaymentsPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/allPayments`;
      console.log("Saving to all payments:", allPaymentsPath);

      await addDoc(collection(db, allPaymentsPath), {
        ...paymentData,
        buyerPaymentId: buyerPaymentRef.id, // Reference to the payment in buyer's collection
      });

      toast.success("Payment recorded successfully!");

      // Call the parent component's callback
      if (onPaymentComplete) {
        onPaymentComplete({
          ...paymentData,
          paymentId: buyerPaymentRef.id,
        });
      }
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

  const getPaymentIcon = (type) => {
    const paymentType = paymentTypes.find((pt) => pt.value === type);
    return paymentType ? paymentType.icon : Banknote;
  };

  // Check if user is authenticated and has business selected
  if (!currentUser || !currentBusiness?.id) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Please ensure you are logged in and have selected a business.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Buyer Payment</h1>
        <div className="h-1 w-20 bg-blue-500 rounded"></div>
        <p className="text-sm text-gray-600 mt-2">
          Business: {currentBusiness.name || currentBusiness.id}
        </p>
      </div>

      {/* Buyer Information */}
      <div className="bg-gray-50 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Buyer Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Buyer ID
            </label>
            <div className="bg-white px-4 py-2 rounded-lg border">
              {buyerData.id}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Buyer Name
            </label>
            <div className="bg-white px-4 py-2 rounded-lg border">
              {buyerData.name}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Total Amount Due
            </label>
            <div className="bg-white px-4 py-2 rounded-lg border font-semibold text-blue-600">
              Rs. {buyerData.totalAmount.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
        {category && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Payment Category
            </label>
            <div className="bg-white px-4 py-2 rounded-lg border">
              {category
                .replace("_", " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())}
            </div>
          </div>
        )}
      </div>

      {/* Payment Methods */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Payment Methods
          </h2>
          <button
            onClick={addPaymentMethod}
            disabled={submitting}
            className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>Add Payment</span>
          </button>
        </div>

        <div className="space-y-6">
          {payments.map((payment, index) => {
            const PaymentIcon = getPaymentIcon(payment.type);

            return (
              <div
                key={payment.id}
                className="bg-white border border-gray-200 rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <PaymentIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-800">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col">
                    <Select
                      label="Payment Type"
                      value={payment.type}
                      onChange={(e) =>
                        updatePayment(payment.id, "type", e.target.value)
                      }
                      options={paymentTypes}
                      required
                      error={errors[`payment_${payment.id}_type`]}
                    />
                  </div>
                  <div className="flex flex-col">
                    <Input
                      label="Amount (Rs.)"
                      type="number"
                      value={payment.amount}
                      onChange={(e) =>
                        updatePayment(payment.id, "amount", e.target.value)
                      }
                      placeholder="Enter amount"
                      step="0.01"
                      min="0"
                    />
                    {errors[`payment_${payment.id}_amount`] && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors[`payment_${payment.id}_amount`]}
                      </p>
                    )}
                  </div>
                </div>

                {/* Cheque Details */}
                {payment.type === "cheque" && (
                  <div className="bg-gray-50 rounded-lg p-4 mt-4">
                    <h4 className="text-md font-medium text-gray-700 mb-3">
                      Cheque Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex flex-col">
                        <Input
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
                        />
                        {errors[`payment_${payment.id}_cheque_number`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors[`payment_${payment.id}_cheque_number`]}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <Input
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
                        />
                        {errors[`payment_${payment.id}_bank`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors[`payment_${payment.id}_bank`]}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <Input
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
                        />
                        {errors[`payment_${payment.id}_branch`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors[`payment_${payment.id}_branch`]}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <Input
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
                        />
                        {errors[`payment_${payment.id}_date`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors[`payment_${payment.id}_date`]}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Payment Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              Rs. {totalPaid.toLocaleString("en-IN")}
            </div>
            <div className="text-sm text-gray-600">Total Paid</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div
              className={`text-2xl font-bold ${
                remainingAmount < 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              Rs. {Math.abs(remainingAmount).toLocaleString("en-IN")}
            </div>
            <div className="text-sm text-gray-600">
              {remainingAmount < 0 ? "Overpaid" : "Remaining"}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-800">
              Rs. {buyerData.totalAmount.toLocaleString("en-IN")}
            </div>
            <div className="text-sm text-gray-600">Total Due</div>
          </div>
        </div>
        {errors.totalAmount && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-red-700 text-sm">{errors.totalAmount}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 bg-blue-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              Recording Payment...
            </>
          ) : (
            "Record Payment"
          )}
        </button>
        <button
          onClick={handleCancel}
          disabled={submitting}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
