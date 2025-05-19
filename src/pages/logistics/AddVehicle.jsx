import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { toast } from "react-hot-toast";

const AddVehicle = () => {
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

    // Basic validation
    if (!formData.vehicleNumber) {
      toast.error("Vehicle number is required");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for saving
      const vehicleData = {
        ...formData,
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
      };

      // Add document to 'vehicles' collection
      await addDoc(collection(db, "vehicles"), vehicleData);

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
      toast.error("Failed to add vehicle. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        Add New Vehicle
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 mb-4">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vehicle Number */}
            <div>
              <label
                htmlFor="vehicleNumber"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Vehicle Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="vehicleNumber"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., KA-01-AB-1234"
                required
              />
            </div>

            {/* Vehicle Name (Optional) */}
            <div>
              <label
                htmlFor="vehicleName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Vehicle Name <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                id="vehicleName"
                name="vehicleName"
                value={formData.vehicleName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., Mill Truck 1"
              />
            </div>

            {/* Vehicle Type */}
            <div>
              <label
                htmlFor="vehicleType"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Vehicle Type
              </label>
              <select
                id="vehicleType"
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Manufacturer
              </label>
              <input
                type="text"
                id="manufacturer"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., Tata, Mahindra"
              />
            </div>

            {/* Model */}
            <div>
              <label
                htmlFor="model"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Model
              </label>
              <input
                type="text"
                id="model"
                name="model"
                value={formData.model}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., 407, Bolero"
              />
            </div>

            {/* Year */}
            <div>
              <label
                htmlFor="year"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Year
              </label>
              <input
                type="number"
                id="year"
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., 2022"
                min="1990"
                max={new Date().getFullYear()}
              />
            </div>
          </div>
        </div>

        {/* Registration & Insurance Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 mb-4">
            Registration & Insurance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Purchase Date */}
            <div>
              <label
                htmlFor="purchaseDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Purchase Date
              </label>
              <input
                type="date"
                id="purchaseDate"
                name="purchaseDate"
                value={formData.purchaseDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Insurance Expiry Date */}
            <div>
              <label
                htmlFor="insuranceExpiryDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Insurance Expiry Date
              </label>
              <input
                type="date"
                id="insuranceExpiryDate"
                name="insuranceExpiryDate"
                value={formData.insuranceExpiryDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Registration Expiry Date */}
            <div>
              <label
                htmlFor="registrationExpiryDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Registration Expiry Date
              </label>
              <input
                type="date"
                id="registrationExpiryDate"
                name="registrationExpiryDate"
                value={formData.registrationExpiryDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Fuel & Maintenance Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 mb-4">
            Fuel & Maintenance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fuel Type */}
            <div>
              <label
                htmlFor="fuelType"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Fuel Type
              </label>
              <select
                id="fuelType"
                name="fuelType"
                value={formData.fuelType}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Average Mileage (km/l)
              </label>
              <input
                type="number"
                id="averageMileage"
                name="averageMileage"
                value={formData.averageMileage}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., 12.5"
                step="0.1"
              />
            </div>

            {/* Current Odometer */}
            <div>
              <label
                htmlFor="currentOdometer"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Current Odometer (km)
              </label>
              <input
                type="number"
                id="currentOdometer"
                name="currentOdometer"
                value={formData.currentOdometer}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., 25000"
              />
            </div>

            {/* Last Service Date */}
            <div>
              <label
                htmlFor="lastServiceDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Last Service Date
              </label>
              <input
                type="date"
                id="lastServiceDate"
                name="lastServiceDate"
                value={formData.lastServiceDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Next Service Due */}
            <div>
              <label
                htmlFor="nextServiceDue"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Next Service Due Date
              </label>
              <input
                type="date"
                id="nextServiceDue"
                name="nextServiceDue"
                value={formData.nextServiceDue}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 mb-4">
            Additional Information
          </h3>
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Any additional information about the vehicle..."
            ></textarea>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`py-2.5 px-6 bg-primary text-white font-medium rounded-lg transition-all ${
              isSubmitting
                ? "opacity-70 cursor-not-allowed"
                : "hover:opacity-90"
            }`}
          >
            {isSubmitting ? "Adding Vehicle..." : "Add Vehicle"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddVehicle;
