import { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { db, appId } from '../services/firebase';

/**
 * Custom hook for managing AI configuration
 * @param {User} user - Firebase user object
 * @returns {{ aiConfig: Object, setAiConfig: Function }}
 */
export const useAIConfig = (user) => {
  const [aiConfig, setAiConfigState] = useState({
    historyLimit: 10,
    contextEnabled: true
  });

  // Listen to AI config
  useEffect(() => {
    if (!user || !db) {
      setAiConfigState({
        historyLimit: 10,
        contextEnabled: true
      });
      return;
    }

    let isMounted = true;
    let unsubscribe = null;

    const aiConfigRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'aiConfig');
    
    // First, try to get the document quickly
    const initAiConfig = async () => {
      try {
        const docSnap = await getDoc(aiConfigRef);
        
        if (!isMounted) return;
        
        if (docSnap.exists()) {
          setAiConfigState(docSnap.data());
        } else {
          // Only create default if document doesn't exist
          const defaultConfig = { historyLimit: 10, contextEnabled: true };
          setAiConfigState(defaultConfig);
          // Create document in background (don't wait for it)
          setDoc(aiConfigRef, defaultConfig).catch(err => {
            console.warn('Failed to create default AI config:', err);
          });
        }
        
        // Now set up real-time listener
        unsubscribe = onSnapshot(aiConfigRef, (snapshot) => {
          if (!isMounted) return;
          if (snapshot.exists()) {
            setAiConfigState(snapshot.data());
          }
        }, (error) => {
          if (!isMounted) return;
          console.error('Error listening to AI config:', error);
        });
      } catch (error) {
        if (!isMounted) return;
        console.error('Error loading AI config:', error);
        setAiConfigState({ historyLimit: 10, contextEnabled: true });
      }
    };

    initAiConfig();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const setAiConfig = async (newConfig) => {
    if (!user || !db) return;
    const aiConfigRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'aiConfig');
    await setDoc(aiConfigRef, newConfig);
  };

  return {
    aiConfig,
    setAiConfig
  };
};

