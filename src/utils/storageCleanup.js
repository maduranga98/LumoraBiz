// src/utils/storageCleanup.js - Smart Storage Management

// For components that need business ID (replace localStorage calls)
export const getCurrentBusinessFromContext = (businessContext) => {
  return businessContext?.currentBusiness?.id || null;
};

// For components that need current user (replace localStorage calls)
export const getCurrentUserFromContext = (authContext) => {
  return authContext?.currentUser || null;
};

// Clean localStorage only (preserve sessionStorage for refresh persistence)
export const cleanupLegacyStorage = () => {
  try {
    // Remove any existing auth/business data from localStorage only
    const keysToRemove = ["authSession", "rememberedUser", "currentBusinessId"];

    // Remove user-specific business keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("currentBusinessId_")) {
        keysToRemove.push(key);
      }
    });

    // Remove all legacy localStorage keys
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });

    console.log(
      "✅ Legacy localStorage cleaned up - app uses sessionStorage for refresh persistence"
    );
  } catch (error) {
    console.warn("Storage cleanup failed (might be disabled):", error);
  }
};

// Clear sessionStorage on fresh app start (called when app_session_active is not set)
export const clearSessionOnAppStart = () => {
  try {
    // Clear auth and business session data
    sessionStorage.removeItem("auth_session");
    sessionStorage.removeItem("business_session");

    console.log("🚀 Fresh app start - session data cleared");
  } catch (error) {
    console.warn("Session cleanup failed:", error);
  }
};

// For debugging - check storage usage
export const checkStorageUsage = () => {
  if (process.env.NODE_ENV === "development") {
    const localAuthKeys = Object.keys(localStorage).filter(
      (key) =>
        key.includes("auth") || key.includes("business") || key.includes("user")
    );

    const sessionAuthKeys = Object.keys(sessionStorage).filter(
      (key) =>
        key.includes("auth") ||
        key.includes("business") ||
        key.includes("app_session")
    );

    if (localAuthKeys.length > 0) {
      console.warn("⚠️ localStorage still being used:", localAuthKeys);
    }

    if (sessionAuthKeys.length > 0) {
      console.log(
        "ℹ️ sessionStorage in use (refresh persistence):",
        sessionAuthKeys
      );
    }

    if (localAuthKeys.length === 0) {
      console.log("✅ No localStorage authentication storage detected");
    }
  }
};
