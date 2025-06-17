import React, { useState } from 'react';
import { collection, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import Input from '../../components/Input';
import { useAuth } from "../../contexts/AuthContext";
import { useBusiness } from "../../contexts/BusinessContext";
import { db } from '../../services/firebase';
import { MapPin, Plus, X, Save, Loader2 } from 'lucide-react';

const AddingRoutes = () => {
  const [name, setName] = useState('');
  const [areas, setAreas] = useState(['']);
  const [description, setDescription] = useState('');
  const [estimatedDistance, setEstimatedDistance] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();

  // Add new area input
  const addAreaInput = () => {
    setAreas([...areas, '']);
  };

  // Remove area input
  const removeAreaInput = (index) => {
    if (areas.length > 1) {
      const newAreas = areas.filter((_, i) => i !== index);
      setAreas(newAreas);
    }
  };

  // Update specific area
  const updateArea = (index, value) => {
    const newAreas = [...areas];
    newAreas[index] = value;
    setAreas(newAreas);
  };

  // Reset form
  const resetForm = () => {
    setName('');
    setAreas(['']);
    setDescription('');
    setEstimatedDistance('');
    setEstimatedTime('');
  };

  // Validate form
  const validateForm = () => {
    if (!name.trim()) {
      toast.error('Route name is required');
      return false;
    }
    
    const validAreas = areas.filter(area => area.trim() !== '');
    if (validAreas.length === 0) {
      toast.error('At least one area is required');
      return false;
    }

    if (!currentBusiness?.id) {
      toast.error('No business selected');
      return false;
    }

    if (!currentUser?.uid) {
      toast.error('User not authenticated');
      return false;
    }

    return true;
  };

  // Save route to Firebase
  const handleSaveRoute = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const validAreas = areas.filter(area => area.trim() !== '');
      
      // Reference to the routes collection
      const routesRef = collection(
        db, 
        'owners', 
        currentUser.uid, 
        'businesses', 
        currentBusiness.id, 
        'routes'
      );

      // Add the route document first to get the docId
      const docRef = await addDoc(routesRef, {
        name: name.trim(),
        areas: validAreas,
        description: description.trim(),
        estimatedDistance: estimatedDistance ? parseFloat(estimatedDistance) : null,
        estimatedTime: estimatedTime ? parseInt(estimatedTime) : null,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser.uid,
        businessId: currentBusiness.id,
        ownerId: currentUser.uid,
        routeId: '', // Will be updated with the actual docId
      });

      // Update the document with the routeId (docId)
      await updateDoc(docRef, {
        routeId: docRef.id,
        updatedAt: serverTimestamp()
      });
      
      toast.success('Route saved successfully!');
      console.log('Route saved with ID:', docRef.id);
      
      // Reset form after successful save
      resetForm();
      
    } catch (error) {
      console.error('Error saving route:', error);
      toast.error('Failed to save route. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MapPin className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Routes Planning</h1>
        </div>
        <p className="text-gray-600">Create and manage delivery routes for your business</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          {/* Route Name */}
          <div>
            <Input 
              label="Route Name" 
              type="text" 
              placeholder="Enter the route name (e.g., Downtown Route, Zone A)" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Areas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Areas Covered <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {areas.map((area, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder={`Area ${index + 1} (e.g., Main Street, City Center)`}
                      value={area}
                      onChange={(e) => updateArea(index, e.target.value)}
                    />
                  </div>
                  {areas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAreaInput(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove area"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                onClick={addAreaInput}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                <span>Add Another Area</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows="3"
              placeholder="Optional description of the route, special instructions, or notes"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Route Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Input
                label="Estimated Distance (km)"
                type="number"
                placeholder="e.g., 25.5"
                value={estimatedDistance}
                onChange={(e) => setEstimatedDistance(e.target.value)}
                step="0.1"
                min="0"
              />
            </div>
            <div>
              <Input
                label="Estimated Time (minutes)"
                type="number"
                placeholder="e.g., 45"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(e.target.value)}
                min="0"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              disabled={isLoading}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSaveRoute}
              disabled={isLoading}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Route</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">Route Planning Tips</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Add multiple areas to create comprehensive routes</li>
              <li>• Include estimated distance and time for better planning</li>
              <li>• Use clear, descriptive names for easy identification</li>
              <li>• Consider traffic patterns and delivery windows</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddingRoutes;