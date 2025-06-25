// src/components/Navbar.jsx
import React, { useState, useRef, useEffect } from "react";
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
  BarChart3,
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

  if (onClick) {
    return (
      <button onClick={onClick} className={baseClasses}>
        {content}
      </button>
    );
  }

  if (to) {
    return (
      <Link to={to} className={baseClasses}>
        {content}
      </Link>
    );
  }

  return <div className={baseClasses}>{content}</div>;
};

// Dropdown Component with hover support
const NavDropdown = ({
  trigger,
  children,
  isOpen,
  onToggle,
  mobile = false,
  alignRight = false,
}) => {
  const dropdownRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onToggle(false);
      }
    };

    if (isOpen && !mobile) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isOpen, onToggle, mobile]);

  const handleMouseEnter = () => {
    if (!mobile) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      onToggle(true);
    }
  };

  const handleMouseLeave = () => {
    if (!mobile) {
      timeoutRef.current = setTimeout(() => {
        onToggle(false);
      }, 200);
    }
  };

  const handleClick = () => {
    onToggle(!isOpen);
  };

  if (mobile) {
    return (
      <div className="space-y-1">
        <div onClick={handleClick}>{trigger}</div>
        {isOpen && <div className="ml-8 space-y-1">{children}</div>}
      </div>
    );
  }

  // For non-dropdown children (like user menu with custom positioning)
  if (
    React.isValidElement(children) &&
    children.props.className?.includes("absolute")
  ) {
    return (
      <div
        className="relative"
        ref={dropdownRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div onClick={handleClick}>{trigger}</div>
        {isOpen && children}
      </div>
    );
  }

  return (
    <div
      className="relative"
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div onClick={handleClick}>{trigger}</div>

      {isOpen && (
        <div
          className={`absolute ${
            alignRight ? "right-0" : "left-0"
          } mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

// Dropdown Item Component
const DropdownItem = ({ icon, label, to, isActive, mobile = false }) => {
  const classes = mobile
    ? `flex items-center w-full px-4 py-2.5 text-left transition-colors duration-200 ${
        isActive
          ? "bg-blue-50 text-blue-700"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`
    : `flex items-center px-3 py-2 text-sm transition-colors duration-200 ${
        isActive
          ? "bg-blue-50 text-blue-700"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`;

  return (
    <Link to={to} className={classes}>
      <span className="flex-shrink-0 mr-2.5 opacity-75">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
};

// Main Layout Component
const NavbarLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({
    inventory: false,
    operations: false,
    dailyRoutine: false,
    accounts: false,
    system: false,
  });

  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const path = location.pathname;

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const toggleDropdown = (dropdownName) => {
    setOpenDropdowns((prev) => {
      // Close all other dropdowns
      const newState = Object.keys(prev).reduce((acc, key) => {
        acc[key] = key === dropdownName ? !prev[key] : false;
        return acc;
      }, {});

      // Also close user dropdown if opening a nav dropdown
      if (dropdownName !== "user" && newState[dropdownName]) {
        setIsUserDropdownOpen(false);
      }

      return newState;
    });
  };

  const setDropdownOpen = (dropdownName, isOpen) => {
    if (isOpen) {
      // Close all other dropdowns when opening one
      setOpenDropdowns((prev) => {
        const newState = Object.keys(prev).reduce((acc, key) => {
          acc[key] = key === dropdownName;
          return acc;
        }, {});
        return newState;
      });

      // Close user dropdown when opening nav dropdown
      if (dropdownName !== "user") {
        setIsUserDropdownOpen(false);
      }
    } else {
      setOpenDropdowns((prev) => ({
        ...prev,
        [dropdownName]: false,
      }));
    }
  };

  // Navigation structure with smaller icon sizes
  const navigationStructure = {
    dashboard: {
      to: "/home",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    inventory: {
      label: "Inventory",
      icon: <Package className="h-4 w-4" />,
      items: [
        {
          to: "/home/inventory",
          label: "Main Inventory",
          icon: <Package className="h-3.5 w-3.5" />,
        },
        {
          to: "/home/substock",
          label: "Sub Inventory",
          icon: <Warehouse className="h-3.5 w-3.5" />,
        },
      ],
    },
    operations: {
      label: "Operations",
      icon: <Users className="h-4 w-4" />,
      items: [
        {
          to: "/home/employees",
          label: "Employees",
          icon: <Users className="h-3.5 w-3.5" />,
        },
        {
          to: "/home/logistics",
          label: "Logistics",
          icon: <Truck className="h-3.5 w-3.5" />,
        },
        {
          to: "/home/customers",
          label: "Customers",
          icon: <Users className="h-3.5 w-3.5" />,
        },
      ],
    },
    dailyRoutine: {
      label: "Daily",
      icon: <Calendar className="h-4 w-4" />,
      items: [
        {
          to: "/home/mobile-stock/loading",
          label: "Loading",
          icon: <Truck className="h-3.5 w-3.5" />,
        },
        {
          to: "/home/mobile-stock/unloading",
          label: "Unloading",
          icon: <Truck className="h-3.5 w-3.5" />,
        },
        {
          to: "/home/mobile-stock/routes-planning",
          label: "Routes Planning",
          icon: <Truck className="h-3.5 w-3.5" />,
        },
        {
          to: "/home/mobile-stock/assign-routes",
          label: "Assign Routes",
          icon: <Truck className="h-3.5 w-3.5" />,
        },
      ],
    },
    accounts: {
      label: "Accounts",
      icon: <Wallet className="h-4 w-4" />,
      items: [
        {
          to: "/home/accounts",
          label: "Main Accounts",
          icon: <Wallet className="h-3.5 w-3.5" />,
        },
        {
          to: "/home/liabilities",
          label: "Liabilities",
          icon: <CreditCard className="h-3.5 w-3.5" />,
        },
        {
          to: "/home/cashflows",
          label: "Cash Flow",
          icon: <TrendingUp className="h-3.5 w-3.5" />,
        },
      ],
    },
    reports: {
      to: "/home/reports",
      label: "Reports",
      icon: <FileText className="h-4 w-4" />,
    },
    system: {
      label: "System",
      icon: <Wrench className="h-4 w-4" />,
      items: [
        {
          to: "/home/settings",
          label: "Settings",
          icon: <Settings className="h-3.5 w-3.5" />,
        },
        {
          to: "/home/help",
          label: "Help & Support",
          icon: <HelpCircle className="h-3.5 w-3.5" />,
        },
      ],
    },
  };

  // Check if current path is active for dropdown groups
  const isDropdownActive = (items) => {
    return items?.some(
      (item) =>
        (item.to === "/home" && path === "/home") ||
        (item.to !== "/home" && path.startsWith(item.to))
    );
  };

  return (
    <>
      {/* Main Horizontal Navbar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            {/* Logo Section - Compressed */}
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

            {/* Desktop Navigation - Compressed */}
            <div className="hidden lg:flex items-center space-x-0.5 flex-1 justify-center max-w-4xl mx-4">
              {/* Dashboard */}
              <NavItem
                to={navigationStructure.dashboard.to}
                label={navigationStructure.dashboard.label}
                icon={navigationStructure.dashboard.icon}
                isActive={path === "/home"}
              />

              {/* Inventory Dropdown */}
              <NavDropdown
                trigger={
                  <NavItem
                    label={navigationStructure.inventory.label}
                    icon={navigationStructure.inventory.icon}
                    hasDropdown={true}
                    isActive={isDropdownActive(
                      navigationStructure.inventory.items
                    )}
                    isDropdownOpen={openDropdowns.inventory}
                  />
                }
                isOpen={openDropdowns.inventory}
                onToggle={(isOpen) => setDropdownOpen("inventory", isOpen)}
              >
                {navigationStructure.inventory.items.map((item) => (
                  <DropdownItem
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    isActive={path.startsWith(item.to)}
                  />
                ))}
              </NavDropdown>

              {/* Operations Dropdown */}
              <NavDropdown
                trigger={
                  <NavItem
                    label={navigationStructure.operations.label}
                    icon={navigationStructure.operations.icon}
                    hasDropdown={true}
                    isActive={isDropdownActive(
                      navigationStructure.operations.items
                    )}
                    isDropdownOpen={openDropdowns.operations}
                  />
                }
                isOpen={openDropdowns.operations}
                onToggle={(isOpen) => setDropdownOpen("operations", isOpen)}
              >
                {navigationStructure.operations.items.map((item) => (
                  <DropdownItem
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    isActive={path.startsWith(item.to)}
                  />
                ))}
              </NavDropdown>

              {/* Daily Routine Dropdown */}
              <NavDropdown
                trigger={
                  <NavItem
                    label={navigationStructure.dailyRoutine.label}
                    icon={navigationStructure.dailyRoutine.icon}
                    hasDropdown={true}
                    isActive={isDropdownActive(
                      navigationStructure.dailyRoutine.items
                    )}
                    isDropdownOpen={openDropdowns.dailyRoutine}
                  />
                }
                isOpen={openDropdowns.dailyRoutine}
                onToggle={(isOpen) => setDropdownOpen("dailyRoutine", isOpen)}
              >
                {navigationStructure.dailyRoutine.items.map((item) => (
                  <DropdownItem
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    isActive={path.startsWith(item.to)}
                  />
                ))}
              </NavDropdown>

              {/* Accounts Dropdown */}
              <NavDropdown
                trigger={
                  <NavItem
                    label={navigationStructure.accounts.label}
                    icon={navigationStructure.accounts.icon}
                    hasDropdown={true}
                    isActive={isDropdownActive(
                      navigationStructure.accounts.items
                    )}
                    isDropdownOpen={openDropdowns.accounts}
                  />
                }
                isOpen={openDropdowns.accounts}
                onToggle={(isOpen) => setDropdownOpen("accounts", isOpen)}
              >
                {navigationStructure.accounts.items.map((item) => (
                  <DropdownItem
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    isActive={path.startsWith(item.to)}
                  />
                ))}
              </NavDropdown>

              {/* Reports */}
              <NavItem
                to={navigationStructure.reports.to}
                label={navigationStructure.reports.label}
                icon={navigationStructure.reports.icon}
                isActive={path.startsWith("/home/reports")}
              />

              {/* System Dropdown */}
              <NavDropdown
                trigger={
                  <NavItem
                    label={navigationStructure.system.label}
                    icon={navigationStructure.system.icon}
                    hasDropdown={true}
                    isActive={isDropdownActive(
                      navigationStructure.system.items
                    )}
                    isDropdownOpen={openDropdowns.system}
                  />
                }
                isOpen={openDropdowns.system}
                onToggle={(isOpen) => setDropdownOpen("system", isOpen)}
              >
                {navigationStructure.system.items.map((item) => (
                  <DropdownItem
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    isActive={path.startsWith(item.to)}
                  />
                ))}
              </NavDropdown>
            </div>

            {/* User Menu - Compressed */}
            <div className="flex items-center space-x-2">
              {/* User Dropdown - Desktop */}
              <div className="hidden lg:block relative">
                <NavDropdown
                  trigger={
                    <button className="flex items-center space-x-2 px-2.5 py-1.5 rounded-md hover:bg-gray-50 transition-colors duration-200">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-xs shadow-sm">
                        {currentUser?.displayName?.charAt(0)?.toUpperCase() ||
                          currentUser?.email?.charAt(0)?.toUpperCase() ||
                          "U"}
                      </div>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-gray-500 transition-transform duration-200 ${
                          isUserDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  }
                  isOpen={isUserDropdownOpen}
                  onToggle={(isOpen) => {
                    setIsUserDropdownOpen(isOpen);
                    if (isOpen) {
                      // Close all navigation dropdowns
                      setOpenDropdowns((prev) =>
                        Object.keys(prev).reduce((acc, key) => {
                          acc[key] = false;
                          return acc;
                        }, {})
                      );
                    }
                  }}
                >
                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {currentUser?.displayName || "User"}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {currentUser?.email}
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5 mr-2.5" />
                      Sign Out
                    </button>
                  </div>
                </NavDropdown>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors duration-200"
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

        {/* Mobile Menu - Slide-in from right */}
        <div
          className={`lg:hidden fixed inset-0 z-50 transform transition-transform duration-300 ${
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
              <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
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
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                  {currentUser?.displayName?.charAt(0)?.toUpperCase() ||
                    currentUser?.email?.charAt(0)?.toUpperCase() ||
                    "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {currentUser?.displayName || "User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {currentUser?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Business Selector */}
            <div className="border-b border-gray-200">
              <BusinessSelector isExpanded={true} />
            </div>

            {/* Mobile Navigation */}
            <div className="py-2">
              {/* Dashboard */}
              <NavItem
                to={navigationStructure.dashboard.to}
                label={navigationStructure.dashboard.label}
                icon={navigationStructure.dashboard.icon}
                mobile={true}
                isActive={path === "/home"}
              />

              {/* Inventory Mobile Dropdown */}
              <NavDropdown
                trigger={
                  <NavItem
                    label={navigationStructure.inventory.label}
                    icon={navigationStructure.inventory.icon}
                    mobile={true}
                    hasDropdown={true}
                    isActive={isDropdownActive(
                      navigationStructure.inventory.items
                    )}
                    isDropdownOpen={openDropdowns.inventory}
                  />
                }
                isOpen={openDropdowns.inventory}
                onToggle={(isOpen) => setDropdownOpen("inventory", isOpen)}
                mobile={true}
              >
                {navigationStructure.inventory.items.map((item) => (
                  <DropdownItem
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    mobile={true}
                    isActive={path.startsWith(item.to)}
                  />
                ))}
              </NavDropdown>

              {/* Operations Mobile Dropdown */}
              <NavDropdown
                trigger={
                  <NavItem
                    label={navigationStructure.operations.label}
                    icon={navigationStructure.operations.icon}
                    mobile={true}
                    hasDropdown={true}
                    isActive={isDropdownActive(
                      navigationStructure.operations.items
                    )}
                    isDropdownOpen={openDropdowns.operations}
                  />
                }
                isOpen={openDropdowns.operations}
                onToggle={(isOpen) => setDropdownOpen("operations", isOpen)}
                mobile={true}
              >
                {navigationStructure.operations.items.map((item) => (
                  <DropdownItem
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    mobile={true}
                    isActive={path.startsWith(item.to)}
                  />
                ))}
              </NavDropdown>

              {/* Daily Routine Mobile Dropdown */}
              <NavDropdown
                trigger={
                  <NavItem
                    label="Daily Routine"
                    icon={navigationStructure.dailyRoutine.icon}
                    mobile={true}
                    hasDropdown={true}
                    isActive={isDropdownActive(
                      navigationStructure.dailyRoutine.items
                    )}
                    isDropdownOpen={openDropdowns.dailyRoutine}
                  />
                }
                isOpen={openDropdowns.dailyRoutine}
                onToggle={(isOpen) => setDropdownOpen("dailyRoutine", isOpen)}
                mobile={true}
              >
                {navigationStructure.dailyRoutine.items.map((item) => (
                  <DropdownItem
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    mobile={true}
                    isActive={path.startsWith(item.to)}
                  />
                ))}
              </NavDropdown>

              {/* Accounts Mobile Dropdown */}
              <NavDropdown
                trigger={
                  <NavItem
                    label={navigationStructure.accounts.label}
                    icon={navigationStructure.accounts.icon}
                    mobile={true}
                    hasDropdown={true}
                    isActive={isDropdownActive(
                      navigationStructure.accounts.items
                    )}
                    isDropdownOpen={openDropdowns.accounts}
                  />
                }
                isOpen={openDropdowns.accounts}
                onToggle={(isOpen) => setDropdownOpen("accounts", isOpen)}
                mobile={true}
              >
                {navigationStructure.accounts.items.map((item) => (
                  <DropdownItem
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    mobile={true}
                    isActive={path.startsWith(item.to)}
                  />
                ))}
              </NavDropdown>

              {/* Reports */}
              <NavItem
                to={navigationStructure.reports.to}
                label={navigationStructure.reports.label}
                icon={navigationStructure.reports.icon}
                mobile={true}
                isActive={path.startsWith("/home/reports")}
              />

              {/* System Mobile Dropdown */}
              <NavDropdown
                trigger={
                  <NavItem
                    label={navigationStructure.system.label}
                    icon={navigationStructure.system.icon}
                    mobile={true}
                    hasDropdown={true}
                    isActive={isDropdownActive(
                      navigationStructure.system.items
                    )}
                    isDropdownOpen={openDropdowns.system}
                  />
                }
                isOpen={openDropdowns.system}
                onToggle={(isOpen) => setDropdownOpen("system", isOpen)}
                mobile={true}
              >
                {navigationStructure.system.items.map((item) => (
                  <DropdownItem
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    mobile={true}
                    isActive={path.startsWith(item.to)}
                  />
                ))}
              </NavDropdown>
            </div>

            {/* Sign Out */}
            <div className="border-t border-gray-200 mt-auto">
              <NavItem
                label="Sign Out"
                icon={<LogOut className="h-5 w-5" />}
                mobile={true}
                isActive={false}
                onClick={handleLogout}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Content will be rendered by child components */}
      <Outlet />
    </>
  );
};

export default NavbarLayout;
