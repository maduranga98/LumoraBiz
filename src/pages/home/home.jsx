// src/pages/home/home.jsx
import React from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Dashboard } from "./pages/Dashboard";

const Home = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  // This component now only renders the Dashboard
  // The navbar is handled by NavbarLayout in App.jsx
  // Other routes (like /home/inventory) are handled by their respective components
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content Area */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Dashboard />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-4">
              <p className="text-sm text-gray-500">
                © {new Date().getFullYear()} Lumora Ventures Pvt Ltd. All rights
                reserved.
              </p>
            </div>
            <div className="mt-2 md:mt-0 flex items-center space-x-4">
              <Link
                to="/privacy"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                to="/terms"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Terms of Service
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                to="/support"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Support
              </Link>
              <span className="text-gray-300">|</span>
              <a
                href="mailto:support@lumoraventures.com"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
