import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, writeBatch, getDocs, getDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { INITIAL_ASSETS_SEED } from '../constants/defaults';
import { fetchAssetPricesBatch, isAssetPriceStale } from '../services/priceService';
import { normalizeAssetApiId, resolveInternalId } from '../services/internalIds';
import { convertAmount } from '../services/currency';

// ==================== HELPERS ====================

/**
 * Check if a timestamp is from a previous day (for daily price archiving)
 */
function isNewDay(lastUpdatedTimestamp) {
  if (!lastUpdatedTimestamp) return true;

  let lastDate;
  if (lastUpdatedTimestamp instanceof Timestamp) {
    lastDate = lastUpdatedTimestamp.toDate();
  } else if (lastUpdatedTimestamp instanceof Date) {
    lastDate = lastUpdatedTimestamp;
  } else if (typeof lastUpdatedTimestamp === 'number') {
    lastDate = new Date(lastUpdatedTimestamp);
  } else if (typeof lastUpdatedTimestamp === 'string') {
    lastDate = new Date(lastUpdatedTimestamp);
  } else {
    return true;
  }

  const today = new Date();
  return (
    lastDate.getDate() !== today.getDate() ||
    lastDate.getMonth() !== today.getMonth() ||
    lastDate.getFullYear() !== today.getFullYear()
  );
}

// ==================== MAIN HOOK ====================

/**
 * useAssets - Main hook for managing assets with live prices and daily archiving
 *
 * Responsibilities:
 * 1. Listen to Firestore assets collection (real-time)
 * 2. Fetch live prices (TASE via browser, Global/Crypto via backend)
 * 3. Calculate asset values with currency conversion
 * 4. Persist prices to Firestore with Internal Ledger (daily snapshot)
 * 5. Auto-refresh every 5 minutes
 *
 * @param {Object} user - Firebase user
 * @param {number} currencyRate - USD→ILS exchange rate
 */
