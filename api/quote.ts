/**
 * Quote API - Fetch current prices for multiple assets
 * Supports crypto (CoinGecko) and stocks/ETFs/indices (Yahoo Finance)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchReliable, fetchJsonSafe, fetchWithCoalescing } from './_utils/http';
import { getInstrumentBySecurityId } from './_data/taseInstruments';

interface QuoteResult {
  id: string;
  price?: number;
  currency?: string;
  changePct?: number;
  timestamp?: number;
  source?: 'coingecko' | 'yahoo';
  isStale?: boolean;
  error?: string;
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
  // Default: assume Yahoo Finance
  return { provider: 'yahoo', symbol: id };
}

/**
 * Fetch crypto prices from CoinGecko
 */
async function fetchCoinGeckoQuotes(coinIds: string[]): Promise<Map<string, QuoteResult>> {
  const results = new Map<string, QuoteResult>();

  if (coinIds.length === 0) return results;

  try {
    const idsString = coinIds.join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsString}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`;
    
    const response = await fetchReliable(url, { timeoutMs: 8000, retries: 2 });
    
    if (!response.ok) {
      return results;
    }

    const data = await fetchJsonSafe(response);

    for (const coinId of coinIds) {
      const coinData = data[coinId];
      if (coinData && coinData.usd) {
        results.set(`cg:${coinId}`, {
          id: `cg:${coinId}`,
          price: coinData.usd,
          currency: 'USD',
          changePct: coinData.usd_24h_change || 0,
          timestamp: coinData.last_updated_at ? coinData.last_updated_at * 1000 : Date.now(),
          source: 'coingecko',
        });
      } else {
        // CoinGecko didn't return data for this coin
        results.set(`cg:${coinId}`, {
          id: `cg:${coinId}`,
          error: `Coin ${coinId} not found in CoinGecko response`,
        });
      }
    }
  } catch (error) {
    console.error('CoinGecko quote error:', error);
    // If entire request failed, mark all coins as errors
    for (const coinId of coinIds) {
      if (!results.has(`cg:${coinId}`)) {
        results.set(`cg:${coinId}`, {
          id: `cg:${coinId}`,
          error: `CoinGecko API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }
  }

  return results;
}

/**
 * Fetch stock/ETF/index prices from Yahoo Finance using chart endpoint (v8)
 * Since quote endpoint returns 401, we derive latest price from chart data
 */
