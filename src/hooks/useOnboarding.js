import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, appId } from '../services/firebase';

/**
 * Custom hook for managing onboarding state
 * Stores hasCompletedOnboarding in Firebase user document
 * @param {User} user - Firebase user object
 * @returns {{ hasCompletedOnboarding: boolean, showCoachmarks: boolean, loading: boolean, completeOnboarding: Function, startCoachmarks: Function, dismissCoachmarks: Function }}
 */
export const useOnboarding = (user) => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true); // Default true to not show onboarding during load
  const [showCoachmarks, setShowCoachmarks] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load onboarding status from Firebase
  useEffect(() => {
    const loadOnboardingStatus = async () => {
      if (!user || !db) {
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'artifacts', appId, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          // If hasCompletedOnboarding is not set, treat as new user
          const completed = data.hasCompletedOnboarding === true;
          setHasCompletedOnboarding(completed);
          
          // Check if we should show coachmarks (just completed onboarding)
          if (data.showCoachmarksOnNextLoad === true) {
            setShowCoachmarks(true);
            // Clear the flag
            await setDoc(userRef, { showCoachmarksOnNextLoad: false }, { merge: true });
          }
        } else {
          // New user, hasn't completed onboarding
          setHasCompletedOnboarding(false);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading onboarding status:', error);
        setLoading(false);
        // On error, assume completed to not block user
        setHasCompletedOnboarding(true);
      }
    };

    loadOnboardingStatus();
  }, [user]);

  // Complete onboarding and trigger coachmarks
  const completeOnboarding = useCallback(async () => {
    if (!user || !db) return;

    try {
      const userRef = doc(db, 'artifacts', appId, 'users', user.uid);
      await setDoc(userRef, { 
        hasCompletedOnboarding: true,
        onboardingCompletedAt: new Date(),
        showCoachmarksOnNextLoad: false // We'll show coachmarks immediately
      }, { merge: true });
      
      setHasCompletedOnboarding(true);
      setShowCoachmarks(true); // Start coachmarks immediately after onboarding
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }, [user]);

  // Reset onboarding (for testing)
  const resetOnboarding = useCallback(async () => {
    if (!user || !db) return;

    try {
      const userRef = doc(db, 'artifacts', appId, 'users', user.uid);
      await setDoc(userRef, { 
        hasCompletedOnboarding: false,
        onboardingCompletedAt: null,
        showCoachmarksOnNextLoad: false
      }, { merge: true });
      
      setHasCompletedOnboarding(false);
      setShowCoachmarks(false);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  }, [user]);

  // Manually start coachmarks tour
  const startCoachmarks = useCallback(() => {
    setShowCoachmarks(true);
  }, []);

  // Dismiss coachmarks tour
  const dismissCoachmarks = useCallback(() => {
    setShowCoachmarks(false);
  }, []);

  return {
    hasCompletedOnboarding,
    showCoachmarks,
    loading,
    completeOnboarding,
    resetOnboarding,
    startCoachmarks,
    dismissCoachmarks
  };
};

