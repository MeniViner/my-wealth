/**
 * Price Service
 * Fetches live and historical prices via backend API (Vercel Functions)
 * All external API calls are now handled server-side to avoid CORS issues
 */

import { getQuotes, getHistory } from './backendApi';
import { resolveInternalId } from './internalIds';

// ==================== CLIENT-SIDE TASE FALLBACK ====================

/**
 * Fetch TASE price directly from browser using CORS proxy
 * This is a fallback for when the backend API fails to get TASE prices
 * @param {string} securityId - TASE security ID (e.g., "5140454")
 * @returns {Promise<{price: number, changePct: number}|null>}
 */
// --- BACKUP: Globes ---
// POST request via proxy to handle array JSON response
// async function fetchTasePriceFromGlobes(securityId) {
//   try {
//     const targetUrl = "https://www.globes.co.il/Portal/Handlers/GTOFeeder.ashx";
//     // Use corsproxy.io which supports POST
//     const proxyUrl = `https://corsproxy.io/?${targetUrl}`;

//     // Type 49 worked in testing
//     const body = `instrumentId=${securityId}&type=49`;

//     console.log(`[GLOBES] Fetching ${securityId}...`);

//     const response = await fetch(proxyUrl, {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: body
//     });

//     if (!response.ok) {
//       console.warn(`[GLOBES] HTTP error ${response.status}`);
//       return null;
//     }

//     const json = await response.json();

//     // Critical fix: Access array structure
//     // Structure: [{ Table: { Security: [...] } }, { Tns: ... }]
//     const securityData = json?.[0]?.Table?.Security?.[0];

//     if (!securityData) {
//       console.warn(`[GLOBES] Structure mismatch for ${securityId}`);
//       return null;
//     }

//     // Smart Currency Normalization
//     const rawPriceStr = String(securityData.LastDealRate);
//     let price = parseFloat(rawPriceStr);
//     const changePct = parseFloat(securityData.BaseRateChangePercentage || 0);

//     // Rule 1: Decimal Check - If it has a dot, it's already NIS.
//     if (rawPriceStr.includes('.')) {
//       // Keep price as is
//     }
//     // Rule 2: Integer Check - If no dot AND > 500, it's Agorot -> Divide by 100
//     else if (price > 500) {
//       price = price / 100;
//     }

//     console.log(`[GLOBES] ✅ Success for ${securityId}: ${price}`);
//     return { price, changePct };

//   } catch (e) {
//     console.warn(`[GLOBES] Fetch failed for ${securityId}:`, e.message);
//     return null;
//   }
// }

// --- PRIMARY SOURCE: Funder ---
// async function fetchTasePriceFromFunder(securityId) {
//   try {
//     const funderUrl = `https://www.funder.co.il/fund/${securityId}`;
//     const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(funderUrl)}`;

//     console.log(`[FUNDER] Fetching ${securityId}...`);

//     const response = await fetch(corsProxyUrl);
//     if (!response.ok) return null;
//     const html = await response.text();

//     const priceMatch = html.match(/"buyPrice"\s*:\s*([\d\.]+)/);
//     if (!priceMatch) return null;

//     const rawPriceStr = priceMatch[1];
//     let price = parseFloat(rawPriceStr);
//     const changeMatch = html.match(/"1day"\s*:\s*([-\d\.]+)/);
//     const changePct = changeMatch ? parseFloat(changeMatch[1]) : 0;

//     // Smart Currency Normalization
//     // Rule 1: Decimal Check - If it has a dot, it's already NIS.
//     if (rawPriceStr.includes('.')) {
//       // Keep price as is
//     }
//     // Rule 2: Integer Check - If no dot AND > 500, it's Agorot -> Divide by 100
//     else if (price > 500) {
//       price = price / 100;
//     }

//     console.log(`[FUNDER] ✅ Success for ${securityId}: ${price} (Original: ${priceMatch[1]})`);
//     return { price, changePct };
//   } catch (e) {
//     console.warn(`[FUNDER] Fetch failed for ${securityId}:`, e.message);
//     return null;
//   }
// }

/**
 * Fetch with Proxy Rotation fallback
 * מנסה פרוקסי ראשי, ואם נכשל מנסה גיבוי
 */
async function fetchWithFallbackProxy(targetUrl, options = {}) {
  // אפשרות 1: corsproxy.io (מהיר, לפעמים נחסם בפרודקשיין)
  const proxy1 = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

  // אפשרות 2: allorigins.win (איטי יותר, אבל אמין מאוד כגיבוי)
  // הערה: allorigins מחזיר JSON עם שדה contents שמכיל את התשובה
  const proxy2 = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

  try {
    // נסיון ראשון
    const res1 = await fetch(proxy1, options);
    if (res1.ok) return res1;
    throw new Error('Proxy 1 failed');
  } catch (e) {
    console.warn(`[PROXY] Primary failed, trying backup for ${targetUrl}...`);

    try {
      // נסיון שני (גיבוי)
      // allorigins תומך רק ב-GET. אם הבקשה היא POST, אי אפשר להשתמש בו ישירות ללא התאמה מורכבת.
      // במקרה של גלובס (POST), אנחנו בבעיה עם allorigins רגיל.
      // לכן עבור גלובס ננסה גישה ישירה אם הפרוקסי נכשל, או שנחזיר שגיאה.
      if (options.method === 'POST') throw new Error('POST not supported on backup proxy');

      const res2 = await fetch(proxy2);
      if (res2.ok) {
        const json = await res2.json();
        // בניית Response מזויף כדי שהקוד הקיים ימשיך לעבוד
        return new Response(json.contents, { status: 200 });
      }
    } catch (e2) {
      console.error(`[PROXY] All proxies failed for ${targetUrl}`);
    }
  }
  return { ok: false };
}

