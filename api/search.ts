/**
 * Unified Asset Search API
 * Handles search for crypto, stocks, ETFs, indices, and Israeli securities
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchReliable, fetchJsonSafe } from './_utils/http';
import { searchTASEInstruments } from './_data/taseInstruments';

interface SearchResult {
  id: string; // stable internal id (e.g., "yahoo:^GSPC", "cg:bitcoin", "tase:1183441")
  type: 'crypto' | 'equity' | 'etf' | 'index' | 'fund';
  provider: 'coingecko' | 'yahoo' | 'tase-local';
  symbol: string; // provider symbol if relevant
  name: string;
  currency: string;
  exchange?: string;
  country?: string;
  extra?: {
    securityNumber?: string;
    isin?: string;
    image?: string;
  };
}

/**
 * Search TASE instruments locally (from server-side dataset)
 */
function searchTASEStocks(query: string): SearchResult[] {
  const instruments = searchTASEInstruments(query);
  
  return instruments.map(instr => ({
    id: `tase:${instr.securityId}`,
    type: instr.type,
    provider: 'tase-local' as const,
    symbol: instr.yahooSymbol,
    name: instr.nameEn, // Prefer English name for display
    currency: instr.currency,
    exchange: 'TASE',
    country: 'IL',
    extra: {
      securityNumber: instr.securityId,
    },
  }));
}

/**
 * Search CoinGecko for crypto
 */
async function searchCoinGecko(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
    const response = await fetchReliable(url, { timeoutMs: 5000, retries: 2 });
    
    if (!response.ok) {
      return [];
    }

    const data = await fetchJsonSafe(response);
    const coins = (data.coins || []).slice(0, 10);

    return coins.map((coin: any) => ({
      id: `cg:${coin.id}`,
      type: 'crypto' as const,
      provider: 'coingecko' as const,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      currency: 'USD',
      country: 'Global',
      extra: {
        image: coin.thumb || coin.large || undefined,
      },
    }));
  } catch (error) {
    console.error('CoinGecko search error:', error);
    return [];
  }
}

/**
 * Search Yahoo Finance (server-side, no CORS needed)
 */
async function searchYahooFinance(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0`;
    const response = await fetchReliable(url, { timeoutMs: 8000, retries: 2 });

    if (!response.ok) {
      return [];
    }

    const data = await fetchJsonSafe(response);
    const quotes = (data.quotes || []).filter(
      (q: any) =>
        q.quoteType === 'EQUITY' ||
        q.quoteType === 'ETF' ||
        q.quoteType === 'INDEX' ||
        (q.symbol && q.symbol.startsWith('^'))
    );

    return quotes.slice(0, 10).map((quote: any) => {
      const isIndex = quote.quoteType === 'INDEX' || (quote.symbol && quote.symbol.startsWith('^'));
      const isETF = quote.quoteType === 'ETF';
      const isIsraeli = quote.symbol?.endsWith('.TA') || 
                       quote.exchange?.toUpperCase().includes('TASE') ||
                       quote.exchange?.toUpperCase().includes('TEL AVIV');

      return {
        id: `yahoo:${quote.symbol}`,
        type: (isIndex ? 'index' : isETF ? 'etf' : 'equity') as 'equity' | 'etf' | 'index',
        provider: 'yahoo' as const,
        symbol: quote.symbol,
        name: quote.shortname || quote.longname || quote.symbol,
        currency: quote.currency || (isIsraeli ? 'ILS' : 'USD'),
        exchange: quote.exchange,
        country: isIsraeli ? 'IL' : 'US',
      };
    });
  } catch (error) {
    console.error('Yahoo Finance search error:', error);
    return [];
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const query = req.query.q as string;
  if (!query || query.trim().length < 1) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  const normalizedQuery = query.trim();

  try {
    const results: SearchResult[] = [];

    // Check if query looks like crypto (common crypto names/symbols)
    const cryptoKeywords = ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'coin'];
    const looksLikeCrypto = cryptoKeywords.some(kw => 
      normalizedQuery.toLowerCase().includes(kw)
    );

    // Check if query is numeric (could be TASE security number)
    const isNumeric = /^\d+$/.test(normalizedQuery);

    // Strategy:
    // 1. TASE local search first (for numeric IDs or Hebrew/English queries)
    // 2. CoinGecko search (if looks like crypto or general search)
    // 3. Yahoo Finance search (always, unless it's clearly a TASE security number with exact match)

    // TASE local search (for numeric IDs or Hebrew/English queries)
    const taseResults = searchTASEStocks(normalizedQuery);
    if (taseResults.length > 0) {
      results.push(...taseResults);
    }

    // If numeric query found exact TASE match, prioritize it but still search others
    const hasExactTASEMatch = isNumeric && taseResults.length > 0;

    const searchPromises: Promise<SearchResult[]>[] = [];

    // CoinGecko search (if looks like crypto or general search)
    if (looksLikeCrypto || !isNumeric) {
      searchPromises.push(searchCoinGecko(normalizedQuery));
    }

    // Yahoo Finance search (always, unless it's a numeric query with exact TASE match)
    // Still search Yahoo for numeric queries to catch any instruments not in our dataset
    if (!hasExactTASEMatch || !isNumeric) {
      searchPromises.push(searchYahooFinance(normalizedQuery));
    }

    // Execute searches in parallel
    const searchResults = await Promise.allSettled(searchPromises);
    
    searchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
      }
    });

    // Deduplicate by id (TASE results come first, so they take priority)
    const uniqueResults = Array.from(
      new Map(results.map((r) => [r.id, r])).values()
    );

    // Set cache headers
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');

    return res.status(200).json(uniqueResults.slice(0, 20));
  } catch (error: any) {
    console.error('Search API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
