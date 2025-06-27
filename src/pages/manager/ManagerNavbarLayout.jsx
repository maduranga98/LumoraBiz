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
  Factory,
  Truck,
  DollarSign,
  ShoppingCart,
  Briefcase,
  FileText,
  Wrench,
  Calendar,
  ClipboardList,
  TrendingUp,
  PieChart,
  UserPlus,
  Clock,
  CheckSquare,
  Plus,
  List,
  Move,
  History,
  Receipt,
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
  children,
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
      <div className={mobile ? "block" : "relative"}>
        <Link to={to} className={baseClasses}>
          {content}
        </Link>
        {hasDropdown && isDropdownOpen && children && (
          <div
            className={
              mobile
                ? "pl-8 py-2"
                : "absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
            }
          >
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={mobile ? "block" : "relative"}>
      <button onClick={onClick} className={baseClasses}>
        {content}
      </button>
      {hasDropdown && isDropdownOpen && children && (
        <div
          className={
            mobile
              ? "pl-8 py-2"
              : "absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
          }
        >
          {children}
        </div>
      )}
    </div>
  );
};

// Dropdown menu item component
const DropdownItem = ({ to, icon, label, mobile = false }) => {
  const classes = mobile
    ? "flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
    : "flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md mx-2";

  return (
    <Link to={to} className={classes}>
      {icon && <span className="mr-3 flex-shrink-0">{icon}</span>}
      <span>{label}</span>
    </Link>
  );
};

const ManagerNavbarLayout = ({ children }) => {
  const { currentUser, logout, userProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Enhanced manager navigation structure with your actual components
  const navigationStructure = {
    dashboard: {
      to: "/manager/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },

    // Employee Management with dropdown
    employees: {
      label: "Employees",
      icon: <Users className="h-4 w-4" />,
      hasDropdown: true,
      items: [
        {
          to: "/manager/employees/directory",
          label: "Employee Directory",
          icon: <Users className="h-4 w-4" />,
        },
        {
          to: "/manager/employees/add",
          label: "Add Employee",
          icon: <UserPlus className="h-4 w-4" />,
        },
        {
          to: "/manager/employees/attendance",
          label: "Mark Attendance",
          icon: <Clock className="h-4 w-4" />,
        },
        {
          to: "/manager/employees/work-assignment",
          label: "Work Assignment",
          icon: <ClipboardList className="h-4 w-4" />,
        },
        {
          to: "/manager/employees/work-list",
          label: "Assigned Work List",
          icon: <CheckSquare className="h-4 w-4" />,
        },
        {
          to: "/manager/employees/leave-requests",
          label: "Leave Requests",
          icon: <Calendar className="h-4 w-4" />,
        },
      ],
    },

    // Inventory Management with dropdown
    inventory: {
      label: "Inventory",
      icon: <Package className="h-4 w-4" />,
      hasDropdown: true,
      items: [
        {
          to: "/manager/inventory/main",
          label: "Main Inventory",
          icon: <Package className="h-4 w-4" />,
        },
        {
          to: "/manager/inventory/add-paddy",
          label: "Add Paddy Stock",
          icon: <Plus className="h-4 w-4" />,
        },
        {
          to: "/manager/inventory/sub-stock",
          label: "Material Stock",
          icon: <List className="h-4 w-4" />,
        },
        {
          to: "/manager/inventory/add-sub-items",
          label: "Add Material Items",
          icon: <Plus className="h-4 w-4" />,
        },
        {
          to: "/manager/inventory/sub-stock-moves",
          label: "Stock Movements",
          icon: <Move className="h-4 w-4" />,
        },
        {
          to: "/manager/inventory/sub-stock-history",
          label: "Stock History",
          icon: <History className="h-4 w-4" />,
        },
      ],
    },

    // Logistics & Equipment
    logistics: {
      label: "Logistics",
      icon: <Truck className="h-4 w-4" />,
      hasDropdown: true,
      items: [
        {
          to: "/manager/logistics/vehicles",
          label: "Vehicle Management",
          icon: <Truck className="h-4 w-4" />,
        },
        {
          to: "/manager/logistics/add-expenses",
          label: "Add Vehicle Expenses",
          icon: <Plus className="h-4 w-4" />,
        },
        {
          to: "/manager/logistics/expenses-list",
          label: "Expenses List",
          icon: <Receipt className="h-4 w-4" />,
        },
        {
          to: "/manager/logistics/maintenance",
          label: "Equipment Maintenance",
          icon: <Wrench className="h-4 w-4" />,
        },
        {
          to: "/manager/logistics/scheduling",
          label: "Delivery Scheduling",
          icon: <Calendar className="h-4 w-4" />,
        },
      ],
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

  const handleDropdownToggle = (key) => {
    setActiveDropdown(activeDropdown === key ? null : key);
  };

  // Check if any item in dropdown is active
  const isDropdownActive = (items) => {
    return items?.some((item) => path.startsWith(item.to.split("?")[0]));
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdown(null);
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [path]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            {/* Logo Section */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-200 p-1">
                  <img
                    src={logo}
                    alt="LumoraBiz Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-base font-bold tracking-tight text-gray-800">
                    LumoraBiz Manager
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

              {/* Employees Dropdown */}
              <NavItem
                label={navigationStructure.employees.label}
                icon={navigationStructure.employees.icon}
                hasDropdown={true}
                isDropdownOpen={activeDropdown === "employees"}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDropdownToggle("employees");
                }}
                isActive={isDropdownActive(navigationStructure.employees.items)}
              >
                {navigationStructure.employees.items.map((item) => (
                  <DropdownItem
                    key={item.to}
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                  />
                ))}
              </NavItem>

              {/* Inventory Dropdown */}
              <NavItem
                label={navigationStructure.inventory.label}
                icon={navigationStructure.inventory.icon}
                hasDropdown={true}
                isDropdownOpen={activeDropdown === "inventory"}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDropdownToggle("inventory");
                }}
                isActive={isDropdownActive(navigationStructure.inventory.items)}
              >
                {navigationStructure.inventory.items.map((item) => (
                  <DropdownItem
                    key={item.to}
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                  />
                ))}
              </NavItem>

              {/* Logistics Dropdown */}
              <NavItem
                label={navigationStructure.logistics.label}
                icon={navigationStructure.logistics.icon}
                hasDropdown={true}
                isDropdownOpen={activeDropdown === "logistics"}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDropdownToggle("logistics");
                }}
                isActive={isDropdownActive(navigationStructure.logistics.items)}
              >
                {navigationStructure.logistics.items.map((item) => (
                  <DropdownItem
                    key={item.to}
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                  />
                ))}
              </NavItem>

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

            {/* Mobile menu items with expandable sections */}
            {Object.entries(navigationStructure).map(([key, section]) => {
              if (key === "dashboard" || key === "help") return null;

              return (
                <div
                  key={key}
                  className="border-b border-gray-100 last:border-b-0"
                >
                  <div className="px-4 py-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {section.label}
                    </h4>
                  </div>
                  {section.items?.map((item) => (
                    <DropdownItem
                      key={item.to}
                      to={item.to}
                      icon={item.icon}
                      label={item.label}
                      mobile={true}
                    />
                  ))}
                </div>
              );
            })}

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
