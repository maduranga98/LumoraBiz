// src/components/Navbar.jsx - Updated with better color contrast
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import BusinessSelector from "./BusinessSelector";

// Navigation Icons
const DashboardIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
  </svg>
);

const InventoryIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
    <path
      fillRule="evenodd"
      d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"
      clipRule="evenodd"
    />
  </svg>
);

const CustomersIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
  </svg>
);

const Vehicle = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="lucide lucide-truck-icon lucide-truck"
  >
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
    <path d="M15 18H9" />
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
    <circle cx="17" cy="18" r="2" />
    <circle cx="7" cy="18" r="2" />
  </svg>
);
const ReportsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z"
      clipRule="evenodd"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
      clipRule="evenodd"
    />
  </svg>
);

const HelpIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
      clipRule="evenodd"
    />
  </svg>
);

const MenuToggleIcon = ({ isOpen }) => {
  return isOpen ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
      />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
};

// Updated NavItem component with better contrast
const NavItem = ({ icon, label, to, isActive }) => {
  return (
    <Link
      to={to}
      className={`flex items-center px-4 py-3 ${
        isActive
          ? "bg-indigo-100 text-indigo-800 font-medium border-r-4 border-indigo-600" // Improved contrast
          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
      } transition-colors rounded-l-md`}
    >
      <span className={`flex-shrink-0 ${isActive ? "text-indigo-600" : ""}`}>
        {icon}
      </span>
      <span className="ml-3">{label}</span>
    </Link>
  );
};

const Navbar = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const location = useLocation();
  const path = location.pathname;

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const navItems = [
    { to: "/home", label: "Dashboard", icon: <DashboardIcon /> },
    { to: "/home/inventory", label: "Inventory", icon: <InventoryIcon /> },
    { to: "/home/customers", label: "Customers", icon: <CustomersIcon /> },
    { to: "/home/logistics", label: "Logistics", icon: <Vehicle /> },
    { to: "/home/reports", label: "Reports", icon: <ReportsIcon /> },
    { to: "/home/settings", label: "Settings", icon: <SettingsIcon /> },
    { to: "/home/help", label: "Help & Support", icon: <HelpIcon /> },
  ];

  return (
    <div
      className={`bg-white h-screen border-r border-muted transition-all duration-300 ${
        isExpanded ? "w-64" : "w-16"
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Logo and toggle */}
        <div
          className={`flex items-center px-4 py-5 ${
            isExpanded ? "justify-between" : "justify-center"
          } border-b border-muted`}
        >
          {isExpanded && (
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                <span className="text-indigo-600">Lumora</span>
                <span className="text-cyan-600 font-extrabold">Biz</span>
              </h1>
              <p className="text-xs text-gray-500">
                Smart Tools for Smarter Business
              </p>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-full text-gray-500 hover:bg-gray-100"
          >
            <MenuToggleIcon isOpen={isExpanded} />
          </button>
        </div>

        {/* Business Selector */}
        <BusinessSelector isExpanded={isExpanded} />

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-2">
            {navItems.map((item) => (
              <div
                key={item.to}
                className={isExpanded ? "" : "flex justify-center"}
              >
                {isExpanded ? (
                  <NavItem
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    isActive={
                      (item.to === "/home" && path === "/home") ||
                      (item.to !== "/home" && path.startsWith(item.to))
                    }
                  />
                ) : (
                  <Link
                    to={item.to}
                    className={`p-3 rounded-lg ${
                      (item.to === "/home" && path === "/home") ||
                      (item.to !== "/home" && path.startsWith(item.to))
                        ? "bg-indigo-100 text-indigo-700" // Improved contrast for collapsed view
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                    title={item.label}
                  >
                    {item.icon}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Company Info */}
        <div className="p-4 text-center border-t border-muted">
          {isExpanded ? (
            <div>
              <p className="text-xs text-gray-500">Powered by</p>
              <p className="text-xs font-medium">Lumora Ventures Pvt Ltd</p>
            </div>
          ) : (
            <p className="text-xs text-gray-500">LV</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
