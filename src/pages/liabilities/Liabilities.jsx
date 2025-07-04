import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { useBusiness } from "../../contexts/BusinessContext";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

const Liabilities = () => {
  const { currentBusiness } = useBusiness();
  const { currentUser } = useAuth();

  // State management
  const [liabilities, setLiabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedType, setSelectedType] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLiability, setEditingLiability] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state for new/edit liability
  const [formData, setFormData] = useState({
    name: "",
    type: "Equipment Loan",
    description: "",
    totalAmount: "",
    remainingBalance: "",
    monthlyPayment: "",
    interestRate: "",
    dueDate: "",
    creditor: "",
    status: "active",
  });

  // Liability types specific to rice mill business
  const liabilityTypes = [
    "Equipment Loan",
    "Land Mortgage",
    "Vehicle Loan",
    "Working Capital Loan",
    "Supplier Credit",
    "Equipment Lease",
    "Business Credit Card",
    "Personal Guarantee",
    "Government Loan",
    "Other",
  ];

  // Fetch liabilities from Firebase
  const fetchLiabilities = async () => {
    if (!currentUser || !currentBusiness?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const liabilitiesCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/liabilities`;
      const liabilitiesQuery = query(
        collection(db, liabilitiesCollectionPath),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(liabilitiesQuery);
      const liabilitiesData = [];

      snapshot.forEach((doc) => {
        liabilitiesData.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setLiabilities(liabilitiesData);
    } catch (error) {
      console.error("Error fetching liabilities:", error);
      toast.error("Failed to load liabilities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiabilities();
  }, [currentUser, currentBusiness]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const activeLiabilities = liabilities.filter((l) => l.status === "active");
    const totalDebt = activeLiabilities.reduce(
      (sum, l) => sum + (parseFloat(l.remainingBalance) || 0),
      0
    );
    const totalMonthlyPayments = activeLiabilities.reduce(
      (sum, l) => sum + (parseFloat(l.monthlyPayment) || 0),
      0
    );
    const totalOriginalDebt = liabilities.reduce(
      (sum, l) => sum + (parseFloat(l.totalAmount) || 0),
      0
    );
    const paidOffDebt = totalOriginalDebt - totalDebt;
    const averageInterestRate =
      activeLiabilities.length > 0
        ? activeLiabilities.reduce(
            (sum, l) => sum + (parseFloat(l.interestRate) || 0),
            0
          ) / activeLiabilities.length
        : 0;

    // Group by type
    const byType = activeLiabilities.reduce((acc, l) => {
      acc[l.type] = (acc[l.type] || 0) + (parseFloat(l.remainingBalance) || 0);
      return acc;
    }, {});

    return {
      totalDebt,
      totalMonthlyPayments,
      totalOriginalDebt,
      paidOffDebt,
      averageInterestRate,
      activeLiabilities: activeLiabilities.length,
      byType,
    };
  }, [liabilities]);

  // Handle form submission (add/edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser || !currentBusiness?.id) return;

    setSubmitting(true);
    try {
      const liabilitiesCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/liabilities`;

      const liabilityData = {
        ...formData,
        totalAmount: parseFloat(formData.totalAmount) || 0,
        remainingBalance: parseFloat(formData.remainingBalance) || 0,
        monthlyPayment: parseFloat(formData.monthlyPayment) || 0,
        interestRate: parseFloat(formData.interestRate) || 0,
        businessId: currentBusiness.id,
        ownerId: currentUser.uid,
        updatedAt: new Date(),
      };

      if (editingLiability) {
        // Update existing liability
        const liabilityRef = doc(
          db,
          liabilitiesCollectionPath,
          editingLiability.id
        );
        await updateDoc(liabilityRef, liabilityData);
        toast.success("Liability updated successfully");
      } else {
        // Add new liability
        liabilityData.createdAt = new Date();
        await addDoc(collection(db, liabilitiesCollectionPath), liabilityData);
        toast.success("Liability added successfully");
      }

      // Reset form and close modal
      resetForm();
      await fetchLiabilities();
    } catch (error) {
      console.error("Error saving liability:", error);
      toast.error("Failed to save liability");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete liability
  const handleDelete = async (liability) => {
    if (!window.confirm(`Are you sure you want to delete "${liability.name}"?`))
      return;

    try {
      const liabilitiesCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/liabilities`;
      await deleteDoc(doc(db, liabilitiesCollectionPath, liability.id));
      toast.success("Liability deleted successfully");
      await fetchLiabilities();
    } catch (error) {
      console.error("Error deleting liability:", error);
      toast.error("Failed to delete liability");
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      type: "Equipment Loan",
      description: "",
      totalAmount: "",
      remainingBalance: "",
      monthlyPayment: "",
      interestRate: "",
      dueDate: "",
      creditor: "",
      status: "active",
    });
    setEditingLiability(null);
    setShowAddModal(false);
  };

  // Handle edit
  const handleEdit = (liability) => {
    setFormData({
      name: liability.name || "",
      type: liability.type || "Equipment Loan",
      description: liability.description || "",
      totalAmount: liability.totalAmount?.toString() || "",
      remainingBalance: liability.remainingBalance?.toString() || "",
      monthlyPayment: liability.monthlyPayment?.toString() || "",
      interestRate: liability.interestRate?.toString() || "",
      dueDate: liability.dueDate || "",
      creditor: liability.creditor || "",
      status: liability.status || "active",
    });
    setEditingLiability(liability);
    setShowAddModal(true);
  };

  // Utility functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getProgressPercentage = (remaining, total) => {
    if (!total || total === 0) return 0;
    return Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
  };

  const getTypeIcon = (type) => {
    const icons = {
      "Equipment Loan": "🏭",
      "Land Mortgage": "🏞️",
      "Vehicle Loan": "🚚",
      "Working Capital Loan": "💰",
      "Supplier Credit": "📦",
      "Equipment Lease": "⚙️",
      "Business Credit Card": "💳",
      "Personal Guarantee": "👤",
      "Government Loan": "🏛️",
      Other: "📄",
    };
    return icons[type] || "📄";
  };

  const filteredLiabilities = useMemo(() => {
    let filtered = liabilities;
    if (selectedType !== "all") {
      filtered = filtered.filter((l) => l.type === selectedType);
    }
    return filtered;
  }, [liabilities, selectedType]);

  // Liability Card Component
  const LiabilityCard = ({ liability }) => {
    const progress = getProgressPercentage(
      liability.remainingBalance,
      liability.totalAmount
    );

    return (
      <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors duration-200">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getTypeIcon(liability.type)}</span>
            <div>
              <h4 className="font-semibold text-gray-900">{liability.name}</h4>
              <p className="text-sm text-gray-500">{liability.type}</p>
              {liability.creditor && (
                <p className="text-xs text-gray-400">
                  Creditor: {liability.creditor}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                liability.status === "paid"
                  ? "bg-green-100 text-green-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              {liability.status === "paid" ? "Paid Off" : "Active"}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => handleEdit(liability)}
                className="p-1 text-gray-400 hover:text-blue-600 rounded"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(liability)}
                className="p-1 text-gray-400 hover:text-red-600 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {liability.description && (
          <p className="text-sm text-gray-600 mb-3">{liability.description}</p>
        )}

        <div className="space-y-3">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">{progress.toFixed(1)}% paid</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Financial Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Remaining</p>
              <p className="font-semibold text-gray-900">
                {formatCurrency(liability.remainingBalance)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Monthly Payment</p>
              <p className="font-semibold text-gray-900">
                {formatCurrency(liability.monthlyPayment)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Interest Rate</p>
              <p className="font-semibold text-gray-900">
                {liability.interestRate || 0}%
              </p>
            </div>
            <div>
              <p className="text-gray-600">Next Due</p>
              <p className="font-semibold text-gray-900">
                {formatDate(liability.dueDate)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl p-6">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-32"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authentication check
  if (!currentUser || !currentBusiness?.id) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-gray-600">
              Please ensure you're logged in and have a business selected.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Liabilities
            </h1>
            <p className="text-gray-600">
              Track and manage your business debts and financial obligations
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Liability
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Debt</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(metrics.totalDebt)}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {metrics.activeLiabilities} active debts
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Monthly Payments
                </p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {formatCurrency(metrics.totalMonthlyPayments)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Monthly obligation</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Paid Off</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(metrics.paidOffDebt)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {metrics.totalOriginalDebt > 0
                ? (
                    (metrics.paidOffDebt / metrics.totalOriginalDebt) *
                    100
                  ).toFixed(1)
                : 0}
              % of total
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg Interest
                </p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {metrics.averageInterestRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Weighted average</p>
          </div>
        </div>

        {/* Tab Navigation and Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "overview"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab("details")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "details"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  All Liabilities
                </button>
              </nav>
            </div>

            {activeTab === "details" && (
              <div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  {liabilityTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {activeTab === "overview" && (
            <div>
              {Object.keys(metrics.byType).length > 0 ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    Debt Breakdown by Type
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {Object.entries(metrics.byType).map(([type, amount]) => (
                      <div key={type} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{getTypeIcon(type)}</span>
                          <span className="font-medium text-gray-900">
                            {type}
                          </span>
                        </div>
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(amount)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {((amount / metrics.totalDebt) * 100).toFixed(1)}% of
                          total
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {liabilities.length === 0
                  ? "No Liabilities"
                  : "Recent Liabilities"}
              </h3>

              {liabilities.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">
                    No liabilities recorded yet
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Your First Liability
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {liabilities
                    .filter((l) => l.status === "active")
                    .slice(0, 4)
                    .map((liability) => (
                      <LiabilityCard key={liability.id} liability={liability} />
                    ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "details" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                {selectedType === "all"
                  ? "All Liabilities"
                  : `${selectedType} Liabilities`}
              </h3>

              {filteredLiabilities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No liabilities found for the selected filter</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredLiabilities.map((liability) => (
                    <LiabilityCard key={liability.id} liability={liability} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <div
                className="fixed inset-0 bg-black opacity-50"
                onClick={resetForm}
              ></div>
              <div className="relative bg-white rounded-xl w-full max-w-2xl mx-auto p-6 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {editingLiability ? "Edit Liability" : "Add New Liability"}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Liability Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Rice Processing Equipment Loan"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.type}
                        onChange={(e) =>
                          setFormData({ ...formData, type: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {liabilityTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Amount (Rs.){" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.totalAmount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            totalAmount: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="500000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Remaining Balance (Rs.){" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.remainingBalance}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            remainingBalance: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="350000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Monthly Payment (Rs.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.monthlyPayment}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            monthlyPayment: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="15000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Interest Rate (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.interestRate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            interestRate: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="8.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Next Due Date
                      </label>
                      <input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) =>
                          setFormData({ ...formData, dueDate: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Creditor/Lender
                      </label>
                      <input
                        type="text"
                        value={formData.creditor}
                        onChange={(e) =>
                          setFormData({ ...formData, creditor: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., State Bank of India"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="active">Active</option>
                        <option value="paid">Paid Off</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      rows="3"
                      className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Additional details about this liability..."
                    ></textarea>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70 font-medium"
                    >
                      {submitting
                        ? editingLiability
                          ? "Updating..."
                          : "Adding..."
                        : editingLiability
                        ? "Update Liability"
                        : "Add Liability"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Liabilities;