export const useAssets = (user, currencyRate) => {
  const [assets, setAssets] = useState([]);
  const [rawAssets, setRawAssets] = useState([]);
  const [livePrices, setLivePrices] = useState({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastPriceUpdate, setLastPriceUpdate] = useState(null);
  const [disableLivePriceUpdates, setDisableLivePriceUpdates] = useState(false);
  const priceRefreshTimeoutRef = useRef(null);
  const lastSyncRef = useRef(0);

  // ---- Load user settings ----
  useEffect(() => {
    if (!user || !db) return;

    const loadSettings = async () => {
      try {
        const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'preferences');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setDisableLivePriceUpdates(snap.data().disableLivePriceUpdates || false);
        }
      } catch (error) {
        console.error('[useAssets] Error loading settings:', error);
      }
    };
    loadSettings();
  }, [user]);

  // ---- Listen to Firestore assets ----
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
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const normalized = normalizeAssetApiId({ id: docSnap.id, ...data });
        items.push(normalized);

        // One-time migration of apiId if changed
        if (normalized.apiId !== data.apiId && normalized.apiId) {
          const migKey = `migrated_${docSnap.id}`;
          if (!localStorage.getItem(migKey)) {
            updateDoc(docSnap.ref, { apiId: normalized.apiId })
              .then(() => localStorage.setItem(migKey, 'true'))
              .catch(() => { });
          }
        }
      });
      setRawAssets(items);
      if (items.length === 0) setLoading(false);
    }, (error) => {
      console.error('[useAssets] Snapshot error:', error);
      setRawAssets([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // ---- Calculate asset values ----
  useEffect(() => {
    const rate = currencyRate || 3.65;

    Promise.all(rawAssets.map(async (asset) => {
      let value = 0;
      let currentPrice = null;
      let profitLoss = null;
      let profitLossPercent = null;

      const priceKey = resolveInternalId(asset) || asset.apiId || asset.symbol;
      const livePrice = priceKey ? livePrices[priceKey] : null;

      if (asset.assetMode === 'QUANTITY' && asset.quantity) {
        if (livePrice) {
          const nativePrice = livePrice.currentPrice;
          const nativeCurrency = livePrice.currency || 'USD';

          const priceInILS = await convertAmount(nativePrice, nativeCurrency, 'ILS', rate);
          const priceInAssetCurrency = await convertAmount(nativePrice, nativeCurrency, asset.currency || 'USD', rate);

          currentPrice = priceInILS;
          value = asset.quantity * priceInILS;

          const costBasis = asset.quantity * (asset.purchasePrice || 0);
          const costBasisILS = await convertAmount(costBasis, asset.currency || 'ILS', 'ILS', rate);

          profitLoss = value - costBasisILS;
          profitLossPercent = costBasisILS > 0 ? (profitLoss / costBasisILS) * 100 : 0;

          return {
            ...asset,
            value,
            currentPrice,
            currentPriceNative: priceInAssetCurrency,
            profitLoss,
            profitLossPercent,
            hasLivePrice: true,
            priceChange24h: livePrice.change24h || null,
          };
        } else {
          const costBasis = asset.quantity * (asset.purchasePrice || 0);
          value = await convertAmount(costBasis, asset.currency || 'ILS', 'ILS', rate);
        }
      } else {
        value = await convertAmount(asset.originalValue || asset.value || 0, asset.currency || 'ILS', 'ILS', rate);
      }

      return {
        ...asset,
        value,
        currentPrice,
        profitLoss,
        profitLossPercent,
        hasLivePrice: false,
        priceChange24h: livePrice?.change24h || null,
      };
    })).then(calculated => {
      setAssets(calculated);
      if (calculated.length > 0) setLoading(false);
    });
  }, [rawAssets, livePrices, currencyRate]);

  // ---- Fetch & persist prices ----
  const refreshPrices = useCallback(async () => {
    if (disableLivePriceUpdates) return;
    if (rawAssets.length === 0) return;

    // Debounce: minimum 3 seconds between syncs
    const now = Date.now();
    if (now - lastSyncRef.current < 3000) return;
    lastSyncRef.current = now;

    const trackable = rawAssets.filter(asset => {
      if (asset.assetMode !== 'QUANTITY') return false;
      if (!asset.apiId && !asset.symbol) return false;
      if (asset.marketDataSource === 'manual') return false;

      // Include TASE assets (browser scraping via Funder/Globes)
      if (asset.marketDataSource === 'tase-local') return true;
      if (asset.apiId?.startsWith('tase:')) return true;
      if (asset.symbol?.endsWith('.TA') && !asset.apiId?.startsWith('yahoo:')) return true;

      // Include crypto assets
      if (asset.assetType === 'CRYPTO' || asset.category === 'קריפטו' || asset.apiId?.startsWith('cg:')) return true;

      // Include other non-manual assets
      if (asset.marketDataSource && asset.marketDataSource !== 'manual') return true;

      return false;
    });

    if (trackable.length === 0) return;

    setPricesLoading(true);
    try {
      const prices = await fetchAssetPricesBatch(trackable);
      setLivePrices(prices);
      setLastPriceUpdate(new Date());

      // ---- INTERNAL LEDGER: Persist to Firestore ----
      if (user && db && Object.keys(prices).length > 0) {
        await persistPricesToFirestore(trackable, prices, user);
      }
    } catch (error) {
      console.error('[useAssets] Price fetch error:', error);
    }
    setPricesLoading(false);
  }, [rawAssets, disableLivePriceUpdates, user]);

  // ---- Auto-refresh on load ----
  useEffect(() => {
    if (rawAssets.length > 0 && !disableLivePriceUpdates) {
      refreshPrices();
    }
  }, [rawAssets.length, disableLivePriceUpdates]);

  // ---- Auto-refresh every 5 minutes ----
  useEffect(() => {
    if (rawAssets.length === 0 || disableLivePriceUpdates) return;

    if (priceRefreshTimeoutRef.current) clearTimeout(priceRefreshTimeoutRef.current);

    const schedule = () => {
      priceRefreshTimeoutRef.current = setTimeout(() => {
        refreshPrices();
        schedule();
      }, 5 * 60 * 1000);
    };
    schedule();

    return () => {
      if (priceRefreshTimeoutRef.current) clearTimeout(priceRefreshTimeoutRef.current);
    };
  }, [rawAssets.length, refreshPrices, disableLivePriceUpdates]);

  // ---- CRUD operations ----
  const addAsset = async (assetData) => {
    if (!user || !db) return;
    const { id, ...data } = assetData;
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'assets'), data);
  };

  const updateAsset = async (assetId, assetData) => {
    if (!user || !db) return;
    const { id, ...data } = assetData;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'assets', assetId), data);
  };

  const deleteAsset = async (assetId) => {
    if (!user || !db) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'assets', assetId));
  };

  const initializeAssets = async () => {
    if (!user || !db) return false;
    try {
      const batch = writeBatch(db);
      const snapshot = await getDocs(collection(db, 'artifacts', appId, 'users', user.uid, 'assets'));
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      INITIAL_ASSETS_SEED.forEach((seed) => {
        const ref = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'assets'));
        batch.set(ref, seed);
      });
      await batch.commit();
      return true;
    } catch (error) {
      console.error('[useAssets] Init error:', error);
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
    lastPriceUpdate,
  };
};

