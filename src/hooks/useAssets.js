import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch, getDocs, getDoc } from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { INITIAL_ASSETS_SEED } from '../constants/defaults';
import { fetchAssetPricesBatch } from '../services/priceService';
import { normalizeAssetApiId, resolveInternalId } from '../services/internalIds';

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
  const [loading, setLoading] = useState(true);
  const [lastPriceUpdate, setLastPriceUpdate] = useState(null);
  const [disableLivePriceUpdates, setDisableLivePriceUpdates] = useState(false);
  const priceRefreshTimeoutRef = useRef(null);

  // Load settings to check if live price updates are disabled
  useEffect(() => {
    if (!user || !db) return;

    const loadSettings = async () => {
      try {
        const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'preferences');
        const settingsSnap = await getDoc(settingsRef);
        
        if (settingsSnap.exists()) {
          const settings = settingsSnap.data();
          setDisableLivePriceUpdates(settings.disableLivePriceUpdates || false);
        }
      } catch (error) {
        console.error('Error loading price settings:', error);
      }
    };

    loadSettings();
  }, [user]);

  // Listen to assets collection
  useEffect(() => {
    if (!user || !db) {
      setAssets([]);
      setRawAssets([]);
      setLoading(false);
      return;
    }

    const assetsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'assets');
    const unsubscribe = onSnapshot(assetsRef, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Normalize apiId for backward compatibility (migrate old assets)
        const normalizedAsset = normalizeAssetApiId({
          id: doc.id,
          ...data
        });
        items.push(normalizedAsset);

        // Optionally migrate asset if apiId was normalized (one-time migration)
        // Only migrate if apiId actually changed to avoid infinite loops
        if (normalizedAsset.apiId !== data.apiId && normalizedAsset.apiId) {
          // Use a flag to prevent migration loops - only migrate once per asset
          const migrationKey = `migrated_${doc.id}`;
          if (!localStorage.getItem(migrationKey)) {
            updateDoc(doc.ref, { apiId: normalizedAsset.apiId })
              .then(() => {
                localStorage.setItem(migrationKey, 'true');
                console.log(`[MIGRATION] Updated asset ${doc.id} apiId to ${normalizedAsset.apiId}`);
              })
              .catch(err => {
                console.warn(`[MIGRATION] Failed to update asset ${doc.id}:`, err);
              });
          }
        }
      });
      setRawAssets(items);
      // If no assets, we are done loading
      if (items.length === 0) {
        setLoading(false);
      }
    }, (error) => {
      console.error('Error listening to assets:', error);
      setRawAssets([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Calculate asset values based on mode and live prices
  useEffect(() => {
    const rate = currencyRate || 3.65;

    // Import convertAmount once
    import('../services/currency').then(({ convertAmount }) => {
      // Calculate all assets in parallel
      Promise.all(rawAssets.map(async (asset) => {
        let value = 0;
        let currentPrice = null;
        let profitLoss = null;
        let profitLossPercent = null;

        // Check if we have live price for this asset
        // Use resolveInternalId to get the correct key format
        const priceKey = resolveInternalId(asset) || asset.apiId || asset.symbol;
        const livePrice = priceKey ? livePrices[priceKey] : null;

        if (asset.assetMode === 'QUANTITY' && asset.quantity) {
          // QUANTITY mode: use live price if available, otherwise use purchase price
          if (livePrice) {
            const assetNativePrice = livePrice.currentPrice;
            const assetNativeCurrency = livePrice.currency || 'USD';

            // Convert price to display currency (ILS) using canonical conversion
            // If asset currency === display currency, no conversion needed
            const priceInDisplayCurrency = await convertAmount(
              assetNativePrice,
              assetNativeCurrency,
              'ILS', // Display currency is always ILS in this app
              rate
            );

            // ALSO convert to asset's currency for display
            const priceInAssetCurrency = await convertAmount(
              assetNativePrice,
              assetNativeCurrency,
              asset.currency || 'USD',
              rate
            );

            currentPrice = priceInDisplayCurrency;  // For calculations
            value = asset.quantity * priceInDisplayCurrency;

            // Calculate P/L in display currency
            const costBasis = asset.quantity * (asset.purchasePrice || 0);
            const costBasisInDisplayCurrency = await convertAmount(
              costBasis,
              asset.currency || 'ILS',
              'ILS',
              rate
            );

            profitLoss = value - costBasisInDisplayCurrency;
            profitLossPercent = costBasisInDisplayCurrency > 0
              ? (profitLoss / costBasisInDisplayCurrency) * 100
              : 0;

            return {
              ...asset,
              value,
              currentPrice,
              currentPriceNative: priceInAssetCurrency,  // NEW: price in asset's currency
              profitLoss,
              profitLossPercent,
              hasLivePrice: !!livePrice,
              priceChange24h: livePrice?.change24h || null
            };
          } else {
            // No live price - use purchase price as estimate
            const costBasis = asset.quantity * (asset.purchasePrice || 0);
            value = await convertAmount(
              costBasis,
              asset.currency || 'ILS',
              'ILS',
              rate
            );
          }
        } else {
          // LEGACY mode or no quantity: use originalValue
          value = await convertAmount(
            asset.originalValue || asset.value || 0,
            asset.currency || 'ILS',
            'ILS',
            rate
          );
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
      })).then(calculatedAssets => {
        setAssets(calculatedAssets);
        // Only complete loading here if we actually processed assets
        // If calculatedAssets is empty, it means rawAssets was likely empty (initial state),
        // so we wait for onSnapshot to handle the empty state case or provide data.
        if (calculatedAssets.length > 0) {
          setLoading(false);
        }
      });
    });
  }, [rawAssets, livePrices, currencyRate]);

  // Fetch live prices for all trackable assets
  const refreshPrices = useCallback(async () => {
    // אם עדכון מחירים אוטומטי כבוי, לא לעדכן
    if (disableLivePriceUpdates) {
      console.log('[PRICE UPDATE] Live price updates are disabled by user setting');
      return;
    }

    if (rawAssets.length === 0) return;

    // Filter assets that can have live prices
    // Include crypto assets even if marketDataSource is not set (will be identified by resolveInternalId)
    const trackableAssets = rawAssets.filter(asset => {
      // Must be in QUANTITY mode
      if (asset.assetMode !== 'QUANTITY') return false;
      
      // Must have apiId or symbol
      if (!asset.apiId && !asset.symbol) return false;
      
      // Exclude manual assets
      if (asset.marketDataSource === 'manual') return false;
      
      // Include if has marketDataSource (and not manual)
      if (asset.marketDataSource && asset.marketDataSource !== 'manual') return true;
      
      // Include crypto assets even without marketDataSource (identified by assetType, category, or apiId format)
      if (asset.assetType === 'CRYPTO' || 
          asset.category === 'קריפטו' ||
          (asset.apiId && asset.apiId.startsWith('cg:')) ||
          (asset.apiId && !asset.apiId.includes(':') && asset.category === 'קריפטו')) {
        return true;
      }
      
      // Include other assets only if they have marketDataSource
      return false;
    });

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
  }, [rawAssets, disableLivePriceUpdates]);

  // Auto-refresh prices when rawAssets change (initial load)
  useEffect(() => {
    if (rawAssets.length > 0 && !disableLivePriceUpdates) {
      refreshPrices();
    }
  }, [rawAssets.length, disableLivePriceUpdates]); // Only trigger on length change or settings change, not content

  // Optional: Auto-refresh prices every 5 minutes (only if not disabled)
  useEffect(() => {
    if (rawAssets.length === 0 || disableLivePriceUpdates) return;

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
  }, [rawAssets.length, refreshPrices, disableLivePriceUpdates]);

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
    assetsLoading: loading,
    lastPriceUpdate
  };
};

