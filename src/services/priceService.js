/**
 * Price Service
 * Fetches live and historical prices via backend API (Vercel Functions)
 * All external API calls are now handled server-side to avoid CORS issues
 */

import { getQuotes, getHistory } from './backendApi';
import { resolveInternalId } from './internalIds';

// ==================== CLIENT-SIDE TASE FALLBACK ====================

/**
 * Fetch TASE price directly from browser using CORS proxy
 * This is a fallback for when the backend API fails to get TASE prices
 * @param {string} securityId - TASE security ID (e.g., "5140454")
 * @returns {Promise<{price: number, changePct: number}|null>}
 */
async function fetchTasePriceFromBrowser(securityId) {
  try {
    const funderUrl = `https://www.funder.co.il/fund/${securityId}`;
    const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(funderUrl)}`;

    console.log(`[BROWSER FALLBACK] Fetching TASE ${securityId} from browser via CORS proxy...`);

    const response = await fetch(corsProxyUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      console.warn(`[BROWSER FALLBACK] Failed to fetch ${securityId}: HTTP ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Extract buyPrice using regex: "buyPrice": 123.45
    const priceMatch = html.match(/"buyPrice"\s*:\s*([\d\.]+)/);

    if (!priceMatch || !priceMatch[1]) {
      console.warn(`[BROWSER FALLBACK] No buyPrice found in HTML for ${securityId}`);
      return null;
    }

    const price = parseFloat(priceMatch[1]);
    if (isNaN(price) || price <= 0) {
      console.warn(`[BROWSER FALLBACK] Invalid price extracted for ${securityId}: ${priceMatch[1]}`);
      return null;
    }

    // Extract 1-day change percentage: "1day": 0.71 or "1day": -1.23
    const changeMatch = html.match(/"1day"\s*:\s*([-\d\.]+)/);
    const changePct = (changeMatch && changeMatch[1]) ? parseFloat(changeMatch[1]) : 0;

    console.log(`[BROWSER FALLBACK] ✅ Success! ${securityId} price: ${price}, change: ${changePct}%`);

    return { price, changePct };
  } catch (error) {
    console.error(`[BROWSER FALLBACK] Error fetching ${securityId}:`, error.message);
    return null;
  }
}

// Debug flag for price fetching
const DEBUG_PRICES = import.meta.env.DEV;

// In-memory cache for price data (fallback, IndexedDB is primary)
const priceCache = new Map();
const PRICE_CACHE_DURATION = 60 * 1000; // 1 minute for prices
const HISTORY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for history

/**
 * Unified Asset Price Interface
 * @typedef {Object} UnifiedAssetPrice
 * @property {string} symbol - Ticker symbol
 * @property {string} name - Asset name
 * @property {number} currentPrice - Current price in native currency
 * @property {string} currency - Price currency ('USD' | 'ILS')
 * @property {number} change24h - 24h change percentage
 * @property {number} changeAmount - 24h change in absolute value
 * @property {Date} lastUpdated - Last update timestamp
 * @property {string} source - Data source ('coingecko' | 'yahoo' | 'manual')
 * @property {string} assetType - Asset type ('CRYPTO' | 'STOCK' | 'INDEX' | 'ETF')
 */

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

// ==================== INTERNAL ID HELPERS ====================

/**
 * Convert asset to internal ID format (deprecated - use resolveInternalId directly)
 * @deprecated Use resolveInternalId from internalIds.js instead
 */
function getInternalId(asset) {
  return resolveInternalId(asset);
}

// ==================== COINGECKO (CRYPTO) - DEPRECATED ====================
// These functions are kept for backward compatibility but now use backendApi

/**
 * Fetch current crypto price from CoinGecko (via backend API)
 * @param {string} coinId - CoinGecko coin ID (e.g., "bitcoin", "ethereum")
 * @param {string} [vsCurrency='usd'] - Target currency
 * @returns {Promise<UnifiedAssetPrice|null>}
 */
