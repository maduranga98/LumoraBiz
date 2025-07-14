import React, { useState, useEffect, useMemo, useCallback } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useBusiness } from "../../contexts/BusinessContext";
import { useAuth } from "../../contexts/AuthContext";

const CustomerList = () => {
  const { currentBusiness } = useBusiness();
  const { currentUser } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedRoute, setSelectedRoute] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [error, setError] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);

  // Fetch customers from Firebase
  useEffect(() => {
    if (!currentBusiness?.id || !currentUser?.uid) {
      setLoading(false);
      return;
    }

    const customersRef = collection(
      db,
      `owners/${currentUser.uid}/businesses/${currentBusiness.id}/customers`
    );
    const q = query(customersRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const customersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setCustomers(customersData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching customers:", err);
        setError("Failed to fetch customers");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentBusiness?.id, currentUser?.uid]);

  // Get unique outlet types and routes for filters
  const { outletTypes, routes } = useMemo(() => {
    const types = [
      ...new Set(
        customers.map((customer) => customer.outletType).filter(Boolean)
      ),
    ];
    const routeList = [
      ...new Set(
        customers.map((customer) => customer.routeName).filter(Boolean)
      ),
    ];
    return { outletTypes: types, routes: routeList };
  }, [customers]);

  // Filter, search, and sort customers
  const filteredCustomers = useMemo(() => {
    let filtered = customers.filter((customer) => {
      const matchesSearch =
        customer.outletName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phoneNumber?.includes(searchTerm) ||
        customer.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.routeName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        selectedType === "all" || customer.outletType === selectedType;
      const matchesRoute =
        selectedRoute === "all" || customer.routeName === selectedRoute;

      return matchesSearch && matchesType && matchesRoute && customer.isActive;
    });

    // Sort customers
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.createdAt?.seconds - a.createdAt?.seconds;
        case "oldest":
          return a.createdAt?.seconds - b.createdAt?.seconds;
        case "name":
          return a.outletName?.localeCompare(b.outletName);
        case "route":
          return a.routeName?.localeCompare(b.routeName);
        default:
          return 0;
      }
    });

    return filtered;
  }, [customers, searchTerm, selectedType, selectedRoute, sortBy]);

  // Event handlers
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleTypeChange = useCallback((e) => {
    setSelectedType(e.target.value);
  }, []);

  const handleRouteChange = useCallback((e) => {
    setSelectedRoute(e.target.value);
  }, []);

  const handleSortChange = useCallback((e) => {
    setSortBy(e.target.value);
  }, []);

  const handleItemClick = useCallback(
    (customerId) => {
      setExpandedItem(expandedItem === customerId ? null : customerId);
    },
    [expandedItem]
  );

  const handleCall = useCallback((phoneNumber, e) => {
    e.stopPropagation();
    if (phoneNumber) {
      window.open(`tel:${phoneNumber}`);
    }
  }, []);

  const handleViewDetails = useCallback((customerId, e) => {
    e.stopPropagation();
    // Navigate to customer details page
    console.log("View details for customer:", customerId);
  }, []);

  const handleEdit = useCallback((customerId, e) => {
    e.stopPropagation();
    // Navigate to edit customer page
    console.log("Edit customer:", customerId);
  }, []);

  const handleOpenMaps = useCallback((coordinates, e) => {
    e.stopPropagation();
    if (coordinates) {
      window.open(
        `https://maps.google.com/?q=${coordinates.latitude},${coordinates.longitude}`,
        "_blank"
      );
    }
  }, []);

  // Utility functions
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTimeSince = (timestamp) => {
    if (!timestamp) return "Unknown";
    const now = new Date();
    const created = new Date(timestamp.seconds * 1000);
    const diffInMs = now - created;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedType("all");
    setSelectedRoute("all");
    setSortBy("newest");
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] m-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">⚠️</div>
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 m-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">
            {filteredCustomers.length} of {customers.length} customers
            {(searchTerm ||
              selectedType !== "all" ||
              selectedRoute !== "all") && (
              <button
                onClick={clearFilters}
                className="ml-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Clear filters
              </button>
            )}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by name, phone, address, or route..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Outlet Type
              </label>
              <select
                value={selectedType}
                onChange={handleTypeChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
              >
                <option value="all">All Types</option>
                {outletTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Route Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Route
              </label>
              <select
                value={selectedRoute}
                onChange={handleRouteChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
              >
                <option value="all">All Routes</option>
                {routes.map((route) => (
                  <option key={route} value={route}>
                    {route}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name (A-Z)</option>
                <option value="route">Route (A-Z)</option>
              </select>
            </div>

            {/* Active Filters Count */}
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                {(searchTerm ||
                  selectedType !== "all" ||
                  selectedRoute !== "all") && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {
                      [
                        searchTerm,
                        selectedType !== "all",
                        selectedRoute !== "all",
                      ].filter(Boolean).length
                    }{" "}
                    active filters
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No customers found
          </h3>
          <p className="text-gray-600">
            {searchTerm || selectedType !== "all" || selectedRoute !== "all"
              ? "Try adjusting your search or filter criteria"
              : "No customers have been added yet"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="transition-colors hover:bg-gray-50"
              >
                {/* List Item - Always Visible */}
                <div
                  className="flex items-center p-4 cursor-pointer"
                  onClick={() => handleItemClick(customer.id)}
                >
                  {/* Customer Avatar */}
                  <div className="flex-shrink-0 mr-4">
                    {customer.imageUrl ? (
                      <div className="relative">
                        <img
                          src={customer.imageUrl}
                          alt={customer.outletName}
                          className="h-12 w-12 rounded-xl object-cover"
                          loading="lazy"
                        />
                        <div
                          className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                            customer.isActive ? "bg-green-400" : "bg-gray-400"
                          }`}
                        />
                      </div>
                    ) : (
                      <div className="relative h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {customer.outletName?.charAt(0) || "C"}
                        </span>
                        <div
                          className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                            customer.isActive ? "bg-green-400" : "bg-gray-400"
                          }`}
                        />
                      </div>
                    )}
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {customer.outletName}
                          </h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {customer.outletType}
                          </span>
                          {customer.routeName && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              {customer.routeName}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate mb-1">
                          {customer.ownerName}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 space-x-4">
                          <span className="truncate max-w-[200px]">
                            {customer.address}
                          </span>
                          <span>• {getTimeSince(customer.createdAt)}</span>
                        </div>
                      </div>

                      {/* Right Side Actions */}
                      <div className="flex items-center ml-4 space-x-2">
                        {/* Call Button */}
                        {customer.phoneNumber && (
                          <button
                            onClick={(e) => handleCall(customer.phoneNumber, e)}
                            className="flex items-center justify-center w-8 h-8 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                            title={`Call ${customer.phoneNumber}`}
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                              />
                            </svg>
                          </button>
                        )}

                        {/* Expand Arrow */}
                        <div className="flex items-center justify-center w-8 h-8">
                          <svg
                            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                              expandedItem === customer.id ? "rotate-180" : ""
                            }`}
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
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedItem === customer.id && (
                  <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                    <div className="ml-16 space-y-4 pt-4">
                      {/* Contact Information */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <svg
                            className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                          <span>
                            {customer.phoneNumber || "No phone number"}
                          </span>
                        </div>

                        <div className="flex items-center text-sm text-gray-600">
                          <svg
                            className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>Joined {formatDate(customer.createdAt)}</span>
                        </div>
                      </div>

                      {/* Full Address */}
                      <div className="flex items-start text-sm text-gray-600">
                        <svg
                          className="h-4 w-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span>{customer.address}</span>
                      </div>

                      {/* Business Details Card */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-900">
                            Business Details
                          </h4>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              customer.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {customer.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Type:</span>{" "}
                            {customer.outletType}
                          </div>
                          <div>
                            <span className="font-medium">Created:</span>{" "}
                            {getTimeSince(customer.createdAt)}
                          </div>
                          {customer.routeName && (
                            <div className="sm:col-span-2">
                              <span className="font-medium">Route:</span>{" "}
                              {customer.routeName}
                            </div>
                          )}
                          {customer.coordinates && (
                            <div className="sm:col-span-2">
                              <span className="font-medium">Coordinates:</span>{" "}
                              {customer.coordinates.latitude?.toFixed(4)},{" "}
                              {customer.coordinates.longitude?.toFixed(4)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={(e) => handleViewDetails(customer.id, e)}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <svg
                            className="h-4 w-4 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          View Details
                        </button>
                        <button
                          onClick={(e) => handleEdit(customer.id, e)}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <svg
                            className="h-4 w-4 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Edit
                        </button>
                        {customer.phoneNumber && (
                          <button
                            onClick={(e) => handleCall(customer.phoneNumber, e)}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            <svg
                              className="h-4 w-4 mr-1"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                              />
                            </svg>
                            Call Now
                          </button>
                        )}
                        {customer.coordinates && (
                          <button
                            onClick={(e) =>
                              handleOpenMaps(customer.coordinates, e)
                            }
                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                          >
                            <svg
                              className="h-4 w-4 mr-1"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            Open in Maps
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {filteredCustomers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Stats
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredCustomers.length}
              </div>
              <div className="text-sm text-gray-600">Total Customers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {
                  new Set(
                    filteredCustomers.map((c) => c.routeName).filter(Boolean)
                  ).size
                }
              </div>
              <div className="text-sm text-gray-600">Routes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {
                  new Set(
                    filteredCustomers.map((c) => c.outletType).filter(Boolean)
                  ).size
                }
              </div>
              <div className="text-sm text-gray-600">Outlet Types</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {filteredCustomers.filter((c) => c.phoneNumber).length}
              </div>
              <div className="text-sm text-gray-600">With Phone</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerList;
