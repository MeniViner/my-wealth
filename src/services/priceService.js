/**
 * Price Service - Unified Price Fetching
 * ========================================
 * Single source of truth for all price data in the application.
 * 
 * Architecture:
 * - TASE (Israeli) assets: Browser-side scraping via CORS proxy (Funder/Globes)
 *   because there's no affordable official API for Israeli market data.
 * - Global assets (US stocks, ETFs, indices): Backend API (Vercel → Yahoo Finance)
 * - Crypto: Backend API (Vercel → CoinGecko)
 * 
 * Price Normalization:
 * - TASE browser scraping: Funder/Globes return prices in Agorot → divide by 100
 *   EXCEPTION: INDEX type assets are points, not Agorot
 * - Backend (Yahoo): Already handles ILA→ILS conversion server-side
 * - Crypto: Prices in USD, no conversion needed
 */

import { getQuotes, getHistory } from './backendApi';
import { resolveInternalId } from './internalIds';
import { fetchWithProxy } from '../utils/corsProxy';
import { convertAmount } from './currency';

// ==================== CACHE ====================

const priceCache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute

function getCached(key) {
  const entry = priceCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    priceCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  priceCache.set(key, { data, ts: Date.now() });
}

// ==================== STALENESS CHECK ====================

/**
 * Check if an asset's price is stale (needs refresh)
 */
export const isAssetPriceStale = (asset, maxAgeMinutes = 5) => {
  if (!asset || !asset.lastUpdated) return true;

  let lastUpdatedTime;
  if (asset.lastUpdated.toDate && typeof asset.lastUpdated.toDate === 'function') {
    lastUpdatedTime = asset.lastUpdated.toDate().getTime();
  } else if (asset.lastUpdated instanceof Date) {
    lastUpdatedTime = asset.lastUpdated.getTime();
  } else {
    lastUpdatedTime = new Date(asset.lastUpdated).getTime();
  }

  return Date.now() - lastUpdatedTime > maxAgeMinutes * 60 * 1000;
};

// ==================== TASE BROWSER FETCHERS ====================
// Israeli market data MUST be scraped from browser via CORS proxy.
// No affordable official API exists.

/**
 * Fetch price from Funder.co.il (primary source for TASE)
 * Returns RAW price in Agorot
 */
async function fetchFromFunder(securityId) {
  try {
    const url = `https://www.funder.co.il/fund/${securityId}`;
    const response = await fetchWithProxy(url);

    if (!response.ok) return null;

    const html = await response.text();

    const priceMatch = html.match(/"buyPrice"\s*:\s*([\d.]+)/);
    if (!priceMatch) return null;

    const price = parseFloat(priceMatch[1]);
    if (isNaN(price) || price <= 0) return null;

    const changeMatch = html.match(/"1day"\s*:\s*([-\d.]+)/);
    const changePct = changeMatch ? parseFloat(changeMatch[1]) : 0;

    // Extract name for repair
    let name = null;
    const nameMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
      html.match(/<meta property="og:title" content="([^"]*)"/i);
    if (nameMatch?.[1]) {
      name = nameMatch[1]
        .replace(/– Funder|– פאנדר|פאנדר|קרן נאמנות:|תעודת סל:/g, '')
        .replace(/<[^>]*>/g, '')
        .trim();
    }

    return { price, changePct, name, source: 'funder' };
  } catch {
    return null;
  }
}

/**
 * Fetch price from Globes (fallback for TASE)
 * Returns RAW price in Agorot
 */
async function fetchFromGlobes(securityId) {
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
    if (!sec) return null;

    const price = parseFloat(String(sec.LastDealRate));
    if (isNaN(price) || price <= 0) return null;

    return {
      price,
      changePct: parseFloat(sec.BaseRateChangePercentage || 0),
      name: sec.HebName || sec.EngName || null,
      source: 'globes',
    };
  } catch {
    return null;
  }
}

/**
 * Fetch TASE price: Funder → Globes waterfall
 * Returns NORMALIZED price (Shekels, not Agorot)
 */
