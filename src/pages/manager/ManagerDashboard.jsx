import React, { useState } from "react";
import {
  Users,
  Calendar,
  ClipboardList,
  TrendingUp,
  Package,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Clock,
  ArrowRight,
  Building2,
  Loader2,
  Truck,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Shield,
  Factory,
  DollarSign,
  ShoppingCart,
  Briefcase,
  FileText,
  Wrench,
  PieChart,
  LayoutDashboard,
  HelpCircle,
  UserPlus,
  Settings,
  UserCheck,
  ListTodo,
  CalendarCheck,
  Receipt,
  Car,
  Wheat,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  ManagerBusinessProvider,
  useBusiness,
} from "../../contexts/ManagerBusinessContext";
import ManagerEmployeeDirectory from "./components/managerEmployee/ManagerEmployeeDirectory";
import ManagerAddingEmployees from "./components/managerEmployee/ManagerAddingEmployees";
import ManagerMarkAttendance from "./components/managerEmployee/ManagerMarkAttendance";
import { ManagerWorkAssigned } from "./components/managerEmployee/ManagerWorkedAssigned";
import { ManagerAssigedWorkList } from "./components/managerEmployee/ManagerAssignedWrokList";
import ManagerLeaveRequest from "./components/managerEmployee/ManagerLeaveRequest";
import ManagerAdddingExpenses from "./components/Managerlogisitics/ManagerAddingExpenses";
import ManagerLogisticsExpensesList from "./components/Managerlogisitics/ManagerLogisticsExpensesList";
import ManagerSchedule from "./components/Managerlogisitics/ManagerLogisticsSchedule";
import ManagerAddingPaddy from "./components/Inventory/ManagerAddingPaddy";
import { ManagerAddingSubItems } from "./components/Inventory/ManagerAddingSubStock";
import { SubStock } from "./components/Inventory/SubStock";
import { SubStockItemMoves } from "./components/Inventory/SubStockItemMoves";
import { SubStockHistory } from "./components/Inventory/SubStockHistory";

// Simple component wrapper
const ManagerComponentWrapper = ({ children }) => {
  const managerContext = useBusiness();
  const BusinessContext = React.createContext();

  const OriginalBusinessProvider = ({ children }) => (
    <BusinessContext.Provider value={managerContext}>
      {children}
    </BusinessContext.Provider>
  );

  return <OriginalBusinessProvider>{children}</OriginalBusinessProvider>;
};

// Error boundary wrapper
const SafeComponentWrapper = ({ children, fallbackTitle = "Component" }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Component Error
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            There was an error loading the {fallbackTitle} component.
          </p>
          <button
            onClick={() => setHasError(false)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  try {
    return <>{children}</>;
  } catch (error) {
    console.error(`Error in ${fallbackTitle}:`, error);
    setHasError(true);
    return null;
  }
};

// Loading state
const ManagerDashboardLoading = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading business data...</p>
      </div>
    </div>
  );
};

