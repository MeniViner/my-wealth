/**
 * History API - Fetch historical price data for charts
 * Supports crypto (CoinGecko) and stocks/ETFs/indices (Yahoo Finance)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchReliable, fetchJsonSafe, fetchWithCoalescing } from './_utils/http';
import { getInstrumentBySecurityId } from './_data/taseInstruments';

interface HistoryPoint {
  t: number; // timestamp (milliseconds)
  v: number; // value (price)
}

interface HistoryResult {
  id: string;
  points: HistoryPoint[];
  currency: string;
  source: 'coingecko' | 'yahoo';
}

/**
 * Parse internal ID to extract provider and symbol
 * For TASE, resolves yahooSymbol from dataset first
 */
function parseId(id: string): { provider: string; symbol: string } {
  if (id.startsWith('cg:')) {
    return { provider: 'coingecko', symbol: id.substring(3) };
  } else if (id.startsWith('yahoo:')) {
    return { provider: 'yahoo', symbol: id.substring(6) };
  } else if (id.startsWith('tase:')) {
    // TASE securities: resolve yahooSymbol from dataset first
    const securityId = id.substring(5);
    const inst = getInstrumentBySecurityId(securityId);
    const symbol = inst?.yahooSymbol ?? `${securityId}.TA`;
    return { provider: 'yahoo', symbol };
  }
  return { provider: 'yahoo', symbol: id };
}

/**
 * Convert range to CoinGecko days parameter
 */
function rangeToDays(range: string): number {
  switch (range) {
    case '1d':
    case '5d':
      return 7;
    case '1mo':
      return 30;
    case '3mo':
      return 90;
    case '6mo':
      return 180;
    case '1y':
      return 365;
    case '5y':
      return 1825;
    default:
      return 30;
  }
}

/**
 * Convert range to Yahoo Finance range parameter
 */
function rangeToYahooRange(range: string): string {
  switch (range) {
    case '1d':
      return '1d';
    case '5d':
      return '5d';
    case '1mo':
      return '1mo';
    case '3mo':
      return '3mo';
    case '6mo':
      return '6mo';
    case '1y':
      return '1y';
    case '5y':
      return '5y';
    default:
      return '1mo';
  }
}

/**
 * Fetch crypto history from CoinGecko
 */
async function fetchCoinGeckoHistory(
  coinId: string,
  range: string
): Promise<HistoryResult | null> {
  try {
    const days = rangeToDays(range);
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
    
    // Use coalescing to dedupe identical concurrent requests
    const coalesceKey = `history:coingecko:${coinId}:${range}`;
    
    const response = await fetchWithCoalescing(coalesceKey, () =>
      fetchReliable(url, { timeoutMs: 10000, retries: 2 })
    );
    
    if (!response.ok) {
      return null;
    }

    const data = await fetchJsonSafe(response);
    
    // Defensive parsing: ensure prices array exists
    if (!data || !Array.isArray(data.prices)) {
      console.warn(`CoinGecko history: invalid response structure for ${coinId}`);
      return null;
    }

    const prices = data.prices || [];

    return {
      id: `cg:${coinId}`,
      points: prices.map(([timestamp, price]: [number, number]) => ({
        t: timestamp,
        v: price,
      })),
      currency: 'USD',
      source: 'coingecko',
    };
  } catch (error) {
    console.error(`CoinGecko history error for ${coinId}:`, error);
    return null;
  }
}

/**
 * Fetch stock/ETF/index history from Yahoo Finance
 */
