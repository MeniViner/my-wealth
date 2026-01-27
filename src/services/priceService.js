/**
 * Price Service - Strategy Pattern Implementation
 * ================================================
 * COMPLETE REWRITE: Eliminates fragile threshold logic with robust Strategy Pattern
 * 
 * Architecture:
 * - TASEStrategy: Israeli assets (ALWAYS /100 for non-INDEX, ALWAYS ILS)
 * - GlobalStrategy: US/International assets (As-Is, USD)
 * - CryptoStrategy: Cryptocurrency (As-Is, USD)
 * 
 * Critical Rules:
 * - NO magic thresholds (500, 100, etc.)
 * - Price normalization happens in strategy, NOT in data fetchers
 * - Currency is hardcoded per strategy
 * - Waterfall fallback: TASE failures retry with GlobalStrategy
 */

import { getQuotes, getHistory } from './backendApi';
import { resolveInternalId } from './internalIds';

// Debug flag for price fetching
const DEBUG_PRICES = import.meta.env.DEV;

// In-memory cache for price data
const priceCache = new Map();
const PRICE_CACHE_DURATION = 60 * 1000; // 1 minute for prices
const HISTORY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for history

// ==================== CACHE HELPERS ====================

const getCachedPrice = (key) => {
  const cached = priceCache.get(key);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > PRICE_CACHE_DURATION) {
    priceCache.delete(key);
    return null;
  }

  return cached.data;
};

const setCachedPrice = (key, data) => {
  priceCache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Fetch with Proxy Rotation fallback
 * Tries primary proxy (corsproxy.io), then backup (allorigins.win)
 */
async function fetchWithFallbackProxy(targetUrl, options = {}) {
  // 1. corsproxy.io (fast, sometimes blocked in production)
  const proxy1 = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

  // 2. allorigins.win (slower, but very reliable as backup)
  const proxy2 = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

  try {
    const res1 = await fetch(proxy1, options);
    if (res1.ok) return res1;
    console.warn(`[PROXY] Primary failed for ${targetUrl}, trying backup...`);
  } catch (e) {
    console.warn(`[PROXY] Primary error for ${targetUrl}:`, e.message);
  }

  // Backup (GET only) - allorigins supports only GET
  if (!options.method || options.method === 'GET') {
    try {
      console.log(`[PROXY] Trying backup for ${targetUrl}...`);
      const res2 = await fetch(proxy2);
      if (res2.ok) {
        const json = await res2.json();
        return new Response(json.contents, { status: 200 });
      }
    } catch (e2) {
      console.error(`[PROXY] Backup failed for ${targetUrl}`);
    }
  }

  return { ok: false };
}

/**
 * Check if an asset's price is stale and needs refreshing
 */
export const isAssetPriceStale = (asset, maxAgeMinutes = 5) => {
  if (!asset || !asset.lastUpdated) return true;

  let lastUpdatedTime;
  if (asset.lastUpdated.toDate && typeof asset.lastUpdated.toDate === 'function') {
    lastUpdatedTime = asset.lastUpdated.toDate().getTime();
  } else if (asset.lastUpdated instanceof Date) {
    lastUpdatedTime = asset.lastUpdated.getTime();
  } else {
    lastUpdatedTime = new Date(asset.lastUpdated).getTime();
  }

  const ageMs = Date.now() - lastUpdatedTime;
  const maxAgeMs = maxAgeMinutes * 60 * 1000;

  return ageMs > maxAgeMs;
};

// ==================== TASE DATA FETCHERS ====================
// These functions fetch RAW data from Funder/Globes
// NO price normalization here - that happens in TASEStrategy

async function fetchTasePriceFromGlobes(securityId) {
  try {
    const targetUrl = "https://www.globes.co.il/Portal/Handlers/GTOFeeder.ashx";
    const proxyUrl = `https://corsproxy.io/?${targetUrl}`;
    const body = `instrumentId=${securityId}&type=49`;

    console.log(`[GLOBES] Fetching ${securityId}...`);

    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body
    });

    if (!response.ok) {
      console.warn(`[GLOBES] HTTP error ${response.status}`);
      return null;
    }

    const json = await response.json();
    const securityData = json?.[0]?.Table?.Security?.[0];

    if (!securityData) {
      console.warn(`[GLOBES] Structure mismatch for ${securityId}`);
      return null;
    }

    // Extract RAW price (in Agorot) - NO normalization here
    const price = parseFloat(String(securityData.LastDealRate));
    const changePct = parseFloat(securityData.BaseRateChangePercentage || 0);
    const name = securityData.HebName || securityData.EngName;

    console.log(`[GLOBES] ✅ Success for ${securityId}: RAW price ${price} Agorot`);

    return {
      price,        // RAW Agorot value
      changePct,
      name,
      currency: 'ILS'
    };
  } catch (e) {
    console.warn(`[GLOBES] Fetch failed for ${securityId}:`, e.message);
    return null;
  }
}

