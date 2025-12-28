import { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { DEFAULT_SYSTEM_DATA } from '../constants/defaults';

/**
 * Custom hook for managing system data (platforms, instruments, categories)
 * @param {User} user - Firebase user object
 * @returns {{ systemData: Object, setSystemData: Function }}
 */
export const useSystemData = (user) => {
  const [systemData, setSystemDataState] = useState(DEFAULT_SYSTEM_DATA);

  // Listen to system data
  useEffect(() => {
    if (!user || !db) {
      setSystemDataState(DEFAULT_SYSTEM_DATA);
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
          setSystemDataState(docSnap.data());
        } else {
          // Only create default if document doesn't exist (don't do it in onSnapshot callback)
          setSystemDataState(DEFAULT_SYSTEM_DATA);
          // Create document in background (don't wait for it)
          setDoc(configRef, DEFAULT_SYSTEM_DATA).catch(err => {
            console.warn('Failed to create default system data:', err);
          });
        }
        
        // Now set up real-time listener
        unsubscribe = onSnapshot(configRef, (snapshot) => {
          if (!isMounted) return;
          if (snapshot.exists()) {
            setSystemDataState(snapshot.data());
          }
        }, (error) => {
          if (!isMounted) return;
          console.error('Error listening to system data:', error);
        });
      } catch (error) {
        if (!isMounted) return;
        console.error('Error loading system data:', error);
        setSystemDataState(DEFAULT_SYSTEM_DATA);
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

