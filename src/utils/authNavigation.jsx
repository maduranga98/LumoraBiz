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
      return "/home/dashboard";
    default:
      return "/login"; // Default fallback for invalid roles
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
 * Check if user has access to a specific path based on their role
 * @param {string} userRole - User's role
 * @param {string} path - Path to check
 * @param {Array} userPermissions - User's permissions (for managers)
 * @returns {boolean} Whether user has access
 */
export const hasPathAccess = (userRole, path, userPermissions = []) => {
  // Public routes - always accessible
  const publicPaths = [
    "/login",
    "/signup",
    "/unauthorized",
    "/forgot-password",
  ];
  if (publicPaths.includes(path)) {
    return true;
  }

  // Admin routes - only admins
  if (path.startsWith("/admin")) {
    return userRole === "admin";
  }

  // Manager routes - only managers with proper permissions
  if (path.startsWith("/manager")) {
    if (userRole !== "manager") return false;

    // Check specific manager route permissions
    const managerRoutePermissions = {
      "/manager/dashboard": ["view_dashboard"],
      "/manager/inventory": ["view_inventory"],
      "/manager/customers": ["view_customers"],
      "/manager/reports": ["view_reports"],
      "/manager/employees": ["manage_employees"],
    };

    const requiredPermissions = managerRoutePermissions[path];
    if (requiredPermissions) {
      return requiredPermissions.some((permission) =>
        userPermissions.includes(permission)
      );
    }

    return true; // Default allow for managers on unlisted routes
  }

  // Owner routes - only owners
  if (path.startsWith("/home") || path.startsWith("/business")) {
    return userRole === "owner";
  }

  // Shared routes that multiple roles can access
  const sharedRoutes = {
    "/inventory": ["owner", "manager"],
    "/customers": ["owner", "manager"],
    "/reports": ["admin", "owner", "manager"],
  };

  for (const [route, allowedRoles] of Object.entries(sharedRoutes)) {
    if (path.startsWith(route)) {
      if (!allowedRoles.includes(userRole)) return false;

      // For managers, check permissions
      if (userRole === "manager") {
        const requiredPermissions = getRequiredPermissionsForPath(path);
        return requiredPermissions.some((permission) =>
          userPermissions.includes(permission)
        );
      }

      return true;
    }
  }

  // Default: deny access to unknown routes
  return false;
};

/**
 * Get required permissions for a specific path (for managers)
 * @param {string} path - The path to check
 * @returns {Array} Required permissions
 */
export const getRequiredPermissionsForPath = (path) => {
  const pathPermissions = {
    "/inventory": ["view_inventory"],
    "/manager/inventory": ["view_inventory"],
    "/customers": ["view_customers"],
    "/manager/customers": ["view_customers"],
    "/reports": ["view_reports"],
    "/manager/reports": ["view_reports"],
    "/employees": ["manage_employees"],
    "/manager/employees": ["manage_employees"],
    "/cashflow": ["view_financial"],
    "/accounts": ["view_financial"],
    "/settings": ["manage_settings"],
  };

  return pathPermissions[path] || ["view_dashboard"];
};

/**
 * Get the login redirect based on user role and intended path
 * @param {string} role - User role
 * @param {string} intendedPath - Path user was trying to access before login
 * @param {Array} userPermissions - User's permissions (for managers)
 * @returns {string} Path to redirect to
 */
export const getLoginRedirect = (
  role,
  intendedPath = "",
  userPermissions = []
) => {
  // If user was trying to access a specific path and has access to it
  if (intendedPath && hasPathAccess(role, intendedPath, userPermissions)) {
    return intendedPath;
  }

  // If intended path was a role-specific dashboard, redirect appropriately
  if (intendedPath.includes("/admin") && role === "admin") {
    return "/admin/dashboard";
  }
  if (intendedPath.includes("/manager") && role === "manager") {
    return "/manager/dashboard";
  }
  if (intendedPath.includes("/home") && role === "owner") {
    return "/home/dashboard";
  }

  // Otherwise, send to their default dashboard
  return getDashboardPath(role);
};

/**
 * Check if a user needs to select a business before accessing certain features
 * @param {string} userRole - User's role
 * @param {Object} currentBusiness - Currently selected business
 * @returns {boolean} Whether business selection is required
 */
export const requiresBusinessSelection = (userRole, currentBusiness) => {
  // Only owners need to select a business
  if (userRole !== "owner") return false;

  // If no business is selected, business selection is required
  return !currentBusiness || !currentBusiness.id;
};

/**
 * Get navigation menu items based on user role and permissions
 * @param {string} userRole - User's role
 * @param {Array} userPermissions - User's permissions (for managers)
 * @returns {Array} Navigation menu items
 */
export const getNavigationMenuItems = (userRole, userPermissions = []) => {
  const baseItems = [
    {
      name: "Dashboard",
      path: getDashboardPath(userRole),
      icon: "LayoutDashboard",
      roles: ["admin", "manager", "owner"],
    },
  ];

  const allMenuItems = [
    ...baseItems,
    {
      name: "Inventory",
      path: userRole === "owner" ? "/home/stock" : "/manager/inventory",
      icon: "Package",
      roles: ["owner", "manager"],
      permissions: ["view_inventory"],
    },
    {
      name: "Customers",
      path: userRole === "owner" ? "/home/customers" : "/manager/customers",
      icon: "Users",
      roles: ["owner", "manager"],
      permissions: ["view_customers"],
    },
    {
      name: "Employees",
      path: userRole === "owner" ? "/home/employees" : "/manager/employees",
      icon: "UserCheck",
      roles: ["owner", "manager"],
      permissions: ["manage_employees"],
    },
    {
      name: "Reports",
      path: userRole === "owner" ? "/home/reports" : "/manager/reports",
      icon: "BarChart3",
      roles: ["admin", "owner", "manager"],
      permissions: ["view_reports"],
    },
    {
      name: "Logistics",
      path: "/home/logistics",
      icon: "Truck",
      roles: ["owner"],
    },
    {
      name: "Cashflow",
      path: "/home/cashflow",
      icon: "DollarSign",
      roles: ["owner"],
    },
    {
      name: "Settings",
      path: userRole === "owner" ? "/home/settings" : "/manager/settings",
      icon: "Settings",
      roles: ["admin", "owner", "manager"],
      permissions: ["manage_settings"],
    },
  ];

  return allMenuItems.filter((item) => {
    // Check if user role is allowed
    if (!item.roles.includes(userRole)) return false;

    // For managers, check permissions
    if (userRole === "manager" && item.permissions) {
      return item.permissions.some((permission) =>
        userPermissions.includes(permission)
      );
    }

    return true;
  });
};

/**
 * Validate if current route matches user's role and permissions
 * @param {string} currentPath - Current route path
 * @param {string} userRole - User's role
 * @param {Array} userPermissions - User's permissions
 * @returns {Object} Validation result with isValid and redirectTo
 */
export const validateCurrentRoute = (
  currentPath,
  userRole,
  userPermissions = []
) => {
  const isValid = hasPathAccess(userRole, currentPath, userPermissions);

  if (isValid) {
    return { isValid: true, redirectTo: null };
  }

  return {
    isValid: false,
    redirectTo: getDashboardPath(userRole),
  };
};
