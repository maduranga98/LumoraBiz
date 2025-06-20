import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const ProtectedRoute = ({
  children,
  adminOnly = false,
  managerOnly = false,
  ownerOnly = false,
  allowedRoles = [],
  redirectTo = null,
  requirePermissions = [],
}) => {
  const {
    currentUser,
    userRole,
    userProfile,
    loading: authLoading,
  } = useAuth();
  const location = useLocation();

  console.log("ProtectedRoute Debug:", {
    currentUser: currentUser?.uid,
    userRole,
    authLoading,
    path: location.pathname,
    adminOnly,
    managerOnly,
    ownerOnly,
    allowedRoles,
  });

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user role is available
  if (!userRole) {
    console.error("User role not available for authenticated user");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Helper function to check role-based access
  const checkRoleAccess = () => {
    // If no role restrictions, allow access
    if (!adminOnly && !managerOnly && !ownerOnly && allowedRoles.length === 0) {
      return true;
    }

    // Check specific role flags
    if (adminOnly && userRole === "admin") return true;
    if (managerOnly && userRole === "manager") return true;
    if (ownerOnly && userRole === "owner") return true;

    // Check allowedRoles array
    if (allowedRoles.length > 0 && allowedRoles.includes(userRole)) {
      return true;
    }

    return false;
  };

  // Helper function to check permissions for managers
  const checkPermissions = () => {
    if (requirePermissions.length === 0) return true;
    if (userRole !== "manager") return true; // Only managers need permission checks

    const userPermissions = userProfile?.permissions || [];
    return requirePermissions.every((permission) =>
      userPermissions.includes(permission)
    );
  };

  // Get the appropriate redirect path based on user role
  const getRedirectPath = () => {
    if (redirectTo) return redirectTo;

    switch (userRole) {
      case "admin":
        return "/admin/dashboard";
      case "manager":
        return "/manager/dashboard";
      case "owner":
        return "/home";
      default:
        return "/unauthorized";
    }
  };

  // Check if user has role-based access
  if (!checkRoleAccess()) {
    console.log(
      `Access denied: User role '${userRole}' not authorized for this route`
    );
    return <Navigate to={getRedirectPath()} replace />;
  }

  // Check if user has required permissions (for managers)
  if (!checkPermissions()) {
    console.log(
      `Permission denied: User lacks required permissions: ${requirePermissions.join(
        ", "
      )}`
    );
    return <Navigate to={getRedirectPath()} replace />;
  }

  // User is authenticated and has proper access
  return children;
};

// Higher-order component for easy role-specific route creation
export const AdminRoute = ({ children, ...props }) => (
  <ProtectedRoute adminOnly {...props}>
    {children}
  </ProtectedRoute>
);

export const ManagerRoute = ({ children, ...props }) => (
  <ProtectedRoute managerOnly {...props}>
    {children}
  </ProtectedRoute>
);

export const OwnerRoute = ({ children, ...props }) => (
  <ProtectedRoute ownerOnly {...props}>
    {children}
  </ProtectedRoute>
);

// Multi-role route components
export const AdminManagerRoute = ({ children, ...props }) => (
  <ProtectedRoute allowedRoles={["admin", "manager"]} {...props}>
    {children}
  </ProtectedRoute>
);

export const OwnerManagerRoute = ({ children, ...props }) => (
  <ProtectedRoute allowedRoles={["owner", "manager"]} {...props}>
    {children}
  </ProtectedRoute>
);

export default ProtectedRoute;
