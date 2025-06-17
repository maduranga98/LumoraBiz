import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useAuth } from "../../contexts/AuthContext";
import { useBusiness } from "../../contexts/BusinessContext";
import { db } from '../../services/firebase';
import { 
  Users, 
  MapPin, 
  Plus, 
  Save, 
  Loader2, 
  Route as RouteIcon,
  UserCheck,
  AlertCircle,
  Navigation,
  X
} from 'lucide-react';
import AddingRoutes from './AddingRoutes';


const AssignRoutes = () => {
  const [salesReps, setSalesReps] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedSalesRep, setSelectedSalesRep] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [showAddRoute, setShowAddRoute] = useState(false);
  
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness(); 

  // Fetch sales reps and routes on component mount
  useEffect(() => {
    if (currentBusiness?.id && currentUser?.uid) {
      fetchData();
    }
  }, [currentBusiness, currentUser]);

  // Fetch sales reps and routes from Firebase
  const fetchData = async () => {
    setFetchingData(true);
    try {
      await Promise.all([fetchSalesReps(), fetchRoutes()]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setFetchingData(false);
    }
  };

  // Fetch sales representatives
  const fetchSalesReps = async () => {
    try {
      const salesRepsRef = collection(
        db,
        'owners',
        currentUser.uid,
        'businesses',
        currentBusiness.id,
        'salesReps'
      );
      
      const snapshot = await getDocs(salesRepsRef);
      const repsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setSalesReps(repsData);
    } catch (error) {
      console.error('Error fetching sales reps:', error);
      throw error;
    }
  };

  // Fetch routes
  const fetchRoutes = async () => {
    try {
      const routesRef = collection(
        db,
        'owners',
        currentUser.uid,
        'businesses',
        currentBusiness.id,
        'routes'
      );
      
      const snapshot = await getDocs(routesRef);
      const routesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setRoutes(routesData);
    } catch (error) {
      console.error('Error fetching routes:', error);
      throw error;
    }
  };

  // Handle route assignment
  const handleAssignRoute = async () => {
    if (!selectedSalesRep || !selectedRoute) {
      toast.error('Please select both a sales representative and a route');
      return;
    }

    setLoading(true);
    
    try {
      const selectedSalesRepData = salesReps.find(rep => rep.id === selectedSalesRep);
      const selectedRouteData = routes.find(route => route.id === selectedRoute);
      
      // Check if route is already assigned to this sales rep
      const existingRoutes = selectedSalesRepData?.assignedRoutes || [];
      const isAlreadyAssigned = existingRoutes.some(route => route.routeId === selectedRoute);
      
      if (isAlreadyAssigned) {
        toast.error('This route is already assigned to the selected sales representative');
        return;
      }

      // Create new route assignment object with regular timestamp
      const currentTimestamp = new Date(); // Use regular Date instead of serverTimestamp()
      
      const newRouteAssignment = {
        routeId: selectedRoute,
        routeName: selectedRouteData?.name || '',
        areas: selectedRouteData?.areas || [],
        estimatedDistance: selectedRouteData?.estimatedDistance || null,
        estimatedTime: selectedRouteData?.estimatedTime || null,
        assignedAt: currentTimestamp, // Use regular Date
        assignedBy: currentUser.uid,
        status: 'active'
      };

      // Update sales rep with new assigned route in the assignedRoutes array
      const salesRepRef = doc(
        db,
        'owners',
        currentUser.uid,
        'businesses',
        currentBusiness.id,
        'salesReps',
        selectedSalesRep
      );

      const updatedAssignedRoutes = [...existingRoutes, newRouteAssignment];
      
      await updateDoc(salesRepRef, {
        assignedRoutes: updatedAssignedRoutes,
        updatedAt: serverTimestamp() // serverTimestamp is fine at document level
      });

      toast.success('Route assigned successfully!');
      
      // Reset selections
      setSelectedSalesRep('');
      setSelectedRoute('');
      
      // Refresh data to show updated assignments
      await fetchSalesReps();
      
    } catch (error) {
      console.error('Error assigning route:', error);
      toast.error('Failed to assign route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get assigned routes for a sales rep
  const getAssignedRoutes = (repId) => {
    const rep = salesReps.find(rep => rep.id === repId);
    return rep?.assignedRoutes || [];
  };

  // Remove route assignment
  const handleRemoveRoute = async (repId, routeId) => {
    setLoading(true);
    
    try {
      const salesRepData = salesReps.find(rep => rep.id === repId);
      const updatedRoutes = salesRepData.assignedRoutes.filter(route => route.routeId !== routeId);
      
      const salesRepRef = doc(
        db,
        'owners',
        currentUser.uid,
        'businesses',
        currentBusiness.id,
        'salesReps',
        repId
      );

      await updateDoc(salesRepRef, {
        assignedRoutes: updatedRoutes,
        updatedAt: serverTimestamp()
      });

      toast.success('Route removed successfully!');
      await fetchSalesReps();
      
    } catch (error) {
      console.error('Error removing route:', error);
      toast.error('Failed to remove route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle adding new route success
  const handleRouteAdded = () => {
    setShowAddRoute(false);
    fetchRoutes(); // Refresh routes list
    toast.success('Route added successfully! You can now assign it to sales representatives.');
  };

  if (fetchingData) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading sales representatives and routes...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show AddingRoute component if requested
  if (showAddRoute) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => setShowAddRoute(false)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Assign Routes</span>
          </button>
        </div>
        <AddingRoutes onRouteAdded={handleRouteAdded} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Navigation className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Assign Routes</h1>
        </div>
        <p className="text-gray-600">Assign delivery routes to your sales representatives</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Assignment Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
            <UserCheck className="h-5 w-5 mr-2 text-blue-600" />
            Assign Route to Sales Rep
          </h2>

          <div className="space-y-6">
            {/* Sales Rep Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Sales Representative <span className="text-red-500">*</span>
              </label>
              {salesReps.length > 0 ? (
                <select
                  value={selectedSalesRep}
                  onChange={(e) => setSelectedSalesRep(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a sales representative</option>
                  {salesReps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name}
                      {rep.assignedRoute && ` (Currently: ${rep.assignedRoute.routeName})`}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm text-yellow-700">
                    No sales representatives found. Please add sales representatives first.
                  </span>
                </div>
              )}
            </div>

            {/* Route Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Route <span className="text-red-500">*</span>
              </label>
              {routes.length > 0 ? (
                <select
                  value={selectedRoute}
                  onChange={(e) => setSelectedRoute(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a route</option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.name} - {route.areas?.join(', ')}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm text-yellow-700">
                      No routes found. Please add routes first.
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAddRoute(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add New Route</span>
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {routes.length > 0 && (
              <div className="flex items-center space-x-3 pt-4">
                <button
                  onClick={handleAssignRoute}
                  disabled={loading || !selectedSalesRep || !selectedRoute}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Assign Route</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => setShowAddRoute(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New Route</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Current Assignments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
            <RouteIcon className="h-5 w-5 mr-2 text-green-600" />
            Current Route Assignments
          </h2>

          {salesReps.length > 0 ? (
            <div className="space-y-4">
              {salesReps.map((rep) => {
                const assignedRoutes = getAssignedRoutes(rep.id);
                return (
                  <div
                    key={rep.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{rep.name}</h3>
                          <p className="text-sm text-gray-500">{rep.phone}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {assignedRoutes.length > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            {assignedRoutes.length} route{assignedRoutes.length > 1 ? 's' : ''} assigned
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            No routes assigned
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Assigned Routes List */}
                    {assignedRoutes.length > 0 && (
                      <div className="space-y-2">
                        {assignedRoutes.map((route, index) => (
                          <div key={route.routeId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4 text-green-600" />
                              <div>
                                <span className="font-medium text-gray-900">{route.routeName}</span>
                                <p className="text-xs text-gray-500">
                                  Areas: {route.areas?.join(', ') || 'No areas specified'}
                                </p>
                                {route.assignedAt && (
                                  <p className="text-xs text-gray-400">
                                    Assigned: {route.assignedAt instanceof Date 
                                      ? route.assignedAt.toLocaleDateString()
                                      : route.assignedAt.seconds 
                                        ? new Date(route.assignedAt.seconds * 1000).toLocaleDateString()
                                        : new Date(route.assignedAt).toLocaleDateString()
                                    }
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveRoute(rep.id, route.routeId)}
                              disabled={loading}
                              className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                              title="Remove route"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No sales representatives found</p>
              <p className="text-sm text-gray-400">Add sales representatives to assign routes</p>
            </div>
          )}
        </div>
      </div>

      {/* Available Routes Summary */}
      {routes.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-purple-600" />
            Available Routes ({routes.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routes.map((route) => (
              <div key={route.id} className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">{route.name}</h3>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Areas:</span> {route.areas?.join(', ') || 'No areas specified'}
                  </p>
                  {route.estimatedDistance && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Distance:</span> {route.estimatedDistance} km
                    </p>
                  )}
                  {route.estimatedTime && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Est. Time:</span> {route.estimatedTime} minutes
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignRoutes;