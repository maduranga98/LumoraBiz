import React, { useState, useEffect, useRef } from "react";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export const SubItemsDropdown = ({
  selectedItem,
  onItemSelect,
  placeholder = "Select an item",
  className = "",
  disabled = false,
  showCategory = true,
  filterByCategory = null,
  label = null,
  required = false,
  refreshTrigger = 0, // Add this prop to trigger refresh from parent
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Get current business ID from localStorage
  const getCurrentBusinessId = () => {
    return localStorage.getItem("currentBusinessId");
  };

  // Fetch items from Firebase
  const fetchItems = async () => {
    const businessId = getCurrentBusinessId();
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      const itemsQuery = query(
        collection(db, "items"),
        where("businessId", "==", businessId)
      );

      const querySnapshot = await getDocs(itemsQuery);
      const itemsList = [];

      querySnapshot.forEach((doc) => {
        itemsList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // Sort items by name
      itemsList.sort((a, b) => a.itemName.localeCompare(b.itemName));

      setItems(itemsList);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [refreshTrigger]); // Re-fetch when refreshTrigger changes

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter items based on search term and category
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.itemName
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      !filterByCategory || item.category === filterByCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle item selection
  const handleItemSelect = (item) => {
    onItemSelect(item);
    setIsOpen(false);
    setSearchTerm("");
  };

  // Handle dropdown toggle
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  // Get display text for selected item
  const getDisplayText = () => {
    if (selectedItem) {
      return showCategory
        ? `${selectedItem.itemName} (${selectedItem.category})`
        : selectedItem.itemName;
    }
    return placeholder;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Dropdown Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled || loading}
        className={`w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${
          disabled || loading
            ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
            : selectedItem
            ? "border-blue-500 bg-blue-50 text-gray-900"
            : "border-gray-300 bg-white text-gray-500 hover:border-blue-500"
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`truncate ${
              selectedItem ? "text-gray-900" : "text-gray-500"
            }`}
          >
            {loading ? "Loading items..." : getDisplayText()}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 transition-transform ${
              isOpen ? "rotate-180" : ""
            } ${disabled || loading ? "text-gray-400" : "text-gray-500"}`}
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
      </button>

      {/* Dropdown Menu */}
      {isOpen && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              autoFocus
            />
          </div>

          {/* Items List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-500 text-sm">
                {searchTerm
                  ? "No items found matching your search"
                  : "No items available"}
              </div>
            ) : (
              <div className="py-1">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemSelect(item)}
                    className={`w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 outline-none transition-colors ${
                      selectedItem?.id === item.id
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{item.itemName}</p>
                        {showCategory && (
                          <p className="text-xs text-gray-500">
                            {item.category}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{item.unitType}</p>
                        {item.itemsPerPack && (
                          <p className="text-xs text-gray-500">
                            {item.itemsPerPack}/pack
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
