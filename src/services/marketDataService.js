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
  });
};

// ==================== PROXY HELPER (PRODUCTION FIX) ====================

async function fetchWithFallbackProxy(targetUrl, options = {}) {
  // 1. corsproxy.io - מהיר, תומך POST, אבל לפעמים נחסם בשרתים
  const proxy1 = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

  // 2. allorigins.win - אמין יותר כגיבוי, אבל תומך רק ב-GET
  const proxy2 = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

  try {
    const res1 = await fetch(proxy1, options);
    if (res1.ok) return res1;
    console.warn(`[PROXY] Primary failed for ${targetUrl}, trying backup...`);
  } catch (e) {
    console.warn(`[PROXY] Primary error for ${targetUrl}:`, e.message);
  }

  // גיבוי (רק אם זו בקשת GET)
  if (!options.method || options.method === 'GET') {
    try {
      const res2 = await fetch(proxy2);
      if (res2.ok) {
        const json = await res2.json();
        return new Response(json.contents, { status: 200 });
      }
    } catch (e) {
      console.error(`[PROXY] Backup failed for ${targetUrl}`);
    }
  }

  return { ok: false };
}

// ==================== HELPER: GLOBES NAME FETCH ====================

async function getNameFromGlobes(securityId) {
  try {
    const targetUrl = "https://www.globes.co.il/Portal/Handlers/GTOFeeder.ashx";
    const proxyUrl = `https://corsproxy.io/?${targetUrl}`; // גלובס דורש POST, חייבים corsproxy

    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `instrumentId=${securityId}&type=49`
    });

    if (!response.ok) return null;

    const json = await response.json();
    const securityData = json?.[0]?.Table?.Security?.[0];

    if (securityData) {
      const name = securityData.HebName || securityData.EngName;
      if (name) return name.trim();
    }
    return null;
  } catch (e) {
    console.warn(`[NAME REPAIR] Globes fetch failed:`, e);
    return null;
  }
}

/**
 * Fetch with Multi-Proxy Rotation (5 proxies) - Same as priceService
 * Tries multiple CORS proxies sequentially to handle production blocking
 */
async function fetchWithProxyRotation(targetUrl, options = {}) {
  const method = options.method || 'GET';
  const isPost = method === 'POST';

  // Proxy configurations with capabilities
  const proxies = [
    {
      name: 'corsproxy.io',
      url: `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
      supportsPost: true,
      index: 1
    },
    {
      name: 'codetabs',
      url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
      supportsPost: false,
      index: 2
    },
    {
      name: 'allorigins',
      url: `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
      supportsPost: false,
      requiresUnwrap: true,
      index: 3
    },
    {
      name: 'thingproxy',
      url: `https://thingproxy.freeboard.io/fetch/${targetUrl}`,
      supportsPost: true,
      index: 4
    },
    {
      name: 'cors.eu.org',
      url: `https://cors.eu.org/${targetUrl}`,
      supportsPost: true,
      index: 5
    }
  ];

  // Filter proxies based on request method
  const viableProxies = proxies.filter(proxy => !isPost || proxy.supportsPost);

  for (const proxy of viableProxies) {
    try {
      console.log(`[PROXY ${proxy.index}/${proxies.length}] Trying ${proxy.name} for ${targetUrl}...`);

      // Create fetch options for this proxy
      const proxyOptions = { ...options };

      // Some proxies don't support custom headers/methods in the same way
      if (!proxy.supportsPost && isPost) {
        continue; // Skip if POST not supported
      }

      // Set timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      proxyOptions.signal = controller.signal;

      const response = await fetch(proxy.url, proxyOptions);
      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`[PROXY] ✅ Success with ${proxy.name}`);

        // Unwrap response if needed (e.g., allorigins)
        if (proxy.requiresUnwrap) {
          const json = await response.json();
          return new Response(json.contents, {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return response;
      }

      console.warn(`[PROXY] ${proxy.name} returned ${response.status}`);

    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn(`[PROXY] ${proxy.name} timed out`);
      } else {
        console.warn(`[PROXY] ${proxy.name} error:`, error.message);
      }
    }
  }

  console.error(`[PROXY] ❌ All proxies failed for ${targetUrl}`);
  return { ok: false };
}

