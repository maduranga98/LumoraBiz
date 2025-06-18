// src/pages/home/pages/Buyers.jsx
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
} from "lucide-react";

export const Buyers = () => {
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();

  // States
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentBuyer, setCurrentBuyer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
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
    }
  };

  // Handle edit buyer
  const handleEditBuyer = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Buyer name is required");
      return;
    }

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
    }
  };

  // Handle delete buyer
  const handleDeleteBuyer = async () => {
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
    }
  };

  // Filter buyers by search term
  const filteredBuyers = buyers.filter(
    (buyer) =>
      buyer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      buyer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      buyer.phoneNumber?.includes(searchTerm)
  );

  // No business selected state
  if (!currentBusiness) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg max-w-md text-center">
          <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
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
    <div className="h-full flex flex-col">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200 bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Buyers</h1>
              <p className="text-sm text-gray-600">{currentBusiness.businessName}</p>
            </div>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Buyer
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search buyers by name, email, or phone number"
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Buyers List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
          </div>
        ) : buyers.length === 0 ? (
          <div className="p-6 text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">
              No buyers found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first buyer.
            </p>
            <div className="mt-6">
              <button
                onClick={openAddModal}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Buyer
              </button>
            </div>
          </div>
        ) : filteredBuyers.length === 0 ? (
          <div className="p-6 text-center py-12">
            <p className="text-gray-500">No buyers match your search criteria.</p>
            <button
              className="mt-4 text-indigo-600 hover:text-indigo-900 text-sm font-medium"
              onClick={() => setSearchTerm("")}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBuyers.map((buyer) => (
                  <tr key={buyer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                          <Users className="w-3 h-3 text-indigo-600" />
                        </div>
                        <div className="font-medium text-gray-900 text-sm">
                          {buyer.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
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
                            {buyer.email}
                          </div>
                        )}
                        {!buyer.phoneNumber && !buyer.email && (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center text-sm text-gray-900 max-w-xs">
                        {buyer.address ? (
                          <>
                            <MapPin className="w-3 h-3 text-gray-400 mr-2 flex-shrink-0" />
                            <span className="truncate">{buyer.address}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(buyer)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3 inline-flex items-center"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteModal(buyer)}
                        className="text-red-600 hover:text-red-900 inline-flex items-center"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Buyer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Add New Buyer</h3>
            </div>
            <form onSubmit={handleAddBuyer}>
              <div className="px-4 py-3 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    rows="2"
                    value={formData.notes}
                    onChange={handleChange}
                    className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  ></textarea>
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50 flex justify-end space-x-2 rounded-b-lg">
                <button
                  type="button"
                  onClick={closeModals}
                  className="bg-white py-2 px-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 py-2 px-3 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Buyer Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Edit Buyer</h3>
            </div>
            <form onSubmit={handleEditBuyer}>
              <div className="px-4 py-3 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    rows="2"
                    value={formData.notes}
                    onChange={handleChange}
                    className="block w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  ></textarea>
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50 flex justify-end space-x-2 rounded-b-lg">
                <button
                  type="button"
                  onClick={closeModals}
                  className="bg-white py-2 px-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 py-2 px-3 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Buyer Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Delete Buyer</h3>
            </div>
            <div className="px-4 py-3">
              <div className="flex items-center mb-3">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                <p className="text-sm text-gray-700">
                  Are you sure you want to delete the buyer "{currentBuyer?.name}"? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="px-4 py-3 bg-gray-50 flex justify-end space-x-2 rounded-b-lg">
              <button
                onClick={closeModals}
                className="bg-white py-2 px-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBuyer}
                className="bg-red-600 py-2 px-3 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Buyers;