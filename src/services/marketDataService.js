/**
 * Market Data Service
 * Provides search functionality for crypto and stock assets
 */

// In-memory cache for search results
const searchCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached result or null if expired
 */
const getCachedResult = (key) => {
  const cached = searchCache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_DURATION) {
    searchCache.delete(key);
    return null;
  }
  
  return cached.data;
};

/**
 * Set cache result
 */
const setCachedResult = (key, data) => {
  searchCache.set(key, {
    data,
    timestamp: Date.now()
  });
};

/**
 * Search crypto assets using CoinGecko API
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of asset objects with { id, symbol, name, image }
 */
export const searchCryptoAssets = async (query) => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const cacheKey = `crypto:${query.toLowerCase().trim()}`;
  const cached = getCachedResult(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query.trim())}`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Map CoinGecko results to our format
    const results = (data.coins || []).slice(0, 10).map(coin => ({
      id: coin.id, // CoinGecko ID (e.g., "bitcoin")
      symbol: coin.symbol.toUpperCase(), // Ticker symbol (e.g., "BTC")
      name: coin.name, // Full name (e.g., "Bitcoin")
      image: coin.thumb || coin.large || null,
      marketDataSource: 'coingecko'
    }));

    setCachedResult(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Error searching crypto assets:', error);
    // Return empty array on error - allows fallback to manual entry
    return [];
  }
};

/**
 * Search stock assets using Finnhub API (LEGACY - use searchUSStocks or searchIsraeliStocks instead)
 * Note: Requires API key. Falls back to manual entry if unavailable.
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of asset objects with { id, symbol, name, image }
 * @deprecated Use searchUSStocks or searchIsraeliStocks for better filtering
 */
export const searchStockAssets = async (query) => {
  // Legacy function - kept for backward compatibility
  // Uses same logic as US stocks (without Israeli filter)
  if (!query || query.trim().length < 2) {
    return [];
  }

  const cacheKey = `stock:${query.toLowerCase().trim()}`;
  const cached = getCachedResult(cacheKey);
  if (cached) {
    return cached;
  }

  // Try Finnhub first (free tier available)
  const finnhubApiKey = import.meta.env.VITE_FINNHUB_API_KEY;
  
  if (finnhubApiKey) {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query.trim())}&token=${finnhubApiKey}`
      );

      if (response.ok) {
        const data = await response.json();
        
        // Map Finnhub results to our format
        const results = (data.result || []).slice(0, 10).map(stock => ({
          id: stock.symbol, // Use symbol as ID for stocks
          symbol: stock.symbol, // Ticker symbol (e.g., "AAPL")
          name: stock.description || stock.symbol, // Company name or symbol
          image: null, // Finnhub doesn't provide images
          marketDataSource: 'finnhub'
        }));

        setCachedResult(cacheKey, results);
        return results;
      }
    } catch (error) {
      console.error('Error searching stocks via Finnhub:', error);
    }
  }

  // Fallback: Try Yahoo Finance autocomplete via CORS proxy
  try {
    // Yahoo Finance Autocomplete API
    const targetUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query.trim())}&quotesCount=10&newsCount=0`;
    
    // Try corsproxy.io first
    let proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    let response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    // If corsproxy.io fails, try allorigins.win as fallback
    let usingAllOrigins = false;
    if (!response.ok) {
      proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      usingAllOrigins = true;
    }

    if (response.ok) {
      let data;
      const responseText = await response.text();
      
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(responseText);
        
        // allorigins.win wraps the response in { contents: "...", status: {...} }
        // corsproxy.io returns the JSON directly
        if (usingAllOrigins && parsed.contents) {
          // Parse the contents which is the actual Yahoo Finance response
          data = JSON.parse(parsed.contents);
        } else {
          // corsproxy.io returns the data directly
          data = parsed;
        }
      } catch (parseError) {
        // If parsing fails, try to extract JSON from the response
        console.warn('Failed to parse Yahoo Finance response, trying alternative parsing:', parseError);
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            // Check if it's allorigins format
            if (parsed.contents) {
              data = JSON.parse(parsed.contents);
            } else {
              data = parsed;
            }
          } catch (e) {
            throw new Error('Could not parse Yahoo Finance response');
          }
        } else {
          throw new Error('Could not parse Yahoo Finance response');
        }
      }
      
      // Yahoo returns results in data.quotes
      if (data && data.quotes && Array.isArray(data.quotes)) {
        // Filter to only include EQUITY and ETF types (exclude options, futures, etc.)
        const filteredQuotes = data.quotes.filter(
          quote => quote.quoteType === 'EQUITY' || quote.quoteType === 'ETF'
        );
        
        // Map Yahoo Finance results to our format
        const results = filteredQuotes.slice(0, 10).map(quote => ({
          id: quote.symbol, // Use symbol as ID for stocks
          symbol: quote.symbol, // Ticker symbol (e.g., "AAPL")
          name: quote.shortname || quote.longname || quote.symbol, // Company name
          image: null, // Yahoo Finance doesn't provide easy logos in search
          marketDataSource: 'yahoo'
        }));

        setCachedResult(cacheKey, results);
        return results;
      }
    }
  } catch (error) {
    console.warn('Error searching stocks via Yahoo Finance (CORS/Network):', error);
    // Return empty array to allow manual entry fallback
  }

  // If all APIs fail, return empty array (allows manual entry)
  return [];
};

/**
 * Search Israeli stocks (TASE - Tel Aviv Stock Exchange)
 * Filters for stocks with .TA suffix or TASE exchange
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of asset objects
 */
export const searchIsraeliStocks = async (query) => {
  if (!query || query.trim().length < 1) {
    return [];
  }

  const cacheKey = `il-stock:${query.toLowerCase().trim()}`;
  const cached = getCachedResult(cacheKey);
  if (cached) {
    return cached;
  }

  // Try local TASE stocks database first (supports Hebrew, Security IDs, symbols, English names)
  try {
    const { searchTASEStocks } = await import('../data/taseStocks');
    const localResults = searchTASEStocks(query);
    
    if (localResults.length > 0) {
      // Map local results to our format
      const results = localResults.map(stock => ({
        id: stock.symbol, // Use symbol as ID
        symbol: stock.symbol, // Ticker symbol (e.g., "POLI.TA")
        name: `${stock.nameHe} (${stock.symbol})`, // Hebrew name + symbol for display
        nameHe: stock.nameHe, // Hebrew name
        nameEn: stock.nameEn, // English name
        securityId: stock.securityId, // TASE Security ID
        image: null,
        marketDataSource: 'tase-local'
      }));

      setCachedResult(cacheKey, results);
      return results;
    }
  } catch (error) {
    console.warn('Failed to load TASE stocks database:', error);
  }

  // Fallback: Use Yahoo Finance with TASE filter (for stocks not in local database)
  try {
    const targetUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query.trim())}&quotesCount=20&newsCount=0`;
    
    // Try corsproxy.io first
    let proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    let response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    // If corsproxy.io fails, try allorigins.win as fallback
    let usingAllOrigins = false;
    if (!response.ok) {
      proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      usingAllOrigins = true;
    }

    if (response.ok) {
      let data;
      const responseText = await response.text();
      
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(responseText);
        
        if (usingAllOrigins && parsed.contents) {
          data = JSON.parse(parsed.contents);
        } else {
          data = parsed;
        }
      } catch (parseError) {
        console.warn('Failed to parse Yahoo Finance response:', parseError);
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.contents) {
              data = JSON.parse(parsed.contents);
            } else {
              data = parsed;
            }
          } catch (e) {
            throw new Error('Could not parse Yahoo Finance response');
          }
        } else {
          throw new Error('Could not parse Yahoo Finance response');
        }
      }
      
      // Yahoo returns results in data.quotes
      if (data && data.quotes && Array.isArray(data.quotes)) {
        // Filter for Israeli stocks: symbols ending with .TA or exchange is TASE
        const israeliStocks = data.quotes.filter(quote => {
          const symbol = quote.symbol || '';
          const exchange = quote.exchange || '';
          // Check if symbol ends with .TA or exchange contains TASE/Tel Aviv
          return symbol.endsWith('.TA') || 
                 exchange.toUpperCase().includes('TASE') || 
                 exchange.toUpperCase().includes('TEL AVIV') ||
                 exchange.toUpperCase().includes('TA');
        });
        
        // Map to our format
        const results = israeliStocks.slice(0, 10).map(quote => ({
          id: quote.symbol, // Use symbol as ID
          symbol: quote.symbol, // Ticker symbol (e.g., "POLI.TA")
          name: quote.shortname || quote.longname || quote.symbol, // Company name
          image: null,
          marketDataSource: 'yahoo'
        }));

        setCachedResult(cacheKey, results);
        return results;
      }
    }
  } catch (error) {
    console.warn('Error searching Israeli stocks via Yahoo Finance:', error);
  }

  // If all APIs fail, return empty array (allows manual entry)
  return [];
};

/**
 * Search US stocks (exclude Israeli stocks)
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of asset objects
 */
export const searchUSStocks = async (query) => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const cacheKey = `us-stock:${query.toLowerCase().trim()}`;
  const cached = getCachedResult(cacheKey);
  if (cached) {
    return cached;
  }

  // Try Finnhub first (free tier available)
  const finnhubApiKey = import.meta.env.VITE_FINNHUB_API_KEY;
  
  if (finnhubApiKey) {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query.trim())}&token=${finnhubApiKey}`
      );

      if (response.ok) {
        const data = await response.json();
        
        // Map Finnhub results to our format
        const results = (data.result || []).slice(0, 10).map(stock => ({
          id: stock.symbol, // Use symbol as ID for stocks
          symbol: stock.symbol, // Ticker symbol (e.g., "AAPL")
          name: stock.description || stock.symbol, // Company name or symbol
          image: null, // Finnhub doesn't provide images
          marketDataSource: 'finnhub'
        }));

        setCachedResult(cacheKey, results);
        return results;
      }
    } catch (error) {
      console.error('Error searching stocks via Finnhub:', error);
    }
  }

  // Fallback: Try Yahoo Finance autocomplete via CORS proxy
  try {
    const targetUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query.trim())}&quotesCount=20&newsCount=0`;
    
    let proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    let response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    let usingAllOrigins = false;
    if (!response.ok) {
      proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      usingAllOrigins = true;
    }

    if (response.ok) {
      let data;
      const responseText = await response.text();
      
      try {
        const parsed = JSON.parse(responseText);
        
        if (usingAllOrigins && parsed.contents) {
          data = JSON.parse(parsed.contents);
        } else {
          data = parsed;
        }
      } catch (parseError) {
        console.warn('Failed to parse Yahoo Finance response:', parseError);
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.contents) {
              data = JSON.parse(parsed.contents);
            } else {
              data = parsed;
            }
          } catch (e) {
            throw new Error('Could not parse Yahoo Finance response');
          }
        } else {
          throw new Error('Could not parse Yahoo Finance response');
        }
      }
      
      if (data && data.quotes && Array.isArray(data.quotes)) {
        // Filter to only include EQUITY and ETF types, EXCLUDE Israeli stocks (.TA)
        const usStocks = data.quotes.filter(quote => {
          const symbol = quote.symbol || '';
          const exchange = quote.exchange || '';
          // Exclude Israeli stocks
          const isIsraeli = symbol.endsWith('.TA') || 
                          exchange.toUpperCase().includes('TASE') || 
                          exchange.toUpperCase().includes('TEL AVIV') ||
                          exchange.toUpperCase().includes('TA');
          // Include only US stocks (EQUITY/ETF and not Israeli)
          return (quote.quoteType === 'EQUITY' || quote.quoteType === 'ETF') && !isIsraeli;
        });
        
        // Map Yahoo Finance results to our format
        const results = usStocks.slice(0, 10).map(quote => ({
          id: quote.symbol, // Use symbol as ID for stocks
          symbol: quote.symbol, // Ticker symbol (e.g., "AAPL")
          name: quote.shortname || quote.longname || quote.symbol, // Company name
          image: null, // Yahoo Finance doesn't provide easy logos in search
          marketDataSource: 'yahoo'
        }));

        setCachedResult(cacheKey, results);
        return results;
      }
    }
  } catch (error) {
    console.warn('Error searching US stocks via Yahoo Finance (CORS/Network):', error);
  }

  // If all APIs fail, return empty array (allows manual entry)
  return [];
};


