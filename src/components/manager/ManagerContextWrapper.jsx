// src/components/manager/ManagerContextWrapper.jsx
import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useBusiness } from "../../pages/manager/ManagerDashboard";

/**
 * Wrapper component to ensure existing components work with manager context
 * This component provides proper auth and business context to child components
 */
const ManagerContextWrapper = ({
  children,
  fallbackComponent: FallbackComponent,
}) => {
  const { currentUser } = useAuth();
  const { currentBusiness, loading, error } = useBusiness();

  // Show loading state
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="text-center py-12">
          <div className="w-8 h-8 animate-spin border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading component...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !currentBusiness) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Component Error
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            {error ||
              "Unable to load component due to missing business context."}
          </p>
        </div>
      </div>
    );
  }

  // Ensure user and business context is available
  if (!currentUser || !currentBusiness) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-yellow-600 text-2xl">⚠</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Context Missing
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Required authentication or business context is missing.
          </p>
        </div>
      </div>
    );
  }

  // All good - render children with proper context
  return <div className="w-full">{children}</div>;
};

export default ManagerContextWrapper;
