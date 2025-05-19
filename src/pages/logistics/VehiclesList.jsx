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
import { toast } from "react-hot-toast";

const VehiclesList = () => {
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

  // Fetch vehicles from Firestore
  useEffect(() => {
    const fetchVehicles = async () => {
      setLoading(true);
      setError(null);

      try {
        let vehiclesQuery;

        if (filterStatus === "all") {
          vehiclesQuery = query(
            collection(db, "vehicles"),
            orderBy(sortField, sortDirection)
          );
        } else {
          vehiclesQuery = query(
            collection(db, "vehicles"),
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

        setVehicles(vehiclesData);
        setFilteredVehicles(vehiclesData);
      } catch (err) {
        console.error("Error fetching vehicles:", err);
        setError("Failed to load vehicles. Please try again.");
        toast.error("Error loading vehicles");
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [filterStatus, sortField, sortDirection]);

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
            vehicle.model.toLowerCase().includes(lowercasedSearch))
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
        await deleteDoc(doc(db, "vehicles", id));
        setVehicles(vehicles.filter((vehicle) => vehicle.id !== id));
        setFilteredVehicles(
          filteredVehicles.filter((vehicle) => vehicle.id !== id)
        );
        toast.success("Vehicle deleted successfully");
      } catch (err) {
        console.error("Error deleting vehicle:", err);
        toast.error("Failed to delete vehicle");
      }
    }
  };

  // Handle vehicle status update
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "vehicles", id), {
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

      toast.success("Vehicle status updated");
    } catch (err) {
      console.error("Error updating vehicle status:", err);
      toast.error("Failed to update status");
    }
  };

  // View vehicle details
  const handleViewDetails = (vehicle) => {
    setSelectedVehicle(vehicle);
  };

  // Close vehicle details modal
  const closeDetailsModal = () => {
    setSelectedVehicle(null);
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

  // Loading state
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
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
    <div className="bg-white rounded-lg shadow-md">
      {/* Header with title and action buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Vehicles List</h2>
        <div className="mt-3 md:mt-0">
          <button
            className="bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            onClick={() => (window.location.href = "/add-vehicle")}
          >
            Add New Vehicle
          </button>
        </div>
      </div>

      {/* Search and filter controls */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
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
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search vehicles..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          <div>
            <select
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
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
          <div className="p-6 text-center text-gray-500">
            {searchTerm
              ? "No vehicles matching your search."
              : "No vehicles found. Add your first vehicle."}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("vehicleNumber")}
                >
                  <div className="flex items-center">
                    Vehicle Number
                    {sortField === "vehicleNumber" && (
                      <svg
                        className={`ml-1 w-4 h-4 ${
                          sortDirection === "desc" ? "transform rotate-180" : ""
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
                  Vehicle Details
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center">
                    Status
                    {sortField === "status" && (
                      <svg
                        className={`ml-1 w-4 h-4 ${
                          sortDirection === "desc" ? "transform rotate-180" : ""
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
                  Dates
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
                <tr key={vehicle.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {vehicle.vehicleNumber}
                    </div>
                    {vehicle.vehicleName && (
                      <div className="text-sm text-gray-500">
                        {vehicle.vehicleName}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {vehicle.manufacturer} {vehicle.model}{" "}
                      {vehicle.year && `(${vehicle.year})`}
                    </div>
                    <div className="text-xs text-gray-500">
                      Type:{" "}
                      {vehicle.vehicleType
                        ? vehicle.vehicleType.charAt(0).toUpperCase() +
                          vehicle.vehicleType.slice(1)
                        : "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
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
                      Last Service: {formatDate(vehicle.lastServiceDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(vehicle)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      View
                    </button>
                    <button
                      onClick={() =>
                        (window.location.href = `/edit-vehicle/${vehicle.id}`)
                      }
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteVehicle(vehicle.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Results summary */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-right sm:px-6">
        <p className="text-sm text-gray-700">
          Showing <span className="font-medium">{filteredVehicles.length}</span>{" "}
          {filteredVehicles.length === 1 ? "vehicle" : "vehicles"}
          {searchTerm && ` matching "${searchTerm}"`}
          {filterStatus !== "all" && ` with status "${filterStatus}"`}
        </p>
      </div>

      {/* Vehicle details modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black opacity-50"
            onClick={closeDetailsModal}
          ></div>
          <div className="relative bg-white rounded-lg max-w-lg w-full mx-auto shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-800">
                Vehicle Details
              </h3>
              <button
                onClick={closeDetailsModal}
                className="text-gray-400 hover:text-gray-500"
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
            <div className="px-6 py-4">
              <div className="mb-4">
                <div className="flex justify-between">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {selectedVehicle.vehicleNumber}
                    </h4>
                    {selectedVehicle.vehicleName && (
                      <p className="text-gray-600">
                        {selectedVehicle.vehicleName}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2 h-6 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
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

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Vehicle Details
                  </p>
                  <p className="mt-1">
                    <span className="text-gray-900">
                      {selectedVehicle.manufacturer} {selectedVehicle.model}
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
                      ? selectedVehicle.vehicleType.charAt(0).toUpperCase() +
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

                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Current Stats
                  </p>
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

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Important Dates
                  </p>
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

                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Maintenance
                  </p>
                  <p className="text-gray-600">
                    Last Service: {formatDate(selectedVehicle.lastServiceDate)}
                  </p>
                  <p className="text-gray-600">
                    Next Service: {formatDate(selectedVehicle.nextServiceDue)}
                  </p>
                </div>
              </div>

              {selectedVehicle.notes && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500">Notes</p>
                  <p className="text-gray-600 mt-1">{selectedVehicle.notes}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-200 flex justify-between">
              <div className="flex space-x-2">
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
                      ? "bg-green-100 text-green-800 cursor-default"
                      : "border border-green-300 text-green-700 hover:bg-green-50"
                  }`}
                  disabled={selectedVehicle.status === "active"}
                >
                  Set Active
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
                      ? "bg-yellow-100 text-yellow-800 cursor-default"
                      : "border border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                  }`}
                  disabled={selectedVehicle.status === "maintenance"}
                >
                  Set In Maintenance
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
                      ? "bg-gray-100 text-gray-800 cursor-default"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                  disabled={selectedVehicle.status === "inactive"}
                >
                  Set Inactive
                </button>
              </div>
              <button
                onClick={() =>
                  (window.location.href = `/edit-vehicle/${selectedVehicle.id}`)
                }
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:opacity-90 focus:outline-none"
              >
                Edit Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehiclesList;
