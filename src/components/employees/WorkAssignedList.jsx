import React, { useState, useEffect } from "react";
import { db, auth } from "../../services/firebase";
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
import { toast } from "react-hot-toast";

export const WorkAssignmentsList = () => {
  const [workAssignments, setWorkAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Fetch work assignments
  useEffect(() => {
    fetchWorkAssignments();
  }, []);

  const fetchWorkAssignments = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error("User not authenticated");
        return;
      }

      const currentBusinessId = localStorage.getItem("currentBusinessId");
      if (!currentBusinessId) {
        toast.error("No business selected");
        return;
      }

      const assignmentsQuery = query(
        collection(db, "workAssignments"),
        where("ownerId", "==", currentUser.uid),
        where("businessId", "==", currentBusinessId),
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
      const assignmentRef = doc(db, "workAssignments", assignmentId);
      await updateDoc(assignmentRef, {
        status: newStatus,
        updatedAt: new Date(),
        ...(newStatus === "completed" && { completedAt: new Date() }),
        ...(newStatus === "in-progress" && { startedAt: new Date() }),
      });

      // Update local state
      setWorkAssignments((prev) =>
        prev.map((assignment) =>
          assignment.id === assignmentId
            ? { ...assignment, status: newStatus, updatedAt: new Date() }
            : assignment
        )
      );

      toast.success(`Work marked as ${newStatus.replace("-", " ")}`);
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
      await deleteDoc(doc(db, "workAssignments", assignmentId));

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
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      assignment.assignedWork
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      assignment.employeeId.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "assigned":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "in-progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600">
              Loading work assignments...
            </span>
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Work Assignments
            </h1>
            <p className="text-gray-600 mt-1">Manage and track assigned work</p>
          </div>

          <button
            onClick={fetchWorkAssignments}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
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
          },
          {
            label: "Assigned",
            count: statusCounts.assigned || 0,
            color: "bg-blue-100 text-blue-800",
          },
          {
            label: "In Progress",
            count: statusCounts["in-progress"] || 0,
            color: "bg-yellow-100 text-yellow-800",
          },
          {
            label: "Completed",
            count: statusCounts.completed || 0,
            color: "bg-green-100 text-green-800",
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
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${stat.color}`}
              >
                {stat.count}
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
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search by employee name, work description, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="assigned">Assigned</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {filteredAssignments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
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
            {filteredAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Assignment Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {assignment.employeeName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          ID: {assignment.employeeId}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          assignment.status
                        )}`}
                      >
                        {assignment.status.replace("-", " ").toUpperCase()}
                      </span>
                    </div>

                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-1">
                        Assigned Work:
                      </h4>
                      <p className="text-gray-900 leading-relaxed">
                        {assignment.assignedWork}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>Assigned: {formatDate(assignment.assignedAt)}</span>
                      {assignment.startedAt && (
                        <span>Started: {formatDate(assignment.startedAt)}</span>
                      )}
                      {assignment.completedAt && (
                        <span>
                          Completed: {formatDate(assignment.completedAt)}
                        </span>
                      )}
                      <span>By: {assignment.assignedByName}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 lg:ml-6">
                    {assignment.status === "assigned" && (
                      <button
                        onClick={() =>
                          updateAssignmentStatus(assignment.id, "in-progress")
                        }
                        disabled={updating === assignment.id}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors text-sm"
                      >
                        {updating === assignment.id
                          ? "Updating..."
                          : "Start Work"}
                      </button>
                    )}

                    {assignment.status === "in-progress" && (
                      <button
                        onClick={() =>
                          updateAssignmentStatus(assignment.id, "completed")
                        }
                        disabled={updating === assignment.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
                      >
                        {updating === assignment.id
                          ? "Updating..."
                          : "Complete"}
                      </button>
                    )}

                    {assignment.status !== "completed" &&
                      assignment.status !== "cancelled" && (
                        <button
                          onClick={() =>
                            updateAssignmentStatus(assignment.id, "cancelled")
                          }
                          disabled={updating === assignment.id}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm"
                        >
                          {updating === assignment.id
                            ? "Updating..."
                            : "Cancel"}
                        </button>
                      )}

                    <button
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        setShowDeleteModal(true);
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="ml-4 text-lg font-medium text-gray-900">
                Delete Assignment
              </h3>
            </div>

            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the work assignment for{" "}
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