export const fetchCryptoPrice = async (coinId, vsCurrency = 'usd') => {
  if (!coinId) return null;

  const cacheKey = `crypto:${coinId}:${vsCurrency}`;
  const cached = getCachedPrice(cacheKey);
  if (cached) return cached;

  try {
    const quotes = await getQuotes([`cg:${coinId}`]);

    // Filter valid quotes (no errors, valid price)
    const validQuotes = quotes.filter(q =>
      q &&
      !q.error &&
      typeof q.price === 'number' &&
      !isNaN(q.price) &&
      q.price > 0
    );

    if (validQuotes.length === 0) {
      const errorQuote = quotes.find(q => q && q.error);
      if (errorQuote) {
        console.warn(`Quote error for cg:${coinId}:`, errorQuote.error);
      }
      return null;
    }

    const quote = validQuotes[0];

    const result = {
      symbol: coinId.toUpperCase(),
      name: coinId,
      currentPrice: quote.price,
      currency: quote.currency || 'USD',
      change24h: quote.changePct || 0,
      changeAmount: (quote.price * (quote.changePct || 0)) / 100,
      lastUpdated: new Date(quote.timestamp || Date.now()),
      source: 'coingecko',
      assetType: 'CRYPTO'
    };

    setCachedPrice(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching crypto price:', error);
    return null;
  }
};

/**
 * Fetch multiple crypto prices at once (batch) - via backend API
 * @param {string[]} coinIds - Array of CoinGecko IDs
 * @param {string} [vsCurrency='usd']
 * @returns {Promise<Object<string, UnifiedAssetPrice>>}
 */
export const fetchCryptoPricesBatch = async (coinIds, vsCurrency = 'usd') => {
  if (!coinIds || coinIds.length === 0) return {};

  const idsString = coinIds.join(',');
  const cacheKey = `crypto-batch:${idsString}:${vsCurrency}`;
  const cached = getCachedPrice(cacheKey);
  if (cached) return cached;

  try {
    const internalIds = coinIds.map(id => `cg:${id}`);
    const quotes = await getQuotes(internalIds);
    const results = {};

    // Filter valid quotes only
    const validQuotes = quotes.filter(q =>
      q &&
      !q.error &&
      typeof q.price === 'number' &&
      !isNaN(q.price) &&
      q.price > 0
    );

    validQuotes.forEach((quote) => {

      const coinId = quote.id.replace('cg:', '');
      results[coinId] = {
        symbol: coinId.toUpperCase(),
        name: coinId,
        currentPrice: quote.price,
        currency: quote.currency || 'USD',
        change24h: quote.changePct || 0,
        changeAmount: (quote.price * (quote.changePct || 0)) / 100,
        lastUpdated: new Date(quote.timestamp || Date.now()),
        source: 'coingecko',
        assetType: 'CRYPTO'
      };
    });

    setCachedPrice(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Error fetching crypto prices batch:', error);
    return {};
  }
};

// ==================== YAHOO FINANCE (STOCKS/INDICES) - VIA BACKEND API ====================

/**
 * Fetch current stock/index price from Yahoo Finance (via backend API)
 * @param {string} symbol - Stock symbol (e.g., "AAPL", "^GSPC", "TEVA.TA")
 * @returns {Promise<UnifiedAssetPrice|null>}
 */
export const fetchYahooPrice = async (symbol) => {
  if (!symbol) return null;

  const cacheKey = `yahoo:${symbol}`;
  const cached = getCachedPrice(cacheKey);
  if (cached) return cached;

  try {
    const quotes = await getQuotes([`yahoo:${symbol}`]);

    // Filter valid quotes (no errors, valid price)
    const validQuotes = quotes.filter(q =>
      q &&
      !q.error &&
      typeof q.price === 'number' &&
      !isNaN(q.price) &&
      q.price > 0
    );

    if (validQuotes.length === 0) {
      const errorQuote = quotes.find(q => q && q.error);
      if (errorQuote) {
        console.warn(`Quote error for yahoo:${symbol}:`, errorQuote.error);
      }
      return null;
    }

    const quote = validQuotes[0];

    // Determine asset type from symbol
    let assetType = 'STOCK';
    if (symbol.startsWith('^')) {
      assetType = 'INDEX';
    }

    const result = {
      symbol: symbol,
      name: symbol, // Name will be populated from search results
      currentPrice: quote.price,
      currency: quote.currency || 'USD',
      change24h: quote.changePct || 0,
      changeAmount: (quote.price * (quote.changePct || 0)) / 100,
      lastUpdated: new Date(quote.timestamp || Date.now()),
      source: 'yahoo',
      assetType: assetType,
    };

    setCachedPrice(cacheKey, result);
    return result;
  } catch (error) {
    console.error(`Error fetching Yahoo price for ${symbol}:`, error);
    return null;
  }
};

/**
 * Fetch multiple stock prices at once (batch) - via backend API
 * @param {string[]} symbols - Array of stock symbols
 * @returns {Promise<Object<string, UnifiedAssetPrice>>}
 */
export const fetchYahooPricesBatch = async (symbols) => {
  if (!symbols || symbols.length === 0) return {};

  try {
    const internalIds = symbols.map(s => `yahoo:${s}`);
    const quotes = await getQuotes(internalIds);
    const results = {};

    // Filter valid quotes only
    const validQuotes = quotes.filter(q =>
      q &&
      !q.error &&
      typeof q.price === 'number' &&
      !isNaN(q.price) &&
      q.price > 0
    );

    validQuotes.forEach((quote) => {

      const symbol = quote.id.replace('yahoo:', '');
      let assetType = 'STOCK';
      if (symbol.startsWith('^')) {
        assetType = 'INDEX';
      }

      results[symbol] = {
        symbol: symbol,
        name: symbol,
        currentPrice: quote.price,
        currency: quote.currency || 'USD',
        change24h: quote.changePct || 0,
        changeAmount: (quote.price * (quote.changePct || 0)) / 100,
        lastUpdated: new Date(quote.timestamp || Date.now()),
        source: 'yahoo',
        assetType: assetType,
      };
    });

    return results;
  } catch (error) {
    console.error('Error fetching Yahoo prices batch:', error);
    return {};
  }
};

// ==================== UNIFIED PRICE FETCHER ====================

/**
 * Fetch price for any asset type (auto-detects source)
 * Uses resolveInternalId to ensure correct ID format
 * @param {Object} asset - Asset object with apiId, marketDataSource, symbol
 * @returns {Promise<UnifiedAssetPrice|null>}
 */
export const fetchAssetPrice = async (asset) => {
  if (!asset) return null;

  // Manual entry - no live price
  if (asset.marketDataSource === 'manual') {
    return null;
  }

  // Resolve internal ID using the unified helper
  const internalId = resolveInternalId(asset);
  if (!internalId) {
    if (DEBUG_PRICES) {
      console.warn('[PRICE DEBUG] Could not resolve internal ID for asset:', asset);
    }
    return null;
  }

  try {
    // Use getQuotes directly for unified quote fetching
    const quotes = await getQuotes([internalId]);

    // Debug: Log quote fetching
    if (DEBUG_PRICES) {
      console.log('[PRICE DEBUG] fetchAssetPrice requested:', internalId, 'got quotes:', quotes.length);
    }

    // Filter valid quotes (no errors, valid price)
    const validQuotes = quotes.filter(q =>
      q &&
      !q.error &&
      typeof q.price === 'number' &&
      !isNaN(q.price) &&
      q.price > 0
    );

    if (validQuotes.length === 0) {
      const errorQuote = quotes.find(q => q && q.error);
      if (errorQuote) {
        if (DEBUG_PRICES) {
          console.warn(`[PRICE DEBUG] Quote error for ${internalId}:`, errorQuote.error);
        }
      }
      return null;
    }

    const quote = validQuotes[0];

    // Determine asset type
    let assetType = 'STOCK';
    const symbol = asset.symbol || asset.apiId || '';
    if (symbol.startsWith('^') || internalId.startsWith('yahoo:^')) {
      assetType = 'INDEX';
    } else if (asset.assetType === 'CRYPTO' || internalId.startsWith('cg:')) {
      assetType = 'CRYPTO';
    } else if (asset.assetType === 'ETF' || asset.marketDataSource === 'tase-local') {
      assetType = 'ETF';
    }

    const result = {
      symbol: symbol,
      name: asset.name || symbol,
      currentPrice: quote.price,
      currency: quote.currency || 'USD',
      change24h: quote.changePct || 0,
      changeAmount: (quote.price * (quote.changePct || 0)) / 100,
      lastUpdated: new Date(quote.timestamp || Date.now()),
      source: internalId.startsWith('cg:') ? 'coingecko' : 'yahoo',
      assetType: assetType,
    };

    return result;
  } catch (error) {
    console.error('Error fetching asset price:', error);
    return null;
  }
};

/**
 * Fetch prices for multiple assets (STRICT SPLIT ROUTING)
 * Israeli (TASE) assets → Browser only (CORS proxy)
 * Global assets (US Stocks, Crypto) → Backend API only
 * @param {Array} assets - Array of asset objects
 * @returns {Promise<Object<string, UnifiedAssetPrice>>}
 */
export const fetchAssetPricesBatch = async (assets) => {
  if (!assets || assets.length === 0) return {};

  // ==================== STEP 1: SEPARATE INTO TWO BUCKETS ====================
  const israelBucket = [];  // TASE assets → Browser fetch
  const globalBucket = [];  // US Stocks, Crypto → Backend API
  const assetMap = new Map(); // Map for result merging

  assets.forEach(asset => {
    if (asset.marketDataSource === 'manual') return;

    const internalId = resolveInternalId(asset);
    if (!internalId) return;

    // Store asset for later lookup
    assetMap.set(internalId, asset);

    // Routing logic: TASE assets go to Israel bucket, everything else to Global bucket
    const isTaseAsset =
      asset.marketDataSource === 'tase-local' ||
      internalId.startsWith('tase:') ||
      (asset.symbol && asset.symbol.endsWith('.TA'));

    if (isTaseAsset) {
      israelBucket.push({ asset, internalId });
    } else {
      globalBucket.push({ asset, internalId });
    }
  });

  if (DEBUG_PRICES) {
    console.log(`[SPLIT ROUTING] Israel Bucket: ${israelBucket.length}, Global Bucket: ${globalBucket.length}`);
  }

  const results = {};

  // ==================== STEP 2: PARALLEL EXECUTION ====================

  // ========== BUCKET A: ISRAEL (Browser-only, no backend) ==========
  const israelPromises = israelBucket.map(async ({ asset, internalId }) => {
    try {
      // Extract security ID from internal ID (e.g., "tase:5140454" → "5140454")
      const securityId = internalId.startsWith('tase:')
        ? internalId.substring(5)
        : asset.apiId || asset.symbol;

      if (DEBUG_PRICES) {
        console.log(`[ISRAEL BUCKET] Fetching ${securityId} from browser...`);
      }

      const browserData = await fetchTasePriceFromBrowser(securityId);

      if (!browserData || !browserData.price) {
        console.warn(`[ISRAEL BUCKET] Failed to fetch ${securityId}`);
        return null;
      }

      // Normalize to match backend format
      const priceKey = internalId;
      const symbol = asset.apiId || asset.symbol || '';

      return {
        key: priceKey,
        data: {
          symbol: symbol,
          name: asset.name || symbol,
          currentPrice: browserData.price,
          currency: 'ILS',
          change24h: browserData.changePct || 0,
          changeAmount: (browserData.price * (browserData.changePct || 0)) / 100,
          lastUpdated: new Date(),
          source: 'funder-browser',
          assetType: asset.assetType === 'ETF' ? 'ETF' : 'STOCK',
        }
      };
    } catch (error) {
      console.error(`[ISRAEL BUCKET] Error fetching ${internalId}:`, error.message);
      return null;
    }
  });

  // ========== BUCKET B: GLOBAL (Backend API only) ==========
  let globalQuotes = [];
  if (globalBucket.length > 0) {
    try {
      const globalIds = globalBucket.map(item => item.internalId);
      if (DEBUG_PRICES) {
        console.log('[GLOBAL BUCKET] Sending to backend:', globalIds);
      }
      globalQuotes = await getQuotes(globalIds);
    } catch (error) {
      console.error('[GLOBAL BUCKET] Backend API error:', error);
    }
  }

  // ==================== STEP 3: MERGE & NORMALIZE ====================

  // Wait for all Israel bucket fetches
  const israelResults = await Promise.all(israelPromises);

  // Add Israel bucket results to final output
  israelResults.forEach(result => {
    if (result && result.key && result.data) {
      results[result.key] = result.data;
    }
  });

  // Add Global bucket results (backend API)
  const validGlobalQuotes = globalQuotes.filter(q =>
    q &&
    !q.error &&
    typeof q.price === 'number' &&
    !isNaN(q.price) &&
    q.price > 0
  );

  // Log errors from backend
  globalQuotes.forEach(q => {
    if (q && q.error) {
      console.warn(`[GLOBAL BUCKET] Backend error for ${q.id}:`, q.error);
    }
  });

  validGlobalQuotes.forEach((quote) => {
    const asset = assetMap.get(quote.id);
    if (!asset) return;

    const priceKey = quote.id;
    const symbol = asset.apiId || asset.symbol || '';

    let assetType = 'STOCK';
    if (symbol.startsWith('^')) {
      assetType = 'INDEX';
    } else if (asset.assetType === 'CRYPTO' || quote.id.startsWith('cg:')) {
      assetType = 'CRYPTO';
    } else if (asset.assetType === 'ETF') {
      assetType = 'ETF';
    }

    results[priceKey] = {
      symbol: symbol,
      name: asset.name || symbol,
      currentPrice: quote.price,
      currency: quote.currency || 'USD',
      change24h: quote.changePct || 0,
      changeAmount: (quote.price * (quote.changePct || 0)) / 100,
      lastUpdated: new Date(quote.timestamp || Date.now()),
      source: quote.source === 'coingecko' ? 'coingecko' : 'yahoo',
      assetType: assetType,
    };
  });

  if (DEBUG_PRICES) {
    console.log(`[SPLIT ROUTING] Final results count: ${Object.keys(results).length}`);
  }

  return results;
};

// ==================== HISTORICAL PRICES ====================

/**
 * Fetch historical price for a crypto on a specific date
 * @param {string} coinId - CoinGecko coin ID
 * @param {string} date - Date string "DD-MM-YYYY"
 * @returns {Promise<number|null>}
 */
export const fetchCryptoHistoricalPrice = async (coinId, date) => {
  if (!coinId || !date) return null;

  const cacheKey = `crypto-history:${coinId}:${date}`;
  const cached = getCachedPrice(cacheKey);
  if (cached) return cached;

  try {
    // Use backend API instead of direct CoinGecko call
    // Convert date to internal ID and fetch history
    const internalId = `cg:${coinId}`;

    // Fetch 5d range to ensure we get the date
    const history = await getHistory(internalId, '5d', '1d');

    if (!history || !history.points || history.points.length === 0) {
      return null;
    }

    // Parse target date
    const [day, month, year] = date.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const targetTimestamp = targetDate.getTime();

    // Find the closest point to the target date
    let closestPoint = null;
    let minDiff = Infinity;

    for (const point of history.points) {
      const diff = Math.abs(point.t - targetTimestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closestPoint = point;
      }
    }

    // If we found a point within 24 hours, use it
    if (closestPoint && minDiff < 24 * 60 * 60 * 1000) {
      setCachedPrice(cacheKey, closestPoint.v);
      return closestPoint.v;
    }

    return null;
  } catch (error) {
    console.error('Error fetching crypto historical price:', error);
    return null;
  }
};

/**
 * Fetch historical price for a stock on a specific date
 * @param {Object|string} assetOrId - Asset object or ID string
 * @param {Date|string} date - Target date
 * @returns {Promise<number|null>}
 */
export const fetchYahooHistoricalPrice = async (assetOrId, date) => {
  if (!assetOrId || !date) return null;

  // Resolve internal ID
  const internalId = typeof assetOrId === 'object'
    ? resolveInternalId(assetOrId)
    : resolveInternalId(assetOrId);

  if (!internalId) return null;

  const targetDate = new Date(date);
  const dateStr = targetDate.toISOString().split('T')[0];
  const cacheKey = `yahoo-history:${internalId}:${dateStr}`;
  const cached = getCachedPrice(cacheKey);
  if (cached) return cached;

  try {
    // Fetch history data from backend (5d range to ensure we get the date)
    const history = await getHistory(internalId, '5d', '1d');

    if (!history || !history.points || history.points.length === 0) {
      return null;
    }

    // Find the closest point to the target date
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

    // If we found a point within 24 hours, use it
    if (closestPoint && minDiff < 24 * 60 * 60 * 1000) {
      setCachedPrice(cacheKey, closestPoint.v);
      return closestPoint.v;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching historical price for ${internalId}:`, error);
    // Return null instead of throwing to prevent app crashes
    return null;
  }
};

/**
 * Fetch historical price for any asset type
 * @param {Object} asset - Asset object
 * @param {Date|string} date - Target date
 * @returns {Promise<number|null>}
 */
export const fetchAssetHistoricalPrice = async (asset, date) => {
  if (!asset || !date) return null;

  const internalId = resolveInternalId(asset);
  if (!internalId) return null;

  // CoinGecko uses different date format
  if (internalId.startsWith('cg:')) {
    const coinId = internalId.replace('cg:', '');
    const targetDate = new Date(date);
    const dateStr = `${String(targetDate.getDate()).padStart(2, '0')}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${targetDate.getFullYear()}`;
    return await fetchCryptoHistoricalPrice(coinId, dateStr);
  }

  // Yahoo and TASE use same backend endpoint
  return await fetchYahooHistoricalPrice(asset, date);
};

// ==================== PRICE CHART DATA ====================

/**
 * Fetch price history for chart (time series) - via backend API
 * @param {Object|string} assetOrId - Asset object or ID string
 * @param {number} days - Number of days of history
 * @returns {Promise<Array<{date: Date, price: number}>>}
 */
export const fetchPriceHistory = async (assetOrId, days = 30) => {
  if (!assetOrId) return [];

  // Resolve internal ID from asset or string
  const internalId = typeof assetOrId === 'object'
    ? resolveInternalId(assetOrId)
    : resolveInternalId(assetOrId);

  if (!internalId) return [];

  const cacheKey = `history:${internalId}:${days}`;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < HISTORY_CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Convert days to range
    const range = days <= 7 ? '5d' : days <= 30 ? '1mo' : days <= 90 ? '3mo' : '1y';

    const history = await getHistory(internalId, range, '1d');

    // Handle error responses or missing data gracefully
    if (!history || history.error || !Array.isArray(history.points) || history.points.length === 0) {
      if (history && history.error) {
        // "History data not found" is a normal case, not an error - use debug level
        if (history.error === 'History data not found') {
          console.debug(`History data not found for ${internalId} (this is normal)`);
        } else {
          // Real errors should be logged as warnings
          console.warn(`History error for ${internalId}:`, history.error);
        }
      }
      return [];
    }

    const prices = history.points.map((point) => ({
      date: new Date(point.t),
      price: point.v,
    }));

    priceCache.set(cacheKey, { data: prices, timestamp: Date.now() });
    return prices;
  } catch (error) {
    console.error('Error fetching price history:', error);
    return [];
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
    // Return cached rate even if expired, or default
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
  // Use the canonical conversion function
  const { convertAmount } = await import('./currency');
  return await convertAmount(price, fromCurrency, toCurrency);
};

// ==================== CACHE MANAGEMENT ====================

/**
 * Clear price cache
 */
export const clearPriceCache = () => {
  priceCache.clear();
};

/**
 * Get cache statistics
 */
export const getPriceCacheStats = () => {
  return {
    size: priceCache.size,
    keys: Array.from(priceCache.keys())
  };
};

