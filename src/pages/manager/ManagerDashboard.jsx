import React, { useState, useEffect } from "react";
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
  Plus,
  Move,
  CheckSquare,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  ManagerBusinessProvider,
  useBusiness,
} from "../../contexts/ManagerBusinessContext";
import { db } from "../../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import ManagerMarkAttendance from "./components/managerEmployee/ManagerMarkAttendance";
import { ManagerWorkAssigned } from "./components/managerEmployee/ManagerWorkedAssigned";
import { ManagerAssigedWorkList } from "./components/managerEmployee/ManagerAssignedWrokList";
import ManagerAdddingExpenses from "./components/Managerlogisitics/ManagerAddingExpenses";
import { ManagerAddingSubItems } from "./components/Inventory/ManagerAddingSubStock";
import { SubStockItemMoves } from "./components/Inventory/SubStockItemMoves";

// Reusable Stat Card Component
const StatCard = ({ title, value, subtitle, icon: Icon, color }) => {
  const colorClasses = {
    green: {
      bg: "bg-green-50",
      icon: "text-green-600",
      value: "text-green-600",
    },
    blue: {
      bg: "bg-blue-50",
      icon: "text-blue-600",
      value: "text-blue-600",
    },
    purple: {
      bg: "bg-purple-50",
      icon: "text-purple-600",
      value: "text-purple-600",
    },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-3xl font-bold ${colors.value} mt-1`}>{value}</p>
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        </div>
        <div className={`${colors.bg} p-3 rounded-lg`}>
          <Icon className={`w-8 h-8 ${colors.icon}`} />
        </div>
      </div>
    </div>
  );
};
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
  const [dashboardData, setDashboardData] = useState({
    todaysAttendance: 0,
    totalEmployees: 0,
    totalTasks: 0,
    loading: true,
  });
  const { currentBusiness, loading, error } = useBusiness();
  const { currentUser } = useAuth();

  // Fetch dashboard data
  useEffect(() => {
    if (currentBusiness?.id && currentUser) {
      fetchDashboardData();
    }
  }, [currentBusiness?.id, currentUser]);

  const fetchDashboardData = async () => {
    try {
      setDashboardData((prev) => ({ ...prev, loading: true }));

      // Fetch employees count
      const employeesCount = await fetchEmployeesCount();

      // Fetch today's attendance
      const attendanceCount = await fetchTodaysAttendance();

      // Fetch total tasks
      const tasksCount = await fetchTotalTasks();

      setDashboardData({
        todaysAttendance: attendanceCount,
        totalEmployees: employeesCount,
        totalTasks: tasksCount,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setDashboardData((prev) => ({ ...prev, loading: false }));
    }
  };

  const fetchEmployeesCount = async () => {
    try {
      // Use Pattern 1: Same as fetchEmployees in MarkAttendance
      const ownerDocRef = doc(db, "owners", currentUser.ownerId);
      const businessDocRef = doc(
        ownerDocRef,
        "businesses",
        currentUser.businessId
      );
      const employeesCollectionRef = collection(businessDocRef, "employees");

      const querySnapshot = await getDocs(employeesCollectionRef);
      console.log("Dashboard - Total employees found:", querySnapshot.size);
      return querySnapshot.size;
    } catch (error) {
      console.error("Dashboard - Error fetching employees count:", error);
      return 0;
    }
  };

  const fetchTodaysAttendance = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      console.log("Dashboard - Fetching attendance for date:", today);

      // Use Pattern 2: Same as fetchTodayAttendance and markAttendance in MarkAttendance
      const ownerDocRef = doc(db, "owners", currentUser.uid);
      const businessDocRef = doc(ownerDocRef, "businesses", currentBusiness.id);
      const employeesCollectionRef = collection(businessDocRef, "employees");

      console.log("Dashboard - Using path:", {
        uid: currentUser.uid,
        businessId: currentBusiness.id,
        path: `owners/${currentUser.uid}/businesses/${currentBusiness.id}/employees`,
      });

      const employeesSnapshot = await getDocs(employeesCollectionRef);
      console.log(
        "Dashboard - Employees to check attendance for:",
        employeesSnapshot.size
      );

      let presentCount = 0;

      for (const employeeDoc of employeesSnapshot.docs) {
        const attendanceDocRef = doc(employeeDoc.ref, "attendance", today);

        try {
          const attendanceDoc = await getDoc(attendanceDocRef);

          if (attendanceDoc.exists()) {
            const attendanceData = attendanceDoc.data();
            console.log(
              `Dashboard - Employee ${employeeDoc.id} attendance:`,
              attendanceData
            );

            if (attendanceData.status === "present") {
              presentCount++;
            }
          }
        } catch (empError) {
          console.log(
            `Dashboard - No attendance for employee ${employeeDoc.id}`
          );
        }
      }

      console.log("Dashboard - Total present count:", presentCount);
      return presentCount;
    } catch (error) {
      console.error("Dashboard - Error fetching today's attendance:", error);
      return 0;
    }
  };

  const fetchTotalTasks = async () => {
    try {
      // Use Pattern 1: Same as ManagerAssigedWorkList component
      const ownerDocRef = doc(db, "owners", currentUser.ownerId);
      const businessDocRef = doc(
        ownerDocRef,
        "businesses",
        currentUser.businessId
      );
      const temporaryWorksCollectionRef = collection(
        businessDocRef,
        "temporaryWorks"
      );

      const querySnapshot = await getDocs(temporaryWorksCollectionRef);
      console.log("Dashboard - Total tasks found:", querySnapshot.size);
      return querySnapshot.size;
    } catch (error) {
      console.error("Dashboard - Error fetching total tasks:", error);
      return 0;
    }
  };

  const getTodaysAttendanceCount = () => {
    return dashboardData.loading ? "--" : dashboardData.todaysAttendance;
  };

  const getTotalEmployeesCount = () => {
    return dashboardData.loading ? "--" : dashboardData.totalEmployees;
  };

  const getTotalTasksCount = () => {
    return dashboardData.loading ? "--" : dashboardData.totalTasks;
  };

  if (loading) {
    return <ManagerDashboardLoading />;
  }

  if (error || !currentBusiness) {
    return <ManagerDashboardError error={error} currentUser={currentUser} />;
  }

  // Essential manager features - only the specified ones
  const managerFeatures = [
    {
      id: "attendance",
      title: "Mark Attendance",
      description: "Daily attendance tracking for employees",
      icon: CalendarCheck,
      color: "from-green-500 to-green-600",
      component: ManagerMarkAttendance,
    },
    {
      id: "work-assign",
      title: "Assign Work",
      description: "Assign tasks and work to employees",
      icon: ClipboardList,
      color: "from-blue-500 to-blue-600",
      component: ManagerWorkAssigned,
    },
    {
      id: "work-list",
      title: "Assigned Work List",
      description: "View and manage assigned work tasks",
      icon: CheckSquare,
      color: "from-purple-500 to-purple-600",
      component: ManagerAssigedWorkList,
    },
    {
      id: "vehicle-expenses",
      title: "Add Vehicle Expenses",
      description: "Record vehicle expenses and costs",
      icon: Receipt,
      color: "from-orange-500 to-orange-600",
      component: ManagerAdddingExpenses,
    },
    {
      id: "add-materials",
      title: "Adding Material Stocks",
      description: "Add new material items to inventory",
      icon: Plus,
      color: "from-teal-500 to-teal-600",
      component: ManagerAddingSubItems,
    },
    {
      id: "move-materials",
      title: "Move Material Stocks",
      description: "Transfer materials between locations",
      icon: Move,
      color: "from-indigo-500 to-indigo-600",
      component: SubStockItemMoves,
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
              {currentBusiness?.businessName || "Rice Mill Management"}
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

      {/* Quick Stats with Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Today's Attendance"
          value={getTodaysAttendanceCount()}
          subtitle="Employees present"
          icon={CheckCircle}
          color="green"
        />

        <StatCard
          title="Total Employees"
          value={getTotalEmployeesCount()}
          subtitle="Active employees"
          icon={Users}
          color="blue"
        />

        <StatCard
          title="Total Tasks Assigned"
          value={getTotalTasksCount()}
          subtitle="Work assignments"
          icon={ClipboardList}
          color="purple"
        />
      </div>

      {/* Manager Quick Actions - Removed to avoid duplication */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {managerFeatures.map((feature) => (
            <button
              key={feature.id}
              onClick={() => setActiveSection(feature.id)}
              className="group p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left"
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`bg-gradient-to-r ${feature.color} p-2 rounded-lg`}
                >
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 group-hover:text-gray-700">
                    {feature.title}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {feature.description}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">
          Recent Activities
        </h3>
        <div className="space-y-4">
          {[
            {
              action: "Work assigned to employees",
              time: "1 hour ago",
              color: "bg-blue-500",
              icon: ClipboardList,
            },
            {
              action: "Material stock added",
              time: "3 hours ago",
              color: "bg-teal-500",
              icon: Plus,
            },
            {
              action: "Vehicle expense recorded",
              time: "5 hours ago",
              color: "bg-orange-500",
              icon: Receipt,
            },
            {
              action: "Attendance marked",
              time: "1 day ago",
              color: "bg-green-500",
              icon: CalendarCheck,
            },
          ].map((activity, index) => (
            <div
              key={index}
              className="flex items-center space-x-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className={`p-2 rounded-lg ${activity.color}`}>
                <activity.icon className="w-4 h-4 text-white" />
              </div>
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
              className="hover:text-gray-900 transition-colors flex items-center space-x-1"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium flex items-center space-x-1">
              <feature.icon className="w-4 h-4" />
              <span>{feature.title}</span>
            </span>
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
