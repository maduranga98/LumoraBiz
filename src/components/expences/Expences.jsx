import React, { useState, useEffect } from "react";
import { db, auth, storage } from "../../services/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { toast } from "react-hot-toast";

const Expenses = () => {
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Form data
  const [expenseData, setExpenseData] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "",
    amount: "",
    description: "",
    vendor: "",
    paymentMethod: "",
    receiptNumber: "",
    notes: "",
  });

  // Expense categories
  const expenseCategories = [
    {
      value: "fuel",
      label: "Fuel & Transportation",
      color: "bg-red-100 text-red-800",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
      ),
    },
    {
      value: "maintenance",
      label: "Equipment Maintenance",
      color: "bg-blue-100 text-blue-800",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
    {
      value: "utilities",
      label: "Utilities",
      color: "bg-yellow-100 text-yellow-800",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    {
      value: "office",
      label: "Office Supplies",
      color: "bg-green-100 text-green-800",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
    },
    {
      value: "marketing",
      label: "Marketing & Advertising",
      color: "bg-purple-100 text-purple-800",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
          />
        </svg>
      ),
    },
    {
      value: "insurance",
      label: "Insurance",
      color: "bg-indigo-100 text-indigo-800",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    },
    {
      value: "meals",
      label: "Meals & Entertainment",
      color: "bg-pink-100 text-pink-800",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
          />
        </svg>
      ),
    },
    {
      value: "other",
      label: "Other Expenses",
      color: "bg-gray-100 text-gray-800",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      ),
    },
  ];

  // Payment methods
  const paymentMethods = [
    { value: "cash", label: "Cash" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "credit_card", label: "Credit Card" },
    { value: "debit_card", label: "Debit Card" },
    { value: "cheque", label: "Cheque" },
    { value: "upi", label: "UPI/Digital Payment" },
  ];

  // Fetch expenses on component mount
  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const currentBusinessId = localStorage.getItem("currentBusinessId");
      if (!currentBusinessId) return;

      const expensesQuery = query(
        collection(db, "expenses"),
        where("ownerId", "==", currentUser.uid),
        where("businessId", "==", currentBusinessId),
        orderBy("createdAt", "desc"),
        limit(10)
      );

      const querySnapshot = await getDocs(expensesQuery);
      const expensesList = [];

      querySnapshot.forEach((doc) => {
        expensesList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setExpenses(expensesList);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to fetch expenses");
    } finally {
      setLoadingExpenses(false);
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setExpenseData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/pdf",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please select a valid image (JPG, PNG) or PDF file");
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should be less than 5MB");
        return;
      }

      setSelectedFile(file);
    }
  };

  // Upload receipt file
  const uploadReceipt = async (file) => {
    if (!file) return null;

    setUploadingFile(true);
    try {
      const currentUser = auth.currentUser;
      const currentBusinessId = localStorage.getItem("currentBusinessId");

      const fileName = `receipts/${currentBusinessId}/${Date.now()}_${
        file.name
      }`;
      const storageRef = ref(storage, fileName);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      return {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        storageRef: fileName,
        downloadURL: downloadURL,
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload receipt");
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  // Get selected category details
  const getSelectedCategory = () => {
    return expenseCategories.find((cat) => cat.value === expenseData.category);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !expenseData.category ||
      !expenseData.amount ||
      !expenseData.description
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const currentUser = auth.currentUser;
      const currentBusinessId = localStorage.getItem("currentBusinessId");

      // Upload receipt if selected
      let receiptData = null;
      if (selectedFile) {
        receiptData = await uploadReceipt(selectedFile);
      }

      const expenseRecord = {
        date: new Date(expenseData.date),
        category: expenseData.category,
        categoryLabel: getSelectedCategory()?.label || expenseData.category,
        amount: parseFloat(expenseData.amount),
        description: expenseData.description.trim(),
        vendor: expenseData.vendor.trim(),
        paymentMethod: expenseData.paymentMethod,
        receiptNumber: expenseData.receiptNumber.trim(),
        notes: expenseData.notes.trim(),
        receipt: receiptData,
        businessId: currentBusinessId,
        ownerId: currentUser.uid,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName || "Unknown",
        status: "approved", // You can add approval workflow later
        createdAt: new Date(),
      };

      await addDoc(collection(db, "expenses"), expenseRecord);

      toast.success("Expense added successfully");

      // Reset form
      setExpenseData({
        date: new Date().toISOString().split("T")[0],
        category: "",
        amount: "",
        description: "",
        vendor: "",
        paymentMethod: "",
        receiptNumber: "",
        notes: "",
      });
      setSelectedFile(null);

      // Refresh expenses list
      fetchExpenses();
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  // Handle form reset
  const handleReset = () => {
    setExpenseData({
      date: new Date().toISOString().split("T")[0],
      category: "",
      amount: "",
      description: "",
      vendor: "",
      paymentMethod: "",
      receiptNumber: "",
      notes: "",
    });
    setSelectedFile(null);
  };

  // Delete expense
  const deleteExpense = async (expenseId, receipt) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      // Delete receipt file if exists
      if (receipt?.storageRef) {
        try {
          const fileRef = ref(storage, receipt.storageRef);
          await deleteObject(fileRef);
        } catch (fileError) {
          console.error("Error deleting receipt file:", fileError);
        }
      }

      // Delete expense record
      await deleteDoc(doc(db, "expenses", expenseId));

      toast.success("Expense deleted successfully");
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `Rs.${parseFloat(amount || 0).toFixed(2)}`;
  };

  // Format date
  const formatDate = (date) => {
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate total expenses
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + (expense.amount || 0),
    0
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Expense Management
            </h1>
            <p className="text-gray-600 mt-1">
              Track and manage business expenses
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Expenses (Recent)</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              Expenses
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense Form */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Add New Expense
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date and Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={expenseData.date}
                  onChange={handleInputChange}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  value={expenseData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {expenseCategories.map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() =>
                      handleInputChange({
                        target: { name: "category", value: category.value },
                      })
                    }
                    className={`p-3 rounded-lg border-2 transition-all text-sm ${
                      expenseData.category === category.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full ${category.color} flex items-center justify-center mx-auto mb-2`}
                    >
                      {category.icon}
                    </div>
                    <p className="font-medium text-gray-900 text-center">
                      {category.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={expenseData.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="Describe the expense..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                required
              />
            </div>

            {/* Vendor and Payment Method */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor/Supplier
                </label>
                <input
                  type="text"
                  name="vendor"
                  value={expenseData.vendor}
                  onChange={handleInputChange}
                  placeholder="Enter vendor name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  name="paymentMethod"
                  value={expenseData.paymentMethod}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select payment method</option>
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Receipt Number and File Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Receipt/Invoice Number
                </label>
                <input
                  type="text"
                  name="receiptNumber"
                  value={expenseData.receiptNumber}
                  onChange={handleInputChange}
                  placeholder="Enter receipt number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Receipt
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {selectedFile && (
                  <p className="text-sm text-green-600 mt-1">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                name="notes"
                value={expenseData.notes}
                onChange={handleInputChange}
                rows={2}
                placeholder="Any additional notes..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Reset Form
              </button>

              <button
                type="submit"
                disabled={loading || uploadingFile}
                className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading || uploadingFile ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {uploadingFile ? "Uploading..." : "Adding Expense..."}
                  </div>
                ) : (
                  "Add Expense"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Recent Expenses Sidebar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Expenses
          </h3>

          {loadingExpenses ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600">Loading...</span>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-gray-600">No expenses found</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="border border-gray-200 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        expenseCategories.find(
                          (c) => c.value === expense.category
                        )?.color || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {expense.categoryLabel}
                    </span>
                    <button
                      onClick={() => deleteExpense(expense.id, expense.receipt)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Delete expense"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg font-semibold text-red-600">
                      {formatCurrency(expense.amount)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDate(expense.date)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">
                    {expense.description}
                  </p>
                  {expense.vendor && (
                    <p className="text-xs text-gray-500">
                      Vendor: {expense.vendor}
                    </p>
                  )}
                  {expense.receipt && (
                    <div className="mt-2">
                      <a
                        href={expense.receipt.downloadURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                          />
                        </svg>
                        View Receipt
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {expenseCategories.slice(0, 4).map((category) => {
          const categoryExpenses = expenses.filter(
            (exp) => exp.category === category.value
          );
          const categoryTotal = categoryExpenses.reduce(
            (sum, exp) => sum + (exp.amount || 0),
            0
          );

          return (
            <div
              key={category.value}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-full ${category.color}`}>
                  {category.icon}
                </div>
                <span className="text-sm text-gray-600">
                  {categoryExpenses.length}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                {category.label}
              </h3>
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(categoryTotal)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Expenses;
