import { useState, useCallback, useRef } from 'react';
import { doc, writeBatch, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { fetchAssetPricesBatch, isAssetPriceStale } from '../services/priceService';
import { resolveInternalId } from '../services/internalIds';

/**
 * Check if a date is from a previous day
 * CRITICAL: This determines when to archive prices
 * @param {Timestamp|Date|number|string} lastUpdatedTimestamp - Last update timestamp
 * @returns {boolean} True if the last update was on a previous day
 */
const isNewDay = (lastUpdatedTimestamp) => {
    if (!lastUpdatedTimestamp) return true;
    
    // Convert Firestore Timestamp to Date
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
        return true; // Unknown format - treat as new day
    }
    
    const today = new Date();
    
    // Compare dates (ignore time)
    return (
        lastDate.getDate() !== today.getDate() ||
        lastDate.getMonth() !== today.getMonth() ||
        lastDate.getFullYear() !== today.getFullYear()
    );
};

/**
 * Price Synchronization Hook with Internal Ledger
 * 
 * NEW FEATURES:
 * - Archives previous prices before updating (Internal Ledger)
 * - Calculates real daily P/L from stored data instead of API
 * - Smart caching and stale detection
 * - Firestore persistence with batch writes
 * 
 * @param {Array} assets - Array of asset objects
 * @param {Object} user - Firebase user object
 * @param {Object} options - Optional configuration
 * @param {number} options.maxAgeMinutes - Maximum age before refresh (default: 5)
 * @param {boolean} options.autoSave - Auto-save to Firestore (default: true)
 * @param {Function} options.onPriceUpdate - Callback when prices update (optional)
 * 
 * @returns {Object} { syncPrices, isSyncing, lastSync, syncProgress, error }
 */
export const usePriceSync = (assets, user, options = {}) => {
    const {
        maxAgeMinutes = 5,
        autoSave = true,
        onPriceUpdate = null
    } = options;

    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(null);
    const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
    const [error, setError] = useState(null);

    // Debounce timer
    const syncTimeoutRef = useRef(null);
    const lastSyncRequestRef = useRef(0);

    /**
     * Sync prices for assets with Internal Ledger archiving
     * Only fetches assets with stale prices
     * Archives previous prices before updating (prevents data loss)
     */
    const syncPrices = useCallback(async (forceRefresh = false) => {
        // Debouncing: prevent rapid successive calls (minimum 2 seconds)
        const now = Date.now();
        if (now - lastSyncRequestRef.current < 2000) {
            console.log('[PRICE SYNC] Debounced - request too soon');
            return;
        }
        lastSyncRequestRef.current = now;

        // Clear any pending sync
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }

        if (!assets || assets.length === 0) {
            console.log('[PRICE SYNC] No assets to sync');
            return;
        }

        // Filter trackable assets (exclude manual/LEGACY mode assets)
        const trackableAssets = assets.filter(asset =>
            asset.assetMode !== 'LEGACY' &&
            asset.assetType !== 'MANUAL' &&
            asset.marketDataSource &&
            asset.marketDataSource !== 'manual' &&
            (asset.apiId || asset.symbol)
        );

        if (trackableAssets.length === 0) {
            console.log('[PRICE SYNC] No trackable assets');
            return;
        }

        // Filter stale assets (unless force refresh)
        const assetsToSync = forceRefresh
            ? trackableAssets
            : trackableAssets.filter(asset => isAssetPriceStale(asset, maxAgeMinutes));

        if (assetsToSync.length === 0) {
            console.log('[PRICE SYNC] All prices are fresh');
            return;
        }

        setIsSyncing(true);
        setError(null);
        setSyncProgress({ current: 0, total: assetsToSync.length });

        try {
            console.log(`[PRICE SYNC] Syncing ${assetsToSync.length} assets...`);

            // Fetch prices with smart caching and batching
            const prices = await fetchAssetPricesBatch(assetsToSync, {
                maxAgeMinutes,
                forceRefresh,
                globalBatchSize: 20
            });

            const priceCount = Object.keys(prices).length;
            console.log(`[PRICE SYNC] Received ${priceCount} price updates`);

            // Call onPriceUpdate callback if provided
            if (onPriceUpdate && typeof onPriceUpdate === 'function') {
                onPriceUpdate(prices);
            }

            // Save to Firestore with Internal Ledger logic
            if (autoSave && user && db) {
                await savePricesToFirestoreWithLedger(assetsToSync, prices, user);
            }

            setSyncProgress({ current: priceCount, total: assetsToSync.length });
            setLastSync(new Date());
            console.log('[PRICE SYNC] ✅ Sync complete');
        } catch (err) {
            console.error('[PRICE SYNC] Error syncing prices:', err);
            setError(err.message || 'Failed to sync prices');
        } finally {
            setIsSyncing(false);
        }
    }, [assets, user, maxAgeMinutes, autoSave, onPriceUpdate]);

    return {
        syncPrices,
        isSyncing,
        lastSync,
        syncProgress,
        error
    };
};