async function fetchTasePriceFromFunder(securityId) {
  try {
    const funderUrl = `https://www.funder.co.il/fund/${securityId}`;
    console.log(`[FUNDER] Fetching ${securityId}...`);

    const response = await fetchWithFallbackProxy(funderUrl);
    if (!response.ok) return null;

    const html = await response.text();

    const priceMatch = html.match(/"buyPrice"\s*:\s*([\d\.]+)/);
    if (!priceMatch) return null;

    // Extract RAW price (in Agorot) - NO normalization here
    const price = parseFloat(priceMatch[1]);
    const changeMatch = html.match(/"1day"\s*:\s*([-\d\.]+)/);
    const changePct = changeMatch ? parseFloat(changeMatch[1]) : 0;

    // Extract name
    let name = null;
    const nameMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
      html.match(/<meta property="og:title" content="([^"]*)"/i);

    if (nameMatch && nameMatch[1]) {
      name = nameMatch[1]
        .replace(/– Funder|– פאנדר|פאנדר|קרן נאמנות:|תעודת סל:/g, '')
        .trim();
    }

    console.log(`[FUNDER] ✅ Success for ${securityId}: RAW price ${price} Agorot`);
    return {
      price,        // RAW Agorot value
      changePct,
      name,
      currency: 'ILS'
    };
  } catch (e) {
    console.warn(`[FUNDER] Fetch failed for ${securityId}:`, e.message);
    return null;
  }
}

/**
 * Main TASE fetcher: Funder → Globes waterfall
 * Returns RAW data (price in Agorot)
 */
async function fetchTasePriceFromBrowser(securityId) {
  // 1. Try Funder (with proxy rotation)
  let data = await fetchTasePriceFromFunder(securityId);
  if (data) return { ...data, source: 'funder-browser' };

  // 2. Try Globes
  console.log(`[BROWSER FALLBACK] Funder failed for ${securityId}, trying Globes...`);
  data = await fetchTasePriceFromGlobes(securityId);
  if (data) return { ...data, source: 'globes-browser' };

  // 3. Failed
  return null;
}

// ==================== STRATEGY PATTERN IMPLEMENTATION ====================

/**
 * TASE Strategy - Israeli Assets
 * 
 * Rules:
 * - Data source: Browser (Funder/Globes)
 * - Price: ALWAYS divide by 100 (Agorot → Shekels)
 *   EXCEPTION: If assetType === 'INDEX', do NOT divide (indices are points, not Agorot)
 * - Currency: ALWAYS 'ILS'
 */
class TASEStrategy {
  static canHandle(asset) {
    const internalId = resolveInternalId(asset);
    return (
      asset.marketDataSource === 'tase-local' ||
      internalId?.startsWith('tase:') ||
      (asset.symbol && asset.symbol.endsWith('.TA'))
    );
  }

