// src/pages/auth/login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../contexts/AuthContext";

const Login = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function onSubmit(data) {
    try {
      setError("");
      setLoading(true);
      await login(data.email, data.password);
      navigate("/home");
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-md">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-primary tracking-tight">
            <span className="text-primary">Lumora</span>
            <span className="text-accent font-extrabold">Biz</span>
          </h2>
          <p className="mt-2 text-muted text-sm">
            Smart Tools for Smarter Business.
          </p>
          <h3 className="mt-6 text-xl font-semibold text-text">
            Sign in to your account
          </h3>
        </div>

        {error && (
          <div
            className="bg-error bg-opacity-10 border border-error border-opacity-20 text-error px-4 py-3 rounded relative"
            role="alert"
          >
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md">
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text mb-1"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  errors.email ? "border-error" : "border-muted"
                } placeholder-muted text-text rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm`}
                placeholder="Email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-error">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password", { required: "Password is required" })}
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  errors.password ? "border-error" : "border-muted"
                } placeholder-muted text-text rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm`}
                placeholder="Password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-error">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary focus:ring-primary border-muted rounded"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-muted"
              >
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-primary hover:opacity-80"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-medium text-primary hover:opacity-80"
              >
                Sign up
              </Link>
            </p>
          </div>
        </form>

        {/* Footer with company info */}
        <div className="mt-8 pt-4 border-t border-muted">
          <p className="text-center text-xs text-muted">
            © {new Date().getFullYear()} Lumora Ventures Pvt Ltd. All rights
            reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
