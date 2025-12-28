import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
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

// Initialize anonymous authentication
export const initAuth = async () => {
  if (!auth) {
    console.warn("Firebase auth not initialized. Please configure Firebase in .env file.");
    return;
  }
  try {
    await signInAnonymously(auth);
  } catch (error) {
    console.error("Anonymous auth failed:", error);
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

