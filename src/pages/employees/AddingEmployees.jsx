import React, { useState, useRef } from "react";
import { db, storage } from "../../services/firebase";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-hot-toast";
import { useBusiness } from "../../contexts/BusinessContext";
import { useAuth } from "../../contexts/AuthContext";

const AddingEmployees = () => {
  const { currentBusiness } = useBusiness();
  const { currentUser } = useAuth(); // Use the auth context

  // Form state
  const [formData, setFormData] = useState({
    employeeName: "",
    address: "",
    mobile1: "",
    mobile2: "",
    nicNumber: "",
    role: "",
    salaryType: "",
    payRate: "",
    email: "", // For sales reps and managers
    permissions: [], // For managers
  });

  // Image states
  const [images, setImages] = useState({
    employeePhoto: null,
    nicFront: null,
    nicBack: null,
    licenseFront: null,
    licenseBack: null,
  });

  // Preview states
  const [previews, setPreviews] = useState({
    employeePhoto: null,
    nicFront: null,
    nicBack: null,
    licenseFront: null,
    licenseBack: null,
  });

  // Camera states
  const [activeCamera, setActiveCamera] = useState(null);
  const [stream, setStream] = useState(null);

  // Loading state
  const [loading, setLoading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  // Credentials modal state
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRefs = {
    employeePhoto: useRef(null),
    nicFront: useRef(null),
    nicBack: useRef(null),
    licenseFront: useRef(null),
    licenseBack: useRef(null),
  };

  // Role options - Added manager role
  const roles = [
    { value: "driver", label: "Driver" },
    { value: "employee", label: "Employee" },
    { value: "sales_rep", label: "Sales Representative" },
    { value: "manager", label: "Manager" },
    { value: "operator", label: "Operator" },
  ];

  // Salary type options
  const salaryTypes = [
    { value: "daily", label: "Daily" },
    { value: "monthly", label: "Monthly" },
  ];

  // Manager permissions options
  const managerPermissions = [
    { value: "view_dashboard", label: "View Dashboard" },
    { value: "manage_inventory", label: "Manage Inventory" },
    { value: "manage_sales", label: "Manage Sales" },
    { value: "manage_employees", label: "Manage Employees" },
    { value: "view_reports", label: "View Reports" },
    { value: "manage_customers", label: "Manage Customers" },
    { value: "manage_suppliers", label: "Manage Suppliers" },
  ];

  // Generate unique username
  const generateUsername = async (name, ownerId, role) => {
    const baseUsername = name.toLowerCase().replace(/\s+/g, "");
    let username = baseUsername;
    let counter = 1;

    while (true) {
      // Check in managers collection (global)
      const managersQuery = query(
        collection(db, "managers"),
        where("username", "==", username),
        where("ownerId", "==", ownerId)
      );
      const managersSnapshot = await getDocs(managersQuery);

      // Check in sales_reps collection (global)
      const salesRepsGlobalQuery = query(
        collection(db, "sales_reps"),
        where("username", "==", username),
        where("ownerId", "==", ownerId)
      );
      const salesRepsGlobalSnapshot = await getDocs(salesRepsGlobalQuery);

      // Check in local business sales reps collection
      const salesRepsLocalQuery = query(
        collection(
          db,
          `owners/${ownerId}/businesses/${currentBusiness.id}/salesReps`
        ),
        where("username", "==", username)
      );
      const salesRepsLocalSnapshot = await getDocs(salesRepsLocalQuery);

      if (
        managersSnapshot.empty &&
        salesRepsGlobalSnapshot.empty &&
        salesRepsLocalSnapshot.empty
      ) {
        return username;
      }

      username = `${baseUsername}${counter}`;
      counter++;
    }
  };
  // Generate secure password
  const generatePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle permission changes for managers
  const handlePermissionChange = (permission) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  // Handle pay rate input with number validation
  const handlePayRateChange = (e) => {
    const { value } = e.target;
    // Allow only numbers and decimal points
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setFormData((prev) => ({
        ...prev,
        payRate: value,
      }));
    }
  };

  // Start camera for photo capture
  const startCamera = async (imageType) => {
    try {
      setVideoReady(false);

      // Stop any existing stream first
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      setActiveCamera(imageType);

      // Wait for video element to be available
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setVideoReady(true);
          };
        }
      }, 100);
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Error accessing camera. Please check permissions.");
      setActiveCamera(null);
      setVideoReady(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setActiveCamera(null);
    setVideoReady(false);
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !activeCamera) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      toast.error("Video not ready. Please wait a moment and try again.");
      return;
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `${activeCamera}.jpg`, {
            type: "image/jpeg",
          });
          handleImageCapture(activeCamera, file);
          stopCamera();
        } else {
          toast.error("Failed to capture image. Please try again.");
        }
      },
      "image/jpeg",
      0.8
    );
  };

  // Handle image capture (camera or file upload)
  const handleImageCapture = (imageType, file) => {
    setImages((prev) => ({
      ...prev,
      [imageType]: file,
    }));

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviews((prev) => ({
        ...prev,
        [imageType]: e.target.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  // Handle file input change
  const handleFileChange = (e, imageType) => {
    const file = e.target.files[0];
    if (file) {
      handleImageCapture(imageType, file);
    }
  };

  // Remove image
  const removeImage = (imageType) => {
    setImages((prev) => ({
      ...prev,
      [imageType]: null,
    }));
    setPreviews((prev) => ({
      ...prev,
      [imageType]: null,
    }));
  };

  // Upload image to Firebase Storage
  const uploadImage = async (file, path) => {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  };

  // Copy credentials to clipboard
  const copyCredentials = () => {
    if (generatedCredentials) {
      const credentialsText = `Username: ${generatedCredentials.username}\nPassword: ${generatedCredentials.password}`;
      navigator.clipboard.writeText(credentialsText);
      toast.success("Credentials copied to clipboard!");
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (
      !formData.employeeName ||
      !formData.address ||
      !formData.mobile1 ||
      !formData.nicNumber ||
      !formData.role ||
      !formData.salaryType ||
      !formData.payRate
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Additional validation for sales reps and managers
    if (
      (formData.role === "sales_rep" || formData.role === "manager") &&
      !formData.email
    ) {
      toast.error("Email is required for Sales Representatives and Managers");
      return;
    }

    // Validation for managers - ensure permissions are selected
    if (formData.role === "manager" && formData.permissions.length === 0) {
      toast.error("Please select at least one permission for the manager");
      return;
    }

    // Validate pay rate
    const payRateNum = parseFloat(formData.payRate);
    if (isNaN(payRateNum) || payRateNum <= 0) {
      toast.error("Please enter a valid pay rate");
      return;
    }

    if (!images.employeePhoto || !images.nicFront || !images.nicBack) {
      toast.error("Employee photo and both sides of NIC are required");
      return;
    }

    if (
      formData.role === "driver" &&
      (!images.licenseFront || !images.licenseBack)
    ) {
      toast.error("Both sides of driving license are required for drivers");
      return;
    }

    setLoading(true);

    try {
      // Use currentUser from auth context instead of auth.currentUser
      let uid = currentUser?.uid;

      // Fallback for different authentication methods
      if (!uid && currentUser?.id) {
        uid = currentUser.id; // Some auth systems use 'id' instead of 'uid'
      }

      // Add debugging
      console.log("Current User:", currentUser);
      console.log("User ID:", uid);
      console.log("Current Business:", currentBusiness);

      if (!uid) {
        console.error("Authentication issue - no user ID found");
        toast.error("You must be logged in to add employees");
        return;
      }

      const businessId = currentBusiness?.id;
      console.log(businessId);
      console.log("Selected Business ID:", businessId);
      console.log("Selected Business Data:", currentBusiness);

      if (!businessId) {
        toast.error("No business selected");
        return;
      }

      const timestamp = Date.now();

      // Generate auto-generated document reference to get the employeeId
      const employeesCollectionRef = collection(
        db,
        "owners",
        uid,
        "businesses",
        businessId,
        "employees"
      );
      const employeeDocRef = doc(employeesCollectionRef);
      const employeeId = employeeDocRef.id; // This is the auto-generated ID

      // Upload images
      const imageUrls = {};

      for (const [key, file] of Object.entries(images)) {
        if (file) {
          const path = `owners/${uid}/businesses/${businessId}/employees/${employeeId}/${key}_${timestamp}`;
          imageUrls[key] = await uploadImage(file, path);
        }
      }

      // Generate username and password for sales_rep and manager roles
      let credentials = null;
      if (formData.role === "sales_rep" || formData.role === "manager") {
        const username = await generateUsername(
          formData.employeeName,
          uid,
          formData.role
        );
        const password = generatePassword();

        credentials = { username, password };
      }

      // Prepare employee data
      const employeeData = {
        name: formData.employeeName,
        address: formData.address,
        mobile1: formData.mobile1,
        mobile2: formData.mobile2 || null,
        nicNumber: formData.nicNumber,
        role: formData.role,
        salaryType: formData.salaryType,
        payRate: parseFloat(formData.payRate),
        email: formData.email || null,
        images: imageUrls,
        employeeId,
        businessId,
        ownerId: uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "active",
        // Add credentials if role requires system access
        ...(credentials && {
          username: credentials.username,
          hasSystemAccess: true,
        }),
        // Add permissions for managers
        ...(formData.role === "manager" && {
          permissions: formData.permissions,
        }),
      };

      // Save to employees collection
      await setDoc(employeeDocRef, employeeData);

      // If role is Sales Representative, also save to salesReps collection
      if (formData.role === "sales_rep") {
        // Create document reference directly with employeeId as the document ID
        const salesRepDocRef = doc(
          db,
          "owners",
          uid,
          "businesses",
          businessId,
          "salesReps",
          employeeId // Use employeeId as the document ID
        );

        const salesRepData = {
          name: formData.employeeName,
          phone: formData.mobile1,
          email: formData.email,
          username: credentials.username,
          password: credentials.password, // Store for system access
          imageUrl: imageUrls.employeePhoto || null,
          employeeId,
          businessId,
          ownerId: uid,
          role: "sales_rep",
          createdAt: new Date(),
          updatedAt: new Date(),
          status: "active",
        };

        await setDoc(salesRepDocRef, salesRepData);
        console.log("Sales rep saved locally with ID:", employeeId);
        const salesRepGlobalDocRef = doc(db, "sales_reps", employeeId);

        const salesRepGlobalData = {
          name: formData.employeeName,
          email: formData.email,
          phone: formData.mobile1,
          username: credentials.username,
          password: credentials.password,
          imageUrl: imageUrls.employeePhoto || null,
          employeeId,
          businessId,
          ownerId: uid,
          role: "sales_rep",
          createdAt: new Date(),
          updatedAt: new Date(),
          status: "active",
        };

        await setDoc(salesRepGlobalDocRef, salesRepGlobalData);
        console.log("Sales rep saved globally with ID:", employeeId);
      }

      // If role is Manager, save to managers collection (global)
      if (formData.role === "manager") {
        const managerDocRef = doc(db, "managers", employeeId);

        const managerData = {
          name: formData.employeeName,
          email: formData.email,
          phone: formData.mobile1,
          username: credentials.username,
          password: credentials.password, // Store for system access
          imageUrl: imageUrls.employeePhoto || null,
          permissions: formData.permissions,
          employeeId,
          businessId,
          ownerId: uid,
          role: "manager",
          createdAt: new Date(),
          updatedAt: new Date(),
          status: "active",
        };

        await setDoc(managerDocRef, managerData);
        console.log("Manager saved with ID:", employeeId);
      }

      toast.success("Employee registered successfully");

      // Show credentials modal if system access was created
      if (credentials) {
        setGeneratedCredentials(credentials);
        setShowCredentialsModal(true);
      }

      // Reset form
      setFormData({
        employeeName: "",
        address: "",
        mobile1: "",
        mobile2: "",
        nicNumber: "",
        role: "",
        salaryType: "",
        payRate: "",
        email: "",
        permissions: [],
      });
      setImages({
        employeePhoto: null,
        nicFront: null,
        nicBack: null,
        licenseFront: null,
        licenseBack: null,
      });
      setPreviews({
        employeePhoto: null,
        nicFront: null,
        nicBack: null,
        licenseFront: null,
        licenseBack: null,
      });
    } catch (error) {
      console.error("Error adding employee:", error);
      toast.error("Failed to register employee. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Image capture component
  const ImageCaptureSection = ({ imageType, label, required = false }) => {
    const preview = previews[imageType];

    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>

        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt={label}
              className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
            />
            <button
              type="button"
              onClick={() => removeImage(imageType)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <div className="space-y-4">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => startCamera(imageType)}
                  className="inline-flex items-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:opacity-90"
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
                  Take Photo
                </button>

                <span className="text-gray-500">or</span>

                <button
                  type="button"
                  onClick={() => fileInputRefs[imageType].current?.click()}
                  className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
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
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  Upload File
                </button>
              </div>
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-8">
          Register New Employee
        </h2>

        {activeCamera && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
              <h3 className="text-lg font-medium mb-4">
                Take Photo -{" "}
                {activeCamera
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}
              </h3>
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover rounded-lg mb-4 bg-black"
                />
                {!videoReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">
                        Starting camera...
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-between">
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={capturePhoto}
                  disabled={!videoReady}
                  className={`px-4 py-2 bg-primary text-white rounded-md hover:opacity-90 ${
                    !videoReady ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  Capture
                </button>
              </div>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="employeeName"
                value={formData.employeeName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                placeholder="Enter full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NIC Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nicNumber"
                value={formData.nicNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                placeholder="Enter NIC number"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address <span className="text-red-500">*</span>
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors resize-none"
                placeholder="Enter complete address"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number 1 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="mobile1"
                value={formData.mobile1}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                placeholder="Enter primary mobile number"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number 2
              </label>
              <input
                type="tel"
                name="mobile2"
                value={formData.mobile2}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                placeholder="Enter secondary mobile number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                required
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Conditional Email Field for Sales Reps and Managers */}
            {(formData.role === "sales_rep" || formData.role === "manager") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                  placeholder="Enter email address"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Salary Type <span className="text-red-500">*</span>
              </label>
              <select
                name="salaryType"
                value={formData.salaryType}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                required
              >
                <option value="">Select salary type</option>
                {salaryTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.salaryType === "daily"
                  ? "Daily Wage"
                  : formData.salaryType === "monthly"
                  ? "Daily Wage"
                  : "Pay Rate"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  Rs.
                </span>
                <input
                  type="text"
                  name="payRate"
                  value={formData.payRate}
                  onChange={handlePayRateChange}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                  placeholder={
                    formData.salaryType === "daily"
                      ? "Enter daily wage"
                      : formData.salaryType === "monthly"
                      ? "Enter daily wage to calculate monthly"
                      : "Enter pay rate"
                  }
                  required
                />
              </div>
              {formData.salaryType && (
                <p className="text-xs text-gray-500 mt-1">
                  {formData.salaryType === "daily"
                    ? "Amount paid per working day"
                    : "Fixed monthly salary amount"}
                </p>
              )}
            </div>
          </div>

          {/* Manager Permissions Section */}
          {formData.role === "manager" && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800 border-b border-gray-200 pb-2">
                Manager Permissions <span className="text-red-500">*</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {managerPermissions.map((permission) => (
                  <label
                    key={permission.value}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes(permission.value)}
                      onChange={() => handlePermissionChange(permission.value)}
                      className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {permission.label}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Select the permissions this manager should have in the system.
              </p>
            </div>
          )}

          {/* System Access Notice */}
          {(formData.role === "sales_rep" || formData.role === "manager") && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-blue-600 mt-0.5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-blue-800 mb-1">
                    System Access Will Be Created
                  </h4>
                  <p className="text-sm text-blue-700">
                    {formData.role === "sales_rep"
                      ? "A username and password will be generated for billing app access."
                      : "A username and password will be generated for system management access."}{" "}
                    Credentials will be displayed after registration.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Image Uploads */}
          <div className="space-y-8">
            <h3 className="text-lg font-medium text-gray-800 border-b border-gray-200 pb-2">
              Document Photos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ImageCaptureSection
                imageType="employeePhoto"
                label="Employee Photo"
                required
              />

              <ImageCaptureSection
                imageType="nicFront"
                label="NIC Front Side"
                required
              />

              <ImageCaptureSection
                imageType="nicBack"
                label="NIC Back Side"
                required
              />

              {formData.role === "driver" && (
                <>
                  <ImageCaptureSection
                    imageType="licenseFront"
                    label="License Front Side"
                    required
                  />

                  <ImageCaptureSection
                    imageType="licenseBack"
                    label="License Back Side"
                    required
                  />
                </>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 px-6 bg-primary text-white font-medium rounded-lg transition-all ${
                loading
                  ? "opacity-70 cursor-not-allowed"
                  : "hover:opacity-90 active:scale-95"
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Registering Employee...
                </div>
              ) : (
                "Register Employee"
              )}
            </button>
          </div>
        </form>

        {/* Credentials Modal */}
        {showCredentialsModal && generatedCredentials && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="text-center mb-4">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
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
                      d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2a2 2 0 00-2 2m2-2a2 2 0 00-2-2M9 5a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h2zm11 0a2 2 0 012 2v6a2 2 0 01-2 2h-2a2 2 0 01-2-2V7a2 2 0 012-2h2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  System Access Created
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Save these credentials safely. They will be needed for system
                  login.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username:
                    </label>
                    <div className="bg-white p-3 rounded border border-gray-200 font-mono text-lg">
                      {generatedCredentials.username}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password:
                    </label>
                    <div className="bg-white p-3 rounded border border-gray-200 font-mono text-lg">
                      {generatedCredentials.password}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-yellow-600 mt-0.5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 15c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <p className="text-sm text-yellow-700">
                    <strong>Important:</strong> Make sure to copy and save these
                    credentials. They cannot be retrieved again once this dialog
                    is closed.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyCredentials}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
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
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy Credentials
                </button>
                <button
                  onClick={() => {
                    setShowCredentialsModal(false);
                    setGeneratedCredentials(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddingEmployees;
