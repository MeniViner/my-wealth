/**
 * IndexedDB Cache Module
 * Provides persistent client-side caching for API responses
 * Cache keys: search:q:<query>, quote:<id>, history:<id>:<range>:<interval>
 */

const DB_NAME = 'WealthCache';
const DB_VERSION = 1;
const STORE_NAME = 'cache';

let dbPromise = null;

/**
 * Initialize IndexedDB
 */
function initDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('fetchedAt', 'fetchedAt', { unique: false });
      }
    };
  });

  return dbPromise;
}

/**
 * Get cached value
 * @param {string} key - Cache key
 * @returns {Promise<{value: any, fetchedAt: number, ttlMs: number} | null>}
 */
export async function getCache(key) {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        // Check if expired
        const now = Date.now();
        const age = now - result.fetchedAt;
        if (age > result.ttlMs) {
          // Expired - delete and return null
          deleteCache(key).catch(console.error);
          resolve(null);
          return;
        }

        resolve({
          value: result.value,
          fetchedAt: result.fetchedAt,
          ttlMs: result.ttlMs,
        });
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('IndexedDB getCache error:', error);
    return null;
  }
}

/**
 * Set cached value
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttlMs - Time to live in milliseconds
 */
export async function setCache(key, value, ttlMs = 3600000) {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const cacheEntry = {
      key,
      value,
      fetchedAt: Date.now(),
      ttlMs,
    };

    await new Promise((resolve, reject) => {
      const request = store.put(cacheEntry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('IndexedDB setCache error:', error);
  }
}

/**
 * Delete cached value
 * @param {string} key - Cache key
 */
export async function deleteCache(key) {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('IndexedDB deleteCache error:', error);
  }
}

/**
 * Clear all cache
 */
export async function clearAllCache() {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('IndexedDB clearAllCache error:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const entries = request.result;
        const now = Date.now();
        const valid = entries.filter(e => (now - e.fetchedAt) < e.ttlMs);
        const expired = entries.length - valid.length;

        resolve({
          total: entries.length,
          valid: valid.length,
          expired,
        });
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('IndexedDB getCacheStats error:', error);
    return { total: 0, valid: 0, expired: 0 };
  }
}

/**
 * Cache helper with automatic TTL based on cache type
 */
export function getCacheKey(type, ...parts) {
  return `${type}:${parts.join(':')}`;
}

/**
 * Get TTL for different cache types (in milliseconds)
 */
export function getTTL(type) {
  switch (type) {
    case 'search':
      return 24 * 60 * 60 * 1000; // 24 hours
    case 'quote':
      return 5 * 60 * 1000; // 5 minutes
    case 'history':
      return 60 * 60 * 1000; // 1 hour
    case 'fx':
      return 60 * 60 * 1000; // 1 hour
    default:
      return 60 * 60 * 1000; // 1 hour default
  }
}
