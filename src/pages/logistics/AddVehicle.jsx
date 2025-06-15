import React, { useState } from "react";
import { collection, addDoc, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useBusiness } from "../../contexts/BusinessContext";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";

const AddVehicle = () => {
  const { currentBusiness } = useBusiness();
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    vehicleNumber: "",
    vehicleName: "",
    vehicleType: "truck",
    manufacturer: "",
    model: "",
    year: "",
    purchaseDate: "",
    insuranceExpiryDate: "",
    registrationExpiryDate: "",
    fuelType: "diesel",
    averageMileage: "",
    currentOdometer: "",
    lastServiceDate: "",
    nextServiceDue: "",
    notes: "",
  });

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Debug logging
    console.log("Form submitted");
    console.log("Current User:", currentUser);
    console.log("Current Business:", currentBusiness);
    console.log("Form Data:", formData);

    // Enhanced validation
    if (!formData.vehicleNumber.trim()) {
      toast.error("Vehicle number is required");
      return;
    }

    if (!currentUser) {
      toast.error("User not authenticated");
      return;
    }

    if (!currentBusiness || !currentBusiness.id) {
      toast.error("No business selected");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for saving
      const vehicleData = {
        ...formData,
        vehicleNumber: formData.vehicleNumber.trim(),
        vehicleName: formData.vehicleName.trim(),
        manufacturer: formData.manufacturer.trim(),
        model: formData.model.trim(),
        notes: formData.notes.trim(),
        year: formData.year ? parseInt(formData.year) : null,
        averageMileage: formData.averageMileage
          ? parseFloat(formData.averageMileage)
          : null,
        currentOdometer: formData.currentOdometer
          ? parseFloat(formData.currentOdometer)
          : null,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "active",
        businessId: currentBusiness.id,
        ownerId: currentUser.uid,
      };

      console.log("Vehicle data to save:", vehicleData);

      // Simple path for your structure
      const vehiclesCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/vehicles`;
      console.log("Vehicles collection path:", vehiclesCollectionPath);

      // First, add the document to get the auto-generated ID
      const docRef = await addDoc(collection(db, vehiclesCollectionPath), vehicleData);
      
      // Now update the document to include the vehicle_id field
      await updateDoc(docRef, {
        vehicle_id: docRef.id  // Save the auto-generated ID as vehicle_id field
      });
      
      console.log("Vehicle document created with auto-generated ID:", docRef.id);

      // Show success message
      toast.success("Vehicle added successfully");

      // Reset form
      setFormData({
        vehicleNumber: "",
        vehicleName: "",
        vehicleType: "truck",
        manufacturer: "",
        model: "",
        year: "",
        purchaseDate: "",
        insuranceExpiryDate: "",
        registrationExpiryDate: "",
        fuelType: "diesel",
        averageMileage: "",
        currentOdometer: "",
        lastServiceDate: "",
        nextServiceDue: "",
        notes: "",
      });
    } catch (error) {
      console.error("Error adding vehicle:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      // More specific error messages
      if (error.code === 'permission-denied') {
        toast.error("Permission denied. Check your Firestore rules.");
      } else if (error.code === 'not-found') {
        toast.error("Collection path not found. Check your database structure.");
      } else {
        toast.error(`Failed to add vehicle: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-8">
        Add New Vehicle
      </h2>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information Section */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vehicle Number */}
            <div>
              <label
                htmlFor="vehicleNumber"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Vehicle Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="vehicleNumber"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="e.g., KA-01-AB-1234"
                required
              />
            </div>

            {/* Vehicle Name */}
            <div>
              <label
                htmlFor="vehicleName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Vehicle Name <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                id="vehicleName"
                name="vehicleName"
                value={formData.vehicleName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="e.g., Mill Truck 1"
              />
            </div>

            {/* Vehicle Type */}
            <div>
              <label
                htmlFor="vehicleType"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Vehicle Type
              </label>
              <select
                id="vehicleType"
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              >
                <option value="truck">Truck</option>
                <option value="tractor">Tractor</option>
                <option value="pickup">Pickup</option>
                <option value="car">Car</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Manufacturer */}
            <div>
              <label
                htmlFor="manufacturer"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Manufacturer
              </label>
              <input
                type="text"
                id="manufacturer"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="e.g., Tata, Mahindra"
              />
            </div>

            {/* Model */}
            <div>
              <label
                htmlFor="model"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Model
              </label>
              <input
                type="text"
                id="model"
                name="model"
                value={formData.model}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="e.g., 407, Bolero"
              />
            </div>

            {/* Year */}
            <div>
              <label
                htmlFor="year"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Year
              </label>
              <input
                type="number"
                id="year"
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="e.g., 2022"
                min="1990"
                max={new Date().getFullYear()}
              />
            </div>
          </div>
        </div>

        {/* Registration & Insurance Section */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">
            Registration & Insurance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Purchase Date */}
            <div>
              <label
                htmlFor="purchaseDate"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Purchase Date
              </label>
              <input
                type="date"
                id="purchaseDate"
                name="purchaseDate"
                value={formData.purchaseDate}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              />
            </div>

            {/* Insurance Expiry Date */}
            <div>
              <label
                htmlFor="insuranceExpiryDate"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Insurance Expiry Date
              </label>
              <input
                type="date"
                id="insuranceExpiryDate"
                name="insuranceExpiryDate"
                value={formData.insuranceExpiryDate}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              />
            </div>

            {/* Registration Expiry Date */}
            <div>
              <label
                htmlFor="registrationExpiryDate"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Registration Expiry Date
              </label>
              <input
                type="date"
                id="registrationExpiryDate"
                name="registrationExpiryDate"
                value={formData.registrationExpiryDate}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Fuel & Maintenance Section */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">
            Fuel & Maintenance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fuel Type */}
            <div>
              <label
                htmlFor="fuelType"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Fuel Type
              </label>
              <select
                id="fuelType"
                name="fuelType"
                value={formData.fuelType}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              >
                <option value="diesel">Diesel</option>
                <option value="petrol">Petrol</option>
                <option value="cng">CNG</option>
                <option value="electric">Electric</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            {/* Average Mileage */}
            <div>
              <label
                htmlFor="averageMileage"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Average Mileage (km/l)
              </label>
              <input
                type="number"
                id="averageMileage"
                name="averageMileage"
                value={formData.averageMileage}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="e.g., 12.5"
                step="0.1"
                min="0"
              />
            </div>

            {/* Current Odometer */}
            <div>
              <label
                htmlFor="currentOdometer"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Current Odometer (km)
              </label>
              <input
                type="number"
                id="currentOdometer"
                name="currentOdometer"
                value={formData.currentOdometer}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="e.g., 25000"
                min="0"
              />
            </div>

            {/* Last Service Date */}
            <div>
              <label
                htmlFor="lastServiceDate"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Last Service Date
              </label>
              <input
                type="date"
                id="lastServiceDate"
                name="lastServiceDate"
                value={formData.lastServiceDate}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              />
            </div>

            {/* Next Service Due */}
            <div>
              <label
                htmlFor="nextServiceDue"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Next Service Due Date
              </label>
              <input
                type="date"
                id="nextServiceDue"
                name="nextServiceDue"
                value={formData.nextServiceDue}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">
            Additional Information
          </h3>
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
              placeholder="Any additional information about the vehicle..."
            ></textarea>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg transition-all duration-200 ${
              isSubmitting
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-blue-700 active:bg-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Adding Vehicle...
              </span>
            ) : (
              "Add Vehicle"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddVehicle;