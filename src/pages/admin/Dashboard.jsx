// ===== ADMIN DASHBOARD WITH OWNER MANAGEMENT =====

// 1. ADMIN DASHBOARD WITH OWNER MANAGEMENT
// src/pages/admin/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { toast } from "react-hot-toast";
import {
  Users,
  Building,
  BarChart3,
  Settings,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  UserCheck,
  UserX,
  Calendar,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import AddOwnerForm from "./AddOwnerForm";

const AdminDashboard = () => {
  const { logout, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [owners, setOwners] = useState([]);
  const [filteredOwners, setFilteredOwners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddOwner, setShowAddOwner] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [showOwnerDetails, setShowOwnerDetails] = useState(false);

  useEffect(() => {
    if (activeTab === "owners") {
      fetchOwners();
    }
  }, [activeTab]);

  useEffect(() => {
    filterOwners();
  }, [owners, searchTerm, statusFilter]);

  const fetchOwners = async () => {
    setLoading(true);
    try {
      const ownersSnapshot = await getDocs(collection(db, "owners"));
      const ownersList = ownersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOwners(ownersList);
    } catch (error) {
      console.error("Error fetching owners:", error);
      toast.error("Failed to load owners");
    } finally {
      setLoading(false);
    }
  };

  const filterOwners = () => {
    let filtered = owners;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (owner) =>
          owner.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          owner.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          owner.businessName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          owner.username?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((owner) => owner.status === statusFilter);
    }

    setFilteredOwners(filtered);
  };

  const handleToggleStatus = async (owner) => {
    try {
      const newStatus = owner.status === "active" ? "inactive" : "active";
      await updateDoc(doc(db, "owners", owner.id), {
        status: newStatus,
        updatedAt: new Date(),
      });

      toast.success(
        `Owner ${
          newStatus === "active" ? "activated" : "deactivated"
        } successfully`
      );
      fetchOwners();
    } catch (error) {
      console.error("Error updating owner status:", error);
      toast.error("Failed to update owner status");
    }
  };

  const handleDeleteOwner = async (ownerId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this owner? This action cannot be undone."
      )
    ) {
      try {
        await deleteDoc(doc(db, "owners", ownerId));
        toast.success("Owner deleted successfully");
        fetchOwners();
      } catch (error) {
        console.error("Error deleting owner:", error);
        toast.error("Failed to delete owner");
      }
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleOwnerAdded = () => {
    setShowAddOwner(false);
    fetchOwners();
    toast.success("Owner added successfully");
  };

  const openOwnerDetails = (owner) => {
    setSelectedOwner(owner);
    setShowOwnerDetails(true);
  };

  // Calculate stats
  const stats = {
    totalOwners: owners.length,
    activeOwners: owners.filter((o) => o.status === "active").length,
    inactiveOwners: owners.filter((o) => o.status === "inactive").length,
    businessTypes: new Set(owners.map((o) => o.businessType)).size,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Admin Dashboard
                </h1>
                <p className="text-gray-500">Rice Mill Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {userProfile?.name || "Administrator"}
                </p>
                <p className="text-sm text-red-600">System Admin</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "overview"
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab("owners")}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "owners"
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Owners ({stats.totalOwners})
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "settings"
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  System Overview
                </h2>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Users className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Total Owners
                            </dt>
                            <dd className="text-lg font-medium text-gray-900">
                              {stats.totalOwners}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <UserCheck className="h-6 w-6 text-green-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Active Owners
                            </dt>
                            <dd className="text-lg font-medium text-gray-900">
                              {stats.activeOwners}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <UserX className="h-6 w-6 text-red-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Inactive Owners
                            </dt>
                            <dd className="text-lg font-medium text-gray-900">
                              {stats.inactiveOwners}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Building className="h-6 w-6 text-blue-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Business Types
                            </dt>
                            <dd className="text-lg font-medium text-gray-900">
                              {stats.businessTypes}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <button
                      onClick={() => setActiveTab("owners")}
                      className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-red-500 rounded-lg border border-gray-200 hover:border-red-300 hover:shadow-md transition-all"
                    >
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-red-50 text-red-600 group-hover:bg-red-100">
                          <Users className="h-6 w-6" />
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          Manage Owners
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">
                          Add, edit, and manage business owners
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab("owners");
                        setShowAddOwner(true);
                      }}
                      className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-600 group-hover:bg-blue-100">
                          <Plus className="h-6 w-6" />
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          Add New Owner
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">
                          Register a new business owner
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab("settings")}
                      className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-gray-500 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
                    >
                      <div>
                        <span className="rounded-lg inline-flex p-3 bg-gray-50 text-gray-600 group-hover:bg-gray-100">
                          <Settings className="h-6 w-6" />
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          System Settings
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">
                          Configure system settings
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Owners Tab */}
          {activeTab === "owners" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Owner Management
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Manage all business owners in the system
                  </p>
                </div>
                <button
                  onClick={() => setShowAddOwner(true)}
                  className="mt-4 sm:mt-0 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Owner
                </button>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search owners..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                    }}
                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              {/* Owners Table */}
              <div className="bg-white shadow rounded-lg overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    <span className="ml-2 text-gray-600">
                      Loading owners...
                    </span>
                  </div>
                ) : filteredOwners.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No owners found
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {searchTerm || statusFilter !== "all"
                        ? "No owners match your current filters."
                        : "Get started by adding your first owner."}
                    </p>
                    {!searchTerm && statusFilter === "all" && (
                      <button
                        onClick={() => setShowAddOwner(true)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                      >
                        Add First Owner
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Owner
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Business
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact
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
                        {filteredOwners.map((owner) => (
                          <tr key={owner.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                                  <span className="text-sm font-medium text-red-600">
                                    {owner.name?.charAt(0)?.toUpperCase() ||
                                      "O"}
                                  </span>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {owner.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    @{owner.username}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {owner.businessName || "N/A"}
                              </div>
                              <div className="text-sm text-gray-500 capitalize">
                                {owner.businessType || "N/A"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {owner.email}
                              </div>
                              <div className="text-sm text-gray-500">
                                {owner.phone || "N/A"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  owner.status === "active"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {owner.status === "active" ? (
                                  <>
                                    <UserCheck className="w-3 h-3 mr-1" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <UserX className="w-3 h-3 mr-1" />
                                    Inactive
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {owner.createdAt
                                ? new Date(
                                    owner.createdAt.seconds * 1000
                                  ).toLocaleDateString()
                                : "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => openOwnerDetails(owner)}
                                  className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(owner)}
                                  className={`p-1 rounded hover:bg-opacity-50 ${
                                    owner.status === "active"
                                      ? "text-orange-600 hover:bg-orange-50"
                                      : "text-green-600 hover:bg-green-50"
                                  }`}
                                  title={
                                    owner.status === "active"
                                      ? "Deactivate"
                                      : "Activate"
                                  }
                                >
                                  {owner.status === "active" ? (
                                    <UserX className="w-4 h-4" />
                                  ) : (
                                    <UserCheck className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeleteOwner(owner.id)}
                                  className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                                  title="Delete Owner"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  System Settings
                </h2>

                <div className="bg-white shadow rounded-lg p-6">
                  <p className="text-gray-500">
                    System settings will be implemented here.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Owner Modal */}
      {showAddOwner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <AddOwnerForm
              onCancel={() => setShowAddOwner(false)}
              onSuccess={handleOwnerAdded}
            />
          </div>
        </div>
      )}

      {/* Owner Details Modal */}
      {showOwnerDetails && selectedOwner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Owner Details
                </h2>
                <button
                  onClick={() => setShowOwnerDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Owner Profile */}
                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-xl font-bold text-red-600">
                      {selectedOwner.name?.charAt(0)?.toUpperCase() || "O"}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedOwner.name}
                    </h3>
                    <p className="text-gray-600">@{selectedOwner.username}</p>
                    <div className="flex items-center mt-1">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          selectedOwner.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {selectedOwner.status === "active"
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">
                    Contact Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {selectedOwner.email}
                      </span>
                    </div>
                    {selectedOwner.phone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {selectedOwner.phone}
                        </span>
                      </div>
                    )}
                    {selectedOwner.address && (
                      <div className="flex items-start space-x-3">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="text-sm text-gray-900">
                          {selectedOwner.address}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Business Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">
                    Business Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Building className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {selectedOwner.businessName || "Not provided"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                      <span className="text-sm text-gray-900 capitalize">
                        {selectedOwner.businessType || "Not specified"}
                      </span>
                    </div>
                    {selectedOwner.createdAt && (
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          Joined{" "}
                          {new Date(
                            selectedOwner.createdAt.seconds * 1000
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Account Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">
                    Account Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">User ID:</span>
                      <p className="font-mono text-xs text-gray-900 mt-1">
                        {selectedOwner.id}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Username:</span>
                      <p className="text-gray-900 mt-1">
                        @{selectedOwner.username}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => handleToggleStatus(selectedOwner)}
                    className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${
                      selectedOwner.status === "active"
                        ? "bg-orange-600 text-white hover:bg-orange-700"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {selectedOwner.status === "active" ? (
                      <>
                        <UserX className="w-4 h-4" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        Activate
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowOwnerDetails(false)}
                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
