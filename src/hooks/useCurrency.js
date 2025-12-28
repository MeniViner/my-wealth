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
  const [currencyRate, setCurrencyRate] = useState({ rate: 3.65, date: 'טוען...' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRates = async () => {
      if (!user || !db) {
        setLoading(false);
        return;
      }

      try {
        // Check Firebase for cached rate
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'currencyRate');
        const docSnap = await getDoc(docRef);
        const today = new Date().toISOString().split('T')[0];

        if (docSnap.exists() && docSnap.data().date === today) {
          // Use cached rate if it's from today
          setCurrencyRate(docSnap.data());
          setLoading(false);
        } else {
          // Fetch new rate
          const data = await fetchExchangeRate();
          if (data) {
            const newRate = { rate: data.rate, date: data.date };
            setCurrencyRate(newRate);
            // Save to Firebase
            await setDoc(docRef, newRate);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading currency rate:", error);
        setLoading(false);
      }
    };

    loadRates();
  }, [user]);

  return { currencyRate, loading };
};

