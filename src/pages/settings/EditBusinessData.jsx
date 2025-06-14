import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../../contexts/AuthContext";
import { doc, getDoc, updateDoc, collection } from "firebase/firestore";
import { db } from "../../services/firebase";
import {
  Building2,
  MapPin,
  FileText,
  Mail,
  Phone,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  Edit3,
} from "lucide-react";

export const EditBusinessData = ({ businessId, onCancel, onSuccess }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm();

  // Fetch business data on component mount
  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!businessId || !currentUser) {
        setMessage({
          type: "error",
          text: "Business ID or user authentication is missing",
        });
        setFetchLoading(false);
        return;
      }

      try {
        // Reference to the specific business in the subcollection
        const ownerDocRef = doc(db, "owners", currentUser.uid);
        console.log(ownerDocRef);
        const businessDocRef = doc(
          collection(ownerDocRef, "businesses"),
          businessId
        );
        const businessSnapshot = await getDoc(businessDocRef);

        if (!businessSnapshot.exists()) {
          setMessage({ type: "error", text: "Business not found" });
          setFetchLoading(false);
          return;
        }

        const businessData = businessSnapshot.data();
        console.log("Fetched business data:", businessData);

        // Set form values
        setValue("businessName", businessData.businessName || "");
        setValue("address", businessData.address || "");
        setValue(
          "businessRegistration",
          businessData.businessRegistration || ""
        );
        setValue("email", businessData.email || "");
        setValue("phoneNumber", businessData.phoneNumber || "");
      } catch (error) {
        console.error("Error fetching business data:", error);
        setMessage({
          type: "error",
          text: "Error fetching business data. Please try again.",
        });
      } finally {
        setFetchLoading(false);
      }
    };

    fetchBusinessData();
  }, [businessId, currentUser, setValue]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      if (!currentUser) {
        setMessage({
          type: "error",
          text: "You must be logged in to update a business",
        });
        return;
      }

      // Prepare business data
      const businessData = {
        businessName: data.businessName,
        address: data.address,
        businessRegistration: data.businessRegistration || null,
        email: data.email || null,
        phoneNumber: data.phoneNumber || null,
        updatedAt: new Date().toISOString(),
      };

      // Update document in subcollection
      const ownerDocRef = doc(db, "owners", currentUser.uid);
      const businessDocRef = doc(
        collection(ownerDocRef, "businesses"),
        businessId
      );
      await updateDoc(businessDocRef, businessData);

      setMessage({ type: "success", text: "Business updated successfully!" });

      // Call success callback if provided
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (error) {
      console.error("Error updating business:", error);
      setMessage({
        type: "error",
        text: "Failed to update business. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (typeof onCancel === "function") {
      onCancel();
    }
  };

  // Show loading state
  if (fetchLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 text-sm">Loading business data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (message.type === "error" && fetchLoading === false && !currentUser) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
            <span className="text-red-700 font-medium">{message.text}</span>
          </div>
          <button
            onClick={handleCancel}
            className="flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 transition-colors font-medium"
          >
            <X className="w-4 h-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Message Alert */}
      {message.text && (
        <div
          className={`mb-6 p-4 rounded-xl border ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          <div className="flex items-center">
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Edit3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Edit Business
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Update your business information
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Business Name - Required */}
          <div className="space-y-2">
            <label
              htmlFor="businessName"
              className="block text-sm font-semibold text-gray-700"
            >
              Business Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Building2 className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="businessName"
                {...register("businessName", {
                  required: "Business name is required",
                  minLength: {
                    value: 2,
                    message: "Business name must be at least 2 characters",
                  },
                })}
                className={`block w-full pl-12 pr-4 py-3 border-2 ${
                  errors.businessName
                    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                    : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                } rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                placeholder="Enter your business name"
              />
            </div>
            {errors.businessName && (
              <p className="text-red-500 text-sm flex items-center mt-2">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.businessName.message}
              </p>
            )}
          </div>

          {/* Business Address - Required */}
          <div className="space-y-2">
            <label
              htmlFor="address"
              className="block text-sm font-semibold text-gray-700"
            >
              Business Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute top-3 left-0 pl-4 pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <textarea
                id="address"
                rows={3}
                {...register("address", {
                  required: "Business address is required",
                  minLength: {
                    value: 10,
                    message: "Please enter a complete address",
                  },
                })}
                className={`block w-full pl-12 pr-4 py-3 border-2 ${
                  errors.address
                    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                    : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                } rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all duration-200 resize-none`}
                placeholder="Enter complete business address"
              />
            </div>
            {errors.address && (
              <p className="text-red-500 text-sm flex items-center mt-2">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.address.message}
              </p>
            )}
          </div>

          {/* Row: Registration and Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Business Registration - Optional */}
            <div className="space-y-2">
              <label
                htmlFor="businessRegistration"
                className="block text-sm font-semibold text-gray-700"
              >
                Registration Number{" "}
                <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="businessRegistration"
                  {...register("businessRegistration")}
                  className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-100 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all duration-200"
                  placeholder="e.g., ABC123456"
                />
              </div>
            </div>

            {/* Email - Optional */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700"
              >
                Business Email{" "}
                <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  {...register("email", {
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Please enter a valid email address",
                    },
                  })}
                  className={`block w-full pl-12 pr-4 py-3 border-2 ${
                    errors.email
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                  } rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                  placeholder="business@example.com"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm flex items-center mt-2">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          {/* Phone Number - Optional */}
          <div className="space-y-2">
            <label
              htmlFor="phoneNumber"
              className="block text-sm font-semibold text-gray-700"
            >
              Business Phone{" "}
              <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                id="phoneNumber"
                {...register("phoneNumber", {
                  pattern: {
                    value: /^[\+]?[1-9][\d]{0,15}$/,
                    message: "Please enter a valid phone number",
                  },
                })}
                className={`block w-full pl-12 pr-4 py-3 border-2 ${
                  errors.phoneNumber
                    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                    : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                } rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                placeholder="Enter business phone number"
              />
            </div>
            {errors.phoneNumber && (
              <p className="text-red-500 text-sm flex items-center mt-2">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.phoneNumber.message}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 flex items-center justify-center py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl transition-colors font-medium"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Business
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBusinessData;
