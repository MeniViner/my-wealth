/**
 * Quote API - Fetch current prices for multiple assets
 * 
 * Supports:
 * - Crypto via CoinGecko API
 * - Stocks/ETFs/Indices via Yahoo Finance chart endpoint (v8)
 * - TASE securities resolved via taseInstruments DB → Yahoo symbol
 * 
 * Currency Handling:
 * - Yahoo returns `currency: "ILA"` for Israeli Agorot-quoted instruments
 * - We normalize ILA → ILS and divide price by 100
 * - NO magic threshold (>500) — we trust the currency metadata
 * - Indices (symbol starts with ^) are NEVER divided
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getInstrumentBySecurityId } from './_data/taseInstruments';

// ==================== CONSTANTS ====================

const TIMEOUT_MS = 5000;

// Map common ticker symbols → CoinGecko IDs (slugs)
const TICKER_TO_COINGECKO: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana',
  ADA: 'cardano', DOT: 'polkadot', LINK: 'chainlink',
  LTC: 'litecoin', BCH: 'bitcoin-cash', XLM: 'stellar',
  DOGE: 'dogecoin', AVAX: 'avalanche-2', MATIC: 'polygon',
  UNI: 'uniswap', ATOM: 'cosmos', ALGO: 'algorand',
  VET: 'vechain', FIL: 'filecoin', GRT: 'the-graph',
  AAVE: 'aave', XRP: 'ripple', BNB: 'binancecoin',
  SHIB: 'shiba-inu', TRX: 'tron', TON: 'the-open-network',
  SUI: 'sui', APT: 'aptos', ARB: 'arbitrum',
  OP: 'optimism', NEAR: 'near', PEPE: 'pepe',
  USDT: 'tether', USDC: 'usd-coin', DAI: 'dai',
  LEO: 'leo-token', ETC: 'ethereum-classic',
  XMR: 'monero', HBAR: 'hedera-hashgraph',
  EGLD: 'elrond-erd-2', ICP: 'internet-computer',
  MANA: 'decentraland', SAND: 'the-sandbox', AXS: 'axie-infinity',
  THETA: 'theta-token', XTZ: 'tezos', EOS: 'eos',
  CAKE: 'pancakeswap-token', MKR: 'maker',
};

// ==================== HELPERS ====================

async function quickFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { 
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PortfolioApp/1.0)',
        ...options.headers,
      },
    });
    clearTimeout(timeoutId);
    return res;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Parse internal ID → { provider, symbol, originalId }
 * 
 * For TASE: looks up yahooSymbol from instruments DB.
 * Falls back to `${securityId}.TA` if not found.
 */
function parseId(id: string): { provider: string; symbol: string; isTase: boolean } {
  if (!id) return { provider: 'yahoo', symbol: 'unknown', isTase: false };

  if (id.startsWith('cg:')) {
    let symbol = id.substring(3);
    // If symbol is uppercase ticker (e.g. "SOL"), try to resolve to slug
    if (TICKER_TO_COINGECKO[symbol]) {
      symbol = TICKER_TO_COINGECKO[symbol];
    } else if (TICKER_TO_COINGECKO[symbol.toUpperCase()]) {
      symbol = TICKER_TO_COINGECKO[symbol.toUpperCase()];
    }
    return { provider: 'coingecko', symbol, isTase: false };
  }

  if (id.startsWith('yahoo:')) {
    const symbol = id.substring(6);
    return { provider: 'yahoo', symbol, isTase: symbol.endsWith('.TA') };
  }

    if (id.startsWith('tase:')) {
      const securityId = id.substring(5);
      try {
        const inst = getInstrumentBySecurityId(securityId);
        const symbol = inst?.yahooSymbol ?? `${securityId}.TA`;
      return { provider: 'yahoo', symbol, isTase: true };
      } catch {
      return { provider: 'yahoo', symbol: `${securityId}.TA`, isTase: true };
    }
  }

  // Default: assume Yahoo
  return { provider: 'yahoo', symbol: id, isTase: id.endsWith('.TA') };
}

/**
 * Parse IDs from query string
 * Supports: ?ids=a,b,c (comma-separated) and ?ids=a&ids=b (repeated params)
 */
