import React, { useState, useEffect, createContext, useContext } from "react";
import {
  Users,
  UserPlus,
  Calendar,
  ClipboardList,
  TrendingUp,
  Package,
  Boxes,
  Truck,
  MapPin,
  Navigation,
  Plus,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Clock,
  ArrowRight,
  Building2,
  Loader2,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { toast } from "react-hot-toast";

// Create Manager Business Context
const ManagerBusinessContext = createContext();

export const useManagerBusiness = () => {
  const context = useContext(ManagerBusinessContext);
  if (!context) {
    throw new Error(
      "useManagerBusiness must be used within a ManagerBusinessProvider"
    );
  }
  return context;
};

// Also export as useBusiness for compatibility with existing components
export const useBusiness = () => {
  const context = useContext(ManagerBusinessContext);
  if (!context) {
    throw new Error(
      "useBusiness must be used within a BusinessProvider (Manager)"
    );
  }
  return context;
};

// Business Context Provider for Manager
const ManagerBusinessProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadManagerBusiness = async () => {
      if (!currentUser || currentUser.role !== "manager") {
        setLoading(false);
        return;
      }

      try {
        // Manager data structure based on your example:
        // currentUser has: businessId, ownerId, employeeId, permissions, etc.
        const ownerId = currentUser.ownerId;
        const businessId = currentUser.businessId;

        console.log(
          "Manager business context - ownerId:",
          ownerId,
          "businessId:",
          businessId
        );

        if (ownerId && businessId) {
          // Load the specific business this manager is assigned to
          const businessDocRef = doc(
            db,
            "owners",
            ownerId,
            "businesses",
            businessId
          );
          const businessDoc = await getDoc(businessDocRef);

          if (businessDoc.exists()) {
            const businessData = {
              id: businessDoc.id,
              ...businessDoc.data(),
            };
            setCurrentBusiness(businessData);
            console.log("Manager business loaded:", businessData);
          } else {
            console.error("Business not found for manager");
            toast.error("Business not found");
          }
        } else {
          console.error("Manager missing businessId or ownerId");
          toast.error(
            "Manager profile incomplete - missing business assignment"
          );
        }
      } catch (error) {
        console.error("Error loading manager business:", error);
        toast.error("Failed to load business data");
      } finally {
        setLoading(false);
      }
    };

    loadManagerBusiness();
  }, [currentUser]);

  const value = {
    currentBusiness,
    loading,
    getCurrentBusinessId: () => currentBusiness?.id || null,
    // Add these for compatibility with existing components
    userBusinesses: currentBusiness ? [currentBusiness] : [],
    hasBusinesses: () => !!currentBusiness,
    getBusinessById: (id) =>
      currentBusiness?.id === id ? currentBusiness : null,
  };

  return (
    <ManagerBusinessContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading business data...</p>
            <p className="text-sm text-gray-500 mt-2">
              Connecting to your assigned business...
            </p>
          </div>
        </div>
      ) : (
        <div>
          {currentBusiness ? (
            children
          ) : (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center max-w-md mx-auto p-6">
                <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Business Assigned
                </h3>
                <p className="text-gray-600 mb-4">
                  You are not currently assigned to any business. Please contact
                  your administrator.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Managers need to be assigned to a
                    specific business by the owner to access management
                    features.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </ManagerBusinessContext.Provider>
  );
};

// Import existing components (wrapped with error boundaries)
const SafeComponentWrapper = ({
  component: Component,
  fallbackTitle,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [Component]);

  if (hasError) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Component Error
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            There was an error loading the {fallbackTitle} component. Please
            check your business setup and try again.
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
    return <Component {...props} />;
  } catch (error) {
    console.error(`Error in ${fallbackTitle}:`, error);
    setHasError(true);
    return null;
  }
};

// Manager Dashboard with Business Context
const ManagerDashboard = () => {
  return (
    <ManagerBusinessProvider>
      <ManagerDashboardContent />
    </ManagerBusinessProvider>
  );
};

