import React, { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useBusiness } from "../../contexts/BusinessContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  format,
  parseISO,
  isBefore,
  isToday,
  differenceInDays,
} from "date-fns";
import {
  Calendar,
  Clock,
  Truck,
  Wrench,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

const UpcomingMaintenance = () => {
  const { currentBusiness } = useBusiness();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [maintenanceTasks, setMaintenanceTasks] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  // Fetch data using the same structure as MaintenanceSchedule
  const fetchData = async (isRefresh = false) => {
    if (!currentUser || !currentBusiness?.id) {
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Use the exact same collection paths as MaintenanceSchedule
      const vehiclesCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/vehicles`;
      const servicesCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/vehicleServices`;

      // Fetch vehicles first
      const vehiclesQuery = query(collection(db, vehiclesCollectionPath));
      const vehiclesSnapshot = await getDocs(vehiclesQuery);
      const vehiclesData = [];
      vehiclesSnapshot.forEach((doc) => {
        vehiclesData.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      setVehicles(vehiclesData);

      // Fetch maintenance/service tasks
      const servicesQuery = query(
        collection(db, servicesCollectionPath),
        orderBy("scheduledDate", "asc")
      );
      const servicesSnapshot = await getDocs(servicesQuery);
      const servicesData = [];

      servicesSnapshot.forEach((doc) => {
        const data = doc.data();
        let status = "upcoming";
        const scheduledDate = parseISO(data.scheduledDate);

        if (data.completed) {
          status = "completed";
        } else if (data.canceled) {
          status = "canceled";
        } else if (
          isBefore(scheduledDate, new Date()) &&
          !isToday(scheduledDate)
        ) {
          status = "overdue";
        } else if (isToday(scheduledDate)) {
          status = "due-today";
        }

        // Find vehicle details
        const vehicle = vehiclesData.find((v) => v.id === data.vehicleId);

        servicesData.push({
          id: doc.id,
          ...data,
          status,
          scheduledDateObj: scheduledDate,
          formattedScheduledDate: format(scheduledDate, "MMM dd"),
          vehicleNumber: vehicle?.vehicleNumber || "Unknown",
          vehicleName: vehicle?.vehicleName || "",
          daysUntilDue: differenceInDays(scheduledDate, new Date()),
        });
      });

      // Filter to show upcoming and overdue tasks, prioritize urgent ones
      const filteredTasks = servicesData
        .filter(
          (task) => !task.completed && !task.canceled && task.daysUntilDue >= -7 // Show overdue up to 7 days and all upcoming
        )
        .sort((a, b) => {
          // Sort by urgency: overdue first, then by days until due
          if (a.daysUntilDue < 0 && b.daysUntilDue >= 0) return -1;
          if (a.daysUntilDue >= 0 && b.daysUntilDue < 0) return 1;
          return a.daysUntilDue - b.daysUntilDue;
        })
        .slice(0, 4);

      setMaintenanceTasks(filteredTasks);
    } catch (err) {
      console.error("Error fetching maintenance data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser, currentBusiness]);

  // Helper function to get readable service type label (same as MaintenanceSchedule)
  const getServiceTypeLabel = (type) => {
    const labels = {
      oil_change: "Oil Change",
      tire_rotation: "Tire Rotation",
      filter_replacement: "Filter Replacement",
      brake_service: "Brake Service",
      transmission_service: "Transmission Service",
      air_conditioning: "Air Conditioning Service",
      fluid_check: "Fluid Check & Top-up",
      battery_check: "Battery Check",
      regular_service: "Regular Service",
      major_service: "Major Service",
      inspection: "Vehicle Inspection",
      tire_replacement: "Tire Replacement",
      engine_service: "Engine Service",
      electrical_service: "Electrical Service",
      other: "Other Service",
    };
    return labels[type] || "Service";
  };

  // Get service type icon and color
  const getServiceTypeInfo = (type) => {
    const serviceTypes = {
      oil_change: { icon: "🛢️", color: "text-blue-600" },
      tire_rotation: { icon: "🔄", color: "text-green-600" },
      tire_replacement: { icon: "🚗", color: "text-green-600" },
      filter_replacement: { icon: "🔧", color: "text-gray-600" },
      brake_service: { icon: "🛑", color: "text-red-600" },
      transmission_service: { icon: "⚙️", color: "text-orange-600" },
      air_conditioning: { icon: "❄️", color: "text-cyan-600" },
      fluid_check: { icon: "💧", color: "text-blue-600" },
      battery_check: { icon: "🔋", color: "text-yellow-600" },
      regular_service: { icon: "🔧", color: "text-gray-600" },
      major_service: { icon: "🛠️", color: "text-purple-600" },
      inspection: { icon: "🔍", color: "text-gray-600" },
      engine_service: { icon: "⚙️", color: "text-orange-600" },
      electrical_service: { icon: "⚡", color: "text-yellow-600" },
      other: { icon: "🔧", color: "text-gray-600" },
    };
    return serviceTypes[type] || { icon: "🔧", color: "text-gray-600" };
  };

  // Get status indicator
  const getStatusIndicator = (task) => {
    if (task.status === "overdue" || task.daysUntilDue < 0) {
      return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
    } else if (task.status === "due-today" || task.daysUntilDue === 0) {
      return <div className="w-2 h-2 bg-orange-500 rounded-full"></div>;
    } else if (task.daysUntilDue <= 7 && task.daysUntilDue > 0) {
      return <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>;
    }
    return <div className="w-2 h-2 bg-blue-500 rounded-full"></div>;
  };

  // Get priority color (same as MaintenanceSchedule)
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  // Loading state
  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Upcoming Maintenance
          </h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Authentication check
  if (!currentUser || !currentBusiness?.id) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Upcoming Maintenance
        </h2>
        <div className="text-center py-6">
          <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">
            Please ensure you're logged in and have a business selected
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Upcoming Maintenance
        </h2>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Maintenance List */}
      <div className="space-y-3">
        {maintenanceTasks.length === 0 ? (
          <div className="text-center py-6">
            <Wrench className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No upcoming maintenance</p>
          </div>
        ) : (
          maintenanceTasks.map((task) => {
            const serviceInfo = getServiceTypeInfo(task.serviceType);

            return (
              <div
                key={task.id}
                className="border-l-4 border-gray-200 pl-4 py-2 hover:border-blue-400 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Vehicle and status indicator */}
                    <div className="flex items-center space-x-2 mb-1">
                      {getStatusIndicator(task)}
                      <span className="font-medium text-gray-900 text-sm">
                        {task.vehicleNumber}
                      </span>
                      {task.vehicleName && (
                        <span className="text-xs text-gray-500">
                          ({task.vehicleName})
                        </span>
                      )}
                      <span
                        className="text-xs"
                        title={getServiceTypeLabel(task.serviceType)}
                      >
                        {serviceInfo.icon}
                      </span>
                    </div>

                    {/* Service type and description */}
                    <p className="text-xs text-gray-600 mb-1 line-clamp-1">
                      {getServiceTypeLabel(task.serviceType)}
                      {task.description &&
                        task.description !==
                          getServiceTypeLabel(task.serviceType) &&
                        ` - ${task.description}`}
                    </p>

                    {/* Date and urgency info */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center space-x-1 text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{task.formattedScheduledDate}</span>
                      </span>

                      {/* Urgency indicators */}
                      <div className="flex items-center space-x-2">
                        {task.priority && task.priority !== "medium" && (
                          <span
                            className={`font-medium ${getPriorityColor(
                              task.priority
                            )}`}
                          >
                            {task.priority.charAt(0).toUpperCase()}
                          </span>
                        )}

                        {task.daysUntilDue === 0 && (
                          <span className="text-orange-600 font-medium">
                            Today
                          </span>
                        )}
                        {task.daysUntilDue < 0 && (
                          <span className="text-red-600 font-medium">
                            {Math.abs(task.daysUntilDue)}d overdue
                          </span>
                        )}
                        {task.daysUntilDue > 0 && task.daysUntilDue <= 7 && (
                          <span className="text-yellow-600 font-medium">
                            {task.daysUntilDue}d left
                          </span>
                        )}
                        {task.daysUntilDue > 7 && (
                          <span className="text-blue-600 font-medium">
                            {task.daysUntilDue}d
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Estimated cost if available */}
                    {task.estimatedCost && (
                      <div className="text-xs text-gray-500 mt-1">
                        Est: Rs.{" "}
                        {parseFloat(task.estimatedCost).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <button
          className="w-full text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          onClick={() => {
            // Navigate to maintenance schedule page
            // You can implement navigation logic here
            console.log("Navigate to maintenance schedule");
          }}
        >
          View All Maintenance →
        </button>
      </div>

      {/* Quick Stats */}
      {maintenanceTasks.length > 0 && (
        <div className="mt-3 flex justify-between text-xs text-gray-500">
          <span>
            <span className="font-medium text-red-600">
              {
                maintenanceTasks.filter(
                  (t) => t.status === "overdue" || t.daysUntilDue < 0
                ).length
              }
            </span>{" "}
            overdue
          </span>
          <span>
            <span className="font-medium text-orange-600">
              {
                maintenanceTasks.filter(
                  (t) => t.daysUntilDue <= 7 && t.daysUntilDue >= 0
                ).length
              }
            </span>{" "}
            due soon
          </span>
        </div>
      )}
    </div>
  );
};

export default UpcomingMaintenance;