async function fetchTasePrice(asset) {
  const internalId = resolveInternalId(asset);
  const securityId = internalId?.startsWith('tase:')
    ? internalId.substring(5)
    : asset.apiId || asset.symbol;

  if (!securityId) return null;

  // Try Funder first, then Globes
  let data = await fetchFromFunder(securityId);
  if (!data) {
    data = await fetchFromGlobes(securityId);
  }
  if (!data) return null;

  // Normalize: Agorot → Shekels (except INDEX)
  let normalizedPrice = data.price;
  if (asset.assetType !== 'INDEX') {
    normalizedPrice = data.price / 100;
  }

  // Name repair: use scraped name if asset has generic/missing name
  const genericNames = ['פורטל קרנות', 'פורטל'];
  let finalName = asset.name || asset.symbol;
  if (data.name && (!finalName || genericNames.some(g => finalName.includes(g)))) {
    finalName = data.name;
  }

  return {
    symbol: asset.apiId || asset.symbol || securityId,
    name: finalName,
    currentPrice: normalizedPrice,
    currency: 'ILS',
    change24h: data.changePct || 0,
    changeAmount: (normalizedPrice * (data.changePct || 0)) / 100,
    lastUpdated: new Date(),
    source: `${data.source}-browser`,
    assetType: asset.assetType || 'STOCK',
  };
}

// ==================== STRATEGY ROUTING ====================

/**
 * Determine if an asset should use browser-side TASE scraping
 */
function isTaseAsset(asset) {
  const internalId = resolveInternalId(asset);
  return (
    asset.marketDataSource === 'tase-local' ||
    internalId?.startsWith('tase:') ||
    (asset.symbol && asset.symbol.endsWith('.TA') && !asset.apiId?.startsWith('yahoo:'))
  );
}

/**
 * Determine if an asset is crypto
 */
function isCryptoAsset(asset) {
  const internalId = resolveInternalId(asset);
  return (
    asset.marketDataSource === 'coingecko' ||
    asset.assetType === 'CRYPTO' ||
    asset.category === 'קריפטו' ||
    internalId?.startsWith('cg:')
  );
}

// ==================== PUBLIC API ====================

/**
 * Fetch price for a single asset
 */
export const fetchAssetPrice = async (asset) => {
  console.log('[PRICE SERVICE] fetchAssetPrice called with asset:', {
    apiId: asset?.apiId,
    symbol: asset?.symbol,
    marketDataSource: asset?.marketDataSource,
    assetType: asset?.assetType,
    securityId: asset?.securityId,
    category: asset?.category
  });

  if (!asset || asset.marketDataSource === 'manual') {
    console.log('[PRICE SERVICE] ❌ Skipping - no asset or manual data source');
    return null;
  }

  if (isTaseAsset(asset)) {
    console.log('[PRICE SERVICE] → Using TASE scraping strategy');
    const taseResult = await fetchTasePrice(asset);
    console.log('[PRICE SERVICE] TASE result:', taseResult ? '✅ Success' : '❌ Failed');
    return taseResult;
  }

  // Global & Crypto: use backend
  console.log('[PRICE SERVICE] → Using backend API strategy');
  const internalId = resolveInternalId(asset);
  console.log('[PRICE SERVICE] Resolved internalId:', internalId);
  
  if (!internalId) {
    console.error('[PRICE SERVICE] ❌ Failed to resolve internalId from asset:', asset);
    return null;
  }

  console.log('[PRICE SERVICE] Fetching quotes from backend for:', internalId);
  const quotes = await getQuotes([internalId]);
  console.log('[PRICE SERVICE] Backend returned quotes:', quotes);
  
  const quote = quotes.find(q => q && !q.error && typeof q.price === 'number' && q.price > 0);
  
  if (!quote) {
    console.error('[PRICE SERVICE] ❌ No valid quote found. Quotes received:', quotes);
    if (quotes.length > 0 && quotes[0]?.error) {
      console.error('[PRICE SERVICE] Error details:', quotes[0].error);
    }
    return null;
  }

  console.log('[PRICE SERVICE] ✅ Valid quote found:', {
    id: quote.id,
    price: quote.price,
    currency: quote.currency,
    source: quote.source,
    changePct: quote.changePct
  });

  const symbol = asset.symbol || asset.apiId || '';
  let assetType = asset.assetType || 'STOCK';
  if (symbol.startsWith('^') || internalId.startsWith('yahoo:^')) assetType = 'INDEX';
  if (isCryptoAsset(asset)) assetType = 'CRYPTO';

  const result = {
    symbol,
    name: asset.name || symbol,
    currentPrice: quote.price,
    currency: quote.currency || (assetType === 'CRYPTO' ? 'USD' : 'USD'),
    change24h: quote.changePct || 0,
    changeAmount: (quote.price * (quote.changePct || 0)) / 100,
    lastUpdated: new Date(quote.timestamp || Date.now()),
    source: quote.source || (assetType === 'CRYPTO' ? 'coingecko' : 'yahoo'),
    assetType,
  };

  console.log('[PRICE SERVICE] ✅ Returning price data:', result);
  return result;
};

