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

  // Check if email is admin (Lumorabiz domain)
  const isAdminEmail = (email) => {
    return email.toLowerCase().endsWith("@lumorabiz.com");
  };

  // Admin login (Firebase Auth)
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
      setUserRole("admin");
      setUserProfile({
        name: "Administrator",
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

  // Owner/Manager login using username/password (but email is in Firebase Auth)
  async function userLogin(username, password) {
    try {
      // First check owners collection
      const ownersQuery = query(
        collection(db, "owners"),
        where("username", "==", username),
        where("password", "==", password) // In production, hash passwords
      );

      const ownersSnapshot = await getDocs(ownersQuery);

      if (!ownersSnapshot.empty) {
        const ownerDoc = ownersSnapshot.docs[0];
        const ownerData = ownerDoc.data();

        if (ownerData.status === "inactive") {
          throw new Error("Account is deactivated");
        }

        // Verify the owner's email exists in Firebase Auth
        // This is important - the email should already be registered there
        console.log("Owner found with email:", ownerData.email);

        const customUser = {
          uid: ownerDoc.id, // Use Firestore document ID as UID
          email: ownerData.email,
          displayName: ownerData.name,
          username: ownerData.username,
          role: "owner",
          firebaseUID: ownerData.firebaseUID, // Link to actual Firebase Auth UID
          ...ownerData,
        };

        setCurrentUser(customUser);
        setUserRole("owner");
        setUserProfile(ownerData);

        // Store session
        localStorage.setItem(
          "authSession",
          JSON.stringify({
            uid: ownerDoc.id,
            role: "owner",
            data: ownerData,
          })
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

        const customUser = {
          uid: managerDoc.id,
          email: managerData.email,
          displayName: managerData.name,
          username: managerData.username,
          role: "manager",
          ownerId: managerData.ownerId, // Important for data access
          ...managerData,
        };

        setCurrentUser(customUser);
        setUserRole("manager");
        setUserProfile(managerData);

        // Store session
        localStorage.setItem(
          "authSession",
          JSON.stringify({
            uid: managerDoc.id,
            role: "manager",
            data: managerData,
          })
        );

        return { user: customUser };
      }

      throw new Error("Invalid username or password");
    } catch (error) {
      console.error("User login error:", error);
      throw error;
    }
  }

  // Owner signup (creates Firebase Auth + owner document) - FIXED VERSION
  async function ownerSignup(
    email,
    password,
    displayName,
    username,
    additionalData = {}
  ) {
    try {
      console.log("Creating owner with email:", email);

      // Step 1: Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      console.log("Firebase user created with UID:", firebaseUser.uid);

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
        firebaseUID: firebaseUser.uid, // Store Firebase Auth UID
        createdAt: new Date(),
        updatedAt: new Date(),
        // Include any additional data (business info, etc.)
        ...additionalData,
      };

      // Use Firebase Auth UID as the document ID for consistency
      await setDoc(doc(db, "owners", firebaseUser.uid), ownerData);

      console.log(
        "Owner document created in Firestore with ID:",
        firebaseUser.uid
      );

      return userCredential;
    } catch (error) {
      console.error("Owner signup error:", error);

      // If Firestore creation fails but Firebase Auth succeeded, we should clean up
      if (error.code !== "auth/email-already-in-use" && auth.currentUser) {
        try {
          await auth.currentUser.delete();
          console.log("Cleaned up Firebase Auth user due to Firestore error");
        } catch (cleanupError) {
          console.error("Failed to cleanup Firebase Auth user:", cleanupError);
        }
      }

      throw error;
    }
  }

  // Generate unique username
  async function generateUsername(baseName) {
    const baseUsername = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") // Remove special characters
      .substring(0, 8); // Limit to 8 characters

    let username = baseUsername;
    let counter = 1;

    // Check if username exists in both collections
    while (true) {
      const [ownerQuery, managerQuery] = await Promise.all([
        getDocs(
          query(collection(db, "owners"), where("username", "==", username))
        ),
        getDocs(
          query(collection(db, "managers"), where("username", "==", username))
        ),
      ]);

      if (ownerQuery.empty && managerQuery.empty) {
        break; // Username is available
      }

      username = `${baseUsername}${counter}`;
      counter++;

      if (counter > 999) {
        throw new Error("Unable to generate unique username");
      }
    }

    return username;
  }

  // Create manager when owner adds employee with manager role
  async function createManager(employeeData, ownerId) {
    try {
      const username = await generateUsername(employeeData.name);
      const password = `${username}123`; // Simple password generation

      const managerId = doc(collection(db, "managers")).id;

      const managerData = {
        name: employeeData.name,
        username: username,
        password: password,
        email: employeeData.email || `${username}@mill.local`,
        role: "manager",
        status: "active",
        ownerId: ownerId,
        department: employeeData.department || "general",
        employeeId: employeeData.employeeId, // Link to employee record
        permissions: employeeData.permissions || ["view_dashboard"],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(db, "managers", managerId), managerData);

      return {
        id: managerId,
        username: username,
        password: password,
        ...managerData,
      };
    } catch (error) {
      console.error("Error creating manager:", error);
      throw error;
    }
  }

  // Logout
  async function logout() {
    try {
      localStorage.removeItem("authSession");

      // Only sign out from Firebase if we're actually signed in there
      if (auth.currentUser) {
        await signOut(auth);
      }

      setCurrentUser(null);
      setUserRole(null);
      setUserProfile(null);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for existing session first (for username/password users)
        const session = localStorage.getItem("authSession");
        if (session) {
          const sessionData = JSON.parse(session);

          // Verify user still exists and is active
          const collectionName =
            sessionData.role === "owner" ? "owners" : "managers";
          const userDoc = await getDoc(
            doc(db, collectionName, sessionData.uid)
          );

          if (userDoc.exists() && userDoc.data().status === "active") {
            setCurrentUser({
              uid: sessionData.uid,
              role: sessionData.role,
              ...sessionData.data,
            });
            setUserRole(sessionData.role);
            setUserProfile(sessionData.data);
          } else {
            localStorage.removeItem("authSession");
          }
          setLoading(false);
          return;
        }

        // Check Firebase auth for admins (and potentially owners who login via Firebase)
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            if (isAdminEmail(user.email)) {
              // Admin user
              setCurrentUser(user);
              setUserRole("admin");
              setUserProfile({
                name: user.displayName || "Administrator",
                email: user.email,
                role: "admin",
                domain: "lumorabiz.com",
              });
            } else {
              // Check if this is an owner who might be signed in via Firebase
              const ownerDoc = await getDoc(doc(db, "owners", user.uid));
              if (ownerDoc.exists()) {
                const ownerData = ownerDoc.data();
                setCurrentUser(user);
                setUserRole("owner");
                setUserProfile(ownerData);
              } else {
                // Email exists in Firebase Auth but no corresponding owner record
                console.warn("Firebase user exists but no owner record found");
                await signOut(auth);
              }
            }
          }
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error("Auth initialization error:", error);
        setLoading(false);
      }
    };

    initAuth();
  }, []);

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
