// src/components/ManagerNavbarLayout.jsx
import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import logo from "../../assets/logo.png";

import {
  LayoutDashboard,
  Package,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Building2,
  ChevronDown,
  UserCheck,
  Shield,
} from "lucide-react";

// Navigation Item Component
const NavItem = ({
  icon,
  label,
  to,
  isActive,
  onClick,
  mobile = false,
  hasDropdown = false,
  isDropdownOpen = false,
}) => {
  const baseClasses = mobile
    ? `flex items-center w-full px-4 py-3 text-left transition-all duration-200 ${
        isActive
          ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
      }`
    : `flex items-center px-2.5 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
        isActive || isDropdownOpen
          ? "bg-blue-50 text-blue-700"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`;

  const content = (
    <>
      <span className="flex-shrink-0">{icon}</span>
      <span className={`${mobile ? "ml-3" : "ml-2"} truncate`}>{label}</span>
      {hasDropdown && (
        <ChevronDown
          className={`h-3.5 w-3.5 ml-auto transition-transform duration-200 ${
            isDropdownOpen ? "rotate-180" : ""
          }`}
        />
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={baseClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={baseClasses}>
      {content}
    </button>
  );
};

const ManagerNavbarLayout = ({ children }) => {
  const { currentUser, logout, userProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Manager navigation structure
  const navigationStructure = {
    dashboard: {
      to: "/manager/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    inventory: {
      to: "/manager/inventory",
      label: "Inventory",
      icon: <Package className="h-4 w-4" />,
    },
    customers: {
      to: "/manager/customers",
      label: "Customers",
      icon: <Users className="h-4 w-4" />,
    },
    employees: {
      to: "/manager/employees",
      label: "Employees",
      icon: <UserCheck className="h-4 w-4" />,
    },
    reports: {
      to: "/manager/reports",
      label: "Reports",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    help: {
      to: "/manager/help",
      label: "Help",
      icon: <HelpCircle className="h-4 w-4" />,
    },
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Horizontal Navbar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            {/* Logo Section */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                  <img
                    src={logo}
                    alt="LumoraBiz Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-base font-bold tracking-tight">
                    <span className="text-gray-800">Manager</span>
                    <span className="text-green-600"> Portal</span>
                  </h1>
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-0.5 flex-1 justify-center max-w-4xl mx-4">
              {/* Dashboard */}
              <NavItem
                to={navigationStructure.dashboard.to}
                label={navigationStructure.dashboard.label}
                icon={navigationStructure.dashboard.icon}
                isActive={path === "/manager/dashboard"}
              />

              {/* Inventory */}
              <NavItem
                to={navigationStructure.inventory.to}
                label={navigationStructure.inventory.label}
                icon={navigationStructure.inventory.icon}
                isActive={path.startsWith("/manager/inventory")}
              />

              {/* Customers */}
              <NavItem
                to={navigationStructure.customers.to}
                label={navigationStructure.customers.label}
                icon={navigationStructure.customers.icon}
                isActive={path.startsWith("/manager/customers")}
              />

              {/* Employees */}
              <NavItem
                to={navigationStructure.employees.to}
                label={navigationStructure.employees.label}
                icon={navigationStructure.employees.icon}
                isActive={path.startsWith("/manager/employees")}
              />

              {/* Reports */}
              <NavItem
                to={navigationStructure.reports.to}
                label={navigationStructure.reports.label}
                icon={navigationStructure.reports.icon}
                isActive={path.startsWith("/manager/reports")}
              />

              {/* Help */}
              <NavItem
                to={navigationStructure.help.to}
                label={navigationStructure.help.label}
                icon={navigationStructure.help.icon}
                isActive={path.startsWith("/manager/help")}
              />
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-3">
              {/* User Info - Desktop */}
              <div className="hidden lg:flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {userProfile?.name || currentUser?.displayName || "Manager"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {userProfile?.role || "Manager"}
                  </p>
                </div>
                <div className="h-8 w-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                  {currentUser?.displayName?.charAt(0)?.toUpperCase() ||
                    currentUser?.email?.charAt(0)?.toUpperCase() ||
                    "M"}
                </div>
              </div>

              {/* Logout - Desktop */}
              <button
                onClick={handleLogout}
                className="hidden lg:flex items-center px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-transform duration-300 ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-gray-900 transition-opacity duration-300 ${
            isMobileMenuOpen ? "opacity-50" : "opacity-0"
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Menu Panel */}
        <div className="absolute right-0 top-0 h-full w-80 max-w-full bg-white shadow-xl overflow-y-auto">
          {/* Mobile Menu Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Manager Menu
            </h2>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User Info */}
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white font-medium text-sm">
                {currentUser?.displayName?.charAt(0)?.toUpperCase() ||
                  currentUser?.email?.charAt(0)?.toUpperCase() ||
                  "M"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userProfile?.name || currentUser?.displayName || "Manager"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {currentUser?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="py-2">
            {/* Dashboard */}
            <NavItem
              to={navigationStructure.dashboard.to}
              label={navigationStructure.dashboard.label}
              icon={navigationStructure.dashboard.icon}
              mobile={true}
              isActive={path === "/manager/dashboard"}
            />

            {/* Inventory */}
            <NavItem
              to={navigationStructure.inventory.to}
              label={navigationStructure.inventory.label}
              icon={navigationStructure.inventory.icon}
              mobile={true}
              isActive={path.startsWith("/manager/inventory")}
            />

            {/* Customers */}
            <NavItem
              to={navigationStructure.customers.to}
              label={navigationStructure.customers.label}
              icon={navigationStructure.customers.icon}
              mobile={true}
              isActive={path.startsWith("/manager/customers")}
            />

            {/* Employees */}
            <NavItem
              to={navigationStructure.employees.to}
              label={navigationStructure.employees.label}
              icon={navigationStructure.employees.icon}
              mobile={true}
              isActive={path.startsWith("/manager/employees")}
            />

            {/* Reports */}
            <NavItem
              to={navigationStructure.reports.to}
              label={navigationStructure.reports.label}
              icon={navigationStructure.reports.icon}
              mobile={true}
              isActive={path.startsWith("/manager/reports")}
            />

            {/* Help */}
            <NavItem
              to={navigationStructure.help.to}
              label={navigationStructure.help.label}
              icon={navigationStructure.help.icon}
              mobile={true}
              isActive={path.startsWith("/manager/help")}
            />

            {/* Logout */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative">{children || <Outlet />}</main>
    </div>
  );
};

export default ManagerNavbarLayout;
