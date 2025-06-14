// src/contexts/BusinessContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { db } from "../services/firebase";
import { doc, collection, getDocs, onSnapshot } from "firebase/firestore";
import { useAuth } from "./AuthContext";

const BusinessContext = createContext();

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
};

export const BusinessProvider = ({ children }) => {
  const { currentUser } = useAuth(); // Get current user from AuthContext
  const [userBusinesses, setUserBusinesses] = useState([]);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user's businesses from subcollection
  useEffect(() => {
    if (!currentUser) {
      setUserBusinesses([]);
      setCurrentBusiness(null);
      setLoading(false);
      return;
    }

    const fetchUserBusinesses = async () => {
      try {
        setLoading(true);
        setError(null);

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

        // Set current business from localStorage or use first business
        const savedBusinessId = localStorage.getItem(
          `currentBusinessId_${currentUser.uid}`
        );
        if (
          savedBusinessId &&
          businesses.some((b) => b.id === savedBusinessId)
        ) {
          const savedBusiness = businesses.find(
            (b) => b.id === savedBusinessId
          );
          setCurrentBusiness(savedBusiness);
          console.log("Set current business from localStorage:", savedBusiness);
        } else if (businesses.length > 0) {
          setCurrentBusiness(businesses[0]);
          localStorage.setItem(
            `currentBusinessId_${currentUser.uid}`,
            businesses[0].id
          );
          console.log("Set current business to first:", businesses[0]);
        } else {
          setCurrentBusiness(null);
          localStorage.removeItem(`currentBusinessId_${currentUser.uid}`);
        }
      } catch (error) {
        console.error("Error fetching businesses:", error);
        setError("Failed to load businesses. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserBusinesses();
  }, [currentUser]);

  // Real-time listener for businesses (optional - for live updates)
  useEffect(() => {
    if (!currentUser) return;

    const ownerDocRef = doc(db, "owners", currentUser.uid);
    const businessesCollectionRef = collection(ownerDocRef, "businesses");

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      businessesCollectionRef,
      (snapshot) => {
        const businesses = [];
        snapshot.forEach((doc) => {
          businesses.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        console.log("Real-time update - businesses:", businesses);
        setUserBusinesses(businesses);

        // Update current business if it was modified
        if (currentBusiness) {
          const updatedCurrentBusiness = businesses.find(
            (b) => b.id === currentBusiness.id
          );
          if (updatedCurrentBusiness) {
            setCurrentBusiness(updatedCurrentBusiness);
          } else {
            // Current business was deleted, select first available or null
            if (businesses.length > 0) {
              selectBusiness(businesses[0]);
            } else {
              setCurrentBusiness(null);
              localStorage.removeItem(`currentBusinessId_${currentUser.uid}`);
            }
          }
        }
      },
      (error) => {
        console.error("Error in businesses listener:", error);
        setError("Failed to sync business data. Please refresh the page.");
      }
    );

    return () => unsubscribe();
  }, [currentUser, currentBusiness?.id]);

  const selectBusiness = (business) => {
    if (!currentUser) return;

    setCurrentBusiness(business);
    localStorage.setItem(`currentBusinessId_${currentUser.uid}`, business.id);
    console.log("Selected business:", business);
  };

  const getCurrentBusinessId = () => {
    return currentBusiness?.id || null;
  };

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
        }
      }

      console.log("Refreshed businesses:", businesses);
    } catch (error) {
      console.error("Error refreshing businesses:", error);
      setError("Failed to refresh businesses. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const hasBusinesses = () => {
    return userBusinesses.length > 0;
  };

  const getBusinessById = (businessId) => {
    return (
      userBusinesses.find((business) => business.id === businessId) || null
    );
  };

  const clearBusinessData = () => {
    setUserBusinesses([]);
    setCurrentBusiness(null);
    if (currentUser) {
      localStorage.removeItem(`currentBusinessId_${currentUser.uid}`);
    }
  };

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
