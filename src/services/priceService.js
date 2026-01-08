/**
 * Price Service
 * Fetches live and historical prices via backend API (Vercel Functions)
 * All external API calls are now handled server-side to avoid CORS issues
 */

import { getQuotes, getHistory } from './backendApi';

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
 * Convert asset to internal ID format
 */
function getInternalId(asset) {
  if (asset.marketDataSource === 'coingecko' && asset.apiId) {
    return `cg:${asset.apiId}`;
  } else if (asset.marketDataSource === 'tase-local' && asset.securityId) {
    return `tase:${asset.securityId}`;
  } else {
    const symbol = asset.apiId || asset.symbol;
    return symbol ? `yahoo:${symbol}` : null;
  }
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
    if (quotes.length === 0 || !quotes[0]) return null;

    const quote = quotes[0];
    const result = {
      symbol: coinId.toUpperCase(),
      name: coinId,
      currentPrice: quote.price,
      currency: quote.currency,
      change24h: quote.changePct || 0,
      changeAmount: (quote.price * (quote.changePct || 0)) / 100,
      lastUpdated: new Date(quote.timestamp),
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

    quotes.forEach((quote) => {
      const coinId = quote.id.replace('cg:', '');
      results[coinId] = {
        symbol: coinId.toUpperCase(),
        name: coinId,
        currentPrice: quote.price,
        currency: quote.currency,
        change24h: quote.changePct || 0,
        changeAmount: (quote.price * (quote.changePct || 0)) / 100,
        lastUpdated: new Date(quote.timestamp),
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
    if (quotes.length === 0 || !quotes[0]) return null;

    const quote = quotes[0];
    
    // Determine asset type from symbol
    let assetType = 'STOCK';
    if (symbol.startsWith('^')) {
      assetType = 'INDEX';
    }

    const result = {
      symbol: symbol,
      name: symbol, // Name will be populated from search results
      currentPrice: quote.price,
      currency: quote.currency,
      change24h: quote.changePct || 0,
      changeAmount: (quote.price * (quote.changePct || 0)) / 100,
      lastUpdated: new Date(quote.timestamp),
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

    quotes.forEach((quote) => {
      const symbol = quote.id.replace('yahoo:', '');
      let assetType = 'STOCK';
      if (symbol.startsWith('^')) {
        assetType = 'INDEX';
      }

      results[symbol] = {
        symbol: symbol,
        name: symbol,
        currentPrice: quote.price,
        currency: quote.currency,
        change24h: quote.changePct || 0,
        changeAmount: (quote.price * (quote.changePct || 0)) / 100,
        lastUpdated: new Date(quote.timestamp),
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
 * @param {Object} asset - Asset object with apiId, marketDataSource, symbol
 * @returns {Promise<UnifiedAssetPrice|null>}
 */
export const fetchAssetPrice = async (asset) => {
  if (!asset) return null;

  const { apiId, marketDataSource, symbol } = asset;

  // CoinGecko for crypto
  if (marketDataSource === 'coingecko' && apiId) {
    return await fetchCryptoPrice(apiId);
  }

  // Yahoo for stocks/indices
  if (marketDataSource === 'yahoo' || marketDataSource === 'finnhub' || marketDataSource === 'tase-local') {
    const yahooSymbol = apiId || symbol;
    if (yahooSymbol) {
      return await fetchYahooPrice(yahooSymbol);
    }
  }

  // Manual entry - no live price
  if (marketDataSource === 'manual') {
    return null;
  }

  // Try to guess based on symbol format
  if (symbol) {
    // Indices start with ^
    if (symbol.startsWith('^')) {
      return await fetchYahooPrice(symbol);
    }
    // Israeli stocks end with .TA
    if (symbol.endsWith('.TA')) {
      return await fetchYahooPrice(symbol);
    }
    // Default to Yahoo for stock-like symbols
    return await fetchYahooPrice(symbol);
  }

  return null;
};

/**
 * Fetch prices for multiple assets (optimized batch) - via backend API
 * @param {Array} assets - Array of asset objects
 * @returns {Promise<Object<string, UnifiedAssetPrice>>}
 */
export const fetchAssetPricesBatch = async (assets) => {
  if (!assets || assets.length === 0) return {};

  // Convert assets to internal IDs
  const internalIds = [];
  const idToAssetMap = new Map();

  assets.forEach(asset => {
    if (asset.marketDataSource === 'manual') return;
    
    const internalId = getInternalId(asset);
    if (internalId) {
      internalIds.push(internalId);
      idToAssetMap.set(internalId, asset);
    }
  });

  if (internalIds.length === 0) return {};

  try {
    // Fetch all quotes in one batch
    const quotes = await getQuotes(internalIds);
    const results = {};

    quotes.forEach((quote) => {
      const asset = idToAssetMap.get(quote.id);
      if (!asset) return;

      const priceKey = asset.apiId || asset.symbol;
      if (!priceKey) return;

      let assetType = 'STOCK';
      const symbol = asset.apiId || asset.symbol || '';
      if (symbol.startsWith('^')) {
        assetType = 'INDEX';
      } else if (asset.assetType === 'ETF' || asset.marketDataSource === 'tase-local') {
        assetType = 'ETF';
      }

      results[priceKey] = {
        symbol: symbol,
        name: asset.name || symbol,
        currentPrice: quote.price,
        currency: quote.currency,
        change24h: quote.changePct || 0,
        changeAmount: (quote.price * (quote.changePct || 0)) / 100,
        lastUpdated: new Date(quote.timestamp),
        source: quote.source === 'coingecko' ? 'coingecko' : 'yahoo',
        assetType: assetType,
      };
    });

    return results;
  } catch (error) {
    console.error('Error fetching asset prices batch:', error);
    return {};
  }
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
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${date}&localization=false`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko history API error: ${response.status}`);
    }

    const data = await response.json();
    const price = data?.market_data?.current_price?.usd || null;

    if (price !== null) {
      setCachedPrice(cacheKey, price);
    }

    return price;
  } catch (error) {
    console.error('Error fetching crypto historical price:', error);
    return null;
  }
};

/**
 * Fetch historical price for a stock on a specific date
 * @param {string} symbol - Stock symbol
 * @param {Date|string} date - Target date
 * @returns {Promise<number|null>}
 */
export const fetchYahooHistoricalPrice = async (symbol, date) => {
  if (!symbol || !date) return null;

  const targetDate = new Date(date);
  const dateStr = targetDate.toISOString().split('T')[0];
  const cacheKey = `yahoo-history:${symbol}:${dateStr}`;
  const cached = getCachedPrice(cacheKey);
  if (cached) return cached;

  try {
    // Convert date to Unix timestamp
    const period1 = Math.floor(targetDate.getTime() / 1000);
    const period2 = period1 + 86400; // +1 day

    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`;

    const { response, proxyUsed, parseResponse } = await fetchWithProxy(targetUrl);

    if (!response.ok) {
      console.warn(`Yahoo Finance history API error for ${symbol}: ${response.status}`);
      return null;
    }

    const data = await parseProxyResponse(response, parseResponse);

    // If parseProxyResponse returns null (HTML error page), return null safely
    if (!data) {
      console.warn(`Failed to parse Yahoo Finance historical response for ${symbol}`);
      return null;
    }

    const chartResult = data?.chart?.result?.[0];
    if (!chartResult) {
      console.warn(`No historical data found for ${symbol}`);
      return null;
    }

    // Get close price
    const closePrice = chartResult.indicators?.quote?.[0]?.close?.[0];

    if (closePrice !== null && closePrice !== undefined) {
      setCachedPrice(cacheKey, closePrice);
      return closePrice;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching Yahoo historical price for ${symbol}:`, error);
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

  const { apiId, marketDataSource, symbol } = asset;

  if (marketDataSource === 'coingecko' && apiId) {
    // CoinGecko expects DD-MM-YYYY format
    const targetDate = new Date(date);
    const dateStr = `${String(targetDate.getDate()).padStart(2, '0')}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${targetDate.getFullYear()}`;
    return await fetchCryptoHistoricalPrice(apiId, dateStr);
  }

  // Yahoo for everything else
  const yahooSymbol = apiId || symbol;
  if (yahooSymbol) {
    return await fetchYahooHistoricalPrice(yahooSymbol, date);
  }

  return null;
};

// ==================== PRICE CHART DATA ====================

/**
 * Fetch price history for chart (time series) - via backend API
 * @param {string} symbol - Asset symbol or apiId
 * @param {string} source - 'coingecko' | 'yahoo'
 * @param {number} days - Number of days of history
 * @returns {Promise<Array<{date: Date, price: number}>>}
 */
export const fetchPriceHistory = async (symbol, source, days = 30) => {
  if (!symbol) return [];

  const cacheKey = `history:${source}:${symbol}:${days}`;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < HISTORY_CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Convert to internal ID
    let internalId;
    if (source === 'coingecko') {
      internalId = `cg:${symbol}`;
    } else {
      internalId = `yahoo:${symbol}`;
    }

    // Convert days to range
    const range = days <= 7 ? '5d' : days <= 30 ? '1mo' : days <= 90 ? '3mo' : '1y';

    const history = await getHistory(internalId, range, '1d');
    
    if (!history || !history.points || history.points.length === 0) {
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
 * @param {number} price - Price to convert
 * @param {string} fromCurrency - Source currency ('USD' | 'ILS')
 * @param {string} toCurrency - Target currency ('USD' | 'ILS')
 * @returns {Promise<number>} Converted price
 */
export const convertCurrency = async (price, fromCurrency, toCurrency) => {
  if (!price || price <= 0) return price;
  if (fromCurrency === toCurrency) return price;

  const rate = await getExchangeRate();

  if (fromCurrency === 'USD' && toCurrency === 'ILS') {
    return price * rate;
  } else if (fromCurrency === 'ILS' && toCurrency === 'USD') {
    return price / rate;
  }

  return price;
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