/**
 * INTERNAL LEDGER: Save prices to Firestore with archiving
 * Archives previous prices before updating to prevent data loss
 * Calculates real daily P/L from stored data
 * 
 * @param {Array} assets - Assets to update
 * @param {Object} prices - Price data from API
 * @param {Object} user - Firebase user
 */
async function savePricesToFirestoreWithLedger(assets, prices, user) {
    if (!user || !db) {
        console.warn('[INTERNAL LEDGER] Cannot save - user or db not available');
        return;
    }

    try {
        const batch = writeBatch(db);
        let batchCount = 0;
        let archiveCount = 0;
        let updateCount = 0;

        for (const asset of assets) {
            const priceKey = resolveInternalId(asset);
            const priceData = prices[priceKey];

            if (!priceData || priceData.cached) continue;

            const assetRef = doc(db, 'artifacts', appId, 'users', user.uid, 'assets', asset.id);
            
            // --- THE INTERNAL LEDGER LOGIC ---
            const updates = {};
            const isDayChange = isNewDay(asset.lastUpdated);

            // A. Handle Price History (Archive Protocol)
            if (isDayChange && asset.currentPrice && asset.currentPrice > 0) {
                // It's a new day! Archive yesterday's price
                updates.previousClosePrice = asset.currentPrice;
                updates.lastCloseDate = asset.lastUpdated || serverTimestamp();
                archiveCount++;
                console.log(`[LEDGER] New day for ${asset.symbol || asset.name}. Archived: ${asset.currentPrice}`);
            } else if (!asset.previousClosePrice && asset.purchasePrice) {
                // First run: use purchase price as baseline
                updates.previousClosePrice = asset.purchasePrice;
                console.log(`[LEDGER] Initializing baseline for ${asset.symbol || asset.name}: ${asset.purchasePrice}`);
            }

            // B. Calculate REAL Daily Change (Internal Calculation)
            // Instead of trusting API changePct, calculate: (Current - Previous) / Previous
            const baselinePrice = updates.previousClosePrice || asset.previousClosePrice || asset.purchasePrice;
            let calculatedChangePct = 0;
            
            if (baselinePrice && baselinePrice > 0) {
                calculatedChangePct = ((priceData.currentPrice - baselinePrice) / baselinePrice) * 100;
            } else {
                // Fallback to API data if we have no baseline
                calculatedChangePct = priceData.change24h || 0;
            }

            // C. Convert Price to Asset's Currency
            // CRITICAL FIX: priceData.currentPrice is in priceData.currency (e.g., 'USD')
            // But we need to store it in asset.currency (e.g., 'USD' or 'ILS')
            // If they match, no conversion needed. Otherwise, convert.
            const { convertAmount } = await import('../services/currency');
            const apiCurrency = priceData.currency || 'USD';
            const targetCurrency = asset.currency || apiCurrency;
            
            let convertedPrice = priceData.currentPrice;
            if (apiCurrency !== targetCurrency) {
                try {
                    convertedPrice = await convertAmount(
                        priceData.currentPrice,
                        apiCurrency,
                        targetCurrency
                    );
                    console.log(`[LEDGER] Converted price for ${asset.symbol || asset.name}: ${priceData.currentPrice} ${apiCurrency} → ${convertedPrice.toFixed(2)} ${targetCurrency}`);
                } catch (error) {
                    console.error(`[LEDGER] Error converting price for ${asset.symbol}:`, error);
                    // Fallback: use original price without conversion
                }
            }

            // D. Update Current Data
            updates.currentPrice = convertedPrice;  // Store in asset's currency
            updates.priceChange24h = calculatedChangePct; // OUR calculated change
            updates.lastUpdated = serverTimestamp();
            updates.currency = targetCurrency;  // Keep asset's currency consistent
            
            // Only update if price actually changed or it's a forced refresh
            const priceDiff = Math.abs((asset.currentPrice || 0) - convertedPrice);
            if (priceDiff > 0.0001) {
                batch.update(assetRef, updates);
                batchCount++;
                updateCount++;
            }

            // Firestore batch limit: 500 operations
            if (batchCount >= 500) {
                await batch.commit();
                console.log(`[INTERNAL LEDGER] Committed batch (500 operations)`);
                batchCount = 0;
            }
        }

        // Commit final batch
        if (batchCount > 0) {
            await batch.commit();
            console.log(`[INTERNAL LEDGER] ✅ Saved ${updateCount} prices, archived ${archiveCount} previous prices`);
        }
    } catch (error) {
        console.error('[INTERNAL LEDGER] Error saving to Firestore:', error);
        // Don't throw - price sync succeeded even if save failed
    }
}