function parseIdsFromQuery(query: Record<string, string | string[]>): string[] {
  if (!query.ids) return [];

  if (Array.isArray(query.ids)) {
    // ?ids=a&ids=b → already an array
    return query.ids.flatMap(id => String(id).split(',')).map(s => s.trim()).filter(Boolean);
  }

  if (typeof query.ids === 'string') {
    // ?ids=a,b,c → split by comma
    return query.ids.split(',').map(s => s.trim()).filter(Boolean);
  }

  return [];
}

// ==================== YAHOO FINANCE ====================

interface YahooQuoteResult {
  id: string;
  price?: number;
  currency?: string;
  changePct?: number;
  timestamp?: number;
  source?: string;
  error?: string;
}

/**
 * Fetch a single Yahoo quote using chart endpoint
 * 
 * CRITICAL: Currency normalization
 * - If Yahoo returns currency === "ILA" (Israeli Agorot), the price is in Agorot
 * - We divide by 100 to convert to ILS (Shekels)
 * - Indices (^ prefix) are NEVER in Agorot — they're point values
 */
async function fetchYahooQuote(symbol: string, internalId: string): Promise<YahooQuoteResult> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m`;
    const response = await quickFetch(url);

    if (!response.ok) {
      return { id: internalId, error: `Yahoo HTTP ${response.status}` };
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;

    if (!meta) {
      return { id: internalId, error: 'No Yahoo chart data' };
    }

    let price = meta.regularMarketPrice ?? meta.previousClose;
    if (price === null || price === undefined || isNaN(price)) {
      return { id: internalId, error: 'No valid price in Yahoo response' };
    }

    // CRITICAL: Currency normalization
    // Yahoo Finance reports Israeli securities in ILA (Agorot) not ILS (Shekels)
    // We detect this via the `currency` field — NOT via a price threshold
    let currency = meta.currency || 'USD';
    const isIndex = symbol.startsWith('^');

    if (currency === 'ILA' && !isIndex) {
      // Convert Agorot → Shekels
      price = price / 100;
      currency = 'ILS';
    } else if (currency === 'ILA' && isIndex) {
      // Indices in ILA are still points, just fix the currency label
      currency = 'ILS';
    }

    // Change percentage
    let changePct = 0;
    if (typeof meta.regularMarketChangePercent === 'number' && !isNaN(meta.regularMarketChangePercent)) {
      changePct = meta.regularMarketChangePercent;
    }

    // Timestamp
    const timestamp = meta.regularMarketTime
      ? meta.regularMarketTime * 1000
      : Date.now();

    return {
      id: internalId,
      price,
      currency,
      changePct,
      timestamp,
      source: 'yahoo',
    };
  } catch (error: any) {
    return { id: internalId, error: `Yahoo fetch failed: ${error?.message || 'Unknown'}` };
  }
}

// ==================== COINGECKO ====================

/**
 * Fetch crypto prices from CoinGecko (batch)
 */
async function fetchCoinGeckoQuotes(
  coinIds: string[],
  idMap: Map<string, string>
): Promise<YahooQuoteResult[]> {
  if (coinIds.length === 0) return [];

  try {
    const idsString = coinIds.join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsString}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`;
    const response = await quickFetch(url);

    if (!response.ok) {
      // Try fallback if CoinGecko fails
      console.warn(`[COINGECKO] HTTP ${response.status}, trying fallback...`);
      return await fetchCoinMarketCapQuotes(coinIds, idMap);
    }

    const data = await response.json();

    const results: YahooQuoteResult[] = [];
    const failedIds: string[] = [];

    for (const coinId of coinIds) {
      const internalId = idMap.get(coinId) || `cg:${coinId}`;
      const d = data[coinId];

      if (!d || typeof d.usd !== 'number') {
        failedIds.push(coinId);
        continue;
      }

      results.push({
        id: internalId,
        price: d.usd,
        currency: 'USD',
        changePct: d.usd_24h_change || 0,
        timestamp: d.last_updated_at ? d.last_updated_at * 1000 : Date.now(),
        source: 'coingecko',
      });
    }

    // Try fallback for failed coins
    if (failedIds.length > 0) {
      console.warn(`[COINGECKO] ${failedIds.length} coins failed, trying fallback...`);
      const fallbackResults = await fetchCoinMarketCapQuotes(failedIds, idMap);
      results.push(...fallbackResults);
    }

    return results;
  } catch (error: any) {
    console.error('[COINGECKO] Error:', error);
    // Try fallback on error
    return await fetchCoinMarketCapQuotes(coinIds, idMap);
  }
}

