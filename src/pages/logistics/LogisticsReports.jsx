import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";
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
} from "date-fns";

const LogisticsReports = () => {
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [activeTab, setActiveTab] = useState("expenses");
  const [selectedVehicle, setSelectedVehicle] = useState("all");
  const [dateRange, setDateRange] = useState("6months");
  const [expenseType, setExpenseType] = useState("all");

  // Colors for charts
  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
  ];

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch vehicles
        const vehiclesQuery = query(
          collection(db, "vehicles"),
          where("status", "==", "active")
        );
        const vehiclesSnapshot = await getDocs(vehiclesQuery);
        const vehiclesData = [];
        vehiclesSnapshot.forEach((doc) => {
          vehiclesData.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        setVehicles(vehiclesData);

        // Fetch expenses
        const expensesQuery = query(
          collection(db, "vehicleExpenses"),
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
        setExpenses(expensesData);

        // Fetch maintenance
        const maintenanceQuery = query(
          collection(db, "maintenance"),
          orderBy("dueDate", "desc")
        );
        const maintenanceSnapshot = await getDocs(maintenanceQuery);
        const maintenanceData = [];
        maintenanceSnapshot.forEach((doc) => {
          const data = doc.data();
          maintenanceData.push({
            id: doc.id,
            ...data,
            dueDateObj: parseISO(data.dueDate),
            formattedDueDate: format(parseISO(data.dueDate), "MMM dd, yyyy"),
          });
        });
        setMaintenance(maintenanceData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load reports data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

      const maintenanceTotal = monthExpenses
        .filter(
          (expense) =>
            expense.expenseType === "service" ||
            expense.expenseType === "repair"
        )
        .reduce((sum, expense) => sum + expense.amount, 0);

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
      { name: "Fuel", value: parseFloat(expensesByType.fuel.toFixed(2)) },
      {
        name: "Maintenance",
        value: parseFloat(expensesByType.maintenance.toFixed(2)),
      },
      {
        name: "Insurance",
        value: parseFloat(expensesByType.insurance.toFixed(2)),
      },
      { name: "Tax", value: parseFloat(expensesByType.tax.toFixed(2)) },
      { name: "Other", value: parseFloat(expensesByType.other.toFixed(2)) },
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
          name: vehicleNumber,
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

  // Get maintenance data
  const getMaintenanceData = () => {
    let filtered = [...maintenance];

    // Filter by vehicle
    if (selectedVehicle !== "all") {
      filtered = filtered.filter((item) => item.vehicleId === selectedVehicle);
    }

    // Group by type
    const maintenanceByType = {};

    filtered.forEach((item) => {
      const { maintenanceType } = item;
      if (!maintenanceByType[maintenanceType]) {
        maintenanceByType[maintenanceType] = 0;
      }
      maintenanceByType[maintenanceType]++;
    });

    // Format for chart
    return Object.entries(maintenanceByType).map(([type, count]) => ({
      name: getMaintenanceTypeLabel(type),
      count,
    }));
  };

  // Get maintenance status distribution
  const getMaintenanceStatusData = () => {
    let filtered = [...maintenance];

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
        item.dueDateObj < new Date() &&
        !isToday(item.dueDateObj)
    ).length;
    const upcoming = filtered.filter(
      (item) =>
        !item.completed &&
        !item.canceled &&
        (item.dueDateObj >= new Date() || isToday(item.dueDateObj))
    ).length;

    return [
      { name: "Completed", value: completed },
      { name: "Canceled", value: canceled },
      { name: "Overdue", value: overdue },
      { name: "Upcoming", value: upcoming },
    ].filter((item) => item.value > 0); // Remove zero values
  };

  // Helper function to check if date is today
  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
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
    return labels[type] || "Unknown";
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

  // Get summary data for display
  const summaryData = getSummaryData();

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Logistics Reports
      </h1>

      {/* Filter controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <h2 className="text-lg font-medium text-gray-800 mb-3">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab("expenses")}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === "expenses"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setActiveTab("maintenance")}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === "maintenance"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Maintenance
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
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full border border-gray-300 rounded-md py-2 px-3"
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
                className="w-full border border-gray-300 rounded-md py-2 px-3"
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
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">
              Total Expenses
            </h3>
            <p className="text-xl font-bold text-gray-800">
              Rs.{summaryData.totalExpenses}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Fuel Expenses</h3>
            <p className="text-xl font-bold text-gray-800">
              Rs.{summaryData.fuelExpenses}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">
              Maintenance Expenses
            </h3>
            <p className="text-xl font-bold text-gray-800">
              Rs.{summaryData.maintenanceExpenses}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Total Fuel</h3>
            <p className="text-xl font-bold text-gray-800">
              {summaryData.fuelQuantity} L
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">
              Avg. Fuel Cost
            </h3>
            <p className="text-xl font-bold text-gray-800">
              Rs.{summaryData.avgFuelCost}/L
            </p>
          </div>
        </div>
      )}

      {/* Expense Reports */}
      {activeTab === "expenses" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Expense Trends */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
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
                  <Tooltip formatter={(value) => `Rs.${value}`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                    name="Total"
                  />
                  {expenseType === "all" && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="fuel"
                        stroke="#82ca9d"
                        name="Fuel"
                      />
                      <Line
                        type="monotone"
                        dataKey="maintenance"
                        stroke="#ffc658"
                        name="Maintenance"
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Distribution by Type */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
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
                  <Tooltip formatter={(value) => `Rs.${value}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expenses by Vehicle */}
          {selectedVehicle === "all" && (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 lg:col-span-2">
              <h3 className="text-lg font-medium text-gray-800 mb-4">
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
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value) => `Rs.${value}`} />
                    <Legend />
                    <Bar dataKey="total" fill="#8884d8" name="Total Expenses">
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

      {/* Maintenance Reports */}
      {activeTab === "maintenance" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Maintenance by Type */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Maintenance by Type
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={getMaintenanceData()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" name="Number of Tasks">
                    {getMaintenanceData().map((entry, index) => (
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

          {/* Maintenance Status Distribution */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Maintenance Status
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getMaintenanceStatusData()}
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
                    {getMaintenanceStatusData().map((entry, index) => (
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

          {/* Recent Maintenance History */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 lg:col-span-2">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Recent Maintenance History
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
                      Maintenance Type
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {maintenance
                    .filter(
                      (item) =>
                        selectedVehicle === "all" ||
                        item.vehicleId === selectedVehicle
                    )
                    .slice(0, 10) // Show only 10 most recent
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {item.vehicleNumber}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {getMaintenanceTypeLabel(item.maintenanceType)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {item.formattedDueDate}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${
                              item.completed
                                ? "bg-green-100 text-green-800"
                                : item.canceled
                                ? "bg-gray-100 text-gray-800"
                                : item.dueDateObj < new Date() &&
                                  !isToday(item.dueDateObj)
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {item.completed
                              ? "Completed"
                              : item.canceled
                              ? "Canceled"
                              : item.dueDateObj < new Date() &&
                                !isToday(item.dueDateObj)
                              ? "Overdue"
                              : "Upcoming"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {maintenance.filter(
                (item) =>
                  selectedVehicle === "all" ||
                  item.vehicleId === selectedVehicle
              ).length === 0 && (
                <div className="py-4 text-center text-gray-500">
                  No maintenance records found
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogisticsReports;
