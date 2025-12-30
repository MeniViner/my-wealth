import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { INITIAL_ASSETS_SEED } from '../constants/defaults';
import { fetchAssetPricesBatch } from '../services/priceService';

/**
 * Custom hook for managing assets with live price tracking
 * @param {User} user - Firebase user object
 * @param {number} currencyRate - Current USD to ILS exchange rate
 * @returns {{ assets: Array, addAsset: Function, updateAsset: Function, deleteAsset: Function, initializeAssets: Function, refreshPrices: Function, pricesLoading: boolean, lastPriceUpdate: Date }}
 */
export const useAssets = (user, currencyRate) => {
  const [assets, setAssets] = useState([]);
  const [rawAssets, setRawAssets] = useState([]); // Assets from Firestore without live prices
  const [livePrices, setLivePrices] = useState({}); // { symbol: priceData }
  const [pricesLoading, setPricesLoading] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState(null);
  const priceRefreshTimeoutRef = useRef(null);

  // Listen to assets collection
  useEffect(() => {
    if (!user || !db) {
      setAssets([]);
      setRawAssets([]);
      return;
    }

    const assetsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'assets');
    const unsubscribe = onSnapshot(assetsRef, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          ...data
        });
      });
      setRawAssets(items);
    }, (error) => {
      console.error('Error listening to assets:', error);
      setRawAssets([]);
    });

    return () => unsubscribe();
  }, [user]);

  // Calculate asset values based on mode and live prices
  useEffect(() => {
    const rate = currencyRate || 3.65;
    
    const calculatedAssets = rawAssets.map(asset => {
      let value = 0;
      let currentPrice = null;
      let profitLoss = null;
      let profitLossPercent = null;

      // Check if we have live price for this asset
      const priceKey = asset.apiId || asset.symbol;
      const livePrice = priceKey ? livePrices[priceKey] : null;

      if (asset.assetMode === 'QUANTITY' && asset.quantity) {
        // QUANTITY mode: use live price if available, otherwise use purchase price
        if (livePrice) {
          currentPrice = livePrice.currentPrice;
          // Convert price to ILS if needed
          const priceInILS = livePrice.currency === 'ILS' ? currentPrice : currentPrice * rate;
          value = asset.quantity * priceInILS;
          
          // Calculate P/L
          const costBasis = asset.quantity * (asset.purchasePrice || 0);
          const costBasisInILS = asset.currency === 'USD' ? costBasis * rate : costBasis;
          profitLoss = value - costBasisInILS;
          profitLossPercent = costBasisInILS > 0 ? (profitLoss / costBasisInILS) * 100 : 0;
        } else {
          // No live price - use purchase price as estimate
          const costBasis = asset.quantity * (asset.purchasePrice || 0);
          value = asset.currency === 'USD' ? costBasis * rate : costBasis;
        }
      } else {
        // LEGACY mode or no quantity: use originalValue
        value = asset.currency === 'USD' 
          ? (asset.originalValue || 0) * rate
          : (asset.originalValue || asset.value || 0);
      }

      return {
        ...asset,
        value,
        currentPrice,
        profitLoss,
        profitLossPercent,
        hasLivePrice: !!livePrice,
        priceChange24h: livePrice?.change24h || null
      };
    });

    setAssets(calculatedAssets);
  }, [rawAssets, livePrices, currencyRate]);

  // Fetch live prices for all trackable assets
  const refreshPrices = useCallback(async () => {
    if (rawAssets.length === 0) return;

    // Filter assets that can have live prices
    const trackableAssets = rawAssets.filter(asset => 
      asset.assetMode === 'QUANTITY' && 
      asset.marketDataSource && 
      asset.marketDataSource !== 'manual' &&
      (asset.apiId || asset.symbol)
    );

    if (trackableAssets.length === 0) return;

    setPricesLoading(true);
    try {
      const prices = await fetchAssetPricesBatch(trackableAssets);
      setLivePrices(prices);
      setLastPriceUpdate(new Date());
    } catch (error) {
      console.error('Error fetching live prices:', error);
    }
    setPricesLoading(false);
  }, [rawAssets]);

  // Auto-refresh prices when rawAssets change (initial load)
  useEffect(() => {
    if (rawAssets.length > 0) {
      refreshPrices();
    }
  }, [rawAssets.length]); // Only trigger on length change, not content

  // Optional: Auto-refresh prices every 5 minutes
  useEffect(() => {
    if (rawAssets.length === 0) return;

    // Clear existing timeout
    if (priceRefreshTimeoutRef.current) {
      clearTimeout(priceRefreshTimeoutRef.current);
    }

    // Set up auto-refresh (every 5 minutes)
    const scheduleRefresh = () => {
      priceRefreshTimeoutRef.current = setTimeout(() => {
        refreshPrices();
        scheduleRefresh();
      }, 5 * 60 * 1000); // 5 minutes
    };

    scheduleRefresh();

    return () => {
      if (priceRefreshTimeoutRef.current) {
        clearTimeout(priceRefreshTimeoutRef.current);
      }
    };
  }, [rawAssets.length, refreshPrices]);

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
    initializeAssets,
    refreshPrices,
    pricesLoading,
    lastPriceUpdate
  };
};

