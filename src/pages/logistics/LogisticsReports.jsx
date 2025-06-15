import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useBusiness } from "../../contexts/BusinessContext";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-hot-toast";
import {
  LineChart,
  BarChart,
  PieChart,
  Line,
  Bar,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  subMonths,
  isToday,
} from "date-fns";

const LogisticsReports = () => {
  const { currentBusiness } = useBusiness();
  const { currentUser } = useAuth();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [services, setServices] = useState([]);
  const [activeTab, setActiveTab] = useState("expenses");
  const [selectedVehicle, setSelectedVehicle] = useState("all");
  const [dateRange, setDateRange] = useState("6months");
  const [expenseType, setExpenseType] = useState("all");

  // Colors for charts
  const COLORS = [
    "#3B82F6", // Blue
    "#10B981", // Green
    "#F59E0B", // Yellow
    "#EF4444", // Red
    "#8B5CF6", // Purple
    "#06B6D4", // Cyan
    "#84CC16", // Lime
    "#F97316", // Orange
  ];

  // Fetch data on component mount
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
        const expensesCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/vehicleExpenses`;
        const servicesCollectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/vehicleServices`;
        
        console.log("Fetching data from:");
        console.log("- Vehicles:", vehiclesCollectionPath);
        console.log("- Expenses:", expensesCollectionPath);
        console.log("- Services:", servicesCollectionPath);

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

        // Fetch expenses
        const expensesQuery = query(
          collection(db, expensesCollectionPath),
          orderBy("date", "desc")
        );
        const expensesSnapshot = await getDocs(expensesQuery);
        const expensesData = [];
        expensesSnapshot.forEach((doc) => {
          expensesData.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        console.log("Fetched expenses:", expensesData);
        setExpenses(expensesData);

        // Fetch services/maintenance
        const servicesQuery = query(
          collection(db, servicesCollectionPath),
          orderBy("scheduledDate", "desc")
        );
        const servicesSnapshot = await getDocs(servicesQuery);
        const servicesData = [];
        servicesSnapshot.forEach((doc) => {
          const data = doc.data();
          servicesData.push({
            id: doc.id,
            ...data,
            scheduledDateObj: parseISO(data.scheduledDate),
            formattedScheduledDate: format(parseISO(data.scheduledDate), "MMM dd, yyyy"),
          });
        });
        console.log("Fetched services:", servicesData);
        setServices(servicesData);
      } catch (err) {
        console.error("Error fetching data:", err);
        console.error("Error code:", err.code);
        console.error("Error message:", err.message);
        
        if (err.code === 'permission-denied') {
          setError("Permission denied. Check your Firestore rules.");
        } else if (err.code === 'not-found') {
          setError("Data collections not found.");
        } else {
          setError("Failed to load reports data. Please try again.");
        }
        toast.error("Error loading reports data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, currentBusiness]);

  // Filter data based on selections
  const getFilteredExpenses = () => {
    let filtered = [...expenses];

    // Filter by vehicle
    if (selectedVehicle !== "all") {
      filtered = filtered.filter(
        (expense) => expense.vehicleId === selectedVehicle
      );
    }

    // Filter by expense type
    if (expenseType !== "all") {
      filtered = filtered.filter(
        (expense) => expense.expenseType === expenseType
      );
    }

    // Filter by date range
    const today = new Date();
    let startDate;

    switch (dateRange) {
      case "3months":
        startDate = subMonths(today, 3);
        break;
      case "6months":
        startDate = subMonths(today, 6);
        break;
      case "12months":
        startDate = subMonths(today, 12);
        break;
      default:
        startDate = subMonths(today, 6); // Default to 6 months
    }

    filtered = filtered.filter((expense) => {
      const expenseDate = parseISO(expense.date);
      return expenseDate >= startDate;
    });

    return filtered;
  };

  // Organize expense data by month for chart
  const getMonthlyExpenseData = () => {
    const filteredExpenses = getFilteredExpenses();
    const today = new Date();
    let startDate;

    switch (dateRange) {
      case "3months":
        startDate = subMonths(today, 3);
        break;
      case "6months":
        startDate = subMonths(today, 6);
        break;
      case "12months":
        startDate = subMonths(today, 12);
        break;
      default:
        startDate = subMonths(today, 6);
    }

    // Create array of months in the date range
    const months = eachMonthOfInterval({
      start: startDate,
      end: today,
    });

    // Initialize data for each month
    const monthlyData = months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      // Get expenses for this month
      const monthExpenses = filteredExpenses.filter((expense) => {
        const expenseDate = parseISO(expense.date);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      });

      // Calculate total for each expense type
      const fuelTotal = monthExpenses
        .filter((expense) => expense.expenseType === "fuel")
        .reduce((sum, expense) => sum + expense.amount, 0);

      const serviceTotal = monthExpenses
        .filter((expense) => expense.expenseType === "service")
        .reduce((sum, expense) => sum + expense.amount, 0);

      const repairTotal = monthExpenses
        .filter((expense) => expense.expenseType === "repair")
        .reduce((sum, expense) => sum + expense.amount, 0);

      const maintenanceTotal = serviceTotal + repairTotal;

      const insuranceTotal = monthExpenses
        .filter((expense) => expense.expenseType === "insurance")
        .reduce((sum, expense) => sum + expense.amount, 0);

      const taxTotal = monthExpenses
        .filter((expense) => expense.expenseType === "tax")
        .reduce((sum, expense) => sum + expense.amount, 0);

      const otherTotal = monthExpenses
        .filter((expense) => expense.expenseType === "other")
        .reduce((sum, expense) => sum + expense.amount, 0);

      return {
        name: format(month, "MMM yyyy"),
        fuel: parseFloat(fuelTotal.toFixed(2)),
        maintenance: parseFloat(maintenanceTotal.toFixed(2)),
        insurance: parseFloat(insuranceTotal.toFixed(2)),
        tax: parseFloat(taxTotal.toFixed(2)),
        other: parseFloat(otherTotal.toFixed(2)),
        total: parseFloat(
          (
            fuelTotal +
            maintenanceTotal +
            insuranceTotal +
            taxTotal +
            otherTotal
          ).toFixed(2)
        ),
      };
    });

    return monthlyData;
  };

  // Get expense distribution by type
  const getExpenseDistributionData = () => {
    const filteredExpenses = getFilteredExpenses();

    // Group expenses by type
    const expensesByType = {
      fuel: 0,
      maintenance: 0,
      insurance: 0,
      tax: 0,
      other: 0,
    };

    filteredExpenses.forEach((expense) => {
      const { expenseType, amount } = expense;

      if (expenseType === "fuel") {
        expensesByType.fuel += amount;
      } else if (expenseType === "service" || expenseType === "repair") {
        expensesByType.maintenance += amount;
      } else if (expenseType === "insurance") {
        expensesByType.insurance += amount;
      } else if (expenseType === "tax") {
        expensesByType.tax += amount;
      } else {
        expensesByType.other += amount;
      }
    });

    // Format for the PieChart
    return [
      { name: "Fuel", value: parseFloat(expensesByType.fuel.toFixed(2)), color: COLORS[0] },
      { name: "Maintenance", value: parseFloat(expensesByType.maintenance.toFixed(2)), color: COLORS[1] },
      { name: "Insurance", value: parseFloat(expensesByType.insurance.toFixed(2)), color: COLORS[2] },
      { name: "Tax", value: parseFloat(expensesByType.tax.toFixed(2)), color: COLORS[3] },
      { name: "Other", value: parseFloat(expensesByType.other.toFixed(2)), color: COLORS[4] },
    ].filter((item) => item.value > 0); // Remove zero values
  };

  // Get expense data by vehicle
  const getExpenseByVehicleData = () => {
    if (selectedVehicle !== "all") return []; // Don't show when specific vehicle is selected

    const filteredExpenses = getFilteredExpenses();
    const expensesByVehicle = {};

    // Group expenses by vehicle
    filteredExpenses.forEach((expense) => {
      const { vehicleId, vehicleNumber, amount } = expense;
      if (!expensesByVehicle[vehicleId]) {
        expensesByVehicle[vehicleId] = {
          name: vehicleNumber || "Unknown Vehicle",
          total: 0,
        };
      }
      expensesByVehicle[vehicleId].total += amount;
    });

    // Convert to array for chart
    return Object.values(expensesByVehicle)
      .map((vehicle) => ({
        name: vehicle.name,
        total: parseFloat(vehicle.total.toFixed(2)),
      }))
      .sort((a, b) => b.total - a.total) // Sort by total expense, descending
      .slice(0, 10); // Top 10 vehicles
  };

  // Get maintenance/service data
  const getServiceData = () => {
    let filtered = [...services];

    // Filter by vehicle
    if (selectedVehicle !== "all") {
      filtered = filtered.filter((item) => item.vehicleId === selectedVehicle);
    }

    // Group by type
    const servicesByType = {};

    filtered.forEach((item) => {
      const { serviceType } = item;
      if (!servicesByType[serviceType]) {
        servicesByType[serviceType] = 0;
      }
      servicesByType[serviceType]++;
    });

    // Format for chart
    return Object.entries(servicesByType).map(([type, count]) => ({
      name: getServiceTypeLabel(type),
      count,
    }));
  };

  // Get service status distribution
  const getServiceStatusData = () => {
    let filtered = [...services];

    // Filter by vehicle
    if (selectedVehicle !== "all") {
      filtered = filtered.filter((item) => item.vehicleId === selectedVehicle);
    }

    // Count by status
    const completed = filtered.filter((item) => item.completed).length;
    const canceled = filtered.filter((item) => item.canceled).length;
    const overdue = filtered.filter(
      (item) =>
        !item.completed &&
        !item.canceled &&
        item.scheduledDateObj < new Date() &&
        !isToday(item.scheduledDateObj)
    ).length;
    const upcoming = filtered.filter(
      (item) =>
        !item.completed &&
        !item.canceled &&
        (item.scheduledDateObj >= new Date() || isToday(item.scheduledDateObj))
    ).length;

    return [
      { name: "Completed", value: completed, color: COLORS[1] },
      { name: "Canceled", value: canceled, color: COLORS[7] },
      { name: "Overdue", value: overdue, color: COLORS[3] },
      { name: "Upcoming", value: upcoming, color: COLORS[0] },
    ].filter((item) => item.value > 0); // Remove zero values
  };

  // Helper function to get readable service type label
  const getServiceTypeLabel = (type) => {
    const labels = {
      oil_change: "Oil Change",
      tire_rotation: "Tire Rotation",
      filter_replacement: "Filter Replacement",
      brake_service: "Brake Service",
      transmission_service: "Transmission Service",
      air_conditioning: "Air Conditioning",
      fluid_check: "Fluid Check",
      battery_check: "Battery Check",
      regular_service: "Regular Service",
      major_service: "Major Service",
      inspection: "Vehicle Inspection",
      tire_replacement: "Tire Replacement",
      engine_service: "Engine Service",
      electrical_service: "Electrical Service",
      other: "Other Service",
    };
    return labels[type] || "Unknown Service";
  };

  // Get summary data
  const getSummaryData = () => {
    const filteredExpenses = getFilteredExpenses();

    const totalExpenses = filteredExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    const fuelExpenses = filteredExpenses
      .filter((expense) => expense.expenseType === "fuel")
      .reduce((sum, expense) => sum + expense.amount, 0);

    const maintenanceExpenses = filteredExpenses
      .filter(
        (expense) =>
          expense.expenseType === "service" || expense.expenseType === "repair"
      )
      .reduce((sum, expense) => sum + expense.amount, 0);

    let fuelQuantity = 0;
    filteredExpenses
      .filter((expense) => expense.expenseType === "fuel" && expense.quantity)
      .forEach((expense) => {
        fuelQuantity += expense.quantity;
      });

    const avgFuelCost = fuelQuantity > 0 ? fuelExpenses / fuelQuantity : 0;

    return {
      totalExpenses: totalExpenses.toFixed(2),
      fuelExpenses: fuelExpenses.toFixed(2),
      maintenanceExpenses: maintenanceExpenses.toFixed(2),
      fuelQuantity: fuelQuantity.toFixed(2),
      avgFuelCost: avgFuelCost.toFixed(2),
    };
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 0,
    }).format(amount);
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
                  Please log in to view logistics reports.
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
                  Please select a business to view logistics reports.
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

  // Get summary data for display
  const summaryData = getSummaryData();

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Logistics Reports</h1>
        <p className="text-sm text-gray-600 mt-1">
          Business: {currentBusiness.name || currentBusiness.id}
        </p>
      </div>

      {/* Filter controls */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab("expenses")}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  activeTab === "expenses"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setActiveTab("maintenance")}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  activeTab === "maintenance"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Services
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle
            </label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
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
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="12months">Last 12 Months</option>
            </select>
          </div>

          {activeTab === "expenses" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expense Type
              </label>
              <select
                value={expenseType}
                onChange={(e) => setExpenseType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="fuel">Fuel</option>
                <option value="service">Service</option>
                <option value="repair">Repair</option>
                <option value="insurance">Insurance</option>
                <option value="tax">Tax</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {activeTab === "expenses" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500">
              Total Expenses
            </h3>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(summaryData.totalExpenses)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500">Fuel Expenses</h3>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(summaryData.fuelExpenses)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500">
              Maintenance Expenses
            </h3>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(summaryData.maintenanceExpenses)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500">Total Fuel</h3>
            <p className="text-xl font-bold text-yellow-600">
              {summaryData.fuelQuantity} L
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500">
              Avg. Fuel Cost
            </h3>
            <p className="text-xl font-bold text-purple-600">
              {formatCurrency(summaryData.avgFuelCost)}/L
            </p>
          </div>
        </div>
      )}

      {/* Expense Reports */}
      {activeTab === "expenses" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Expense Trends */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Monthly Expense Trends
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={getMonthlyExpenseData()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke={COLORS[4]}
                    activeDot={{ r: 8 }}
                    name="Total"
                    strokeWidth={3}
                  />
                  {expenseType === "all" && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="fuel"
                        stroke={COLORS[0]}
                        name="Fuel"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="maintenance"
                        stroke={COLORS[1]}
                        name="Maintenance"
                        strokeWidth={2}
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Distribution by Type */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Expense Distribution by Type
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getExpenseDistributionData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {getExpenseDistributionData().map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expenses by Vehicle */}
          {selectedVehicle === "all" && getExpenseByVehicleData().length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Expenses by Vehicle
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getExpenseByVehicleData()}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="total" fill={COLORS[0]} name="Total Expenses">
                      {getExpenseByVehicleData().map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Service/Maintenance Reports */}
      {activeTab === "maintenance" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Services by Type */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Services by Type
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={getServiceData()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill={COLORS[1]} name="Number of Services">
                    {getServiceData().map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Service Status Distribution */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Service Status Distribution
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getServiceStatusData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {getServiceStatusData().map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Service History */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Service History
            </h3>
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
                      Service Type
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {services
                    .filter(
                      (item) =>
                        selectedVehicle === "all" ||
                        item.vehicleId === selectedVehicle
                    )
                    .slice(0, 10) // Show only 10 most recent
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {item.vehicleNumber || "No Number"}
                          </div>
                          {item.vehicleName && (
                            <div className="text-xs text-gray-500">
                              {item.vehicleName}
                            </div>
                          )}
                          {item.vehicle_id && (
                            <div className="text-xs text-gray-400">
                              ID: {item.vehicle_id}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {getServiceTypeLabel(item.serviceType)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {item.formattedScheduledDate}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${
                              item.completed
                                ? "bg-green-100 text-green-800"
                                : item.canceled
                                ? "bg-gray-100 text-gray-800"
                                : item.scheduledDateObj < new Date() &&
                                  !isToday(item.scheduledDateObj)
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {item.completed
                              ? "Completed"
                              : item.canceled
                              ? "Canceled"
                              : item.scheduledDateObj < new Date() &&
                                !isToday(item.scheduledDateObj)
                              ? "Overdue"
                              : "Upcoming"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${
                              item.priority === "high"
                                ? "bg-red-100 text-red-800"
                                : item.priority === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {item.priority
                              ? item.priority.charAt(0).toUpperCase() + item.priority.slice(1)
                              : "Medium"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {services.filter(
                (item) =>
                  selectedVehicle === "all" ||
                  item.vehicleId === selectedVehicle
              ).length === 0 && (
                <div className="py-12 text-center text-gray-500">
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
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    No service records found
                  </p>
                  <p className="text-gray-500">
                    {selectedVehicle !== "all"
                      ? "This vehicle has no scheduled services yet."
                      : "No services have been scheduled yet."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Additional Statistics Cards */}
      {vehicles.length === 0 && expenses.length === 0 && services.length === 0 && (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Data Available
          </h3>
          <p className="text-gray-500 mb-6">
            You don't have any vehicles, expenses, or services yet. Start by adding vehicles to your fleet.
          </p>
          <div className="space-x-3">
            <button
              onClick={() => (window.location.href = "/add-vehicle")}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
            >
              Add Vehicle
            </button>
            <button
              onClick={() => (window.location.href = "/add-expense")}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              Add Expense
            </button>
            <button
              onClick={() => (window.location.href = "/maintenance-schedule")}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              Schedule Service
            </button>
          </div>
        </div>
      )}

      {/* Export Options */}
      {(expenses.length > 0 || services.length > 0) && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mt-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Report generated on {format(new Date(), "MMM dd, yyyy 'at' HH:mm")}
            </div>
            <div className="space-x-3">
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                Export as PDF
              </button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                Export as Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogisticsReports;