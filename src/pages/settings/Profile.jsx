// src/pages/settings/Profile.jsx
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../../contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile, updatePassword } from "firebase/auth";
import { db } from "../../services/firebase";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Edit3,
  Save,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Camera,
  Shield,
} from "lucide-react";

const Profile = () => {
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordMode, setIsPasswordMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
    watch: watchPassword,
  } = useForm();

  const newPassword = watchPassword("newPassword", "");

  // Load user profile data
  useEffect(() => {
    const loadProfileData = async () => {
      if (currentUser) {
        try {
          const docRef = doc(db, "owners", currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfileData(data.profile);
            reset(data.profile);
          }
        } catch (error) {
          console.error("Error loading profile:", error);
          setMessage({ type: "error", text: "Failed to load profile data" });
        }
      }
    };

    loadProfileData();
  }, [currentUser, reset]);

  const onSubmitProfile = async (data) => {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      // Update Firestore document
      const docRef = doc(db, "owners", currentUser.uid);
      const updatedProfile = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(docRef, {
        profile: updatedProfile,
      });

      // Update Firebase Auth display name
      await updateProfile(currentUser, {
        displayName: data.name,
      });

      setProfileData(updatedProfile);
      setIsEditing(false);
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({
        type: "error",
        text: "Failed to update profile. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmitPassword = async (data) => {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      await updatePassword(currentUser, data.newPassword);

      resetPassword();
      setIsPasswordMode(false);
      setMessage({ type: "success", text: "Password updated successfully!" });
    } catch (error) {
      console.error("Error updating password:", error);
      let errorMessage = "Failed to update password. Please try again.";

      if (error.code === "auth/requires-recent-login") {
        errorMessage =
          "Please sign out and sign in again before changing your password.";
      }

      setMessage({ type: "error", text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    reset(profileData);
    setIsEditing(false);
    setIsPasswordMode(false);
    resetPassword();
    setMessage({ type: "", text: "" });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not available";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!profileData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Message Alert */}
      {message.text && (
        <div
          className={`mb-4 p-3 rounded-lg border ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          <div className="flex items-center">
            {message.type === "success" ? (
              <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
        <div className="flex items-center space-x-4">
          {/* Profile Picture */}
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {profileData.name
                ? profileData.name.charAt(0).toUpperCase()
                : "U"}
            </div>
            <button className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-md border border-gray-200 hover:bg-gray-50 transition-colors">
              <Camera className="w-3 h-3 text-gray-600" />
            </button>
          </div>

          {/* User Info */}
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-800">
              {profileData.name}
            </h2>
            <p className="text-gray-600 text-sm">{profileData.email}</p>
            <div className="flex items-center text-xs text-gray-500 mt-1">
              <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
              <span>Verified • Joined {formatDate(profileData.createdAt)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            {!isEditing && !isPasswordMode && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Edit3 className="w-4 h-4 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => setIsPasswordMode(true)}
                  className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  <Shield className="w-4 h-4 mr-1" />
                  Password
                </button>
              </>
            )}
            {(isEditing || isPasswordMode) && (
              <button
                onClick={handleCancel}
                className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Password Change Form */}
      {isPasswordMode && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Lock className="w-5 h-5 mr-2 text-gray-600" />
            Change Password
          </h3>

          <form
            onSubmit={handlePasswordSubmit(onSubmitPassword)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    {...registerPassword("newPassword", {
                      required: "New password is required",
                      minLength: {
                        value: 6,
                        message: "Password must be at least 6 characters",
                      },
                    })}
                    className={`block w-full px-3 py-2 border ${
                      passwordErrors.newPassword
                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                    } rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 text-sm pr-10`}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {passwordErrors.newPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    {...registerPassword("confirmPassword", {
                      required: "Please confirm your password",
                      validate: (value) =>
                        value === newPassword || "Passwords do not match",
                    })}
                    className={`block w-full px-3 py-2 border ${
                      passwordErrors.confirmPassword
                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                    } rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 text-sm pr-10`}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {passwordErrors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Password
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Profile Form */}
      {!isPasswordMode && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-gray-600" />
            Personal Information
          </h3>

          <form onSubmit={handleSubmit(onSubmitProfile)} className="space-y-4">
            {/* Row 1: Name and Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    disabled={!isEditing}
                    {...register("name", {
                      required: "Full name is required",
                      minLength: {
                        value: 2,
                        message: "Name must be at least 2 characters",
                      },
                    })}
                    className={`block w-full pl-10 pr-3 py-2 border ${
                      !isEditing
                        ? "bg-gray-50 border-gray-200 text-gray-600"
                        : errors.name
                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                    } rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 text-sm`}
                  />
                </div>
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    disabled
                    {...register("email")}
                    className="block w-full pl-10 pr-3 py-2 border bg-gray-50 border-gray-200 text-gray-600 rounded-lg focus:outline-none text-sm"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed
                </p>
              </div>
            </div>

            {/* Row 2: Phone and Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    disabled={!isEditing}
                    {...register("phone", {
                      required: "Phone number is required",
                      pattern: {
                        value: /^[\+]?[1-9][\d]{0,15}$/,
                        message: "Please enter a valid phone number",
                      },
                    })}
                    className={`block w-full pl-10 pr-3 py-2 border ${
                      !isEditing
                        ? "bg-gray-50 border-gray-200 text-gray-600"
                        : errors.phone
                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                    } rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 text-sm`}
                  />
                </div>
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <div className="relative">
                  <div className="absolute top-2 left-0 pl-3 pointer-events-none">
                    <MapPin className="h-4 w-4 text-gray-400" />
                  </div>
                  <textarea
                    rows={1}
                    disabled={!isEditing}
                    {...register("address", {
                      required: "Address is required",
                      minLength: {
                        value: 10,
                        message: "Please enter a complete address",
                      },
                    })}
                    className={`block w-full pl-10 pr-3 py-2 border ${
                      !isEditing
                        ? "bg-gray-50 border-gray-200 text-gray-600"
                        : errors.address
                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                    } rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 resize-none text-sm`}
                  />
                </div>
                {errors.address && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.address.message}
                  </p>
                )}
              </div>
            </div>

            {/* Save Button */}
            {isEditing && (
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

export default Profile;
