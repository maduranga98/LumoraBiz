// src/components/BusinessSelector.jsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useBusiness } from "../contexts/BusinessContext";
import { ChevronDown, Building2 } from "lucide-react";

const BusinessSelector = ({ isExpanded }) => {
  const { currentUser } = useAuth();
  const {
    userBusinesses,
    currentBusiness,
    loading: contextLoading,
    selectBusiness,
  } = useBusiness();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Use loading state from context or local loading
  const loading = contextLoading || localLoading;

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
    selectBusiness(business);
    setIsDropdownOpen(false);
  };

  // Get business initials for avatar
  const getBusinessInitials = (businessName) => {
    if (!businessName) return "?";

    const words = businessName.trim().split(" ");
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  };

  // Loading state
  if (loading) {
    return (
      <div
        className={`${
          isExpanded
            ? "px-4 py-3 border-b border-gray-200"
            : "px-2 py-3 flex justify-center"
        }`}
      >
        {isExpanded ? (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
        )}
      </div>
    );
  }

  // No businesses state
  if (!currentUser || userBusinesses.length === 0) {
    return (
      <div
        className={`${
          isExpanded
            ? "px-4 py-3 border-b border-gray-200"
            : "px-2 py-3 flex justify-center"
        }`}
      >
        {isExpanded ? (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <Building2 className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-sm text-gray-500">No businesses found</div>
          </div>
        ) : (
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <Building2 className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative ${
        isExpanded
          ? "px-4 py-3 border-b border-gray-200"
          : "px-2 py-3 flex justify-center"
      }`}
      ref={dropdownRef}
    >
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`group w-full flex items-center justify-between hover:bg-gray-50 rounded-lg transition-colors duration-200 ${
          isExpanded ? "px-3 py-2" : "p-2"
        }`}
      >
        {isExpanded ? (
          <>
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {/* Business Avatar */}
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-semibold">
                  {getBusinessInitials(currentBusiness?.businessName)}
                </span>
              </div>

              {/* Business Info */}
              <div className="flex-1 min-w-0 text-left">
                <div className="font-medium text-gray-900 truncate">
                  {currentBusiness?.businessName || "Select Business"}
                </div>
                {currentBusiness?.address && (
                  <div className="text-xs text-gray-500 truncate">
                    {currentBusiness.address}
                  </div>
                )}
              </div>
            </div>

            {/* Dropdown Arrow */}
            <ChevronDown
              className={`w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-all duration-200 ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </>
        ) : (
          /* Collapsed Avatar */
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-semibold">
              {getBusinessInitials(currentBusiness?.businessName)}
            </span>
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div
          className={`absolute z-50 mt-2 ${
            isExpanded ? "w-full left-0" : "w-64 left-0"
          } bg-white rounded-xl shadow-lg border border-gray-200 py-2 max-h-80 overflow-auto`}
        >
          {/* Header */}
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Your Businesses ({userBusinesses.length})
            </div>
          </div>

          {/* Business List */}
          <div className="py-1">
            {userBusinesses.map((business) => {
              const isSelected = currentBusiness?.id === business.id;

              return (
                <button
                  key={business.id}
                  onClick={() => handleSelectBusiness(business)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150 ${
                    isSelected ? "bg-blue-50 border-r-2 border-blue-500" : ""
                  }`}
                >
                  {/* Business Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                        : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`text-sm font-semibold ${
                        isSelected ? "text-white" : "text-gray-600"
                      }`}
                    >
                      {getBusinessInitials(business.businessName)}
                    </span>
                  </div>

                  {/* Business Info */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-medium truncate ${
                        isSelected ? "text-blue-900" : "text-gray-900"
                      }`}
                    >
                      {business.businessName}
                    </div>
                    {business.address && (
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {business.address}
                      </div>
                    )}
                    {business.email && (
                      <div className="text-xs text-gray-400 truncate">
                        {business.email}
                      </div>
                    )}
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer (optional) */}
          {userBusinesses.length > 3 && (
            <div className="px-4 py-2 border-t border-gray-100">
              <div className="text-xs text-gray-400 text-center">
                Scroll to see more businesses
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BusinessSelector;
