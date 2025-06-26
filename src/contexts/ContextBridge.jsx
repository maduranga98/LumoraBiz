// src/contexts/ContextBridge.jsx
// This component wraps existing components to provide the correct context

import React, { createContext, useContext } from "react";
import { useBusiness as useManagerBusiness } from "./ManagerBusinessContext";
import { useAuth } from "./AuthContext";

// Create a bridge context that mimics the original BusinessContext
const BridgeBusinessContext = createContext();

// Export the useBusiness hook that existing components expect
export const useBusiness = () => {
  const context = useContext(BridgeBusinessContext);
  if (!context) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
};

// Bridge Provider that forwards manager business context to components
export const BusinessContextBridge = ({ children }) => {
  const { currentUser } = useAuth();

  // Get the manager business context
  const managerBusinessContext = useManagerBusiness();

  // If user is a manager, provide the manager business context
  // Otherwise, this component wouldn't be used
  if (currentUser?.role === "manager") {
    return (
      <BridgeBusinessContext.Provider value={managerBusinessContext}>
        {children}
      </BridgeBusinessContext.Provider>
    );
  }

  // Fallback - shouldn't reach here in normal usage
  return children;
};

// Higher-order component to wrap existing components with the bridge
export const withManagerContext = (Component) => {
  return function ManagerWrappedComponent(props) {
    return (
      <BusinessContextBridge>
        <Component {...props} />
      </BusinessContextBridge>
    );
  };
};
