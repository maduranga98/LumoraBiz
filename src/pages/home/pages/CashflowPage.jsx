import React, { useState, useMemo } from "react";

const CashflowPage = () => {
  // State for managing transactions
  const [expenses, setExpenses] = useState([
    {
      id: 1,
      name: "Groceries",
      amount: 150,
      date: "2025-06-01",
      category: "Food",
    },
    {
      id: 2,
      name: "Gas",
      amount: 60,
      date: "2025-06-02",
      category: "Transport",
    },
    { id: 3, name: "Coffee", amount: 25, date: "2025-06-03", category: "Food" },
  ]);

  const [incomes, setIncomes] = useState([
    {
      id: 1,
      name: "Salary",
      amount: 5000,
      date: "2025-06-01",
      category: "Job",
    },
    {
      id: 2,
      name: "Freelance",
      amount: 800,
      date: "2025-06-03",
      category: "Side Hustle",
    },
  ]);

  const [activeTab, setActiveTab] = useState("overview");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);

  // Form states
  const [expenseForm, setExpenseForm] = useState({ name: "", amount: "" });
  const [incomeForm, setIncomeForm] = useState({ name: "", amount: "" });
  const [errors, setErrors] = useState({});

  // Calculate totals
  const totals = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const totalIncomes = incomes.reduce((sum, item) => sum + item.amount, 0);
    const netCashflow = totalIncomes - totalExpenses;

    return { totalExpenses, totalIncomes, netCashflow };
  }, [expenses, incomes]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Form validation
  const validateForm = (formData, type) => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors[`${type}Name`] = `${
        type === "expense" ? "Expense" : "Income"
      } name is required`;
    }

    if (!formData.amount.trim()) {
      newErrors[`${type}Amount`] = "Amount is required";
    } else if (
      isNaN(parseFloat(formData.amount)) ||
      parseFloat(formData.amount) <= 0
    ) {
      newErrors[`${type}Amount`] = "Please enter a valid amount";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submissions
  const handleExpenseSubmit = (e) => {
    e.preventDefault();

    if (validateForm(expenseForm, "expense")) {
      const newExpense = {
        id: Date.now(),
        name: expenseForm.name,
        amount: parseFloat(expenseForm.amount),
        date: new Date().toISOString().split("T")[0],
        category: "General",
      };

      setExpenses((prev) => [newExpense, ...prev]);
      setExpenseForm({ name: "", amount: "" });
      setShowExpenseForm(false);
      setErrors({});
    }
  };

  const handleIncomeSubmit = (e) => {
    e.preventDefault();

    if (validateForm(incomeForm, "income")) {
      const newIncome = {
        id: Date.now(),
        name: incomeForm.name,
        amount: parseFloat(incomeForm.amount),
        date: new Date().toISOString().split("T")[0],
        category: "General",
      };

      setIncomes((prev) => [newIncome, ...prev]);
      setIncomeForm({ name: "", amount: "" });
      setShowIncomeForm(false);
      setErrors({});
    }
  };

  // Input component
  const Input = ({
    label,
    type,
    value,
    onChange,
    placeholder,
    className,
    id,
  }) => (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${className}`}
    />
  );

  // Transaction item component
  const TransactionItem = ({ item, type }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{item.name}</h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500">{item.category}</span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-500">{formatDate(item.date)}</span>
        </div>
      </div>
      <div
        className={`font-semibold ${
          type === "income" ? "text-green-600" : "text-red-600"
        }`}
      >
        {type === "income" ? "+" : "-"}
        {formatCurrency(item.amount)}
      </div>
    </div>
  );

  // Form modal component
  const FormModal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          {children}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Cash Flow Management
          </h1>
          <p className="text-gray-600">
            Track your income, expenses, and overall cash flow
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setShowIncomeForm(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add Income
          </button>
          <button
            onClick={() => setShowExpenseForm(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 12H4"
              />
            </svg>
            Add Expense
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Income
                </p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(totals.totalIncomes)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 11l5-5m0 0l5 5m-5-5v12"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {incomes.length} income sources
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Expenses
                </p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(totals.totalExpenses)}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 13l-5 5m0 0l-5-5m5 5V6"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {expenses.length} expenses
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Net Cash Flow
                </p>
                <p
                  className={`text-2xl font-bold mt-1 ${
                    totals.netCashflow >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(totals.netCashflow)}
                </p>
              </div>
              <div
                className={`p-3 rounded-full ${
                  totals.netCashflow >= 0 ? "bg-green-100" : "bg-red-100"
                }`}
              >
                <svg
                  className={`w-6 h-6 ${
                    totals.netCashflow >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {totals.netCashflow >= 0 ? "Positive flow" : "Negative flow"}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("overview")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "overview"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("incomes")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "incomes"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Income ({incomes.length})
              </button>
              <button
                onClick={() => setActiveTab("expenses")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "expenses"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Expenses ({expenses.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Income
                </h3>
                <div className="space-y-3">
                  {incomes.slice(0, 5).map((item) => (
                    <TransactionItem
                      key={`income-${item.id}`}
                      item={item}
                      type="income"
                    />
                  ))}
                </div>
                {incomes.length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    No income recorded yet
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Expenses
                </h3>
                <div className="space-y-3">
                  {expenses.slice(0, 5).map((item) => (
                    <TransactionItem
                      key={`expense-${item.id}`}
                      item={item}
                      type="expense"
                    />
                  ))}
                </div>
                {expenses.length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    No expenses recorded yet
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "incomes" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                All Income
              </h3>
              <div className="space-y-3">
                {incomes.map((item) => (
                  <TransactionItem
                    key={`income-${item.id}`}
                    item={item}
                    type="income"
                  />
                ))}
              </div>
              {incomes.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No income recorded yet
                </p>
              )}
            </div>
          )}

          {activeTab === "expenses" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                All Expenses
              </h3>
              <div className="space-y-3">
                {expenses.map((item) => (
                  <TransactionItem
                    key={`expense-${item.id}`}
                    item={item}
                    type="expense"
                  />
                ))}
              </div>
              {expenses.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No expenses recorded yet
                </p>
              )}
            </div>
          )}
        </div>

        {/* Income Form Modal */}
        <FormModal
          isOpen={showIncomeForm}
          onClose={() => {
            setShowIncomeForm(false);
            setIncomeForm({ name: "", amount: "" });
            setErrors({});
          }}
          title="Add Income"
        >
          <form onSubmit={handleIncomeSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="incomeName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Income Name
              </label>
              <Input
                id="incomeName"
                type="text"
                value={incomeForm.name}
                onChange={(e) =>
                  setIncomeForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter income name"
                className={errors.incomeName ? "border-red-300" : ""}
              />
              {errors.incomeName && (
                <p className="text-xs text-red-600 mt-1">{errors.incomeName}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="incomeAmount"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Amount
              </label>
              <Input
                id="incomeAmount"
                type="number"
                step="0.01"
                value={incomeForm.amount}
                onChange={(e) =>
                  setIncomeForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                placeholder="0.00"
                className={errors.incomeAmount ? "border-red-300" : ""}
              />
              {errors.incomeAmount && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.incomeAmount}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200"
              >
                Add Income
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowIncomeForm(false);
                  setIncomeForm({ name: "", amount: "" });
                  setErrors({});
                }}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </FormModal>

        {/* Expense Form Modal */}
        <FormModal
          isOpen={showExpenseForm}
          onClose={() => {
            setShowExpenseForm(false);
            setExpenseForm({ name: "", amount: "" });
            setErrors({});
          }}
          title="Add Expense"
        >
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="expenseName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Expense Name
              </label>
              <Input
                id="expenseName"
                type="text"
                value={expenseForm.name}
                onChange={(e) =>
                  setExpenseForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter expense name"
                className={errors.expenseName ? "border-red-300" : ""}
              />
              {errors.expenseName && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.expenseName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="expenseAmount"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Amount
              </label>
              <Input
                id="expenseAmount"
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
                placeholder="0.00"
                className={errors.expenseAmount ? "border-red-300" : ""}
              />
              {errors.expenseAmount && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.expenseAmount}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200"
              >
                Add Expense
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExpenseForm(false);
                  setExpenseForm({ name: "", amount: "" });
                  setErrors({});
                }}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </FormModal>
      </div>
    </div>
  );
};

export default CashflowPage;
