/**
 * Backend API Service
 * Client-side wrapper for Vercel Functions API
 * Handles caching, error handling, and response normalization
 */

import { getCache, setCache, getCacheKey, getTTL } from '../utils/indexedDbCache';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

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
            const data = await response.json();
            const ttl = getTTL(cacheType);
            await setCache(cacheKey, data, ttl);
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

    const data = await response.json();

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
        const getUrl = `${API_BASE}/quote?${uncachedIds.map(id => `ids=${encodeURIComponent(id)}`).join('&')}`;
        const useGet = getUrl.length < 2000;
        
        const url = useGet ? getUrl : `${API_BASE}/quote`;
        const response = await fetch(url, {
          method: useGet ? 'GET' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          ...(useGet ? {} : { body: JSON.stringify({ ids: uncachedIds }) }),
        });

        if (response.ok) {
          const data = await response.json();
          
          // Ensure data is an array
          if (!Array.isArray(data)) {
            console.warn('Quote API returned non-array response:', data);
            // If it's a single object, wrap it in array; otherwise use empty array
            const quotes = data ? [data] : [];
            
            // Cache each result
            for (const quote of quotes) {
              if (quote && quote.id) {
                const cacheKey = getCacheKey('quote', quote.id);
                const ttl = getTTL('quote');
                await setCache(cacheKey, quote, ttl);
              }
            }
            
            allResults.push(...quotes);
          } else {
            // Cache each result
            for (const quote of data) {
              if (quote && quote.id) {
                const cacheKey = getCacheKey('quote', quote.id);
                const ttl = getTTL('quote');
                await setCache(cacheKey, quote, ttl);
              }
            }
            
            allResults.push(...data);
          }
        }
      } catch (error) {
        console.error('Error fetching quotes:', error);
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
 * @returns {Promise<Object>} History result with points array
 */
export async function getHistory(id, range = '1mo', interval = '1d') {
  if (!id) {
    return null;
  }

  const cacheKey = getCacheKey('history', id, range, interval);
  const url = `${API_BASE}/history?id=${encodeURIComponent(id)}&range=${range}&interval=${interval}`;
  
  const result = await fetchWithCache(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  }, cacheKey, 'history');

  return result.data || null;
}

/**
 * Get exchange rate
 * @param {string} base - Base currency (default: USD)
 * @param {string} quote - Quote currency (default: ILS)
 * @returns {Promise<Object>} FX result with rate
 */
export async function getFx(base = 'USD', quote = 'ILS') {
  const cacheKey = getCacheKey('fx', base, quote);
  const url = `${API_BASE}/fx?base=${base}&quote=${quote}`;
  
  const result = await fetchWithCache(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  }, cacheKey, 'fx');

  return result.data || null;
}
