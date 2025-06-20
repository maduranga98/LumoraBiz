// src/routes/routes.jsx
import { Navigate } from "react-router-dom";
import Login from "../pages/auth/login";
import Signup from "../pages/auth/Signup";
import Home from "../pages/home/home";
import { Settings } from "../pages/home/pages/Settings";
import { Stock } from "../pages/home/pages/Stock";
import { Customers } from "../pages/home/pages/Customers";
import { ContactUs } from "../pages/home/pages/ContactUs";
import { Reports } from "../pages/home/pages/Reports";
import { Logistics } from "../pages/home/pages/Logistics";
import Employees from "../pages/home/pages/Employees";
import { SubStockPage } from "../pages/home/pages/SubStockPage";
import BusinessSelector from "../components/BusinessSelector";
import CashflowPage from "../pages/home/pages/CashflowPage";
import Liabilities from "../pages/liabilities/Liabilities";
import Accounts from "../pages/home/pages/Accounts";
import DayRoutine from "../pages/home/pages/DayRoutine";
import RoutesPlanning from "../pages/RoutesManager/RoutesPalning";
import AssignRoutes from "../pages/RoutesManager/AssignRoutes";
import Loading from "../components/loading/Loading";
import Unloading from "../components/loading/Unloading";

// Enhanced Private Route Component with Role-based Access
import ProtectedRoute from "../components/auth/ProtectedRoute";
import NavbarLayout from "../components/Navbar";
import { BusinessProvider } from "../contexts/BusinessContext";

// Role-based Dashboard Components
import AdminDashboard from "../pages/admin/Dashboard";
import ManagerDashboard from "../pages/manager/ManagerDashboard";
import { Dashboard } from "../pages/home/pages/Dashboard";
import Unauthorized from "../pages/Unauthorized";

// Public routes configuration
export const publicRoutes = [
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/signup",
    element: <Signup />,
  },
  {
    path: "/unauthorized",
    element: <Unauthorized />,
  },
];

// Admin-only routes (no navbar)
export const adminRoutes = [
  {
    path: "/admin/dashboard",
    element: (
      <ProtectedRoute adminOnly>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
];

// Manager-only routes (with limited navbar)
export const managerRoutes = [
  {
    path: "/manager/dashboard",
    element: (
      <ProtectedRoute managerOnly>
        <ManagerDashboard />
      </ProtectedRoute>
    ),
  },
];

// Owner routes with full access (existing /home structure)
export const ownerRoutes = [
  {
    path: "/home",
    element: (
      <ProtectedRoute ownerOnly>
        <BusinessProvider>
          <NavbarLayout />
        </BusinessProvider>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "inventory",
        element: <Stock />,
      },
      {
        path: "substock",
        element: <SubStockPage />,
      },
      {
        path: "customers",
        element: <Customers />,
      },
      {
        path: "employees",
        element: <Employees />,
      },
      {
        path: "logistics",
        element: <Logistics />,
      },
      {
        path: "mobile-stock",
        element: <DayRoutine />,
      },
      {
        path: "accounts",
        element: <Accounts />,
      },
      {
        path: "liabilities",
        element: <Liabilities />,
      },
      {
        path: "cashflows",
        element: <CashflowPage />,
      },
      {
        path: "reports",
        element: <Reports />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "help",
        element: <ContactUs />,
      },
      {
        path: "mobile-stock/routes-planning",
        element: <RoutesPlanning />,
      },
      {
        path: "mobile-stock/assign-routes",
        element: <AssignRoutes />,
      },
      {
        path: "mobile-stock/loading",
        element: <Loading />,
      },
      {
        path: "mobile-stock/unloading",
        element: <Unloading />,
      },
    ],
  },
  {
    path: "/business/:businessId",
    element: (
      <ProtectedRoute ownerOnly>
        <BusinessProvider>
          <NavbarLayout />
        </BusinessProvider>
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <BusinessSelector />,
      },
      {
        path: "inventory",
        element: <Stock />,
      },
      {
        path: "substock",
        element: <SubStockPage />,
      },
      {
        path: "customers",
        element: <Customers />,
      },
      {
        path: "employees",
        element: <Employees />,
      },
      {
        path: "logistics",
        element: <Logistics />,
      },
      {
        path: "mobile-stock",
        element: <DayRoutine />,
      },
      {
        path: "accounts",
        element: <Accounts />,
      },
      {
        path: "reports",
        element: <Reports />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "help",
        element: <ContactUs />,
      },
      {
        path: "mobile-stock/routes-planning",
        element: <RoutesPlanning />,
      },
      {
        path: "mobile-stock/assign-routes",
        element: <AssignRoutes />,
      },
      {
        path: "mobile-stock/loading",
        element: <Loading />,
      },
    ],
  },
];

