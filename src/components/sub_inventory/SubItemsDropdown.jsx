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
  }, []);

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
        <label className="block text-sm font-medium text-muted mb-1">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}

      {/* Dropdown Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled || loading}
        className={`w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors ${
          disabled || loading
            ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
            : selectedItem
            ? "border-primary bg-primary bg-opacity-5 text-text"
            : "border-muted bg-white text-muted hover:border-primary"
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`truncate ${selectedItem ? "text-text" : "text-muted"}`}
          >
            {loading ? "Loading items..." : getDisplayText()}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 transition-transform ${
              isOpen ? "rotate-180" : ""
            } ${disabled || loading ? "text-gray-400" : "text-muted"}`}
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
        <div className="absolute z-50 w-full mt-1 bg-white border border-muted rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-muted">
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-muted rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              autoFocus
            />
          </div>

          {/* Items List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="px-3 py-4 text-center text-muted text-sm">
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
                    className={`w-full px-3 py-2 text-left hover:bg-primary hover:bg-opacity-5 focus:bg-primary focus:bg-opacity-5 outline-none transition-colors ${
                      selectedItem?.id === item.id
                        ? "bg-primary bg-opacity-10 text-primary"
                        : "text-text"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{item.itemName}</p>
                        {showCategory && (
                          <p className="text-xs text-muted">{item.category}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted">{item.unitType}</p>
                        {item.itemsPerPack && (
                          <p className="text-xs text-muted">
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

          {/* Add New Item Link */}
          <div className="border-t border-muted p-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                // You can add navigation to add new item here
                console.log("Navigate to add new item");
              }}
              className="w-full px-2 py-1 text-left text-sm text-primary hover:bg-primary hover:bg-opacity-5 rounded transition-colors"
            >
              + Add new item
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
