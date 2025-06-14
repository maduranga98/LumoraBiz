// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { auth } from "../services/firebase"; // Adjust import path as needed

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password, displayName) {
    try {
      console.log("Creating user with email:", email);

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      console.log("User created successfully:", user.uid);

      // Update the user's display name
      if (displayName) {
        await updateProfile(user, {
          displayName: displayName,
        });
        console.log("Display name updated successfully");
      }

      return userCredential;
    } catch (error) {
      console.error("Signup error in AuthContext:", error);
      throw error;
    }
  }

  async function login(email, password) {
    try {
      console.log("Signing in user with email:", email);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("User signed in successfully:", userCredential.user.uid);
      return userCredential;
    } catch (error) {
      console.error("Login error in AuthContext:", error);
      throw error;
    }
  }

  async function logout() {
    try {
      console.log("Signing out user");
      await signOut(auth);
      console.log("User signed out successfully");
    } catch (error) {
      console.error("Logout error in AuthContext:", error);
      throw error;
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user ? user.uid : "No user");
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