// ==================== CLIENT-SIDE TASE FALLBACK ====================

// --- BACKUP: Globes (מעודכן: מושך גם שם + מטפל ב-Production) ---
async function fetchTasePriceFromGlobes(securityId) {
  try {
    const targetUrl = "https://www.globes.co.il/Portal/Handlers/GTOFeeder.ashx";

    // גלובס דורש POST. corsproxy.io תומך ב-POST.
    // אם זה נכשל בפרודקשיין, זה כנראה בגלל Header Origin.
    const proxyUrl = `https://corsproxy.io/?${targetUrl}`;

    const body = `instrumentId=${securityId}&type=49`;

    console.log(`[GLOBES] Fetching ${securityId}...`);

    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body
    });

    if (!response.ok) {
      console.warn(`[GLOBES] HTTP error ${response.status}`);
      return null;
    }

    const json = await response.json();
    const securityData = json?.[0]?.Table?.Security?.[0];

    if (!securityData) {
      console.warn(`[GLOBES] Structure mismatch for ${securityId}`);
      return null;
    }

    // 1. חילוץ מחיר ונרמול
    let price = parseFloat(String(securityData.LastDealRate));
    const changePct = parseFloat(securityData.BaseRateChangePercentage || 0);

    // נרמול אגורות לשקלים (אם > 20, חלק ב-100)
    if (price > 20) {
      price = price / 100;
    }

    // 2. חילוץ שם (התיקון לבעיה 1233170)
    // גלובס מחזיר שמות נקיים בדרך כלל
    const name = securityData.HebName || securityData.EngName;

    console.log(`[GLOBES] ✅ Success for ${securityId}: ${price} | Name: ${name}`);

    return {
      price,
      changePct,
      name // מחזירים גם את השם!
    };

  } catch (e) {
    console.warn(`[GLOBES] Fetch failed for ${securityId}:`, e.message);
    return null;
  }
}

// --- PRIMARY SOURCE: Funder (מעודכן עם Proxy Rotation) ---
async function fetchTasePriceFromFunder(securityId) {
  try {
    const funderUrl = `https://www.funder.co.il/fund/${securityId}`;

    console.log(`[FUNDER] Fetching ${securityId}...`);

    // שימוש בפונקציית העזר החדשה שמנסה כמה פרוקסים
    const response = await fetchWithFallbackProxy(funderUrl);

    if (!response.ok) return null;
    const html = await response.text();

    const priceMatch = html.match(/"buyPrice"\s*:\s*([\d\.]+)/);
    if (!priceMatch) return null;

    const rawPriceStr = priceMatch[1];
    let price = parseFloat(rawPriceStr);
    const changeMatch = html.match(/"1day"\s*:\s*([-\d\.]+)/);
    const changePct = changeMatch ? parseFloat(changeMatch[1]) : 0;

    // נרמול אגורות
    if (price > 20) {
      price = price / 100;
    }

    console.log(`[FUNDER] ✅ Success for ${securityId}: ${price}`);
    return { price, changePct }; // פאנדר לא תמיד מחזיר שם נקי ב-HTML הזה, אז נסתמך על מה שיש
  } catch (e) {
    console.warn(`[FUNDER] Fetch failed for ${securityId}:`, e.message);
    return null;
  }
}

/**
 * המנהל הראשי: מנסה את כולם לפי הסדר
 */
async function fetchTasePriceFromBrowser(securityId) {
  // 1. נסה פאנדר (עם גיבוי פרוקסי)
  let data = await fetchTasePriceFromFunder(securityId);
  if (data) return { ...data, source: 'funder-browser' };

  // 2. נסה גלובס (כעת שואב גם את השם!)
  console.log(`[BROWSER FALLBACK] Funder failed for ${securityId}, trying Globes...`);
  data = await fetchTasePriceFromGlobes(securityId);
  if (data) return { ...data, source: 'globes-browser' };

  // 3. נכשל
  return null;
}

// // --- BACKUP: Globes ---
// async function fetchTasePriceFromGlobes(securityId) {
//   try {
//     const targetUrl = "https://www.globes.co.il/Portal/Handlers/GTOFeeder.ashx";
//     const proxyUrl = `https://corsproxy.io/?${targetUrl}`;
//     const body = `instrumentId=${securityId}&type=49`;

//     console.log(`[GLOBES] Fetching ${securityId}...`);

//     const response = await fetch(proxyUrl, {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: body
//     });

//     if (!response.ok) return null;

//     const json = await response.json();
//     const securityData = json?.[0]?.Table?.Security?.[0];

//     if (!securityData) {
//       console.warn(`[GLOBES] Structure mismatch for ${securityId}`);
//       return null;
//     }

//     // נרמול אגורות לשקלים (Force Agorot to NIS)
//     let price = parseFloat(String(securityData.LastDealRate));
//     const changePct = parseFloat(securityData.BaseRateChangePercentage || 0);

//     // התיקון: הסרת בדיקת הנקודה העשרונית.
//     // אם המחיר גדול מ-20, נניח שזה אגורות ונחלק ב-100.
//     // זה יתפוס גם 423.92 (יהפוך ל-4.24) וגם 14590 (יהפוך ל-145.90)
//     if (price > 20) {
//       price = price / 100;
//     }

//     console.log(`[GLOBES] ✅ Success for ${securityId}: ${price}`);
//     return { price, changePct };

//   } catch (e) {
//     console.warn(`[GLOBES] Fetch failed for ${securityId}:`, e.message);
//     return null;
//   }
// }

// // --- PRIMARY SOURCE: Funder ---
// async function fetchTasePriceFromFunder(securityId) {
//   try {
//     const funderUrl = `https://www.funder.co.il/fund/${securityId}`;
//     const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(funderUrl)}`;

