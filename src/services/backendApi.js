/**
 * Backend API Service
 * Client-side wrapper for Vercel Functions API
 * Handles caching, error handling, and response normalization
 */

import { getCache, setCache, getCacheKey, getTTL } from '../utils/indexedDbCache';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/**
 * Normalize response to array
 * Handles both single object and array responses from backend
 * @param {any} x - Response data (can be array, object, null, undefined)
 * @returns {Array} Always returns an array
 */
function normalizeToArray(x) {
  if (Array.isArray(x)) {
    return x;
  }
  if (x === null || x === undefined) {
    return [];
  }
  if (typeof x === 'object') {
    // Handle nested data structures (e.g., { data: [...] } or { quotes: [...] })
    if (Array.isArray(x.data)) {
      return x.data;
    }
    if (Array.isArray(x.quotes)) {
      return x.quotes;
    }
    if (Array.isArray(x.results)) {
      return x.results;
    }
    // Single object - wrap in array
    return [x];
  }
  return [];
}

/**
 * Fetch with cache-first strategy
 */
async function fetchWithCache(url, options = {}, cacheKey, cacheType) {
  // Try cache first
  if (cacheKey) {
    const cached = await getCache(cacheKey);
    if (cached) {
      // Return cached value immediately
      // Trigger background refresh
      fetch(url, options)
        .then(async (response) => {
          if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const data = await response.json();
              const ttl = getTTL(cacheType);
              await setCache(cacheKey, data, ttl);
            }
          }
        })
        .catch(console.error);

      return { data: cached.value, fromCache: true };
    }
  }

  // Fetch from API
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      // If fetch fails and we have cached data, return stale cache
      if (cacheKey) {
        const staleCache = await getCache(cacheKey);
        if (staleCache) {
          return {
            data: staleCache.value,
            fromCache: true,
            isStale: true
          };
        }
      }
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    // Check Content-Type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      // If response starts with looking like HTML or JS import
      if (text.trim().startsWith('<') || text.trim().startsWith('import ') || text.trim().startsWith('export ')) {
        throw new Error(
          `Received non-JSON response from API (likely HTML/JS). \n` +
          `If running locally, please ensure you are running 'npm run vercel:dev' instead of 'npm run dev', ` +
          `or set VITE_API_BASE to a running backend instance.`
        );
      }
      // Try to parse anyway if it doesn't look obviously wrong, but expect failure
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      // If JSON parsing fails, provide the helpful error message
      throw new Error(
        `Failed to parse API response as JSON. \n` +
        `Response might be HTML or Text. \n` +
        `If running locally, please ensure you are running 'npm run vercel:dev' instead of 'npm run dev'.`
      );
    }

    // Cache the result
    if (cacheKey) {
      const ttl = getTTL(cacheType);
      await setCache(cacheKey, data, ttl);
    }

    return { data, fromCache: false };
  } catch (error) {
    // Network error - try to return stale cache
    if (cacheKey) {
      const staleCache = await getCache(cacheKey);
      if (staleCache) {
        return {
          data: staleCache.value,
          fromCache: true,
          isStale: true
        };
      }
    }
    throw error;
  }
}

/**
 * Search assets
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of search results
 */
export async function searchAssets(query) {
  if (!query || query.trim().length < 1) {
    return [];
  }

  const cacheKey = getCacheKey('search', 'q', query.trim().toLowerCase());
  const url = `${API_BASE}/search?q=${encodeURIComponent(query.trim())}`;

  const result = await fetchWithCache(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  }, cacheKey, 'search');

  // Ensure result.data is an array
  if (!result.data) {
    return [];
  }
  return Array.isArray(result.data) ? result.data : [];
}

/**
 * Get quotes for multiple assets
 * @param {string[]} ids - Array of internal asset IDs
 * @returns {Promise<Array>} Array of quote results
 */
