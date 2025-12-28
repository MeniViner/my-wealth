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
 * Search stock assets using Finnhub API
 * Note: Requires API key. Falls back to manual entry if unavailable.
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of asset objects with { id, symbol, name, image }
 */
export const searchStockAssets = async (query) => {
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
 * Main search function that routes to appropriate API based on asset type
 * @param {string} query - Search query
 * @param {string} assetType - "crypto" | "stock"
 * @returns {Promise<Array>} Array of asset objects
 */
export const searchAssets = async (query, assetType) => {
  if (assetType === 'crypto') {
    return await searchCryptoAssets(query);
  } else if (assetType === 'stock') {
    return await searchStockAssets(query);
  }
  
  return [];
};

/**
 * Clear the search cache (useful for testing or manual refresh)
 */
export const clearSearchCache = () => {
  searchCache.clear();
};

