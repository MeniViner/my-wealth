/**
 * Internal ID Resolution Service
 * Single source of truth for converting assets to internal ID format
 * 
 * Internal ID Format:
 * - Crypto: cg:<coingeckoId>
 * - Yahoo: yahoo:<symbol> (e.g., yahoo:AAPL, yahoo:^GSPC)
 * - TASE: tase:<securityNumber> (e.g., tase:1183441)
 */

/**
 * Check if a string is a numeric security ID (TASE format)
 * @param {string} str - String to check
 * @returns {boolean} True if string is numeric (TASE security number)
 */
export function isNumericSecurityId(str) {
  if (!str || typeof str !== 'string') return false;
  // Remove any prefix if present
  const clean = str.replace(/^(tase:|yahoo:|cg:)/, '');
  // Check if it's a pure numeric string (6-7 digits typical for TASE)
  return /^\d{4,10}$/.test(clean);
}

/**
 * Migrate legacy TASE IDs to correct format
 * Converts yahoo:1183441 or yahoo:1183441.TA to tase:1183441
 * @param {string} id - ID to migrate
 * @returns {string} Migrated ID
 */
export function migrateLegacyTaseId(id) {
  if (!id || typeof id !== 'string') return id;

  // Match yahoo:<digits> or yahoo:<digits>.TA
  const legacyTasePattern = /^yahoo:(\d+)(\.TA)?$/;
  const match = id.match(legacyTasePattern);

  if (match) {
    const securityNumber = match[1];
    return `tase:${securityNumber}`;
  }

  return id;
}

/**
 * Resolve internal ID from asset or ID string
 * This is the single source of truth for ID format conversion
 * 
 * @param {Object|string} assetOrId - Asset object or ID string
 * @param {string} fallbackSource - Optional fallback source hint ('tase' | 'yahoo' | 'coingecko')
 * @returns {string|null} Internal ID in format "cg:...", "yahoo:...", or "tase:..."
 */
export function resolveInternalId(assetOrId, fallbackSource = null) {
  // Handle string input (already formatted ID)
  if (typeof assetOrId === 'string') {
    const id = assetOrId.trim();

    // Migrate legacy TASE IDs first
    const migratedId = migrateLegacyTaseId(id);
    if (migratedId !== id) {
      return migratedId;
    }

    // If already has prefix, return as-is
    if (id.startsWith('cg:') || id.startsWith('yahoo:') || id.startsWith('tase:')) {
      return id;
    }

    // If numeric and fallback is TASE, treat as TASE
    if (fallbackSource === 'tase' || isNumericSecurityId(id)) {
      return `tase:${id}`;
    }

    // Default to yahoo for string IDs
    return `yahoo:${id}`;
  }

  // Handle asset object
  if (!assetOrId || typeof assetOrId !== 'object') {
    return null;
  }

  const asset = assetOrId;

  // Rule A: If apiId already has prefix, use it
  if (asset.apiId) {
    if (asset.apiId.startsWith('cg:') ||
      asset.apiId.startsWith('yahoo:') ||
      asset.apiId.startsWith('tase:')) {
      return asset.apiId;
    }
  }

  // Rule B: Crypto - CoinGecko (check BEFORE defaulting to Yahoo)
  // This must come before TASE and Yahoo rules to properly identify crypto
  if (asset.marketDataSource === 'coingecko' ||
    asset.type === 'CRYPTO' ||
    asset.assetType === 'CRYPTO' ||
    asset.category === 'קריפטו') {
    const coinId = asset.apiId || asset.coingeckoId || asset.symbol;
    if (coinId) {
      // Remove any existing prefix
      const cleanId = coinId.replace(/^cg:/, '').replace(/^yahoo:/, '').replace(/^tase:/, '');
      return `cg:${cleanId}`;
    }
  }

  // Rule C: TASE - Israeli stocks
  // Check multiple indicators for TASE assets
  const isTASE =
    asset.marketDataSource === 'tase-local' ||
    asset.marketDataSource === 'tase' ||
    asset.exchange === 'TASE' ||
    asset.provider === 'tase-local' ||
    (asset.currency === 'ILS' && isNumericSecurityId(asset.apiId || asset.symbol)) ||
    (asset.symbol && asset.symbol.endsWith('.TA') && isNumericSecurityId(asset.apiId));

  if (isTASE) {
    // Extract security number from various fields
    const securityNumber =
      asset.securityId ||
      asset.extra?.securityNumber ||
      asset.taseSecurityNumber ||
      asset.apiId ||
      asset.symbol;

    if (securityNumber) {
      // Remove any prefix and .TA suffix
      const clean = String(securityNumber)
        .replace(/^(tase:|yahoo:|cg:)/, '')
        .replace(/\.TA$/, '');

      if (isNumericSecurityId(clean)) {
        return `tase:${clean}`;
      }
    }
  }

  // Rule D: Default to Yahoo (stocks, indices, ETFs)
  const symbol = asset.apiId || asset.symbol;
  if (symbol) {
    // If symbol already contains ":", return as-is (might be formatted)
    if (symbol.includes(':')) {
      return symbol;
    }
    return `yahoo:${symbol}`;
  }

  return null;
}

/**
 * Normalize an asset's apiId to ensure it has the correct prefix
 * This is used for backward compatibility when loading assets from Firestore
 * Also migrates legacy TASE IDs (yahoo:1183441 -> tase:1183441)
 * 
 * @param {Object} asset - Asset object
 * @returns {Object} Asset with normalized apiId
 */
export function normalizeAssetApiId(asset) {
  if (!asset) return asset;

  // First, migrate legacy TASE IDs in apiId
  let apiId = asset.apiId;
  if (apiId && typeof apiId === 'string') {
    apiId = migrateLegacyTaseId(apiId);
  }

  // Then resolve using the full asset context
  const normalizedId = resolveInternalId({ ...asset, apiId });

  if (normalizedId && normalizedId !== asset.apiId) {
    return {
      ...asset,
      apiId: normalizedId,
      // Also update securityId if it's a TASE asset
      ...(normalizedId.startsWith('tase:') && {
        securityId: normalizedId.replace('tase:', ''),
        marketDataSource: asset.marketDataSource || 'tase-local'
      })
    };
  }

  // Even if apiId didn't change, ensure it's migrated
  if (apiId && apiId !== asset.apiId) {
    return {
      ...asset,
      apiId: apiId
    };
  }

  return asset;
}
