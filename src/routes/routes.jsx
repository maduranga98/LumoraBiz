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
import { ManagerBusinessProvider } from "../contexts/ManagerBusinessContext";
import NavbarLayout from "../components/Navbar";
import ManagerNavbarLayout from "../pages/manager/ManagerNavbarLayout";
import ManagerDashboard from "../pages/manager/ManagerDashboard";

// Manager-specific components - Import your actual manager components
import ManagerEmployeeDirectory from "../pages/manager/components/managerEmployee/ManagerEmployeeDirectory";
import ManagerAddingEmployees from "../pages/manager/components/managerEmployee/ManagerAddingEmployees";
import ManagerMarkAttendance from "../pages/manager/components/managerEmployee/ManagerMarkAttendance";
import { ManagerWorkAssigned } from "../pages/manager/components/managerEmployee/ManagerWorkedAssigned";
import { ManagerAssigedWorkList } from "../pages/manager/components/managerEmployee/ManagerAssignedWrokList";
import ManagerLeaveRequest from "../pages/manager/components/managerEmployee/ManagerLeaveRequest";
import ManagerAdddingExpenses from "../pages/manager/components/Managerlogisitics/ManagerAddingExpenses";
import ManagerLogisticsExpensesList from "../pages/manager/components/Managerlogisitics/ManagerLogisticsExpensesList";
import ManagerSchedule from "../pages/manager/components/Managerlogisitics/ManagerLogisticsSchedule";
import ManagerAddingPaddy from "../pages/manager/components/Inventory/ManagerAddingPaddy";
import { ManagerAddingSubItems } from "../pages/manager/components/Inventory/ManagerAddingSubStock";
import { SubStock } from "../pages/manager/components/Inventory/SubStock";
import { SubStockItemMoves } from "../pages/manager/components/Inventory/SubStockItemMoves";
import { SubStockHistory } from "../pages/manager/components/Inventory/SubStockHistory";

// Manager components - using existing components with manager context for basic pages
const ManagerCustomers = () => <Customers />; // Customer management
const ManagerReports = () => <Reports />; // Reports

// Fallback components for missing manager pages
const ManagerProductionScheduling = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">
      Production Scheduling
    </h1>
    <p className="text-gray-600">
      Production scheduling functionality coming soon...
    </p>
  </div>
);

const ManagerQualityControl = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Quality Control</h1>
    <p className="text-gray-600">Quality control management coming soon...</p>
  </div>
);

const ManagerYieldAnalysis = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Yield Analysis</h1>
    <p className="text-gray-600">Yield analysis reports coming soon...</p>
  </div>
);

const ManagerSuppliers = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">
      Supplier Management
    </h1>
    <p className="text-gray-600">
      Supplier management functionality coming soon...
    </p>
  </div>
);

const ManagerOrders = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Management</h1>
    <p className="text-gray-600">
      Order management functionality coming soon...
    </p>
  </div>
);

const ManagerFinancialDashboard = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">
      Financial Dashboard
    </h1>
    <p className="text-gray-600">Financial dashboard coming soon...</p>
  </div>
);

const ManagerCashFlow = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Cash Flow</h1>
    <p className="text-gray-600">Cash flow tracking coming soon...</p>
  </div>
);

const ManagerExpenses = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">
      Expense Management
    </h1>
    <p className="text-gray-600">
      Expense management functionality coming soon...
    </p>
  </div>
);

const ManagerBusinessAnalytics = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">
      Business Analytics
    </h1>
    <p className="text-gray-600">Business analytics coming soon...</p>
  </div>
);

const ManagerPerformanceReports = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">
      Performance Reports
    </h1>
    <p className="text-gray-600">Performance reports coming soon...</p>
  </div>
);

const ManagerCustomReports = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Custom Reports</h1>
    <p className="text-gray-600">Custom report builder coming soon...</p>
  </div>
);

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

