// src/components/Navbar.jsx
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import BusinessSelector from "./BusinessSelector";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Users,
  UserCheck,
  Truck,
  CreditCard,
  TrendingUp,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  ChevronLeft,
  Building2,
  Wallet, // Added for Accounts
} from "lucide-react";

// Navigation Item Component
const NavItem = ({ icon, label, to, isActive, isExpanded, onClick }) => {
  const baseClasses = `flex items-center p-3 rounded-lg transition-colors duration-200 ${
    isActive
      ? "bg-blue-100 text-blue-700 shadow-sm"
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  }`;

  if (!isExpanded) {
    if (onClick) {
      return (
        <button
          onClick={onClick}
          className={`${baseClasses} w-full justify-center`}
          title={label}
        >
          {icon}
        </button>
      );
    }
    return (
      <Link to={to} className={`${baseClasses} justify-center`} title={label}>
        {icon}
      </Link>
    );
  }

  const expandedClasses = `flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 ${
    isActive
      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600 font-medium shadow-sm"
      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
  }`;

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${expandedClasses} w-full text-left`}
      >
        <span className={`flex-shrink-0 ${isActive ? "text-blue-600" : ""}`}>
          {icon}
        </span>
        <span className="ml-3 text-sm font-medium">{label}</span>
      </button>
    );
  }

  return (
    <Link to={to} className={expandedClasses}>
      <span className={`flex-shrink-0 ${isActive ? "text-blue-600" : ""}`}>
        {icon}
      </span>
      <span className="ml-3 text-sm font-medium">{label}</span>
    </Link>
  );
};

const Navbar = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const path = location.pathname;

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const navItems = [
    {
      to: "/home",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      to: "/home/inventory",
      label: "Inventory",
      icon: <Package className="h-5 w-5" />,
    },
    {
      to: "/home/substock",
      label: "Sub Stock",
      icon: <Warehouse className="h-5 w-5" />,
    },
    {
      to: "/home/customers",
      label: "Customers",
      icon: <Users className="h-5 w-5" />,
    },
    {
      to: "/home/employees",
      label: "Employees",
      icon: <UserCheck className="h-5 w-5" />,
    },
    {
      to: "/home/logistics",
      label: "Logistics",
      icon: <Truck className="h-5 w-5" />,
    },
    {
      to: "/home/mobile-stock/loading",
      label: "Loading & Unloading",
      icon: <Truck className="h-5 w-5" />,
    },
    {
      to: "/home/accounts",
      label: "Accounts",
      icon: <Wallet className="h-5 w-5" />, // Updated icon
    },
    {
      to: "/home/liabilities",
      label: "Liabilities",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      to: "/home/cashflows",
      label: "Cash Flows",
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      to: "/home/reports",
      label: "Reports",
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      to: "/home/settings",
      label: "Settings",
      icon: <Settings className="h-5 w-5" />,
    },
    {
      to: "/home/help",
      label: "Help & Support",
      icon: <HelpCircle className="h-5 w-5" />,
    },
  ];

  return (
    <div
      className={`bg-white h-screen border-r border-gray-200 shadow-sm transition-all duration-300 flex flex-col ${
        isExpanded ? "w-64" : "w-16"
      }`}
    >
      {/* Header with Logo and Toggle */}
      <div className="flex-shrink-0">
        <div
          className={`flex items-center px-4 py-4 border-b border-gray-200 ${
            isExpanded ? "justify-between" : "justify-center"
          }`}
        >
          {isExpanded && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                    Lumora
                  </span>
                  <span className="bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent font-extrabold">
                    Biz
                  </span>
                </h1>
                <p className="text-xs text-gray-500 leading-tight">
                  Smart Business Tools
                </p>
              </div>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-200"
            title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isExpanded ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Business Selector */}
        <div className="px-3 py-3 border-b border-gray-200">
          <BusinessSelector isExpanded={isExpanded} />
        </div>

        {/* User Info Section */}
        <div className="px-3 py-3 border-b border-gray-200">
          {isExpanded ? (
            <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                {currentUser?.displayName?.charAt(0) ||
                  currentUser?.email?.charAt(0) ||
                  "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {currentUser?.displayName || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {currentUser?.email}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-xs">
                {currentUser?.displayName?.charAt(0) ||
                  currentUser?.email?.charAt(0) ||
                  "U"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-3">
          <div className="space-y-1">
            {/* Main Navigation Items */}
            <div className="space-y-1">
              {navItems.slice(0, 3).map((item) => (
                <NavItem
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  isExpanded={isExpanded}
                  isActive={
                    (item.to === "/home" && path === "/home") ||
                    (item.to !== "/home" && path.startsWith(item.to))
                  }
                />
              ))}
            </div>

            {/* Customer & Employee Management */}
            {isExpanded && (
              <div className="pt-3">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  People
                </h3>
              </div>
            )}
            <div className="space-y-1">
              {navItems.slice(3, 5).map((item) => (
                <NavItem
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  isExpanded={isExpanded}
                  isActive={path.startsWith(item.to)}
                />
              ))}
            </div>

            {/* Operations */}
            {isExpanded && (
              <div className="pt-3">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Operations
                </h3>
              </div>
            )}
            <div className="space-y-1">
              {navItems.slice(5, 8).map((item) => (
                <NavItem
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  isExpanded={isExpanded}
                  isActive={path.startsWith(item.to)}
                />
              ))}
            </div>

            {/* Analytics & Settings */}
            {isExpanded && (
              <div className="pt-3">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  System
                </h3>
              </div>
            )}
            <div className="space-y-1">
              {navItems.slice(8).map((item) => (
                <NavItem
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  isExpanded={isExpanded}
                  isActive={path.startsWith(item.to)}
                />
              ))}
            </div>

            {/* Sign Out Button */}
            <div className="pt-4 mt-4 border-t border-gray-200">
              <NavItem
                label="Sign Out"
                icon={<LogOut className="h-5 w-5" />}
                isExpanded={isExpanded}
                isActive={false}
                onClick={handleLogout}
              />
            </div>
          </div>
        </nav>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200">
        {isExpanded ? (
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Powered by</p>
            <p className="text-xs font-medium text-gray-700">
              Lumora Ventures Pvt Ltd
            </p>
            <p className="text-xs text-gray-400 mt-1">v2.1.0</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-4 w-4 text-gray-600" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;