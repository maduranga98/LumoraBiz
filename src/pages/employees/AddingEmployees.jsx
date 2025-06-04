import React, { useState, useRef } from "react";
import { db, auth, storage } from "../../services/firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "react-hot-toast";

const AddingEmployees = () => {
  // Form state
  const [formData, setFormData] = useState({
    employeeName: "",
    address: "",
    mobile1: "",
    mobile2: "",
    nicNumber: "",
    role: "",
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

  // Role options
  const roles = [
    { value: "driver", label: "Driver" },
    { value: "employee", label: "Employee" },
    { value: "sales_rep", label: "Sales Representative" },
    { value: "operator", label: "Operator" },
  ];

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Start camera for photo capture

  const startCamera = async (imageType) => {
    try {
      setVideoReady(false); // Reset video ready state

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
            setVideoReady(true); // Video is now ready
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

  // Update the capturePhoto function:
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !activeCamera) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    // Check if video is ready
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
  // const uploadImage = async (file, path) => {
  //   const storageRef = ref(storage, path);
  //   const snapshot = await uploadBytes(storageRef, file);
  //   return await getDownloadURL(snapshot.ref);
  // };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (
      !formData.employeeName ||
      !formData.address ||
      !formData.mobile1 ||
      !formData.nicNumber ||
      !formData.role
    ) {
      toast.error("Please fill in all required fields");
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
      const uid = auth.currentUser?.uid;
      if (!uid) {
        toast.error("You must be logged in to add employees");
        return;
      }

      const timestamp = Date.now();
      const employeeId = `emp_${timestamp}`;

      // Upload images
      const imageUrls = {};

      for (const [key, file] of Object.entries(images)) {
        if (file) {
          const path = `employees/${employeeId}/${key}_${timestamp}`;
          // imageUrls[key] = await uploadImage(file, path);
        }
      }

      // Prepare employee data
      const employeeData = {
        ...formData,
        images: imageUrls,
        employeeId,
        businessId: localStorage.getItem("currentBusinessId"),
        ownerId: uid,
        createdAt: new Date(),
        status: "active",
      };

      // Add document to 'employees' collection
      await addDoc(collection(db, "employees"), employeeData);

      toast.success("Employee registered successfully");

      // Reset form
      setFormData({
        employeeName: "",
        address: "",
        mobile1: "",
        mobile2: "",
        nicNumber: "",
        role: "",
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
                {/* Loading overlay - only show when video is not ready */}
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

            <div className="md:col-span-2">
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
          </div>

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
      </div>
    </div>
  );
};

export default AddingEmployees;
