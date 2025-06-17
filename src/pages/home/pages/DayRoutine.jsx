import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useAuth } from "../../../contexts/AuthContext";
import { useBusiness } from "../../../contexts/BusinessContext";
import { db } from '../../../services/firebase';
import { 
  Settings, 
  Users, 
  Calendar,
  Route as RouteIcon,
  Loader2,
  ArrowRight
} from 'lucide-react';
import RoutesPlanning from '../../RoutesManager/RoutesPalning';
import { useNavigate } from 'react-router-dom';

const DayRoutine = () => {
  console.log('=== DayRoutine component rendering ===');
  
  const [salesReps, setSalesReps] = useState([]);
  const [selectedRep, setSelectedRep] = useState('');
  const [selectedRepData, setSelectedRepData] = useState(null);
  const [fetchingReps, setFetchingReps] = useState(true);
  
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();
  const navigate = useNavigate();

  console.log('DayRoutine - currentUser:', currentUser);
  console.log('DayRoutine - currentBusiness:', currentBusiness);

  // Fetch sales reps on component mount
  useEffect(() => {
    console.log('=== DayRoutine useEffect triggered ===');
    console.log('currentBusiness:', currentBusiness);
    console.log('currentUser:', currentUser);
    console.log('currentBusiness?.id:', currentBusiness?.id);
    console.log('currentUser?.uid:', currentUser?.uid);
    
    if (currentBusiness?.id && currentUser?.uid) {
      console.log('Conditions met, calling fetchSalesReps...');
      fetchSalesReps();
    } else {
      console.log('Conditions NOT met for fetching sales reps');
      if (!currentBusiness?.id) console.log('Missing currentBusiness.id');
      if (!currentUser?.uid) console.log('Missing currentUser.uid');
    }
  }, [currentBusiness, currentUser]);

  // Fetch sales representatives
  const fetchSalesReps = async () => {
    setFetchingReps(true);
    try {
      console.log('Current User:', currentUser?.uid);
      console.log('Selected Business:', currentBusiness);
      
      if (!currentUser?.uid) {
        console.error('No current user found');
        toast.error('User not authenticated');
        return;
      }
      
      if (!currentBusiness?.id) {
        console.error('No business selected');
        toast.error('No business selected');
        return;
      }

      const salesRepsRef = collection(
        db,
        'owners',
        currentUser.uid,
        'businesses',
        currentBusiness.id,
        'salesReps'
      );
      
      console.log('Fetching from path:', `owners/${currentUser.uid}/businesses/${currentBusiness.id}/salesReps`);
      
      const snapshot = await getDocs(salesRepsRef);
      console.log('Sales reps snapshot:', snapshot);
      console.log('Number of docs:', snapshot.docs.length);
      
      const repsData = snapshot.docs.map(doc => {
        console.log('Rep doc:', doc.id, doc.data());
        return {
          id: doc.id,
          ...doc.data()
        };
      });
      
      console.log('Processed reps data:', repsData);
      setSalesReps(repsData);
      
      // Auto-select first rep if available
      if (repsData.length > 0 && !selectedRep) {
        setSelectedRep(repsData[0].id);
        setSelectedRepData(repsData[0]);
      }
    } catch (error) {
      console.error('Error fetching sales reps:', error);
      toast.error('Failed to load sales representatives');
    } finally {
      setFetchingReps(false);
    }
  };

  // Handle sales rep selection
  const handleRepSelection = (repId) => {
    setSelectedRep(repId);
    const repData = salesReps.find(rep => rep.id === repId);
    setSelectedRepData(repData);
  };

  // Navigate to route setup
  const handleViewRouteSetup = () => {
    // Navigate to routes planning page within logistics
    navigate('routes-planning'); // Relative navigation within current business context
  };

  // Navigate to assign routes
  const handleAssignRoutes = () => {
    // Navigate to assign routes page within logistics
    navigate('assign-routes'); // Relative navigation within current business context
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Day Routine</h1>
            </div>
            <p className="text-gray-600">Monitor and manage daily routines for your sales representatives</p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleAssignRoutes}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <RouteIcon className="h-4 w-4" />
              <span>Assign Routes</span>
            </button>
            
            <button
              onClick={handleViewRouteSetup}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>Setup Routes</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sales Rep Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sales Rep Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Sales Representative <span className="text-red-500">*</span>
            </label>
            {fetchingReps ? (
              <div className="flex items-center space-x-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                <span className="text-sm text-gray-600">Loading sales representatives...</span>
              </div>
            ) : salesReps.length > 0 ? (
              <select
                value={selectedRep}
                onChange={(e) => handleRepSelection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Choose a sales representative</option>
                {salesReps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name} 
                    {rep.assignedRoutes && rep.assignedRoutes.length > 0 && 
                      ` (${rep.assignedRoutes.length} route${rep.assignedRoutes.length > 1 ? 's' : ''})`}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Users className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm text-yellow-700">
                    No sales representatives found. Please add sales representatives first.
                  </span>
                </div>
                <button
                  onClick={() => navigate('../employees')} // Navigate to employees within current business context
                  className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Users className="h-4 w-4" />
                  <span>Add Sales Representative</span>
                </button>
              </div>
            )}
          </div>

          
        </div>
      </div>

      {/* Quick Actions */}
      {selectedRepData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleViewRouteSetup}
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Setup Routes</h3>
                <p className="text-sm text-gray-600">Add or modify available routes</p>
              </div>
            </button>

            <button
              onClick={handleAssignRoutes}
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="p-2 bg-green-100 rounded-lg">
                <RouteIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Assign Routes</h3>
                <p className="text-sm text-gray-600">Assign routes to sales reps</p>
              </div>
            </button>

            <button
              onClick={() => {
                // Navigate to monthly planning within current business context
                navigate(`../logistics/monthly-planning?rep=${selectedRep}`);
              }}
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Monthly Planning</h3>
                <p className="text-sm text-gray-600">Plan monthly route schedules</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Routes Planning Component */}
      {selectedRep && selectedRepData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              Daily Routine - {selectedRepData.name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Monitor daily activities and route progress
            </p>
          </div>
          <div className="p-6">
            <RoutesPlanning selectedRepId={selectedRep} selectedRepData={selectedRepData} />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedRep && !fetchingReps && salesReps.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Sales Representative</h3>
            <p className="text-gray-600">
              Choose a sales representative from the dropdown above to view their daily routine and manage their routes.
            </p>
          </div>
        </div>
      )}

      {/* No Reps State */}
      {!fetchingReps && salesReps.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Sales Representatives Found</h3>
            <p className="text-gray-600 mb-6">
              You need to add sales representatives before you can manage their daily routines.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('../employees')}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors mx-auto"
              >
                <Users className="h-5 w-5" />
                <span>Add Sales Representative</span>
              </button>
              <p className="text-sm text-gray-500">
                Make sure to select "Sales Representative" as the role when adding employees.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayRoutine;