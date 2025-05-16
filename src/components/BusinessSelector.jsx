import React, { useState, useEffect, useRef } from "react";
import { db, auth } from "../services/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const BusinessSelector = ({ isExpanded }) => {
  const [userBusinesses, setUserBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const dropdownRef = useRef(null);

  // Fetch user's businesses
  useEffect(() => {
    const fetchUserBusinesses = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const businessQuery = query(
          collection(db, "business"),
          where("ownerId", "==", currentUser.uid)
        );

        const querySnapshot = await getDocs(businessQuery);
        const businesses = [];

        querySnapshot.forEach((doc) => {
          businesses.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        setUserBusinesses(businesses);

        // Set current business from localStorage or use first business
        const savedBusinessId = localStorage.getItem("currentBusinessId");
        if (
          savedBusinessId &&
          businesses.some((b) => b.id === savedBusinessId)
        ) {
          setCurrentBusiness(businesses.find((b) => b.id === savedBusinessId));
        } else if (businesses.length > 0) {
          setCurrentBusiness(businesses[0]);
          localStorage.setItem("currentBusinessId", businesses[0].id);
        }
      } catch (error) {
        console.error("Error fetching businesses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserBusinesses();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle business selection
  const handleSelectBusiness = (business) => {
    setCurrentBusiness(business);
    localStorage.setItem("currentBusinessId", business.id);
    setIsDropdownOpen(false);
  };

  // Loading state
  if (loading) {
    return (
      <div
        className={`px-4 py-3 ${
          isExpanded ? "border-b border-muted" : "flex justify-center"
        }`}
      >
        <div className="animate-pulse bg-gray-200 h-6 w-full rounded"></div>
      </div>
    );
  }

  // No businesses state
  if (userBusinesses.length === 0) {
    return (
      <div
        className={`px-4 py-3 ${
          isExpanded ? "border-b border-muted" : "flex justify-center"
        }`}
      >
        <div className="text-xs text-gray-500 text-center">
          {isExpanded ? "No businesses found" : "N/A"}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative ${
        isExpanded
          ? "px-4 py-3 border-b border-muted"
          : "px-2 py-3 flex justify-center"
      }`}
      ref={dropdownRef}
    >
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md text-sm ${
          isExpanded ? "" : "p-2"
        }`}
      >
        {isExpanded ? (
          <>
            <div className="truncate text-left">
              <span className="block font-medium truncate">
                {currentBusiness?.businessName}
              </span>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 transform transition-transform ${
                isDropdownOpen ? "rotate-180" : ""
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
          </>
        ) : (
          <div className="w-6 h-6 flex items-center justify-center bg-primary bg-opacity-10 text-primary rounded-full">
            {currentBusiness?.businessName.charAt(0)}
          </div>
        )}
      </button>

      {/* Dropdown menu */}
      {isDropdownOpen && (
        <div
          className={`absolute z-10 mt-1 ${
            isExpanded ? "w-full" : "w-48 left-0"
          } bg-white rounded-md shadow-lg py-1 max-h-60 overflow-auto`}
        >
          <div className="py-1 text-xs font-medium text-gray-500 px-3">
            YOUR BUSINESSES
          </div>
          {userBusinesses.map((business) => (
            <button
              key={business.id}
              onClick={() => handleSelectBusiness(business)}
              className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                currentBusiness?.id === business.id
                  ? "bg-primary bg-opacity-5 text-primary"
                  : ""
              }`}
            >
              <span className="block font-medium truncate">
                {business.businessName}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default BusinessSelector;