async function fetchYahooHistory(
  symbol: string,
  range: string,
  interval: string = '1d',
  originalId?: string
): Promise<HistoryResult | null> {
  try {
    const yahooRange = rangeToYahooRange(range);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${yahooRange}`;
    
    // Use coalescing to dedupe identical concurrent requests
    const coalesceKey = `history:yahoo:${symbol}:${range}:${interval}`;
    
    const response = await fetchWithCoalescing(coalesceKey, () =>
      fetchReliable(url, {
        timeoutMs: 10000,
        retries: 2,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      })
    );
    
    // Handle upstream failures properly - don't hide auth failures as 404
    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status >= 500) {
        throw new Error(`Upstream Yahoo failure: HTTP ${response.status}`);
      }
      // For other errors (404, etc.), return null (will be handled as "History data not found")
      return null;
    }

    const data = await fetchJsonSafe(response);
    
    // Defensive parsing: ensure chart structure exists
    if (!data || !data.chart || !Array.isArray(data.chart.result) || data.chart.result.length === 0) {
      console.warn(`Yahoo history: invalid response structure for ${symbol}`);
      return null;
    }

    const chartResult = data.chart.result[0];

    if (!chartResult) {
      return null;
    }

    const timestamps = chartResult.timestamp || [];
    const closes = chartResult.indicators?.quote?.[0]?.close || [];
    const meta = chartResult.meta || {};
    const currency = meta.currency || (symbol.endsWith('.TA') ? 'ILS' : 'USD');

    // Use originalId if provided (for TASE), otherwise determine from symbol
    let internalId: string;
    if (originalId) {
      internalId = originalId;
    } else if (symbol.endsWith('.TA') && /^\d+\.TA$/.test(symbol)) {
      const securityId = symbol.replace('.TA', '');
      internalId = `tase:${securityId}`;
    } else {
      internalId = `yahoo:${symbol}`;
    }

    const points: HistoryPoint[] = timestamps
      .map((ts: number, i: number) => ({
        t: ts * 1000, // Convert to milliseconds
        v: closes[i] || 0,
      }))
      .filter((p: HistoryPoint) => p.v > 0);

    // TASE Agorot conversion
    if (symbol.endsWith('.TA') && !symbol.startsWith('^') && points.length > 0 && points[0].v > 500) {
      points.forEach((p) => {
        p.v = p.v / 100;
      });
    }

    return {
      id: internalId,
      points,
      currency,
      source: 'yahoo',
    };
  } catch (error) {
    console.error(`Yahoo history error for ${symbol}:`, error);
    // Re-throw to be handled by caller (for proper 502 response on upstream failures)
    throw error;
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Ensure JSON content-type for all responses
  res.setHeader('Content-Type', 'application/json');
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const isGet = req.method === 'GET';
  const isHead = req.method === 'HEAD';

  if (!isGet && !isHead) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = req.query.id as string;
  const range = (req.query.range as string) || '1mo';
  const interval = (req.query.interval as string) || '1d';

  if (!id) {
    if (isHead) {
      res.status(400).end();
      return;
    }
    return res.status(400).json({ error: 'Query parameter "id" is required' });
  }

  try {
    const { provider, symbol } = parseId(id);

    let result: HistoryResult | null = null;

    if (provider === 'coingecko') {
      result = await fetchCoinGeckoHistory(symbol, range);
    } else {
      try {
        result = await fetchYahooHistory(symbol, range, interval, id);
      } catch (error: any) {
        // Handle upstream failures (401/403/5xx) - return {id, error} with status 200 (consistent with quote)
        if (error.message && error.message.includes('Upstream Yahoo failure')) {
          const statusMatch = error.message.match(/HTTP (\d+)/);
          const status = statusMatch ? parseInt(statusMatch[1]) : 502;
          
          // Set cache headers even for error responses
          if (isGet || isHead) {
            res.setHeader('Cache-Control', 'max-age=0, s-maxage=60, stale-while-revalidate=300');
            res.setHeader('CDN-Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
          }
          
          if (isHead) {
            return res.status(200).end();
          }
          
          return res.status(200).json({
            id,
            error: `Upstream Yahoo failure: HTTP ${status}`,
          });
        }
        // Re-throw other errors to be handled as 500
        throw error;
      }
    }

    // Handle no result: return {id, error} with status 200 (consistent with quote behavior)
    if (!result) {
      // Set cache headers even for error responses
      if (isGet || isHead) {
        res.setHeader('Cache-Control', 'max-age=0, s-maxage=60, stale-while-revalidate=300');
        res.setHeader('CDN-Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      }
      
      if (isHead) {
        return res.status(200).end();
      }
      
      return res.status(200).json({ id, error: 'History data not found' });
    }

    // Set cache headers for CDN caching (GET/HEAD requests are cacheable)
    if (isGet || isHead) {
      res.setHeader('Cache-Control', 'max-age=0, s-maxage=3600, stale-while-revalidate=86400');
      res.setHeader('CDN-Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    }

    // HEAD requests: return headers only, no body
    if (isHead) {
      return res.status(200).end();
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('History API error:', error);
    const requestId = req.headers['x-vercel-id'] || req.headers['x-request-id'] || 'unknown';
    return res.status(500).json({
      error: 'Internal server error',
      details: error?.message || 'Unknown error',
      requestId: String(requestId),
    });
  }
}
