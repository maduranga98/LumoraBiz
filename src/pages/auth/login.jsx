// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../../components/Input";
import Button from "../../components/Button";
import Logo from "../../components/Logo";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      console.log("Form submitted:", { email, password });
      setIsLoading(false);
      // Navigate to the home page after successful login
      navigate("/home");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg">
        {/* Logo and Branding */}
        <Logo className="mb-8" />

        {/* Welcome Text */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted">Welcome back</h2>
          <p className="mt-1 text-sm text-muted">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
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
              <a href="#" className="font-medium text-primary hover:opacity-80">
                Forgot password?
              </a>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full py-3"
            onClick={() => {}}
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>

          <div className="text-center mt-4">
            <p className="text-sm text-muted">
              Don't have an account?{" "}
              <a href="#" className="font-medium text-primary hover:opacity-80">
                Sign up for free
              </a>
            </p>
          </div>
        </form>
      </div>

      {/* Footer with company info */}
      <div className="mt-8 text-center text-sm text-muted">
        <p>
          © {new Date().getFullYear()} Lumora Ventures Pvt Ltd. All rights
          reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
