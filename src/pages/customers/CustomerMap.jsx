import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useBusiness } from "../../contexts/BusinessContext";
import { useAuth } from "../../contexts/AuthContext";

const CustomerMap = () => {
  const { currentBusiness } = useBusiness();
  const { currentUser } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);

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

        setCustomers(
          customersData.filter(
            (customer) =>
              customer.isActive &&
              customer.coordinates?.latitude &&
              customer.coordinates?.longitude
          )
        );
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

  // Load Google Maps script
  useEffect(() => {
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    // Check if API key is available
    const apiKey =
      import.meta.env?.VITE_GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_API_KEY";

    if (!apiKey || apiKey === "YOUR_GOOGLE_MAPS_API_KEY") {
      setError(
        "Google Maps API key not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file."
      );
      setLoading(false);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () =>
      setError("Failed to load Google Maps. Please check your API key.");

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || customers.length === 0) return;

    // Calculate bounds for all customers
    const bounds = new window.google.maps.LatLngBounds();
    customers.forEach((customer) => {
      if (customer.coordinates) {
        bounds.extend({
          lat: customer.coordinates.latitude,
          lng: customer.coordinates.longitude,
        });
      }
    });

    // Create map
    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 12,
      center: bounds.getCenter(),
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
    });

    // Fit map to bounds
    map.fitBounds(bounds);

    googleMapRef.current = map;

    // Create info window
    infoWindowRef.current = new window.google.maps.InfoWindow();

    return () => {
      if (googleMapRef.current) {
        googleMapRef.current = null;
      }
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
    };
  }, [mapLoaded, customers]);

  // Get unique routes and outlet types for filters
  const { routes, outletTypes } = useMemo(() => {
    const routeList = [
      ...new Set(customers.map((c) => c.routeName).filter(Boolean)),
    ];
    const typeList = [
      ...new Set(customers.map((c) => c.outletType).filter(Boolean)),
    ];
    return { routes: routeList, outletTypes: typeList };
  }, [customers]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        customer.outletName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.address?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRoute =
        selectedRoute === "all" || customer.routeName === selectedRoute;
      const matchesType =
        selectedType === "all" || customer.outletType === selectedType;

      return matchesSearch && matchesRoute && matchesType;
    });
  }, [customers, searchTerm, selectedRoute, selectedType]);

  // Update markers when filtered customers change
  useEffect(() => {
    if (!googleMapRef.current || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Create markers for filtered customers
    filteredCustomers.forEach((customer) => {
      if (!customer.coordinates) return;

      const marker = new window.google.maps.Marker({
        position: {
          lat: customer.coordinates.latitude,
          lng: customer.coordinates.longitude,
        },
        map: googleMapRef.current,
        title: customer.outletName,
        icon: {
          url: getMarkerIcon(customer.outletType),
          scaledSize: new window.google.maps.Size(32, 32),
          origin: new window.google.maps.Point(0, 0),
          anchor: new window.google.maps.Point(16, 32),
        },
      });

      marker.addListener("click", () => {
        setSelectedCustomer(customer);
        showInfoWindow(customer, marker);
      });

      markersRef.current.push(marker);
    });

    // Adjust map bounds if there are filtered customers
    if (filteredCustomers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      filteredCustomers.forEach((customer) => {
        if (customer.coordinates) {
          bounds.extend({
            lat: customer.coordinates.latitude,
            lng: customer.coordinates.longitude,
          });
        }
      });
      googleMapRef.current.fitBounds(bounds);
    }
  }, [filteredCustomers]);

  // Get marker icon based on outlet type
  const getMarkerIcon = (outletType) => {
    const iconMap = {
      Restaurant: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
      Shop: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
      Supermarket: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
      Hotel: "https://maps.google.com/mapfiles/ms/icons/purple-dot.png",
      Cafe: "https://maps.google.com/mapfiles/ms/icons/orange-dot.png",
    };
    return (
      iconMap[outletType] ||
      "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
    );
  };

  // Show info window
  const showInfoWindow = (customer, marker) => {
    if (!infoWindowRef.current) return;

    const content = `
      <div style="max-width: 300px; padding: 12px;">
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          ${
            customer.imageUrl
              ? `<img src="${customer.imageUrl}" alt="${customer.outletName}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover; margin-right: 12px;">`
              : `<div style="width: 48px; height: 48px; background: linear-gradient(135deg, #3B82F6, #8B5CF6); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px; color: white; font-weight: bold; font-size: 18px;">${
                  customer.outletName?.charAt(0) || "C"
                }</div>`
          }
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">${
              customer.outletName
            }</h3>
            <p style="margin: 4px 0 0 0; font-size: 14px; color: #6B7280;">${
              customer.ownerName
            }</p>
          </div>
        </div>
        
        <div style="margin-bottom: 8px;">
          <span style="display: inline-block; background: #DBEAFE; color: #1E40AF; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; margin-right: 6px;">${
            customer.outletType
          }</span>
          ${
            customer.routeName
              ? `<span style="display: inline-block; background: #D1FAE5; color: #065F46; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">${customer.routeName}</span>`
              : ""
          }
        </div>
        
        <p style="margin: 8px 0; font-size: 14px; color: #374151; line-height: 1.4;">${
          customer.address
        }</p>
        
        ${
          customer.phoneNumber
            ? `
          <div style="margin: 8px 0;">
            <a href="tel:${customer.phoneNumber}" style="display: inline-flex; align-items: center; color: #059669; text-decoration: none; font-size: 14px; font-weight: 500;">
              <svg style="width: 16px; height: 16px; margin-right: 4px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
              ${customer.phoneNumber}
            </a>
          </div>
        `
            : ""
        }
        
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #E5E7EB;">
          <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${
            customer.coordinates.latitude
          },${customer.coordinates.longitude}', '_blank')" 
                  style="background: #3B82F6; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; margin-right: 8px;">
            Get Directions
          </button>
          <button onclick="document.dispatchEvent(new CustomEvent('viewCustomerDetails', {detail: '${
            customer.id
          }'}))"
                  style="background: #F3F4F6; color: #374151; border: 1px solid #D1D5DB; padding: 8px 12px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer;">
            View Details
          </button>
        </div>
      </div>
    `;

    infoWindowRef.current.setContent(content);
    infoWindowRef.current.open(googleMapRef.current, marker);
  };

  // Handle customer selection from sidebar
  const handleCustomerSelect = useCallback((customer) => {
    if (!googleMapRef.current) return;

    setSelectedCustomer(customer);

    // Find the marker for this customer
    const marker = markersRef.current.find(
      (m) =>
        m.getPosition().lat() === customer.coordinates.latitude &&
        m.getPosition().lng() === customer.coordinates.longitude
    );

    if (marker) {
      googleMapRef.current.panTo({
        lat: customer.coordinates.latitude,
        lng: customer.coordinates.longitude,
      });
      googleMapRef.current.setZoom(16);
      showInfoWindow(customer, marker);
    }
  }, []);

  // Handle view customer details event
  useEffect(() => {
    const handleViewDetails = (event) => {
      const customerId = event.detail;
      const customer = customers.find((c) => c.id === customerId);
      if (customer) {
        console.log("View customer details:", customer);
        // Navigate to customer details page
      }
    };

    document.addEventListener("viewCustomerDetails", handleViewDetails);
    return () =>
      document.removeEventListener("viewCustomerDetails", handleViewDetails);
  }, [customers]);

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Handle call
  const handleCall = useCallback((phoneNumber, e) => {
    e.stopPropagation();
    if (phoneNumber) {
      window.open(`tel:${phoneNumber}`);
    }
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Customer Locations
            </h1>
            <p className="text-gray-600 mt-1">
              {filteredCustomers.length} of {customers.length} customers on map
            </p>
          </div>

          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="lg:hidden flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg
              className="h-4 w-4 mr-2"
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
            Toggle List
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div
          className={`${
            showSidebar ? "w-80" : "w-0"
          } transition-all duration-300 bg-white border-r border-gray-200 flex flex-col overflow-hidden`}
        >
          {showSidebar && (
            <>
              {/* Filters */}
              <div className="p-4 border-b border-gray-200">
                <div className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg
                        className="h-4 w-4 text-gray-400"
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
                      placeholder="Search customers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  {/* Route Filter */}
                  <select
                    value={selectedRoute}
                    onChange={(e) => setSelectedRoute(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                  >
                    <option value="all">All Routes</option>
                    {routes.map((route) => (
                      <option key={route} value={route}>
                        {route}
                      </option>
                    ))}
                  </select>

                  {/* Type Filter */}
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                  >
                    <option value="all">All Types</option>
                    {outletTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Customer List */}
              <div className="flex-1 overflow-y-auto">
                <div className="divide-y divide-gray-200">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedCustomer?.id === customer.id
                          ? "bg-blue-50 border-r-2 border-blue-500"
                          : ""
                      }`}
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {customer.imageUrl ? (
                            <img
                              src={customer.imageUrl}
                              alt={customer.outletName}
                              className="h-10 w-10 rounded-lg object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {customer.outletName?.charAt(0) || "C"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">
                              {customer.outletName}
                            </h3>
                          </div>

                          <div className="flex flex-wrap gap-1 mb-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {customer.outletType}
                            </span>
                            {customer.routeName && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                {customer.routeName}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-gray-600 truncate mb-1">
                            {customer.ownerName}
                          </p>
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {customer.address}
                          </p>

                          {/* Actions */}
                          <div className="flex items-center mt-2 space-x-2">
                            {customer.phoneNumber && (
                              <button
                                onClick={(e) =>
                                  handleCall(customer.phoneNumber, e)
                                }
                                className="text-green-600 hover:text-green-800 text-xs"
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
                            <span className="text-xs text-gray-400">
                              Added {formatDate(customer.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredCustomers.length === 0 && (
                  <div className="p-8 text-center">
                    <div className="text-gray-400 text-4xl mb-2">📍</div>
                    <p className="text-gray-600 text-sm">No customers found</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" />

          {/* Legend */}
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 min-w-[200px]">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Legend</h3>
            <div className="space-y-1">
              {outletTypes.map((type) => (
                <div key={type} className="flex items-center text-xs">
                  <img
                    src={getMarkerIcon(type)}
                    alt={type}
                    className="w-4 h-4 mr-2"
                  />
                  <span className="text-gray-700">{type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Toggle Sidebar Button for Desktop */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 hover:bg-gray-50 transition-colors"
          >
            <svg
              className="h-5 w-5 text-gray-600"
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
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerMap;
