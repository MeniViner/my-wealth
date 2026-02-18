/**
 * Market Data Service
 * Provides search functionality for crypto, stocks, and indices.
 * 
 * Search routing:
 * - US Stocks: Backend API (/api/search → Yahoo Finance)
 * - Israeli Stocks: Browser scraping via CORS proxy (Funder/Globes)
 * - Crypto: Browser scraping via CORS proxy (CoinGecko)
 * - Indices: Local popular list + Backend API fallback
 */

import { searchAssets as backendSearchAssets } from './backendApi';
import { fetchWithProxy, parseProxyJson } from '../utils/corsProxy';

// ==================== CACHE ====================

const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    searchCache.delete(key);
    return null;
  }
  return entry.data;
}

function setSearchCache(key, data) {
  searchCache.set(key, { data, ts: Date.now() });
}

// ==================== CRYPTO SEARCH ====================

/**
 * Search crypto assets via CoinGecko (browser, CORS proxy)
 */
export const searchCryptoAssets = async (query) => {
  if (!query || query.trim().length < 2) return [];

  const cacheKey = `crypto:${query.toLowerCase().trim()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query.trim())}`;
    const response = await fetchWithProxy(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) return [];

    const json = await parseProxyJson(response);
    const coins = (json.coins || []).slice(0, 10);

    const results = coins.map(coin => ({
      id: coin.id,
      symbol: coin.symbol?.toUpperCase() || coin.id,
      name: coin.name || coin.id,
      image: coin.thumb || coin.large || null,
      marketDataSource: 'coingecko',
    }));

    setSearchCache(cacheKey, results);
    return results;
  } catch (error) {
    console.warn('[CRYPTO SEARCH] Error:', error.message);
    return [];
  }
};

// ==================== US STOCK SEARCH ====================

/**
 * Search US stocks via backend API
 */
