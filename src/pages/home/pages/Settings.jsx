// src/pages/home/pages/Settings.jsx
import React, { useState, useEffect } from "react";
import { AddNewBusiness } from "../../settings/AddNewBusiness";
import { EditBusinessData } from "../../settings/EditBusinessData";
import { useAuth } from "../../../contexts/AuthContext";
import { doc, collection, getDocs } from "firebase/firestore";
import { db } from "../../../services/firebase";
import Modal from "../../../components/Modal";
import Profile from "../../settings/Profile";
import {
  Building2,
  Edit3,
  User,
  Plus,
  ChevronRight,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";

export const Settings = () => {
  const { currentUser } = useAuth();
  const [activeModal, setActiveModal] = useState(null);
  const [userBusinesses, setUserBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);

  // Fetch user's businesses
  useEffect(() => {
    const fetchUserBusinesses = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Reference to the user's businesses subcollection
        const ownerDocRef = doc(db, "owners", currentUser.uid);
        const businessesCollectionRef = collection(ownerDocRef, "businesses");

        // Get all businesses for this owner
        const querySnapshot = await getDocs(businessesCollectionRef);
        const businesses = [];

        querySnapshot.forEach((doc) => {
          businesses.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        console.log("Fetched businesses:", businesses);
        setUserBusinesses(businesses);
      } catch (error) {
        console.error("Error fetching businesses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserBusinesses();
  }, [currentUser]);

  // Refresh businesses after adding/editing
  const refreshBusinesses = async () => {
    if (!currentUser) return;

    try {
      const ownerDocRef = doc(db, "owners", currentUser.uid);
      const businessesCollectionRef = collection(ownerDocRef, "businesses");
      const querySnapshot = await getDocs(businessesCollectionRef);
      const businesses = [];

      querySnapshot.forEach((doc) => {
        businesses.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setUserBusinesses(businesses);
    } catch (error) {
      console.error("Error refreshing businesses:", error);
    }
  };

  // Close modal
  const closeModal = () => {
    setActiveModal(null);
    setSelectedBusinessId(null);
    refreshBusinesses(); // Refresh list when modal closes
  };

  // Handle business selection for editing
  const handleSelectBusiness = (businessId) => {
    setSelectedBusinessId(businessId);
    setActiveModal("editBusiness");
  };

  // Settings options with icons and descriptions
  const settingsOptions = [
    {
      id: "addBusiness",
      title: "Add New Business",
      description: "Register a new business profile",
      icon: <Building2 className="w-8 h-8" />,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
    },
    {
      id: "manageBusiness",
      title: "Manage Businesses",
      description: "Edit and update business information",
      icon: <Edit3 className="w-8 h-8" />,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      textColor: "text-green-600",
    },
    {
      id: "profile",
      title: "User Profile",
      description: "Manage your personal information",
      icon: <User className="w-8 h-8" />,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      textColor: "text-purple-600",
    },
  ];

  // Handle option click
  const handleOptionClick = (optionId) => {
    if (optionId === "addBusiness") {
      setActiveModal("addBusiness");
    } else if (optionId === "manageBusiness") {
      setActiveModal("businessList");
    } else if (optionId === "profile") {
      setActiveModal("profile");
    } else {
      setActiveModal(optionId);
    }
  };

  // Render modal content
  const renderModalContent = () => {
    switch (activeModal) {
      case "addBusiness":
        return <AddNewBusiness onSuccess={closeModal} />;

      case "businessList":
        return (
          <div>
            {userBusinesses.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No businesses found
                </h3>
                <p className="text-gray-600 mb-6">
                  You haven't added any businesses yet. Add your first business
                  to get started.
                </p>
                <button
                  onClick={() => setActiveModal("addBusiness")}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Business
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Select a business to manage
                </h3>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {userBusinesses.map((business) => (
                      <div
                        key={business.id}
                        onClick={() => handleSelectBusiness(business.id)}
                        className="p-6 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {business.businessName}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {business.address}
                            </p>
                            {business.email && (
                              <p className="text-sm text-gray-500 mt-1">
                                {business.email}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case "editBusiness":
        return selectedBusinessId ? (
          <EditBusinessData
            businessId={selectedBusinessId}
            onCancel={closeModal}
            onSuccess={closeModal}
          />
        ) : null;

      case "profile":
        return <Profile />;

      default:
        return null;
    }
  };

  // Get modal title
  const getModalTitle = () => {
    const option = settingsOptions.find((opt) => opt.id === activeModal);
    if (activeModal === "businessList") return "Manage Businesses";
    if (activeModal === "editBusiness") return "Edit Business";
    return option?.title || "Settings";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">
            Manage your account, businesses, and preferences
          </p>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsOptions.map((option) => (
            <div
              key={option.id}
              onClick={() => handleOptionClick(option.id)}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group"
            >
              <div className="flex items-start space-x-4">
                <div
                  className={`p-3 rounded-xl ${option.bgColor} group-hover:scale-110 transition-transform`}
                >
                  <div className={option.textColor}>{option.icon}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {option.title}
                  </h3>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-blue-50">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Businesses
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {userBusinesses.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-green-50">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Active Status
                </p>
                <p className="text-2xl font-bold text-gray-900">Online</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-purple-50">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Last Login</p>
                <p className="text-2xl font-bold text-gray-900">Today</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={!!activeModal}
        onClose={closeModal}
        title={getModalTitle()}
        size={
          activeModal === "addBusiness" || activeModal === "editBusiness"
            ? "lg"
            : "md"
        }
      >
        {renderModalContent()}
      </Modal>
    </div>
  );
};

export default Settings;