async function fetchYahooQuotes(
  symbols: string[],
  symbolToIdMap: Map<string, string>
): Promise<Map<string, QuoteResult>> {
  const results = new Map<string, QuoteResult>();

  if (symbols.length === 0) return results;

  // Process each symbol individually (chart endpoint doesn't support batching)
  // Use Promise.all for parallel requests with coalescing
  const quotePromises = symbols.map(async (symbol) => {
    const internalId = symbolToIdMap.get(symbol);
    if (!internalId) {
      // Fallback: infer ID from symbol format
      if (symbol.endsWith('.TA') && /^\d+\.TA$/.test(symbol)) {
        const securityId = symbol.replace('.TA', '');
        return { symbol, internalId: `tase:${securityId}` };
      }
      return { symbol, internalId: `yahoo:${symbol}` };
    }
    return { symbol, internalId };
  });

  const symbolIdPairs = await Promise.all(quotePromises);

  // Process symbols in parallel with coalescing
  const fetchPromises = symbolIdPairs.map(async ({ symbol, internalId }) => {
    try {
      // Use coalescing per symbol to dedupe concurrent requests
      // Try 1m interval with 1d range first (most recent data)
      const coalesceKey1m = `yahoo_chart_quote:${symbol}:1d:1m`;
      
      let response = await fetchWithCoalescing(coalesceKey1m, () => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m`;
        
        return fetchReliable(url, {
          timeoutMs: 8000,
          retries: 2,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });
      });

      if (!response.ok || response.status >= 400) {
        // Fallback 1: Try 5m interval with 5d range
        const coalesceKey5m = `yahoo_chart_quote:${symbol}:5d:5m`;
        response = await fetchWithCoalescing(coalesceKey5m, () => {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=5m`;
          
          return fetchReliable(url, {
            timeoutMs: 8000,
            retries: 2,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          });
        });

        if (!response.ok || response.status >= 400) {
          // Fallback 2: Try 1d interval with 5d range
          const coalesceKey1d = `yahoo_chart_quote:${symbol}:5d:1d`;
          response = await fetchWithCoalescing(coalesceKey1d, () => {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
            
            return fetchReliable(url, {
              timeoutMs: 8000,
              retries: 2,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
              },
            });
          });

          if (!response.ok || response.status >= 400) {
            return {
              internalId,
              error: `Yahoo Finance API error: HTTP ${response.status}`,
            };
          }

          return await parseChartResponse(response, symbol, internalId, true);
        }

        return await parseChartResponse(response, symbol, internalId, false);
      }

      return await parseChartResponse(response, symbol, internalId, false);
    } catch (error) {
      console.error(`Yahoo chart quote error for ${symbol}:`, error);
      return {
        internalId,
        error: `Yahoo Finance API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  });

  const quoteResults = await Promise.all(fetchPromises);

  // Add all results to map
  for (const result of quoteResults) {
    if (result.internalId) {
      results.set(result.internalId, {
        id: result.internalId,
        price: result.price,
        currency: result.currency,
        changePct: result.changePct,
        timestamp: result.timestamp,
        source: 'yahoo',
        error: result.error,
      });
    }
  }

  return results;
}

/**
 * Parse Yahoo chart response to extract latest price
 */
async function parseChartResponse(
  response: Response,
  symbol: string,
  internalId: string,
  isDailyFallback: boolean
): Promise<Partial<QuoteResult> & { internalId: string }> {
  try {
    const data = await fetchJsonSafe(response);

    // Defensive parsing: ensure chart structure exists
    if (!data || !data.chart || !Array.isArray(data.chart.result) || data.chart.result.length === 0) {
      return {
        internalId,
        error: `Invalid chart response structure for ${symbol}`,
      };
    }

    const chartResult = data.chart.result[0];
    if (!chartResult) {
      return {
        internalId,
        error: `No chart data found for ${symbol}`,
      };
    }

    const meta = chartResult.meta || {};
    const timestamps = chartResult.timestamp || [];
    const quoteIndicators = chartResult.indicators?.quote?.[0];
    const closes = quoteIndicators?.close || [];

    // Extract price according to priority:
    // 1. meta.regularMarketPrice (preferred)
    // 2. latest non-null value from indicators.quote[0].close array
    // 3. meta.previousClose (fallback)
    let price: number | null = null;
    let timestamp: number = Date.now();

    // Priority 1: Use meta.regularMarketPrice if present
    if (meta.regularMarketPrice !== null && meta.regularMarketPrice !== undefined) {
      price = meta.regularMarketPrice;
      if (meta.regularMarketTime) {
        timestamp = meta.regularMarketTime * 1000;
      }
    } else if (closes.length > 0) {
      // Priority 2: Use latest non-null value from closes array
      for (let i = closes.length - 1; i >= 0; i--) {
        if (closes[i] !== null && closes[i] !== undefined) {
          price = closes[i];
          if (timestamps[i]) {
            timestamp = timestamps[i] * 1000; // Convert to milliseconds
          }
          break;
        }
      }
    }

    // Priority 3: Fallback to previousClose if still no price
    if (price === null || price === undefined) {
      price = meta.previousClose || null;
      if (meta.previousClose && meta.regularMarketTime) {
        timestamp = meta.regularMarketTime * 1000;
      }
    }

    if (price === null || price === undefined) {
      return {
        internalId,
        error: `No price data found for ${symbol}`,
      };
    }

    // Extract currency
    let currency = meta.currency || (symbol.endsWith('.TA') ? 'ILS' : 'USD');
    // Normalize ILA -> ILS
    if (currency === 'ILA') {
      currency = 'ILS';
    }

    // TASE Special Handling: Convert Agorot to Shekels
    // Apply ONLY to .TA non-index symbols with price > 500
    if (symbol.endsWith('.TA') && !symbol.startsWith('^') && price > 500) {
      price = price / 100;
    }

    // Calculate change percentage
    let changePct = 0;
    const previousClose = meta.regularMarketPreviousClose || meta.previousClose;
    
    if (meta.regularMarketChangePercent !== undefined && meta.regularMarketChangePercent !== null) {
      changePct = meta.regularMarketChangePercent;
    } else if (previousClose && previousClose > 0) {
      const adjustedPrevClose = symbol.endsWith('.TA') && !symbol.startsWith('^') && previousClose > 500
        ? previousClose / 100
        : previousClose;
      const change = price - adjustedPrevClose;
      changePct = (change / adjustedPrevClose) * 100;
    }

    return {
      internalId,
      price,
      currency,
      changePct,
      timestamp,
    };
  } catch (error) {
    console.error(`Error parsing chart response for ${symbol}:`, error);
    return {
      internalId,
      error: `Failed to parse chart response: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Parse IDs from query string (supports both repeated params and comma-separated)
 */
function parseIdsFromQuery(query: any): string[] {
  if (!query.ids) {
    return [];
  }

  // Handle array of IDs: ?ids=id1&ids=id2
  if (Array.isArray(query.ids)) {
    return query.ids;
  }

  // Handle comma-separated: ?ids=id1,id2,id3
  if (typeof query.ids === 'string') {
    return query.ids.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
  }

  return [];
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Ensure JSON content-type for all responses
  res.setHeader('Content-Type', 'application/json');
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const isGet = req.method === 'GET';
  const isHead = req.method === 'HEAD';
  const isPost = req.method === 'POST';

  if (!isGet && !isHead && !isPost) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let internalIds: string[] = [];
    let symbols: string[] | undefined;

    if (isGet || isHead) {
      // Parse from query string
      const queryIds = parseIdsFromQuery(req.query);
      if (queryIds.length === 0) {
        if (isHead) {
          res.status(400).end();
          return;
        }
        return res.status(400).json({ error: 'Query parameter "ids" is required (e.g., ?ids=yahoo:AAPL&ids=cg:bitcoin or ?ids=yahoo:AAPL,cg:bitcoin)' });
      }
      internalIds = queryIds;
    } else if (isPost) {
      // Parse from body
      const { ids, symbols: bodySymbols } = req.body;
      if (!ids && !bodySymbols) {
        return res.status(400).json({ error: 'Either "ids" or "symbols" must be provided' });
      }
      internalIds = ids || [];
      symbols = bodySymbols;
    }

    // Handle symbols in POST (convert to internal IDs)
    if (symbols) {
      symbols.forEach((symbol: string) => {
        if (!internalIds.includes(`yahoo:${symbol}`)) {
          internalIds.push(`yahoo:${symbol}`);
        }
      });
    }

    if (internalIds.length === 0) {
      return res.status(400).json({ error: 'No valid IDs or symbols provided' });
    }

    // Separate by provider
    const coinGeckoIds: string[] = [];
    const yahooSymbols: string[] = [];
    const idToSymbolMap = new Map<string, string>();
    const symbolToIdMap = new Map<string, string>();

    internalIds.forEach((id) => {
      const { provider, symbol } = parseId(id);
      idToSymbolMap.set(id, symbol);
      symbolToIdMap.set(symbol, id); // Map symbol -> internal ID for result mapping

      if (provider === 'coingecko') {
        coinGeckoIds.push(symbol);
      } else {
        yahooSymbols.push(symbol);
      }
    });

    // Fetch in parallel
    const [cryptoResults, yahooResults] = await Promise.all([
      fetchCoinGeckoQuotes(coinGeckoIds),
      fetchYahooQuotes(yahooSymbols, symbolToIdMap),
    ]);

    // Merge results - ensure every requested ID has a response (success or error)
    const allResults: QuoteResult[] = [];
    
    internalIds.forEach((id) => {
      const cryptoResult = cryptoResults.get(id);
      const yahooResult = yahooResults.get(id);
      
      if (cryptoResult) {
        allResults.push(cryptoResult);
      } else if (yahooResult) {
        allResults.push(yahooResult);
      } else {
        // No result found - return error object
        allResults.push({
          id,
          error: `No data available for ${id}`,
        });
      }
    });

    // Set cache headers - only for GET/HEAD requests (CDN caching)
    if (isGet || isHead) {
      res.setHeader('Cache-Control', 'max-age=0, s-maxage=60, stale-while-revalidate=300');
      res.setHeader('CDN-Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    } else {
      // POST requests: minimal caching (browser only, no CDN)
      res.setHeader('Cache-Control', 'no-cache');
    }

    // HEAD requests: return headers only, no body
    if (isHead) {
      return res.status(200).end();
    }

    return res.status(200).json(allResults);
  } catch (error: any) {
    console.error('Quote API error:', error);
    const requestId = req.headers['x-vercel-id'] || req.headers['x-request-id'] || 'unknown';
    return res.status(500).json({
      error: 'Internal server error',
      details: error?.message || 'Unknown error',
      requestId: String(requestId),
    });
  }
}