/**
 * Search crypto assets directly from CoinGecko via browser (with proxy rotation)
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of asset objects with { id, symbol, name, image }
 */
async function searchCryptoAssetsFromBrowser(query) {
  try {
    const targetUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query.trim())}`;
    
    console.log(`[COINGECKO SEARCH] Searching for "${query}"...`);

    const response = await fetchWithProxyRotation(targetUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      console.warn(`[COINGECKO SEARCH] HTTP error ${response.status} for "${query}"`);
      return [];
    }

    // Parse response - handle both direct JSON and allorigins wrapped format
    let json;
    try {
      const responseText = await response.text();
      try {
        json = JSON.parse(responseText);
        // If allorigins wrapped the response, unwrap it
        if (json.contents) {
          json = JSON.parse(json.contents);
        }
      } catch (parseError) {
        console.warn(`[COINGECKO SEARCH] Failed to parse JSON:`, parseError);
        return [];
      }
    } catch (error) {
      console.warn(`[COINGECKO SEARCH] Failed to read response:`, error);
      return [];
    }

    const coins = (json.coins || []).slice(0, 10); // Limit to 10 results

    const results = coins.map(coin => ({
      id: coin.id, // CoinGecko ID (e.g., "bitcoin")
      symbol: coin.symbol?.toUpperCase() || coin.id,
      name: coin.name || coin.id,
      image: coin.thumb || coin.large || null,
      marketDataSource: 'coingecko'
    }));

    console.log(`[COINGECKO SEARCH] ✅ Found ${results.length} results for "${query}"`);
    return results;
  } catch (error) {
    console.warn(`[COINGECKO SEARCH] Fetch failed for "${query}":`, error.message);
    return [];
  }
}

/**
 * Search crypto assets using browser (CoinGecko via proxy)
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
    const cryptoResults = await searchCryptoAssetsFromBrowser(query);

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
// ==================== ISRAELI STOCK SEARCH (THE FIX) ====================

async function searchIsraeliStocksFromBrowser(query) {
  if (!query || query.trim().length < 1) return [];

  const cleanQuery = query.trim();
  const isNumber = /^\d+$/.test(cleanQuery);
  const results = [];

  if (isNumber) {
    try {
      console.log(`[BROWSER SEARCH] Direct lookup for ID: ${cleanQuery}`);
      const funderUrl = `https://www.funder.co.il/fund/${cleanQuery}`;

      // שימוש בפרוקסי חכם (כולל גיבוי לפרודקשיין)
      const response = await fetchWithFallbackProxy(funderUrl);

      if (response.ok) {
        const html = await response.text();
        let cleanName = null;

        // חיפוש שם בכמה וריאציות
        let nameMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
          html.match(/<meta property="og:title" content="([^"]*)"/i) ||
          html.match(/<title>([\s\S]*?)<\/title>/i);

        if (nameMatch && nameMatch[1]) {
          cleanName = nameMatch[1]
            .replace(/– Funder|– פאנדר|פאנדר|קרן נאמנות:|תעודת סל:/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/<[^>]*>/g, '');
        }

        // --- התיקון הקריטי: זיהוי השם הגנרי ---
        // בדיקה מחמירה יותר: כל מה שמכיל "פורטל" או מתחיל במקף
        const isGeneric = !cleanName ||
          cleanName.includes("פורטל") ||
          cleanName.startsWith("-") ||
          cleanName.length > 60;

        if (isGeneric) {
          console.log(`[BROWSER SEARCH] Generic name detected ("${cleanName}"), attempting repair via Globes...`);
          const globesName = await getNameFromGlobes(cleanQuery);

          if (globesName) {
            console.log(`[BROWSER SEARCH] ✅ Name repaired: ${globesName}`);
            cleanName = globesName;
          } else {
            // אם גלובס נכשל, נשתמש בברירת מחדל נקייה
            cleanName = `נייר ערך ${cleanQuery}`;
          }
        }

        if (cleanName) {
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
          return results;
        }
      }
    } catch (e) {
      console.warn('[BROWSER SEARCH] Direct lookup failed:', e);
    }
  }

  // Fallback to original API logic if direct lookup didn't yield result (or not a number)
  // This preserves the previous strategy 2 if needed, or we can just return what we have.
  // The user prompt implied we replace the body.
  // Given "fallback (Same as before)" comment, I should probably reinstate the Search API part if I want to be 100% compliant with "Same as before".
  // BUT the user provided code block ends with `// ... (API Fallback Logic - Same as before) ... return results;`
  // So I actually need to keep the API logic? 
  // Let's copy the API logic from the *current* file (lines 392-428) back in here.

  // --- STRATEGY 2: SEARCH API (Fallback for names/text) ---
  try {
    const searchUrl = `https://www.funder.co.il/api/search?q=${encodeURIComponent(cleanQuery)}`;
    const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(searchUrl)}`;

    console.log(`[IL SEARCH] Trying Funder API search for "${cleanQuery}"...`);
    const response = await fetch(corsProxyUrl);

    if (response.ok) {
      const data = await response.json();
      let apiResults = [];

      if (Array.isArray(data)) apiResults = data;
      else if (data.results) apiResults = data.results;
      else if (data.data) apiResults = data.data;

      if (apiResults.length > 0) {
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
        console.log(`[IL SEARCH] ✅ Found ${mapped.length} results from Funder API`);
      }
    }
  } catch (error) {
    console.warn('[IL SEARCH] Funder API search failed:', error);
  }

  // --- STRATEGY 3: YAHOO FINANCE  FALLBACK (NEW!) ---
  // Try Yahoo if no results from Funder/Globes
  if (results.length === 0) {
    try {
      console.log(`[IL SEARCH] 🔄 No results from Funder/Globes, trying Yahoo Finance fallback for "${cleanQuery}"...`);

      // Search Yahoo Finance with .TA suffix
      const yahooQuery = cleanQuery.includes('.TA') ? cleanQuery : `${cleanQuery}.TA`;
      const targetUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(yahooQuery)}&quotesCount=10&newsCount=0`;

      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();

        if (data && data.quotes && Array.isArray(data.quotes)) {
          // Filter for Israeli stocks (.TA suffix)
          const israeliQuotes = data.quotes.filter(quote =>
            (quote.symbol || '').endsWith('.TA') &&
            (quote.quoteType === 'EQUITY' || quote.quoteType === 'ETF')
          );

          if (israeliQuotes.length > 0) {
            const yahooResults = israeliQuotes.slice(0, 5).map(quote => ({
              id: `yahoo:${quote.symbol}`,
              symbol: quote.symbol,
              name: quote.shortname || quote.longname || quote.symbol,
              nameHe: quote.shortname || quote.longname || quote.symbol,
              image: null,
              marketDataSource: 'yahoo',
              provider: 'yahoo',
              exchange: 'TASE',
              extra: { source: 'yahoo-fallback' }
            }));

            results.push(...yahooResults);
            console.log(`[IL SEARCH] ✅ Found ${yahooResults.length} Israeli stocks from Yahoo Finance fallback`);
          } else {
            console.log(`[IL SEARCH] No Israeli (.TA) stocks found in Yahoo results for "${yahooQuery}"`);
          }
        }
      } else {
        console.warn(`[IL SEARCH] Yahoo fallback HTTP error: ${response.status}`);
      }
    } catch (error) {
      console.warn('[IL SEARCH] Yahoo Finance fallback failed:', error);
    }
  }

  console.log(`[IL SEARCH] Total results for "${cleanQuery}": ${results.length}`);
  return results;
}
/**
 * Search Israeli stocks (TASE - Tel Aviv Stock Exchange)
 * Uses backend API when available (production/vercel:dev)
 * Falls back to client-side browser search when backend unavailable (npm run dev)
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of asset objects
 */
export const searchIsraeliStocks = searchIsraeliStocksFromBrowser;

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
  if (assetType === 'crypto') return await searchCryptoAssets(query);
  if (assetType === 'il-stock') return await searchIsraeliStocksFromBrowser(query); // Force browser for IL
  if (assetType === 'us-stock') return await searchUSStocks(query);
  if (assetType === 'index') return await searchIndices(query);

  // Legacy / Default
  return await searchCryptoAssets(query);
};

/**
 * Clear the search cache (useful for testing or manual refresh)
 */
export const clearSearchCache = () => {
  searchCache.clear();
};

