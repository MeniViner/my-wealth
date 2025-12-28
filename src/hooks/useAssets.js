import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { INITIAL_ASSETS_SEED } from '../constants/defaults';

/**
 * Custom hook for managing assets
 * @param {User} user - Firebase user object
 * @param {number} currencyRate - Current USD to ILS exchange rate
 * @returns {{ assets: Array, addAsset: Function, updateAsset: Function, deleteAsset: Function, initializeAssets: Function }}
 */
export const useAssets = (user, currencyRate) => {
  const [assets, setAssets] = useState([]);

  // Listen to assets collection
  useEffect(() => {
    if (!user || !db) {
      setAssets([]);
      return;
    }

    const assetsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'assets');
    const unsubscribe = onSnapshot(assetsRef, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Use currencyRate if available, otherwise use originalValue or default rate
        const rate = currencyRate || 3.65;
        items.push({
          id: doc.id,
          ...data,
          // Recalculate value based on current exchange rate
          value: data.currency === 'USD' 
            ? (data.originalValue || 0) * rate
            : (data.originalValue || data.value || 0)
        });
      });
      setAssets(items);
    }, (error) => {
      console.error('Error listening to assets:', error);
      setAssets([]);
    });

    return () => unsubscribe();
  }, [user, currencyRate]);

  const addAsset = async (assetData) => {
    if (!user || !db) return;
    const { id, ...data } = assetData;
    await addDoc(
      collection(db, 'artifacts', appId, 'users', user.uid, 'assets'),
      data
    );
  };

  const updateAsset = async (assetId, assetData) => {
    if (!user || !db) return;
    const { id, ...data } = assetData;
    await updateDoc(
      doc(db, 'artifacts', appId, 'users', user.uid, 'assets', assetId),
      data
    );
  };

  const deleteAsset = async (assetId) => {
    if (!user || !db) return;
    await deleteDoc(
      doc(db, 'artifacts', appId, 'users', user.uid, 'assets', assetId)
    );
  };

  const initializeAssets = async () => {
    if (!user || !db) return false;
    
    try {
      const batch = writeBatch(db);
      
      // Delete all existing assets
      const assetsSnapshot = await getDocs(
        collection(db, 'artifacts', appId, 'users', user.uid, 'assets')
      );
      assetsSnapshot.docs.forEach((d) => batch.delete(d.ref));
      
      // Add initial seed assets
      INITIAL_ASSETS_SEED.forEach((seed) => {
        const newRef = doc(
          collection(db, 'artifacts', appId, 'users', user.uid, 'assets')
        );
        batch.set(newRef, seed);
      });
      
      await batch.commit();
      return true;
    } catch (error) {
      console.error("Error initializing assets:", error);
      return false;
    }
  };

  return {
    assets,
    addAsset,
    updateAsset,
    deleteAsset,
    initializeAssets
  };
};