//     console.log(`[FUNDER] Fetching ${securityId}...`);

//     const response = await fetch(corsProxyUrl);
//     if (!response.ok) return null;
//     const html = await response.text();

//     const priceMatch = html.match(/"buyPrice"\s*:\s*([\d\.]+)/);
//     if (!priceMatch) return null;

//     const rawPriceStr = priceMatch[1];
//     let price = parseFloat(rawPriceStr);
//     const changeMatch = html.match(/"1day"\s*:\s*([-\d\.]+)/);
//     const changePct = changeMatch ? parseFloat(changeMatch[1]) : 0;

//     // התיקון: הסרת בדיקת הנקודה העשרונית.
//     // אם המחיר גדול מ-20, נניח שזה אגורות ונחלק ב-100.
//     // זה יתפוס גם 423.92 (יהפוך ל-4.24) וגם 14590 (יהפוך ל-145.90)
//     if (price > 20) {
//       price = price / 100;
//     }

//     console.log(`[FUNDER] ✅ Success for ${securityId}: ${price} (Original: ${priceMatch[1]})`);
//     return { price, changePct };
//   } catch (e) {
//     console.warn(`[FUNDER] Fetch failed for ${securityId}:`, e.message);
//     return null;
//   }
// }

/**
 * Fetch TASE price directly from browser using CORS proxy
 * Strategy: Funder -> Globes -> Fail
 * @param {string} securityId - TASE security ID (e.g., "5140454")
 * @returns {Promise<{price: number, changePct: number, source: string}|null>}
 */
// async function fetchTasePriceFromBrowser(securityId) {
//   // 1. Try Funder (Most reliable for funds)
//   let data = await fetchTasePriceFromFunder(securityId);
//   if (data) return { ...data, source: 'funder-browser' };

//   // 2. Try Globes (New Backup)
//   console.log(`[BROWSER FALLBACK] Funder failed for ${securityId}, trying Globes...`);
//   data = await fetchTasePriceFromGlobes(securityId);
//   if (data) return { ...data, source: 'globes-browser' };

//   // 3. Fail (Main logic will try Yahoo if fallback is enabled there)
//   return null;
// }

// Debug flag for price fetching
const DEBUG_PRICES = import.meta.env.DEV;

// In-memory cache for price data (fallback, IndexedDB is primary)
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

// ==================== INTERNAL ID HELPERS ====================

/**
 * Check if an asset's price is stale and needs refreshing
 * @param {Object} asset - Asset object with lastUpdated field
 * @param {number} maxAgeMinutes - Maximum age in minutes before price is considered stale
 * @returns {boolean} True if price needs updating
 */
export const isAssetPriceStale = (asset, maxAgeMinutes = 5) => {
  if (!asset || !asset.lastUpdated) return true;

  let lastUpdatedTime;
  // Handle Firestore Timestamp, Date object, or string/number
  if (asset.lastUpdated.toDate && typeof asset.lastUpdated.toDate === 'function') {
    lastUpdatedTime = asset.lastUpdated.toDate().getTime();
  } else if (asset.lastUpdated instanceof Date) {
    lastUpdatedTime = asset.lastUpdated.getTime();
  } else {
    lastUpdatedTime = new Date(asset.lastUpdated).getTime();
  }

  const ageMs = Date.now() - lastUpdatedTime;
  const maxAgeMs = maxAgeMinutes * 60 * 1000;

  return ageMs > maxAgeMs;
};


/**
 * Convert asset to internal ID format (deprecated - use resolveInternalId directly)
 * @deprecated Use resolveInternalId from internalIds.js instead
 */
function getInternalId(asset) {
  return resolveInternalId(asset);
}

// ==================== COINGECKO (CRYPTO) - DEPRECATED ====================
// These functions are kept for backward compatibility but now use backendApi

/**
 * Fetch current crypto price from CoinGecko (via backend API)
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
    const quotes = await getQuotes([`cg:${coinId}`]);

    // Filter valid quotes (no errors, valid price)
    const validQuotes = quotes.filter(q =>
      q &&
      !q.error &&
      typeof q.price === 'number' &&
      !isNaN(q.price) &&
      q.price > 0
    );

    if (validQuotes.length === 0) {
      const errorQuote = quotes.find(q => q && q.error);
      if (errorQuote) {
        console.warn(`Quote error for cg:${coinId}:`, errorQuote.error);
      }
      return null;
    }

    const quote = validQuotes[0];

    const result = {
      symbol: coinId.toUpperCase(),
      name: coinId,
      currentPrice: quote.price,
      currency: quote.currency || 'USD',
      change24h: quote.changePct || 0,
      changeAmount: (quote.price * (quote.changePct || 0)) / 100,
      lastUpdated: new Date(quote.timestamp || Date.now()),
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
 * Fetch multiple crypto prices at once (batch) - via backend API
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
    const internalIds = coinIds.map(id => `cg:${id}`);
    const quotes = await getQuotes(internalIds);
    const results = {};

    // Filter valid quotes only
    const validQuotes = quotes.filter(q =>
      q &&
      !q.error &&
      typeof q.price === 'number' &&
      !isNaN(q.price) &&
      q.price > 0
    );

    validQuotes.forEach((quote) => {

      const coinId = quote.id.replace('cg:', '');
      results[coinId] = {
        symbol: coinId.toUpperCase(),
        name: coinId,
        currentPrice: quote.price,
        currency: quote.currency || 'USD',
        change24h: quote.changePct || 0,
        changeAmount: (quote.price * (quote.changePct || 0)) / 100,
        lastUpdated: new Date(quote.timestamp || Date.now()),
        source: 'coingecko',
        assetType: 'CRYPTO'
      };
    });

    setCachedPrice(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Error fetching crypto prices batch:', error);
    return {};
  }
};

// ==================== YAHOO FINANCE (STOCKS/INDICES) - VIA BACKEND API ====================

/**
 * Fetch current stock/index price from Yahoo Finance (via backend API)
 * @param {string} symbol - Stock symbol (e.g., "AAPL", "^GSPC", "TEVA.TA")
 * @returns {Promise<UnifiedAssetPrice|null>}
 */
