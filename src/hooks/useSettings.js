import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, appId } from '../services/firebase';

/**
 * Hook לניהול הגדרות משתמש
 * @param {Object} user - Firebase user object
 * @returns {Object} { settings, updateSettings, loading }
 */
export const useSettings = (user) => {
  const [settings, setSettings] = useState({
    disableLivePriceUpdates: false, // כיבוי עדכון מחירים אוטומטי
  });
  const [loading, setLoading] = useState(true);

  // טען הגדרות מ-Firestore
  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'preferences');
        const settingsSnap = await getDoc(settingsRef);
        
        if (settingsSnap.exists()) {
          setSettings(prev => ({
            ...prev,
            ...settingsSnap.data()
          }));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  /**
   * עדכן הגדרות ושמור ב-Firestore
   * @param {Object} newSettings - הגדרות חדשות לעדכון
   */
  const updateSettings = async (newSettings) => {
    if (!user || !db) return;

    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);

      const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'preferences');
      await setDoc(settingsRef, updatedSettings, { merge: true });
      
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      return false;
    }
  };

  return {
    settings,
    updateSettings,
    loading
  };
};