export async function getQuotes(ids) {
  if (!ids || ids.length === 0) {
    return [];
  }

  // Fetch quotes in batches (to avoid URL length limits)
  const batchSize = 20;
  const batches = [];

  for (let i = 0; i < ids.length; i += batchSize) {
    batches.push(ids.slice(i, i + batchSize));
  }

  const allResults = [];

  for (const batch of batches) {
    // Check cache for each ID first
    const uncachedIds = [];
    const cachedResults = [];

    for (const id of batch) {
      const cacheKey = getCacheKey('quote', id);
      const cached = await getCache(cacheKey);

      if (cached) {
        cachedResults.push(cached.value);
      } else {
        uncachedIds.push(id);
      }
    }

    // Fetch uncached quotes
    if (uncachedIds.length > 0) {
      try {
        // Prefer GET for CDN caching, fallback to POST if URL would be too long
        // URL length limit: ~2000 chars is safe for most servers
        // const getUrl = `${API_BASE}/quote?${uncachedIds.map(id => `ids=${encodeURIComponent(id)}`).join('&')}`;
        // שינוי קריטי: שולחים את המזהים מופרדים בפסיקים (String) ולא כפרמטרים נפרדים (Array)
        const getUrl = `${API_BASE}/quote?ids=${uncachedIds.map(encodeURIComponent).join(',')}`;
        const useGet = getUrl.length < 2000;

        const url = useGet ? getUrl : `${API_BASE}/quote`;

        // Debug: Log POST payload in development
        const DEBUG_PRICES = import.meta.env.DEV;
        if (DEBUG_PRICES && !useGet) {
          console.log('[BACKEND API DEBUG] POST /api/quote payload:', { ids: uncachedIds });
        }

        const response = await fetch(url, {
          method: useGet ? 'GET' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          ...(useGet ? {} : { body: JSON.stringify({ ids: uncachedIds }) }),
        });

        if (response.ok) {
          const data = await response.json();

          // Normalize to array (handles both single object and array responses)
          const quotes = normalizeToArray(data);

          // Debug: Log first few returned quote IDs in development
          const DEBUG_PRICES = import.meta.env.DEV;
          if (DEBUG_PRICES && quotes.length > 0) {
            const quoteIds = quotes.slice(0, 3).map(q => q?.id).filter(Boolean);
            console.log('[BACKEND API DEBUG] First few returned quote.id values:', quoteIds);
          }

          // Cache each result (only if valid quote with id)
          for (const quote of quotes) {
            if (quote && quote.id) {
              const cacheKey = getCacheKey('quote', quote.id);
              const ttl = getTTL('quote');
              await setCache(cacheKey, quote, ttl);
            }
          }

          allResults.push(...quotes);
        } else {
          // Log diagnostic info for failed requests
          const requestId = response.headers.get('x-vercel-id') || response.headers.get('x-request-id') || 'unknown';
          const bodyText = await response.text().catch(() => '');
          const bodyPreview = bodyText.length > 200 ? bodyText.substring(0, 200) : bodyText;

          console.error('Quote API error:', {
            url,
            status: response.status,
            statusText: response.statusText,
            requestId,
            bodyPreview: bodyPreview
          });
        }
      } catch (error) {
        // Log diagnostic info for network errors
        console.error('Error fetching quotes:', {
          batchIds: uncachedIds,
          error: error.message,
          stack: error.stack
        });
      }
    }

    // Add cached results
    allResults.push(...cachedResults);
  }

  return allResults;
}

/**
 * Get history for an asset
 * @param {string} id - Internal asset ID
 * @param {string} range - Time range (1d, 5d, 1mo, 3mo, 6mo, 1y, 5y)
 * @param {string} interval - Data interval (1d, 1h, etc.)
 * @returns {Promise<Object|null>} History result with points array, or null if error/no data
 */
export async function getHistory(id, range = '1mo', interval = '1d') {
  if (!id) {
    return null;
  }

  const cacheKey = getCacheKey('history', id, range, interval);
  const url = `${API_BASE}/history?id=${encodeURIComponent(id)}&range=${range}&interval=${interval}`;

  try {
    const result = await fetchWithCache(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }, cacheKey, 'history');

    const history = result.data;

    // Handle error responses - return null instead of crashing
    if (history && (history.error || !Array.isArray(history.points))) {
      // "History data not found" is a normal case, not an error - use debug level
      if (history.error === 'History data not found') {
        console.debug(`History data not found for ${id} (this is normal)`);
      } else {
        // Real errors should be logged as warnings
        console.warn(`History error for ${id}:`, history.error || 'Invalid points array');
      }
      return null;
    }

    return history || null;
  } catch (error) {
    console.error('Error fetching history:', {
      url,
      id,
      error: error.message
    });
    return null;
  }
}

/**
 * Get exchange rate
 * @param {string} base - Base currency (default: USD)
 * @param {string} quote - Quote currency (default: ILS)
 * @returns {Promise<Object|null>} FX result with rate, or null if error
 */
export async function getFx(base = 'USD', quote = 'ILS') {
  const cacheKey = getCacheKey('fx', base, quote);
  const url = `${API_BASE}/fx?base=${base}&quote=${quote}`;

  try {
    const result = await fetchWithCache(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }, cacheKey, 'fx');

    return result.data || null;
  } catch (error) {
    console.error('Error fetching FX:', {
      url,
      error: error.message
    });
    return null;
  }
}

/**
 * Check API health (lightweight check)
 * @returns {Promise<boolean>} True if API is reachable
 */
export async function checkApiHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Short timeout for health check
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      return true;
    }
    return false;
  } catch (error) {
    // Network error or timeout
    console.warn('API health check failed:', error.message);
    return false;
  }
}
