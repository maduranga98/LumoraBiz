import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getDashboardPath, getLoginRedirect } from "../../utils/authNavigation";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building,
  Shield,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";

const Login = () => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { adminLogin, userLogin, isAdminEmail, currentUser, userRole } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the intended path from location state (if user was redirected to login)
  const from = location.state?.from?.pathname || "";

  // Redirect if already authenticated
  useEffect(() => {
    if (currentUser && userRole) {
      const redirectPath = getDashboardPath(userRole);
      navigate(redirectPath, { replace: true });
    }
  }, [currentUser, userRole, navigate]);

  // Auto-detect admin when @lumorabiz.com email is entered
  useEffect(() => {
    if (formData.email && isAdminEmail(formData.email)) {
      setIsAdminMode(true);
    } else if (formData.email && !isAdminEmail(formData.email)) {
      setIsAdminMode(false);
    }
  }, [formData.email, isAdminEmail]);

  // Check if accessing admin route directly
  useEffect(() => {
    if (
      location.pathname === "/admin" ||
      location.search.includes("admin=true") ||
      from.includes("/admin")
    ) {
      setIsAdminMode(true);
    }
  }, [location, from]);

  // Load remembered username
  useEffect(() => {
    // No more remembered usernames - always start fresh
    console.log("Login component loaded - no persistent data");
  }, [isAdminMode]);

  const validateForm = () => {
    if (isAdminMode) {
      if (!formData.email?.trim()) {
        setError("Email is required for admin login");
        return false;
      }
      if (!formData.password?.trim()) {
        setError("Password is required");
        return false;
      }
      if (!isAdminEmail(formData.email)) {
        setError("Only @lumorabiz.com emails are authorized for admin access");
        return false;
      }
    } else {
      if (!formData.username?.trim()) {
        setError("Username is required");
        return false;
      }
      if (!formData.password?.trim()) {
        setError("Password is required");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isAdminMode) {
        console.log("Attempting admin login...");
        await adminLogin(formData.email.trim(), formData.password);

        // Navigate to admin dashboard or intended path
        const redirectPath = getLoginRedirect("admin", from);
        console.log("Admin login successful, redirecting to:", redirectPath);
        navigate(redirectPath, { replace: true });
      } else {
        console.log("Attempting user login with username:", formData.username);
        const result = await userLogin(
          formData.username.trim(),
          formData.password
        );
        const role = result.user.role;

        console.log("User login successful, user role:", role);

        // Navigate to appropriate dashboard or intended path
        const redirectPath = getLoginRedirect(role, from);
        console.log("Redirecting to:", redirectPath);
        navigate(redirectPath, { replace: true });
      }
    } catch (error) {
      console.error("Login error:", error);

      // Handle specific Firebase auth errors
      let errorMessage = error.message;

      if (error.code === "auth/user-not-found") {
        errorMessage = isAdminMode
          ? "Admin account not found"
          : "Invalid username or password";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Invalid password";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email format";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later.";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  const handleModeToggle = () => {
    setIsAdminMode(!isAdminMode);
    setFormData({ email: "", username: "", password: "" });
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div
          className={`${
            isAdminMode
              ? "bg-gradient-to-r from-red-600 to-red-700"
              : "bg-gradient-to-r from-blue-600 to-indigo-600"
          } px-8 py-6 text-white transition-all duration-300`}
        >
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
              {isAdminMode ? (
                <Shield className="w-8 h-8 text-white" />
              ) : (
                <Building className="w-8 h-8 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold mb-2">Rice Mill System</h1>
            <p className={`${isAdminMode ? "text-red-100" : "text-blue-100"}`}>
              {isAdminMode ? "Admin Access Portal" : "Welcome back!"}
            </p>
          </div>
        </div>

        {/* Login Form */}
        <div className="px-8 py-8">
          {/* Mode Toggle */}
          <div className="flex items-center justify-center mb-6">
            <button
              type="button"
              onClick={handleModeToggle}
              className={`text-sm font-medium transition-colors ${
                isAdminMode
                  ? "text-red-600 hover:text-red-700"
                  : "text-blue-600 hover:text-blue-700"
              }`}
            >
              {isAdminMode ? "Switch to User Login" : ""}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email field (for admins and email detection) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                {isAdminMode ? "Admin Email" : "Email (Optional)"}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-12 pr-12 py-4 border ${
                    error && isAdminMode ? "border-red-300" : "border-gray-300"
                  } rounded-xl focus:ring-2 ${
                    isAdminMode ? "focus:ring-red-500" : "focus:ring-blue-500"
                  } focus:border-transparent transition-all`}
                  placeholder={
                    isAdminMode
                      ? "Enter your admin email"
                      : "Enter email (optional)"
                  }
                  required={isAdminMode}
                />
                {isAdminMode &&
                  formData.email &&
                  isAdminEmail(formData.email) && (
                    <CheckCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 text-red-500 w-5 h-5" />
                  )}
              </div>
              {!isAdminMode && (
                <p className="mt-2 text-xs text-gray-500">
                  💡 Enter your email
                </p>
              )}
              {isAdminMode && (
                <p className="mt-2 text-xs text-red-600">
                  🔒 Admin access detected for @lumorabiz.com domain
                </p>
              )}
            </div>

            {/* Username field (only for non-admin users) */}
            {!isAdminMode && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className={`w-full pl-12 pr-4 py-4 border ${
                      error && !isAdminMode
                        ? "border-red-300"
                        : "border-gray-300"
                    } rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                    placeholder="Enter your username"
                    required={!isAdminMode}
                  />
                </div>
              </div>
            )}

            {/* Password field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-12 pr-12 py-4 border ${
                    error ? "border-red-300" : "border-gray-300"
                  } rounded-xl focus:ring-2 ${
                    isAdminMode ? "focus:ring-red-500" : "focus:ring-blue-500"
                  } focus:border-transparent transition-all`}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 px-4 rounded-xl font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isAdminMode
                  ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:ring-red-500"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500"
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="animate-spin h-5 w-5 mr-3" />
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  {isAdminMode ? "Sign in as Admin" : "Sign in"}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </div>
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-8 text-center">
            {isAdminMode ? (
              <p className="text-sm text-gray-600">
                Having trouble?{" "}
                <a
                  href="mailto:support@lumorabiz.com"
                  className="text-red-600 hover:text-red-700 font-medium"
                >
                  Contact IT Support
                </a>
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Powered by Lumora Ventures (PVT) Ltd.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
