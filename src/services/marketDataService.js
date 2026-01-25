/**
 * Market Data Service
 * Provides search functionality for crypto and stock assets
 * Now uses backend API (Vercel Functions) to avoid CORS issues
 */

import { searchAssets as backendSearchAssets } from './backendApi';

// In-memory cache for search results (fallback, IndexedDB is primary)
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
 * Search crypto assets using backend API
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
    const results = await backendSearchAssets(query);

    // Filter for crypto only and map to our format
    const cryptoResults = results
      .filter(r => r.type === 'crypto')
      .map(result => ({
        id: result.id.replace('cg:', ''), // Remove prefix for backward compatibility
        symbol: result.symbol,
        name: result.name,
        image: result.extra?.image || null,
        marketDataSource: 'coingecko'
      }));

    setCachedResult(cacheKey, cryptoResults);
    return cryptoResults;
  } catch (error) {
    console.error('Error searching crypto assets:', error);
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

// ==================== CLIENT-SIDE ISRAELI STOCK SEARCH ====================

/**
 * Search Israeli stocks from browser using CORS proxy
 * Fallback when backend API is unavailable (e.g., npm run dev)
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of Israeli stock results
 */
// async function searchIsraeliStocksFromBrowser(query) {
//   if (!query || query.trim().length < 1) {
//     return [];
//   }

//   try {
//     // Funder.co.il search endpoint
//     const searchUrl = `https://www.funder.co.il/api/search?q=${encodeURIComponent(query.trim())}`;
//     const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(searchUrl)}`;

//     console.log(`[BROWSER SEARCH] Searching Israeli stocks for "${query}" via CORS proxy...`);

//     const response = await fetch(corsProxyUrl, {
//       method: 'GET',
//       headers: {
//         'Accept': 'application/json',
//         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
//       }
//     });

//     if (!response.ok) {
//       console.warn(`[BROWSER SEARCH] Failed to fetch: HTTP ${response.status}`);
//       return [];
//     }

//     const text = await response.text();
//     let data;

//     // Try to parse JSON
//     try {
//       data = JSON.parse(text);
//     } catch (parseError) {
//       // If not JSON, try to extract from HTML
//       console.warn('[BROWSER SEARCH] Response is not JSON, attempting HTML extraction');

//       // Try to find JSON embedded in HTML (common pattern)
//       const jsonMatch = text.match(/"results"\s*:\s*\[([^\]]+)\]/);
//       if (jsonMatch) {
//         try {
//           data = JSON.parse(`{"results":[${jsonMatch[1]}]}`);
//         } catch (e) {
//           console.warn('[BROWSER SEARCH] Could not extract JSON from HTML');
//           return [];
//         }
//       } else {
//         return [];
//       }
//     }

//     // Process results - handle different response formats
//     let results = [];

//     if (Array.isArray(data)) {
//       results = data;
//     } else if (data.results && Array.isArray(data.results)) {
//       results = data.results;
//     } else if (data.data && Array.isArray(data.data)) {
//       results = data.data;
//     } else if (data.securities && Array.isArray(data.securities)) {
//       results = data.securities;
//     }

//     // Map to our format
//     const mappedResults = results
//       .filter(item => item && (item.securityNumber || item.id || item.symbol))
//       .slice(0, 10) // Limit to 10 results
//       .map(item => {
//         const securityId = item.securityNumber || item.securityId || item.id;
//         const symbol = item.symbol || item.ticker || `${securityId}.TA`;
//         const nameHe = item.nameHe || item.hebrewName || item.name_he || item.name;
//         const nameEn = item.nameEn || item.englishName || item.name_en || item.name;

//         return {
//           id: `tase:${securityId}`,
//           symbol: symbol,
//           name: nameEn || nameHe || symbol,
//           nameHe: nameHe || nameEn || symbol,
//           securityId: securityId,
//           image: null,
//           marketDataSource: 'tase-local',
//           provider: 'tase-local',
//           exchange: 'TASE',
//           extra: {
//             securityNumber: securityId,
//             source: 'funder-browser'
//           }
//         };
//       });

//     console.log(`[BROWSER SEARCH] Found ${mappedResults.length} Israeli stocks`);
//     return mappedResults;

//   } catch (error) {
//     console.error('[BROWSER SEARCH] Error searching Israeli stocks:', error.message);
//     return [];
//   }
// };
/**
 * Search Israeli stocks from browser using CORS proxy
 * IMPROVED: Supports direct ID lookup via scraping if API fails
 */
async function searchIsraeliStocksFromBrowser(query) {
  if (!query || query.trim().length < 1) {
    return [];
  }

  const cleanQuery = query.trim();
  const isNumber = /^\d+$/.test(cleanQuery);
  const results = [];

  // --- STRATEGY 1: DIRECT PAGE SCRAPING (Best for Security IDs) ---
  // אם החיפוש הוא מספר, ננסה לגשת ישירות לדף הקרן (כמו שעשינו במשיכת המחיר)
  // זה עוקף את ה-API של החיפוש שנופל ב-404
  if (isNumber) {
    try {
      console.log(`[BROWSER SEARCH] Attempting direct page lookup for ID: ${cleanQuery}`);
      const funderUrl = `https://www.funder.co.il/fund/${cleanQuery}`;
      const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(funderUrl)}`;

      const response = await fetch(corsProxyUrl);
      
      if (response.ok) {
        const html = await response.text();
        // בדיקה בסיסית אם זה דף תקין (מחפשים את השם בכותרת או במטא)
        // בדרך כלל השם מופיע בתוך <h1 class="font-weight-bold">שם הקרן</h1> או ב-title
        const nameMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([\s\S]*?)<\/title>/i);
        
        if (nameMatch && nameMatch[1]) {
          let cleanName = nameMatch[1].replace(/– Funder|– פאנדר|פאנדר/g, '').trim();
          // ניקוי תגיות HTML אם נשארו
          cleanName = cleanName.replace(/<[^>]*>/g, '').trim();

          console.log(`[BROWSER SEARCH] ✅ Direct lookup success! Found: ${cleanName}`);
          
          results.push({
            id: `tase:${cleanQuery}`,
            symbol: cleanQuery,
            name: cleanName,
            nameHe: cleanName,
            securityId: cleanQuery,
            image: null,
            marketDataSource: 'tase-local',
            provider: 'tase-local',
            exchange: 'TASE',
            extra: { securityNumber: cleanQuery }
          });
          
          // אם מצאנו בשיטה הישירה, אין טעם להמשיך ל-API
          return results;
        }
      }
    } catch (e) {
      console.warn('[BROWSER SEARCH] Direct lookup failed:', e);
    }
  }

  // --- STRATEGY 2: SEARCH API (Fallback for names/text) ---
  try {
    const searchUrl = `https://www.funder.co.il/api/search?q=${encodeURIComponent(cleanQuery)}`;
    const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(searchUrl)}`;

    console.log(`[BROWSER SEARCH] Trying Search API for "${cleanQuery}"...`);

    const response = await fetch(corsProxyUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (response.ok) {
      const data = await response.json();
      let apiResults = [];

      if (Array.isArray(data)) apiResults = data;
      else if (data.results) apiResults = data.results;
      else if (data.data) apiResults = data.data;

      const mapped = apiResults
        .filter(item => item && (item.securityNumber || item.id))
        .map(item => {
          const sid = item.securityNumber || item.id;
          return {
            id: `tase:${sid}`,
            symbol: item.symbol || sid,
            name: item.name || item.hebrewName || sid,
            nameHe: item.nameHe || item.name,
            securityId: sid,
            marketDataSource: 'tase-local',
            exchange: 'TASE'
          };
        });
      
      results.push(...mapped);
    }
  } catch (error) {
    console.warn('[BROWSER SEARCH] Search API failed (expected for proxy):', error.message);
  }

  return results;
}
/**
 * Search Israeli stocks (TASE - Tel Aviv Stock Exchange)
 * Uses backend API when available (production/vercel:dev)
 * Falls back to client-side browser search when backend unavailable (npm run dev)
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

  // Try backend first (works in production and with vercel:dev)
  try {
    const results = await backendSearchAssets(query);

    // Filter for Israeli stocks (TASE-local or .TA symbols or IL country)
    const israeliResults = results
      .filter(r =>
        r.provider === 'tase-local' ||
        r.country === 'IL' ||
        (r.symbol && r.symbol.endsWith('.TA'))
      )
      .map(result => {
        // Map to our format - preserve prefixed ID for TASE assets
        const mapped = {
          // Keep the full prefixed ID (e.g., "tase:1183441") for TASE assets
          id: result.id.startsWith('tase:')
            ? result.id  // Keep full "tase:1183441" format
            : result.id.startsWith('yahoo:') || result.id.startsWith('cg:')
              ? result.id  // Keep prefixed format
              : result.symbol,  // Fallback to symbol for non-prefixed IDs
          symbol: result.symbol,
          name: result.name,
          nameHe: result.nameHe || result.name,
          image: result.extra?.image || null,
          marketDataSource: result.provider === 'tase-local' ? 'tase-local' : 'yahoo',
          provider: result.provider,
          exchange: result.exchange,
          extra: result.extra
        };

        // Add TASE-specific fields if available
        if (result.provider === 'tase-local' && result.extra?.securityNumber) {
          mapped.securityId = result.extra.securityNumber;
          // Ensure apiId is in correct format
          if (!mapped.id.startsWith('tase:')) {
            mapped.id = `tase:${result.extra.securityNumber}`;
          }
        }

        return mapped;
      });

    setCachedResult(cacheKey, israeliResults);
    return israeliResults;
  } catch (error) {
    // Backend failed - fallback to client-side browser search
    console.log('[ISRAELI SEARCH] Backend unavailable, using browser fallback...');

    try {
      const browserResults = await searchIsraeliStocksFromBrowser(query);

      if (browserResults.length > 0) {
        setCachedResult(cacheKey, browserResults);
      }

      return browserResults;
    } catch (browserError) {
      console.error('[ISRAELI SEARCH] Browser fallback also failed:', browserError);
      return [];
    }
  }
};

/**
 * Search US stocks (exclude Israeli stocks) - via backend API
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

  try {
    const results = await backendSearchAssets(query);

    // Filter for US stocks (exclude Israeli, exclude indices unless they're US indices)
    const usResults = results
      .filter(r =>
        (r.type === 'equity' || r.type === 'etf') &&
        r.country !== 'IL' &&
        !r.symbol?.endsWith('.TA')
      )
      .map(result => ({
        id: result.symbol,
        symbol: result.symbol,
        name: result.name,
        image: result.extra?.image || null,
        marketDataSource: 'yahoo'
      }));

    setCachedResult(cacheKey, usResults);
    return usResults;
  } catch (error) {
    console.error('Error searching US stocks:', error);
    return [];
  }
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
 * Search market indices - via backend API
 * Combines local popular indices with backend search
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

  // Fallback: Search backend API for indices
  try {
    const results = await backendSearchAssets(query);

    // Filter for indices only
    const indexResults = results
      .filter(r => r.type === 'index')
      .map(result => ({
        id: result.symbol,
        symbol: result.symbol,
        name: result.name,
        nameHe: result.name,
        image: null,
        marketDataSource: 'yahoo',
        assetType: 'INDEX'
      }));

    setCachedResult(cacheKey, indexResults);
    return indexResults;
  } catch (error) {
    console.warn('Error searching indices:', error);
    return [];
  }
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

