import { useState, useEffect } from 'react';
import { initAuth, onAuthStateChange } from '../services/firebase';

/**
 * Custom hook for Firebase authentication
 * @returns {{ user: User | null, loading: boolean }}
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize anonymous auth
    initAuth().catch((error) => {
      console.error("Auth initialization error:", error);
      setLoading(false);
    });

    // Listen to auth state changes
    const unsubscribe = onAuthStateChange((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return { user, loading };
};

