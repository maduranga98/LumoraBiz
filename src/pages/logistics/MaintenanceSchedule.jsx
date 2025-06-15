import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  orderBy,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { useBusiness } from "../../contexts/BusinessContext";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";
import {
  format,
  parseISO,
  isAfter,
  isBefore,
  isToday,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameMonth,
  isSameDay,
  addDays,
} from "date-fns";

const MaintenanceSchedule = () => {
  const { currentBusiness } = useBusiness();
  const { currentUser } = useAuth();
  
  const [view, setView] = useState("list"); // "list" or "calendar"
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maintenanceTasks, setMaintenanceTasks] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filter states
  const [filters, setFilters] = useState({
    status: "upcoming", // "all", "upcoming", "overdue", "completed", "canceled"
    vehicle: "all",
    serviceType: "all",
    dateRange: "next30days", // "all", "next30days", "next3months", "past"
  });

  // New task form state
  const [newTask, setNewTask] = useState({
    vehicleId: "",
    serviceType: "oil_change",
    description: "",
    scheduledDate: format(addDays(new Date(), 7), "yyyy-MM-dd"), // Default to one week from now
    priority: "medium",
    estimatedCost: "",
    notes: "",
    remindBefore: "3", // days
  });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || !currentBusiness?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Correct collection paths for your structure
        const vehiclesCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/vehicles`;
        const servicesCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/vehicleServices`;
        
        console.log("Fetching vehicles from:", vehiclesCollectionPath);
        console.log("Fetching services from:", servicesCollectionPath);

        // Fetch vehicles
        const vehiclesQuery = query(collection(db, vehiclesCollectionPath));
        const vehiclesSnapshot = await getDocs(vehiclesQuery);
        const vehiclesData = [];
        vehiclesSnapshot.forEach((doc) => {
          vehiclesData.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        console.log("Fetched vehicles:", vehiclesData);
        setVehicles(vehiclesData);

        // Fetch maintenance/service tasks
        const servicesQuery = query(
          collection(db, servicesCollectionPath),
          orderBy("scheduledDate", "asc")
        );
        const servicesSnapshot = await getDocs(servicesQuery);
        const servicesData = [];
        servicesSnapshot.forEach((doc) => {
          // Enhance with additional data like status
          const data = doc.data();
          let status = "upcoming";
          const scheduledDate = parseISO(data.scheduledDate);

          if (data.completed) {
            status = "completed";
          } else if (data.canceled) {
            status = "canceled";
          } else if (isBefore(scheduledDate, new Date()) && !isToday(scheduledDate)) {
            status = "overdue";
          }

          // Find vehicle details
          const vehicle = vehiclesData.find((v) => v.id === data.vehicleId);

          servicesData.push({
            id: doc.id,
            ...data,
            status,
            scheduledDateObj: scheduledDate,
            formattedScheduledDate: format(scheduledDate, "MMM dd, yyyy"),
            vehicleNumber: vehicle?.vehicleNumber || "Unknown",
            vehicleName: vehicle?.vehicleName || "",
          });
        });
        
        console.log("Fetched services:", servicesData);
        setMaintenanceTasks(servicesData);
      } catch (err) {
        console.error("Error fetching data:", err);
        console.error("Error code:", err.code);
        console.error("Error message:", err.message);
        
        if (err.code === 'permission-denied') {
          setError("Permission denied. Check your Firestore rules.");
        } else if (err.code === 'not-found') {
          setError("Services collection not found.");
        } else {
          setError("Failed to load maintenance schedule. Please try again.");
        }
        toast.error("Error loading maintenance schedule");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, currentBusiness]);

  // Filter tasks based on selected filters
  const filteredTasks = maintenanceTasks.filter((task) => {
    // Filter by status
    if (filters.status !== "all" && task.status !== filters.status) {
      return false;
    }

    // Filter by vehicle
    if (filters.vehicle !== "all" && task.vehicleId !== filters.vehicle) {
      return false;
    }

    // Filter by service type
    if (
      filters.serviceType !== "all" &&
      task.serviceType !== filters.serviceType
    ) {
      return false;
    }

    // Filter by date range
    if (filters.dateRange !== "all") {
      const today = new Date();

      if (filters.dateRange === "next30days") {
        const thirtyDaysLater = addMonths(today, 1);
        return (
          isAfter(task.scheduledDateObj, today) &&
          isBefore(task.scheduledDateObj, thirtyDaysLater)
        );
      } else if (filters.dateRange === "next3months") {
        const threeMonthsLater = addMonths(today, 3);
        return (
          isAfter(task.scheduledDateObj, today) &&
          isBefore(task.scheduledDateObj, threeMonthsLater)
        );
      } else if (filters.dateRange === "past") {
        return isBefore(task.scheduledDateObj, today) && !isToday(task.scheduledDateObj);
      }
    }

    return true;
  });

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle new task form changes
  const handleNewTaskChange = (e) => {
    const { name, value } = e.target;
    setNewTask((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission for new task
  const handleAddTask = async (e) => {
    e.preventDefault();

    if (!currentUser || !currentBusiness?.id) {
      toast.error("Please ensure you're logged in and have a business selected");
      return;
    }

    // Validate form
    if (!newTask.vehicleId) {
      toast.error("Please select a vehicle");
      return;
    }
    if (!newTask.scheduledDate) {
      toast.error("Please select a scheduled date");
      return;
    }

    setAddingTask(true);

    try {
      // Find vehicle details to store in the task
      const selectedVehicle = vehicles.find((v) => v.id === newTask.vehicleId);

      // Prepare service task data
      const taskData = {
        vehicleId: newTask.vehicleId,
        vehicle_id: selectedVehicle?.vehicle_id || newTask.vehicleId,
        vehicleNumber: selectedVehicle?.vehicleNumber || "Unknown",
        vehicleName: selectedVehicle?.vehicleName || "",
        businessId: currentBusiness.id,
        ownerId: currentUser.uid,
        serviceType: newTask.serviceType,
        description: newTask.description || getServiceTypeLabel(newTask.serviceType),
        scheduledDate: newTask.scheduledDate,
        priority: newTask.priority,
        estimatedCost: newTask.estimatedCost ? parseFloat(newTask.estimatedCost) : null,
        notes: newTask.notes || "",
        remindBefore: parseInt(newTask.remindBefore, 10),
        completed: false,
        canceled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Use the correct collection path for services
      const servicesCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/vehicleServices`;
      console.log("Adding service to:", servicesCollectionPath);

      // Add to database
      const docRef = await addDoc(collection(db, servicesCollectionPath), taskData);
      console.log("Service added with ID:", docRef.id);

      toast.success("Maintenance service scheduled successfully");

      // Reset form
      setNewTask({
        vehicleId: "",
        serviceType: "oil_change",
        description: "",
        scheduledDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
        priority: "medium",
        estimatedCost: "",
        notes: "",
        remindBefore: "3",
      });

      // Refresh data (in a real app, you might want to append instead of refetching)
      window.location.reload();
    } catch (err) {
      console.error("Error adding maintenance task:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      
      if (err.code === 'permission-denied') {
        toast.error("Permission denied. Check your Firestore rules.");
      } else {
        toast.error("Failed to schedule maintenance. Please try again.");
      }
    } finally {
      setAddingTask(false);
      setShowAddModal(false);
    }
  };

  // Handle complete/cancel task
  const handleUpdateTaskStatus = async (taskId, status) => {
    if (!currentUser || !currentBusiness?.id) {
      toast.error("Authentication error");
      return;
    }

    try {
      const servicesCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/vehicleServices`;
      const taskRef = doc(db, servicesCollectionPath, taskId);
      
      if (status === "completed") {
        await updateDoc(taskRef, {
          completed: true,
          completedAt: new Date(),
          updatedAt: new Date(),
        });
        toast.success("Service marked as completed");
      } else if (status === "canceled") {
        await updateDoc(taskRef, {
          canceled: true,
          canceledAt: new Date(),
          updatedAt: new Date(),
        });
        toast.success("Service canceled");
      }

      // Update local state
      setMaintenanceTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status,
                completed: status === "completed",
                canceled: status === "canceled",
              }
            : task
        )
      );
    } catch (err) {
      console.error(`Error updating task status:`, err);
      toast.error("Failed to update service status");
    }
  };

  // Helper function to get readable service type label
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

  // Helper to get status badge style
  const getStatusBadge = (status) => {
    let bgColor = "";
    let textColor = "";

    switch (status) {
      case "completed":
        bgColor = "bg-green-100";
        textColor = "text-green-800";
        break;
      case "overdue":
        bgColor = "bg-red-100";
        textColor = "text-red-800";
        break;
      case "upcoming":
        bgColor = "bg-blue-100";
        textColor = "text-blue-800";
        break;
      case "canceled":
        bgColor = "bg-gray-100";
        textColor = "text-gray-800";
        break;
      default:
        bgColor = "bg-gray-100";
        textColor = "text-gray-800";
    }

    return (
      <span
        className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${bgColor} ${textColor}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Helper to get priority badge
  const getPriorityBadge = (priority) => {
    let bgColor = "";
    let textColor = "";

    switch (priority) {
      case "high":
        bgColor = "bg-red-100";
        textColor = "text-red-800";
        break;
      case "medium":
        bgColor = "bg-yellow-100";
        textColor = "text-yellow-800";
        break;
      case "low":
        bgColor = "bg-green-100";
        textColor = "text-green-800";
        break;
      default:
        bgColor = "bg-gray-100";
        textColor = "text-gray-800";
    }

    return (
      <span
        className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${bgColor} ${textColor}`}
      >
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  // Calendar view functions
  const prevMonth = () => {
    setCurrentDate((prevDate) => addMonths(prevDate, -1));
  };

  const nextMonth = () => {
    setCurrentDate((prevDate) => addMonths(prevDate, 1));
  };

  const today = () => {
    setCurrentDate(new Date());
  };

  // Calendar rendering
  const renderCalendar = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = monthStart;
    const endDate = monthEnd;

    const dateFormat = "MMMM yyyy";
    const days = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    // Get tasks for the current month
    const tasksThisMonth = maintenanceTasks.filter((task) =>
      isSameMonth(task.scheduledDateObj, currentDate)
    );

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            {format(currentDate, dateFormat)}
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={prevMonth}
              className="p-2 rounded-full text-gray-600 hover:bg-gray-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              onClick={today}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-full text-gray-600 hover:bg-gray-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center p-2 text-sm font-medium text-gray-700"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days of the week before the first day of the month */}
          {Array.from({ length: getDay(monthStart) }).map((_, index) => (
            <div key={`empty-${index}`} className="h-24 p-1"></div>
          ))}

          {/* Actual days of the month */}
          {days.map((day) => {
            const dayTasks = tasksThisMonth.filter((task) =>
              isSameDay(task.scheduledDateObj, day)
            );

            const isCurrentDay = isSameDay(day, new Date());

            return (
              <div
                key={day.toString()}
                className={`h-24 p-1 border border-gray-100 ${
                  isCurrentDay ? "bg-blue-50" : ""
                }`}
              >
                <div className="h-full flex flex-col">
                  <div
                    className={`text-right p-1 ${
                      isCurrentDay ? "font-bold text-blue-600" : "text-gray-700"
                    }`}
                  >
                    {format(day, "d")}
                  </div>

                  <div className="flex-grow overflow-y-auto scrollbar-thin">
                    {dayTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`mb-1 p-1 text-xs rounded ${
                          task.status === "completed"
                            ? "bg-green-100"
                            : task.status === "overdue"
                            ? "bg-red-100"
                            : task.priority === "high"
                            ? "bg-yellow-100"
                            : "bg-blue-50"
                        }`}
                      >
                        <div className="font-medium truncate">
                          {task.vehicleNumber || "No Number"}
                        </div>
                        <div className="truncate">{task.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Check if user is authenticated and has business selected
  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Please log in to view maintenance schedule.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentBusiness?.id) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Please select a business to view maintenance schedule.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading indicator
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Error message
  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-500"
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

  // Main component return
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Maintenance Schedule
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Business: {currentBusiness.name || currentBusiness.id}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setView("list")}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              view === "list"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              view === "calendar"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Calendar View
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Schedule Service
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="overdue">Overdue</option>
              <option value="completed">Completed</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle
            </label>
            <select
              name="vehicle"
              value={filters.vehicle}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Vehicles</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicleNumber || "No Number"}{" "}
                  {vehicle.vehicleName && `- ${vehicle.vehicleName}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Type
            </label>
            <select
              name="serviceType"
              value={filters.serviceType}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="oil_change">Oil Change</option>
              <option value="tire_rotation">Tire Rotation</option>
              <option value="filter_replacement">Filter Replacement</option>
              <option value="brake_service">Brake Service</option>
              <option value="transmission_service">Transmission Service</option>
              <option value="air_conditioning">Air Conditioning</option>
              <option value="fluid_check">Fluid Check</option>
              <option value="battery_check">Battery Check</option>
              <option value="regular_service">Regular Service</option>
              <option value="major_service">Major Service</option>
              <option value="inspection">Vehicle Inspection</option>
              <option value="tire_replacement">Tire Replacement</option>
              <option value="engine_service">Engine Service</option>
              <option value="electrical_service">Electrical Service</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              name="dateRange"
              value={filters.dateRange}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Dates</option>
              <option value="next30days">Next 30 Days</option>
              <option value="next3months">Next 3 Months</option>
              <option value="past">Past Due</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content - List or Calendar View */}
      {view === "list" ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center">
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
                  d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 6v6m-2-6h8m-4-6h4"
                />
              </svg>
              <p className="text-lg font-medium text-gray-900 mb-2">
                No scheduled services found
              </p>
              <p className="text-gray-500">
                {filters.status !== "all" || filters.vehicle !== "all" || filters.serviceType !== "all"
                  ? "No services match your current filters."
                  : "You haven't scheduled any services yet."}
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                >
                  Schedule Your First Service
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Vehicle
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Service
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Scheduled Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Priority
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Estimated Cost
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
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {task.vehicleNumber || "No Number"}
                        </div>
                        {task.vehicleName && (
                          <div className="text-xs text-gray-500">
                            {task.vehicleName}
                          </div>
                        )}
                        {task.vehicle_id && (
                          <div className="text-xs text-gray-400">
                            ID: {task.vehicle_id}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {getServiceTypeLabel(task.serviceType)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {task.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {task.formattedScheduledDate}
                        </div>
                        {task.remindBefore && (
                          <div className="text-xs text-gray-500">
                            Remind {task.remindBefore} days before
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(task.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPriorityBadge(task.priority)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {task.estimatedCost 
                          ? `Rs. ${task.estimatedCost.toLocaleString()}`
                          : "Not specified"
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {task.status !== "completed" && task.status !== "canceled" && (
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleUpdateTaskStatus(task.id, "completed")}
                              className="text-green-600 hover:text-green-900 px-2 py-1 rounded hover:bg-green-50"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleUpdateTaskStatus(task.id, "canceled")}
                              className="text-red-600 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                        {task.notes && (
                          <div className="mt-1 text-xs text-gray-400 italic truncate max-w-xs">
                            {task.notes}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        renderCalendar()
      )}

      {/* Add Maintenance Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div 
              className="fixed inset-0 bg-black opacity-50"
              onClick={() => setShowAddModal(false)}
            ></div>
            <div className="relative bg-white rounded-xl w-full max-w-lg mx-auto p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Schedule Service
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleAddTask}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="vehicleId"
                      value={newTask.vehicleId}
                      onChange={handleNewTaskChange}
                      required
                      className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a vehicle</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.vehicleNumber || "No Number"}{" "}
                          {vehicle.vehicleName && `- ${vehicle.vehicleName}`}
                          {vehicle.manufacturer && vehicle.model 
                            ? ` (${vehicle.manufacturer} ${vehicle.model})`
                            : ""
                          }
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="serviceType"
                      value={newTask.serviceType}
                      onChange={handleNewTaskChange}
                      required
                      className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="oil_change">Oil Change</option>
                      <option value="tire_rotation">Tire Rotation</option>
                      <option value="filter_replacement">Filter Replacement</option>
                      <option value="brake_service">Brake Service</option>
                      <option value="transmission_service">Transmission Service</option>
                      <option value="air_conditioning">Air Conditioning</option>
                      <option value="fluid_check">Fluid Check</option>
                      <option value="battery_check">Battery Check</option>
                      <option value="regular_service">Regular Service</option>
                      <option value="major_service">Major Service</option>
                      <option value="inspection">Vehicle Inspection</option>
                      <option value="tire_replacement">Tire Replacement</option>
                      <option value="engine_service">Engine Service</option>
                      <option value="electrical_service">Electrical Service</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      name="description"
                      value={newTask.description}
                      onChange={handleNewTaskChange}
                      className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Brief description of service needed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Scheduled Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="scheduledDate"
                      value={newTask.scheduledDate}
                      onChange={handleNewTaskChange}
                      required
                      min={format(new Date(), "yyyy-MM-dd")}
                      className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        name="priority"
                        value={newTask.priority}
                        onChange={handleNewTaskChange}
                        className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estimated Cost (Rs.)
                      </label>
                      <input
                        type="number"
                        name="estimatedCost"
                        value={newTask.estimatedCost}
                        onChange={handleNewTaskChange}
                        className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Remind Before
                    </label>
                    <select
                      name="remindBefore"
                      value={newTask.remindBefore}
                      onChange={handleNewTaskChange}
                      className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="1">1 day before</option>
                      <option value="3">3 days before</option>
                      <option value="7">1 week before</option>
                      <option value="14">2 weeks before</option>
                      <option value="30">1 month before</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Notes
                    </label>
                    <textarea
                      name="notes"
                      value={newTask.notes}
                      onChange={handleNewTaskChange}
                      className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="3"
                      placeholder="Any special instructions or additional details..."
                    ></textarea>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingTask}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70 font-medium"
                  >
                    {addingTask ? "Scheduling..." : "Schedule Service"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceSchedule;