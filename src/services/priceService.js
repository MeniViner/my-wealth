/**
 * Price Service
 * Fetches live and historical prices from CoinGecko (Crypto) and Yahoo Finance (Stocks/Indices)
 * 
 * CORS Note: Yahoo Finance requires a proxy. We use corsproxy.io with allorigins.win fallback.
 */

// In-memory cache for price data
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

// ==================== CORS PROXY HELPER ====================

/**
 * Fetch URL through CORS proxy with fallback
 * @param {string} targetUrl - The URL to fetch
 * @returns {Promise<{response: Response, usingAllOrigins: boolean}>}
 */
const fetchWithProxy = async (targetUrl) => {
  // Try corsproxy.io first
  let proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
  
  try {
    let response = await fetch(proxyUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      return { response, usingAllOrigins: false };
    }
  } catch (e) {
    console.warn('corsproxy.io failed, trying allorigins.win');
  }
  
  // Fallback to allorigins.win
  try {
    proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    return { response, usingAllOrigins: true };
  } catch (error) {
    console.error('Both proxy services failed:', error);
    // Return a failed response object to prevent crashes
    throw new Error('Proxy fetch failed: Unable to fetch data through available proxies');
  }
};

/**
 * Parse response from proxy (handles allorigins wrapper)
 * Returns null if parsing fails (e.g., HTML error page from Yahoo)
 */
const parseProxyResponse = async (response, usingAllOrigins) => {
  try {
    const responseText = await response.text();
    
    // Check if response is HTML (common when Yahoo blocks the request)
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.warn('Received HTML instead of JSON - likely blocked by Yahoo Finance');
      return null;
    }
    
    try {
      const parsed = JSON.parse(responseText);
      
      // allorigins.win wraps response in { contents: "..." }
      if (usingAllOrigins && parsed.contents) {
        // Check if contents is HTML
        if (typeof parsed.contents === 'string' && 
            (parsed.contents.trim().startsWith('<!DOCTYPE') || parsed.contents.trim().startsWith('<html'))) {
          console.warn('Received HTML in allorigins wrapper - likely blocked by Yahoo Finance');
          return null;
        }
        return JSON.parse(parsed.contents);
      }
      
      return parsed;
    } catch (parseError) {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.contents) {
            // Check if contents is HTML
            if (typeof parsed.contents === 'string' && 
                (parsed.contents.trim().startsWith('<!DOCTYPE') || parsed.contents.trim().startsWith('<html'))) {
              console.warn('Received HTML in extracted JSON - likely blocked by Yahoo Finance');
              return null;
            }
            return JSON.parse(parsed.contents);
          }
          return parsed;
        } catch (e) {
          console.warn('Failed to parse extracted JSON:', e);
          return null;
        }
      }
      console.warn('Could not parse response - not valid JSON');
      return null;
    }
  } catch (error) {
    console.error('Error parsing proxy response:', error);
    return null;
  }
};

// ==================== COINGECKO (CRYPTO) ====================

/**
 * Fetch current crypto price from CoinGecko
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
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${vsCurrency}&include_24hr_change=true&include_last_updated_at=true`
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    const coinData = data[coinId];
    
    if (!coinData) {
      throw new Error(`No data found for ${coinId}`);
    }
    
    const result = {
      symbol: coinId.toUpperCase(),
      name: coinId,
      currentPrice: coinData[vsCurrency] || 0,
      currency: vsCurrency.toUpperCase(),
      change24h: coinData[`${vsCurrency}_24h_change`] || 0,
      changeAmount: (coinData[vsCurrency] * (coinData[`${vsCurrency}_24h_change`] || 0)) / 100,
      lastUpdated: new Date(coinData.last_updated_at * 1000),
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
 * Fetch multiple crypto prices at once (batch)
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
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${idsString}&vs_currencies=${vsCurrency}&include_24hr_change=true&include_last_updated_at=true`
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    const results = {};
    
    for (const coinId of coinIds) {
      const coinData = data[coinId];
      if (coinData) {
        results[coinId] = {
          symbol: coinId.toUpperCase(),
          name: coinId,
          currentPrice: coinData[vsCurrency] || 0,
          currency: vsCurrency.toUpperCase(),
          change24h: coinData[`${vsCurrency}_24h_change`] || 0,
          changeAmount: (coinData[vsCurrency] * (coinData[`${vsCurrency}_24h_change`] || 0)) / 100,
          lastUpdated: new Date(coinData.last_updated_at * 1000),
          source: 'coingecko',
          assetType: 'CRYPTO'
        };
      }
    }
    
    setCachedPrice(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Error fetching crypto prices batch:', error);
    return {};
  }
};

// ==================== YAHOO FINANCE (STOCKS/INDICES) ====================

/**
 * Fetch current stock/index price from Yahoo Finance
 * @param {string} symbol - Stock symbol (e.g., "AAPL", "^GSPC", "TEVA.TA")
 * @returns {Promise<UnifiedAssetPrice|null>}
 */
export const fetchYahooPrice = async (symbol) => {
  if (!symbol) return null;
  
  const cacheKey = `yahoo:${symbol}`;
  const cached = getCachedPrice(cacheKey);
  if (cached) return cached;
  
  try {
    // Yahoo Finance v8 chart API (more reliable than v7 quote)
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    
    const { response, usingAllOrigins } = await fetchWithProxy(targetUrl);
    
    if (!response.ok) {
      console.warn(`Yahoo Finance API error for ${symbol}: ${response.status}`);
      return null;
    }
    
    const data = await parseProxyResponse(response, usingAllOrigins);
    
    // If parseProxyResponse returns null (HTML error page), return null safely
    if (!data) {
      console.warn(`Failed to parse Yahoo Finance response for ${symbol} - likely blocked`);
      return null;
    }
    
    // Extract price data from chart response
    const chartResult = data?.chart?.result?.[0];
    if (!chartResult) {
      console.warn(`No data found for ${symbol}`);
      return null;
    }
    
    const meta = chartResult.meta;
    if (!meta) {
      console.warn(`No metadata found for ${symbol}`);
      return null;
    }
    
    const currentPrice = meta.regularMarketPrice || 0;
    const previousClose = meta.previousClose || meta.chartPreviousClose || currentPrice;
    const change = currentPrice - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
    
    // Determine asset type
    let assetType = 'STOCK';
    if (symbol.startsWith('^')) {
      assetType = 'INDEX';
    } else if (meta.quoteType === 'ETF') {
      assetType = 'ETF';
    }
    
    // Determine currency (Israeli stocks are in ILS)
    const currency = meta.currency || (symbol.endsWith('.TA') ? 'ILS' : 'USD');
    
    const result = {
      symbol: symbol,
      name: meta.shortName || meta.longName || symbol,
      currentPrice: currentPrice,
      currency: currency,
      change24h: changePercent,
      changeAmount: change,
      lastUpdated: new Date(meta.regularMarketTime * 1000),
      source: 'yahoo',
      assetType: assetType,
      // Extra Yahoo-specific data
      marketState: meta.marketState, // 'REGULAR', 'PRE', 'POST', 'CLOSED'
      exchange: meta.exchangeName
    };
    
    setCachedPrice(cacheKey, result);
    return result;
  } catch (error) {
    console.error(`Error fetching Yahoo price for ${symbol}:`, error);
    // Return null instead of throwing to prevent app crashes
    return null;
  }
};

/**
 * Fetch multiple stock prices at once (batch)
 * Note: Yahoo doesn't have a true batch endpoint, so we fetch in parallel
 * @param {string[]} symbols - Array of stock symbols
 * @returns {Promise<Object<string, UnifiedAssetPrice>>}
 */
export const fetchYahooPricesBatch = async (symbols) => {
  if (!symbols || symbols.length === 0) return {};
  
  const results = {};
  
  // Fetch in parallel with Promise.allSettled to handle individual failures
  const promises = symbols.map(symbol => fetchYahooPrice(symbol));
  const responses = await Promise.allSettled(promises);
  
  responses.forEach((response, index) => {
    if (response.status === 'fulfilled' && response.value) {
      results[symbols[index]] = response.value;
    }
  });
  
  return results;
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
 * Fetch prices for multiple assets (optimized batch)
 * @param {Array} assets - Array of asset objects
 * @returns {Promise<Object<string, UnifiedAssetPrice>>}
 */
export const fetchAssetPricesBatch = async (assets) => {
  if (!assets || assets.length === 0) return {};
  
  // Separate by source
  const cryptoIds = [];
  const yahooSymbols = [];
  
  assets.forEach(asset => {
    if (asset.marketDataSource === 'coingecko' && asset.apiId) {
      cryptoIds.push(asset.apiId);
    } else if (asset.marketDataSource !== 'manual' && (asset.apiId || asset.symbol)) {
      yahooSymbols.push(asset.apiId || asset.symbol);
    }
  });
  
  // Fetch in parallel
  const [cryptoResults, yahooResults] = await Promise.all([
    cryptoIds.length > 0 ? fetchCryptoPricesBatch(cryptoIds) : {},
    yahooSymbols.length > 0 ? fetchYahooPricesBatch(yahooSymbols) : {}
  ]);
  
  // Merge results
  return { ...cryptoResults, ...yahooResults };
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
    
    const { response, usingAllOrigins } = await fetchWithProxy(targetUrl);
    
    if (!response.ok) {
      console.warn(`Yahoo Finance history API error for ${symbol}: ${response.status}`);
      return null;
    }
    
    const data = await parseProxyResponse(response, usingAllOrigins);
    
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
 * Fetch price history for chart (time series)
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
    if (source === 'coingecko') {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${symbol}/market_chart?vs_currency=usd&days=${days}`
      );
      
      if (!response.ok) throw new Error('CoinGecko chart API error');
      
      const data = await response.json();
      const prices = (data.prices || []).map(([timestamp, price]) => ({
        date: new Date(timestamp),
        price: price
      }));
      
      priceCache.set(cacheKey, { data: prices, timestamp: Date.now() });
      return prices;
    }
    
    // Yahoo Finance
    const range = days <= 7 ? '5d' : days <= 30 ? '1mo' : days <= 90 ? '3mo' : '1y';
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`;
    
    try {
      const { response, usingAllOrigins } = await fetchWithProxy(targetUrl);
      if (!response.ok) {
        console.warn(`Yahoo chart API error for ${symbol}: ${response.status}`);
        return [];
      }
      
      const data = await parseProxyResponse(response, usingAllOrigins);
      
      // If parseProxyResponse returns null (HTML error page), return empty array safely
      if (!data) {
        console.warn(`Failed to parse Yahoo Finance chart response for ${symbol}`);
        return [];
      }
      
      const chartResult = data?.chart?.result?.[0];
      
      if (!chartResult) {
        console.warn(`No chart data found for ${symbol}`);
        return [];
      }
      
      const timestamps = chartResult.timestamp || [];
      const closes = chartResult.indicators?.quote?.[0]?.close || [];
      
      const prices = timestamps.map((ts, i) => ({
        date: new Date(ts * 1000),
        price: closes[i] || 0
      })).filter(p => p.price > 0);
      
      priceCache.set(cacheKey, { data: prices, timestamp: Date.now() });
      return prices;
    } catch (error) {
      console.error(`Error fetching price history for ${symbol}:`, error);
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
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