  static async execute(asset) {
    try {
      const internalId = resolveInternalId(asset);
      const securityId = internalId.startsWith('tase:')
        ? internalId.substring(5)
        : asset.apiId || asset.symbol;

      if (DEBUG_PRICES) {
        console.log(`[TASE STRATEGY] Fetching ${securityId}...`);
      }

      const browserData = await fetchTasePriceFromBrowser(securityId);

      if (!browserData || !browserData.price) {
        console.warn(`[TASE STRATEGY] Failed to fetch ${securityId}`);
        return null;
      }

      // CRITICAL: Price normalization with INDEX exception
      let normalizedPrice = browserData.price;

      // RULE: Divide by 100 for everything EXCEPT indices
      if (asset.assetType !== 'INDEX') {
        normalizedPrice = browserData.price / 100;
        if (DEBUG_PRICES) {
          console.log(`[TASE STRATEGY] Normalized ${securityId}: ${browserData.price} Agorot → ${normalizedPrice} NIS`);
        }
      } else {
        if (DEBUG_PRICES) {
          console.log(`[TASE STRATEGY] INDEX detected for ${securityId}: keeping price as-is (${normalizedPrice} points)`);
        }
      }

      // Name repair logic
      const symbol = asset.apiId || asset.symbol || '';
      let finalName = asset.name || asset.symbol;
      const genericTitle = "פורטל קרנות";

      if (browserData.name && (!finalName || finalName.includes(genericTitle))) {
        finalName = browserData.name;
      }

      return {
        symbol: symbol,
        name: finalName,
        currentPrice: normalizedPrice,  // Normalized price
        currency: 'ILS',                 // Always ILS
        change24h: browserData.changePct || 0,
        changeAmount: (normalizedPrice * (browserData.changePct || 0)) / 100,
        lastUpdated: new Date(),
        source: browserData.source || 'funder-browser',
        assetType: asset.assetType || 'STOCK',
      };
    } catch (error) {
      console.error(`[TASE STRATEGY] Error fetching TASE asset:`, error);
      return null;
    }
  }
}

/**
 * Global Strategy - US/International Assets
 * 
 * Rules:
 * - Data source: Backend API (Yahoo Finance)
 * - Price: As-Is (no normalization)
 * - Currency: USD by default, ILS if symbol ends with .TA
 */
class GlobalStrategy {
  static canHandle(asset) {
    // Handles everything that's not TASE or Crypto
    return !TASEStrategy.canHandle(asset) && !CryptoStrategy.canHandle(asset);
  }

  static async execute(asset) {
    try {
      const internalId = resolveInternalId(asset);
      if (!internalId) return null;

      if (DEBUG_PRICES) {
        console.log(`[GLOBAL STRATEGY] Fetching ${internalId}...`);
      }

      const quotes = await getQuotes([internalId]);
      const validQuotes = quotes.filter(q =>
        q &&
        !q.error &&
        typeof q.price === 'number' &&
        !isNaN(q.price) &&
        q.price > 0
      );

      if (validQuotes.length === 0) {
        const errorQuote = quotes.find(q => q && q.error);
        if (errorQuote && DEBUG_PRICES) {
          console.warn(`[GLOBAL STRATEGY] Quote error for ${internalId}:`, errorQuote.error);
        }
        return null;
      }

      const quote = validQuotes[0];

      // Determine asset type
      const symbol = asset.symbol || asset.apiId || '';
      let assetType = 'STOCK';
      if (symbol.startsWith('^') || internalId.startsWith('yahoo:^')) {
        assetType = 'INDEX';
      } else if (asset.assetType === 'ETF') {
        assetType = 'ETF';
      }

      // Currency: USD by default, ILS if .TA symbol
      let currency = quote.currency || 'USD';
      if (asset.symbol && asset.symbol.endsWith('.TA')) {
        currency = 'ILS';
      }

      return {
        symbol: symbol,
        name: asset.name || symbol,
        currentPrice: quote.price,      // As-Is
        currency: currency,
        change24h: quote.changePct || 0,
        changeAmount: (quote.price * (quote.changePct || 0)) / 100,
        lastUpdated: new Date(quote.timestamp || Date.now()),
        source: 'yahoo',
        assetType: assetType,
      };
    } catch (error) {
      console.error('[GLOBAL STRATEGY] Error fetching price:', error);
      return null;
    }
  }
}

/**
 * Crypto Strategy - Cryptocurrency Assets
 * 
 * Rules:
 * - Data source: Backend API (CoinGecko)
 * - Price: As-Is (no normalization)
 * - Currency: Always USD
 */
