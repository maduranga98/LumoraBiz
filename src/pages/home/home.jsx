// src/pages/home/home.jsx
import React, { useState } from "react";
import { useNavigate, Outlet, Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../contexts/AuthContext";
import { Dashboard } from "./pages/Dashboard";

const Home = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  return (
    <div className="flex">
      {/* Left Sidebar Navigation */}
      <Navbar />

      {/* Main Content */}
      <div className="flex-1 min-h-screen bg-bg flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-xl font-bold text-primary tracking-tight flex items-center">
              <span className="text-primary">Lumora</span>
              <span className="text-accent font-extrabold">Biz</span>
              <span className="ml-2 text-xs text-muted">
                Smart Tools for Smarter Business
              </span>
            </h1>
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-full bg-primary bg-opacity-10 text-primary hover:bg-opacity-20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
              </button>

              {/* User dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center text-text focus:outline-none"
                >
                  <span className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center mr-2">
                    {currentUser?.displayName?.charAt(0) || "U"}
                  </span>
                  <span className="mr-1">
                    {currentUser?.displayName || "User"}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-muted">
                    <div className="py-1">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-text hover:bg-primary hover:bg-opacity-5"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        Your Profile
                      </Link>
                      <Link
                        to="/settings"
                        className="block px-4 py-2 text-sm text-text hover:bg-primary hover:bg-opacity-5"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        Settings
                      </Link>
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          handleLogout();
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-error hover:bg-error hover:bg-opacity-5"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 bg-bg overflow-auto">
          <div className="max-w-7xl mx-auto">
            {/* Dashboard content will be rendered here from React Router */}
            <Outlet />

            {/* Render the Dashboard component if we're on the /home route exactly */}
            {window.location.pathname === "/home" && <Dashboard />}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-muted">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <p className="text-sm text-muted text-center">
              © {new Date().getFullYear()} Lumora Ventures Pvt Ltd. All rights
              reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Home;