// ==================== COINMARKETCAP FALLBACK ====================

/**
 * Fetch crypto prices from CoinMarketCap (fallback)
 * Note: CoinMarketCap requires API key, but we can use their public endpoint for basic data
 * For production, consider using a free tier API key
 */
async function fetchCoinMarketCapQuotes(
  coinIds: string[],
  idMap: Map<string, string>
): Promise<YahooQuoteResult[]> {
  if (coinIds.length === 0) return [];

  try {
    // CoinMarketCap uses symbols, not IDs - we need to map common ones
    const symbolMap: Record<string, string> = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'solana': 'SOL',
      'cardano': 'ADA',
      'polkadot': 'DOT',
      'chainlink': 'LINK',
      'litecoin': 'LTC',
      'bitcoin-cash': 'BCH',
      'stellar': 'XLM',
      'dogecoin': 'DOGE',
      'avalanche-2': 'AVAX',
      'polygon': 'MATIC',
      'uniswap': 'UNI',
      'cosmos': 'ATOM',
      'algorand': 'ALGO',
      'vechain': 'VET',
      'filecoin': 'FIL',
      'the-graph': 'GRT',
      'aave': 'AAVE',
    };

    // Try to fetch from Binance public API (no API key needed)
    const results: YahooQuoteResult[] = [];

    for (const coinId of coinIds) {
      const internalId = idMap.get(coinId) || `cg:${coinId}`;
      const symbol = symbolMap[coinId] || coinId.toUpperCase();

      try {
        // Binance public API - get 24h ticker
        const binanceUrl = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}USDT`;
        const binanceResponse = await quickFetch(binanceUrl);

        if (binanceResponse.ok) {
          const binanceData = await binanceResponse.json();
          const price = parseFloat(binanceData.lastPrice);
          const changePct = parseFloat(binanceData.priceChangePercent) || 0;

          if (price > 0) {
            results.push({
              id: internalId,
              price,
              currency: 'USD',
              changePct,
              timestamp: Date.now(),
              source: 'binance-fallback',
            });
            continue;
          }
        }
      } catch (err) {
        // Continue to next coin
      }

      // If Binance failed, return error
      results.push({
        id: internalId,
        error: `Fallback failed for ${coinId}`,
      });
    }

    return results;
  } catch (error: any) {
    console.error('[COINMARKETCAP FALLBACK] Error:', error);
    return coinIds.map(id => ({
      id: idMap.get(id) || `cg:${id}`,
      error: `All crypto providers failed: ${error?.message || 'Unknown'}`,
    }));
  }
}

// ==================== HANDLER ====================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Parse IDs from query AND body
    const queryIds = parseIdsFromQuery(req.query as Record<string, string | string[]>);
    const bodyIds: string[] = req.body?.ids ? (Array.isArray(req.body.ids) ? req.body.ids : []) : [];
    const rawIds = [...new Set([...queryIds, ...bodyIds])].filter(Boolean);

    if (rawIds.length === 0) {
      return res.status(400).json({ error: 'No IDs provided. Use ?ids=yahoo:AAPL,cg:bitcoin' });
    }

    // Route to providers
    const coinGeckoIds: string[] = [];
    const coinGeckoIdMap = new Map<string, string>(); // coinId → internalId
    const yahooTasks: Array<{ symbol: string; internalId: string }> = [];

    for (const id of rawIds) {
      const { provider, symbol } = parseId(id);
      if (provider === 'coingecko') {
        coinGeckoIds.push(symbol);
        coinGeckoIdMap.set(symbol, id);
      } else {
        yahooTasks.push({ symbol, internalId: id });
      }
    }

    // Fetch in parallel
    const [cgResults, ...yahooResults] = await Promise.all([
      fetchCoinGeckoQuotes(coinGeckoIds, coinGeckoIdMap),
      ...yahooTasks.map(({ symbol, internalId }) => fetchYahooQuote(symbol, internalId)),
    ]);

    const allResults = [...cgResults, ...yahooResults];

    // Cache headers
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

    return res.status(200).json(allResults);
  } catch (criticalError: any) {
    console.error('[QUOTE API] Critical error:', criticalError);
    return res.status(200).json([{ error: 'Server error handled gracefully' }]);
  }
}
