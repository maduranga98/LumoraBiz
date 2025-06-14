// src/pages/business/Business.jsx
import React, { useState, useEffect } from "react";
import {
  useParams,
  useNavigate,
  Outlet,
  Link,
  useLocation,
} from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  HomeIcon,
  CubeIcon,
  UsersIcon,
  TruckIcon,
  DocumentChartBarIcon,
  CogIcon,
  QuestionMarkCircleIcon,
  ArrowLeftIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const Business = () => {
  const { businessId } = useParams();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [business, setBusiness] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Mock business data - replace with Firebase integration
  useEffect(() => {
    // This would be your Firebase query to get business details
    const mockBusinesses = {
      "biz-1": {
        id: "biz-1",
        name: "TechCorp Solutions",
        type: "Technology",
        status: "Active",
      },
      "biz-2": {
        id: "biz-2",
        name: "Green Mart",
        type: "Retail",
        status: "Active",
      },
      "biz-3": {
        id: "biz-3",
        name: "Digital Agency",
        type: "Marketing",
        status: "Inactive",
      },
    };

    setBusiness(mockBusinesses[businessId] || null);
  }, [businessId]);

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
      to: `/business/${businessId}`,
      label: "Dashboard",
      icon: <HomeIcon className="h-5 w-5" />,
    },
    {
      to: `/business/${businessId}/inventory`,
      label: "Inventory",
      icon: <CubeIcon className="h-5 w-5" />,
    },
    {
      to: `/business/${businessId}/substock`,
      label: "Sub Stock",
      icon: <CubeIcon className="h-5 w-5" />,
    },
    {
      to: `/business/${businessId}/customers`,
      label: "Customers",
      icon: <UsersIcon className="h-5 w-5" />,
    },
    {
      to: `/business/${businessId}/employees`,
      label: "Employees",
      icon: <UsersIcon className="h-5 w-5" />,
    },
    {
      to: `/business/${businessId}/logistics`,
      label: "Logistics",
      icon: <TruckIcon className="h-5 w-5" />,
    },
    {
      to: `/business/${businessId}/reports`,
      label: "Reports",
      icon: <DocumentChartBarIcon className="h-5 w-5" />,
    },
    {
      to: `/business/${businessId}/settings`,
      label: "Settings",
      icon: <CogIcon className="h-5 w-5" />,
    },
    {
      to: `/business/${businessId}/help`,
      label: "Help & Support",
      icon: <QuestionMarkCircleIcon className="h-5 w-5" />,
    },
  ];

  const NavItem = ({ to, label, icon, isActive }) => (
    <Link
      to={to}
      className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "bg-blue-100 text-blue-700 border-r-2 border-blue-600"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <span className={`flex-shrink-0 ${isActive ? "text-blue-600" : ""}`}>
        {icon}
      </span>
      {isSidebarOpen && <span className="ml-3">{label}</span>}
    </Link>
  );

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Business Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            The business you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate("/home")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const isMainBusinessPage = location.pathname === `/business/${businessId}`;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`bg-white border-r border-gray-200 transition-all duration-300 ${
          isSidebarOpen ? "w-64" : "w-16"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {isSidebarOpen && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 truncate">
                  {business.name}
                </h2>
                <p className="text-sm text-gray-500">{business.type}</p>
              </div>
            )}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              {isSidebarOpen ? (
                <XMarkIcon className="h-5 w-5" />
              ) : (
                <Bars3Icon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              isActive={
                (item.to === `/business/${businessId}` &&
                  location.pathname === `/business/${businessId}`) ||
                (item.to !== `/business/${businessId}` &&
                  location.pathname.startsWith(item.to))
              }
            />
          ))}
        </nav>

        {/* Back to Home */}
        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={() => navigate("/home")}
            className={`flex items-center w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors ${
              !isSidebarOpen ? "justify-center" : ""
            }`}
          >
            <ArrowLeftIcon className="h-5 w-5 flex-shrink-0" />
            {isSidebarOpen && <span className="ml-3">Back to Home</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {business.name}
                </h1>
                <p className="text-sm text-gray-500">
                  Business ID: {businessId}
                </p>
              </div>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  business.status === "Active"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {business.status}
              </span>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-sm">
                  {currentUser?.displayName?.charAt(0) ||
                    currentUser?.email?.charAt(0) ||
                    "U"}
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700">
                  {currentUser?.displayName || "User"}
                </span>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {currentUser?.displayName || "User"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {currentUser?.email}
                      </p>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        Profile
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        Settings
                      </Link>
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          {isMainBusinessPage ? (
            <div>
              {/* Business Dashboard Content */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Business Dashboard
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <CubeIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-500">
                          Total Products
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          1,234
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <UsersIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-500">
                          Customers
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          5,678
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <TruckIcon className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-500">
                          Orders
                        </p>
                        <p className="text-2xl font-bold text-gray-900">892</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <DocumentChartBarIcon className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-500">
                          Revenue
                        </p>
                        <p className="text-2xl font-bold text-gray-900">$45K</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Link
                    to={`/business/${businessId}/inventory`}
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                    <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <CubeIcon className="h-8 w-8 text-blue-600" />
                    </div>
                    <span className="mt-2 text-sm font-medium text-gray-900 group-hover:text-blue-600">
                      Manage Inventory
                    </span>
                  </Link>
                  <Link
                    to={`/business/${businessId}/customers`}
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                    <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                      <UsersIcon className="h-8 w-8 text-green-600" />
                    </div>
                    <span className="mt-2 text-sm font-medium text-gray-900 group-hover:text-green-600">
                      View Customers
                    </span>
                  </Link>
                  <Link
                    to={`/business/${businessId}/logistics`}
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                    <div className="p-3 bg-yellow-100 rounded-lg group-hover:bg-yellow-200 transition-colors">
                      <TruckIcon className="h-8 w-8 text-yellow-600" />
                    </div>
                    <span className="mt-2 text-sm font-medium text-gray-900 group-hover:text-yellow-600">
                      Logistics
                    </span>
                  </Link>
                  <Link
                    to={`/business/${businessId}/reports`}
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                    <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                      <DocumentChartBarIcon className="h-8 w-8 text-purple-600" />
                    </div>
                    <span className="mt-2 text-sm font-medium text-gray-900 group-hover:text-purple-600">
                      View Reports
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
};

export default Business;
