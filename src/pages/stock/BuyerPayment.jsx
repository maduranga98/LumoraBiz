import React, { useState, useEffect } from "react";
import { Plus, Trash2, CreditCard, Banknote, FileText } from "lucide-react";
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
      <label className="text-muted font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <select
      value={value}
      onChange={onChange}
      className={`border-2 border-muted focus:ring-primary focus:border-primary p-2 rounded-lg outline-none ${
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
  onPaymentComplete,
  onCancel,
}) => {
  const [payments, setPayments] = useState([
    { id: 1, type: "", amount: "", chequeDetails: {} },
  ]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(totalAmount || 0);
  const [errors, setErrors] = useState({});

  // Default values for demo purposes
  const buyerData = {
    id: buyerId || "B001",
    name: buyerName || "John Doe",
    totalAmount: totalAmount || 15000,
  };

  const paymentTypes = [
    { value: "cash", label: "Cash", icon: Banknote },
    { value: "cheque", label: "Cheque", icon: FileText },
    { value: "credit", label: "Credit", icon: CreditCard },
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const paymentData = {
        buyerId: buyerData.id,
        buyerName: buyerData.name,
        totalAmount: buyerData.totalAmount,
        payments: payments.filter((p) => p.type && p.amount),
        totalPaid,
        remainingAmount,
        paymentDate: new Date().toISOString(),
      };

      console.log("Payment Data:", paymentData);

      // Call the parent component's callback if provided
      if (onPaymentComplete) {
        onPaymentComplete(paymentData);
      } else {
        // Fallback for demo purposes
        alert("Payment recorded successfully!");
      }
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      // Fallback for demo purposes
      window.history.back();
    }
  };

  const getPaymentIcon = (type) => {
    const paymentType = paymentTypes.find((pt) => pt.value === type);
    return paymentType ? paymentType.icon : Banknote;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Buyer Payment</h1>
        <div className="h-1 w-20 bg-blue-500 rounded"></div>
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
              Rs. {buyerData.totalAmount.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Payment Methods
          </h2>
          <button
            onClick={addPaymentMethod}
            className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
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
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
                      label="Amount"
                      type="number"
                      value={payment.amount}
                      onChange={(e) =>
                        updatePayment(payment.id, "amount", e.target.value)
                      }
                      placeholder="Enter amount"
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              Rs. {totalPaid.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Paid</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div
              className={`text-2xl font-bold ${
                remainingAmount < 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              Rs. {Math.abs(remainingAmount).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">
              {remainingAmount < 0 ? "Overpaid" : "Remaining"}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-800">
              Rs. {buyerData.totalAmount.toLocaleString()}
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
          className="flex-1 bg-blue-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          Record Payment
        </button>
        <button
          onClick={handleCancel}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