class CryptoStrategy {
  static canHandle(asset) {
    const internalId = resolveInternalId(asset);
    return (
      asset.marketDataSource === 'coingecko' ||
      asset.assetType === 'CRYPTO' ||
      internalId?.startsWith('cg:')
    );
  }

  static async execute(asset) {
    try {
      const internalId = resolveInternalId(asset);
      if (!internalId) return null;

      if (DEBUG_PRICES) {
        console.log(`[CRYPTO STRATEGY] Fetching ${internalId}...`);
      }

      const quotes = await getQuotes([internalId]);
      const validQuotes = quotes.filter(q =>
        q &&
        !q.error &&
        typeof q.price === 'number' &&
        !isNaN(q.price) &&
        q.price > 0
      );

      if (validQuotes.length === 0) {
        const errorQuote = quotes.find(q => q && q.error);
        if (errorQuote && DEBUG_PRICES) {
          console.warn(`[CRYPTO STRATEGY] Quote error for ${internalId}:`, errorQuote.error);
        }
        return null;
      }

      const quote = validQuotes[0];

      return {
        symbol: asset.symbol || asset.apiId || '',
        name: asset.name || asset.symbol,
        currentPrice: quote.price,      // As-Is
        currency: 'USD',                 // Always USD
        change24h: quote.changePct || 0,
        changeAmount: (quote.price * (quote.changePct || 0)) / 100,
        lastUpdated: new Date(quote.timestamp || Date.now()),
        source: 'coingecko',
        assetType: 'CRYPTO',
      };
    } catch (error) {
      console.error('[CRYPTO STRATEGY] Error fetching price:', error);
      return null;
    }
  }
}

/**
 * Strategy Dispatcher
 * Returns the appropriate strategy for a given asset
 */
function getStrategy(asset) {
  if (TASEStrategy.canHandle(asset)) return TASEStrategy;
  if (CryptoStrategy.canHandle(asset)) return CryptoStrategy;
  return GlobalStrategy;
}

// ==================== PUBLIC API ====================

/**
 * Fetch price for a single asset using Strategy Pattern
 */
export const fetchAssetPrice = async (asset) => {
  if (!asset) return null;

  // Manual entry - no live price
  if (asset.marketDataSource === 'manual') {
    return null;
  }

  const strategy = getStrategy(asset);
  const strategyName = strategy.name || 'Unknown';

  if (DEBUG_PRICES) {
    console.log(`[PRICE SERVICE] Using ${strategyName} for asset:`, asset.name || asset.symbol);
  }

  return await strategy.execute(asset);
};

/**
 * Fetch prices for multiple assets (with waterfall fallback)
 * 
 * WATERFALL LOGIC:
 * 1. Group assets by strategy
 * 2. Execute TASE strategy first (browser)
 * 3. If TASE assets fail but have valid symbols, retry with Global strategy (Yahoo .TA)
 * 4. Execute Global and Crypto strategies
 * 5. Merge results
 */