// import { useState, useCallback, useRef } from 'react';
// import { db } from '../config/firebase'; // וודא שהנתיב תואם לפרויקט שלך
// import { writeBatch, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
// import { fetchAssetPricesBatch, isAssetPriceStale } from '../services/priceService';
// import { useAuth } from '../context/AuthContext'; // או ה-Hook שנותן לך את ה-User

// /**
//  * Hook לסנכרון מחירים חכם עם ניהול היסטוריה (Internal Ledger)
//  * מבצע: Split Routing, Smart Caching, Daily Snapshot
//  */
// export const usePriceSync = (assets = []) => {
//   const { user } = useAuth();
//   const [isSyncing, setIsSyncing] = useState(false);
//   const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
//   const [lastSync, setLastSync] = useState(null);
//   const [error, setError] = useState(null);
  
//   // Debounce ref to prevent double-firing
//   const lastSyncRequestRef = useRef(0);

//   /**
//    * Helper: Check if date is from a previous day
//    */
//   const isNewDay = (lastUpdatedTimestamp) => {
//     if (!lastUpdatedTimestamp) return true;
    
//     // Convert Firestore Timestamp to Date
//     const lastDate = lastUpdatedTimestamp instanceof Timestamp 
//       ? lastUpdatedTimestamp.toDate() 
//       : new Date(lastUpdatedTimestamp);
      
//     const today = new Date();
    
//     return (
//       lastDate.getDate() !== today.getDate() ||
//       lastDate.getMonth() !== today.getMonth() ||
//       lastDate.getFullYear() !== today.getFullYear()
//     );
//   };

//   /**
//    * Main Sync Function
//    * @param {boolean} forceRefresh - If true, ignores cache (5 min rule)
//    */
//   const syncPrices = useCallback(async (forceRefresh = false) => {
//     if (!user || assets.length === 0) return;

//     // 1. Debouncing (Min 2 seconds between syncs)
//     const now = Date.now();
//     if (now - lastSyncRequestRef.current < 2000) {
//       console.log('[PRICE SYNC] Debounced - request too soon');
//       return;
//     }
//     lastSyncRequestRef.current = now;

//     setIsSyncing(true);
//     setError(null);

//     try {
//       // 2. Identify Stale Assets (Only update what needs updating)
//       // Manual assets are ignored automatically
//       const assetsToUpdate = assets.filter(asset => {
//         if (asset.assetType === 'MANUAL' || asset.marketDataSource === 'manual') return false;
//         return forceRefresh || isAssetPriceStale(asset); // Uses the helper from priceService
//       });

//       if (assetsToUpdate.length === 0) {
//         console.log('[PRICE SYNC] All assets are fresh. No sync needed.');
//         setIsSyncing(false);
//         return;
//       }

