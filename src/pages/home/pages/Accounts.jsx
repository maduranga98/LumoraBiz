// src/pages/home/pages/Accounts.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard,
  DollarSign,
  Receipt,
  AlertCircle,
  FileText,
  BarChart3,
  Plus,
  ArrowRight,
  PieChart,
  Calculator,
  Target,
  Calendar,
  Eye,
  Edit,
  Activity,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { db } from "../../../services/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import toast from "react-hot-toast";

const Accounts = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accountSummary, setAccountSummary] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    totalLiabilities: 0,
    cashFlow: 0,
    monthlyGrowth: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [quickStats, setQuickStats] = useState({
    pendingInvoices: 0,
    overduePayments: 0,
    monthlyBudget: 0,
    budgetUsed: 0,
  });

  // Get current business ID
  const currentBusinessId = localStorage.getItem("currentBusinessId");

  useEffect(() => {
    if (currentBusinessId) {
      fetchAccountData();
    }
  }, [currentBusinessId]);

  // Fetch account data from Firebase
  const fetchAccountData = async () => {
    try {
      setLoading(true);

      // Fetch expenses
      const expensesQuery = query(
        collection(db, `businesses/${currentBusinessId}/accounts/expenses`),
        orderBy("date", "desc"),
        limit(10)
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      const expenses = expensesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        type: "expense",
      }));

      // Fetch incomes
      const incomesQuery = query(
        collection(db, `businesses/${currentBusinessId}/accounts/incomes`),
        orderBy("date", "desc"),
        limit(10)
      );
      const incomesSnapshot = await getDocs(incomesQuery);
      const incomes = incomesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        type: "income",
      }));

      // Fetch liabilities
      const liabilitiesQuery = query(
        collection(db, `businesses/${currentBusinessId}/accounts/liabilities`),
        where("status", "==", "active")
      );
      const liabilitiesSnapshot = await getDocs(liabilitiesQuery);
      const liabilities = liabilitiesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Calculate summary
      const totalExpenses = expenses.reduce(
        (sum, expense) => sum + (expense.amount || 0),
        0
      );
      const totalRevenue = incomes.reduce(
        (sum, income) => sum + (income.amount || 0),
        0
      );
      const totalLiabilities = liabilities.reduce(
        (sum, liability) => sum + (liability.amount || 0),
        0
      );

      setAccountSummary({
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses,
        totalLiabilities,
        cashFlow: totalRevenue - totalExpenses,
        monthlyGrowth: 12.5, // This would be calculated based on historical data
      });

      // Combine and sort recent transactions
      const allTransactions = [...expenses, ...incomes]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
      setRecentTransactions(allTransactions);

      // Set upcoming payments (from liabilities with due dates)
      const upcomingLiabilities = liabilities
        .filter((liability) => liability.dueDate)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 3);
      setUpcomingPayments(upcomingLiabilities);

      // Quick stats
      setQuickStats({
        pendingInvoices: 5, // This would come from customer invoices
        overduePayments: 2, // This would come from overdue liabilities
        monthlyBudget: 50000,
        budgetUsed: totalExpenses,
      });
    } catch (error) {
      console.error("Error fetching account data:", error);
      toast.error("Failed to load account data");
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-LK", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Quick action cards data
  const quickActions = [
    {
      title: "Add Expense",
      description: "Record a new expense",
      icon: Receipt,
      action: () => navigate("/home/accounts/add-expense"),
      color: "bg-red-50 text-red-600 border-red-200",
      iconBg: "bg-red-100",
    },
    {
      title: "Add Income",
      description: "Record new income",
      icon: DollarSign,
      action: () => navigate("/home/accounts/add-income"),
      color: "bg-green-50 text-green-600 border-green-200",
      iconBg: "bg-green-100",
    },
    {
      title: "Manage Liabilities",
      description: "View and manage debts",
      icon: CreditCard,
      action: () => navigate("/home/liabilities"),
      color: "bg-orange-50 text-orange-600 border-orange-200",
      iconBg: "bg-orange-100",
    },
    {
      title: "Generate Report",
      description: "Create financial report",
      icon: FileText,
      action: () => navigate("/home/reports"),
      color: "bg-blue-50 text-blue-600 border-blue-200",
      iconBg: "bg-blue-100",
    },
  ];

  // Main feature cards
  const featureCards = [
    {
      title: "Cash Flow Management",
      description: "Track income and expenses, view cash flow trends",
      icon: TrendingUp,
      link: "/home/cashflows",
      stats: formatCurrency(accountSummary.cashFlow),
      statsLabel: "Current Balance",
      color: "border-blue-500",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Expense Tracking",
      description: "Monitor and categorize all business expenses",
      icon: Receipt,
      link: "/home/accounts/expenses",
      stats: formatCurrency(accountSummary.totalExpenses),
      statsLabel: "Total Expenses",
      color: "border-red-500",
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
    },
    {
      title: "Liability Management",
      description: "Track debts, loans and payment schedules",
      icon: CreditCard,
      link: "/home/liabilities",
      stats: formatCurrency(accountSummary.totalLiabilities),
      statsLabel: "Total Debt",
      color: "border-orange-500",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
    },
    {
      title: "Financial Reports",
      description: "Generate comprehensive financial analytics",
      icon: BarChart3,
      link: "/home/reports",
      stats: `${accountSummary.monthlyGrowth}%`,
      statsLabel: "Monthly Growth",
      color: "border-green-500",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading account data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Account Management
              </h1>
              <p className="text-gray-600 mt-1">
                Comprehensive financial management for your rice mill
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate("/home/reports")}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Reports
              </button>
            </div>
          </div>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(accountSummary.totalRevenue)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              +{accountSummary.monthlyGrowth}% from last month
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Expenses
                </p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(accountSummary.totalExpenses)}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {quickStats.budgetUsed > quickStats.monthlyBudget
                ? "Over budget"
                : "Within budget"}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Income</p>
                <p
                  className={`text-2xl font-bold mt-1 ${
                    accountSummary.netIncome >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(accountSummary.netIncome)}
                </p>
              </div>
              <div
                className={`p-3 rounded-full ${
                  accountSummary.netIncome >= 0 ? "bg-green-100" : "bg-red-100"
                }`}
              >
                <DollarSign
                  className={`h-6 w-6 ${
                    accountSummary.netIncome >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {accountSummary.netIncome >= 0 ? "Profitable" : "Loss"}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Liabilities
                </p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {formatCurrency(accountSummary.totalLiabilities)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <CreditCard className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {upcomingPayments.length} upcoming payments
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className={`p-4 rounded-lg border-2 hover:shadow-md transition-all duration-200 text-left ${action.color}`}
              >
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${action.iconBg} mr-3`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{action.title}</h3>
                    <p className="text-sm opacity-75">{action.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Feature Cards */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Account Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featureCards.map((card, index) => (
              <Link
                key={index}
                to={card.link}
                className={`bg-white rounded-xl shadow-sm border-2 hover:shadow-lg transition-all duration-200 p-6 group ${card.color}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <div className={`p-3 rounded-lg ${card.bgColor} mr-4`}>
                        <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {card.title}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {card.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {card.stats}
                        </p>
                        <p className="text-sm text-gray-500">
                          {card.statsLabel}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity and Upcoming Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Transactions
              </h3>
              <Link
                to="/home/cashflows"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div
                        className={`p-2 rounded-full mr-3 ${
                          transaction.type === "income"
                            ? "bg-green-100"
                            : "bg-red-100"
                        }`}
                      >
                        {transaction.type === "income" ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {transaction.name || transaction.description}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(transaction.date)}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`font-semibold ${
                        transaction.type === "income"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No recent transactions
                </p>
              )}
            </div>
          </div>

          {/* Upcoming Payments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Upcoming Payments
              </h3>
              <Link
                to="/home/liabilities"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Manage All
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingPayments.length > 0 ? (
                upcomingPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className="p-2 bg-orange-100 rounded-full mr-3">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {payment.description}
                        </p>
                        <p className="text-sm text-gray-500">
                          Due: {formatDate(payment.dueDate)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-orange-600">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-xs text-gray-500">{payment.type}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No upcoming payments
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Account Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {quickStats.pendingInvoices}
              </div>
              <div className="text-sm text-gray-500">Pending Invoices</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {quickStats.overduePayments}
              </div>
              <div className="text-sm text-gray-500">Overdue Payments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(
                  ((quickStats.monthlyBudget - quickStats.budgetUsed) /
                    quickStats.monthlyBudget) *
                    100
                )}
                %
              </div>
              <div className="text-sm text-gray-500">Budget Remaining</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {accountSummary.monthlyGrowth}%
              </div>
              <div className="text-sm text-gray-500">Monthly Growth</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Accounts;