// ==================== FIRESTORE PERSISTENCE ====================

/**
 * Internal Ledger: Save prices to Firestore with daily archiving.
 *
 * On a NEW DAY:
 * - Archives current price as `previousClosePrice`
 * - Saves close date as `lastCloseDate`
 * 
 * Always:
 * - Updates `currentPrice`, `lastUpdated`, `currency`
 * - Calculates real daily P/L from stored baseline (not API data)
 * 
 * This ensures the "שווי לפי היסטוריה" dashboard shows accurate data.
 */
async function persistPricesToFirestore(assets, prices, user) {
  if (!user || !db) return;

  try {
    const batch = writeBatch(db);
    let ops = 0;

    for (const asset of assets) {
      const priceKey = resolveInternalId(asset);
      const priceData = prices[priceKey];
      if (!priceData || priceData.cached) continue;

      const assetRef = doc(db, 'artifacts', appId, 'users', user.uid, 'assets', asset.id);
      const updates = {};

      // A. Daily Archive Protocol
      const dayChanged = isNewDay(asset.lastUpdated);

      if (dayChanged && asset.currentPrice && asset.currentPrice > 0) {
        // Archive yesterday's closing price
        updates.previousClosePrice = asset.currentPrice;
        updates.lastCloseDate = asset.lastUpdated || serverTimestamp();
      } else if (!asset.previousClosePrice && asset.purchasePrice) {
        // First run: use purchase price as baseline
        updates.previousClosePrice = asset.purchasePrice;
      }

      // B. Calculate real daily change
      const baseline = updates.previousClosePrice || asset.previousClosePrice || asset.purchasePrice;
      let changePct = 0;
      if (baseline && baseline > 0) {
        changePct = ((priceData.currentPrice - baseline) / baseline) * 100;
      } else {
        changePct = priceData.change24h || 0;
      }

      // C. Currency conversion if needed
      const apiCurrency = priceData.currency || 'USD';
      const targetCurrency = asset.currency || apiCurrency;
      let finalPrice = priceData.currentPrice;

      if (apiCurrency !== targetCurrency) {
        try {
          finalPrice = await convertAmount(priceData.currentPrice, apiCurrency, targetCurrency);
        } catch {
          // Use unconverted price as fallback
        }
      }

      // D. Write updates
      updates.currentPrice = finalPrice;
      updates.priceChange24h = changePct;
      updates.lastUpdated = serverTimestamp();
      updates.currency = targetCurrency;

      // Only write if price actually changed
      const priceDiff = Math.abs((asset.currentPrice || 0) - finalPrice);
      if (priceDiff > 0.0001 || dayChanged) {
        batch.update(assetRef, updates);
        ops++;
      }

      // Firestore batch limit
      if (ops >= 490) {
        await batch.commit();
        ops = 0;
      }
    }

    if (ops > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.error('[LEDGER] Firestore persistence error:', error);
    // Don't throw — prices were fetched successfully even if save failed
  }
}