// Error state
const ManagerDashboardError = ({ error, currentUser }) => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Business Connection Issue
        </h3>
        <p className="text-gray-600 mb-4">
          {error || "Unable to connect to your assigned business."}
        </p>
        {currentUser && (
          <div className="mt-4 text-xs text-gray-500">
            <p>Manager: {currentUser.name}</p>
            <p>Business ID: {currentUser.businessId}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Dashboard
const ManagerDashboard = () => {
  return (
    <ManagerBusinessProvider>
      <ManagerDashboardContent />
    </ManagerBusinessProvider>
  );
};

const ManagerDashboardContent = () => {
  const [activeSection, setActiveSection] = useState("overview");
  const { currentBusiness, loading, error } = useBusiness();
  const { currentUser } = useAuth();

  if (loading) {
    return <ManagerDashboardLoading />;
  }

  if (error || !currentBusiness) {
    return <ManagerDashboardError error={error} currentUser={currentUser} />;
  }

  // Only essential manager features
  const managerFeatures = [
    {
      id: "attendance",
      title: "Mark Attendance",
      description: "Daily attendance tracking",
      icon: Calendar,
      color: "from-green-500 to-green-600",
      component: ManagerMarkAttendance,
    },
    {
      id: "employee-list",
      title: "Employee Directory",
      description: "View employee information",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      component: ManagerEmployeeDirectory,
    },
    {
      id: "employee-adding",
      title: "Addding Employees",
      description: "Add New Employee",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      component: ManagerAddingEmployees,
    },
    {
      id: "worke-assign",
      title: "Assign Work",
      description: "Assign works to the Employee",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      component: ManagerWorkAssigned,
    },
    {
      id: "worke-assign-list",
      title: "Assigned Work List",
      description: "Assign works List",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      component: ManagerAssigedWorkList,
    },
    {
      id: "leave-request",
      title: "Request Leave",
      description: "Leaves request management",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      component: ManagerLeaveRequest,
    },
    {
      id: "logisitics-expenses-add",
      title: "Add Vehicle Expenses",
      description: "Add the Vehicle Expenses",
      icon: Truck,
      color: "from-blue-500 to-blue-600",
      component: ManagerAdddingExpenses,
    },
    {
      id: "logisitics-expenses-list",
      title: "Vehicle Expenses List",
      description: "Vehicle Expenses List",
      icon: Truck,
      color: "from-blue-500 to-blue-600",
      component: ManagerLogisticsExpensesList,
    },
    {
      id: "logisitics-schedules",
      title: "Vehicle Schedules",
      description: "Schedule maintenance",
      icon: Truck,
      color: "from-blue-500 to-blue-600",
      component: ManagerSchedule,
    },
    {
      id: "adding-paddy",
      title: "Adding Paddy Stocks",
      description: "Add a new Paddy Stock",
      icon: Truck,
      color: "from-blue-500 to-blue-600",
      component: ManagerAddingPaddy,
    },
    {
      id: "adding-sub-stock",
      title: "Adding Material Stocks",
      description: "Add a new Material Stock",
      icon: Truck,
      color: "from-blue-500 to-blue-600",
      component: ManagerAddingSubItems,
    },
    {
      id: "sub-stock",
      title: "Material Stocks",
      description: "Material Stock",
      icon: Truck,
      color: "from-blue-500 to-blue-600",
      component: SubStock,
    },
    {
      id: "sub-stock-itemmove",
      title: "Moveing of Material Stocks",
      description: "Moving of Material Stock",
      icon: Truck,
      color: "from-blue-500 to-blue-600",
      component: SubStockItemMoves,
    },
    {
      id: "sub-stock-history",
      title: "Material Stocks History",
      description: "Material Stock History",
      icon: Truck,
      color: "from-blue-500 to-blue-600",
      component: SubStockHistory,
    },
  ];

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Manager Dashboard</h1>
            <p className="text-blue-100 text-lg">
              {currentBusiness?.businessName || "Rice Mill"}
            </p>
            <p className="text-blue-200 text-sm mt-1">
              Welcome, {currentUser?.displayName || currentUser?.name}
            </p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <BarChart3 className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Business Info */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {currentBusiness?.businessName || "Business Name"}
            </h3>
            <p className="text-gray-600">
              {currentBusiness?.businessType || "Rice Mill"} • Manager Access
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Today's Attendance
              </p>
              <p className="text-3xl font-bold text-green-600 mt-1">--</p>
              <p className="text-sm text-gray-600 mt-1">Employees present</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Employees
              </p>
              <p className="text-3xl font-bold text-blue-600 mt-1">--</p>
              <p className="text-sm text-gray-600 mt-1">Active employees</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tasks Today</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">--</p>
              <p className="text-sm text-gray-600 mt-1">Pending tasks</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <ClipboardList className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Manager Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {managerFeatures.map((feature) => (
          <div
            key={feature.id}
            className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`bg-gradient-to-r ${feature.color} p-3 rounded-lg`}
              >
                <feature.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {feature.title}
            </h3>
            <p className="text-gray-600 text-sm mb-4">{feature.description}</p>
            <button
              onClick={() => setActiveSection(feature.id)}
              className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors group"
            >
              <span className="text-sm font-medium">Open</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        ))}
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">
          Recent Activities
        </h3>
        <div className="space-y-4">
          {[
            {
              action: "Attendance marked for today",
              time: "2 hours ago",
              color: "bg-green-500",
            },
            {
              action: "Employee directory accessed",
              time: "4 hours ago",
              color: "bg-blue-500",
            },
            {
              action: "Inventory checked",
              time: "1 day ago",
              color: "bg-purple-500",
            },
          ].map((activity, index) => (
            <div
              key={index}
              className="flex items-center space-x-4 p-4 rounded-lg bg-gray-50"
            >
              <div className={`w-3 h-3 rounded-full ${activity.color}`}></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {activity.action}
                </p>
                <p className="text-xs text-gray-500 flex items-center mt-1">
                  <Clock className="w-3 h-3 mr-1" />
                  {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    if (activeSection === "overview") {
      return renderOverview();
    }

    const feature = managerFeatures.find((f) => f.id === activeSection);
    if (feature) {
      const Component = feature.component;
      return (
        <div className="space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <button
              onClick={() => setActiveSection("overview")}
              className="hover:text-gray-900 transition-colors"
            >
              Dashboard
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium">{feature.title}</span>
          </div>

          {/* Component */}
          <React.Suspense
            fallback={
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading {feature.title}...</p>
                </div>
              </div>
            }
          >
            <SafeComponentWrapper fallbackTitle={feature.title}>
              <ManagerComponentWrapper>
                <Component />
              </ManagerComponentWrapper>
            </SafeComponentWrapper>
          </React.Suspense>
        </div>
      );
    }

    return (
      <div className="text-center text-gray-500 py-12 bg-white rounded-xl shadow-sm border border-gray-100">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          Section Not Found
        </h3>
        <button
          onClick={() => setActiveSection("overview")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-7xl mx-auto p-6">{renderSectionContent()}</div>
    </div>
  );
};

export default ManagerDashboard;
