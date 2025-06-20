// src/components/auth/ProtectedRoute.jsx
import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const ProtectedRoute = ({
  children,
  adminOnly = false,
  managerOnly = false,
  ownerOnly = false,
  allowedRoles = [],
  fallbackPath = "/unauthorized",
}) => {
  const { currentUser, userRole, loading: authLoading } = useAuth();

  console.log("ProtectedRoute - currentUser:", currentUser);
  console.log("ProtectedRoute - userRole:", userRole);
  console.log("ProtectedRoute - authLoading:", authLoading);

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access using the userRole from AuthContext
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

  // Redirect based on user role if they don't have access
  const getRedirectPath = () => {
    switch (userRole) {
      case "admin":
        return "/admin/dashboard";
      case "manager":
        return "/manager/dashboard";
      case "owner":
        return "/home";
      default:
        return fallbackPath;
    }
  };

  // Check if user has access to this route
  if (!checkRoleAccess()) {
    console.log("Access denied. Redirecting to:", getRedirectPath());
    return <Navigate to={getRedirectPath()} replace />;
  }

  // Return the protected component if all checks pass
  return children;
};

// Higher-order component for easy role checking
export const withRoleProtection = (WrappedComponent, roleConfig = {}) => {
  return (props) => (
    <ProtectedRoute {...roleConfig}>
      <WrappedComponent {...props} />
    </ProtectedRoute>
  );
};

// Utility hooks for role checking (simplified version that uses AuthContext)
export const useUserRole = () => {
  const { userRole, loading } = useAuth();
  return { userRole, loading };
};

// Component to check if user has specific role
export const RoleGuard = ({ allowedRoles, fallback = null, children }) => {
  const { userRole, loading } = useUserRole();

  if (loading) {
    return <div className="animate-pulse h-4 bg-gray-200 rounded"></div>;
  }

  if (!allowedRoles.includes(userRole)) {
    return fallback;
  }

  return children;
};

export default ProtectedRoute;
