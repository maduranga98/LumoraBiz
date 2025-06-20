// src/components/DebugAuth.jsx
import React from "react";
import { useAuth } from "../contexts/AuthContext";

const DebugAuth = () => {
  const { currentUser, userRole, userProfile, clearAuthState } = useAuth();

  if (process.env.NODE_ENV !== "development") {
    return null; // Only show in development
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <h3 className="font-bold text-sm mb-2 text-gray-800">🔧 Auth Debug</h3>

      <div className="text-xs space-y-1 mb-3">
        <div>
          <strong>User:</strong>{" "}
          {currentUser
            ? `${currentUser.email || currentUser.username || "Unknown"}`
            : "None"}
        </div>
        <div>
          <strong>Role:</strong> {userRole || "None"}
        </div>
        <div>
          <strong>UID:</strong> {currentUser?.uid || "None"}
        </div>
        <div>
          <strong>Firebase:</strong> {currentUser?.email ? "Yes" : "No"}
        </div>
      </div>

      <button
        onClick={clearAuthState}
        className="w-full bg-red-500 text-white text-xs py-1 px-2 rounded hover:bg-red-600 transition-colors"
      >
        Clear Auth State
      </button>

      <p className="text-xs text-gray-500 mt-2">
        Use this to clear any stuck authentication state during development.
      </p>
    </div>
  );
};

export default DebugAuth;