//       console.log(`[PRICE SYNC] Syncing ${assetsToUpdate.length} assets...`);
//       setSyncProgress({ current: 0, total: assetsToUpdate.length });

//       // 3. Fetch New Prices (Split Routing happens inside fetchAssetPricesBatch)
//       const newPrices = await fetchAssetPricesBatch(assetsToUpdate);
      
//       // 4. Batch Write to Firestore (The Internal Ledger Logic)
//       const batch = writeBatch(db);
//       let updateCount = 0;

//       for (const asset of assetsToUpdate) {
//         // Find the matching result by Internal ID (e.g. "tase:123" or "yahoo:AAPL")
//         // Note: fetchAssetPricesBatch returns a map keyed by Internal ID
//         // We need to resolve the ID again or rely on the fact that we have the map
//         // Let's iterate the results to be safe
        
//         // Find result for this asset (Logic depends on how fetchAssetPricesBatch returns keys)
//         // Usually keys are "tase:12345" or "yahoo:AAPL"
//         const assetInternalId = asset.apiId || asset.symbol; // Fallback
//         // Better logic: match by matching symbol/apiId in the result values
        
//         const priceData = Object.values(newPrices).find(p => 
//           p.symbol === asset.symbol || p.symbol === asset.apiId
//         );

//         if (!priceData) continue;

//         const assetRef = doc(db, 'users', user.uid, 'assets', asset.id);
        
//         // --- THE INTERNAL LEDGER LOGIC ---
//         const updates = {};
//         const isDayChange = isNewDay(asset.lastUpdated);

//         // A. Handle Price History (Archive Protocol)
//         if (isDayChange && asset.currentPrice > 0) {
//           // It's a new day! Archive yesterday's price
//           updates.previousClosePrice = asset.currentPrice;
//           updates.lastCloseDate = asset.lastUpdated || serverTimestamp();
          
//           console.log(`[LEDGER] New day for ${asset.symbol}. Archived price: ${asset.currentPrice}`);
//         } else {
//           // Same day - keep existing previousClose (or set it if missing)
//            if (!asset.previousClosePrice && asset.purchasePrice) {
//                // Fallback for first run: use purchase price as baseline
//                updates.previousClosePrice = asset.purchasePrice; 
//            }
//         }

//         // B. Calculate REAL Daily Change (Internal Calculation)
//         // Instead of trusting API changePct, we calculate: (Current - Previous) / Previous
//         const baselinePrice = updates.previousClosePrice || asset.previousClosePrice || asset.purchasePrice;
//         let calculatedChangePct = 0;
        
//         if (baselinePrice > 0) {
//           calculatedChangePct = ((priceData.currentPrice - baselinePrice) / baselinePrice) * 100;
//         } else {
//             // Fallback to API data if we have no baseline
//             calculatedChangePct = priceData.change24h || 0;
//         }

//         // C. Update Current Data
//         updates.currentPrice = priceData.currentPrice;
//         updates.priceChange24h = calculatedChangePct; // We send OUR calculated change
//         updates.lastUpdated = serverTimestamp(); // Firestore server time
//         updates.currency = priceData.currency || 'USD';
        
//         // Only update if price actually changed or it's a forced refresh
//         if (forceRefresh || Math.abs(asset.currentPrice - priceData.currentPrice) > 0.0001) {
//             batch.update(assetRef, updates);
//             updateCount++;
//         }
//       }

//       if (updateCount > 0) {
//         await batch.commit();
//         console.log(`[PRICE SYNC] Successfully updated ${updateCount} assets in Firestore.`);
//       }

//       setLastSync(new Date());
//       setSyncProgress({ current: assetsToUpdate.length, total: assetsToUpdate.length });

//     } catch (err) {
//       console.error('[PRICE SYNC ERROR]', err);
//       setError(err.message);
//     } finally {
//       setIsSyncing(false);
//     }
//   }, [user, assets]);

//   return { 
//     syncPrices, 
//     isSyncing, 
//     lastSync, 
//     syncProgress, 
//     error 
//   };
// };