// ==================== POPULAR INDICES LIST ====================

/**
 * List of popular market indices for quick search
 * These are commonly tracked indices that users might want to add
 */
export const POPULAR_INDICES = [
  // US Indices
  { id: '^GSPC', symbol: '^GSPC', name: 'S&P 500', nameHe: 'אס אנד פי 500', market: 'US', marketDataSource: 'yahoo' },
  { id: '^NDX', symbol: '^NDX', name: 'NASDAQ 100', nameHe: 'נאסדק 100', market: 'US', marketDataSource: 'yahoo' },
  { id: '^DJI', symbol: '^DJI', name: 'Dow Jones Industrial', nameHe: 'דאו ג׳ונס', market: 'US', marketDataSource: 'yahoo' },
  { id: '^IXIC', symbol: '^IXIC', name: 'NASDAQ Composite', nameHe: 'נאסדק מורכב', market: 'US', marketDataSource: 'yahoo' },
  { id: '^RUT', symbol: '^RUT', name: 'Russell 2000', nameHe: 'ראסל 2000', market: 'US', marketDataSource: 'yahoo' },
  { id: '^VIX', symbol: '^VIX', name: 'CBOE Volatility Index', nameHe: 'מדד הפחד VIX', market: 'US', marketDataSource: 'yahoo' },
  
  // Israeli Indices
  { id: '^TA35.TA', symbol: '^TA35.TA', name: 'Tel Aviv 35', nameHe: 'ת"א 35', market: 'IL', marketDataSource: 'yahoo' },
  { id: '^TA125.TA', symbol: '^TA125.TA', name: 'Tel Aviv 125', nameHe: 'ת"א 125', market: 'IL', marketDataSource: 'yahoo' },
  { id: '^TA90.TA', symbol: '^TA90.TA', name: 'Tel Aviv 90', nameHe: 'ת"א 90', market: 'IL', marketDataSource: 'yahoo' },
  { id: '^TABANK.TA', symbol: '^TABANK.TA', name: 'Tel Aviv Banks', nameHe: 'ת"א בנקים', market: 'IL', marketDataSource: 'yahoo' },
  { id: '^TAREALESTATE.TA', symbol: '^TAREALESTATE.TA', name: 'Tel Aviv Real Estate', nameHe: 'ת"א נדל"ן', market: 'IL', marketDataSource: 'yahoo' },
  
  // European Indices
  { id: '^FTSE', symbol: '^FTSE', name: 'FTSE 100', nameHe: 'פוטסי 100 (בריטניה)', market: 'EU', marketDataSource: 'yahoo' },
  { id: '^GDAXI', symbol: '^GDAXI', name: 'DAX', nameHe: 'דאקס (גרמניה)', market: 'EU', marketDataSource: 'yahoo' },
  { id: '^FCHI', symbol: '^FCHI', name: 'CAC 40', nameHe: 'קאק 40 (צרפת)', market: 'EU', marketDataSource: 'yahoo' },
  
  // Asian Indices
  { id: '^N225', symbol: '^N225', name: 'Nikkei 225', nameHe: 'ניקיי 225 (יפן)', market: 'ASIA', marketDataSource: 'yahoo' },
  { id: '^HSI', symbol: '^HSI', name: 'Hang Seng', nameHe: 'האנג סנג (הונג קונג)', market: 'ASIA', marketDataSource: 'yahoo' },
  { id: '000001.SS', symbol: '000001.SS', name: 'Shanghai Composite', nameHe: 'שנחאי (סין)', market: 'ASIA', marketDataSource: 'yahoo' },
];

/**
 * Search market indices
 * Combines local popular indices with Yahoo Finance search
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of index objects
 */
export const searchIndices = async (query) => {
  if (!query || query.trim().length < 1) {
    // Return popular indices when no query
    return POPULAR_INDICES.slice(0, 10).map(idx => ({
      ...idx,
      image: null,
      assetType: 'INDEX'
    }));
  }

  const cacheKey = `index:${query.toLowerCase().trim()}`;
  const cached = getCachedResult(cacheKey);
  if (cached) {
    return cached;
  }

  const normalizedQuery = query.toLowerCase().trim();
  
  // Search local popular indices first
  const localResults = POPULAR_INDICES.filter(idx => {
    return idx.symbol.toLowerCase().includes(normalizedQuery) ||
           idx.name.toLowerCase().includes(normalizedQuery) ||
           idx.nameHe.includes(query);
  }).map(idx => ({
    ...idx,
    image: null,
    assetType: 'INDEX'
  }));

  // If we have local results, return them
  if (localResults.length > 0) {
    setCachedResult(cacheKey, localResults);
    return localResults;
  }

  // Fallback: Search Yahoo Finance for indices
  try {
    const targetUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query.trim())}&quotesCount=20&newsCount=0`;
    
    let proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    let response = await fetch(proxyUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    let usingAllOrigins = false;
    if (!response.ok) {
      proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      response = await fetch(proxyUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      usingAllOrigins = true;
    }

    if (response.ok) {
      let data;
      const responseText = await response.text();
      
      try {
        const parsed = JSON.parse(responseText);
        if (usingAllOrigins && parsed.contents) {
          data = JSON.parse(parsed.contents);
        } else {
          data = parsed;
        }
      } catch (parseError) {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          data = parsed.contents ? JSON.parse(parsed.contents) : parsed;
        } else {
          throw new Error('Could not parse response');
        }
      }
      
      if (data && data.quotes && Array.isArray(data.quotes)) {
        // Filter for INDEX type only
        const indices = data.quotes.filter(quote => 
          quote.quoteType === 'INDEX' || 
          (quote.symbol && quote.symbol.startsWith('^'))
        );
        
        const results = indices.slice(0, 10).map(quote => ({
          id: quote.symbol,
          symbol: quote.symbol,
          name: quote.shortname || quote.longname || quote.symbol,
          nameHe: quote.shortname || quote.symbol,
          image: null,
          marketDataSource: 'yahoo',
          assetType: 'INDEX'
        }));

        setCachedResult(cacheKey, results);
        return results;
      }
    }
  } catch (error) {
    console.warn('Error searching indices via Yahoo Finance:', error);
  }

  return [];
};

/**
 * Main search function that routes to appropriate API based on asset type
 * @param {string} query - Search query
 * @param {string} assetType - "crypto" | "us-stock" | "il-stock" | "index" | "stock" (legacy)
 * @returns {Promise<Array>} Array of asset objects
 */
export const searchAssets = async (query, assetType) => {
  if (assetType === 'crypto') {
    return await searchCryptoAssets(query);
  } else if (assetType === 'us-stock') {
    return await searchUSStocks(query);
  } else if (assetType === 'il-stock') {
    return await searchIsraeliStocks(query);
  } else if (assetType === 'index') {
    return await searchIndices(query);
  } else if (assetType === 'stock') {
    // Legacy: default to US stocks
    return await searchUSStocks(query);
  }
  
  return [];
};

/**
 * Clear the search cache (useful for testing or manual refresh)
 */
export const clearSearchCache = () => {
  searchCache.clear();
};

