// src/pages/home/pages/Settings.jsx
import React, { useState, useEffect } from "react";
import { AddNewBusiness } from "../../settings/AddNewBusiness";
import { EditBusinessData } from "../../settings/EditBusinessData";
import { db, auth } from "../../../services/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export const Settings = () => {
  const [activeTab, setActiveTab] = useState("addBusiness");
  const [userBusinesses, setUserBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);

  // Fetch user's businesses
  useEffect(() => {
    const fetchUserBusinesses = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      setLoading(true);
      try {
        const businessQuery = query(
          collection(db, "business"),
          where("ownerId", "==", currentUser.uid)
        );

        const querySnapshot = await getDocs(businessQuery);
        const businesses = [];

        querySnapshot.forEach((doc) => {
          businesses.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        setUserBusinesses(businesses);
      } catch (error) {
        console.error("Error fetching businesses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserBusinesses();
  }, []);

  // Tab options
  const tabs = [
    { id: "addBusiness", label: "Add Business" },
    { id: "editBusiness", label: "Edit Business" },
    { id: "profile", label: "Profile" },
    { id: "account", label: "Account" },
    { id: "notifications", label: "Notifications" },
  ];

  // Handle business selection for editing
  const handleSelectBusiness = (businessId) => {
    setSelectedBusinessId(businessId);
  };

  // Handle going back to business list from edit form
  const handleBackToBusinessList = () => {
    setSelectedBusinessId(null);
  };

  // Render the content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "addBusiness":
        return <AddNewBusiness />;
      case "editBusiness":
        return (
          <div>
            {userBusinesses.length === 0 ? (
              <div className="p-6 bg-white rounded-lg shadow-md">
                <p className="text-gray-700">
                  You don't have any businesses yet. Add a business first.
                </p>
              </div>
            ) : selectedBusinessId ? (
              <EditBusinessData
                businessId={selectedBusinessId}
                onCancel={handleBackToBusinessList}
              />
            ) : (
              <div className="p-6 bg-white rounded-lg shadow-md">
                <h3 className="text-lg font-medium text-gray-800 mb-4">
                  Select a business to edit
                </h3>
                {loading ? (
                  <div className="flex justify-center my-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <ul className="space-y-2 mt-3">
                    {userBusinesses.map((business) => (
                      <li key={business.id}>
                        <button
                          onClick={() => handleSelectBusiness(business.id)}
                          className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <p className="font-medium text-gray-800">
                            {business.businessName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {business.address}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      case "profile":
        return <div className="p-4">Profile settings will go here</div>;
      case "account":
        return <div className="p-4">Account settings will go here</div>;
      case "notifications":
        return <div className="p-4">Notification settings will go here</div>;
      default:
        return <AddNewBusiness />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-white rounded-lg shadow-md p-4">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  // Reset selected business when switching tabs
                  if (tab.id !== "editBusiness") {
                    setSelectedBusinessId(null);
                  }
                }}
                className={`w-full text-left px-4 py-3 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">{renderContent()}</div>
      </div>
    </div>
  );
};

export default Settings;
