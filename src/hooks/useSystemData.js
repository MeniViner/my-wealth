import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
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

    const configRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config');
    const unsubscribe = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        setSystemDataState(docSnap.data());
      } else {
        // Seed default system data if empty
        setDoc(configRef, DEFAULT_SYSTEM_DATA);
      }
    });

    return () => unsubscribe();
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

