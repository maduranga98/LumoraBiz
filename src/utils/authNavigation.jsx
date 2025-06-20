// src/utils/authNavigation.js

/**
 * Get the correct dashboard path based on user role
 * @param {string} role - User role ('admin', 'manager', 'owner')
 * @returns {string} Dashboard path
 */
export const getDashboardPath = (role) => {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "manager":
      return "/manager/dashboard";
    case "owner":
      return "/home";
    default:
      return "/home"; // Default fallback
  }
};

/**
 * Get the appropriate redirect path when access is denied
 * @param {string} userRole - Current user's role
 * @param {string} requestedPath - Path user was trying to access
 * @returns {string} Redirect path
 */
export const getRedirectPath = (userRole, requestedPath = "") => {
  // If user is trying to access a role-specific route they don't have access to
  if (requestedPath.startsWith("/admin") && userRole !== "admin") {
    return getDashboardPath(userRole);
  }

  if (requestedPath.startsWith("/manager") && userRole !== "manager") {
    return getDashboardPath(userRole);
  }

  if (requestedPath.startsWith("/home") && userRole !== "owner") {
    return getDashboardPath(userRole);
  }

  // Default: send to their appropriate dashboard
  return getDashboardPath(userRole);
};

/**
 * Check if user has access to a specific path
 * @param {string} userRole - User's role
 * @param {string} path - Path to check
 * @returns {boolean} Whether user has access
 */
export const hasPathAccess = (userRole, path) => {
  // Public routes
  const publicPaths = ["/login", "/signup", "/unauthorized"];
  if (publicPaths.includes(path)) {
    return true;
  }

  // Admin routes
  if (path.startsWith("/admin")) {
    return userRole === "admin";
  }

  // Manager routes
  if (path.startsWith("/manager")) {
    return userRole === "manager";
  }

  // Owner routes (includes /home and /business paths)
  if (
    path.startsWith("/home") ||
    path.startsWith("/business") ||
    path.startsWith("/owner")
  ) {
    return userRole === "owner";
  }

  // Default: allow access if no specific restrictions
  return true;
};

/**
 * Get the login redirect based on user role
 * Useful when user logs in successfully
 * @param {string} role - User role
 * @param {string} intendedPath - Path user was trying to access before login
 * @returns {string} Path to redirect to
 */
export const getLoginRedirect = (role, intendedPath = "") => {
  // If user was trying to access a specific path and has access to it
  if (intendedPath && hasPathAccess(role, intendedPath)) {
    return intendedPath;
  }

  // Otherwise, send to their default dashboard
  return getDashboardPath(role);
};
