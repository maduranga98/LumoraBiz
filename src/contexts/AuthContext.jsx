// src/contexts/AuthContext.jsx - NO STORAGE VERSION
import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../services/firebase";

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
  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAppStart, setIsAppStart] = useState(true); // Track if this is app start vs refresh

  // Check if this is app start or page refresh
  useEffect(() => {
    // Use sessionStorage to detect if this is a fresh app start
    const isRefresh = sessionStorage.getItem("app_session_active");

    if (!isRefresh) {
      // This is a fresh app start
      setIsAppStart(true);
      sessionStorage.setItem("app_session_active", "true");
      console.log("🚀 Fresh app start - will show login page");
    } else {
      // This is a page refresh
      setIsAppStart(false);
      console.log("🔄 Page refresh - maintaining session if exists");
    }
  }, []);

  // Check if email is admin (Lumorabiz domain)
  const isAdminEmail = (email) => {
    return email.toLowerCase().endsWith("@lumorabiz.com");
  };

  // Generate unique username for managers
  const generateUsername = async (name, ownerId) => {
    const baseUsername = name.toLowerCase().replace(/\s+/g, "");
    let username = baseUsername;
    let counter = 1;

    while (true) {
      const managersQuery = query(
        collection(db, "managers"),
        where("username", "==", username),
        where("ownerId", "==", ownerId)
      );
      const snapshot = await getDocs(managersQuery);

      if (snapshot.empty) {
        return username;
      }

      username = `${baseUsername}${counter}`;
      counter++;
    }
  };

  // Admin login (Firebase Auth only)
  async function adminLogin(email, password) {
    try {
      if (!isAdminEmail(email)) {
        throw new Error(
          "Only @lumorabiz.com emails are authorized for admin access"
        );
      }

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Set admin role automatically for Lumorabiz emails
      setCurrentUser(userCredential.user);
      setUserRole("admin");
      setUserProfile({
        name: userCredential.user.displayName || "Administrator",
        email: email,
        role: "admin",
        domain: "lumorabiz.com",
      });

      return userCredential;
    } catch (error) {
      console.error("Admin login error:", error);
      throw error;
    }
  }

  // Owner/Manager login using username/password (SESSION STORAGE FOR REFRESH)
  async function userLogin(username, password) {
    try {
      if (!username || !password) {
        throw new Error("Username and password are required");
      }

      // First check owners collection
      const ownersQuery = query(
        collection(db, "owners"),
        where("username", "==", username),
        where("password", "==", password)
      );

      const ownersSnapshot = await getDocs(ownersQuery);

      if (!ownersSnapshot.empty) {
        const ownerDoc = ownersSnapshot.docs[0];
        const ownerData = ownerDoc.data();

        if (ownerData.status === "inactive") {
          throw new Error("Account is deactivated");
        }

        // Create custom user object for owners
        const customUser = {
          uid: ownerDoc.id,
          email: ownerData.email,
          displayName: ownerData.name,
          username: ownerData.username,
          role: "owner",
          firebaseUID: ownerData.firebaseUID,
          ...ownerData,
        };

        setCurrentUser(customUser);
        setUserRole("owner");
        setUserProfile(ownerData);

        // Store session data for refresh persistence (NOT localStorage)
        sessionStorage.setItem(
          "auth_session",
          JSON.stringify({
            uid: ownerDoc.id,
            role: "owner",
            data: ownerData,
            timestamp: Date.now(),
          })
        );

        console.log(
          "Owner logged in (session storage for refresh):",
          customUser.username
        );

        return { user: customUser };
      }

      // Then check managers collection
      const managersQuery = query(
        collection(db, "managers"),
        where("username", "==", username),
        where("password", "==", password)
      );

      const managersSnapshot = await getDocs(managersQuery);

      if (!managersSnapshot.empty) {
        const managerDoc = managersSnapshot.docs[0];
        const managerData = managerDoc.data();

        if (managerData.status === "inactive") {
          throw new Error("Account is deactivated");
        }

        // Create custom user object for managers
        const customUser = {
          uid: managerDoc.id,
          email: managerData.email,
          displayName: managerData.name,
          username: managerData.username,
          role: "manager",
          ownerId: managerData.ownerId,
          permissions: managerData.permissions || ["view_dashboard"],
          ...managerData,
        };

        setCurrentUser(customUser);
        setUserRole("manager");
        setUserProfile(managerData);

        // Store session data for refresh persistence (NOT localStorage)
        sessionStorage.setItem(
          "auth_session",
          JSON.stringify({
            uid: managerDoc.id,
            role: "manager",
            data: managerData,
            timestamp: Date.now(),
          })
        );

        console.log(
          "Manager logged in (session storage for refresh):",
          customUser.username
        );

        return { user: customUser };
      }

      throw new Error("Invalid username or password");
    } catch (error) {
      console.error("User login error:", error);
      throw error;
    }
  }

  // Owner signup (creates Firebase Auth + owner document)
  async function ownerSignup(
    email,
    password,
    displayName,
    username,
    additionalData = {}
  ) {
    try {
      console.log("Creating owner with email:", email);

      // Check if username already exists
      const usernameQuery = query(
        collection(db, "owners"),
        where("username", "==", username)
      );
      const usernameSnapshot = await getDocs(usernameQuery);

      if (!usernameSnapshot.empty) {
        throw new Error("Username already exists");
      }

      // Step 1: Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      console.log("Firebase user created with UID:", firebaseUser.uid);

      try {
        // Step 2: Update Firebase Auth profile
        await updateProfile(firebaseUser, {
          displayName: displayName,
        });

        // Step 3: Create owner document in Firestore using Firebase UID
        const ownerData = {
          name: displayName,
          email: email,
          username: username,
          password: password, // In production, hash this
          role: "owner",
          status: "active",
          firebaseUID: firebaseUser.uid,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...additionalData,
        };

        await setDoc(doc(db, "owners", firebaseUser.uid), ownerData);

        // Set auth state (MEMORY ONLY)
        setCurrentUser(firebaseUser);
        setUserRole("owner");
        setUserProfile(ownerData);

        console.log("Owner document created successfully (session only)");
        return userCredential;
      } catch (firestoreError) {
        // If Firestore operation fails, cleanup Firebase Auth user
        console.error(
          "Firestore error, cleaning up Firebase user:",
          firestoreError
        );
        await firebaseUser.delete();
        throw firestoreError;
      }
    } catch (error) {
      console.error("Owner signup error:", error);
      throw error;
    }
  }

  // Create manager (by owner)
  async function createManager(managerData, ownerId) {
    try {
      if (!ownerId) {
        throw new Error("Owner ID is required");
      }

      // Generate unique username
      const username = await generateUsername(managerData.name, ownerId);

      // Generate temporary password (in production, let user set their own)
      const password = `temp${Date.now()}`;

      const managerId = `manager_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const finalManagerData = {
        ...managerData,
        username: username,
        password: password,
        role: "manager",
        status: "active",
        ownerId: ownerId,
        permissions: managerData.permissions || ["view_dashboard"],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(db, "managers", managerId), finalManagerData);

      return {
        id: managerId,
        username: username,
        password: password,
        ...finalManagerData,
      };
    } catch (error) {
      console.error("Error creating manager:", error);
      throw error;
    }
  }

  // Logout with complete session cleanup
  async function logout() {
    try {
      // Clear sessionStorage
      sessionStorage.removeItem("auth_session");
      sessionStorage.removeItem("business_session");

      // Sign out from Firebase if there's a current user
      if (auth.currentUser) {
        console.log("Signing out Firebase user:", auth.currentUser.email);
        await signOut(auth);
      }

      // Clear all auth state
      setCurrentUser(null);
      setUserRole(null);
      setUserProfile(null);

      console.log("Logout completed - all session data cleared");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if logout fails, clear local state
      setCurrentUser(null);
      setUserRole(null);
      setUserProfile(null);
      throw error;
    }
  }

  // Initialize auth state with app start vs refresh detection
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);

        // If this is a fresh app start, always go to login
        if (isAppStart) {
          console.log(
            "🚀 Fresh app start - clearing all data and going to login"
          );
          setCurrentUser(null);
          setUserRole(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }

        // This is a page refresh - try to restore session
        console.log("🔄 Page refresh - attempting to restore session");

        // Check for existing session in sessionStorage
        const sessionData = sessionStorage.getItem("auth_session");
        if (sessionData) {
          try {
            const parsedSession = JSON.parse(sessionData);

            // Verify user still exists and is active in database
            const collectionName =
              parsedSession.role === "owner" ? "owners" : "managers";
            const userDoc = await getDoc(
              doc(db, collectionName, parsedSession.uid)
            );

            if (userDoc.exists() && userDoc.data().status === "active") {
              const userData = userDoc.data();

              // Restore user session
              const customUser = {
                uid: parsedSession.uid,
                role: parsedSession.role,
                email: userData.email,
                displayName: userData.name,
                username: userData.username,
                ...(parsedSession.role === "manager"
                  ? {
                      ownerId: userData.ownerId,
                      permissions: userData.permissions || ["view_dashboard"],
                    }
                  : {}),
                ...userData,
              };

              setCurrentUser(customUser);
              setUserRole(parsedSession.role);
              setUserProfile(userData);

              console.log(
                `✅ Session restored for ${parsedSession.role}:`,
                userData.name
              );
              setLoading(false);
              return;
            } else {
              console.log(
                "❌ User no longer exists or inactive - clearing session"
              );
              sessionStorage.removeItem("auth_session");
            }
          } catch (sessionError) {
            console.error("Session parsing error:", sessionError);
            sessionStorage.removeItem("auth_session");
          }
        }

        // Check Firebase auth state for admins
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          try {
            if (user && isAdminEmail(user.email)) {
              console.log("✅ Firebase admin session restored:", user.email);

              setCurrentUser(user);
              setUserRole("admin");
              setUserProfile({
                name: user.displayName || "Administrator",
                email: user.email,
                role: "admin",
                domain: "lumorabiz.com",
              });
            } else {
              // No valid session found
              setCurrentUser(null);
              setUserRole(null);
              setUserProfile(null);

              // Sign out any non-admin Firebase users
              if (user && !isAdminEmail(user.email)) {
                console.log("Signing out non-admin Firebase user");
                await signOut(auth);
              }
            }
          } catch (error) {
            console.error("Auth state change error:", error);
            setCurrentUser(null);
            setUserRole(null);
            setUserProfile(null);
          } finally {
            setLoading(false);
          }
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Auth initialization error:", error);
        setLoading(false);
      }
    };

    // Only run initialization after we've determined if this is app start or refresh
    if (isAppStart !== null) {
      initAuth();
    }
  }, [isAppStart]);

  const value = {
    currentUser,
    userRole,
    userProfile,
    loading,
    adminLogin,
    userLogin,
    ownerSignup,
    createManager,
    generateUsername,
    logout,
    isAdminEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
