// src/pages/auth/signup.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../contexts/AuthContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase"; // Adjust import path as needed
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  CheckCircle,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

const Signup = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuth();

  // Watch password for confirmation validation
  const password = watch("password", "");

  async function onSubmit(data) {
    try {
      setError("");
      setLoading(true);

      // Create user with Firebase Auth
      const result = await signup(data.email, data.password, data.name);

      // Handle different return types from signup function
      const user = result?.user || result;

      if (!user || !user.uid) {
        throw new Error("User creation failed - no user ID returned");
      }

      console.log("User created successfully:", user.uid);

      // Save user profile data to Firestore
      const profileData = {
        profile: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      console.log("Saving profile data:", profileData);

      await setDoc(doc(db, "owners", user.uid), profileData);

      console.log("Profile data saved successfully");

      // Navigate to home page
      navigate("/home");
    } catch (err) {
      console.error("Signup error:", err);
      setError(err.message || "Failed to create an account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Main Content */}
      <div className="min-h-screen flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-2xl">
          {/* Card Container */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            {/* Logo and Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg mb-4 shadow-md">
                <img
                  src="/src/assets/logo.png"
                  alt="Logo"
                  className="w-8 h-8"
                />
              </div>

              <h1 className="text-2xl font-bold mb-1">
                <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  Lumora
                </span>
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-extrabold">
                  Biz
                </span>
              </h1>

              <p className="text-gray-500 text-xs mb-4">
                Smart Tools for Smarter Business
              </p>

              <h2 className="text-xl font-semibold text-gray-800">
                Create your account
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Join thousands of businesses already growing with us
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
                  <span className="text-red-700 text-sm font-medium">
                    {error}
                  </span>
                </div>
              </div>
            )}

            {/* Signup Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Row 1: Name and Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name Field */}
                <div className="space-y-1">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      {...register("name", {
                        required: "Full name is required",
                        minLength: {
                          value: 2,
                          message: "Name must be at least 2 characters",
                        },
                      })}
                      className={`block w-full pl-10 pr-3 py-2.5 border ${
                        errors.name
                          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                          : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                      } rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 text-sm`}
                      placeholder="Enter full name"
                    />
                  </div>
                  {errors.name && (
                    <p className="text-red-500 text-xs flex items-center mt-1">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Email Field */}
                <div className="space-y-1">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      {...register("email", {
                        required: "Email is required",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Please enter a valid email address",
                        },
                      })}
                      className={`block w-full pl-10 pr-3 py-2.5 border ${
                        errors.email
                          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                          : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                      } rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 text-sm`}
                      placeholder="Enter email address"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-xs flex items-center mt-1">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: Phone and Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Phone Field */}
                <div className="space-y-1">
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      {...register("phone", {
                        required: "Phone number is required",
                        pattern: {
                          value: /^[\+]?[1-9][\d]{0,15}$/,
                          message: "Please enter a valid phone number",
                        },
                      })}
                      className={`block w-full pl-10 pr-3 py-2.5 border ${
                        errors.phone
                          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                          : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                      } rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 text-sm`}
                      placeholder="Enter phone number"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-red-500 text-xs flex items-center mt-1">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                {/* Address Field */}
                <div className="space-y-1">
                  <label
                    htmlFor="address"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Address
                  </label>
                  <div className="relative">
                    <div className="absolute top-2.5 left-0 pl-3 pointer-events-none">
                      <MapPin className="h-4 w-4 text-gray-400" />
                    </div>
                    <textarea
                      id="address"
                      rows={1}
                      autoComplete="street-address"
                      {...register("address", {
                        required: "Address is required",
                        minLength: {
                          value: 10,
                          message: "Please enter a complete address",
                        },
                      })}
                      className={`block w-full pl-10 pr-3 py-2.5 border ${
                        errors.address
                          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                          : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                      } rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 resize-none text-sm`}
                      placeholder="Enter complete address"
                    />
                  </div>
                  {errors.address && (
                    <p className="text-red-500 text-xs flex items-center mt-1">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {errors.address.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 3: Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Password Field */}
                <div className="space-y-1">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      {...register("password", {
                        required: "Password is required",
                        minLength: {
                          value: 6,
                          message: "Password must be at least 6 characters",
                        },
                      })}
                      className={`block w-full pl-10 pr-10 py-2.5 border ${
                        errors.password
                          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                          : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                      } rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 text-sm`}
                      placeholder="Create password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs flex items-center mt-1">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-1">
                  <label
                    htmlFor="passwordConfirm"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CheckCircle className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="passwordConfirm"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      {...register("passwordConfirm", {
                        required: "Please confirm your password",
                        validate: (value) =>
                          value === password || "Passwords do not match",
                      })}
                      className={`block w-full pl-10 pr-10 py-2.5 border ${
                        errors.passwordConfirm
                          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                          : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                      } rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 text-sm`}
                      placeholder="Confirm password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.passwordConfirm && (
                    <p className="text-red-500 text-xs flex items-center mt-1">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {errors.passwordConfirm.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-3 px-4 mt-6 border border-transparent rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                    Creating account...
                  </>
                ) : (
                  <>
                    Create My Account
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} Lumora Ventures Pvt Ltd. All rights
              reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
