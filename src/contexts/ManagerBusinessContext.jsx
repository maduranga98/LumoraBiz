// src/contexts/ManagerBusinessContext.jsx
// This file creates a bridge between manager dashboard and existing components

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { toast } from "react-hot-toast";

// Create the Manager Business Context
const ManagerBusinessContext = createContext();

// Export the useBusiness hook that existing components expect
export const useBusiness = () => {
  const context = useContext(ManagerBusinessContext);
  if (!context) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
};

// Manager Business Provider
export const ManagerBusinessProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [userBusinesses, setUserBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadManagerBusiness = async () => {
      // Only load for managers
      if (!currentUser || currentUser.role !== "manager") {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get manager's assigned business using their ownerId and businessId
        const ownerId = currentUser.ownerId;
        const businessId = currentUser.businessId;

        console.log(
          "Loading manager business - ownerId:",
          ownerId,
          "businessId:",
          businessId
        );

        if (!ownerId || !businessId) {
          console.error("Manager missing businessId or ownerId");
          setError("Manager profile incomplete - missing business assignment");
          toast.error(
            "Manager profile incomplete - missing business assignment"
          );
          setLoading(false);
          return;
        }

        // Load the specific business this manager is assigned to
        const businessDocRef = doc(
          db,
          "owners",
          ownerId,
          "businesses",
          businessId
        );
        const businessDoc = await getDoc(businessDocRef);

        if (businessDoc.exists()) {
          const businessData = {
            id: businessDoc.id,
            ...businessDoc.data(),
          };

          setCurrentBusiness(businessData);
          setUserBusinesses([businessData]); // Manager only has access to one business

          console.log("Manager business loaded successfully:", businessData);
          toast.success(
            `Connected to ${businessData.businessName || "business"}`
          );
        } else {
          console.error("Business document not found");
          setError("Business not found");
          toast.error("Assigned business not found");
        }
      } catch (error) {
        console.error("Error loading manager business:", error);
        setError("Failed to load business data");
        toast.error("Failed to load business data");
      } finally {
        setLoading(false);
      }
    };

    loadManagerBusiness();
  }, [currentUser]);

  // Create context value that matches the original BusinessContext interface exactly
  const contextValue = {
    // Core business data
    currentBusiness,
    userBusinesses,
    loading,
    error,

    // Business selection methods (managers can't switch businesses, so these are no-ops)
    selectBusiness: (business) => {
      console.log("Managers cannot switch businesses");
    },

    // Business utility methods
    getCurrentBusinessId: () => currentBusiness?.id || null,
    hasBusinesses: () => userBusinesses.length > 0,
    getBusinessById: (id) =>
      currentBusiness?.id === id ? currentBusiness : null,

    // Refresh methods (simplified for managers)
    refreshBusinesses: async () => {
      console.log("Refreshing manager business data");
      // Could reload the business data here if needed
    },

    // Cleanup method
    clearBusinessData: () => {
      setCurrentBusiness(null);
      setUserBusinesses([]);
      setError(null);
    },
  };

  return (
    <ManagerBusinessContext.Provider value={contextValue}>
      {children}
    </ManagerBusinessContext.Provider>
  );
};

export default ManagerBusinessProvider;
