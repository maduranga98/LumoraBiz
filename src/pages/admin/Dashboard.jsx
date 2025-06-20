// src/pages/admin/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import {
  Users,
  Building2,
  Shield,
  Activity,
  TrendingUp,
  AlertTriangle,
  Settings,
  LogOut,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  Database,
  UserCheck,
  UserX,
  Mail,
  Phone,
} from "lucide-react";

const AdminDashboard = () => {
  const { currentUser, logout, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOwners: 0,
    totalManagers: 0,
    totalBusinesses: 0,
    activeUsers: 0,
    inactiveUsers: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [owners, setOwners] = useState([]);
  const [managers, setManagers] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load owners
      const ownersSnapshot = await getDocs(collection(db, "owners"));
      const ownersData = ownersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOwners(ownersData);

      // Load managers
      const managersSnapshot = await getDocs(collection(db, "managers"));
      const managersData = managersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setManagers(managersData);

      // Calculate stats
      const activeOwners = ownersData.filter(
        (owner) => owner.status === "active"
      ).length;
      const activeManagers = managersData.filter(
        (manager) => manager.status === "active"
      ).length;
      const inactiveUsers =
        ownersData.filter((owner) => owner.status === "inactive").length +
        managersData.filter((manager) => manager.status === "inactive").length;

      // Count total businesses (approximate - would need to query subcollections)
      let totalBusinesses = 0;
      for (const owner of ownersData) {
        try {
          const businessesSnapshot = await getDocs(
            collection(db, `owners/${owner.id}/businesses`)
          );
          totalBusinesses += businessesSnapshot.size;
        } catch (error) {
          console.log(`Could not count businesses for owner ${owner.id}`);
        }
      }

      setStats({
        totalOwners: ownersData.length,
        totalManagers: managersData.length,
        totalBusinesses,
        activeUsers: activeOwners + activeManagers,
        inactiveUsers,
      });

      // Create recent activities
      const activities = [
        ...ownersData.slice(0, 3).map((owner) => ({
          type: "owner_registered",
          user: owner.name || owner.displayName || "Unknown User",
          timestamp:
            owner.createdAt?.toDate?.() ||
            (owner.createdAt ? new Date(owner.createdAt) : new Date()),
          status: owner.status || "unknown",
        })),
        ...managersData.slice(0, 3).map((manager) => ({
          type: "manager_created",
          user: manager.name || manager.displayName || "Unknown Manager",
          timestamp:
            manager.createdAt?.toDate?.() ||
            (manager.createdAt ? new Date(manager.createdAt) : new Date()),
          status: manager.status || "unknown",
        })),
      ]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);

      setRecentActivities(activities);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const updateUserStatus = async (userId, userType, newStatus) => {
    try {
      const collection = userType === "owner" ? "owners" : "managers";
      await updateDoc(doc(db, collection, userId), {
        status: newStatus,
        updatedAt: new Date(),
      });

      // Reload data
      await loadDashboardData();
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  const deleteUser = async (userId, userType) => {
    if (!window.confirm(`Are you sure you want to delete this ${userType}?`)) {
      return;
    }

    try {
      const collection = userType === "owner" ? "owners" : "managers";
      await deleteDoc(doc(db, collection, userId));

      // Reload data
      await loadDashboardData();
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const filteredOwners = owners.filter((owner) => {
    const name = owner.name || owner.displayName || "";
    const email = owner.email || "";
    const username = owner.username || "";

    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" || owner.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredManagers = managers.filter((manager) => {
    const name = manager.name || manager.displayName || "";
    const email = manager.email || "";
    const username = manager.username || "";

    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" || manager.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-500">
                  Rice Mill Management System
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {userProfile?.name ||
                    currentUser?.displayName ||
                    "Administrator"}
                </p>
                <p className="text-xs text-gray-500">{currentUser?.email}</p>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: "overview", name: "Overview", icon: BarChart3 },
              { id: "owners", name: "Business Owners", icon: Users },
              { id: "managers", name: "Managers", icon: UserCheck },
              { id: "settings", name: "System Settings", icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-red-500 text-red-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Total Owners
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.totalOwners}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <UserCheck className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Total Managers
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.totalManagers}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Building2 className="w-8 h-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Total Businesses
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.totalBusinesses}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Activity className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Active Users
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.activeUsers}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <UserX className="w-8 h-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">
                      Inactive Users
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.inactiveUsers}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Recent Activities
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          activity.type === "owner_registered"
                            ? "bg-blue-500"
                            : "bg-green-500"
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">{activity.user}</span>
                          {activity.type === "owner_registered"
                            ? " registered as business owner"
                            : " was created as manager"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.timestamp?.toLocaleDateString?.()} • Status:{" "}
                          {activity.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "owners" && (
          <div className="space-y-6">
            {/* Search and Filter */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search owners..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent w-full"
                    />
                  </div>
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Owners Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOwners.map((owner) => (
                    <tr key={owner.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {owner.name || owner.displayName || "Unknown User"}
                          </div>
                          <div className="text-sm text-gray-500">
                            @{owner.username || "no-username"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {owner.email || "No email"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            (owner.status || "inactive") === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {owner.status || "inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {owner.createdAt?.toDate?.()?.toLocaleDateString() ||
                          (owner.createdAt
                            ? new Date(owner.createdAt).toLocaleDateString()
                            : "Unknown")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() =>
                            updateUserStatus(
                              owner.id,
                              "owner",
                              (owner.status || "inactive") === "active"
                                ? "inactive"
                                : "active"
                            )
                          }
                          className={`inline-flex items-center px-3 py-1 rounded text-xs font-medium ${
                            (owner.status || "inactive") === "active"
                              ? "bg-red-100 text-red-700 hover:bg-red-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}
                        >
                          {(owner.status || "inactive") === "active"
                            ? "Deactivate"
                            : "Activate"}
                        </button>
                        <button
                          onClick={() => deleteUser(owner.id, "owner")}
                          className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "managers" && (
          <div className="space-y-6">
            {/* Search and Filter */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search managers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent w-full"
                    />
                  </div>
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Managers Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Manager
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredManagers.map((manager) => (
                    <tr key={manager.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {manager.name ||
                              manager.displayName ||
                              "Unknown Manager"}
                          </div>
                          <div className="text-sm text-gray-500">
                            @{manager.username || "no-username"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {manager.ownerId || "Unknown Owner"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            (manager.status || "inactive") === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {manager.status || "inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {manager.createdAt?.toDate?.()?.toLocaleDateString() ||
                          (manager.createdAt
                            ? new Date(manager.createdAt).toLocaleDateString()
                            : "Unknown")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() =>
                            updateUserStatus(
                              manager.id,
                              "manager",
                              (manager.status || "inactive") === "active"
                                ? "inactive"
                                : "active"
                            )
                          }
                          className={`inline-flex items-center px-3 py-1 rounded text-xs font-medium ${
                            (manager.status || "inactive") === "active"
                              ? "bg-red-100 text-red-700 hover:bg-red-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}
                        >
                          {(manager.status || "inactive") === "active"
                            ? "Deactivate"
                            : "Activate"}
                        </button>
                        <button
                          onClick={() => deleteUser(manager.id, "manager")}
                          className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">
              System Settings
            </h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  System Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Admin User:</span>
                    <span className="ml-2 font-medium">
                      {currentUser?.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Login Time:</span>
                    <span className="ml-2 font-medium">
                      {new Date().toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <button
                  onClick={() => loadDashboardData()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh All Data
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
