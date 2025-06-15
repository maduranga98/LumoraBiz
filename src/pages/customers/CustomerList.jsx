import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useBusiness } from "../../contexts/BusinessContext";
import { useAuth } from "../../contexts/AuthContext";

const CustomerList = () => {
  const { currentBusiness } = useBusiness();
  const { currentUser } = useAuth();
  
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [error, setError] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);

  // Fetch customers from Firebase
  useEffect(() => {
    if (!currentBusiness?.id || !currentUser?.uid) {
      setLoading(false);
      return;
    }

    const customersRef = collection(db, `owners/${currentUser.uid}/businesses/${currentBusiness.id}/customers`);
    const q = query(customersRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const customersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setCustomers(customersData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching customers:', err);
        setError('Failed to fetch customers');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentBusiness?.id, currentUser?.uid]);

  // Get unique outlet types for filter
  const outletTypes = useMemo(() => {
    const types = [...new Set(customers.map(customer => customer.outletType).filter(Boolean))];
    return types;
  }, [customers]);

  // Filter and search customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = 
        customer.outletName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phoneNumber?.includes(searchTerm) ||
        customer.address?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedType === 'all' || customer.outletType === selectedType;

      return matchesSearch && matchesType && customer.isActive;
    });
  }, [customers, searchTerm, selectedType]);

  // Handle search input
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  // Handle type filter
  const handleTypeChange = useCallback((e) => {
    setSelectedType(e.target.value);
  }, []);

  // Handle item click
  const handleItemClick = useCallback((customerId) => {
    setExpandedItem(expandedItem === customerId ? null : customerId);
  }, [expandedItem]);

  // Handle phone call
  const handleCall = useCallback((phoneNumber, e) => {
    e.stopPropagation();
    if (phoneNumber) {
      window.open(`tel:${phoneNumber}`);
    }
  }, []);

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">
            {filteredCustomers.length} of {customers.length} customers
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="sm:w-48">
            <select
              value={selectedType}
              onChange={handleTypeChange}
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
            >
              <option value="all">All Types</option>
              {outletTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
          <p className="text-gray-600">
            {searchTerm || selectedType !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'No customers have been added yet'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="transition-colors hover:bg-gray-50">
                {/* List Tile - Always Visible */}
                <div 
                  className="flex items-center p-4 cursor-pointer"
                  onClick={() => handleItemClick(customer.id)}
                >
                  {/* Customer Image */}
                  <div className="flex-shrink-0 mr-4">
                    {customer.imageUrl ? (
                      <div className="relative">
                        <img
                          src={customer.imageUrl}
                          alt={customer.outletName}
                          className="h-12 w-12 rounded-lg object-cover"
                          loading="lazy"
                        />
                        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${customer.isActive ? 'bg-green-400' : 'bg-gray-400'}`} />
                      </div>
                    ) : (
                      <div className="relative h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2m-14 0h2m-2 0h-2m16 0v-3a2 2 0 00-2-2h-1m-2 0h1a2 2 0 012 2v3M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h6l4 4" />
                        </svg>
                        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${customer.isActive ? 'bg-green-400' : 'bg-gray-400'}`} />
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
                        </div>
                        <p className="text-sm text-gray-600 truncate mb-1">
                          {customer.ownerName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {customer.address}
                        </p>
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
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </button>
                        )}

                        {/* Expand Arrow */}
                        <div className="flex items-center justify-center w-8 h-8">
                          <svg 
                            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                              expandedItem === customer.id ? 'rotate-180' : ''
                            }`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedItem === customer.id && (
                  <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                    <div className="ml-16 space-y-3 pt-3">
                      {/* Detailed Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Phone */}
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{customer.phoneNumber || 'No phone number'}</span>
                        </div>

                        {/* Join Date */}
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Joined {formatDate(customer.registeredDate)}</span>
                        </div>
                      </div>

                      {/* Full Address */}
                      <div className="flex items-start text-sm text-gray-600">
                        <svg className="h-4 w-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{customer.address}</span>
                      </div>

                      {/* Coordinates (if available) */}
                      {customer.coordinates && (
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                          <span>
                            {customer.coordinates.latitude?.toFixed(4)}, {customer.coordinates.longitude?.toFixed(4)}
                          </span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex space-x-2 pt-2">
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          View Details
                        </button>
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Edit
                        </button>
                        {customer.phoneNumber && (
                          <button
                            onClick={(e) => handleCall(customer.phoneNumber, e)}
                            className="px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            Call Now
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
    </div>
  );
};

export default CustomerList;