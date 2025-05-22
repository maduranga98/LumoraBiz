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
// import { Dashboard } from "./pages/home/pages/Dashboard";
import { AuthProvider } from "./contexts/AuthContext";
import PrivateRoute from "./components/auth/PrivateRoute";
import { Dashboard } from "./pages/home/pages/Dashboard";
import { Logistics } from "./pages/home/pages/Logistics";
import Employees from "./pages/home/pages/Employees";

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

            {/* Protected Routes */}
            <Route
              path="/home"
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="inventory" element={<Stock />} />
              <Route path="customers" element={<Customers />} />
              <Route path="employees" element={<Employees />} />
              <Route path="logistics" element={<Logistics />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="help" element={<ContactUs />} />
            </Route>

            {/* Redirect paths for navbar links */}
            <Route
              path="/inventory"
              element={<Navigate to="/home/inventory" replace />}
            />
            <Route
              path="/customers"
              element={<Navigate to="/home/customers" replace />}
            />
            <Route
              path="/employees"
              element={<Navigate to="/home/employees" replace />}
            />
            <Route
              path="/logistics"
              element={<Navigate to="/home/logistics" replace />}
            />
            <Route
              path="/reports"
              element={<Navigate to="/home/reports" replace />}
            />
            <Route
              path="/settings"
              element={<Navigate to="/home/settings" replace />}
            />
            <Route
              path="/help"
              element={<Navigate to="/home/help" replace />}
            />

            {/* Fallback for unknown routes */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