// Alternative owner routes structure (/owner prefix)
export const alternativeOwnerRoutes = [
  {
    path: "/owner/*",
    element: (
      <ProtectedRoute ownerOnly>
        <BusinessProvider>
          <NavbarLayout />
        </BusinessProvider>
      </ProtectedRoute>
    ),
    children: [
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "inventory",
        element: <Stock />,
      },
      {
        path: "substock",
        element: <SubStockPage />,
      },
      {
        path: "employees",
        element: <Employees />,
      },
      {
        path: "logistics",
        element: <Logistics />,
      },
      {
        path: "customers",
        element: <Customers />,
      },
      {
        path: "mobile-stock/loading",
        element: <Loading />,
      },
      {
        path: "mobile-stock/unloading",
        element: <Unloading />,
      },
      {
        path: "mobile-stock/routes-planning",
        element: <RoutesPlanning />,
      },
      {
        path: "mobile-stock/assign-routes",
        element: <AssignRoutes />,
      },
      {
        path: "accounts",
        element: <Accounts />,
      },
      {
        path: "liabilities",
        element: <Liabilities />,
      },
      {
        path: "cashflows",
        element: <CashflowPage />,
      },
      {
        path: "reports",
        element: <Reports />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "help",
        element: <ContactUs />,
      },
    ],
  },
];

// Legacy redirects configuration - redirect old paths to role-appropriate dashboards
export const legacyRedirects = [
  "/inventory",
  "/substock",
  "/customers",
  "/employees",
  "/logistics",
  "/mobile-stock",
  "/accounts",
  "/reports",
  "/settings",
  "/help",
  "/mobile-stock/routes-planning",
  "/mobile-stock/assign-routes",
  "/mobile-stock/loading",
].map((path) => ({
  path,
  element: <Navigate to="/home" replace />,
}));

// Role-based redirects
export const roleRedirects = [
  {
    path: "/admin",
    element: <Navigate to="/admin/dashboard" replace />,
  },
  {
    path: "/manager",
    element: <Navigate to="/manager/dashboard" replace />,
  },
];

// Fallback route
export const fallbackRoute = {
  path: "*",
  element: <Navigate to="/login" replace />,
};

// Combined routes for easy export
export const routes = [
  ...publicRoutes,
  ...adminRoutes,
  ...managerRoutes,
  ...ownerRoutes,
  // ...alternativeOwnerRoutes, // Uncomment if you want /owner prefix
  ...roleRedirects,
  ...legacyRedirects,
  fallbackRoute,
];

// Route metadata for navigation structure (enhanced with role permissions)
export const routeMetadata = {
  admin: {
    allowedRoles: ["admin"],
    routes: {
      dashboard: {
        path: "/admin/dashboard",
        name: "Admin Dashboard",
        icon: "Shield",
      },
    },
  },
  manager: {
    allowedRoles: ["manager"],
    routes: {
      dashboard: {
        path: "/manager/dashboard",
        name: "Manager Dashboard",
        icon: "Users",
      },
    },
  },
  owner: {
    allowedRoles: ["owner"],
    routes: {
      dashboard: {
        path: "/home",
        name: "Dashboard",
        icon: "LayoutDashboard",
      },
      inventory: {
        name: "Inventory",
        icon: "Package",
        children: [
          {
            path: "/home/inventory",
            name: "Main Inventory",
            icon: "Package",
          },
          {
            path: "/home/substock",
            name: "Sub Inventory",
            icon: "Warehouse",
          },
        ],
      },
      operations: {
        name: "Operations",
        icon: "Users",
        children: [
          {
            path: "/home/employees",
            name: "Employees",
            icon: "Users",
          },
          {
            path: "/home/logistics",
            name: "Logistics",
            icon: "Truck",
          },
          {
            path: "/home/customers",
            name: "Customers",
            icon: "Users",
          },
        ],
      },
      dailyRoutine: {
        name: "Daily Routine",
        icon: "Calendar",
        children: [
          {
            path: "/home/mobile-stock/loading",
            name: "Loading",
            icon: "Truck",
          },
          {
            path: "/home/mobile-stock/unloading",
            name: "Unloading",
            icon: "Truck",
          },
          {
            path: "/home/mobile-stock",
            name: "Mobile Stock",
            icon: "Truck",
          },
          {
            path: "/home/mobile-stock/routes-planning",
            name: "Routes Planning",
            icon: "Truck",
          },
          {
            path: "/home/mobile-stock/assign-routes",
            name: "Assign Routes",
            icon: "Truck",
          },
        ],
      },
      accounts: {
        name: "Accounts",
        icon: "Wallet",
        children: [
          {
            path: "/home/accounts",
            name: "Main Accounts",
            icon: "Wallet",
          },
          {
            path: "/home/liabilities",
            name: "Liabilities",
            icon: "CreditCard",
          },
          {
            path: "/home/cashflows",
            name: "Cash Flow",
            icon: "TrendingUp",
          },
        ],
      },
      reports: {
        path: "/home/reports",
        name: "Reports",
        icon: "FileText",
      },
      system: {
        name: "System",
        icon: "Wrench",
        children: [
          {
            path: "/home/settings",
            name: "Settings",
            icon: "Settings",
          },
          {
            path: "/home/help",
            name: "Help & Support",
            icon: "HelpCircle",
          },
        ],
      },
    },
  },
};

// Helper function to get routes by role
export const getRoutesByRole = (userRole) => {
  return routeMetadata[userRole]?.routes || {};
};

// Helper function to check if user has access to a specific route
export const hasRouteAccess = (userRole, routePath) => {
  const roleMetadata = routeMetadata[userRole];
  if (!roleMetadata) return false;

  // Recursive function to check route access
  const checkAccess = (routes) => {
    for (const route of Object.values(routes)) {
      if (route.path === routePath) return true;
      if (route.children && checkAccess(route.children)) return true;
    }
    return false;
  };

  return checkAccess(roleMetadata.routes);
};
