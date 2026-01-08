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
 * Fetch stock/ETF/index prices from Yahoo Finance using v7 batch endpoint
 */
async function fetchYahooQuotes(
  symbols: string[],
  symbolToIdMap: Map<string, string>
): Promise<Map<string, QuoteResult>> {
  const results = new Map<string, QuoteResult>();

  if (symbols.length === 0) return results;

  // Chunk symbols for batch requests (Yahoo supports up to ~50 symbols per request)
  const chunkSize = 50;
  const chunks: string[][] = [];
  
  for (let i = 0; i < symbols.length; i += chunkSize) {
    chunks.push(symbols.slice(i, i + chunkSize));
  }

  // Process each chunk
  for (const chunk of chunks) {
    try {
      // Build batch URL
      const symbolsList = chunk.map(s => encodeURIComponent(s)).join(',');
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolsList}`;
      
      // Use coalescing to dedupe identical concurrent requests
      const sortedChunk = [...chunk].sort();
      const coalesceKey = `yahoo_quote:${sortedChunk.join(',')}`;
      
      const response = await fetchWithCoalescing(coalesceKey, () =>
        fetchReliable(url, { timeoutMs: 8000, retries: 2 })
      );

      if (!response.ok) {
        console.warn(`Yahoo batch quote error: ${response.status}`);
        // Mark all symbols in this chunk as errors
        for (const symbol of chunk) {
          const internalId = symbolToIdMap.get(symbol);
          if (internalId && !results.has(internalId)) {
            results.set(internalId, {
              id: internalId,
              error: `Yahoo Finance API error: HTTP ${response.status}`,
            });
          }
        }
        continue;
      }

      const data = await fetchJsonSafe(response);
      const quoteResults = data?.quoteResponse?.result || [];

      // Track which symbols were found in response
      const foundSymbols = new Set<string>();

      // Process each quote result
      for (const r of quoteResults) {
        const symbol = r.symbol;
        if (!symbol) continue;

        foundSymbols.add(symbol);

        let price = r.regularMarketPrice || 0;
        const previousClose = r.regularMarketPreviousClose || r.previousClose || price;
        let currency = r.currency || (symbol.endsWith('.TA') ? 'ILS' : 'USD');

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
        if (r.regularMarketChangePercent !== undefined && r.regularMarketChangePercent !== null) {
          changePct = r.regularMarketChangePercent;
        } else if (previousClose > 0) {
          const adjustedPrevClose = symbol.endsWith('.TA') && !symbol.startsWith('^') && previousClose > 500
            ? previousClose / 100
            : previousClose;
          const change = price - adjustedPrevClose;
          changePct = (change / adjustedPrevClose) * 100;
        }

        // Map symbol back to internal ID
        let internalId = symbolToIdMap.get(symbol);
        
        if (!internalId) {
          // Fallback: infer ID from symbol format
          if (symbol.endsWith('.TA') && /^\d+\.TA$/.test(symbol)) {
            const securityId = symbol.replace('.TA', '');
            internalId = `tase:${securityId}`;
          } else {
            internalId = `yahoo:${symbol}`;
          }
        }

        const timestamp = r.regularMarketTime ? r.regularMarketTime * 1000 : Date.now();

        results.set(internalId, {
          id: internalId,
          price,
          currency,
          changePct,
          timestamp,
          source: 'yahoo',
        });
      }

      // Mark missing symbols as errors
      for (const symbol of chunk) {
        if (!foundSymbols.has(symbol)) {
          const internalId = symbolToIdMap.get(symbol);
          if (internalId) {
            results.set(internalId, {
              id: internalId,
              error: `Symbol ${symbol} not found in Yahoo Finance response`,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Yahoo batch quote error for chunk:`, error);
      // Mark all symbols in this chunk as errors
      for (const symbol of chunk) {
        const internalId = symbolToIdMap.get(symbol);
        if (internalId && !results.has(internalId)) {
          results.set(internalId, {
            id: internalId,
            error: `Yahoo Finance API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      }
      // Continue with other chunks even if one fails
    }
  }

  return results;
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const isGet = req.method === 'GET';
  const isPost = req.method === 'POST';

  if (!isGet && !isPost) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let internalIds: string[] = [];
    let symbols: string[] | undefined;

    if (isGet) {
      // Parse from query string
      const queryIds = parseIdsFromQuery(req.query);
      if (queryIds.length === 0) {
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

    // Set cache headers - only for GET requests (CDN caching)
    if (isGet) {
      res.setHeader('Cache-Control', 'max-age=0, s-maxage=60, stale-while-revalidate=300');
      res.setHeader('CDN-Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    } else {
      // POST requests: minimal caching (browser only, no CDN)
      res.setHeader('Cache-Control', 'no-cache');
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