export const fetchYahooPrice = async (symbol) => {
  if (!symbol) return null;

  const cacheKey = `yahoo:${symbol}`;
  const cached = getCachedPrice(cacheKey);
  if (cached) return cached;

  try {
    const quotes = await getQuotes([`yahoo:${symbol}`]);

    // Filter valid quotes (no errors, valid price)
    const validQuotes = quotes.filter(q =>
      q &&
      !q.error &&
      typeof q.price === 'number' &&
      !isNaN(q.price) &&
      q.price > 0
    );

    if (validQuotes.length === 0) {
      const errorQuote = quotes.find(q => q && q.error);
      if (errorQuote) {
        console.warn(`Quote error for yahoo:${symbol}:`, errorQuote.error);
      }
      return null;
    }

    const quote = validQuotes[0];

    // Determine asset type from symbol
    let assetType = 'STOCK';
    if (symbol.startsWith('^')) {
      assetType = 'INDEX';
    }

    const result = {
      symbol: symbol,
      name: symbol, // Name will be populated from search results
      currentPrice: quote.price,
      currency: quote.currency || 'USD',
      change24h: quote.changePct || 0,
      changeAmount: (quote.price * (quote.changePct || 0)) / 100,
      lastUpdated: new Date(quote.timestamp || Date.now()),
      source: 'yahoo',
      assetType: assetType,
    };

    setCachedPrice(cacheKey, result);
    return result;
  } catch (error) {
    console.error(`Error fetching Yahoo price for ${symbol}:`, error);
    return null;
  }
};

/**
 * Fetch multiple stock prices at once (batch) - via backend API
 * @param {string[]} symbols - Array of stock symbols
 * @returns {Promise<Object<string, UnifiedAssetPrice>>}
 */
export const fetchYahooPricesBatch = async (symbols) => {
  if (!symbols || symbols.length === 0) return {};

  try {
    const internalIds = symbols.map(s => `yahoo:${s}`);
    const quotes = await getQuotes(internalIds);
    const results = {};

    // Filter valid quotes only
    const validQuotes = quotes.filter(q =>
      q &&
      !q.error &&
      typeof q.price === 'number' &&
      !isNaN(q.price) &&
      q.price > 0
    );

    validQuotes.forEach((quote) => {

      const symbol = quote.id.replace('yahoo:', '');
      let assetType = 'STOCK';
      if (symbol.startsWith('^')) {
        assetType = 'INDEX';
      }

      results[symbol] = {
        symbol: symbol,
        name: symbol,
        currentPrice: quote.price,
        currency: quote.currency || 'USD',
        change24h: quote.changePct || 0,
        changeAmount: (quote.price * (quote.changePct || 0)) / 100,
        lastUpdated: new Date(quote.timestamp || Date.now()),
        source: 'yahoo',
        assetType: assetType,
      };
    });

    return results;
  } catch (error) {
    console.error('Error fetching Yahoo prices batch:', error);
    return {};
  }
};

/**
 * Fetch price for any asset type (STRICT SPLIT ROUTING)
 * Israeli (TASE) assets → Browser only (CORS proxy)
 * Global assets (US Stocks, Crypto) → Backend API only
 * @param {Object} asset - Asset object with apiId, marketDataSource, symbol
 * @returns {Promise<UnifiedAssetPrice|null>}
 */