export const fetchAssetPricesBatch = async (assets, options = {}) => {
  if (!assets || assets.length === 0) return {};

  const {
    maxAgeMinutes = 5,
    forceRefresh = false,
    globalBatchSize = 20
  } = options;

  // Step 0: Smart caching - filter out fresh prices
  const assetsToFetch = [];
  const cachedResults = {};

  assets.forEach(asset => {
    if (asset.marketDataSource === 'manual') return;

    const internalId = resolveInternalId(asset);
    if (!internalId) return;

    // Check if asset has fresh price data
    if (!forceRefresh && !isAssetPriceStale(asset, maxAgeMinutes)) {
      if (asset.currentPrice) {
        cachedResults[internalId] = {
          symbol: asset.apiId || asset.symbol || '',
          name: asset.name,
          currentPrice: asset.currentPrice,
          currency: asset.currency || 'ILS',
          change24h: asset.priceChange24h || 0,
          changeAmount: (asset.currentPrice * (asset.priceChange24h || 0)) / 100,
          lastUpdated: asset.lastUpdated,
          source: asset.marketDataSource === 'tase-local' ? 'funder-browser' :
            (asset.assetType === 'CRYPTO' ? 'coingecko' : 'yahoo'),
          assetType: asset.assetType || 'STOCK',
          cached: true
        };
        if (DEBUG_PRICES) {
          console.log(`[CACHE HIT] Using cached price for ${internalId}`);
        }
        return;
      }
    }

    assetsToFetch.push(asset);
  });

  if (DEBUG_PRICES) {
    console.log(`[SMART CACHE] Cached: ${Object.keys(cachedResults).length}, To Fetch: ${assetsToFetch.length}`);
  }

  if (assetsToFetch.length === 0) {
    return cachedResults;
  }

  // Step 1: Group assets by strategy
  const taseAssets = [];
  const globalAssets = [];
  const cryptoAssets = [];
  const assetMap = new Map();

  assetsToFetch.forEach(asset => {
    const internalId = resolveInternalId(asset);
    if (!internalId) return;

    assetMap.set(internalId, asset);

    const strategy = getStrategy(asset);
    if (strategy === TASEStrategy) {
      taseAssets.push({ asset, internalId });
    } else if (strategy === CryptoStrategy) {
      cryptoAssets.push({ asset, internalId });
    } else {
      globalAssets.push({ asset, internalId });
    }
  });

  if (DEBUG_PRICES) {
    console.log(`[STRATEGY ROUTING] TASE: ${taseAssets.length}, Global: ${globalAssets.length}, Crypto: ${cryptoAssets.length}`);
  }

  const results = {};

  // Step 2: Execute TASE strategy (browser-based)
  const tasePromises = taseAssets.map(async ({ asset, internalId }) => {
    const data = await TASEStrategy.execute(asset);

    if (!data) {
      // WATERFALL FALLBACK: Mark for retry with Global strategy
      return {
        key: internalId,
        failed: true,
        asset: asset
      };
    }

    return {
      key: internalId,
      data: data
    };
  });

  const taseResults = await Promise.all(tasePromises);

  // Step 3: WATERFALL FALLBACK - Retry failed TASE with Global strategy
  const failedTaseAssets = taseResults.filter(r => r && r.failed);
  const retryBucket = [];

  if (failedTaseAssets.length > 0) {
    if (DEBUG_PRICES) {
      console.log(`[WATERFALL FALLBACK] ${failedTaseAssets.length} TASE assets failed, retrying with Yahoo...`);
    }

    failedTaseAssets.forEach(({ asset, key }) => {
      const symbol = asset.symbol || asset.apiId;
      if (!symbol) {
        console.warn(`[WATERFALL FALLBACK] Skipping asset without symbol:`, asset.name);
        return;
      }

      // Format for Yahoo: Ensure .TA suffix
      let yahooSymbol = symbol.toString().toUpperCase();
      if (!yahooSymbol.endsWith('.TA')) {
        yahooSymbol = `${yahooSymbol}.TA`;
      }

      const yahooInternalId = `yahoo:${yahooSymbol}`;

      if (DEBUG_PRICES) {
        console.log(`[WATERFALL FALLBACK] Retrying ${symbol} as ${yahooSymbol}`);
      }

      retryBucket.push({
        asset: asset,
        internalId: yahooInternalId,
        originalKey: key,
        yahooSymbol: yahooSymbol
      });
    });
  }

  // Step 4: Execute Global and Crypto strategies (backend API)
  const backendAssets = [...globalAssets, ...cryptoAssets, ...retryBucket];
  let backendQuotes = [];

  if (backendAssets.length > 0) {
    try {
      const backendIds = backendAssets.map(item => item.internalId);

      // Split into batches
      const batches = [];
      for (let i = 0; i < backendIds.length; i += globalBatchSize) {
        batches.push(backendIds.slice(i, i + globalBatchSize));
      }

      if (DEBUG_PRICES) {
        console.log(`[BACKEND API] Fetching ${backendIds.length} assets in ${batches.length} batches...`);
      }

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchQuotes = await getQuotes(batch);
        backendQuotes.push(...batchQuotes);
      }
    } catch (error) {
      console.error('[BACKEND API] Error:', error);
    }
  }

  // Step 5: Merge results
  // Add successful TASE results
  taseResults.forEach(result => {
    if (result && result.key && result.data) {
      results[result.key] = result.data;
    }
  });

  // Create retry map for waterfall results
  const retryMap = new Map();
  retryBucket.forEach(item => {
    retryMap.set(item.internalId, item);
  });

  // Add backend results
  const validBackendQuotes = backendQuotes.filter(q =>
    q &&
    !q.error &&
    typeof q.price === 'number' &&
    !isNaN(q.price) &&
    q.price > 0
  );

  validBackendQuotes.forEach(quote => {
    // Check if this is a retry item (waterfall fallback)
    const retryItem = retryMap.get(quote.id);

    if (retryItem) {
      // Waterfall fallback success - map back to original TASE key
      const asset = retryItem.asset;
      const originalKey = retryItem.originalKey;

      if (DEBUG_PRICES) {
        console.log(`[WATERFALL FALLBACK] ✅ Success! ${retryItem.yahooSymbol} fetched from Yahoo`);
      }

      results[originalKey] = {
        symbol: asset.apiId || asset.symbol || '',
        name: asset.name || retryItem.yahooSymbol,
        currentPrice: quote.price,  // As-Is from Yahoo
        currency: quote.currency || 'ILS',
        change24h: quote.changePct || 0,
        changeAmount: (quote.price * (quote.changePct || 0)) / 100,
        lastUpdated: new Date(quote.timestamp || Date.now()),
        source: 'yahoo-fallback',
        assetType: asset.assetType || 'STOCK',
      };
      return;
    }

    // Regular backend asset (not a retry)
    const asset = assetMap.get(quote.id);
    if (!asset) return;

    const symbol = asset.apiId || asset.symbol || '';
    let assetType = 'STOCK';

    if (symbol.startsWith('^')) {
      assetType = 'INDEX';
    } else if (asset.assetType === 'CRYPTO' || quote.id.startsWith('cg:')) {
      assetType = 'CRYPTO';
    } else if (asset.assetType === 'ETF') {
      assetType = 'ETF';
    }

    results[quote.id] = {
      symbol: symbol,
      name: asset.name || symbol,
      currentPrice: quote.price,  // As-Is
      currency: quote.currency || (assetType === 'CRYPTO' ? 'USD' : 'USD'),
      change24h: quote.changePct || 0,
      changeAmount: (quote.price * (quote.changePct || 0)) / 100,
      lastUpdated: new Date(quote.timestamp || Date.now()),
      source: assetType === 'CRYPTO' ? 'coingecko' : 'yahoo',
      assetType: assetType,
    };
  });

  // Merge cached results with fresh results
  return { ...cachedResults, ...results };
};

