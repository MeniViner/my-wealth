import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate configuration
let app, auth, db;

if (!firebaseConfig.apiKey || !firebaseConfig.projectId || firebaseConfig.apiKey === 'your_api_key_here') {
  console.warn("Firebase config is missing! Please check your .env file.");
  console.warn("The app will load but Firebase features will not work until you configure it.");
} else {
  try {
    // Initialize Firebase with real config
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
  }
}

// Ensure auth and db are always defined (even if null)
if (!auth) {
  // Create mock objects to prevent crashes
  auth = null;
  db = null;
}

export { auth, db };

// App ID for Firebase collections
export const appId = import.meta.env.VITE_APP_ID || 'my-wealth-app';

// Make auth available globally for console debugging - ONLY in development mode
// SECURITY: These debug tools are NOT included in production builds
if (import.meta.env.DEV && typeof window !== 'undefined' && auth) {
  window.__firebaseAuth = auth;
  window.__getCurrentUser = () => {
    if (auth && auth.currentUser) {
      console.log('Current User ID:', auth.currentUser.uid);
      console.log('Current User Email:', auth.currentUser.email);
      console.log('Current User Display Name:', auth.currentUser.displayName);
      return auth.currentUser;
    } else {
      console.log('No user is currently logged in');
      return null;
    }
  };
  // console.log('%c🔧 Firebase Debug Tools Available:', 'color: #10b981; font-weight: bold;');
  // console.log('  - window.__getCurrentUser() - Get current user info');
  // console.log('  - window.__firebaseAuth - Access Firebase auth object');
}

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Sign in with Google
export const signInWithGoogle = async () => {
  if (!auth) {
    console.warn("Firebase auth not initialized. Please configure Firebase in .env file.");
    throw new Error("Firebase auth not initialized");
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google sign-in failed:", error);
    throw error;
  }
};

// Sign out
export const signOutUser = async () => {
  if (!auth) {
    return;
  }
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign out failed:", error);
    throw error;
  }
};

// Auth state observer helper
export const onAuthStateChange = (callback) => {
  if (!auth) {
    // Return a no-op unsubscribe function
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

export default app;

