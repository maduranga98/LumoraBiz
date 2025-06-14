import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useBusiness } from "../../contexts/BusinessContext";
import { toast } from "react-hot-toast";
import {
  Briefcase,
  Clock,
  User,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  Play,
  Square,
  Trash2,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";

export const WorkAssignmentsList = () => {
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();

  const [workAssignments, setWorkAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Fetch work assignments
  useEffect(() => {
    if (currentUser && currentBusiness?.id) {
      fetchWorkAssignments();
    } else {
      setLoading(false);
    }
  }, [currentUser, currentBusiness]);

  const fetchWorkAssignments = async () => {
    setLoading(true);
    try {
      if (!currentUser?.uid) {
        toast.error("User not authenticated");
        return;
      }

      if (!currentBusiness?.id) {
        toast.error("No business selected");
        return;
      }

      // Updated path: /owners/{ownerId}/businesses/{businessId}/temporaryWorks
      const ownerDocRef = doc(db, "owners", currentUser.uid);
      const businessDocRef = doc(ownerDocRef, "businesses", currentBusiness.id);
      const temporaryWorksCollectionRef = collection(
        businessDocRef,
        "temporaryWorks"
      );

      const assignmentsQuery = query(
        temporaryWorksCollectionRef,
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(assignmentsQuery);
      const assignmentsList = [];

      querySnapshot.forEach((doc) => {
        assignmentsList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setWorkAssignments(assignmentsList);
    } catch (error) {
      console.error("Error fetching work assignments:", error);
      toast.error("Failed to fetch work assignments");
    } finally {
      setLoading(false);
    }
  };

  // Update assignment status
  const updateAssignmentStatus = async (assignmentId, newStatus) => {
    setUpdating(assignmentId);
    try {
      const ownerDocRef = doc(db, "owners", currentUser.uid);
      const businessDocRef = doc(ownerDocRef, "businesses", currentBusiness.id);
      const assignmentRef = doc(businessDocRef, "temporaryWorks", assignmentId);

      const updateData = {
        status: newStatus,
        updatedAt: new Date(),
      };

      if (newStatus === "completed") {
        updateData.completedAt = new Date();
      }
      if (newStatus === "in_progress") {
        updateData.startedAt = new Date();
      }

      await updateDoc(assignmentRef, updateData);

      // Update local state
      setWorkAssignments((prev) =>
        prev.map((assignment) =>
          assignment.id === assignmentId
            ? { ...assignment, ...updateData }
            : assignment
        )
      );

      toast.success(`Work marked as ${newStatus.replace("_", " ")}`);
    } catch (error) {
      console.error("Error updating assignment:", error);
      toast.error("Failed to update assignment status");
    } finally {
      setUpdating(null);
    }
  };

  // Delete assignment
  const deleteAssignment = async (assignmentId) => {
    try {
      const ownerDocRef = doc(db, "owners", currentUser.uid);
      const businessDocRef = doc(ownerDocRef, "businesses", currentBusiness.id);
      const assignmentRef = doc(businessDocRef, "temporaryWorks", assignmentId);

      await deleteDoc(assignmentRef);

      setWorkAssignments((prev) =>
        prev.filter((assignment) => assignment.id !== assignmentId)
      );
      setShowDeleteModal(false);
      setSelectedAssignment(null);

      toast.success("Assignment deleted successfully");
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast.error("Failed to delete assignment");
    }
  };

  // Filter assignments
  const filteredAssignments = workAssignments.filter((assignment) => {
    const matchesStatus =
      filterStatus === "all" || assignment.status === filterStatus;
    const matchesSearch =
      assignment.employeeName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      assignment.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.description
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      assignment.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // Get status color and icon
  const getStatusDetails = (status) => {
    switch (status) {
      case "assigned":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: Clock,
          label: "Assigned",
        };
      case "in_progress":
        return {
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          icon: Play,
          label: "In Progress",
        };
      case "completed":
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          icon: CheckCircle,
          label: "Completed",
        };
      case "cancelled":
        return {
          color: "bg-red-100 text-red-800 border-red-200",
          icon: Square,
          label: "Cancelled",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: AlertCircle,
          label: "Unknown",
        };
    }
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return "N/A";
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status counts
  const statusCounts = workAssignments.reduce((acc, assignment) => {
    acc[assignment.status] = (acc[assignment.status] || 0) + 1;
    return acc;
  }, {});

  // No business selected
  if (!currentBusiness) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Business Selected
            </h3>
            <p className="text-gray-600">
              Please select a business to view work assignments.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="animate-spin h-8 w-8 text-blue-500 mr-2" />
            <span className="text-gray-600">Loading work assignments...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Work Assignments
              </h1>
              <p className="text-gray-600 mt-1">
                {currentBusiness.businessName}
              </p>
            </div>
          </div>

          <button
            onClick={fetchWorkAssignments}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total",
            count: workAssignments.length,
            color: "bg-gray-100 text-gray-800",
            icon: Briefcase,
          },
          {
            label: "Assigned",
            count: statusCounts.assigned || 0,
            color: "bg-blue-100 text-blue-800",
            icon: Clock,
          },
          {
            label: "In Progress",
            count: statusCounts.in_progress || 0,
            color: "bg-yellow-100 text-yellow-800",
            icon: Play,
          },
          {
            label: "Completed",
            count: statusCounts.completed || 0,
            color: "bg-green-100 text-green-800",
            icon: CheckCircle,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
              </div>
              <div className="flex items-center">
                <stat.icon className="w-5 h-5 text-gray-400 mr-2" />
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium ${stat.color}`}
                >
                  {stat.count}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by employee name, work title, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="all">All Status</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {filteredAssignments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Briefcase className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No work assignments found
            </h3>
            <p className="text-gray-600">
              {searchTerm || filterStatus !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Start by assigning work to employees"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAssignments.map((assignment) => {
              const statusDetails = getStatusDetails(assignment.status);
              const StatusIcon = statusDetails.icon;

              return (
                <div
                  key={assignment.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Assignment Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <User className="w-5 h-5 text-gray-400 mr-2" />
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {assignment.employeeName || "Unknown Employee"}
                            </h3>
                            {assignment.employeeRole && (
                              <p className="text-sm text-blue-600 capitalize">
                                {assignment.employeeRole.replace("_", " ")}
                              </p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusDetails.color}`}
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusDetails.label}
                        </span>
                      </div>

                      {/* Work Title */}
                      <div className="mb-3">
                        <div className="flex items-center mb-1">
                          <Briefcase className="w-4 h-4 text-gray-400 mr-2" />
                          <h4 className="text-sm font-medium text-gray-700">
                            Work Title:
                          </h4>
                        </div>
                        <p className="text-gray-900 font-medium ml-6">
                          {assignment.title || "No title provided"}
                        </p>
                      </div>

                      {/* Work Description */}
                      <div className="mb-3">
                        <div className="flex items-center mb-1">
                          <FileText className="w-4 h-4 text-gray-400 mr-2" />
                          <h4 className="text-sm font-medium text-gray-700">
                            Description:
                          </h4>
                        </div>
                        <p className="text-gray-900 leading-relaxed ml-6">
                          {assignment.description || "No description provided"}
                        </p>
                      </div>

                      {/* Instructions */}
                      {assignment.instructions && (
                        <div className="mb-3">
                          <div className="flex items-center mb-1">
                            <AlertCircle className="w-4 h-4 text-gray-400 mr-2" />
                            <h4 className="text-sm font-medium text-gray-700">
                              Instructions:
                            </h4>
                          </div>
                          <p className="text-gray-700 leading-relaxed ml-6 italic">
                            {assignment.instructions}
                          </p>
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span>
                            Assigned: {formatDate(assignment.assignedAt)}
                          </span>
                        </div>
                        {assignment.startedAt && (
                          <div className="flex items-center">
                            <Play className="w-4 h-4 mr-1" />
                            <span>
                              Started: {formatDate(assignment.startedAt)}
                            </span>
                          </div>
                        )}
                        {assignment.completedAt && (
                          <div className="flex items-center">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            <span>
                              Completed: {formatDate(assignment.completedAt)}
                            </span>
                          </div>
                        )}
                        <span>By: {assignment.assignedByName}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 lg:ml-6">
                      {assignment.status === "assigned" && (
                        <button
                          onClick={() =>
                            updateAssignmentStatus(assignment.id, "in_progress")
                          }
                          disabled={updating === assignment.id}
                          className="flex items-center justify-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors text-sm"
                        >
                          {updating === assignment.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-1" />
                              Start Work
                            </>
                          )}
                        </button>
                      )}

                      {assignment.status === "in_progress" && (
                        <button
                          onClick={() =>
                            updateAssignmentStatus(assignment.id, "completed")
                          }
                          disabled={updating === assignment.id}
                          className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
                        >
                          {updating === assignment.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Complete
                            </>
                          )}
                        </button>
                      )}

                      {assignment.status !== "completed" &&
                        assignment.status !== "cancelled" && (
                          <button
                            onClick={() =>
                              updateAssignmentStatus(assignment.id, "cancelled")
                            }
                            disabled={updating === assignment.id}
                            className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm"
                          >
                            {updating === assignment.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Square className="w-4 h-4 mr-1" />
                                Cancel
                              </>
                            )}
                          </button>
                        )}

                      <button
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setShowDeleteModal(true);
                        }}
                        className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="ml-4 text-lg font-medium text-gray-900">
                Delete Assignment
              </h3>
            </div>

            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the work assignment{" "}
              <strong>"{selectedAssignment.title}"</strong> for{" "}
              <strong>{selectedAssignment.employeeName}</strong>? This action
              cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAssignment(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteAssignment(selectedAssignment.id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