// ==================== HISTORICAL DATA ====================

/**
 * Fetch price history for an asset
 * Uses backend API for all asset types
 */
export const fetchPriceHistory = async (asset, timeRange = '1M') => {
  if (!asset) return null;

  const internalId = resolveInternalId(asset);
  if (!internalId) return null;

  const cacheKey = `history:${internalId}:${timeRange}`;
  const cached = getCachedPrice(cacheKey);
  if (cached) return cached;

  try {
    const history = await getHistory(internalId, timeRange);

    if (history && history.length > 0) {
      setCachedPrice(cacheKey, history);
      return history;
    }

    return null;
  } catch (error) {
    console.error('Error fetching price history:', error);
    return null;
  }
};

// ==================== BACKWARD COMPATIBILITY ====================
// Keep legacy functions for backward compatibility

export const fetchCryptoPrice = async (coinId, vsCurrency = 'usd') => {
  const asset = {
    marketDataSource: 'coingecko',
    apiId: coinId,
    symbol: coinId,
    assetType: 'CRYPTO'
  };
  return await fetchAssetPrice(asset);
};

export const fetchCryptoPricesBatch = async (coinIds, vsCurrency = 'usd') => {
  const assets = coinIds.map(id => ({
    marketDataSource: 'coingecko',
    apiId: id,
    symbol: id,
    assetType: 'CRYPTO'
  }));
  return await fetchAssetPricesBatch(assets);
};

