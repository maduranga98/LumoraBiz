// src/pages/manager/components/ManagerComponentWrapper.jsx
// This component provides the correct business context to existing components

import React from "react";
import { useBusiness as useManagerBusiness } from "../../../contexts/ManagerBusinessContext";

// Create a context provider that mimics the original BusinessContext structure
import { createContext, useContext } from "react";

const ManagerBusinessBridgeContext = createContext();

// This hook will be used by components that import from BusinessContext
export const useBusiness = () => {
  const context = useContext(ManagerBusinessBridgeContext);
  if (!context) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
};

// Wrapper component that provides business context to child components
const ManagerComponentWrapper = ({ children }) => {
  // Get the manager business context
  const managerContext = useManagerBusiness();

  return (
    <ManagerBusinessBridgeContext.Provider value={managerContext}>
      {children}
    </ManagerBusinessBridgeContext.Provider>
  );
};

export default ManagerComponentWrapper;
