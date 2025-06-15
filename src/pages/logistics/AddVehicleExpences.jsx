import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useBusiness } from "../../contexts/BusinessContext";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";

const AddVehicleExpenses = () => {
  const { currentBusiness } = useBusiness();
  const { currentUser } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    vehicleId: "",
    expenseType: "fuel",
    date: new Date().toISOString().split("T")[0], // Today's date as default
    amount: "",
    odometer: "",
    quantity: "",
    description: "",
    serviceType: "",
    serviceProvider: "",
    billNumber: "",
    paymentMethod: "cash",
  });

  // Fetch vehicles for dropdown
  useEffect(() => {
    const fetchVehicles = async () => {
      if (!currentUser || !currentBusiness?.id) {
        setLoading(false);
        return;
      }

      try {
        // Correct collection path for your structure
        const vehiclesCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/vehicles`;
        console.log("Fetching vehicles from:", vehiclesCollectionPath);

        const vehiclesQuery = query(
          collection(db, vehiclesCollectionPath),
          where("status", "==", "active")
        );
        const querySnapshot = await getDocs(vehiclesQuery);

        const vehiclesData = [];
        querySnapshot.forEach((doc) => {
          vehiclesData.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        console.log("Fetched vehicles:", vehiclesData);
        setVehicles(vehiclesData);
      } catch (error) {
        console.error("Error fetching vehicles:", error);
        toast.error("Failed to load vehicles");
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [currentUser, currentBusiness]);

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

    if (!currentUser || !currentBusiness?.id) {
      toast.error("Please ensure you're logged in and have a business selected");
      return;
    }

    // Basic validation
    if (!formData.vehicleId) {
      toast.error("Please select a vehicle");
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!formData.date) {
      toast.error("Please select a date");
      return;
    }

    setIsSubmitting(true);

    try {
      // Find the selected vehicle to get its details
      const selectedVehicle = vehicles.find((v) => v.id === formData.vehicleId);
      
      // Prepare data for saving
      const expenseData = {
        vehicleId: formData.vehicleId,
        vehicle_id: selectedVehicle?.vehicle_id || formData.vehicleId, // Include vehicle_id field
        vehicleNumber: selectedVehicle?.vehicleNumber || "",
        vehicleName: selectedVehicle?.vehicleName || null,
        businessId: currentBusiness.id,
        ownerId: currentUser.uid,
        expenseType: formData.expenseType,
        date: formData.date,
        amount: parseFloat(formData.amount),
        odometer: formData.odometer ? parseFloat(formData.odometer) : null,
        quantity: formData.quantity ? parseFloat(formData.quantity) : null,
        description: formData.description,
        serviceType:
          formData.expenseType === "service" ||
          formData.expenseType === "repair"
            ? formData.serviceType
            : null,
        serviceProvider: formData.serviceProvider || null,
        billNumber: formData.billNumber || null,
        paymentMethod: formData.paymentMethod,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Use the correct collection path for expenses
      const expensesCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/vehicleExpenses`;
      console.log("Adding expense to:", expensesCollectionPath);

      // Add document to vehicleExpenses collection
      const docRef = await addDoc(collection(db, expensesCollectionPath), expenseData);
      console.log("Expense added with ID:", docRef.id);

      // Show success message
      toast.success("Expense added successfully");

      // Reset form but keep the vehicle selected
      const vehicleId = formData.vehicleId;
      setFormData({
        vehicleId,
        expenseType: "fuel",
        date: new Date().toISOString().split("T")[0],
        amount: "",
        odometer: "",
        quantity: "",
        description: "",
        serviceType: "",
        serviceProvider: "",
        billNumber: "",
        paymentMethod: "cash",
      });
    } catch (error) {
      console.error("Error adding expense:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      if (error.code === 'permission-denied') {
        toast.error("Permission denied. Check your Firestore rules.");
      } else {
        toast.error("Failed to add expense. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Conditional fields based on expense type
  const renderConditionalFields = () => {
    switch (formData.expenseType) {
      case "fuel":
        return (
          <>
            <div>
              <label
                htmlFor="quantity"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Fuel Quantity (liters)
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., 40"
              />
            </div>
            <div>
              <label
                htmlFor="odometer"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Odometer Reading (km)
              </label>
              <input
                type="number"
                id="odometer"
                name="odometer"
                value={formData.odometer}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., 45000"
              />
            </div>
          </>
        );

      case "service":
        return (
          <>
            <div>
              <label
                htmlFor="serviceType"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Service Type
              </label>
              <select
                id="serviceType"
                name="serviceType"
                value={formData.serviceType}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Select service type</option>
                <option value="regular">Regular Service</option>
                <option value="oil_change">Oil Change</option>
                <option value="filter_change">Filter Change</option>
                <option value="tire_service">Tire Service</option>
                <option value="brake_service">Brake Service</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="odometer"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Odometer Reading (km)
              </label>
              <input
                type="number"
                id="odometer"
                name="odometer"
                value={formData.odometer}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., 45000"
              />
            </div>
            <div>
              <label
                htmlFor="serviceProvider"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Service Provider
              </label>
              <input
                type="text"
                id="serviceProvider"
                name="serviceProvider"
                value={formData.serviceProvider}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., City Service Center"
              />
            </div>
          </>
        );

      case "repair":
        return (
          <>
            <div>
              <label
                htmlFor="serviceType"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Repair Type
              </label>
              <select
                id="serviceType"
                name="serviceType"
                value={formData.serviceType}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Select repair type</option>
                <option value="engine">Engine Repair</option>
                <option value="electrical">Electrical System</option>
                <option value="suspension">Suspension</option>
                <option value="body_work">Body Work</option>
                <option value="transmission">Transmission</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="serviceProvider"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Repair Shop/Mechanic
              </label>
              <input
                type="text"
                id="serviceProvider"
                name="serviceProvider"
                value={formData.serviceProvider}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., Sharma Auto Works"
              />
            </div>
          </>
        );

      case "insurance":
        return (
          <div>
            <label
              htmlFor="serviceProvider"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Insurance Provider
            </label>
            <input
              type="text"
              id="serviceProvider"
              name="serviceProvider"
              value={formData.serviceProvider}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g., HDFC ERGO"
            />
          </div>
        );

      case "tax":
        return (
          <div>
            <label
              htmlFor="serviceType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Tax Type
            </label>
            <select
              id="serviceType"
              name="serviceType"
              value={formData.serviceType}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Select tax type</option>
              <option value="road_tax">Road Tax</option>
              <option value="registration_renewal">Registration Renewal</option>
              <option value="permit">Permit</option>
              <option value="other">Other</option>
            </select>
          </div>
        );

      default:
        return null;
    }
  };

  // Check if user is authenticated and has business selected
  if (!currentUser) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Please log in to add vehicle expenses.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentBusiness?.id) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Please select a business to add vehicle expenses.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Add Vehicle Expense</h2>
        <p className="text-sm text-gray-600 mt-1">
          Business: {currentBusiness.name || currentBusiness.id}
        </p>
      </div>

      {vehicles.length === 0 ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                No active vehicles found. Please add a vehicle first before recording expenses.
              </p>
              <div className="mt-3">
                <button
                  onClick={() => (window.location.href = "/add-vehicle")}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                >
                  Add Vehicle
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Expense Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vehicle Selection */}
              <div className="md:col-span-2">
                <label
                  htmlFor="vehicleId"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Select Vehicle <span className="text-red-500">*</span>
                </label>
                <select
                  id="vehicleId"
                  name="vehicleId"
                  value={formData.vehicleId}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                >
                  <option value="">Select a vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicleNumber || "No Number"}{" "}
                      {vehicle.vehicleName ? `(${vehicle.vehicleName})` : ""}
                      {vehicle.manufacturer && vehicle.model 
                        ? ` - ${vehicle.manufacturer} ${vehicle.model}`
                        : ""
                      }
                    </option>
                  ))}
                </select>
              </div>

              {/* Expense Type */}
              <div>
                <label
                  htmlFor="expenseType"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Expense Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="expenseType"
                  name="expenseType"
                  value={formData.expenseType}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                >
                  <option value="fuel">Fuel</option>
                  <option value="service">Service/Maintenance</option>
                  <option value="repair">Repair</option>
                  <option value="insurance">Insurance</option>
                  <option value="tax">Tax/Registration</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Date */}
              <div>
                <label
                  htmlFor="date"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label
                  htmlFor="amount"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Amount (Rs.) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g., 2500"
                  required
                />
              </div>

              {/* Dynamic fields based on expense type */}
              {renderConditionalFields()}

              {/* Bill Number */}
              <div>
                <label
                  htmlFor="billNumber"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Bill/Receipt Number
                </label>
                <input
                  type="text"
                  id="billNumber"
                  name="billNumber"
                  value={formData.billNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g., INV-12345"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label
                  htmlFor="paymentMethod"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Payment Method
                </label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description/Notes
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Additional details about this expense..."
                ></textarea>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`py-2.5 px-6 bg-blue-600 text-white font-medium rounded-lg transition-all ${
                isSubmitting
                  ? "opacity-70 cursor-not-allowed"
                  : "hover:bg-blue-700"
              }`}
            >
              {isSubmitting ? "Adding Expense..." : "Add Expense"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AddVehicleExpenses;