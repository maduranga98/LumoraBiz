// src/routes/routes.jsx
import React from "react";
import { Navigate } from "react-router-dom";

// Auth components
import Login from "../pages/auth/login";
import Signup from "../pages/auth/Signup";

// Home/Owner components
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
import { Dashboard } from "../pages/home/pages/Dashboard";

// Enhanced Private Route Components
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { BusinessProvider } from "../contexts/BusinessContext";
import NavbarLayout from "../components/Navbar";

// Fallback components for admin/manager dashboards (if they don't exist)
const AdminDashboard = React.lazy(() =>
  import("../pages/admin/Dashboard").catch(() => ({
    default: () => (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Admin Dashboard
        </h1>
        <p className="text-gray-600">Admin dashboard coming soon...</p>
      </div>
    ),
  }))
);

const ManagerDashboard = () => (
  <div className="p-8 text-center">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Manager Dashboard</h1>
    <p className="text-gray-600">Manager dashboard coming soon...</p>
  </div>
);

// Unauthorized component
const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">403</h1>
      <p className="text-xl text-gray-600 mb-8">Unauthorized Access</p>
      <p className="text-gray-500">
        You don't have permission to access this page.
      </p>
    </div>
  </div>
);

// Combined routes array for App.jsx
export const routes = [
  // Public routes
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

  // Admin routes
  {
    path: "/admin/dashboard",
    element: (
      <ProtectedRoute adminOnly>
        <React.Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
            </div>
          }
        >
          <AdminDashboard />
        </React.Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/*",
    element: (
      <ProtectedRoute adminOnly>
        <Navigate to="/admin/dashboard" replace />
      </ProtectedRoute>
    ),
  },

  // Manager routes
  {
    path: "/manager/dashboard",
    element: (
      <ProtectedRoute managerOnly>
        <NavbarLayout>
          <ManagerDashboard />
        </NavbarLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/inventory",
    element: (
      <ProtectedRoute managerOnly requirePermissions={["view_inventory"]}>
        <NavbarLayout>
          <Stock />
        </NavbarLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/customers",
    element: (
      <ProtectedRoute managerOnly requirePermissions={["view_customers"]}>
        <NavbarLayout>
          <Customers />
        </NavbarLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/reports",
    element: (
      <ProtectedRoute managerOnly requirePermissions={["view_reports"]}>
        <NavbarLayout>
          <Reports />
        </NavbarLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/*",
    element: (
      <ProtectedRoute managerOnly>
        <Navigate to="/manager/dashboard" replace />
      </ProtectedRoute>
    ),
  },

  // Business selector for owners
  {
    path: "/business-select",
    element: (
      <ProtectedRoute ownerOnly>
        <BusinessSelector />
      </ProtectedRoute>
    ),
  },

  // Owner routes with nested structure
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
      {
        path: "cashflows",
        element: <CashflowPage />,
      },
      {
        path: "liabilities",
        element: <Liabilities />,
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
    ],
  },

  // Shared route examples (if needed)
  {
    path: "/inventory",
    element: (
      <ProtectedRoute
        allowedRoles={["owner", "manager"]}
        requirePermissions={["view_inventory"]}
      >
        <BusinessProvider>
          <NavbarLayout>
            <Stock />
          </NavbarLayout>
        </BusinessProvider>
      </ProtectedRoute>
    ),
  },

  // Legacy redirects
  {
    path: "/admin",
    element: <Navigate to="/admin/dashboard" replace />,
  },
  {
    path: "/manager",
    element: <Navigate to="/manager/dashboard" replace />,
  },

  // Fallback routes
  {
    path: "/dashboard",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
];

// Export individual route arrays for advanced usage (optional)
export const publicRoutes = routes.slice(0, 4);
export const adminRoutes = routes.slice(4, 7);
export const managerRoutes = routes.slice(7, 12);
export const ownerRoutes = routes.slice(13, 15);

export default routes;
