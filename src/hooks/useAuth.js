import { useState, useEffect } from 'react';
import { onAuthStateChange, signInWithGoogle, signOutUser } from '../services/firebase';

/**
 * Custom hook for Firebase authentication
 * @returns {{ user: User | null, loading: boolean, signIn: Function, signOut: Function }}
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = onAuthStateChange((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const signIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await signOutUser();
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  return { user, loading, signIn, signOut };
};