/**
 * Fetch prices for multiple assets (batch)
 * 
 * Strategy:
 * 1. Separate TASE (browser) from Global/Crypto (backend)
 * 2. Fetch TASE via browser scraping (parallel)
 * 3. Fetch Global/Crypto via backend API (batched)
 * 4. WATERFALL: Failed TASE → retry via Yahoo backend (.TA suffix)
 * 5. Merge all results
 */
export const fetchAssetPricesBatch = async (assets, options = {}) => {
  if (!assets || assets.length === 0) return {};

  const { maxAgeMinutes = 5, forceRefresh = false, globalBatchSize = 20 } = options;

  // Step 0: Smart cache — skip fresh assets
  const toFetch = [];
  const cached = {};

  for (const asset of assets) {
    if (asset.marketDataSource === 'manual') continue;
    const id = resolveInternalId(asset);
    if (!id) continue;

    if (!forceRefresh && !isAssetPriceStale(asset, maxAgeMinutes) && asset.currentPrice) {
      cached[id] = {
        symbol: asset.apiId || asset.symbol || '',
        name: asset.name,
        currentPrice: asset.currentPrice,
        currency: asset.currency || 'ILS',
        change24h: asset.priceChange24h || 0,
        changeAmount: (asset.currentPrice * (asset.priceChange24h || 0)) / 100,
        lastUpdated: asset.lastUpdated,
        source: 'cache',
        assetType: asset.assetType || 'STOCK',
        cached: true,
      };
      continue;
    }

    toFetch.push(asset);
  }

  if (toFetch.length === 0) return cached;

  // Step 1: Split by strategy
  const taseAssets = [];
  const backendAssets = [];
  const assetMap = new Map();

  for (const asset of toFetch) {
    const id = resolveInternalId(asset);
    if (!id) continue;
    assetMap.set(id, asset);

    if (isTaseAsset(asset)) {
      taseAssets.push({ asset, id });
    } else {
      backendAssets.push({ asset, id });
    }
  }

  const results = {};

  // Step 2: Fetch TASE assets (browser, parallel)
  const tasePromises = taseAssets.map(async ({ asset, id }) => {
    const data = await fetchTasePrice(asset);
    return { id, data, asset };
  });
  const taseResults = await Promise.all(tasePromises);

  // Collect successful TASE and track failures for waterfall
  const failedTase = [];
  for (const { id, data, asset } of taseResults) {
    if (data) {
      results[id] = data;
    } else {
      failedTase.push({ asset, id });
    }
  }

  // Step 3: WATERFALL — retry failed TASE via Yahoo backend
  const retryMap = new Map();
  for (const { asset, id } of failedTase) {
    const symbol = asset.symbol || asset.apiId;
    if (!symbol) continue;
    let yahooSymbol = String(symbol).toUpperCase();
    if (!yahooSymbol.endsWith('.TA')) yahooSymbol += '.TA';
    const yahooId = `yahoo:${yahooSymbol}`;
    backendAssets.push({ asset, id: yahooId });
    retryMap.set(yahooId, id); // Map retry ID → original TASE ID
  }

  // Step 4: Fetch backend assets (Global + Crypto + TASE retries)
  if (backendAssets.length > 0) {
    try {
      const allIds = backendAssets.map(a => a.id);
      let allQuotes = [];

      // Batch by globalBatchSize
      for (let i = 0; i < allIds.length; i += globalBatchSize) {
        const batch = allIds.slice(i, i + globalBatchSize);
        const quotes = await getQuotes(batch);
        allQuotes.push(...quotes);
      }

      // Process backend results
      const validQuotes = allQuotes.filter(
        q => q && !q.error && typeof q.price === 'number' && !isNaN(q.price) && q.price > 0
      );

      for (const quote of validQuotes) {
        // Check if this is a waterfall retry
        const originalTaseId = retryMap.get(quote.id);
        const targetId = originalTaseId || quote.id;
        const asset = assetMap.get(targetId) || assetMap.get(quote.id);
        if (!asset) continue;

        const symbol = asset.apiId || asset.symbol || '';
        let assetType = asset.assetType || 'STOCK';
        if (symbol.startsWith('^')) assetType = 'INDEX';
        if (isCryptoAsset(asset)) assetType = 'CRYPTO';

        results[targetId] = {
          symbol,
          name: asset.name || symbol,
          currentPrice: quote.price,
          currency: quote.currency || 'USD',
          change24h: quote.changePct || 0,
          changeAmount: (quote.price * (quote.changePct || 0)) / 100,
          lastUpdated: new Date(quote.timestamp || Date.now()),
          source: originalTaseId ? 'yahoo-fallback' : (quote.source || 'yahoo'),
          assetType,
        };
      }
    } catch (error) {
      console.error('[PRICE SERVICE] Backend fetch error:', error);
    }
  }

  return { ...cached, ...results };
};

