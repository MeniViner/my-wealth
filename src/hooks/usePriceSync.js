/**
 * usePriceSync - DEPRECATED
 * 
 * Price synchronization logic has been merged into useAssets.
 * This hook is kept as a thin wrapper for backward compatibility
 * with Dashboard.jsx and AssetManager.jsx imports.
 * 
 * It does NOT fetch prices or write to Firestore — useAssets handles all of that.
 */

import { useState } from 'react';

export const usePriceSync = (assets = [], user = null, options = {}) => {
  const [isSyncing] = useState(false);
  const [lastSync] = useState(null);
  const [syncProgress] = useState({ current: 0, total: 0 });
  const [error] = useState(null);

  // No-op: all price sync logic is now in useAssets
  const syncPrices = async () => {
    console.log('[usePriceSync] DEPRECATED - price sync is handled by useAssets');
  };

  return {
    syncPrices,
    isSyncing,
    lastSync,
    syncProgress,
    error,
  };
};
