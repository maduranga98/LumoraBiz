// src/components/Navbar.jsx
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import BusinessSelector from "./BusinessSelector";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Users,
  Truck,
  CreditCard,
  TrendingUp,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Wallet,
  ChevronDown,
  Calendar,
  FileText,
  Wrench,
} from "lucide-react";
import logo from "../assets/logo.png";

const NavbarLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({});

  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const path = location.pathname;

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setOpenDropdowns({});
  }, [location]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const toggleMobileDropdown = (dropdownName) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [dropdownName]: !prev[dropdownName],
    }));
  };

  const isActive = (itemPath) => {
    if (itemPath === "/home") return path === "/home";
    return path.startsWith(itemPath);
  };

  // Navigation structure
  const navigationItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
      to: "/home",
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: <Package className="h-4 w-4" />,
      submenu: [
        {
          label: "Main Inventory",
          to: "/home/inventory",
          icon: <Package className="h-4 w-4" />,
        },
        {
          label: "Sub Inventory",
          to: "/home/substock",
          icon: <Warehouse className="h-4 w-4" />,
        },
      ],
    },
    {
      id: "operations",
      label: "Operations",
      icon: <Users className="h-4 w-4" />,
      submenu: [
        {
          label: "Employees",
          to: "/home/employees",
          icon: <Users className="h-4 w-4" />,
        },
        {
          label: "Logistics",
          to: "/home/logistics",
          icon: <Truck className="h-4 w-4" />,
        },
        {
          label: "Customers",
          to: "/home/customers",
          icon: <Users className="h-4 w-4" />,
        },
      ],
    },
    {
      id: "daily",
      label: "Daily",
      icon: <Calendar className="h-4 w-4" />,
      submenu: [
        {
          label: "Loading",
          to: "/home/mobile-stock/loading",
          icon: <Truck className="h-4 w-4" />,
        },
        {
          label: "Unloading",
          to: "/home/mobile-stock/unloading",
          icon: <Truck className="h-4 w-4" />,
        },
        {
          label: "Routes Planning",
          to: "/home/mobile-stock/routes-planning",
          icon: <Truck className="h-4 w-4" />,
        },
        {
          label: "Assign Routes",
          to: "/home/mobile-stock/assign-routes",
          icon: <Truck className="h-4 w-4" />,
        },
      ],
    },
    {
      id: "accounts",
      label: "Accounts",
      icon: <Wallet className="h-4 w-4" />,
      submenu: [
        {
          label: "Main Accounts",
          to: "/home/accounts",
          icon: <Wallet className="h-4 w-4" />,
        },
        {
          label: "Liabilities",
          to: "/home/liabilities",
          icon: <CreditCard className="h-4 w-4" />,
        },
        {
          label: "Cash Flow",
          to: "/home/cashflows",
          icon: <TrendingUp className="h-4 w-4" />,
        },
      ],
    },
    {
      id: "reports",
      label: "Reports",
      icon: <FileText className="h-4 w-4" />,
      to: "/home/reports",
    },
    {
      id: "system",
      label: "System",
      icon: <Wrench className="h-4 w-4" />,
      submenu: [
        {
          label: "Settings",
          to: "/home/settings",
          icon: <Settings className="h-4 w-4" />,
        },
        {
          label: "Help & Support",
          to: "/home/help",
          icon: <HelpCircle className="h-4 w-4" />,
        },
      ],
    },
  ];

  return (
    <>
      {/* Main Navbar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            {/* Logo */}
            <div className="flex items-center space-x-3">
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
                    LumoraBiz
                  </h1>
                </div>
              </div>

              {/* Business Selector - Desktop */}
              <div className="hidden xl:flex items-center border-l border-gray-200 pl-3">
                <BusinessSelector isExpanded={false} />
                <ChevronDown className="h-3 w-3 text-gray-400 -ml-1" />
              </div>
            </div>

            {/* Desktop Navigation - Simple version for now */}
            <div className="hidden lg:flex items-center space-x-1">
              {navigationItems.map((item) => (
                <div key={item.id} className="relative">
                  {item.to ? (
                    <Link
                      to={item.to}
                      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive(item.to)
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      {item.icon}
                      <span className="ml-2">{item.label}</span>
                    </Link>
                  ) : (
                    <button className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                      {item.icon}
                      <span className="ml-2">{item.label}</span>
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* User Menu & Mobile Button */}
            <div className="flex items-center space-x-2">
              {/* User Info - Desktop */}
              <div className="hidden lg:flex items-center space-x-2">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-xs">
                  {currentUser?.displayName?.charAt(0)?.toUpperCase() ||
                    currentUser?.email?.charAt(0)?.toUpperCase() ||
                    "U"}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-red-600 transition-colors"
                >
                  Sign Out
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-50 transition-colors"
                type="button"
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

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-gray-900 bg-opacity-50"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="absolute right-0 top-0 h-full w-80 max-w-full bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User Info */}
            <div className="px-4 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                  {currentUser?.displayName?.charAt(0)?.toUpperCase() ||
                    currentUser?.email?.charAt(0)?.toUpperCase() ||
                    "U"}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {currentUser?.displayName || "User"}
                  </p>
                  <p className="text-xs text-gray-500">{currentUser?.email}</p>
                </div>
              </div>
            </div>

            {/* Business Selector */}
            <div className="border-b border-gray-200">
              <BusinessSelector isExpanded={true} />
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-2">
              {navigationItems.map((item) => (
                <div key={item.id}>
                  {item.to ? (
                    // Simple link
                    <Link
                      to={item.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center w-full px-4 py-3 text-left transition-colors ${
                        isActive(item.to)
                          ? "bg-blue-50 text-blue-700 border-r-4 border-blue-600"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {item.icon}
                      <span className="ml-3">{item.label}</span>
                    </Link>
                  ) : (
                    // Dropdown item
                    <div>
                      <button
                        onClick={() => toggleMobileDropdown(item.id)}
                        className="flex items-center w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                        type="button"
                      >
                        {item.icon}
                        <span className="ml-3">{item.label}</span>
                        <ChevronDown
                          className={`h-4 w-4 ml-auto transition-transform ${
                            openDropdowns[item.id] ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* Submenu */}
                      {openDropdowns[item.id] && item.submenu && (
                        <div className="bg-gray-50">
                          {item.submenu.map((subItem) => (
                            <Link
                              key={subItem.to}
                              to={subItem.to}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`flex items-center w-full px-8 py-2.5 text-left text-sm transition-colors ${
                                isActive(subItem.to)
                                  ? "bg-blue-50 text-blue-700"
                                  : "text-gray-600 hover:bg-gray-100"
                              }`}
                            >
                              {subItem.icon}
                              <span className="ml-3">{subItem.label}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Sign Out */}
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-200 mt-2"
                type="button"
              >
                <LogOut className="h-5 w-5" />
                <span className="ml-3">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <Outlet />
    </>
  );
};

export default NavbarLayout;
