// src/App.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/auth/login";
import Signup from "./pages/auth/signup";
import Home from "./pages/home/home";

import ErrorBoundary from "./components/ErrorBoundary";
import { Settings } from "./pages/home/pages/Settings";
import { Stock } from "./pages/home/pages/Stock";
import { Customers } from "./pages/home/pages/Customers";
import { ContactUs } from "./pages/home/pages/ContactUs";
import { Reports } from "./pages/home/pages/Reports";

import { AuthProvider } from "./contexts/AuthContext";
import { BusinessProvider } from "./contexts/BusinessContext";
import PrivateRoute from "./components/auth/PrivateRoute";
import { Logistics } from "./pages/home/pages/Logistics";
import Employees from "./pages/home/pages/Employees";
import { SubStockPage } from "./pages/home/pages/SubStockPage";
import BusinessSelector from "./components/BusinessSelector";
import CashflowPage from "./pages/home/pages/CashflowPage";
import Liabilities from "./pages/liabilities/Liabilities";
import Accounts from "./pages/home/pages/Accounts";
import DayRoutine from "./pages/home/pages/DayRoutine";
import RoutesPlanning from "./pages/RoutesManager/RoutesPalning";
import AssignRoutes from "./pages/RoutesManager/AssignRoutes";
import Loading from "./components/loading/Loading";

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Routes - Home (Business Selection) */}
            <Route
              path="/home"
              element={
                <PrivateRoute>
                  <BusinessProvider>
                    <Home />
                  </BusinessProvider>
                </PrivateRoute>
              }
            >
              {/* Legacy routes for backward compatibility */}
              <Route path="inventory" element={<Stock />} />
              <Route path="substock" element={<SubStockPage />} />
              <Route path="customers" element={<Customers />} />
              <Route path="employees" element={<Employees />} />
              <Route path="logistics" element={<Logistics />} />
              <Route path="mobile-stock" element={<DayRoutine />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="liabilities" element={<Liabilities />} />
              <Route path="cashflows" element={<CashflowPage />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="help" element={<ContactUs />} />
              <Route path="mobile-stock/routes-planning" element={<RoutesPlanning />} />
              <Route path="mobile-stock/assign-routes" element={<AssignRoutes />} />
              <Route path="mobile-stock/loading" element={<Loading />} />

            </Route>

            {/* Protected Routes - Business Operations */}
            <Route
              path="/business/:businessId"
              element={
                <PrivateRoute>
                  <BusinessProvider>
                    <BusinessSelector />
                  </BusinessProvider>
                </PrivateRoute>
              }
            >
              {/* Business-specific routes */}
              <Route path="inventory" element={<Stock />} />
              <Route path="substock" element={<SubStockPage />} />
              <Route path="customers" element={<Customers />} />
              <Route path="employees" element={<Employees />} />
              <Route path="logistics" element={<Logistics />} />
              <Route path="mobile-stock" element={<DayRoutine />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="help" element={<ContactUs />} />
              <Route path="mobile-stock/routes-planning" element={<RoutesPlanning />} />
              <Route path="mobile-stock/assign-routes" element={<AssignRoutes />} />
              <Route path="mobile-stock/loading" element={<Loading />} />
            </Route>

            {/* Redirect legacy paths to home for business selection */}
            <Route
              path="/inventory"
              element={<Navigate to="/home" replace />}
            />
            <Route path="/substock" element={<Navigate to="/home" replace />} />
            <Route
              path="/customers"
              element={<Navigate to="/home" replace />}
            />
            <Route
              path="/employees"
              element={<Navigate to="/home" replace />}
            />
            <Route
              path="/logistics"
              element={<Navigate to="/home" replace />}
            />
            <Route
              path="/mobile-stock"
              element={<Navigate to="/home" replace />}
            />
            <Route path="/accounts" element={<Navigate to="/home" replace />} />
            <Route path="/reports" element={<Navigate to="/home" replace />} />
            <Route path="/settings" element={<Navigate to="/home" replace />} />
            <Route path="/help" element={<Navigate to="/home" replace />} />
            <Route path="/mobile-stock/routes-planning" element={<Navigate to="/home" replace />} />
            <Route path="/mobile-stock/assign-routes" element={<Navigate to="/home" replace />} />
            <Route path="/mobile-stock/loading" element={<Navigate to="/home" replace />} />

            {/* Fallback for unknown routes */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