// ==================== HISTORICAL DATA ====================

/**
 * Fetch price history for an asset (via backend)
 */
export const fetchPriceHistory = async (asset, timeRange = '1M') => {
  if (!asset) return null;

  const internalId = resolveInternalId(asset);
  if (!internalId) return null;

  const cacheKey = `history:${internalId}:${timeRange}`;
  const cachedData = getCached(cacheKey);
  if (cachedData) return cachedData;

  try {
    const history = await getHistory(internalId, timeRange);
    if (history && history.points?.length > 0) {
      setCache(cacheKey, history);
      return history;
    }
    return null;
  } catch (error) {
    console.error('[PRICE SERVICE] History error:', error);
    return null;
  }
};

// ==================== BACKWARD COMPATIBILITY ====================

/**
 * Fetch historical price for an asset on a specific date
 * Supports dates up to 5 years in the past
 */
export const fetchAssetHistoricalPrice = async (asset, date) => {
  if (!asset || !date) return null;

  const internalId = resolveInternalId(asset);
  if (!internalId) return null;

  // TASE historical data not supported via browser scraping
  if (isTaseAsset(asset)) return null;

  const targetDate = new Date(date);
  const dateStr = targetDate.toISOString().split('T')[0];
  const cacheKey = `histprice:${internalId}:${dateStr}`;
  const cachedData = getCached(cacheKey);
  if (cachedData) return cachedData;

  try {
    // Calculate how many days ago the target date is
    const now = new Date();
    const daysDiff = Math.ceil((now.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Determine appropriate range based on how far back the date is
    let range = '5d';
    if (daysDiff > 365) {
      range = '5y'; // Up to 5 years
    } else if (daysDiff > 180) {
      range = '1y'; // Up to 1 year
    } else if (daysDiff > 90) {
      range = '6mo'; // Up to 6 months
    } else if (daysDiff > 30) {
      range = '3mo'; // Up to 3 months
    } else if (daysDiff > 7) {
      range = '1mo'; // Up to 1 month
    } else {
      range = '5d'; // Last 5 days
    }

    const history = await getHistory(internalId, range, '1d');
    if (!history?.points?.length) {
      // Try with longer range if no data found
      if (range !== '5y') {
        const fallbackHistory = await getHistory(internalId, '5y', '1d');
        if (fallbackHistory?.points?.length) {
          return findClosestPrice(fallbackHistory.points, targetDate, cacheKey);
        }
      }
      return null;
    }

    return findClosestPrice(history.points, targetDate, cacheKey);
  } catch (error) {
    console.error('[fetchAssetHistoricalPrice] Error:', error);
    return null;
  }
};

/**
 * Helper: Find closest price point to target date
 */
function findClosestPrice(points, targetDate, cacheKey) {
  const targetTs = targetDate.getTime();
  let closest = null;
  let minDiff = Infinity;

  for (const point of points) {
    const diff = Math.abs(point.t - targetTs);
    if (diff < minDiff) {
      minDiff = diff;
      closest = point;
    }
  }

  // Accept if within 7 days (for weekends/holidays)
  if (closest && minDiff < 7 * 24 * 60 * 60 * 1000) {
    setCache(cacheKey, closest.v);
    return closest.v;
  }
  return null;
}

/**
 * Convert currency (backward compat wrapper)
 * @deprecated Use convertAmount from currency.js directly
 */
export const convertCurrency = async (price, fromCurrency, toCurrency) => {
  return await convertAmount(price, fromCurrency, toCurrency);
};

/**
 * Get exchange rate (backward compat wrapper)
 * @deprecated Use getExchangeRate from currency.js directly
 */
export { getExchangeRate } from './currency';