export const fetchYahooPrice = async (symbol) => {
  const asset = {
    marketDataSource: 'yahoo',
    apiId: symbol,
    symbol: symbol,
    assetType: 'STOCK'
  };
  return await fetchAssetPrice(asset);
};

export const fetchYahooPricesBatch = async (symbols) => {
  const assets = symbols.map(symbol => ({
    marketDataSource: 'yahoo',
    apiId: symbol,
    symbol: symbol,
    assetType: 'STOCK'
  }));
  return await fetchAssetPricesBatch(assets);
};

// ==================== HISTORICAL PRICES ====================

/**
 * Fetch historical price for an asset on a specific date
 * @param {Object} asset - Asset object
 * @param {Date|string} date - Target date
 * @returns {Promise<number|null>}
 */
export const fetchAssetHistoricalPrice = async (asset, date) => {
  if (!asset || !date) return null;

  const internalId = resolveInternalId(asset);
  if (!internalId) return null;

  // TASE historical data not supported via browser scraping
  const isTaseAsset =
    asset.marketDataSource === 'tase-local' ||
    internalId.startsWith('tase:') ||
    (asset.symbol && asset.symbol.endsWith('.TA'));

  if (isTaseAsset) {
    if (DEBUG_PRICES) {
      console.log(`[HISTORY] TASE historical data not supported for ${internalId}`);
    }
    return null;
  }

  const targetDate = new Date(date);
  const dateStr = targetDate.toISOString().split('T')[0];
  const cacheKey = `history:${internalId}:${dateStr}`;
  const cached = getCachedPrice(cacheKey);
  if (cached) return cached;

  try {
    // Fetch 5-day history range to find the target date
    const history = await getHistory(internalId, '5d', '1d');

    if (!history || !history.points || history.points.length === 0) {
      return null;
    }

    // Find closest point to target date
    const targetTimestamp = targetDate.getTime();
    let closestPoint = null;
    let minDiff = Infinity;

    for (const point of history.points) {
      const diff = Math.abs(point.t - targetTimestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closestPoint = point;
      }
    }

    // Use point if within 24 hours
    if (closestPoint && minDiff < 24 * 60 * 60 * 1000) {
      setCachedPrice(cacheKey, closestPoint.v);
      return closestPoint.v;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching historical price for ${internalId}:`, error);
    return null;
  }
};

// ==================== CURRENCY CONVERSION ====================

/**
 * Exchange rate cache
 */
const exchangeRateCache = {
  rate: null,
  timestamp: null,
  CACHE_DURATION: 60 * 60 * 1000 // 1 hour
};

/**
 * Get USD to ILS exchange rate
 * Uses cached rate if available and fresh
 * @returns {Promise<number>} Exchange rate (USD to ILS)
 */
export const getExchangeRate = async () => {
  const now = Date.now();

  // Return cached rate if still valid
  if (exchangeRateCache.rate && exchangeRateCache.timestamp &&
    (now - exchangeRateCache.timestamp) < exchangeRateCache.CACHE_DURATION) {
    return exchangeRateCache.rate;
  }

  try {
    // Import dynamically to avoid circular dependencies
    const { fetchExchangeRate } = await import('./currency');
    const data = await fetchExchangeRate();

    if (data && data.rate) {
      exchangeRateCache.rate = data.rate;
      exchangeRateCache.timestamp = now;
      return data.rate;
    }

    // Fallback to default rate if API fails
    console.warn('Failed to fetch exchange rate, using default 3.2');
    return 3.2;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return exchangeRateCache.rate || 3.2;
  }
};

/**
 * Convert price from one currency to another
 * @deprecated Use convertAmount from currency.js instead
 * @param {number} price - Price to convert
 * @param {string} fromCurrency - Source currency ('USD' | 'ILS')
 * @param {string} toCurrency - Target currency ('USD' | 'ILS')
 * @returns {Promise<number>} Converted price
 */
export const convertCurrency = async (price, fromCurrency, toCurrency) => {
  const { convertAmount } = await import('./currency');
  return await convertAmount(price, fromCurrency, toCurrency);
};