export const fetchAssetPrice = async (asset) => {
  if (!asset) return null;

  // Manual entry - no live price
  if (asset.marketDataSource === 'manual') {
    return null;
  }

  // Resolve internal ID using the unified helper
  const internalId = resolveInternalId(asset);
  if (!internalId) {
    if (DEBUG_PRICES) {
      console.warn('[PRICE DEBUG] Could not resolve internal ID for asset:', asset);
    }
    return null;
  }

  // ==================== SPLIT ROUTING LOGIC ====================
  // Determine if this is a TASE asset
  const isTaseAsset =
    asset.marketDataSource === 'tase-local' ||
    internalId.startsWith('tase:') ||
    (asset.symbol && asset.symbol.endsWith('.TA'));

  // ========== ROUTE A: TASE → Browser with Fallback ==========
  if (isTaseAsset) {
    try {
      const securityId = internalId.startsWith('tase:')
        ? internalId.substring(5)
        : asset.apiId || asset.symbol;

      if (DEBUG_PRICES) {
        console.log(`[PRICE SINGULAR] Routing TASE asset ${securityId} to browser...`);
      }

      const browserData = await fetchTasePriceFromBrowser(securityId);

      if (!browserData || !browserData.price) {
        console.warn(`[PRICE SINGULAR] Failed to fetch TASE asset ${securityId} from browser`);

        // ... (קוד ה-Fallback ליאהו נשאר ללא שינוי) ...
        // ... אם יש לך שם את ה-Fallback, תשאיר אותו ...

        return null;
      }

      const symbol = asset.apiId || asset.symbol || '';

      // --- התיקון לשם הגנרי ---
      let finalName = asset.name || symbol;
      const genericTitle = "פורטל קרנות";

      // אם קיבלנו שם חדש (למשל מגלובס), והשם הנוכחי ריק או גנרי ("פורטל...") -> נדרוס אותו
      if (browserData.name && (!finalName || finalName.includes(genericTitle))) {
        console.log(`[NAME FIX] Replacing generic name with: ${browserData.name}`);
        finalName = browserData.name;
      }

      return {
        symbol: symbol,
        name: finalName, // שימוש בשם המתוקן
        currentPrice: browserData.price,
        currency: 'ILS',
        change24h: browserData.changePct || 0,
        changeAmount: (browserData.price * (browserData.changePct || 0)) / 100,
        lastUpdated: new Date(),
        source: browserData.source || 'funder-browser',
        assetType: asset.assetType === 'ETF' ? 'ETF' : 'STOCK',
      };
    } catch (error) {
      console.error(`[PRICE SINGULAR] Error fetching TASE asset ${internalId}:`, error);
      return null;
    }
  }

  // ========== ROUTE B: Global → Backend API Only ==========
  try {
    if (DEBUG_PRICES) {
      console.log(`[PRICE SINGULAR] Routing global asset ${internalId} to backend...`);
    }

    // Use getQuotes directly for unified quote fetching
    const quotes = await getQuotes([internalId]);

    // Debug: Log quote fetching
    if (DEBUG_PRICES) {
      console.log('[PRICE DEBUG] fetchAssetPrice requested:', internalId, 'got quotes:', quotes.length);
    }

    // Filter valid quotes (no errors, valid price)
    const validQuotes = quotes.filter(q =>
      q &&
      !q.error &&
      typeof q.price === 'number' &&
      !isNaN(q.price) &&
      q.price > 0
    );

    if (validQuotes.length === 0) {
      const errorQuote = quotes.find(q => q && q.error);
      if (errorQuote) {
        if (DEBUG_PRICES) {
          console.warn(`[PRICE DEBUG] Quote error for ${internalId}:`, errorQuote.error);
        }
      }
      return null;
    }

    const quote = validQuotes[0];

    // Determine asset type
    let assetType = 'STOCK';
    const symbol = asset.symbol || asset.apiId || '';
    if (symbol.startsWith('^') || internalId.startsWith('yahoo:^')) {
      assetType = 'INDEX';
    } else if (asset.assetType === 'CRYPTO' || internalId.startsWith('cg:')) {
      assetType = 'CRYPTO';
    } else if (asset.assetType === 'ETF') {
      assetType = 'ETF';
    }

    const result = {
      symbol: symbol,
      name: asset.name || symbol,
      currentPrice: quote.price,
      currency: quote.currency || 'USD',
      change24h: quote.changePct || 0,
      changeAmount: (quote.price * (quote.changePct || 0)) / 100,
      lastUpdated: new Date(quote.timestamp || Date.now()),
      source: internalId.startsWith('cg:') ? 'coingecko' : 'yahoo',
      assetType: assetType,
    };

    return result;
  } catch (error) {
    console.error('Error fetching asset price:', error);
    return null;
  }
};

/**
 * Fetch prices for multiple assets (STRICT SPLIT ROUTING with SMART CACHING)
 * Israeli (TASE) assets → Browser only (CORS proxy)
 * Global assets (US Stocks, Crypto) → Backend API only
 * 
 * NEW: Only fetches assets with stale prices (older than maxAgeMinutes)
 * Returns a mix of fresh prices (newly fetched) and cached prices (from assets)
 * 
 * @param {Array} assets - Array of asset objects
 * @param {Object} options - Optional configuration
 * @param {number} options.maxAgeMinutes - Maximum age before refresh (default: 5)
 * @param {boolean} options.forceRefresh - Force fetch all assets, ignore cache
 * @param {number} options.globalBatchSize - Batch size for global assets (default: 20)
 * @returns {Promise<Object<string, UnifiedAssetPrice>>}
 */
