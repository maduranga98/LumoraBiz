// src/pages/settings/AddNewBusiness.jsx
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../../contexts/AuthContext";
import { doc, collection, addDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import {
  Building2,
  MapPin,
  FileText,
  Mail,
  Phone,
  Save,
  AlertCircle,
  CheckCircle,
  Info,
} from "lucide-react";

export const AddNewBusiness = ({ onSuccess }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      if (!currentUser) {
        setMessage({
          type: "error",
          text: "You must be logged in to add a business",
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "active",
      };

      // Add document to subcollection: owners/{ownerId}/businesses/{businessId}
      const ownerDocRef = doc(db, "owners", currentUser.uid);
      const businessesCollectionRef = collection(ownerDocRef, "businesses");

      await addDoc(businessesCollectionRef, businessData);

      setMessage({ type: "success", text: "Business added successfully!" });

      // Reset form
      reset();

      // Call success callback if provided
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (error) {
      console.error("Error adding business:", error);
      setMessage({
        type: "error",
        text: "Failed to add business. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

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
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Add New Business
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Create a new business profile to get started
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-3 px-6 mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Adding Business...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Add Business
              </>
            )}
          </button>
        </form>
      </div>

      {/* Help Section */}
      <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              Need Help?
            </h3>
            <p className="text-sm text-blue-800">
              Contact our support team if you need assistance setting up your
              business profile. We're here to help you get started quickly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddNewBusiness;
