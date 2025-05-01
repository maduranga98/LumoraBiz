// src/App.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/auth/login";
import Home from "./pages/home/home";
import ErrorBoundary from "./components/ErrorBoundary";
import { Settings } from "./pages/home/pages/Settings";
import { Stock } from "./pages/home/pages/Stock";
import { Customers } from "./pages/home/pages/Customers";
import { ContactUs } from "./pages/home/pages/ContactUs";
import { Reports } from "./pages/home/pages/Reports";

const App = () => {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/analytics" element={<Stock />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/products" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<ContactUs />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