// Help page for managers
const ManagerHelp = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Help & Support</h1>
    <p className="text-gray-600 mb-4">Manager help and support information.</p>
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="font-semibold text-blue-900 mb-2">Contact Support</h3>
      <p className="text-blue-700">
        For technical assistance, please contact your system administrator.
      </p>
    </div>
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

  // Manager routes - ALL MANAGER ROUTES WITH CORRECT PATHS
  {
    path: "/manager/dashboard",
    element: (
      <ProtectedRoute managerOnly>
        <ManagerNavbarLayout>
          <ManagerDashboard />
        </ManagerNavbarLayout>
      </ProtectedRoute>
    ),
  },

  // Employee Management Routes
  {
    path: "/manager/employees/directory",
    element: (
      <ProtectedRoute managerOnly requirePermissions={["manage_employees"]}>
        <ManagerBusinessProvider>
          <ManagerNavbarLayout>
            <ManagerEmployeeDirectory />
          </ManagerNavbarLayout>
        </ManagerBusinessProvider>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/employees/add",
    element: (
      <ProtectedRoute managerOnly requirePermissions={["manage_employees"]}>
        <ManagerBusinessProvider>
          <ManagerNavbarLayout>
            <ManagerAddingEmployees />
          </ManagerNavbarLayout>
        </ManagerBusinessProvider>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/employees/attendance",
    element: (
      <ProtectedRoute managerOnly requirePermissions={["manage_employees"]}>
        <ManagerBusinessProvider>
          <ManagerNavbarLayout>
            <ManagerMarkAttendance />
          </ManagerNavbarLayout>
        </ManagerBusinessProvider>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/employees/work-assignment",
    element: (
      <ProtectedRoute managerOnly requirePermissions={["manage_employees"]}>
        <ManagerBusinessProvider>
          <ManagerNavbarLayout>
            <ManagerWorkAssigned />
          </ManagerNavbarLayout>
        </ManagerBusinessProvider>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/employees/work-list",
    element: (
      <ProtectedRoute managerOnly requirePermissions={["manage_employees"]}>
        <ManagerBusinessProvider>
          <ManagerNavbarLayout>
            <ManagerAssigedWorkList />
          </ManagerNavbarLayout>
        </ManagerBusinessProvider>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/employees/leave-requests",
    element: (
      <ProtectedRoute managerOnly requirePermissions={["manage_employees"]}>
        <ManagerBusinessProvider>
          <ManagerNavbarLayout>
            <ManagerLeaveRequest />
          </ManagerNavbarLayout>
        </ManagerBusinessProvider>
      </ProtectedRoute>
    ),
  },

  // Inventory Management Routes
  {
    path: "/manager/inventory/main",
    element: (
      <ProtectedRoute managerOnly requirePermissions={["view_inventory"]}>
        <ManagerBusinessProvider>
          <ManagerNavbarLayout>
            <ManagerAddingPaddy />
          </ManagerNavbarLayout>
        </ManagerBusinessProvider>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/inventory/add-paddy",
    element: (
      <ProtectedRoute managerOnly requirePermissions={["view_inventory"]}>
        <ManagerBusinessProvider>
          <ManagerNavbarLayout>
            <ManagerAddingPaddy />
          </ManagerNavbarLayout>
        </ManagerBusinessProvider>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/inventory/sub-stock",
    element: (
      <ProtectedRoute managerOnly requirePermissions={["view_inventory"]}>
        <ManagerBusinessProvider>
          <ManagerNavbarLayout>
            <SubStock />
          </ManagerNavbarLayout>
        </ManagerBusinessProvider>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/inventory/add-sub-items",
    element: (
      <ProtectedRoute managerOnly requirePermissions={["view_inventory"]}>
        <ManagerBusinessProvider>
          <ManagerNavbarLayout>
            <ManagerAddingSubItems />
          </ManagerNavbarLayout>
        </ManagerBusinessProvider>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/inventory/sub-stock-moves",
    element: (
      <ProtectedRoute managerOnly requirePermissions={["view_inventory"]}>
        <ManagerBusinessProvider>
          <ManagerNavbarLayout>
            <SubStockItemMoves />
          </ManagerNavbarLayout>
        </ManagerBusinessProvider>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/inventory/sub-stock-history",
    element: (
      <ProtectedRoute managerOnly requirePermissions={["view_inventory"]}>
        <ManagerBusinessProvider>
          <ManagerNavbarLayout>
            <SubStockHistory />
          </ManagerNavbarLayout>
        </ManagerBusinessProvider>
      </ProtectedRoute>
    ),
  },

  // Production Management Routes
  {
    path: "/manager/production/scheduling",
    element: (
      <ProtectedRoute managerOnly>
        <ManagerNavbarLayout>
          <ManagerProductionScheduling />
        </ManagerNavbarLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/production/quality-control",
    element: (
      <ProtectedRoute managerOnly>
        <ManagerNavbarLayout>
          <ManagerQualityControl />
        </ManagerNavbarLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/production/yield-analysis",
    element: (
      <ProtectedRoute managerOnly>
        <ManagerNavbarLayout>
          <ManagerYieldAnalysis />
        </ManagerNavbarLayout>
      </ProtectedRoute>
    ),
  },

  // Customer & Supplier Management Routes
  {
    path: "/manager/suppliers",
    element: (
      <ProtectedRoute managerOnly>
        <ManagerBusinessProvider>
          <ManagerNavbarLayout>
            <ManagerSuppliers />
          </ManagerNavbarLayout>
        </ManagerBusinessProvider>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/customers",
    element: (
      <ProtectedRoute managerOnly requirePermissions={["view_customers"]}>
        <ManagerBusinessProvider>
          <ManagerNavbarLayout>
            <ManagerCustomers />
          </ManagerNavbarLayout>
        </ManagerBusinessProvider>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/orders",
    element: (
      <ProtectedRoute managerOnly>
        <ManagerBusinessProvider>
          <ManagerNavbarLayout>
            <ManagerOrders />
          </ManagerNavbarLayout>
        </ManagerBusinessProvider>
      </ProtectedRoute>
    ),
  },

  // Logistics & Equipment Routes
  {
    path: "/manager/logistics/vehicles",
    element: (
      <ProtectedRoute managerOnly>
        <ManagerBusinessProvider>
          <ManagerNavbarLayout>
            <ManagerLogisticsExpensesList />
          </ManagerNavbarLayout>
        </ManagerBusinessProvider>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/logistics/add-expenses",
    element: (
      <ProtectedRoute managerOnly>
        <ManagerBusinessProvider>
          <ManagerNavbarLayout>
            <ManagerAdddingExpenses />
          </ManagerNavbarLayout>
        </ManagerBusinessProvider>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/logistics/expenses-list",
    element: (
      <ProtectedRoute managerOnly>
        <ManagerBusinessProvider>
          <ManagerNavbarLayout>
            <ManagerLogisticsExpensesList />
          </ManagerNavbarLayout>
        </ManagerBusinessProvider>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/logistics/maintenance",
    element: (
      <ProtectedRoute managerOnly>
        <ManagerBusinessProvider>
          <ManagerNavbarLayout>
            <ManagerSchedule />
          </ManagerNavbarLayout>
        </ManagerBusinessProvider>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/logistics/scheduling",
    element: (
      <ProtectedRoute managerOnly>
        <ManagerBusinessProvider>
          <ManagerNavbarLayout>
            <ManagerSchedule />
          </ManagerNavbarLayout>
        </ManagerBusinessProvider>
      </ProtectedRoute>
    ),
  },

  // Financial Management Routes
  {
    path: "/manager/financial/dashboard",
    element: (
      <ProtectedRoute managerOnly>
        <ManagerNavbarLayout>
          <ManagerFinancialDashboard />
        </ManagerNavbarLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/financial/cash-flow",
    element: (
      <ProtectedRoute managerOnly>
        <ManagerNavbarLayout>
          <ManagerCashFlow />
        </ManagerNavbarLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/financial/expenses",
    element: (
      <ProtectedRoute managerOnly>
        <ManagerNavbarLayout>
          <ManagerExpenses />
        </ManagerNavbarLayout>
      </ProtectedRoute>
    ),
  },

  // Analytics & Reports Routes
  {
    path: "/manager/reports/business-analytics",
    element: (
      <ProtectedRoute managerOnly requirePermissions={["view_reports"]}>
        <ManagerNavbarLayout>
          <ManagerBusinessAnalytics />
        </ManagerNavbarLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/reports/performance",
    element: (
      <ProtectedRoute managerOnly requirePermissions={["view_reports"]}>
        <ManagerNavbarLayout>
          <ManagerPerformanceReports />
        </ManagerNavbarLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/manager/reports/custom",
    element: (
      <ProtectedRoute managerOnly requirePermissions={["view_reports"]}>
        <ManagerNavbarLayout>
          <ManagerCustomReports />
        </ManagerNavbarLayout>
      </ProtectedRoute>
    ),
  },

  // Legacy manager routes (for backward compatibility)
  {
    path: "/manager/inventory",
    element: <Navigate to="/manager/inventory/main" replace />,
  },
  {
    path: "/manager/employees",
    element: <Navigate to="/manager/employees/directory" replace />,
  },
  {
    path: "/manager/logistics",
    element: <Navigate to="/manager/logistics/vehicles" replace />,
  },
  {
    path: "/manager/reports",
    element: <Navigate to="/manager/reports/business-analytics" replace />,
  },

  // Help route
  {
    path: "/manager/help",
    element: (
      <ProtectedRoute managerOnly>
        <ManagerNavbarLayout>
          <ManagerHelp />
        </ManagerNavbarLayout>
      </ProtectedRoute>
    ),
  },

  // Manager fallback
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
export const managerRoutes = routes.slice(7, 32); // Updated to include all manager routes
export const ownerRoutes = routes.slice(33, 35); // Updated slice indices

export default routes;
