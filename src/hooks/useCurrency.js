import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { fetchExchangeRate } from '../services/currency';

/**
 * Custom hook for managing currency exchange rates
 * @param {User} user - Firebase user object
 * @returns {{ currencyRate: {rate: number, date: string}, loading: boolean }}
 */
export const useCurrency = (user) => {
  const [currencyRate, setCurrencyRate] = useState({ rate: 3.65, date: 'טוען...', lastUpdated: null });
  const [loading, setLoading] = useState(true);

  const loadRates = async (forceRefresh = false) => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'currencyRate');
      
      if (!forceRefresh) {
        // Check Firebase for cached rate
        const docSnap = await getDoc(docRef);
        const today = new Date().toISOString().split('T')[0];

        if (docSnap.exists() && docSnap.data().date === today) {
          // Use cached rate if it's from today
          const cachedData = docSnap.data();
          setCurrencyRate({ 
            ...cachedData, 
            lastUpdated: cachedData.lastUpdated || new Date().toISOString() 
          });
          setLoading(false);
          return;
        }
      }

      // Fetch new rate
      setLoading(true);
      const data = await fetchExchangeRate();
      if (data) {
        const now = new Date().toISOString();
        const newRate = { 
          rate: data.rate, 
          date: data.date,
          lastUpdated: now
        };
        setCurrencyRate(newRate);
        // Save to Firebase (including lastUpdated)
        await setDoc(docRef, newRate);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error loading currency rate:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
  }, [user]);

  const refreshCurrencyRate = async () => {
    await loadRates(true);
  };

  return { currencyRate, loading, refreshCurrencyRate };
};

