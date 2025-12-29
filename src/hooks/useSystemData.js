import { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { DEFAULT_SYSTEM_DATA } from '../constants/defaults';

// Empty system data for new users (not DEFAULT_SYSTEM_DATA)
const EMPTY_SYSTEM_DATA = {
  platforms: [],
  instruments: [],
  categories: [],
  symbols: []
};

/**
 * Custom hook for managing system data (platforms, instruments, categories)
 * @param {User} user - Firebase user object
 * @returns {{ systemData: Object, setSystemData: Function }}
 */
export const useSystemData = (user) => {
  const [systemData, setSystemDataState] = useState(EMPTY_SYSTEM_DATA);

  // Listen to system data
  useEffect(() => {
    if (!user || !db) {
      setSystemDataState(EMPTY_SYSTEM_DATA);
      return;
    }

    let isMounted = true;
    let unsubscribe = null;

    const configRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config');
    
    // First, try to get the document quickly
    const initSystemData = async () => {
      try {
        const docSnap = await getDoc(configRef);
        
        if (!isMounted) return;
        
        if (docSnap.exists()) {
          // Document exists - use its data (user has already customized or initialized)
          setSystemDataState(docSnap.data());
        } else {
          // For new users, start with empty data (not DEFAULT_SYSTEM_DATA)
          // DEFAULT_SYSTEM_DATA should only be used when clicking reset button
          setSystemDataState(EMPTY_SYSTEM_DATA);
          // Create document with empty data immediately to prevent race conditions
          await setDoc(configRef, EMPTY_SYSTEM_DATA);
        }
        
        // Now set up real-time listener
        unsubscribe = onSnapshot(configRef, (snapshot) => {
          if (!isMounted) return;
          if (snapshot.exists()) {
            setSystemDataState(snapshot.data());
          } else {
            // If document doesn't exist, use empty data
            setSystemDataState(EMPTY_SYSTEM_DATA);
          }
        }, (error) => {
          if (!isMounted) return;
          console.error('Error listening to system data:', error);
        });
      } catch (error) {
        if (!isMounted) return;
        console.error('Error loading system data:', error);
        setSystemDataState(EMPTY_SYSTEM_DATA);
      }
    };

    initSystemData();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const setSystemData = async (newData) => {
    if (!user || !db) return;
    const configRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config');
    await setDoc(configRef, newData);
  };

  return {
    systemData,
    setSystemData
  };
};

