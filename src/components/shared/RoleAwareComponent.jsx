// src/components/shared/RoleAwareComponent.jsx
import React, { createContext, useContext } from "react";
import { useBusiness } from "../../contexts/UniversalBusinessContext";
import { AlertCircle, Loader2 } from "lucide-react";

// Context for providing database paths to components
const DatabasePathContext = createContext();

export const useDatabasePaths = () => {
  const context = useContext(DatabasePathContext);
  if (!context) {
    throw new Error(
      "useDatabasePaths must be used within a RoleAwareComponent"
    );
  }
  return context;
};

// Main wrapper component that provides role-aware functionality
export const RoleAwareComponent = ({
  children,
  requiredPermissions = [],
  fallbackComponent: FallbackComponent,
  title = "Component",
}) => {
  const {
    currentBusiness,
    loading,
    error,
    databasePaths,
    hasPermission,
    userRole,
    currentUser,
  } = useBusiness();

  // Show loading state
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading {title}...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !currentBusiness) {
    if (FallbackComponent) {
      return <FallbackComponent error={error} />;
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Component Error
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            {error ||
              `Unable to load ${title} due to missing business context.`}
          </p>
        </div>
      </div>
    );
  }

  // Check permissions for managers
  if (userRole === "manager" && requiredPermissions.length > 0) {
    const hasRequiredPermissions = requiredPermissions.some((permission) =>
      hasPermission(permission)
    );

    if (!hasRequiredPermissions) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Access Denied
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              You don't have permission to access {title}. Required permissions:{" "}
              {requiredPermissions.join(", ")}
            </p>
          </div>
        </div>
      );
    }
  }

  // Ensure database paths are available
  if (!databasePaths) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Database Error
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Database paths not configured for {title}.
          </p>
        </div>
      </div>
    );
  }

  // All checks passed - render component with proper context
  return (
    <DatabasePathContext.Provider value={databasePaths}>
      <div className="w-full">{children}</div>
    </DatabasePathContext.Provider>
  );
};

// Higher-order component for easy wrapping
export const withRoleAwareness = (Component, options = {}) => {
  return function RoleAwareWrappedComponent(props) {
    return (
      <RoleAwareComponent {...options}>
        <Component {...props} />
      </RoleAwareComponent>
    );
  };
};

// Specific wrappers for common components
export const InventoryWrapper = ({ children }) => (
  <RoleAwareComponent
    requiredPermissions={["view_inventory", "manage_inventory"]}
    title="Inventory Management"
  >
    {children}
  </RoleAwareComponent>
);

export const CustomerWrapper = ({ children }) => (
  <RoleAwareComponent
    requiredPermissions={["view_customers", "manage_customers"]}
    title="Customer Management"
  >
    {children}
  </RoleAwareComponent>
);

export const EmployeeWrapper = ({ children }) => (
  <RoleAwareComponent
    requiredPermissions={["view_employees", "manage_employees"]}
    title="Employee Management"
  >
    {children}
  </RoleAwareComponent>
);

export const ReportsWrapper = ({ children }) => (
  <RoleAwareComponent requiredPermissions={["view_reports"]} title="Reports">
    {children}
  </RoleAwareComponent>
);