export const fetchAssetPricesBatch = async (assets, options = {}) => {
  if (!assets || assets.length === 0) return {};

  const {
    maxAgeMinutes = 5,
    forceRefresh = false,
    globalBatchSize = 20
  } = options;

  // ==================== STEP 0: SMART FILTERING (NEW!) ====================
  const assetsToFetch = [];
  const cachedResults = {};

  assets.forEach(asset => {
    if (asset.marketDataSource === 'manual') return;

    const internalId = resolveInternalId(asset);
    if (!internalId) return;

    // Check if asset has fresh price data
    if (!forceRefresh && !isAssetPriceStale(asset, maxAgeMinutes)) {
      // Use cached price from asset
      if (asset.currentPrice) {
        cachedResults[internalId] = {
          symbol: asset.apiId || asset.symbol || '',
          name: asset.name,
          currentPrice: asset.currentPrice,
          currency: asset.currency || 'ILS',
          change24h: asset.priceChange24h || 0,
          changeAmount: (asset.currentPrice * (asset.priceChange24h || 0)) / 100,
          lastUpdated: asset.lastUpdated,
          source: asset.marketDataSource === 'tase-local' ? 'funder-browser' :
            (asset.assetType === 'CRYPTO' ? 'coingecko' : 'yahoo'),
          assetType: asset.assetType || 'STOCK',
          cached: true // Mark as cached for debugging
        };
        if (DEBUG_PRICES) {
          console.log(`[CACHE HIT] Using cached price for ${internalId}`);
        }
        return;
      }
    }

    // Asset needs updating
    assetsToFetch.push(asset);
  });

  if (DEBUG_PRICES) {
    console.log(`[SMART CACHE] Cached: ${Object.keys(cachedResults).length}, To Fetch: ${assetsToFetch.length}`);
  }

  // If all assets are cached, return early
  if (assetsToFetch.length === 0) {
    return cachedResults;
  }

  // ==================== STEP 1: SEPARATE INTO TWO BUCKETS ====================
  const israelBucket = [];  // TASE assets → Browser fetch
  const globalBucket = [];  // US Stocks, Crypto → Backend API
  const assetMap = new Map(); // Map for result merging

  assetsToFetch.forEach(asset => {
    const internalId = resolveInternalId(asset);
    if (!internalId) return;

    // Store asset for later lookup
    assetMap.set(internalId, asset);

    // Routing logic: TASE assets go to Israel bucket, everything else to Global bucket
    const isTaseAsset =
      asset.marketDataSource === 'tase-local' ||
      internalId.startsWith('tase:') ||
      (asset.symbol && asset.symbol.endsWith('.TA'));

    if (isTaseAsset) {
      israelBucket.push({ asset, internalId });
    } else {
      globalBucket.push({ asset, internalId });
    }
  });

  if (DEBUG_PRICES) {
    console.log(`[SPLIT ROUTING] Israel Bucket: ${israelBucket.length}, Global Bucket: ${globalBucket.length}`);
  }

  const results = {};

  // ==================== STEP 2: PARALLEL EXECUTION ====================

  // ========== BUCKET A: ISRAEL (Browser-only with Fallback Tracking) ==========
  const israelPromises = israelBucket.map(async ({ asset, internalId }) => {
    try {
      // Extract security ID from internal ID (e.g., "tase:5140454" → "5140454")
      const securityId = internalId.startsWith('tase:')
        ? internalId.substring(5)
        : asset.apiId || asset.symbol;

      if (DEBUG_PRICES) {
        console.log(`[ISRAEL BUCKET] Fetching ${securityId} from browser...`);
      }

      const browserData = await fetchTasePriceFromBrowser(securityId);

      if (!browserData || !browserData.price) {
        console.warn(`[ISRAEL BUCKET] Failed to fetch ${securityId} - marking for server retry`);
        // CRITICAL CHANGE: Return failure marker instead of fallback
        return {
          key: internalId,
          failed: true, // Mark as failed for waterfall retry
          asset: asset  // Keep asset for retry logic
        };
      }

      // Normalize to match backend format
      const priceKey = internalId;
      const symbol = asset.apiId || asset.symbol || '';

      // --- התיקון לשם הגנרי ---
      let finalName = asset.name || symbol;
      const genericTitle = "פורטל קרנות";

      if (browserData.name && (!finalName || finalName.includes(genericTitle))) {
        finalName = browserData.name;
      }

      return {
        key: priceKey,
        data: {
          symbol: symbol,
          name: finalName,
          currentPrice: browserData.price,
          currency: 'ILS',
          change24h: browserData.changePct || 0,
          changeAmount: (browserData.price * (browserData.changePct || 0)) / 100,
          lastUpdated: new Date(),
          source: browserData.source || 'funder-browser',
          assetType: asset.assetType === 'ETF' ? 'ETF' : 'STOCK',
        }
      };
    } catch (error) {
      console.error(`[ISRAEL BUCKET] Error fetching ${internalId}:`, error.message);
      // Return failure marker for waterfall retry
      return {
        key: internalId,
        failed: true,
        asset: asset
      };
    }
  });

  // ==================== STEP 2.5: WATERFALL FALLBACK - Wait for Israel Results ====================

  // Wait for all Israel bucket fetches first
  const israelResults = await Promise.all(israelPromises);

  // Extract failed Israeli assets for server retry
  const failedIsraeliAssets = israelResults.filter(result => result && result.failed);

  if (DEBUG_PRICES && failedIsraeliAssets.length > 0) {
    console.log(`[WATERFALL FALLBACK] ${failedIsraeliAssets.length} Israeli assets failed browser fetch, retrying via server...`);
  }

  // ==================== STEP 3: FORMAT FAILED ISRAELI ASSETS FOR YAHOO ====================

  const retryBucket = [];
  failedIsraeliAssets.forEach(({ asset, key }) => {
    // Check if asset has a valid symbol or security ID
    const symbol = asset.symbol || asset.apiId;

    if (!symbol) {
      console.warn(`[WATERFALL FALLBACK] Skipping asset without symbol:`, asset.name);
      return;
    }

    // Format for Yahoo: Ensure .TA suffix
    // Works for both tickers (POLI → POLI.TA) and numeric IDs (1183441 → 1183441.TA)
    let yahooSymbol = symbol.toString().toUpperCase();
    if (!yahooSymbol.endsWith('.TA')) {
      yahooSymbol = `${yahooSymbol}.TA`;
    }

    const yahooInternalId = `yahoo:${yahooSymbol}`;

    if (DEBUG_PRICES) {
      console.log(`[WATERFALL FALLBACK] Retrying ${symbol} as ${yahooSymbol} via server`);
    }

    retryBucket.push({
      asset: asset,
      internalId: yahooInternalId,
      originalKey: key, // Keep original key for result mapping
      yahooSymbol: yahooSymbol
    });
  });

  // ==================== STEP 4: EXECUTE SERVER FETCH (Global + Retry) ====================

  // ========== BUCKET B: GLOBAL + RETRY (Backend API with BATCHING) ==========
  let globalQuotes = [];
  const combinedBucket = [...globalBucket, ...retryBucket];

  if (combinedBucket.length > 0) {
    try {
      const combinedIds = combinedBucket.map(item => item.internalId);

      // Split into batches to avoid overwhelming the API
      const batches = [];
      for (let i = 0; i < combinedIds.length; i += globalBatchSize) {
        batches.push(combinedIds.slice(i, i + globalBatchSize));
      }

      if (DEBUG_PRICES) {
        console.log(`[GLOBAL+RETRY BUCKET] Sending ${combinedIds.length} assets (${globalBucket.length} global + ${retryBucket.length} retry) in ${batches.length} batches...`);
      }

      // Process batches sequentially to respect rate limits
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (DEBUG_PRICES) {
          console.log(`[GLOBAL+RETRY BUCKET] Processing batch ${i + 1}/${batches.length} (${batch.length} assets)`);
        }
        const batchQuotes = await getQuotes(batch);
        globalQuotes.push(...batchQuotes);
      }
    } catch (error) {
      console.error('[GLOBAL+RETRY BUCKET] Backend API error:', error);
    }
  }

  // ==================== STEP 5: MERGE & NORMALIZE ====================

  // Add successful Israel bucket results to final output
  israelResults.forEach(result => {
    if (result && result.key && result.data) {
      results[result.key] = result.data;
    }
  });

  // Create a map of retry bucket items for result mapping
  const retryMap = new Map();
  retryBucket.forEach(item => {
    retryMap.set(item.internalId, item);
  });

  // Add Global bucket results (backend API) AND Retry bucket results
  const validGlobalQuotes = globalQuotes.filter(q =>
    q &&
    !q.error &&
    typeof q.price === 'number' &&
    !isNaN(q.price) &&
    q.price > 0
  );

  // Log errors from backend and use old prices if available
  globalQuotes.forEach(q => {
    if (q && q.error) {
      console.warn(`[GLOBAL+RETRY BUCKET] Backend error for ${q.id}:`, q.error);

      // Check if this is a retry item first
      const retryItem = retryMap.get(q.id);
      if (retryItem) {
        console.warn(`[WATERFALL FALLBACK] Failed to fetch ${retryItem.yahooSymbol} from server - no fallback available`);
        // Could optionally use old price here if needed
        return;
      }

      // Try to use old price for regular global assets
      const asset = assetMap.get(q.id);
      if (asset && asset.currentPrice) {
        const symbol = asset.apiId || asset.symbol || '';
        results[q.id] = {
          symbol: symbol,
          name: asset.name || symbol,
          currentPrice: asset.currentPrice,
          currency: asset.currency || 'USD',
          change24h: asset.priceChange24h || 0,
          changeAmount: (asset.currentPrice * (asset.priceChange24h || 0)) / 100,
          lastUpdated: asset.lastUpdated,
          source: asset.assetType === 'CRYPTO' ? 'coingecko' : 'yahoo',
          assetType: asset.assetType || 'STOCK',
          stale: true
        };
      }
    }
  });

  validGlobalQuotes.forEach((quote) => {
    // Check if this is a retry item (waterfall fallback from Israel bucket)
    const retryItem = retryMap.get(quote.id);

    if (retryItem) {
      // This is a retry item - map back to original Israeli asset key
      const asset = retryItem.asset;
      const originalKey = retryItem.originalKey;

      if (DEBUG_PRICES) {
        console.log(`[WATERFALL FALLBACK] ✅ Success! ${retryItem.yahooSymbol} fetched from server`);
      }

      results[originalKey] = {
        symbol: asset.apiId || asset.symbol || '',
        name: asset.name || retryItem.yahooSymbol,
        currentPrice: quote.price,
        currency: quote.currency || 'ILS', // Keep ILS for Israeli stocks
        change24h: quote.changePct || 0,
        changeAmount: (quote.price * (quote.changePct || 0)) / 100,
        lastUpdated: new Date(quote.timestamp || Date.now()),
        source: 'yahoo-fallback', // Mark as fallback source
        assetType: asset.assetType || 'STOCK',
      };
      return;
    }

    // Regular global asset (not a retry)
    const asset = assetMap.get(quote.id);
    if (!asset) return;

    const priceKey = quote.id;
    const symbol = asset.apiId || asset.symbol || '';

    let assetType = 'STOCK';
    if (symbol.startsWith('^')) {
      assetType = 'INDEX';
    } else if (asset.assetType === 'CRYPTO' || quote.id.startsWith('cg:')) {
      assetType = 'CRYPTO';
    } else if (asset.assetType === 'ETF') {
      assetType = 'ETF';
    }

    results[priceKey] = {
      symbol: symbol,
      name: asset.name || symbol,
      currentPrice: quote.price,
      currency: quote.currency || 'USD',
      change24h: quote.changePct || 0,
      changeAmount: (quote.price * (quote.changePct || 0)) / 100,
      lastUpdated: new Date(quote.timestamp || Date.now()),
      source: quote.source === 'coingecko' ? 'coingecko' : 'yahoo',
      assetType: assetType,
    };
  });

  // Merge cached results with fresh results
  const finalResults = { ...cachedResults, ...results };

  if (DEBUG_PRICES) {
    console.log(`[SPLIT ROUTING] Final results count: ${Object.keys(finalResults).length} (${Object.keys(cachedResults).length} cached, ${Object.keys(results).length} fresh)`);
  }

  return finalResults;
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
    // Use backend API instead of direct CoinGecko call
    // Convert date to internal ID and fetch history
    const internalId = `cg:${coinId}`;

    // Fetch 5d range to ensure we get the date
    const history = await getHistory(internalId, '5d', '1d');

    if (!history || !history.points || history.points.length === 0) {
      return null;
    }

    // Parse target date
    const [day, month, year] = date.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const targetTimestamp = targetDate.getTime();

    // Find the closest point to the target date
    let closestPoint = null;
    let minDiff = Infinity;

    for (const point of history.points) {
      const diff = Math.abs(point.t - targetTimestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closestPoint = point;
      }
    }

    // If we found a point within 24 hours, use it
    if (closestPoint && minDiff < 24 * 60 * 60 * 1000) {
      setCachedPrice(cacheKey, closestPoint.v);
      return closestPoint.v;
    }

    return null;
  } catch (error) {
    console.error('Error fetching crypto historical price:', error);
    return null;
  }
};