const ManagerDashboardContent = () => {
  const [activeSection, setActiveSection] = useState("overview");
  const [activeSubSection, setActiveSubSection] = useState("");

  // Lazy load components to handle import errors gracefully
  const LazyAddEmployee = React.lazy(() =>
    import("../../components/employees/AddEmployee").catch(() => ({
      default: () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="text-center py-12">
            <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Add Employee
            </h3>
            <p className="text-gray-600">
              Employee addition feature will be available here.
            </p>
          </div>
        </div>
      ),
    }))
  );

  const LazyEmployeeList = React.lazy(() =>
    import("../../pages/employees/EmployeeList").catch(() => ({
      default: () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Employee List
            </h3>
            <p className="text-gray-600">
              Employee management feature will be available here.
            </p>
          </div>
        </div>
      ),
    }))
  );

  const LazyMarkAttendance = React.lazy(() =>
    import("../../pages/employees/MarkAttendence").catch(() => ({
      default: () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Attendance
            </h3>
            <p className="text-gray-600">
              Attendance management feature will be available here.
            </p>
          </div>
        </div>
      ),
    }))
  );

  const LazyStock = React.lazy(() =>
    import("../../pages/home/pages/Stock").catch(() => ({
      default: () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Main Inventory
            </h3>
            <p className="text-gray-600">
              Inventory management feature will be available here.
            </p>
          </div>
        </div>
      ),
    }))
  );

  const LazySubStockPage = React.lazy(() =>
    import("../../pages/home/pages/SubStockPage").catch(() => ({
      default: () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="text-center py-12">
            <Boxes className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Sub Inventory
            </h3>
            <p className="text-gray-600">
              Sub inventory management feature will be available here.
            </p>
          </div>
        </div>
      ),
    }))
  );

  const LazyLoading = React.lazy(() =>
    import("../../components/loading/Loading").catch(() => ({
      default: () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Loading Operations
            </h3>
            <p className="text-gray-600">
              Loading management feature will be available here.
            </p>
          </div>
        </div>
      ),
    }))
  );

  const LazyUnloading = React.lazy(() =>
    import("../../components/loading/Unloading").catch(() => ({
      default: () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="text-center py-12">
            <Boxes className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Unloading Operations
            </h3>
            <p className="text-gray-600">
              Unloading management feature will be available here.
            </p>
          </div>
        </div>
      ),
    }))
  );

  const LazyRoutesPlanning = React.lazy(() =>
    import("../../pages/RoutesManager/RoutesPalning").catch(() => ({
      default: () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Route Planning
            </h3>
            <p className="text-gray-600">
              Route planning feature will be available here.
            </p>
          </div>
        </div>
      ),
    }))
  );

  const LazyAssignRoutes = React.lazy(() =>
    import("../../pages/RoutesManager/AssignRoutes").catch(() => ({
      default: () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="text-center py-12">
            <Navigation className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Route Assignment
            </h3>
            <p className="text-gray-600">
              Route assignment feature will be available here.
            </p>
          </div>
        </div>
      ),
    }))
  );

  // Section configurations
  const sections = {
    employees: {
      "add-employee": { component: LazyAddEmployee, title: "Add New Employee" },
      "manage-employee": {
        component: LazyEmployeeList,
        title: "Manage Employees",
      },
      attendance: {
        component: LazyMarkAttendance,
        title: "Attendance Management",
      },
      "assign-work": {
        component: () => (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="text-center py-12">
              <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Work Assignment System
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Advanced work assignment and task management functionality will
                be available here soon.
              </p>
            </div>
          </div>
        ),
        title: "Assign Work",
      },
      "work-tracking": {
        component: () => (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Work Tracking Dashboard
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Real-time work progress tracking and productivity analytics will
                be displayed here.
              </p>
            </div>
          </div>
        ),
        title: "Work Tracking",
      },
    },
    inventory: {
      "main-inventory": {
        component: LazyStock,
        title: "Main Inventory Management",
      },
      "sub-inventory": {
        component: LazySubStockPage,
        title: "Sub Inventory Management",
      },
    },
    logistics: {
      loading: { component: LazyLoading, title: "Loading Operations" },
      unloading: { component: LazyUnloading, title: "Unloading Operations" },
      "route-planning": {
        component: LazyRoutesPlanning,
        title: "Route Planning",
      },
      "route-assigning": {
        component: LazyAssignRoutes,
        title: "Route Assignment",
      },
    },
  };

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Manager Dashboard</h1>
            <p className="text-blue-100 text-lg">
              Complete overview of your rice mill operations
            </p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <BarChart3 className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Employees
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">24</p>
              <p className="text-sm text-green-600 mt-1 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                +2 this month
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Present Today</p>
              <p className="text-3xl font-bold text-green-600 mt-1">22</p>
              <p className="text-sm text-gray-600 mt-1">91.7% attendance</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Routes</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">8</p>
              <p className="text-sm text-gray-600 mt-1">3 in progress</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <Navigation className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Inventory Items
              </p>
              <p className="text-3xl font-bold text-purple-600 mt-1">156</p>
              <p className="text-sm text-yellow-600 mt-1">12 low stock</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <Package className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Management Sections - Same as before */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Employee Management */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-2 rounded-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Employee Management
              </h3>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { id: "add-employee", label: "Add Employee", icon: UserPlus },
              { id: "manage-employee", label: "Manage Employees", icon: Users },
              { id: "attendance", label: "Attendance", icon: Calendar },
              { id: "assign-work", label: "Assign Work", icon: ClipboardList },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection("employees");
                  setActiveSubSection(item.id);
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="w-4 h-4 text-gray-600 group-hover:text-green-600 transition-colors" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {item.label}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Inventory Management */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-2 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Inventory Management
              </h3>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { id: "main-inventory", label: "Main Inventory", icon: Package },
              { id: "sub-inventory", label: "Sub Inventory", icon: Boxes },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection("inventory");
                  setActiveSubSection(item.id);
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="w-4 h-4 text-gray-600 group-hover:text-purple-600 transition-colors" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {item.label}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Logistics Management */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-2 rounded-lg">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Logistics Management
              </h3>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { id: "loading", label: "Loading Operations", icon: Package },
              { id: "unloading", label: "Unloading Operations", icon: Boxes },
              { id: "route-planning", label: "Route Planning", icon: MapPin },
              {
                id: "route-assigning",
                label: "Route Assignment",
                icon: Navigation,
              },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection("logistics");
                  setActiveSubSection(item.id);
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="w-4 h-4 text-gray-600 group-hover:text-orange-600 transition-colors" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {item.label}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-orange-600 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activities & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            Recent Activities
          </h3>
          <div className="space-y-4">
            {[
              {
                action: "New employee John Doe added",
                time: "2 hours ago",
                color: "bg-blue-500",
              },
              {
                action: "Route R-001 assignment updated",
                time: "4 hours ago",
                color: "bg-orange-500",
              },
              {
                action: "Inventory check completed",
                time: "6 hours ago",
                color: "bg-purple-500",
              },
              {
                action: "Attendance marked for 22 employees",
                time: "1 day ago",
                color: "bg-green-500",
              },
              {
                action: "New loading order processed",
                time: "1 day ago",
                color: "bg-orange-500",
              },
            ].map((activity, index) => (
              <div
                key={index}
                className="flex items-center space-x-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
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

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            System Status
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">
                  Employee Management
                </span>
              </div>
              <span className="text-sm text-green-600 font-medium">
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">
                  Inventory System
                </span>
              </div>
              <span className="text-sm text-green-600 font-medium">
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-yellow-900">
                  Logistics Module
                </span>
              </div>
              <span className="text-sm text-yellow-600 font-medium">
                Maintenance
              </span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">
                  Route Planning
                </span>
              </div>
              <span className="text-sm text-green-600 font-medium">
                Operational
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    if (activeSection === "overview") {
      return renderOverview();
    }

    if (sections[activeSection] && sections[activeSection][activeSubSection]) {
      const sectionConfig = sections[activeSection][activeSubSection];
      const Component = sectionConfig.component;

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
            <button
              onClick={() => setActiveSubSection("")}
              className="hover:text-gray-900 transition-colors capitalize"
            >
              {activeSection.replace("-", " ")}
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium">
              {sectionConfig.title}
            </span>
          </div>

          {/* Component Content with Suspense */}
          <React.Suspense
            fallback={
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Loading {sectionConfig.title}...
                  </p>
                </div>
              </div>
            }
          >
            <SafeComponentWrapper
              component={Component}
              fallbackTitle={sectionConfig.title}
            />
          </React.Suspense>
        </div>
      );
    }

    return (
      <div className="text-center text-gray-500 py-12 bg-white rounded-xl shadow-sm border border-gray-100">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          Section Not Found
        </h3>
        <p>The requested section could not be found.</p>
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