export const searchUSStocks = async (query) => {
  if (!query || query.trim().length < 2) return [];

  const cacheKey = `us-stock:${query.toLowerCase().trim()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const results = await backendSearchAssets(query);

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
        marketDataSource: 'yahoo',
      }));

    setSearchCache(cacheKey, usResults);
    return usResults;
  } catch (error) {
    console.error('[US STOCK SEARCH] Error:', error);
    return [];
  }
};

// ==================== ISRAELI STOCK SEARCH ====================

/**
 * Fetch Hebrew name from Globes (helper for Israeli stock name repair)
 */
async function getNameFromGlobes(securityId) {
  try {
    const targetUrl = 'https://www.globes.co.il/Portal/Handlers/GTOFeeder.ashx';
    const response = await fetchWithProxy(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `instrumentId=${securityId}&type=49`,
    });

    if (!response.ok) return null;

    const json = await response.json();
    const sec = json?.[0]?.Table?.Security?.[0];
    const name = sec?.HebName || sec?.EngName;
    return name ? name.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Search Israeli stocks via browser (CORS proxy)
 * Strategy: Direct ID lookup (Funder) -> Funder API -> Yahoo .TA fallback
 */
async function searchIsraeliStocksFromBrowser(query) {
  if (!query || query.trim().length < 1) return [];

  const cleanQuery = query.trim();
  const isNumber = /^\d+$/.test(cleanQuery);
  const results = [];

  // Strategy 1: Direct ID lookup (for numeric queries)
  if (isNumber) {
    try {
      const funderUrl = `https://www.funder.co.il/fund/${cleanQuery}`;
      const response = await fetchWithProxy(funderUrl);

      if (response.ok) {
        const html = await response.text();
        let cleanName = null;

        const nameMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
          html.match(/<meta property="og:title" content="([^"]*)"/i) ||
          html.match(/<title>([\s\S]*?)<\/title>/i);

        if (nameMatch?.[1]) {
          cleanName = nameMatch[1]
            .replace(/\u2013 Funder|\u2013 \u05E4\u05D0\u05E0\u05D3\u05E8|\u05E4\u05D0\u05E0\u05D3\u05E8|\u05E7\u05E8\u05DF \u05E0\u05D0\u05DE\u05E0\u05D5\u05EA:|\u05EA\u05E2\u05D5\u05D3\u05EA \u05E1\u05DC:/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/<[^>]*>/g, '')
            .trim();
        }

        // Name repair: detect generic/invalid names
        const isGeneric = !cleanName ||
          cleanName.includes('\u05E4\u05D5\u05E8\u05D8\u05DC') ||
          cleanName.startsWith('-') ||
          cleanName.length > 60;

        if (isGeneric) {
          const globesName = await getNameFromGlobes(cleanQuery);
          cleanName = globesName || `\u05E0\u05D9\u05D9\u05E8 \u05E2\u05E8\u05DA ${cleanQuery}`;
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
            extra: { securityNumber: cleanQuery },
          });
          return results;
        }
      }
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 2: Funder API search (for text queries)
  try {
    const searchUrl = `https://www.funder.co.il/api/search?q=${encodeURIComponent(cleanQuery)}`;
    const response = await fetchWithProxy(searchUrl);

    if (response.ok) {
      let data;
      try {
        data = await parseProxyJson(response);
      } catch {
        data = null;
      }

      let apiResults = [];
      if (Array.isArray(data)) apiResults = data;
      else if (data?.results) apiResults = data.results;
      else if (data?.data) apiResults = data.data;

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
              exchange: 'TASE',
            };
          });
        results.push(...mapped);
      }
    }
  } catch {
    // Continue to Yahoo fallback
  }

  // Strategy 3: Yahoo Finance fallback (for .TA stocks)
  if (results.length === 0) {
    try {
      const yahooQuery = cleanQuery.includes('.TA') ? cleanQuery : `${cleanQuery}.TA`;
      const targetUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(yahooQuery)}&quotesCount=10&newsCount=0`;
      const response = await fetchWithProxy(targetUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (response.ok) {
        const data = await parseProxyJson(response);
        if (data?.quotes && Array.isArray(data.quotes)) {
          const israeliQuotes = data.quotes.filter(q =>
            (q.symbol || '').endsWith('.TA') &&
            (q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
          );

          const yahooResults = israeliQuotes.slice(0, 5).map(q => ({
            id: `yahoo:${q.symbol}`,
            symbol: q.symbol,
            name: q.shortname || q.longname || q.symbol,
            nameHe: q.shortname || q.longname || q.symbol,
            image: null,
            marketDataSource: 'yahoo',
            provider: 'yahoo',
            exchange: 'TASE',
            extra: { source: 'yahoo-fallback' },
          }));
          results.push(...yahooResults);
        }
      }
    } catch {
      // All strategies exhausted
    }
  }

  return results;
}

export const searchIsraeliStocks = searchIsraeliStocksFromBrowser;

// ==================== INDICES ====================

export const POPULAR_INDICES = [
  // US
  { id: '^GSPC', symbol: '^GSPC', name: 'S&P 500', nameHe: '\u05D0\u05E1 \u05D0\u05E0\u05D3 \u05E4\u05D9 500', market: 'US', marketDataSource: 'yahoo' },
  { id: '^NDX', symbol: '^NDX', name: 'NASDAQ 100', nameHe: '\u05E0\u05D0\u05E1\u05D3\u05E7 100', market: 'US', marketDataSource: 'yahoo' },
  { id: '^DJI', symbol: '^DJI', name: 'Dow Jones Industrial', nameHe: '\u05D3\u05D0\u05D5 \u05D2\u05F3\u05D5\u05E0\u05E1', market: 'US', marketDataSource: 'yahoo' },
  { id: '^IXIC', symbol: '^IXIC', name: 'NASDAQ Composite', nameHe: '\u05E0\u05D0\u05E1\u05D3\u05E7 \u05DE\u05D5\u05E8\u05DB\u05D1', market: 'US', marketDataSource: 'yahoo' },
  { id: '^RUT', symbol: '^RUT', name: 'Russell 2000', nameHe: '\u05E8\u05D0\u05E1\u05DC 2000', market: 'US', marketDataSource: 'yahoo' },
  { id: '^VIX', symbol: '^VIX', name: 'CBOE Volatility Index', nameHe: '\u05DE\u05D3\u05D3 \u05D4\u05E4\u05D7\u05D3 VIX', market: 'US', marketDataSource: 'yahoo' },
  // Israeli
  { id: '^TA35.TA', symbol: '^TA35.TA', name: 'Tel Aviv 35', nameHe: '\u05EA"\u05D0 35', market: 'IL', marketDataSource: 'yahoo' },
  { id: '^TA125.TA', symbol: '^TA125.TA', name: 'Tel Aviv 125', nameHe: '\u05EA"\u05D0 125', market: 'IL', marketDataSource: 'yahoo' },
  { id: '^TA90.TA', symbol: '^TA90.TA', name: 'Tel Aviv 90', nameHe: '\u05EA"\u05D0 90', market: 'IL', marketDataSource: 'yahoo' },
  // European
  { id: '^FTSE', symbol: '^FTSE', name: 'FTSE 100', nameHe: '\u05E4\u05D5\u05D8\u05E1\u05D9 100 (\u05D1\u05E8\u05D9\u05D8\u05E0\u05D9\u05D4)', market: 'EU', marketDataSource: 'yahoo' },
  { id: '^GDAXI', symbol: '^GDAXI', name: 'DAX', nameHe: '\u05D3\u05D0\u05E7\u05E1 (\u05D2\u05E8\u05DE\u05E0\u05D9\u05D4)', market: 'EU', marketDataSource: 'yahoo' },
  // Asian
  { id: '^N225', symbol: '^N225', name: 'Nikkei 225', nameHe: '\u05E0\u05D9\u05E7\u05D9\u05D9 225 (\u05D9\u05E4\u05DF)', market: 'ASIA', marketDataSource: 'yahoo' },
  { id: '^HSI', symbol: '^HSI', name: 'Hang Seng', nameHe: '\u05D4\u05D0\u05E0\u05D2 \u05E1\u05E0\u05D2 (\u05D4\u05D5\u05E0\u05D2 \u05E7\u05D5\u05E0\u05D2)', market: 'ASIA', marketDataSource: 'yahoo' },
];

/**
 * Search market indices
 */
export const searchIndices = async (query) => {
  if (!query || query.trim().length < 1) {
    return POPULAR_INDICES.slice(0, 10).map(idx => ({ ...idx, image: null, assetType: 'INDEX' }));
  }

  const cacheKey = `index:${query.toLowerCase().trim()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const normalizedQuery = query.toLowerCase().trim();

  // Search local popular indices first
  const localResults = POPULAR_INDICES.filter(idx =>
    idx.symbol.toLowerCase().includes(normalizedQuery) ||
    idx.name.toLowerCase().includes(normalizedQuery) ||
    idx.nameHe.includes(query)
  ).map(idx => ({ ...idx, image: null, assetType: 'INDEX' }));

  if (localResults.length > 0) {
    setSearchCache(cacheKey, localResults);
    return localResults;
  }

  // Fallback: backend API
  try {
    const results = await backendSearchAssets(query);
    const indexResults = results
      .filter(r => r.type === 'index')
      .map(result => ({
        id: result.symbol,
        symbol: result.symbol,
        name: result.name,
        nameHe: result.name,
        image: null,
        marketDataSource: 'yahoo',
        assetType: 'INDEX',
      }));

    setSearchCache(cacheKey, indexResults);
    return indexResults;
  } catch {
    return [];
  }
};

// ==================== UNIFIED SEARCH ====================

/**
 * Main search router
 */
export const searchAssets = async (query, assetType) => {
  if (assetType === 'crypto') return await searchCryptoAssets(query);
  if (assetType === 'il-stock') return await searchIsraeliStocksFromBrowser(query);
  if (assetType === 'us-stock') return await searchUSStocks(query);
  if (assetType === 'index') return await searchIndices(query);
  // Legacy default
  return await searchCryptoAssets(query);
};

/**
 * Clear the search cache
 */
export const clearSearchCache = () => {
  searchCache.clear();
};
