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
} from "date-fns";

const MaintenanceSchedule = () => {
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
    maintenanceType: "all",
    dateRange: "next30days", // "all", "next30days", "next3months", "past"
  });

  // New task form state
  const [newTask, setNewTask] = useState({
    vehicleId: "",
    maintenanceType: "oil_change",
    description: "",
    dueDate: format(addMonths(new Date(), 1), "yyyy-MM-dd"), // Default to one month from now
    priority: "medium",
    estimatedCost: "",
    notes: "",
    remindBefore: "7", // days
  });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch vehicles
        const vehiclesQuery = query(collection(db, "vehicles"));
        const vehiclesSnapshot = await getDocs(vehiclesQuery);
        const vehiclesData = [];
        vehiclesSnapshot.forEach((doc) => {
          vehiclesData.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        setVehicles(vehiclesData);

        // Fetch maintenance tasks
        const maintenanceQuery = query(
          collection(db, "maintenance"),
          orderBy("dueDate", "asc")
        );
        const maintenanceSnapshot = await getDocs(maintenanceQuery);
        const maintenanceData = [];
        maintenanceSnapshot.forEach((doc) => {
          // Enhance with additional data like status
          const data = doc.data();
          let status = "upcoming";
          const dueDate = parseISO(data.dueDate);

          if (data.completed) {
            status = "completed";
          } else if (data.canceled) {
            status = "canceled";
          } else if (isBefore(dueDate, new Date()) && !isToday(dueDate)) {
            status = "overdue";
          }

          // Find vehicle details
          const vehicle = vehiclesData.find((v) => v.id === data.vehicleId);

          maintenanceData.push({
            id: doc.id,
            ...data,
            status,
            dueDateObj: dueDate,
            formattedDueDate: format(dueDate, "MMM dd, yyyy"),
            vehicleNumber: vehicle?.vehicleNumber || "Unknown",
            vehicleName: vehicle?.vehicleName || "",
          });
        });
        setMaintenanceTasks(maintenanceData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load maintenance schedule. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

    // Filter by maintenance type
    if (
      filters.maintenanceType !== "all" &&
      task.maintenanceType !== filters.maintenanceType
    ) {
      return false;
    }

    // Filter by date range
    if (filters.dateRange !== "all") {
      const today = new Date();

      if (filters.dateRange === "next30days") {
        const thirtyDaysLater = addMonths(today, 1);
        return (
          isAfter(task.dueDateObj, today) &&
          isBefore(task.dueDateObj, thirtyDaysLater)
        );
      } else if (filters.dateRange === "next3months") {
        const threeMonthsLater = addMonths(today, 3);
        return (
          isAfter(task.dueDateObj, today) &&
          isBefore(task.dueDateObj, threeMonthsLater)
        );
      } else if (filters.dateRange === "past") {
        return isBefore(task.dueDateObj, today) && !isToday(task.dueDateObj);
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

    // Validate form
    if (!newTask.vehicleId) {
      toast.error("Please select a vehicle");
      return;
    }
    if (!newTask.dueDate) {
      toast.error("Please select a due date");
      return;
    }

    setAddingTask(true);

    try {
      // Find vehicle details to store in the task
      const selectedVehicle = vehicles.find((v) => v.id === newTask.vehicleId);

      // Prepare maintenance task data
      const taskData = {
        vehicleId: newTask.vehicleId,
        vehicleNumber: selectedVehicle?.vehicleNumber || "Unknown",
        maintenanceType: newTask.maintenanceType,
        description:
          newTask.description ||
          getMaintenanceTypeLabel(newTask.maintenanceType),
        dueDate: newTask.dueDate,
        priority: newTask.priority,
        estimatedCost: newTask.estimatedCost
          ? parseFloat(newTask.estimatedCost)
          : null,
        notes: newTask.notes || "",
        remindBefore: parseInt(newTask.remindBefore, 10),
        completed: false,
        canceled: false,
        createdAt: new Date().toISOString(),
      };

      // Add to database
      await addDoc(collection(db, "maintenance"), taskData);

      toast.success("Maintenance task scheduled successfully");

      // Refresh data (in a real app, you might want to append instead of refetching)
      window.location.reload();
    } catch (err) {
      console.error("Error adding maintenance task:", err);
      toast.error("Failed to schedule maintenance. Please try again.");
    } finally {
      setAddingTask(false);
      setShowAddModal(false);
    }
  };

  // Handle complete/cancel task
  const handleUpdateTaskStatus = async (taskId, status) => {
    try {
      const taskRef = doc(db, "maintenance", taskId);
      if (status === "completed") {
        await updateDoc(taskRef, {
          completed: true,
          completedAt: new Date().toISOString(),
        });
        toast.success("Task marked as completed");
      } else if (status === "canceled") {
        await updateDoc(taskRef, {
          canceled: true,
          canceledAt: new Date().toISOString(),
        });
        toast.success("Task canceled");
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
      toast.error("Failed to update task status");
    }
  };

  // Helper function to get readable maintenance type label
  const getMaintenanceTypeLabel = (type) => {
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
      other: "Other Maintenance",
    };
    return labels[type] || "Maintenance";
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
      isSameMonth(task.dueDateObj, currentDate)
    );

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800">
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
              className="px-3 py-1 text-sm bg-primary text-white rounded-md hover:opacity-90"
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
              isSameDay(task.dueDateObj, day)
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
                      isCurrentDay ? "font-bold text-primary" : "text-gray-700"
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
                          {task.vehicleNumber}
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

  // Loading indicator
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Error message
  if (error) {
    return (
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
    );
  }

  // Main component return
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
        <h1 className="text-2xl font-bold text-gray-800">
          Maintenance Schedule
        </h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setView("list")}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              view === "list"
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              view === "calendar"
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Calendar View
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-white hover:opacity-90"
          >
            Schedule Maintenance
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <h2 className="text-lg font-medium text-gray-800 mb-3">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md py-2 px-3"
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
              className="w-full border border-gray-300 rounded-md py-2 px-3"
            >
              <option value="all">All Vehicles</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicleNumber}{" "}
                  {vehicle.vehicleName && `- ${vehicle.vehicleName}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maintenance Type
            </label>
            <select
              name="maintenanceType"
              value={filters.maintenanceType}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md py-2 px-3"
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
              className="w-full border border-gray-300 rounded-md py-2 px-3"
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {filteredTasks.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500">
                No maintenance tasks found with the selected filters.
              </p>
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
                      Maintenance
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Due Date
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
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {task.vehicleNumber}
                        </div>
                        {task.vehicleName && (
                          <div className="text-xs text-gray-500">
                            {task.vehicleName}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {getMaintenanceTypeLabel(task.maintenanceType)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {task.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {task.formattedDueDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(task.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPriorityBadge(task.priority)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {task.status !== "completed" &&
                          task.status !== "canceled" && (
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() =>
                                  handleUpdateTaskStatus(task.id, "completed")
                                }
                                className="text-green-600 hover:text-green-900"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() =>
                                  handleUpdateTaskStatus(task.id, "canceled")
                                }
                                className="text-red-600 hover:text-red-900"
                              >
                                Cancel
                              </button>
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

      {/* Add Maintenance Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-50"></div>
            <div className="relative bg-white rounded-lg w-full max-w-md mx-auto p-6 shadow-xl">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Schedule Maintenance
              </h3>
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
                      className="w-full border border-gray-300 rounded-md py-2 px-3"
                    >
                      <option value="">Select a vehicle</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.vehicleNumber}{" "}
                          {vehicle.vehicleName && `- ${vehicle.vehicleName}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maintenance Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="maintenanceType"
                      value={newTask.maintenanceType}
                      onChange={handleNewTaskChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3"
                    >
                      <option value="oil_change">Oil Change</option>
                      <option value="tire_rotation">Tire Rotation</option>
                      <option value="filter_replacement">
                        Filter Replacement
                      </option>
                      <option value="brake_service">Brake Service</option>
                      <option value="transmission_service">
                        Transmission Service
                      </option>
                      <option value="air_conditioning">Air Conditioning</option>
                      <option value="fluid_check">Fluid Check</option>
                      <option value="battery_check">Battery Check</option>
                      <option value="regular_service">Regular Service</option>
                      <option value="major_service">Major Service</option>
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
                      className="w-full border border-gray-300 rounded-md py-2 px-3"
                      placeholder="Brief description of maintenance"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="dueDate"
                      value={newTask.dueDate}
                      onChange={handleNewTaskChange}
                      required
                      className="w-full border border-gray-300 rounded-md py-2 px-3"
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
                        className="w-full border border-gray-300 rounded-md py-2 px-3"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estimated Cost
                      </label>
                      <input
                        type="number"
                        name="estimatedCost"
                        value={newTask.estimatedCost}
                        onChange={handleNewTaskChange}
                        className="w-full border border-gray-300 rounded-md py-2 px-3"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Remind Before (days)
                    </label>
                    <select
                      name="remindBefore"
                      value={newTask.remindBefore}
                      onChange={handleNewTaskChange}
                      className="w-full border border-gray-300 rounded-md py-2 px-3"
                    >
                      <option value="1">1 day</option>
                      <option value="3">3 days</option>
                      <option value="7">1 week</option>
                      <option value="14">2 weeks</option>
                      <option value="30">1 month</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={newTask.notes}
                      onChange={handleNewTaskChange}
                      className="w-full border border-gray-300 rounded-md py-2 px-3"
                      rows="3"
                      placeholder="Additional notes or instructions"
                    ></textarea>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingTask}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:opacity-90 disabled:opacity-70"
                  >
                    {addingTask ? "Scheduling..." : "Schedule"}
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
