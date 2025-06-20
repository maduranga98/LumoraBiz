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
  const [rememberMe, setRememberMe] = useState(false);

  const { adminLogin, userLogin, isAdminEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the intended path from location state (if user was redirected to login)
  const from = location.state?.from?.pathname || "";

  // Auto-detect admin when @lumorabiz.com email is entered
  useEffect(() => {
    if (formData.email && isAdminEmail(formData.email)) {
      setIsAdminMode(true);
    } else {
      setIsAdminMode(false);
    }
  }, [formData.email, isAdminEmail]);

  // Check if accessing admin route directly
  useEffect(() => {
    if (
      location.pathname === "/admin" ||
      location.search.includes("admin=true")
    ) {
      setIsAdminMode(true);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isAdminMode) {
        if (!formData.email || !formData.password) {
          throw new Error("Email and password are required");
        }

        console.log("Attempting admin login...");
        await adminLogin(formData.email, formData.password);

        // Navigate to admin dashboard or intended path
        const redirectPath = getLoginRedirect("admin", from);
        console.log("Admin login successful, redirecting to:", redirectPath);
        navigate(redirectPath, { replace: true });
      } else {
        if (!formData.username || !formData.password) {
          throw new Error("Username and password are required");
        }

        console.log("Attempting user login with username:", formData.username);
        const result = await userLogin(formData.username, formData.password);
        const role = result.user.role;

        console.log("User login successful, user role:", role);

        // Remember user if checkbox is checked
        if (rememberMe) {
          localStorage.setItem("rememberedUser", formData.username);
        } else {
          localStorage.removeItem("rememberedUser");
        }

        // Navigate to appropriate dashboard or intended path
        const redirectPath = getLoginRedirect(role, from);
        console.log("Redirecting to:", redirectPath);
        navigate(redirectPath, { replace: true });
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  // Load remembered username
  useEffect(() => {
    const remembered = localStorage.getItem("rememberedUser");
    if (remembered && !isAdminMode) {
      setFormData((prev) => ({ ...prev, username: remembered }));
      setRememberMe(true);
    }
  }, [isAdminMode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
              <Building className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Rice Mill System</h1>
            <p className="text-blue-100">
              {isAdminMode ? "Administrator Access" : "Welcome Back"}
            </p>
          </div>
        </div>

        <div className="p-8">
          {/* Admin Mode Indicator (only shows when admin email is detected) */}
          {isAdminMode && (
            <div className="mb-6">
              <div className="flex items-center justify-center p-3 rounded-lg bg-red-50 border border-red-200">
                <Shield className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-800 font-medium">
                  Administrator Login Detected
                </span>
              </div>
            </div>
          )}

          {/* User Mode Indicator (default) */}
          {!isAdminMode && (
            <div className="mb-6">
              <div className="flex items-center justify-center p-3 rounded-lg bg-blue-50 border border-blue-200">
                <User className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-blue-800 font-medium">
                  Owner / Manager Login
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Email field (always visible for auto-detection) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                {isAdminMode ? "Admin Email Address" : "Email (Optional)"}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder={
                    isAdminMode
                      ? "Enter your admin email"
                      : "Enter email to auto-detect admin"
                  }
                  required={isAdminMode}
                />
                {isAdminMode && (
                  <CheckCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 text-red-500 w-5 h-5" />
                )}
              </div>
              {!isAdminMode && (
                <p className="mt-2 text-xs text-gray-500">
                  💡 Enter your email to automatically detect admin access, or
                  use username below
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
                    className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your username"
                    required={!isAdminMode}
                  />
                  {rememberMe && formData.username && (
                    <CheckCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 text-green-500 w-5 h-5" />
                  )}
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
                  className="w-full pl-12 pr-12 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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

            {/* Remember Me (only for users) */}
            {!isAdminMode && (
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Remember username
                  </span>
                </label>
              </div>
            )}

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
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
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
                Having trouble? Contact system support
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Don't have login credentials? Contact your business owner for
                  access.
                </p>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">
                    <strong>For Business Owners:</strong> Register your business
                    through the signup process.
                    <br />
                    <strong>For Managers:</strong> Your owner will provide login
                    credentials when adding you as an employee.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Admin Detection Info */}
          {!isAdminMode && (
            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-600 text-center">
                <strong>System Administrators:</strong> Use your @lumorabiz.com
                email for automatic admin access
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
