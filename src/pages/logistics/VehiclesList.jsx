import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  getDocs,
  where,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { useBusiness } from "../../contexts/BusinessContext";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";

const VehiclesList = () => {
  const { currentBusiness } = useBusiness();
  const { currentUser } = useAuth();

  // State management
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState("vehicleNumber");
  const [sortDirection, setSortDirection] = useState("asc");
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);

  // Fetch vehicles from Firestore
  useEffect(() => {
    const fetchVehicles = async () => {
      if (!currentUser || !currentBusiness?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Correct collection path for your structure
        const vehiclesCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/vehicles`;
        console.log("Fetching vehicles from:", vehiclesCollectionPath);

        let vehiclesQuery;

        if (filterStatus === "all") {
          vehiclesQuery = query(
            collection(db, vehiclesCollectionPath),
            orderBy(sortField, sortDirection)
          );
        } else {
          vehiclesQuery = query(
            collection(db, vehiclesCollectionPath),
            where("status", "==", filterStatus),
            orderBy(sortField, sortDirection)
          );
        }

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
        setFilteredVehicles(vehiclesData);
      } catch (err) {
        console.error("Error fetching vehicles:", err);
        console.error("Error code:", err.code);
        console.error("Error message:", err.message);

        if (err.code === "permission-denied") {
          setError("Permission denied. Check your Firestore rules.");
        } else if (err.code === "not-found") {
          setError("Vehicles collection not found.");
        } else if (err.code === "failed-precondition") {
          // This happens when the orderBy field doesn't exist in some documents
          setError("Some vehicles missing required fields for sorting.");
        } else {
          setError("Failed to load vehicles. Please try again.");
        }
        toast.error("Error loading vehicles");
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [currentUser, currentBusiness, filterStatus, sortField, sortDirection]);

  // Search and filter function
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredVehicles(vehicles);
    } else {
      const lowercasedSearch = searchTerm.toLowerCase();
      const filtered = vehicles.filter(
        (vehicle) =>
          (vehicle.vehicleNumber &&
            vehicle.vehicleNumber.toLowerCase().includes(lowercasedSearch)) ||
          (vehicle.vehicleName &&
            vehicle.vehicleName.toLowerCase().includes(lowercasedSearch)) ||
          (vehicle.manufacturer &&
            vehicle.manufacturer.toLowerCase().includes(lowercasedSearch)) ||
          (vehicle.model &&
            vehicle.model.toLowerCase().includes(lowercasedSearch)) ||
          (vehicle.vehicle_id &&
            vehicle.vehicle_id.toLowerCase().includes(lowercasedSearch))
      );
      setFilteredVehicles(filtered);
    }
  }, [searchTerm, vehicles]);

  // Handle sort change
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handle status filter change
  const handleStatusChange = (e) => {
    setFilterStatus(e.target.value);
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle vehicle deletion
  const handleDeleteVehicle = async (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this vehicle? This action cannot be undone."
      )
    ) {
      try {
        const vehicleDocPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/vehicles`;
        await deleteDoc(doc(db, vehicleDocPath, id));

        setVehicles(vehicles.filter((vehicle) => vehicle.id !== id));
        setFilteredVehicles(
          filteredVehicles.filter((vehicle) => vehicle.id !== id)
        );
        toast.success("Vehicle deleted successfully");

        // Close modal if the deleted vehicle was being viewed
        if (selectedVehicle && selectedVehicle.id === id) {
          setSelectedVehicle(null);
          setIsEditMode(false);
        }
      } catch (err) {
        console.error("Error deleting vehicle:", err);
        toast.error("Failed to delete vehicle");
      }
    }
  };

  // Handle vehicle status update
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const vehicleDocPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/vehicles`;
      await updateDoc(doc(db, vehicleDocPath, id), {
        status: newStatus,
        updatedAt: new Date(),
      });

      // Update local state
      const updatedVehicles = vehicles.map((vehicle) =>
        vehicle.id === id ? { ...vehicle, status: newStatus } : vehicle
      );

      setVehicles(updatedVehicles);
      setFilteredVehicles(
        filteredVehicles.map((vehicle) =>
          vehicle.id === id ? { ...vehicle, status: newStatus } : vehicle
        )
      );

      // Update selected vehicle if it's the one being updated
      if (selectedVehicle && selectedVehicle.id === id) {
        setSelectedVehicle({ ...selectedVehicle, status: newStatus });
      }

      toast.success("Vehicle status updated");
    } catch (err) {
      console.error("Error updating vehicle status:", err);
      toast.error("Failed to update status");
    }
  };

  // View vehicle details
  const handleViewDetails = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsEditMode(false);
    setEditFormData({});
  };

  // Enter edit mode
  const handleEditVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsEditMode(true);
    // Initialize form data with current vehicle data
    setEditFormData({
      vehicleNumber: vehicle.vehicleNumber || "",
      vehicleName: vehicle.vehicleName || "",
      manufacturer: vehicle.manufacturer || "",
      model: vehicle.model || "",
      year: vehicle.year || "",
      vehicleType: vehicle.vehicleType || "",
      fuelType: vehicle.fuelType || "",
      averageMileage: vehicle.averageMileage || "",
      currentOdometer: vehicle.currentOdometer || "",
      purchaseDate: vehicle.purchaseDate
        ? formatDateForInput(vehicle.purchaseDate)
        : "",
      insuranceExpiryDate: vehicle.insuranceExpiryDate
        ? formatDateForInput(vehicle.insuranceExpiryDate)
        : "",
      registrationExpiryDate: vehicle.registrationExpiryDate
        ? formatDateForInput(vehicle.registrationExpiryDate)
        : "",
      lastServiceDate: vehicle.lastServiceDate
        ? formatDateForInput(vehicle.lastServiceDate)
        : "",
      nextServiceDue: vehicle.nextServiceDue
        ? formatDateForInput(vehicle.nextServiceDue)
        : "",
      notes: vehicle.notes || "",
      status: vehicle.status || "active",
    });
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Save vehicle changes
  const handleSaveVehicle = async () => {
    setSaveLoading(true);
    try {
      const vehicleDocPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/vehicles`;

      // Prepare update data
      const updateData = {
        ...editFormData,
        // Convert date strings back to Date objects
        purchaseDate: editFormData.purchaseDate
          ? new Date(editFormData.purchaseDate)
          : null,
        insuranceExpiryDate: editFormData.insuranceExpiryDate
          ? new Date(editFormData.insuranceExpiryDate)
          : null,
        registrationExpiryDate: editFormData.registrationExpiryDate
          ? new Date(editFormData.registrationExpiryDate)
          : null,
        lastServiceDate: editFormData.lastServiceDate
          ? new Date(editFormData.lastServiceDate)
          : null,
        nextServiceDue: editFormData.nextServiceDue
          ? new Date(editFormData.nextServiceDue)
          : null,
        // Convert numeric fields
        year: editFormData.year ? parseInt(editFormData.year) : null,
        averageMileage: editFormData.averageMileage
          ? parseFloat(editFormData.averageMileage)
          : null,
        currentOdometer: editFormData.currentOdometer
          ? parseFloat(editFormData.currentOdometer)
          : null,
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, vehicleDocPath, selectedVehicle.id), updateData);

      // Update local state
      const updatedVehicle = { ...selectedVehicle, ...updateData };
      const updatedVehicles = vehicles.map((vehicle) =>
        vehicle.id === selectedVehicle.id ? updatedVehicle : vehicle
      );

      setVehicles(updatedVehicles);
      setFilteredVehicles(
        filteredVehicles.map((vehicle) =>
          vehicle.id === selectedVehicle.id ? updatedVehicle : vehicle
        )
      );

      setSelectedVehicle(updatedVehicle);
      setIsEditMode(false);
      toast.success("Vehicle updated successfully");
    } catch (err) {
      console.error("Error updating vehicle:", err);
      toast.error("Failed to update vehicle");
    } finally {
      setSaveLoading(false);
    }
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditFormData({});
  };

  // Close vehicle details modal
  const closeDetailsModal = () => {
    setSelectedVehicle(null);
    setIsEditMode(false);
    setEditFormData({});
  };

  // Format date for input field (YYYY-MM-DD)
  const formatDateForInput = (dateField) => {
    try {
      let date;
      if (dateField?.toDate) {
        date = dateField.toDate();
      } else if (dateField) {
        date = new Date(dateField);
      } else {
        return "";
      }
      return date.toISOString().split("T")[0];
    } catch (error) {
      console.error("Date formatting error:", error);
      return "";
    }
  };

  // Get human-readable dates
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    try {
      let date;

      // Handle Firestore timestamp or string date
      if (dateString.toDate) {
        date = dateString.toDate();
      } else {
        date = new Date(dateString);
      }

      return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid date";
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      case "repair":
        return "bg-orange-100 text-orange-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Check if user is authenticated and has business selected
  if (!currentUser) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Please log in to view vehicles.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentBusiness?.id) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Please select a business to view vehicles.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Vehicles List Component */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Header with title and action buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Vehicles List</h2>
            <p className="text-sm text-gray-600 mt-1">
              Business: {currentBusiness.name || currentBusiness.id}
            </p>
          </div>
          <div className="mt-3 md:mt-0">
            <button
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              onClick={() => (window.location.href = "/add-vehicle")}
            >
              Add New Vehicle
            </button>
          </div>
        </div>

        {/* Search and filter controls */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search vehicles by number, name, manufacturer..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
            </div>

            <div>
              <select
                className="block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
                value={filterStatus}
                onChange={handleStatusChange}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="maintenance">In Maintenance</option>
                <option value="repair">Under Repair</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Vehicles table */}
        <div className="overflow-x-auto">
          {filteredVehicles.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
              <p className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? "No vehicles found" : "No vehicles added yet"}
              </p>
              <p className="text-gray-500">
                {searchTerm
                  ? `No vehicles match "${searchTerm}".`
                  : "Add your first vehicle to get started."}
              </p>
              {!searchTerm && (
                <button
                  className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  onClick={() => (window.location.href = "/add-vehicle")}
                >
                  Add Your First Vehicle
                </button>
              )}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("vehicleNumber")}
                  >
                    <div className="flex items-center">
                      Vehicle Details
                      {sortField === "vehicleNumber" && (
                        <svg
                          className={`ml-1 w-4 h-4 ${
                            sortDirection === "desc"
                              ? "transform rotate-180"
                              : ""
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Vehicle Info
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center">
                      Status
                      {sortField === "status" && (
                        <svg
                          className={`ml-1 w-4 h-4 ${
                            sortDirection === "desc"
                              ? "transform rotate-180"
                              : ""
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Important Dates
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVehicles.map((vehicle) => (
                  <tr
                    key={vehicle.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {vehicle.vehicleNumber || "No Number"}
                      </div>
                      {vehicle.vehicleName && (
                        <div className="text-sm text-gray-600">
                          {vehicle.vehicleName}
                        </div>
                      )}
                      {vehicle.vehicle_id && (
                        <div className="text-xs text-gray-400">
                          ID: {vehicle.vehicle_id}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {vehicle.manufacturer || "Unknown"}{" "}
                        {vehicle.model || ""}{" "}
                        {vehicle.year && `(${vehicle.year})`}
                      </div>
                      <div className="text-xs text-gray-500">
                        Type:{" "}
                        {vehicle.vehicleType
                          ? vehicle.vehicleType.charAt(0).toUpperCase() +
                            vehicle.vehicleType.slice(1)
                          : "N/A"}{" "}
                        | Fuel:{" "}
                        {vehicle.fuelType
                          ? vehicle.fuelType.charAt(0).toUpperCase() +
                            vehicle.fuelType.slice(1)
                          : "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                          vehicle.status
                        )}`}
                      >
                        {vehicle.status
                          ? vehicle.status.charAt(0).toUpperCase() +
                            vehicle.status.slice(1)
                          : "Unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>Purchased: {formatDate(vehicle.purchaseDate)}</div>
                      <div>
                        Insurance: {formatDate(vehicle.insuranceExpiryDate)}
                      </div>
                      <div>
                        Registration:{" "}
                        {formatDate(vehicle.registrationExpiryDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetails(vehicle)}
                          className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEditVehicle(vehicle)}
                          className="text-indigo-600 hover:text-indigo-900 px-2 py-1 rounded hover:bg-indigo-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteVehicle(vehicle.id)}
                          className="text-red-600 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Results summary */}
        {filteredVehicles.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-right">
            <p className="text-sm text-gray-700">
              Showing{" "}
              <span className="font-medium">{filteredVehicles.length}</span>{" "}
              {filteredVehicles.length === 1 ? "vehicle" : "vehicles"}
              {searchTerm && ` matching "${searchTerm}"`}
              {filterStatus !== "all" && ` with status "${filterStatus}"`}
            </p>
          </div>
        )}
      </div>

      {/* FIXED MODAL - Full viewport modal with proper scrolling */}
      {selectedVehicle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-500 bg-opacity-75"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          {/* Background backdrop */}
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75"
            onClick={closeDetailsModal}
          ></div>

          {/* Modal panel - Centered and fully scrollable */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header - Fixed */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white rounded-t-lg flex-shrink-0">
              <h3
                className="text-xl font-semibold text-gray-900"
                id="modal-title"
              >
                {isEditMode ? "Edit Vehicle" : "Vehicle Details"}
              </h3>
              <button
                onClick={closeDetailsModal}
                className="text-gray-400 hover:text-gray-500 p-2 rounded-full hover:bg-gray-100"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Scrollable Content - Flexible height */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {isEditMode ? (
                // Edit Form
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vehicle Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="vehicleNumber"
                        value={editFormData.vehicleNumber}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter vehicle number"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vehicle Name
                      </label>
                      <input
                        type="text"
                        name="vehicleName"
                        value={editFormData.vehicleName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter vehicle name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Manufacturer
                      </label>
                      <input
                        type="text"
                        name="manufacturer"
                        value={editFormData.manufacturer}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Toyota, Honda"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Model
                      </label>
                      <input
                        type="text"
                        name="model"
                        value={editFormData.model}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Camry, Civic"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Year
                      </label>
                      <input
                        type="number"
                        name="year"
                        value={editFormData.year}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 2020"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vehicle Type
                      </label>
                      <select
                        name="vehicleType"
                        value={editFormData.vehicleType}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select type</option>
                        <option value="car">Car</option>
                        <option value="truck">Truck</option>
                        <option value="van">Van</option>
                        <option value="motorcycle">Motorcycle</option>
                        <option value="bus">Bus</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fuel Type
                      </label>
                      <select
                        name="fuelType"
                        value={editFormData.fuelType}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select fuel type</option>
                        <option value="petrol">Petrol</option>
                        <option value="diesel">Diesel</option>
                        <option value="electric">Electric</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="cng">CNG</option>
                        <option value="lpg">LPG</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        name="status"
                        value={editFormData.status}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="active">Active</option>
                        <option value="maintenance">In Maintenance</option>
                        <option value="repair">Under Repair</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    {/* Performance Data */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Average Mileage (km/l)
                      </label>
                      <input
                        type="number"
                        name="averageMileage"
                        value={editFormData.averageMileage}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 15.5"
                        step="0.1"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Odometer (km)
                      </label>
                      <input
                        type="number"
                        name="currentOdometer"
                        value={editFormData.currentOdometer}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 50000"
                        min="0"
                      />
                    </div>

                    {/* Important Dates */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Purchase Date
                      </label>
                      <input
                        type="date"
                        name="purchaseDate"
                        value={editFormData.purchaseDate}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Insurance Expiry Date
                      </label>
                      <input
                        type="date"
                        name="insuranceExpiryDate"
                        value={editFormData.insuranceExpiryDate}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Registration Expiry Date
                      </label>
                      <input
                        type="date"
                        name="registrationExpiryDate"
                        value={editFormData.registrationExpiryDate}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Service Date
                      </label>
                      <input
                        type="date"
                        name="lastServiceDate"
                        value={editFormData.lastServiceDate}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Next Service Due
                      </label>
                      <input
                        type="date"
                        name="nextServiceDue"
                        value={editFormData.nextServiceDue}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={editFormData.notes}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Additional notes about the vehicle..."
                    />
                  </div>
                </form>
              ) : (
                // View Mode
                <div>
                  <div className="mb-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">
                          {selectedVehicle.vehicleNumber || "No Number"}
                        </h4>
                        {selectedVehicle.vehicleName && (
                          <p className="text-gray-600">
                            {selectedVehicle.vehicleName}
                          </p>
                        )}
                        {selectedVehicle.vehicle_id && (
                          <p className="text-sm text-gray-400">
                            Vehicle ID: {selectedVehicle.vehicle_id}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 inline-flex items-center text-sm leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                          selectedVehicle.status
                        )}`}
                      >
                        {selectedVehicle.status
                          ? selectedVehicle.status.charAt(0).toUpperCase() +
                            selectedVehicle.status.slice(1)
                          : "Unknown"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">
                        Vehicle Details
                      </p>
                      <div className="space-y-1">
                        <p className="text-gray-900">
                          <span className="font-medium">
                            {selectedVehicle.manufacturer || "Unknown"}{" "}
                            {selectedVehicle.model || ""}
                          </span>
                          {selectedVehicle.year && (
                            <span className="text-gray-600">
                              {" "}
                              ({selectedVehicle.year})
                            </span>
                          )}
                        </p>
                        <p className="text-gray-600">
                          Type:{" "}
                          {selectedVehicle.vehicleType
                            ? selectedVehicle.vehicleType
                                .charAt(0)
                                .toUpperCase() +
                              selectedVehicle.vehicleType.slice(1)
                            : "N/A"}
                        </p>
                        <p className="text-gray-600">
                          Fuel:{" "}
                          {selectedVehicle.fuelType
                            ? selectedVehicle.fuelType.charAt(0).toUpperCase() +
                              selectedVehicle.fuelType.slice(1)
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">
                        Current Stats
                      </p>
                      <div className="space-y-1">
                        <p className="text-gray-600">
                          Mileage:{" "}
                          {selectedVehicle.averageMileage
                            ? `${selectedVehicle.averageMileage} km/l`
                            : "N/A"}
                        </p>
                        <p className="text-gray-600">
                          Odometer:{" "}
                          {selectedVehicle.currentOdometer
                            ? `${selectedVehicle.currentOdometer} km`
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">
                        Important Dates
                      </p>
                      <div className="space-y-1">
                        <p className="text-gray-600">
                          Purchased: {formatDate(selectedVehicle.purchaseDate)}
                        </p>
                        <p className="text-gray-600">
                          Insurance Expires:{" "}
                          {formatDate(selectedVehicle.insuranceExpiryDate)}
                        </p>
                        <p className="text-gray-600">
                          Registration Expires:{" "}
                          {formatDate(selectedVehicle.registrationExpiryDate)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">
                        Maintenance
                      </p>
                      <div className="space-y-1">
                        <p className="text-gray-600">
                          Last Service:{" "}
                          {formatDate(selectedVehicle.lastServiceDate)}
                        </p>
                        <p className="text-gray-600">
                          Next Service:{" "}
                          {formatDate(selectedVehicle.nextServiceDue)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedVehicle.notes && (
                    <div className="mb-6">
                      <p className="text-sm font-medium text-gray-500 mb-2">
                        Notes
                      </p>
                      <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {selectedVehicle.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer - Fixed */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex-shrink-0">
              {isEditMode ? (
                // Edit Mode Actions
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveVehicle}
                    disabled={saveLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saveLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              ) : (
                // View Mode Actions
                <div className="flex flex-wrap justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedVehicle.id, "active");
                        setSelectedVehicle({
                          ...selectedVehicle,
                          status: "active",
                        });
                      }}
                      className={`px-3 py-1 text-xs rounded-md ${
                        selectedVehicle.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "border border-green-300 text-green-700 hover:bg-green-50"
                      }`}
                      disabled={selectedVehicle.status === "active"}
                    >
                      Active
                    </button>
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedVehicle.id, "maintenance");
                        setSelectedVehicle({
                          ...selectedVehicle,
                          status: "maintenance",
                        });
                      }}
                      className={`px-3 py-1 text-xs rounded-md ${
                        selectedVehicle.status === "maintenance"
                          ? "bg-yellow-100 text-yellow-800"
                          : "border border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                      }`}
                      disabled={selectedVehicle.status === "maintenance"}
                    >
                      Maintenance
                    </button>
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedVehicle.id, "repair");
                        setSelectedVehicle({
                          ...selectedVehicle,
                          status: "repair",
                        });
                      }}
                      className={`px-3 py-1 text-xs rounded-md ${
                        selectedVehicle.status === "repair"
                          ? "bg-orange-100 text-orange-800"
                          : "border border-orange-300 text-orange-700 hover:bg-orange-50"
                      }`}
                      disabled={selectedVehicle.status === "repair"}
                    >
                      Repair
                    </button>
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedVehicle.id, "inactive");
                        setSelectedVehicle({
                          ...selectedVehicle,
                          status: "inactive",
                        });
                      }}
                      className={`px-3 py-1 text-xs rounded-md ${
                        selectedVehicle.status === "inactive"
                          ? "bg-gray-100 text-gray-800"
                          : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                      disabled={selectedVehicle.status === "inactive"}
                    >
                      Inactive
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleEditVehicle(selectedVehicle)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteVehicle(selectedVehicle.id)}
                      className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VehiclesList;