/**
 * Fetch historical price for a stock on a specific date
 * @param {Object|string} assetOrId - Asset object or ID string
 * @param {Date|string} date - Target date
 * @returns {Promise<number|null>}
 */
export const fetchYahooHistoricalPrice = async (assetOrId, date) => {
  if (!assetOrId || !date) return null;

  // Resolve internal ID
  const internalId = typeof assetOrId === 'object'
    ? resolveInternalId(assetOrId)
    : resolveInternalId(assetOrId);

  if (!internalId) return null;

  const targetDate = new Date(date);
  const dateStr = targetDate.toISOString().split('T')[0];
  const cacheKey = `yahoo-history:${internalId}:${dateStr}`;
  const cached = getCachedPrice(cacheKey);
  if (cached) return cached;

  try {
    // Fetch history data from backend (5d range to ensure we get the date)
    const history = await getHistory(internalId, '5d', '1d');

    if (!history || !history.points || history.points.length === 0) {
      return null;
    }

    // Find the closest point to the target date
    const targetTimestamp = targetDate.getTime();
    let closestPoint = null;
    let minDiff = Infinity;

    for (const point of history.points) {
      const diff = Math.abs(point.t - targetTimestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closestPoint = point;
      }
    }

    // If we found a point within 24 hours, use it
    if (closestPoint && minDiff < 24 * 60 * 60 * 1000) {
      setCachedPrice(cacheKey, closestPoint.v);
      return closestPoint.v;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching historical price for ${internalId}:`, error);
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

  const internalId = resolveInternalId(asset);
  if (!internalId) return null;

  // ==================== SPLIT ROUTING: Skip TASE Historical ====================
  // TASE historical data is not supported by backend, return null immediately
  const isTaseAsset =
    asset.marketDataSource === 'tase-local' ||
    internalId.startsWith('tase:') ||
    (asset.symbol && asset.symbol.endsWith('.TA'));

  if (isTaseAsset) {
    if (DEBUG_PRICES) {
      console.log(`[HISTORY DEBUG] TASE historical data not supported for ${internalId}, returning null`);
    }
    return null;
  }

  // CoinGecko uses different date format
  if (internalId.startsWith('cg:')) {
    const coinId = internalId.replace('cg:', '');
    const targetDate = new Date(date);
    const dateStr = `${String(targetDate.getDate()).padStart(2, '0')}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${targetDate.getFullYear()}`;
    return await fetchCryptoHistoricalPrice(coinId, dateStr);
  }

  // Yahoo and other assets use same backend endpoint
  return await fetchYahooHistoricalPrice(asset, date);
};

// ==================== PRICE CHART DATA ====================

/**
 * Fetch price history for chart (time series) - via backend API
 * @param {Object|string} assetOrId - Asset object or ID string
 * @param {number} days - Number of days of history
 * @returns {Promise<Array<{date: Date, price: number}>>}
 */
export const fetchPriceHistory = async (assetOrId, days = 30) => {
  if (!assetOrId) return [];

  // Resolve internal ID from asset or string
  const internalId = typeof assetOrId === 'object'
    ? resolveInternalId(assetOrId)
    : resolveInternalId(assetOrId);

  if (!internalId) return [];

  const cacheKey = `history:${internalId}:${days}`;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < HISTORY_CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Convert days to range
    const range = days <= 7 ? '5d' : days <= 30 ? '1mo' : days <= 90 ? '3mo' : '1y';

    let fetchId = internalId;

    // NEW: Handle TASE assets (scraped) by falling back to Yahoo for history
    // TASE IDs are "tase:123". Backend doesn't know "tase".
    // We convert to "yahoo:123.TA" to try fetching history from Yahoo.
    if (internalId.startsWith('tase:')) {
      const rawId = internalId.replace('tase:', '');
      // Check if rawId is numeric (typical TASE ID) or ticker
      const symbol = typeof assetOrId === 'object' && assetOrId.symbol ? assetOrId.symbol : rawId;

      // Use symbol if available (e.g. "TEVA"), otherwise rawId (e.g. "123456")
      // Yahoo expects "TEVA.TA" or "123456.TA"
      const yahooSymbol = symbol.endsWith('.TA') ? symbol : `${symbol}.TA`;

      fetchId = `yahoo:${yahooSymbol}`;

      if (DEBUG_PRICES) {
        console.log(`[HISTORY] Routing TASE asset ${internalId} to Yahoo history as ${fetchId}`);
      }
    }

    const history = await getHistory(fetchId, range, '1d');

    // Handle error responses or missing data gracefully
    if (!history || history.error || !Array.isArray(history.points) || history.points.length === 0) {
      if (history && history.error) {
        // "History data not found" is a normal case, not an error - use debug level
        if (history.error === 'History data not found') {
          console.debug(`History data not found for ${fetchId} (this is normal)`);
        } else {
          // Real errors should be logged as warnings
          console.warn(`History error for ${fetchId}:`, history.error);
        }
      }
      return [];
    }

    const prices = history.points.map((point) => ({
      date: new Date(point.t),
      price: point.v,
    }));

    priceCache.set(cacheKey, { data: prices, timestamp: Date.now() });
    return prices;
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
 * @deprecated Use convertAmount from currency.js instead
 * @param {number} price - Price to convert
 * @param {string} fromCurrency - Source currency ('USD' | 'ILS')
 * @param {string} toCurrency - Target currency ('USD' | 'ILS')
 * @returns {Promise<number>} Converted price
 */
export const convertCurrency = async (price, fromCurrency, toCurrency) => {
  // Use the canonical conversion function
  const { convertAmount } = await import('./currency');
  return await convertAmount(price, fromCurrency, toCurrency);
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

