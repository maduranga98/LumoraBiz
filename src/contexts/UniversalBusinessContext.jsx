// src/contexts/UniversalBusinessContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { toast } from "react-hot-toast";

const UniversalBusinessContext = createContext();

export const useBusiness = () => {
  const context = useContext(UniversalBusinessContext);
  if (!context) {
    throw new Error(
      "useBusiness must be used within a UniversalBusinessProvider"
    );
  }
  return context;
};

export const UniversalBusinessProvider = ({ children }) => {
  const { currentUser, userRole } = useAuth();
  const [userBusinesses, setUserBusinesses] = useState([]);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Database paths based on user role
  const getDatabasePaths = () => {
    if (!currentUser || !currentBusiness) return null;

    const basePath =
      userRole === "owner"
        ? `owners/${currentUser.uid}`
        : `owners/${currentUser.ownerId}`;

    const businessId =
      userRole === "owner" ? currentBusiness.id : currentUser.businessId;

    return {
      business: `${basePath}/businesses/${businessId}`,
      inventory: `${basePath}/businesses/${businessId}/inventory`,
      customers: `${basePath}/businesses/${businessId}/customers`,
      employees: `${basePath}/businesses/${businessId}/employees`,
      suppliers: `${basePath}/businesses/${businessId}/suppliers`,
      orders: `${basePath}/businesses/${businessId}/orders`,
      transactions: `${basePath}/businesses/${businessId}/transactions`,
      reports: `${basePath}/businesses/${businessId}/reports`,
      vehicles: `${basePath}/businesses/${businessId}/vehicles`,
      equipment: `${basePath}/businesses/${businessId}/equipment`,
    };
  };

  // Load businesses based on user role
  useEffect(() => {
    if (!currentUser) {
      setUserBusinesses([]);
      setCurrentBusiness(null);
      setLoading(false);
      return;
    }

    const loadBusinessData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (userRole === "owner") {
          await loadOwnerBusinesses();
        } else if (userRole === "manager") {
          await loadManagerBusiness();
        }
      } catch (error) {
        console.error("Error loading business data:", error);
        setError(error.message);
        toast.error(`Failed to load business data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadBusinessData();
  }, [currentUser, userRole]);

  // Load owner's businesses
  const loadOwnerBusinesses = async () => {
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

      // Try to restore business selection from sessionStorage
      const businessSession = sessionStorage.getItem("business_session");
      if (businessSession) {
        try {
          const parsedSession = JSON.parse(businessSession);
          const savedBusiness = businesses.find(
            (b) => b.id === parsedSession.businessId
          );

          if (savedBusiness) {
            setCurrentBusiness(savedBusiness);
            console.log(
              "Restored business selection:",
              savedBusiness.businessName
            );
            return;
          } else {
            sessionStorage.removeItem("business_session");
          }
        } catch (error) {
          console.error("Error parsing business session:", error);
          sessionStorage.removeItem("business_session");
        }
      }

      // Auto-select if only one business
      if (businesses.length === 1) {
        setCurrentBusiness(businesses[0]);
        sessionStorage.setItem(
          "business_session",
          JSON.stringify({
            businessId: businesses[0].id,
            businessName: businesses[0].businessName,
            timestamp: Date.now(),
          })
        );
      }
    } catch (error) {
      console.error("Error loading owner businesses:", error);
      throw new Error("Failed to load your businesses");
    }
  };

  // Load manager's assigned business
  const loadManagerBusiness = async () => {
    try {
      if (!currentUser.ownerId || !currentUser.businessId) {
        throw new Error(
          "Manager profile incomplete - missing business assignment"
        );
      }

      console.log("Loading manager business:", {
        ownerId: currentUser.ownerId,
        businessId: currentUser.businessId,
      });

      // Load the specific business this manager is assigned to
      const businessDocRef = doc(
        db,
        "owners",
        currentUser.ownerId,
        "businesses",
        currentUser.businessId
      );

      const businessDoc = await getDoc(businessDocRef);

      if (businessDoc.exists()) {
        const businessData = {
          id: businessDoc.id,
          ...businessDoc.data(),
        };

        setCurrentBusiness(businessData);
        setUserBusinesses([businessData]); // Manager only has access to one business

        console.log("Manager business loaded:", businessData.businessName);

        // Store in session for consistency
        sessionStorage.setItem(
          "business_session",
          JSON.stringify({
            businessId: businessData.id,
            businessName: businessData.businessName,
            managerId: currentUser.uid,
            timestamp: Date.now(),
          })
        );
      } else {
        throw new Error("Assigned business not found or access denied");
      }
    } catch (error) {
      console.error("Error loading manager business:", error);
      throw new Error(`Failed to load assigned business: ${error.message}`);
    }
  };

  // Select business (owner only)
  const selectBusiness = (business) => {
    if (userRole !== "owner") {
      console.warn("Only owners can select different businesses");
      return;
    }

    setCurrentBusiness(business);
    sessionStorage.setItem(
      "business_session",
      JSON.stringify({
        businessId: business.id,
        businessName: business.businessName,
        timestamp: Date.now(),
      })
    );
    console.log("Business selected:", business.businessName);
  };

  // Clear business selection (owner only)
  const clearBusinessSelection = () => {
    if (userRole !== "owner") {
      console.warn("Only owners can clear business selection");
      return;
    }

    setCurrentBusiness(null);
    sessionStorage.removeItem("business_session");
    console.log("Business selection cleared");
  };

  // Refresh current business data
  const refreshBusinessData = async () => {
    if (!currentBusiness) return;

    try {
      const businessDocRef =
        userRole === "owner"
          ? doc(db, "owners", currentUser.uid, "businesses", currentBusiness.id)
          : doc(
              db,
              "owners",
              currentUser.ownerId,
              "businesses",
              currentUser.businessId
            );

      const businessDoc = await getDoc(businessDocRef);
      if (businessDoc.exists()) {
        const updatedBusiness = {
          id: businessDoc.id,
          ...businessDoc.data(),
        };
        setCurrentBusiness(updatedBusiness);
      }
    } catch (error) {
      console.error("Error refreshing business data:", error);
    }
  };

  // Check if user has specific permission (for managers)
  const hasPermission = (permission) => {
    if (userRole === "owner") return true; // Owners have all permissions
    if (userRole === "manager") {
      return currentUser.permissions?.includes(permission) || false;
    }
    return false;
  };

  // Get user's permissions
  const getUserPermissions = () => {
    if (userRole === "owner") {
      return ["all"]; // Owners have all permissions
    }
    return currentUser.permissions || ["view_dashboard"];
  };

  const contextValue = {
    // State
    userBusinesses,
    currentBusiness,
    loading,
    error,

    // User info
    userRole,
    currentUser,

    // Functions
    selectBusiness,
    clearBusinessSelection,
    refreshBusinessData,

    // Database paths
    databasePaths: getDatabasePaths(),

    // Permission system
    hasPermission,
    getUserPermissions,

    // Utility
    isOwner: userRole === "owner",
    isManager: userRole === "manager",
    canSelectBusiness: userRole === "owner" && userBusinesses.length > 1,
  };

  return (
    <UniversalBusinessContext.Provider value={contextValue}>
      {children}
    </UniversalBusinessContext.Provider>
  );
};
