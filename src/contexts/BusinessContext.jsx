import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { collection, getDocs, doc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";

const BusinessContext = createContext();

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
};

export const BusinessProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [userBusinesses, setUserBusinesses] = useState([]);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user's businesses when user changes
  useEffect(() => {
    if (!currentUser || currentUser.role !== "owner") {
      setUserBusinesses([]);
      setCurrentBusiness(null);
      setLoading(false);
      return;
    }

    const loadBusinesses = async () => {
      try {
        setLoading(true);
        setError(null);

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

        // Try to restore business selection from sessionStorage first
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
                "Restored business selection from session:",
                savedBusiness.businessName
              );
              setLoading(false);
              return;
            } else {
              // Saved business no longer exists
              sessionStorage.removeItem("business_session");
            }
          } catch (error) {
            console.error("Error parsing business session:", error);
            sessionStorage.removeItem("business_session");
          }
        }

        // Auto-select business logic
        if (businesses.length === 1) {
          // Single business: auto-select it
          setCurrentBusiness(businesses[0]);
          // Store in sessionStorage for persistence
          sessionStorage.setItem(
            "business_session",
            JSON.stringify({
              businessId: businesses[0].id,
              businessData: businesses[0],
              timestamp: Date.now(),
            })
          );
          console.log(
            "Auto-selected single business:",
            businesses[0].businessName
          );
        } else if (businesses.length > 1) {
          // Multiple businesses: auto-select the first one
          setCurrentBusiness(businesses[0]);
          // Store in sessionStorage for persistence
          sessionStorage.setItem(
            "business_session",
            JSON.stringify({
              businessId: businesses[0].id,
              businessData: businesses[0],
              timestamp: Date.now(),
            })
          );
          console.log(
            "Auto-selected first business from multiple:",
            businesses[0].businessName
          );
        } else {
          // No businesses: set to null
          setCurrentBusiness(null);
          setError("No businesses found. Please create a business first.");
          console.log("No businesses found");
        }

        console.log("Loaded businesses:", businesses);
      } catch (error) {
        console.error("Error loading businesses:", error);
        setError("Failed to load businesses. Please try again.");
        setUserBusinesses([]);
        setCurrentBusiness(null);
      } finally {
        setLoading(false);
      }
    };

    loadBusinesses();
  }, [currentUser]);

  // Real-time updates for current business
  useEffect(() => {
    if (!currentUser || !currentBusiness?.id) {
      return;
    }

    const ownerDocRef = doc(db, "owners", currentUser.uid);
    const businessDocRef = doc(ownerDocRef, "businesses", currentBusiness.id);

    const unsubscribe = onSnapshot(
      businessDocRef,
      (doc) => {
        if (doc.exists()) {
          const updatedBusiness = {
            id: doc.id,
            ...doc.data(),
          };
          setCurrentBusiness(updatedBusiness);
          console.log(
            "Business updated in real-time:",
            updatedBusiness.businessName
          );
        } else {
          console.error("Current business no longer exists");
          setCurrentBusiness(null);
          setError(
            "Selected business no longer exists. Please select another business."
          );
        }
      },
      (error) => {
        console.error("Error listening to business updates:", error);
        setError("Failed to sync business data. Please refresh the page.");
      }
    );

    return () => unsubscribe();
  }, [currentUser, currentBusiness?.id]);

  // Select business (SESSION STORAGE for refresh persistence)
  const selectBusiness = (business) => {
    if (!currentUser) return;

    setCurrentBusiness(business);

    // Store in sessionStorage for refresh persistence (cleared when tab closes)
    sessionStorage.setItem(
      "business_session",
      JSON.stringify({
        businessId: business.id,
        businessData: business,
        timestamp: Date.now(),
      })
    );

    console.log(
      "Selected business (session storage for refresh):",
      business.businessName
    );
  };

  // Get current business ID
  const getCurrentBusinessId = () => {
    return currentBusiness?.id || null;
  };

  // Refresh businesses from database
  const refreshBusinesses = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);

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

      // Update current business if it exists
      if (currentBusiness) {
        const updatedCurrentBusiness = businesses.find(
          (b) => b.id === currentBusiness.id
        );
        if (updatedCurrentBusiness) {
          setCurrentBusiness(updatedCurrentBusiness);
        } else {
          // Current business no longer exists, auto-select first available
          if (businesses.length > 0) {
            setCurrentBusiness(businesses[0]);
            sessionStorage.setItem(
              "business_session",
              JSON.stringify({
                businessId: businesses[0].id,
                businessData: businesses[0],
                timestamp: Date.now(),
              })
            );
            console.log(
              "Auto-selected first business after refresh:",
              businesses[0].businessName
            );
          } else {
            setCurrentBusiness(null);
            setError("No businesses found. Please create a business first.");
          }
        }
      } else {
        // No current business, auto-select first if available
        if (businesses.length > 0) {
          setCurrentBusiness(businesses[0]);
          sessionStorage.setItem(
            "business_session",
            JSON.stringify({
              businessId: businesses[0].id,
              businessData: businesses[0],
              timestamp: Date.now(),
            })
          );
          console.log(
            "Auto-selected first business during refresh:",
            businesses[0].businessName
          );
        }
      }

      console.log("Refreshed businesses (session only):", businesses);
    } catch (error) {
      console.error("Error refreshing businesses:", error);
      setError("Failed to refresh businesses. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Check if user has businesses
  const hasBusinesses = () => {
    return userBusinesses.length > 0;
  };

  // Get business by ID
  const getBusinessById = (businessId) => {
    return (
      userBusinesses.find((business) => business.id === businessId) || null
    );
  };

  // Clear all business data (called on logout)
  const clearBusinessData = () => {
    setUserBusinesses([]);
    setCurrentBusiness(null);
    setError(null);
    sessionStorage.removeItem("business_session");
    console.log("All business data cleared");
  };

  // Auto-clear when user logs out
  useEffect(() => {
    if (!currentUser) {
      clearBusinessData();
    }
  }, [currentUser]);

  const value = {
    userBusinesses,
    currentBusiness,
    loading,
    error,
    selectBusiness,
    getCurrentBusinessId,
    refreshBusinesses,
    hasBusinesses,
    getBusinessById,
    clearBusinessData,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
};

export default BusinessProvider;
