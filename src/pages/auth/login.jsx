// src/pages/auth/login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../contexts/AuthContext";
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";

const Login = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function onSubmit(data) {
    try {
      setError("");
      setLoading(true);

      console.log("Attempting login with email:", data.email);
      await login(data.email, data.password);
      console.log("Login successful, navigating to home");
      navigate("/home");
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.message || "Failed to sign in. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Main Content */}
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
            {/* Logo and Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mb-6 shadow-lg">
                <img
                  src="/src/assets/logo.png"
                  alt="Logo"
                  className="w-10 h-10"
                />
              </div>

              <h1 className="text-3xl font-bold mb-2">
                <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  Lumora
                </span>
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-extrabold">
                  Biz
                </span>
              </h1>

              <p className="text-gray-500 text-sm mb-6">
                Smart Tools for Smarter Business
              </p>

              <h2 className="text-2xl font-semibold text-gray-800">
                Welcome back
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Sign in to continue to your dashboard
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                  <span className="text-red-700 text-sm font-medium">
                    {error}
                  </span>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
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
                    className={`block w-full pl-12 pr-4 py-3 border-2 ${
                      errors.email
                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                        : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                    } rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                    placeholder="Enter your email address"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm flex items-center mt-2">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 6,
                        message: "Password must be at least 6 characters",
                      },
                    })}
                    className={`block w-full pl-12 pr-12 py-3 border-2 ${
                      errors.password
                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                        : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                    } rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm flex items-center mt-2">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Forgot Password Link */}
              <div className="flex items-center justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-4 px-6 mt-8 border border-transparent rounded-xl text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg hover:shadow-xl"
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
                    Signing you in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Create account
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
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

export default Login;
