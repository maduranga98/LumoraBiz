import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import {
  collection,
  query,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useBusiness } from "../../contexts/BusinessContext";
import { toast } from "react-hot-toast";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  FileText,
  AlertCircle,
  Loader2,
  X,
  UserCheck,
  Building,
  Filter,
} from "lucide-react";

export const Buyers = () => {
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();
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
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentBuyer, setCurrentBuyer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    address: "",
    notes: "",
  });

  // Fetch buyers when current business changes
  useEffect(() => {
    if (currentUser && currentBusiness?.id) {
      fetchBuyers();
    } else {
      setLoading(false);
    }
  }, [currentUser, currentBusiness]);

  // Fetch buyers from database
  const fetchBuyers = async () => {
    if (!currentUser?.uid || !currentBusiness?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const ownerDocRef = doc(db, "owners", currentUser.uid);
      const businessDocRef = doc(ownerDocRef, "businesses", currentBusiness.id);
      const buyersCollectionRef = collection(businessDocRef, "buyers");

      const querySnapshot = await getDocs(buyersCollectionRef);
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
      toast.error("Failed to load buyers data");
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes with validation
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "phoneNumber" && value !== "") {
      if (!/^[0-9+\s-]+$/.test(value)) return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Reset form data
  const resetForm = () => {
    setFormData({
      name: "",
      phoneNumber: "",
      email: "",
      address: "",
      notes: "",
    });
  };

  // Open add modal
  const openAddModal = () => {
    if (!currentBusiness) {
      toast.error("Please select a business first");
      return;
    }
    resetForm();
    setIsAddModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (buyer) => {
    setCurrentBuyer(buyer);
    setFormData({
      name: buyer.name || "",
      phoneNumber: buyer.phoneNumber || "",
      email: buyer.email || "",
      address: buyer.address || "",
      notes: buyer.notes || "",
    });
    setIsEditModalOpen(true);
  };

  // Open delete modal
  const openDeleteModal = (buyer) => {
    setCurrentBuyer(buyer);
    setIsDeleteModalOpen(true);
  };

  // Close all modals
  const closeModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setCurrentBuyer(null);
    resetForm();
  };

  // Handle add buyer
  const handleAddBuyer = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Buyer name is required");
      return;
    }

    if (!currentUser?.uid) {
      toast.error("Authentication error. Please sign in again.");
      return;
    }

    if (!currentBusiness?.id) {
      toast.error("No business selected");
      return;
    }

    setSubmitting(true);

    try {
      const buyerData = {
        name: formData.name.trim(),
        phoneNumber: formData.phoneNumber.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
        businessId: currentBusiness.id,
        businessName: currentBusiness.businessName,
        ownerId: currentUser.uid,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const ownerDocRef = doc(db, "owners", currentUser.uid);
      const businessDocRef = doc(ownerDocRef, "businesses", currentBusiness.id);
      const buyersCollectionRef = collection(businessDocRef, "buyers");

      await addDoc(buyersCollectionRef, buyerData);
      toast.success("Buyer added successfully");
      closeModals();
      fetchBuyers();
    } catch (error) {
      console.error("Error adding buyer:", error);
      toast.error("Failed to add buyer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit buyer
  const handleEditBuyer = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Buyer name is required");
      return;
    }

    setSubmitting(true);

    try {
      if (!currentBuyer?.id) {
        toast.error("Buyer ID is missing");
        return;
      }

      const buyerData = {
        name: formData.name.trim(),
        phoneNumber: formData.phoneNumber.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
        updatedAt: serverTimestamp(),
      };

      const ownerDocRef = doc(db, "owners", currentUser.uid);
      const businessDocRef = doc(ownerDocRef, "businesses", currentBusiness.id);
      const buyerRef = doc(businessDocRef, "buyers", currentBuyer.id);

      await updateDoc(buyerRef, buyerData);

      toast.success("Buyer updated successfully");
      closeModals();
      fetchBuyers();
    } catch (error) {
      console.error("Error updating buyer:", error);
      toast.error("Failed to update buyer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete buyer
  const handleDeleteBuyer = async () => {
    setSubmitting(true);

    try {
      if (!currentBuyer?.id) {
        toast.error("Buyer ID is missing");
        return;
      }

      const ownerDocRef = doc(db, "owners", currentUser.uid);
      const businessDocRef = doc(ownerDocRef, "businesses", currentBusiness.id);
      const buyerRef = doc(businessDocRef, "buyers", currentBuyer.id);

      await deleteDoc(buyerRef);

      toast.success("Buyer deleted successfully");
      closeModals();
      fetchBuyers();
    } catch (error) {
      console.error("Error deleting buyer:", error);
      toast.error("Failed to delete buyer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter buyers by search term
  const filteredBuyers = buyers.filter(
    (buyer) =>
      buyer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      buyer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      buyer.phoneNumber?.includes(searchTerm)
  );

  // Mobile Card Component
  const MobileBuyerCard = ({ buyer }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{buyer.name}</h3>
            <p className="text-xs text-gray-500">
              Buyer ID: {buyer.id.slice(-6)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => openEditModal(buyer)}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => openDeleteModal(buyer)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        {buyer.phoneNumber && (
          <div className="flex items-center text-gray-700">
            <Phone className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" />
            <span>{buyer.phoneNumber}</span>
          </div>
        )}
        {buyer.email && (
          <div className="flex items-center text-gray-700">
            <Mail className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" />
            <span className="truncate">{buyer.email}</span>
          </div>
        )}
        {buyer.address && (
          <div className="flex items-center text-gray-700">
            <MapPin className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" />
            <span className="truncate">{buyer.address}</span>
          </div>
        )}
        {buyer.notes && (
          <div className="flex items-start text-gray-700">
            <FileText className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
            <span className="text-xs leading-relaxed">{buyer.notes}</span>
          </div>
        )}
      </div>

      {!buyer.phoneNumber && !buyer.email && !buyer.address && !buyer.notes && (
        <div className="text-center py-2">
          <span className="text-gray-400 text-sm">No additional details</span>
        </div>
      )}
    </div>
  );

  // Modal Component with Glass Effect
  const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
      <>
        {/* Glass Backdrop with Blur Effect */}
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300">
          {/* Click outside to close */}
          <div className="absolute inset-0" onClick={onClose}></div>

          {/* Glass Modal Container */}
          <div
            className={`relative bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl w-full ${
              isMobile ? "max-w-sm" : "max-w-md"
            } max-h-[90vh] overflow-hidden transform transition-all duration-300 scale-100 opacity-100`}
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
              boxShadow:
                "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.3)",
            }}
          >
            {/* Modal Header with Glass Effect */}
            <div className="px-4 sm:px-6 py-4 border-b border-white/20 bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 drop-shadow-sm">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-white/50 transition-all duration-200 backdrop-blur-sm border border-white/30"
                  style={{
                    background: "rgba(255, 255, 255, 0.3)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Modal Content with Glass Background */}
            <div className="overflow-y-auto max-h-[calc(90vh-8rem)] bg-gradient-to-b from-white/90 to-white/95">
              {children}
            </div>
          </div>
        </div>
      </>
    );
  };

  // Form Fields Component
  const FormFields = () => (
    <div className="px-4 sm:px-6 py-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="block w-full border border-gray-300 rounded-lg py-2 sm:py-3 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
          placeholder="Enter buyer name"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phone Number
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            className="block w-full pl-10 pr-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
            placeholder="+94 71 234 5678"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="block w-full pl-10 pr-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
            placeholder="buyer@example.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Address
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <textarea
            name="address"
            rows="2"
            value={formData.address}
            onChange={handleChange}
            className="block w-full pl-10 pr-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base resize-none"
            placeholder="Enter complete address"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes
        </label>
        <div className="relative">
          <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <textarea
            name="notes"
            rows="3"
            value={formData.notes}
            onChange={handleChange}
            className="block w-full pl-10 pr-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base resize-none"
            placeholder="Additional notes about the buyer"
          />
        </div>
      </div>
    </div>
  );

  // Modal Actions Component with Glass Effect
  const ModalActions = ({ onSubmit, submitText, onCancel }) => (
    <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-sm border-t border-white/20 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="w-full sm:w-auto px-4 py-2 sm:py-3 border border-white/30 rounded-xl text-sm font-medium text-gray-700 hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 transition-all duration-200 backdrop-blur-sm"
        style={{
          background: "rgba(255, 255, 255, 0.4)",
          backdropFilter: "blur(10px)",
        }}
      >
        Cancel
      </button>
      <button
        onClick={onSubmit}
        disabled={submitting}
        className="w-full sm:w-auto px-6 py-2 sm:py-3 border border-indigo-500/30 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 shadow-lg backdrop-blur-sm"
        style={{
          boxShadow: "0 10px 25px -5px rgba(79, 70, 229, 0.4)",
        }}
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          submitText
        )}
      </button>
    </div>
  );

  // No business selected state
  if (!currentBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="bg-yellow-50 border border-yellow-200 p-6 sm:p-8 rounded-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Business Selected
          </h3>
          <p className="text-sm text-gray-600">
            Please select a business to manage buyers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-6">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Buyers
                </h1>
                <p className="text-sm text-gray-600 hidden sm:block">
                  {currentBusiness.businessName}
                </p>
              </div>
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors text-sm sm:text-base w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Add Buyer
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Search buyers by name, email, or phone..."
              className="pl-10 sm:pl-12 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Stats Bar */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center">
                <UserCheck className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-xs text-blue-600 font-medium">
                    Total Buyers
                  </p>
                  <p className="text-lg font-bold text-blue-900">
                    {buyers.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
              <div className="flex items-center">
                <Filter className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="text-xs text-green-600 font-medium">Filtered</p>
                  <p className="text-lg font-bold text-green-900">
                    {filteredBuyers.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-3 border border-purple-200 col-span-2 sm:col-span-1">
              <div className="flex items-center">
                <Building className="h-5 w-5 text-purple-600 mr-2" />
                <div>
                  <p className="text-xs text-purple-600 font-medium">
                    Business
                  </p>
                  <p className="text-sm font-bold text-purple-900 truncate">
                    {currentBusiness.businessName}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="animate-spin h-8 w-8 sm:h-12 sm:w-12 text-indigo-500 mx-auto mb-4" />
              <p className="text-sm sm:text-base text-gray-600">
                Loading buyers...
              </p>
            </div>
          </div>
        ) : buyers.length === 0 ? (
          // Empty State
          <div className="text-center py-12">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              No buyers found
            </h3>
            <p className="text-sm sm:text-base text-gray-500 mb-8 max-w-md mx-auto">
              Get started by adding your first buyer to manage customer
              relationships effectively.
            </p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-sm sm:text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Add Your First Buyer
            </button>
          </div>
        ) : filteredBuyers.length === 0 ? (
          // No Search Results
          <div className="text-center py-12">
            <Search className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              No matches found
            </h3>
            <p className="text-sm sm:text-base text-gray-500 mb-6">
              No buyers match your search criteria. Try adjusting your search
              terms.
            </p>
            <button
              className="px-4 py-2 text-indigo-600 hover:text-indigo-900 text-sm font-medium border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"
              onClick={() => setSearchTerm("")}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <>
            {/* Mobile View - Cards */}
            <div className="md:hidden space-y-4">
              {filteredBuyers.map((buyer) => (
                <MobileBuyerCard key={buyer.id} buyer={buyer} />
              ))}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Address
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBuyers.map((buyer) => (
                      <tr
                        key={buyer.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                              <Users className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div className="font-medium text-gray-900 text-sm">
                              {buyer.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            {buyer.phoneNumber && (
                              <div className="flex items-center text-sm text-gray-900">
                                <Phone className="w-3 h-3 text-gray-400 mr-2" />
                                {buyer.phoneNumber}
                              </div>
                            )}
                            {buyer.email && (
                              <div className="flex items-center text-sm text-gray-500">
                                <Mail className="w-3 h-3 text-gray-400 mr-2" />
                                <span className="truncate max-w-[200px]">
                                  {buyer.email}
                                </span>
                              </div>
                            )}
                            {!buyer.phoneNumber && !buyer.email && (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-gray-900 max-w-xs">
                            {buyer.address ? (
                              <>
                                <MapPin className="w-3 h-3 text-gray-400 mr-2 flex-shrink-0" />
                                <span className="truncate">
                                  {buyer.address}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-gray-900 max-w-xs">
                            {buyer.notes ? (
                              <>
                                <FileText className="w-3 h-3 text-gray-400 mr-2 flex-shrink-0" />
                                <span className="truncate">{buyer.notes}</span>
                              </>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => openEditModal(buyer)}
                              className="inline-flex items-center px-3 py-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={() => openDeleteModal(buyer)}
                              className="inline-flex items-center px-3 py-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Buyer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={closeModals}
        title="Add New Buyer"
      >
        <form onSubmit={handleAddBuyer}>
          <FormFields />
          <ModalActions
            onSubmit={handleAddBuyer}
            submitText="Add Buyer"
            onCancel={closeModals}
          />
        </form>
      </Modal>

      {/* Edit Buyer Modal */}
      <Modal isOpen={isEditModalOpen} onClose={closeModals} title="Edit Buyer">
        <form onSubmit={handleEditBuyer}>
          <FormFields />
          <ModalActions
            onSubmit={handleEditBuyer}
            submitText="Update Buyer"
            onCancel={closeModals}
          />
        </form>
      </Modal>

      {/* Delete Buyer Modal with Enhanced Glass Effect */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={closeModals}
        title="Delete Buyer"
      >
        <div className="px-4 sm:px-6 py-6">
          <div className="flex items-start space-x-4">
            <div
              className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm border border-red-200/50"
              style={{
                background:
                  "linear-gradient(135deg, rgba(254, 226, 226, 0.8), rgba(252, 165, 165, 0.6))",
                backdropFilter: "blur(10px)",
              }}
            >
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2 drop-shadow-sm">
                Are you sure?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                You're about to delete{" "}
                <span className="font-medium text-gray-900">
                  "{currentBuyer?.name}"
                </span>
                . This action cannot be undone and will permanently remove all
                buyer data.
              </p>
              <div
                className="bg-gradient-to-r from-red-50/80 to-red-100/60 backdrop-blur-sm border border-red-200/50 rounded-xl p-3"
                style={{
                  background: "rgba(254, 242, 242, 0.8)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <p className="text-xs text-red-700">
                  <strong>Warning:</strong> This will also affect any associated
                  purchase records and transactions.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-sm border-t border-white/20 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={closeModals}
            disabled={submitting}
            className="w-full sm:w-auto px-4 py-2 sm:py-3 border border-white/30 rounded-xl text-sm font-medium text-gray-700 hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 transition-all duration-200 backdrop-blur-sm"
            style={{
              background: "rgba(255, 255, 255, 0.4)",
              backdropFilter: "blur(10px)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteBuyer}
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-2 sm:py-3 border border-red-500/30 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 shadow-lg backdrop-blur-sm"
            style={{
              boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.4)",
            }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Buyer
              </>
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Buyers;
