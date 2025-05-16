import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";

export const EditBusinessData = () => {
  const { businessId } = useParams();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    businessName: "",
    address: "",
    businessRegistration: "",
    email: "",
    phoneNumber: "",
  });

  // Loading states
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Notification state
  const [notification, setNotification] = useState({
    show: false,
    type: "",
    message: "",
  });

  // Show notification
  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(
      () => setNotification({ show: false, type: "", message: "" }),
      3000
    );
  };

  // Fetch business data on component mount
  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!businessId) {
        setFetchError("Business ID is missing");
        setFetchLoading(false);
        return;
      }

      try {
        const businessRef = doc(db, "business", businessId);
        const businessSnapshot = await getDoc(businessRef);

        if (!businessSnapshot.exists()) {
          setFetchError("Business not found");
          setFetchLoading(false);
          return;
        }

        const businessData = businessSnapshot.data();

        setFormData({
          businessName: businessData.businessName || "",
          address: businessData.address || "",
          businessRegistration: businessData.businessRegistration || "",
          email: businessData.email || "",
          phoneNumber: businessData.phoneNumber || "",
        });
      } catch (error) {
        console.error("Error fetching business data:", error);
        setFetchError("Error fetching business data. Please try again.");
      } finally {
        setFetchLoading(false);
      }
    };

    fetchBusinessData();
  }, [businessId]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.businessName || !formData.address) {
      showNotification("error", "Business name and address are required");
      return;
    }

    setLoading(true);

    try {
      // Prepare business data
      const businessData = {
        businessName: formData.businessName,
        address: formData.address,
        businessRegistration: formData.businessRegistration || null,
        email: formData.email || null,
        phoneNumber: formData.phoneNumber || null,
        updatedAt: new Date(),
      };

      // Update document in 'business' collection
      const businessRef = doc(db, "business", businessId);
      await updateDoc(businessRef, businessData);

      // Show success message
      showNotification("success", "Business updated successfully");

      // Optional: Navigate back or to details page after successful update
      // setTimeout(() => navigate('/businesses'), 1500);
    } catch (error) {
      console.error("Error updating business:", error);
      showNotification("error", "Failed to update business. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel button
  const handleCancel = () => {
    navigate(-1); // Go back to previous page
  };

  // Show loading state
  if (fetchLoading) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (fetchError) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="bg-red-100 text-red-800 p-4 rounded-md mb-4">
          {fetchError}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md">
      {notification.show && (
        <div
          className={`mb-4 p-3 rounded-md ${
            notification.type === "success"
              ? "bg-green-100 text-green-800 border border-green-200"
              : "bg-red-100 text-red-800 border border-red-200"
          }`}
        >
          {notification.message}
        </div>
      )}

      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        Edit Business
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Business Name - Required */}
        <div>
          <label
            htmlFor="businessName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Business Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="businessName"
            name="businessName"
            value={formData.businessName}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Enter business name"
            required
          />
        </div>

        {/* Business Address - Required */}
        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Enter business address"
            required
          />
        </div>

        {/* Business Registration - Optional */}
        <div>
          <label
            htmlFor="businessRegistration"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Business Registration{" "}
            <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            id="businessRegistration"
            name="businessRegistration"
            value={formData.businessRegistration}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Enter registration number"
          />
        </div>

        {/* Email - Optional */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Enter business email"
          />
        </div>

        {/* Phone Number - Optional */}
        <div>
          <label
            htmlFor="phoneNumber"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Phone Number <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Enter business phone number"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Updating..." : "Update Business"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditBusinessData;
