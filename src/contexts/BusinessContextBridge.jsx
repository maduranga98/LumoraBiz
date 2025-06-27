// src/contexts/BusinessContextBridge.jsx
// This file creates a bridge so existing components work with the new context

import React, { createContext, useContext } from "react";

// Create a context that mimics the original BusinessContext
const BusinessContextBridge = createContext();

// Export the same useBusiness hook that existing components expect
export const useBusiness = () => {
  const context = useContext(BusinessContextBridge);
  if (!context) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
};

// Bridge Provider that forwards the universal business context
export const BusinessProvider = ({ children, universalContext }) => {
  // If universalContext is passed as prop, use it, otherwise try to get it
  let contextToUse = universalContext;

  if (!contextToUse) {
    try {
      const {
        useBusiness: useUniversalBusiness,
      } = require("./UniversalBusinessContext");
      contextToUse = useUniversalBusiness();
    } catch (error) {
      console.error("Failed to get universal business context:", error);
      // Provide a fallback context
      contextToUse = {
        currentBusiness: null,
        loading: false,
        error: "Context not available",
        hasPermission: () => true,
        getUserPermissions: () => ["view_dashboard"],
        userRole: "manager",
        currentUser: null,
        databasePaths: null,
      };
    }
  }

  // Transform it to match the original BusinessContext structure
  const bridgedContext = {
    ...contextToUse,
    // Add any missing properties that the original context had
    selectBusiness: contextToUse.selectBusiness || (() => {}),
    clearBusinessSelection: contextToUse.clearBusinessSelection || (() => {}),
  };

  return (
    <BusinessContextBridge.Provider value={bridgedContext}>
      {children}
    </BusinessContextBridge.Provider>
  );
};

// Export default
export default BusinessProvider;
