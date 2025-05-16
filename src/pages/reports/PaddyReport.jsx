import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { toast } from "react-hot-toast";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Scatter,
  ScatterChart,
} from "recharts";

const PaddyReport = () => {
  // States
  const [stocks, setStocks] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [filterType, setFilterType] = useState("");
  const [filterBuyer, setFilterBuyer] = useState("");
  const [filterDateRange, setFilterDateRange] = useState({
    start: "",
    end: "",
  });
  const [reportView, setReportView] = useState("monthly"); // monthly, paddyType, buyer
  const [reportData, setReportData] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    totalQuantity: 0,
    totalValue: 0,
    averagePrice: 0,
    transactions: 0,
  });
  const [trendData, setTrendData] = useState({
    buyerTrends: [],
    selectedBuyer: "",
    priceTrends: [],
    quantityTrends: [],
  });

  // COLORS for charts
  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#A28AFF",
    "#FF6B6B",
    "#4ECDC4",
  ];

  // Get current business ID from localStorage
  useEffect(() => {
    try {
      const businessId = localStorage.getItem("currentBusinessId");
      console.log("Business ID from localStorage:", businessId);

      if (businessId) {
        setCurrentBusiness(businessId);
      } else {
        // Handle case when no business is selected
        toast.error("Please select a business first");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error);
      toast.error("Failed to load business information");
      setLoading(false);
    }
  }, []);

  // Fetch stocks and buyers when current business changes
  useEffect(() => {
    if (currentBusiness) {
      fetchStocks();
      fetchBuyers();
    }
  }, [currentBusiness]);

  // Generate report data when stocks change or filter/report view changes
  useEffect(() => {
    if (stocks.length > 0) {
      const filteredStocks = getFilteredStocks();
      generateReportData(filteredStocks);
      calculateSummaryStats(filteredStocks);
      generateTrendData(filteredStocks);
    }
  }, [
    stocks,
    filterType,
    filterBuyer,
    filterDateRange,
    reportView,
    trendData.selectedBuyer,
  ]);

  // Fetch paddy stocks from Firestore
  const fetchStocks = async () => {
    if (!currentBusiness) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let stocksQuery = query(
        collection(db, "paddyStock"),
        where("businessId", "==", currentBusiness),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(stocksQuery);
      const stocksList = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        stocksList.push({
          id: doc.id,
          ...data,
          // Convert Firestore timestamps to JS Date objects
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      setStocks(stocksList);
    } catch (error) {
      console.error("Error fetching paddy stocks:", error);
      setError(`Failed to load purchase history: ${error.message}`);
      toast.error(`Failed to load purchase history: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch buyers from Firestore
  const fetchBuyers = async () => {
    if (!currentBusiness) return;

    try {
      const buyersQuery = query(
        collection(db, "buyers"),
        where("businessId", "==", currentBusiness)
      );

      const querySnapshot = await getDocs(buyersQuery);
      const buyersList = [];

      querySnapshot.forEach((doc) => {
        buyersList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setBuyers(buyersList);
    } catch (error) {
      console.error("Error fetching buyers:", error);
      toast.error(`Failed to load buyers: ${error.message}`);
    }
  };

  // Get all unique paddy types from the stocks
  const getPaddyTypes = () => {
    const types = new Set();
    stocks.forEach((stock) => {
      if (stock.paddyType) {
        types.add(stock.paddyType);
      }
    });
    return Array.from(types).sort();
  };

  // Handle buyer selection for trends view
  const handleBuyerSelection = (e) => {
    setTrendData({
      ...trendData,
      selectedBuyer: e.target.value,
    });
  };
  // Generate trend data for buyer price and quantity analysis
  const generateTrendData = (filteredStocks) => {
    if (filteredStocks.length === 0) return;

    // Get all unique buyers
    const uniqueBuyers = new Set();
    filteredStocks.forEach((stock) => {
      if (stock.buyerId && stock.buyerName) {
        uniqueBuyers.add(stock.buyerId);
      }
    });

    // Create trend data for all buyers
    const buyersList = Array.from(uniqueBuyers).map((buyerId) => {
      const buyerStock = filteredStocks.find(
        (stock) => stock.buyerId === buyerId
      );
      return {
        id: buyerId,
        name: buyerStock?.buyerName || "Unknown",
      };
    });

    // If no buyer is selected, select the first one
    const selectedBuyerId =
      trendData.selectedBuyer ||
      (buyersList.length > 0 ? buyersList[0].id : "");

    // Generate price trends data (all buyers)
    const priceData = {};

    // Sort stocks by date first
    const sortedStocks = [...filteredStocks].sort(
      (a, b) => a.createdAt - b.createdAt
    );

    // Group by month and buyer
    sortedStocks.forEach((stock) => {
      if (!stock.buyerId || !stock.price) return;

      const date = stock.createdAt;
      const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const monthName = date.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });

      if (!priceData[monthYear]) {
        priceData[monthYear] = {
          name: monthName,
          date: new Date(date.getFullYear(), date.getMonth(), 1),
        };
      }

      // Add or update price for this buyer
      // If multiple transactions in same month, use the latest one
      priceData[monthYear][`price_${stock.buyerId}`] = stock.price;
      priceData[monthYear][`quantity_${stock.buyerId}`] =
        (priceData[monthYear][`quantity_${stock.buyerId}`] || 0) +
        stock.quantity;

      // Add buyer name for reference
      priceData[monthYear][`buyer_${stock.buyerId}`] = stock.buyerName;
    });

    // Convert to array and sort by date
    const priceArray = Object.values(priceData).sort((a, b) => a.date - b.date);

    // Generate individual buyer trends
    const selectedBuyerData = [];

    sortedStocks.forEach((stock) => {
      if (stock.buyerId !== selectedBuyerId) return;

      selectedBuyerData.push({
        date: stock.createdAt,
        price: stock.price || 0,
        quantity: stock.quantity || 0,
        formattedDate: stock.createdAt.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      });
    });

    // Sort by date
    selectedBuyerData.sort((a, b) => a.date - b.date);

    setTrendData({
      ...trendData,
      buyerTrends: buyersList,
      selectedBuyer: selectedBuyerId,
      priceTrends: priceArray,
      quantityTrends: selectedBuyerData,
    });
  };
  // Apply filters to stocks
  const getFilteredStocks = () => {
    return stocks.filter((stock) => {
      // Paddy type filter
      const matchesType = filterType === "" || stock.paddyType === filterType;

      // Buyer filter
      const matchesBuyer = filterBuyer === "" || stock.buyerId === filterBuyer;

      // Date range filter
      let matchesDateRange = true;
      if (filterDateRange.start) {
        const startDate = new Date(filterDateRange.start);
        startDate.setHours(0, 0, 0, 0);
        matchesDateRange = matchesDateRange && stock.createdAt >= startDate;
      }
      if (filterDateRange.end) {
        const endDate = new Date(filterDateRange.end);
        endDate.setHours(23, 59, 59, 999);
        matchesDateRange = matchesDateRange && stock.createdAt <= endDate;
      }

      return matchesType && matchesBuyer && matchesDateRange;
    });
  };

  // Calculate summary statistics
  const calculateSummaryStats = (filteredStocks) => {
    let totalQuantity = 0;
    let totalValue = 0;
    let priceSum = 0;
    let transactions = filteredStocks.length;

    filteredStocks.forEach((stock) => {
      totalQuantity += stock.quantity || 0;
      const stockValue = (stock.quantity || 0) * (stock.price || 0);
      totalValue += stockValue;
      priceSum += stock.price || 0;
    });

    const averagePrice = transactions > 0 ? priceSum / transactions : 0;

    setSummaryStats({
      totalQuantity,
      totalValue,
      averagePrice,
      transactions,
    });
  };

  // Generate report data based on the selected report view
  const generateReportData = (filteredStocks) => {
    if (filteredStocks.length === 0) {
      setReportData([]);
      return;
    }

    switch (reportView) {
      case "monthly":
        generateMonthlyReport(filteredStocks);
        break;
      case "paddyType":
        generatePaddyTypeReport(filteredStocks);
        break;
      case "buyer":
        generateBuyerReport(filteredStocks);
        break;
      default:
        generateMonthlyReport(filteredStocks);
    }
  };

  // Generate monthly report data
  const generateMonthlyReport = (filteredStocks) => {
    // Group by month and year
    const monthlyData = {};

    filteredStocks.forEach((stock) => {
      const date = stock.createdAt;
      const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const monthName = date.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });

      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = {
          name: monthName,
          quantity: 0,
          value: 0,
          transactions: 0,
        };
      }

      monthlyData[monthYear].quantity += stock.quantity || 0;
      monthlyData[monthYear].value +=
        (stock.quantity || 0) * (stock.price || 0);
      monthlyData[monthYear].transactions += 1;
    });

    // Convert to array and sort by date
    const result = Object.keys(monthlyData)
      .map((key) => monthlyData[key])
      .sort((a, b) => {
        const dateA = new Date(a.name);
        const dateB = new Date(b.name);
        return dateA - dateB;
      });

    setReportData(result);
  };

  // Generate paddy type report data
  const generatePaddyTypeReport = (filteredStocks) => {
    // Group by paddy type
    const typeData = {};

    filteredStocks.forEach((stock) => {
      const paddyType = stock.paddyType || "Unknown";

      if (!typeData[paddyType]) {
        typeData[paddyType] = {
          name: paddyType,
          quantity: 0,
          value: 0,
          transactions: 0,
        };
      }

      typeData[paddyType].quantity += stock.quantity || 0;
      typeData[paddyType].value += (stock.quantity || 0) * (stock.price || 0);
      typeData[paddyType].transactions += 1;
    });

    // Convert to array
    const result = Object.keys(typeData)
      .map((key) => typeData[key])
      .sort((a, b) => b.quantity - a.quantity); // Sort by quantity descending

    setReportData(result);
  };

  // Generate buyer report data
  const generateBuyerReport = (filteredStocks) => {
    // Group by buyer
    const buyerData = {};

    filteredStocks.forEach((stock) => {
      const buyerId = stock.buyerId || "Unknown";
      const buyerName = stock.buyerName || "Unknown";

      if (!buyerData[buyerId]) {
        buyerData[buyerId] = {
          id: buyerId,
          name: buyerName,
          quantity: 0,
          value: 0,
          transactions: 0,
        };
      }

      buyerData[buyerId].quantity += stock.quantity || 0;
      buyerData[buyerId].value += (stock.quantity || 0) * (stock.price || 0);
      buyerData[buyerId].transactions += 1;
    });

    // Convert to array
    const result = Object.keys(buyerData)
      .map((key) => buyerData[key])
      .sort((a, b) => b.quantity - a.quantity); // Sort by quantity descending

    setReportData(result);
  };

  // Handle date range filter change
  const handleDateFilterChange = (e) => {
    const { name, value } = e.target;
    setFilterDateRange((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilterType("");
    setFilterBuyer("");
    setFilterDateRange({ start: "", end: "" });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    })
      .format(amount)
      .replace("LKR", "Rs.");
  };

  // Handle export CSV
  const exportToCSV = () => {
    if (reportData.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Create CSV content based on report view
    let csvContent = "data:text/csv;charset=utf-8,";

    // Add headers
    let headers = "";
    switch (reportView) {
      case "monthly":
        headers = "Month,Quantity (kg),Value (Rs.),Transactions";
        break;
      case "paddyType":
        headers = "Paddy Type,Quantity (kg),Value (Rs.),Transactions";
        break;
      case "buyer":
        headers = "Buyer Name,Quantity (kg),Value (Rs.),Transactions";
        break;
    }
    csvContent += headers + "\r\n";

    // Add data rows
    reportData.forEach((item) => {
      let row = "";
      switch (reportView) {
        case "monthly":
          row = `"${item.name}",${item.quantity.toFixed(
            2
          )},${item.value.toFixed(2)},${item.transactions}`;
          break;
        case "paddyType":
          row = `"${item.name}",${item.quantity.toFixed(
            2
          )},${item.value.toFixed(2)},${item.transactions}`;
          break;
        case "buyer":
          row = `"${item.name}",${item.quantity.toFixed(
            2
          )},${item.value.toFixed(2)},${item.transactions}`;
          break;
      }
      csvContent += row + "\r\n";
    });

    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `paddy_report_${reportView}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);

    // Download file
    link.click();
    document.body.removeChild(link);

    toast.success("Report exported successfully");
  };

  // Render chart based on the selected report view
  // Render chart based on the selected report view
  const renderChart = () => {
    if (reportData.length === 0 && reportView !== "trends") {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            No data available for the selected filters
          </p>
        </div>
      );
    }

    switch (reportView) {
      case "monthly":
        return renderMonthlyChart();
      case "paddyType":
        return renderPaddyTypeChart();
      case "buyer":
        return renderBuyerChart();
      case "trends":
        return renderTrendsChart();
      default:
        return renderMonthlyChart();
    }
  };
  // Render buyer trends chart
  const renderTrendsChart = () => {
    if (trendData.buyerTrends.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            No trend data available for the selected filters
          </p>
        </div>
      );
    }

    // Get selected buyer name
    const selectedBuyer = trendData.buyerTrends.find(
      (b) => b.id === trendData.selectedBuyer
    );
    const selectedBuyerName = selectedBuyer ? selectedBuyer.name : "Unknown";

    return (
      <div>
        {/* Buyer selection dropdown */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Buyer for Trend Analysis
          </label>
          <select
            value={trendData.selectedBuyer}
            onChange={handleBuyerSelection}
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            {trendData.buyerTrends.map((buyer) => (
              <option key={buyer.id} value={buyer.id}>
                {buyer.name}
              </option>
            ))}
          </select>
        </div>

        {/* Price comparison chart */}
        <h3 className="text-lg font-medium text-gray-800 mb-4">
          Price Trends Comparison (All Buyers)
        </h3>
        <div className="h-80 mb-8">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendData.priceTrends}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value, name) => {
                  // Extract buyer ID from the name (price_buyerId)
                  if (name.startsWith("price_")) {
                    const buyerId = name.split("_")[1];
                    // Find the buyer name for this month/point
                    const dataPoint = trendData.priceTrends.find(
                      (p) => p[name] === value
                    );
                    const buyerName = dataPoint
                      ? dataPoint[`buyer_${buyerId}`]
                      : "Unknown";
                    return [`Rs. ${value.toFixed(2)}/kg`, buyerName];
                  }
                  return [value, name];
                }}
              />
              <Legend
                formatter={(value) => {
                  // Only show price entries in legend
                  if (value.startsWith("price_")) {
                    const buyerId = value.split("_")[1];
                    // Find a data point that has this buyer
                    const dataPoint = trendData.priceTrends.find(
                      (p) => p[`buyer_${buyerId}`]
                    );
                    return dataPoint
                      ? dataPoint[`buyer_${buyerId}`]
                      : "Unknown";
                  }
                  return value;
                }}
              />

              {/* Create a line for each buyer's price trend */}
              {trendData.buyerTrends.map((buyer, index) => (
                <Line
                  key={buyer.id}
                  type="monotone"
                  dataKey={`price_${buyer.id}`}
                  name={`price_${buyer.id}`}
                  stroke={COLORS[index % COLORS.length]}
                  activeDot={{ r: 8 }}
                  connectNulls
                  strokeWidth={buyer.id === trendData.selectedBuyer ? 3 : 1}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Selected buyer detailed trend */}
        <h3 className="text-lg font-medium text-gray-800 mb-4">
          {selectedBuyerName}'s Price & Quantity Trends
        </h3>

        {trendData.quantityTrends.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={trendData.quantityTrends}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="formattedDate"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke="#8884d8"
                  label={{
                    value: "Price (Rs/kg)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#82ca9d"
                  label={{
                    value: "Quantity (kg)",
                    angle: 90,
                    position: "insideRight",
                  }}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "price") return `Rs. ${value.toFixed(2)}/kg`;
                    if (name === "quantity") return `${value.toFixed(2)} kg`;
                    return value;
                  }}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="price"
                  name="Price"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Bar
                  yAxisId="right"
                  dataKey="quantity"
                  name="Quantity"
                  barSize={20}
                  fill="#82ca9d"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <p className="text-gray-500">
              No transaction data available for {selectedBuyerName}
            </p>
          </div>
        )}

        {/* Price vs Quantity Correlation */}
        {trendData.quantityTrends.length > 2 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              {selectedBuyerName}'s Price vs. Quantity Correlation
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="quantity"
                    name="Quantity"
                    label={{
                      value: "Quantity (kg)",
                      position: "insideBottomRight",
                      offset: -5,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="price"
                    name="Price"
                    label={{
                      value: "Price (Rs/kg)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    formatter={(value, name) => {
                      if (name === "price") return `Rs. ${value.toFixed(2)}/kg`;
                      if (name === "quantity") return `${value.toFixed(2)} kg`;
                      return value;
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        return payload[0].payload.formattedDate;
                      }
                      return label;
                    }}
                  />
                  <Scatter
                    name="Transactions"
                    data={trendData.quantityTrends}
                    fill="#8884d8"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-center text-gray-500 mt-2">
              This chart helps identify how price relates to purchase quantity.
              Patterns may indicate price sensitivity or seasonal factors.
            </p>
          </div>
        )}

        {/* Insights section */}
        {trendData.quantityTrends.length > 0 && (
          <div className="mt-8 bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              Buyer Insights
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
              <li>
                <span className="font-medium">Price Range:</span>{" "}
                {`Rs. ${Math.min(
                  ...trendData.quantityTrends.map((t) => t.price)
                ).toFixed(2)} - 
                Rs. ${Math.max(
                  ...trendData.quantityTrends.map((t) => t.price)
                ).toFixed(2)} per kg`}
              </li>
              <li>
                <span className="font-medium">Average Price:</span>{" "}
                {`Rs. ${(
                  trendData.quantityTrends.reduce(
                    (sum, t) => sum + t.price,
                    0
                  ) / trendData.quantityTrends.length
                ).toFixed(2)} per kg`}
              </li>
              <li>
                <span className="font-medium">Total Quantity:</span>{" "}
                {`${trendData.quantityTrends
                  .reduce((sum, t) => sum + t.quantity, 0)
                  .toFixed(2)} kg`}
              </li>
              <li>
                <span className="font-medium">
                  Average Quantity per Transaction:
                </span>{" "}
                {`${(
                  trendData.quantityTrends.reduce(
                    (sum, t) => sum + t.quantity,
                    0
                  ) / trendData.quantityTrends.length
                ).toFixed(2)} kg`}
              </li>
              <li>
                <span className="font-medium">Total Transactions:</span>{" "}
                {trendData.quantityTrends.length}
              </li>
            </ul>
          </div>
        )}
      </div>
    );
  };
  // Render monthly trend chart
  const renderMonthlyChart = () => {
    return (
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-4">
          Monthly Purchases Trend
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={reportData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "value") return formatCurrency(value);
                  return value.toFixed(2) + (name === "quantity" ? " kg" : "");
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="quantity"
                name="Quantity (kg)"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="value"
                name="Value (Rs.)"
                stroke="#82ca9d"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Transactions Bar Chart */}
        <h3 className="text-lg font-medium text-gray-800 my-4">
          Monthly Transactions
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={reportData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="transactions"
                name="Number of Transactions"
                fill="#4F46E5"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // Render paddy type distribution chart
  const renderPaddyTypeChart = () => {
    return (
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-4">
          Paddy Type Distribution
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart for quantity distribution by type */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="quantity"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(1)}%`
                  }
                >
                  {reportData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => [
                    `${value.toFixed(2)} kg (${(
                      (value / summaryStats.totalQuantity) *
                      100
                    ).toFixed(1)}%)`,
                    props.payload.name,
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-sm text-center text-gray-500">
              Quantity Distribution
            </p>
          </div>

          {/* Bar Chart for detailed view */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={reportData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "value") return formatCurrency(value);
                    return (
                      value.toFixed(2) + (name === "quantity" ? " kg" : "")
                    );
                  }}
                />
                <Legend />
                <Bar dataKey="quantity" name="Quantity (kg)" fill="#8884d8" />
                <Bar dataKey="value" name="Value (Rs.)" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-sm text-center text-gray-500">
              Quantity & Value by Type
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Render buyer distribution chart
  const renderBuyerChart = () => {
    // Limit to top 10 buyers by quantity for better visualization
    const topBuyers = reportData.slice(0, 10);

    return (
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-4">
          Buyer Distribution{" "}
          {reportData.length > 10 ? `(Top 10 of ${reportData.length})` : ""}
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart for quantity distribution by buyer */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topBuyers}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="quantity"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${
                      name.length > 10 ? name.substring(0, 10) + "..." : name
                    }: ${(percent * 100).toFixed(1)}%`
                  }
                >
                  {topBuyers.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => [
                    `${value.toFixed(2)} kg (${(
                      (value / summaryStats.totalQuantity) *
                      100
                    ).toFixed(1)}%)`,
                    props.payload.name,
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-sm text-center text-gray-500">
              Quantity Distribution by Buyer
            </p>
          </div>

          {/* Bar Chart for transactions by buyer */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topBuyers}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="transactions"
                  name="Transactions"
                  fill="#4F46E5"
                />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-sm text-center text-gray-500">
              Transactions by Buyer
            </p>
          </div>
        </div>
      </div>
    );
  };
  // Render data table based on the selected report view
  const renderDataTable = () => {
    if (reportData.length === 0 && reportView !== "trends") {
      return null;
    }

    if (reportView === "trends") {
      // Show buyer-specific transaction history
      if (trendData.quantityTrends.length === 0) return null;

      // Get selected buyer name
      const selectedBuyer = trendData.buyerTrends.find(
        (b) => b.id === trendData.selectedBuyer
      );
      const selectedBuyerName = selectedBuyer ? selectedBuyer.name : "Unknown";

      return (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            {selectedBuyerName}'s Transaction History
          </h3>
          <div className="overflow-x-auto bg-white shadow-sm rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paddy Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity (kg)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price (Rs/kg)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stocks
                  .filter((stock) => stock.buyerId === trendData.selectedBuyer)
                  .sort((a, b) => b.createdAt - a.createdAt) // Sort by date, newest first
                  .map((stock, index) => (
                    <tr key={stock.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {stock.createdAt.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stock.paddyType || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stock.quantity ? stock.quantity.toFixed(2) : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stock.price ? stock.price.toFixed(2) : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stock.quantity && stock.price
                          ? formatCurrency(stock.quantity * stock.price)
                          : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Original data table rendering for other views
    return (
      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">
          Report Details
        </h3>
        <div className="overflow-x-auto bg-white shadow-sm rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {reportView === "monthly" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month
                  </th>
                )}
                {reportView === "paddyType" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paddy Type
                  </th>
                )}
                {reportView === "buyer" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Buyer
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity (kg)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value (Rs.)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Price (Rs./kg)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.quantity.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(item.value)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.transactions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(item.value / item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Paddy Purchase Reports
          </h1>
          <p className="text-gray-600 mt-1">
            Analyze and visualize your paddy purchase data
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2 mt-4 md:mt-0">
          <button
            onClick={exportToCSV}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm flex items-center"
            disabled={reportData.length === 0}
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export CSV
          </button>
          <button
            onClick={() => fetchStocks()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm flex items-center"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow-sm rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Quantity</p>
          <p className="text-xl font-bold">
            {summaryStats.totalQuantity.toFixed(2)} kg
          </p>
        </div>
        <div className="bg-white shadow-sm rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="text-xl font-bold">
            {formatCurrency(summaryStats.totalValue)}
          </p>
        </div>
        <div className="bg-white shadow-sm rounded-lg p-4">
          <p className="text-sm text-gray-500">Average Price</p>
          <p className="text-xl font-bold">
            Rs. {summaryStats.averagePrice.toFixed(2)}/kg
          </p>
        </div>
        <div className="bg-white shadow-sm rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Transactions</p>
          <p className="text-xl font-bold">{summaryStats.transactions}</p>
        </div>
      </div>

      {/* Filter and View Selector Section */}
      <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Report View Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report View
            </label>
            <select
              value={reportView}
              onChange={(e) => setReportView(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="monthly">Monthly Trend</option>
              <option value="paddyType">By Paddy Type</option>
              <option value="buyer">By Buyer</option>
              <option value="trends">Buyer Price & Quantity Trends</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paddy Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">All Paddy Types</option>
              {getPaddyTypes().map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Buyer Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buyer
            </label>
            <select
              value={filterBuyer}
              onChange={(e) => setFilterBuyer(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">All Buyers</option>
              {buyers.map((buyer) => (
                <option key={buyer.id} value={buyer.id}>
                  {buyer.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              name="start"
              value={filterDateRange.start}
              onChange={handleDateFilterChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              name="end"
              value={filterDateRange.end}
              onChange={handleDateFilterChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Reset Filters Button */}
        {(filterType ||
          filterBuyer ||
          filterDateRange.start ||
          filterDateRange.end) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={resetFilters}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          <h3 className="font-medium">Error loading data</h3>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Loading Indicator */}
      {loading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      ) : !currentBusiness ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            No business selected
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Please select a business from the business selector.
          </p>
        </div>
      ) : stocks.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            No purchase history found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Add paddy stock to see reports here.
          </p>
          <button
            onClick={() => (window.location.href = "/add-paddy-stock")}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg
              className="-ml-1 mr-2 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Add New Paddy Stock
          </button>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg p-6">
          {/* Charts */}
          {renderChart()}

          {/* Data Table */}
          {renderDataTable()}
        </div>
      )}
    </div>
  );
};

export default PaddyReport;
