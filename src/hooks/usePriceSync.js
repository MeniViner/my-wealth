import { useState, useCallback, useRef } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { fetchAssetPricesBatch, isAssetPriceStale } from '../services/priceService';
import { resolveInternalId } from '../services/internalIds';

/**
 * Price Synchronization Hook
 * Provides a unified interface for syncing asset prices with smart caching,
 * Firestore persistence, and progress tracking.
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
     * Sync prices for assets
     * Only fetches assets with stale prices
     * Automatically saves to Firestore if autoSave is enabled
     */
    const syncPrices = useCallback(async (forceRefresh = false) => {
        // Debouncing: prevent rapid successive calls
        const now = Date.now();
        if (now - lastSyncRequestRef.current < 1000) {
            console.log('[PRICE SYNC] Debounced - too soon since last request');
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

        // Filter trackable assets (those that can have live prices)
        const trackableAssets = assets.filter(asset =>
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
            console.log('[PRICE SYNC] All prices are fresh (< 5 minutes old)');
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

            // Save to Firestore if enabled and user is authenticated
            if (autoSave && user && db) {
                await savePricesToFirestore(assetsToSync, prices, user);
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
 * Helper: Save prices to Firestore
 * Uses batch writes for efficiency (max 500 operations per batch)
 */
async function savePricesToFirestore(assets, prices, user) {
    if (!user || !db) {
        console.warn('[PRICE SYNC] Cannot save to Firestore - user or db not available');
        return;
    }

    try {
        const batch = writeBatch(db);
        let batchCount = 0;
        const batches = [];

        const assetsToUpdate = assets.filter(asset => {
            const priceKey = resolveInternalId(asset);
            return priceKey && prices[priceKey];
        });

        for (const asset of assetsToUpdate) {
            const priceKey = resolveInternalId(asset);
            const priceData = prices[priceKey];

            if (!priceData) continue;

            // Skip cached prices (they're already in Firestore)
            if (priceData.cached) continue;

            const assetRef = doc(db, 'artifacts', appId, 'users', user.uid, 'assets', asset.id);

            batch.update(assetRef, {
                currentPrice: priceData.currentPrice,
                priceChange24h: priceData.change24h,
                lastUpdated: priceData.lastUpdated
            });

            batchCount++;

            // Firestore has a limit of 500 operations per batch
            if (batchCount >= 500) {
                batches.push(batch);
                batchCount = 0;
            }
        }

        // Add final batch if it has operations
        if (batchCount > 0) {
            batches.push(batch);
        }

        // Commit all batches
        if (batches.length > 0) {
            console.log(`[PRICE SYNC] Saving to Firestore (${batches.length} batches)...`);
            await Promise.all(batches.map(b => b.commit()));
            console.log('[PRICE SYNC] ✅ Saved to Firestore');
        }
    } catch (error) {
        console.error('[PRICE SYNC] Error saving to Firestore:', error);
        // Don't throw - price sync succeeded even if save failed
    }
}
