import React, { useState, useEffect, useRef } from "react";
import { db, auth, storage } from "../../services/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  orderBy 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-hot-toast";

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Modal states
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [modalType, setModalType] = useState(null); // 'view', 'edit', 'status'
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Edit form state
  const [editFormData, setEditFormData] = useState({});
  const [editImages, setEditImages] = useState({});
  const [editPreviews, setEditPreviews] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);

  // Status update state
  const [statusData, setStatusData] = useState({
    status: "active",
    leftDate: "",
  });

  // Camera states for editing
  const [activeCamera, setActiveCamera] = useState(null);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRefs = {
    employeePhoto: useRef(null),
    nicFront: useRef(null),
    nicBack: useRef(null),
    licenseFront: useRef(null),
    licenseBack: useRef(null),
  };

  const roles = [
    { value: "driver", label: "Driver" },
    { value: "employee", label: "Employee" },
    { value: "sales_rep", label: "Sales Representative" },
    { value: "operator", label: "Operator" },
  ];

  // Fetch employees
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const businessId = localStorage.getItem("currentBusinessId");
      if (!businessId) return;

      const employeesQuery = query(
        collection(db, "employees"),
        where("businessId", "==", businessId),
        where("ownerId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(employeesQuery);
      const employeesList = [];

      querySnapshot.forEach((doc) => {
        employeesList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setEmployees(employeesList);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.nicNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !filterRole || employee.role === filterRole;
    const matchesStatus = !filterStatus || employee.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Open modal
  const openModal = (type, employee = null) => {
    setModalType(type);
    setSelectedEmployee(employee);
    setIsModalOpen(true);

    if (type === "edit" && employee) {
      setEditFormData({
        employeeName: employee.employeeName || "",
        address: employee.address || "",
        mobile1: employee.mobile1 || "",
        mobile2: employee.mobile2 || "",
        nicNumber: employee.nicNumber || "",
        role: employee.role || "",
      });
      setEditPreviews(employee.images || {});
    }

    if (type === "status" && employee) {
      setStatusData({
        status: employee.status || "active",
        leftDate: employee.leftDate || "",
      });
    }
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
    setModalType(null);
    setEditFormData({});
    setEditImages({});
    setEditPreviews({});
    setStatusData({ status: "active", leftDate: "" });
    stopCamera();
  };

  // Delete employee
  const handleDelete = async (employeeId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this employee? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, "employees", employeeId));
      toast.success("Employee deleted successfully");
      fetchEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error("Failed to delete employee");
    }
  };

  // Update employee status
  const handleStatusUpdate = async () => {
    if (!selectedEmployee) return;

    if (statusData.status === "inactive" && !statusData.leftDate) {
      toast.error("Please select the date employee left");
      return;
    }

    setSaveLoading(true);
    try {
      const updateData = {
        status: statusData.status,
        updatedAt: new Date(),
      };

      if (statusData.status === "inactive") {
        updateData.leftDate = statusData.leftDate;
      } else {
        updateData.leftDate = null;
      }

      await updateDoc(doc(db, "employees", selectedEmployee.id), updateData);
      toast.success("Employee status updated successfully");
      fetchEmployees();
      closeModal();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update employee status");
    } finally {
      setSaveLoading(false);
    }
  };

  // Camera functions for editing
  const startCamera = async (imageType) => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
      setActiveCamera(imageType);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Error accessing camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setActiveCamera(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !activeCamera) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        const file = new File([blob], `${activeCamera}.jpg`, {
          type: "image/jpeg",
        });
        handleImageCapture(activeCamera, file);
        stopCamera();
      },
      "image/jpeg",
      0.8
    );
  };

  const handleImageCapture = (imageType, file) => {
    setEditImages((prev) => ({
      ...prev,
      [imageType]: file,
    }));

    const reader = new FileReader();
    reader.onload = (e) => {
      setEditPreviews((prev) => ({
        ...prev,
        [imageType]: e.target.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e, imageType) => {
    const file = e.target.files[0];
    if (file) {
      handleImageCapture(imageType, file);
    }
  };

  const removeEditImage = (imageType) => {
    setEditImages((prev) => ({
      ...prev,
      [imageType]: null,
    }));
    setEditPreviews((prev) => ({
      ...prev,
      [imageType]: selectedEmployee?.images?.[imageType] || null,
    }));
  };

  // Upload image to Firebase Storage
  const uploadImage = async (file, path) => {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  };

  // Save employee changes
  const handleSaveChanges = async () => {
    if (!selectedEmployee) return;

    // Validation
    if (
      !editFormData.employeeName ||
      !editFormData.address ||
      !editFormData.mobile1 ||
      !editFormData.nicNumber ||
      !editFormData.role
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaveLoading(true);
    try {
      const timestamp = Date.now();
      const imageUrls = { ...selectedEmployee.images };

      // Upload new images
      for (const [key, file] of Object.entries(editImages)) {
        if (file) {
          const path = `employees/${selectedEmployee.employeeId}/${key}_${timestamp}`;
          imageUrls[key] = await uploadImage(file, path);
        }
      }

      const updateData = {
        ...editFormData,
        images: imageUrls,
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, "employees", selectedEmployee.id), updateData);
      toast.success("Employee updated successfully");
      fetchEmployees();
      closeModal();
    } catch (error) {
      console.error("Error updating employee:", error);
      toast.error("Failed to update employee");
    } finally {
      setSaveLoading(false);
    }
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const isActive = status === "active";
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}
      >
        {isActive ? "Active" : "Inactive"}
      </span>
    );
  };

  // Image display component for editing
  const EditImageSection = ({ imageType, label, required = false }) => {
    const preview = editPreviews[imageType];

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>

        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt={label}
              className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
            />
            <button
              type="button"
              onClick={() => removeEditImage(imageType)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <svg
                className="w-3 h-3"
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
        ) : (
          <div className="border border-gray-300 rounded-lg p-3 text-center">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => startCamera(imageType)}
                className="inline-flex items-center px-2 py-1 bg-primary text-white text-xs rounded hover:opacity-90"
              >
                <svg
                  className="w-3 h-3 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Take
              </button>

              <span className="text-xs text-gray-500">or</span>

              <button
                type="button"
                onClick={() => fileInputRefs[imageType].current?.click()}
                className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
              >
                <svg
                  className="w-3 h-3 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Upload
              </button>
            </div>

            <input
              ref={fileInputRefs[imageType]}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, imageType)}
            />
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-800 mb-4">
            Employee Management
          </h1>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>

            <div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              >
                <option value="">All Roles</option>
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="text-sm text-gray-600 flex items-center">
              Total: {filteredEmployees.length} employees
            </div>
          </div>
        </div>

        {/* Employee List */}
        <div className="p-6">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No employees found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || filterRole || filterStatus
                  ? "Try adjusting your filters"
                  : "Get started by adding a new employee"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {employee.images?.employeePhoto ? (
                        <img
                          src={employee.images.employeePhoto}
                          alt={employee.employeeName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-gray-600 font-medium">
                            {employee.employeeName?.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {employee.employeeName}
                        </h3>
                        <p className="text-sm text-gray-500 capitalize">
                          {employee.role?.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={employee.status} />
                  </div>

                  <div className="space-y-1 text-sm text-gray-600 mb-4">
                    <p>
                      <span className="font-medium">NIC:</span>{" "}
                      {employee.nicNumber}
                    </p>
                    <p>
                      <span className="font-medium">Mobile:</span>{" "}
                      {employee.mobile1}
                    </p>
                    {employee.status === "inactive" && employee.leftDate && (
                      <p>
                        <span className="font-medium">Left Date:</span>{" "}
                        {new Date(employee.leftDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => openModal("view", employee)}
                      className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200 transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => openModal("edit", employee)}
                      className="flex-1 px-3 py-2 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openModal("status", employee)}
                      className="flex-1 px-3 py-2 bg-yellow-100 text-yellow-700 text-sm rounded hover:bg-yellow-200 transition-colors"
                    >
                      Status
                    </button>
                    <button
                      onClick={() => handleDelete(employee.id)}
                      className="px-3 py-2 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Camera Modal */}
      {activeCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-medium mb-4">Take Photo</h3>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-64 object-cover rounded-lg mb-4"
            />
            <div className="flex justify-between">
              <button
                onClick={stopCamera}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="px-4 py-2 bg-primary text-white rounded-md hover:opacity-90"
              >
                Capture
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-90vh overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {modalType === "view" && "Employee Details"}
                {modalType === "edit" && "Edit Employee"}
                {modalType === "status" && "Update Status"}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
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

            <div className="p-6">
              {/* View Modal */}
              {modalType === "view" && selectedEmployee && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Employee Name
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedEmployee.employeeName}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          NIC Number
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedEmployee.nicNumber}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Role
                        </label>
                        <p className="mt-1 text-sm text-gray-900 capitalize">
                          {selectedEmployee.role?.replace("_", " ")}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Mobile 1
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedEmployee.mobile1}
                        </p>
                      </div>
                      {selectedEmployee.mobile2 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Mobile 2
                          </label>
                          <p className="mt-1 text-sm text-gray-900">
                            {selectedEmployee.mobile2}
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Address
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedEmployee.address}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Status
                        </label>
                        <div className="mt-1">
                          <StatusBadge status={selectedEmployee.status} />
                        </div>
                      </div>
                      {selectedEmployee.status === "inactive" &&
                        selectedEmployee.leftDate && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Left Date
                            </label>
                            <p className="mt-1 text-sm text-gray-900">
                              {new Date(
                                selectedEmployee.leftDate
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Documents</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedEmployee.images?.employeePhoto && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Employee Photo
                            </label>
                            <img
                              src={selectedEmployee.images.employeePhoto}
                              alt="Employee"
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          </div>
                        )}
                        {selectedEmployee.images?.nicFront && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              NIC Front
                            </label>
                            <img
                              src={selectedEmployee.images.nicFront}
                              alt="NIC Front"
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          </div>
                        )}
                        {selectedEmployee.images?.nicBack && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              NIC Back
                            </label>
                            <img
                              src={selectedEmployee.images.nicBack}
                              alt="NIC Back"
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          </div>
                        )}
                        {selectedEmployee.images?.licenseFront && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              License Front
                            </label>
                            <img
                              src={selectedEmployee.images.licenseFront}
                              alt="License Front"
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          </div>
                        )}
                        {selectedEmployee.images?.licenseBack && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              License Back
                            </label>
                            <img
                              src={selectedEmployee.images.licenseBack}
                              alt="License Back"
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Modal */}
              {modalType === "edit" && selectedEmployee && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Employee Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editFormData.employeeName || ""}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            employeeName: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        NIC Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editFormData.nicNumber || ""}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            nicNumber: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={editFormData.role || ""}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            role: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      >
                        <option value="">Select a role</option>
                        {roles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mobile Number 1 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={editFormData.mobile1 || ""}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            mobile1: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mobile Number 2
                      </label>
                      <input
                        type="tel"
                        value={editFormData.mobile2 || ""}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            mobile2: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={editFormData.address || ""}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            address: e.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none"
                      />
                    </div>
                  </div>

                  {/* Image Edit Section */}
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">
                      Update Documents
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <EditImageSection
                        imageType="employeePhoto"
                        label="Employee Photo"
                        required
                      />

                      <EditImageSection
                        imageType="nicFront"
                        label="NIC Front"
                        required
                      />

                      <EditImageSection
                        imageType="nicBack"
                        label="NIC Back"
                        required
                      />

                      {editFormData.role === "driver" && (
                        <>
                          <EditImageSection
                            imageType="licenseFront"
                            label="License Front"
                            required
                          />

                          <EditImageSection
                            imageType="licenseBack"
                            label="License Back"
                            required
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Edit Actions */}
                  <div className="border-t border-gray-200 pt-6 flex justify-end space-x-3">
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      disabled={saveLoading}
                      className={`px-6 py-2 bg-primary text-white rounded-lg transition-colors ${
                        saveLoading
                          ? "opacity-70 cursor-not-allowed"
                          : "hover:opacity-90"
                      }`}
                    >
                      {saveLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </div>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Status Update Modal */}
              {modalType === "status" && selectedEmployee && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Employee Status
                      </label>
                      <select
                        value={statusData.status}
                        onChange={(e) =>
                          setStatusData((prev) => ({
                            ...prev,
                            status: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    {statusData.status === "inactive" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date Left <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={statusData.leftDate}
                          onChange={(e) =>
                            setStatusData((prev) => ({
                              ...prev,
                              leftDate: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                          max={new Date().toISOString().split("T")[0]}
                        />
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-2">
                      Current Employee Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Name:</span>{" "}
                        {selectedEmployee.employeeName}
                      </div>
                      <div>
                        <span className="font-medium">Role:</span>{" "}
                        {selectedEmployee.role?.replace("_", " ")}
                      </div>
                      <div>
                        <span className="font-medium">Current Status:</span>
                        <StatusBadge status={selectedEmployee.status} />
                      </div>
                      {selectedEmployee.status === "inactive" &&
                        selectedEmployee.leftDate && (
                          <div>
                            <span className="font-medium">
                              Previous Left Date:
                            </span>{" "}
                            {new Date(
                              selectedEmployee.leftDate
                            ).toLocaleDateString()}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Status Actions */}
                  <div className="border-t border-gray-200 pt-6 flex justify-end space-x-3">
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleStatusUpdate}
                      disabled={saveLoading}
                      className={`px-6 py-2 rounded-lg transition-colors ${
                        statusData.status === "active"
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-red-600 hover:bg-red-700 text-white"
                      } ${saveLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                    >
                      {saveLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating...
                        </div>
                      ) : (
                        `Mark as ${
                          statusData.status === "active" ? "Active" : "Inactive"
                        }`
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeList;