// /**
//  * Quote API - Fetch current prices for multiple assets
//  * Supports crypto (CoinGecko) and stocks/ETFs/indices (Yahoo Finance)
//  */

// import type { VercelRequest, VercelResponse } from '@vercel/node';
// import { fetchReliable, fetchJsonSafe, fetchWithCoalescing } from './_utils/http';
// import { getInstrumentBySecurityId } from './_data/taseInstruments';

// interface QuoteResult {
//   id: string;
//   price?: number;
//   currency?: string;
//   changePct?: number;
//   timestamp?: number;
//   source?: 'coingecko' | 'yahoo' | 'funder';
//   isStale?: boolean;
//   error?: string;
// }

// /**
//  * Parse internal ID to extract provider and symbol
//  * For TASE, resolves yahooSymbol from dataset first
//  */
// function parseId(id: string): { provider: string; symbol: string } {
//   if (id.startsWith('cg:')) {
//     return { provider: 'coingecko', symbol: id.substring(3) };
//   } else if (id.startsWith('yahoo:')) {
//     return { provider: 'yahoo', symbol: id.substring(6) };
//   } else if (id.startsWith('tase:')) {
//     // TASE securities: resolve yahooSymbol from dataset first
//     const securityId = id.substring(5);
//     const inst = getInstrumentBySecurityId(securityId);
//     const symbol = inst?.yahooSymbol ?? `${securityId}.TA`;
//     return { provider: 'yahoo', symbol };
//   }
//   // Default: assume Yahoo Finance
//   return { provider: 'yahoo', symbol: id };
// }

// /**
//  * Fetch crypto prices from CoinGecko
//  */
// async function fetchCoinGeckoQuotes(coinIds: string[]): Promise<Map<string, QuoteResult>> {
//   const results = new Map<string, QuoteResult>();

//   if (coinIds.length === 0) return results;

//   try {
//     const idsString = coinIds.join(',');
//     const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsString}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`;

//     const response = await fetchReliable(url, { timeoutMs: 8000, retries: 2 });

//     if (!response.ok) {
//       return results;
//     }

//     const data = await fetchJsonSafe(response);

//     for (const coinId of coinIds) {
//       const coinData = data[coinId];
//       if (coinData && coinData.usd) {
//         results.set(`cg:${coinId}`, {
//           id: `cg:${coinId}`,
//           price: coinData.usd,
//           currency: 'USD',
//           changePct: coinData.usd_24h_change || 0,
//           timestamp: coinData.last_updated_at ? coinData.last_updated_at * 1000 : Date.now(),
//           source: 'coingecko',
//         });
//       } else {
//         // CoinGecko didn't return data for this coin
//         results.set(`cg:${coinId}`, {
//           id: `cg:${coinId}`,
//           error: `Coin ${coinId} not found in CoinGecko response`,
//         });
//       }
//     }
//   } catch (error) {
//     console.error('CoinGecko quote error:', error);
//     // If entire request failed, mark all coins as errors
//     for (const coinId of coinIds) {
//       if (!results.has(`cg:${coinId}`)) {
//         results.set(`cg:${coinId}`, {
//           id: `cg:${coinId}`,
//           error: `CoinGecko API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
//         });
//       }
//     }
//   }

//   return results;
// }

// /**
//  * Fetch price from Funder.co.il by extracting from embedded JSON
//  * @param securityId - TASE security ID (e.g., "5140454")
//  * @returns Object with price and changePct, or null if not found
//  */
// // async function fetchFromFunder(securityId: string): Promise<{ price: number; changePct: number } | null> {
// //   try {
// //     const url = `https://www.funder.co.il/fund/${securityId}`;

// //     const response = await fetchReliable(url, {
// //       timeoutMs: 8000,
// //       retries: 2,
// //       headers: {
// //         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
// //       },
// //     });

// //     if (!response.ok) {
// //       return null;
// //     }

// //     const html = await response.text();

// //     // Extract buyPrice using regex: "buyPrice": 123.45
// //     const priceMatch = html.match(/"buyPrice":\s*([\d\.]+)/);

// //     if (!priceMatch || !priceMatch[1]) {
// //       return null;
// //     }

// //     const price = parseFloat(priceMatch[1]);
// //     if (isNaN(price)) {
// //       return null;
// //     }

// //     // Extract 1-day change percentage: "1day": 0.71 or "1day": -1.23
// //     const changeMatch = html.match(/"1day":\s*([-\d\.]+)/);
// //     const changePct = (changeMatch && changeMatch[1]) ? parseFloat(changeMatch[1]) : 0;

// //     return { price, changePct };
// //   } catch (error) {
// //     console.error(`Funder fetch error for ${securityId}:`, error);
// //     return null;
// //   }
// // }
// // החלף את כל הפונקציה fetchFromFunder בקוד הבא:

// // Define interface for TASE API response structure
// interface TaseApiResponse {
//   Securities?: Array<{
//     SecurityId?: string;
//     ClosingPrice?: number;
//     LastPrice?: number;
//     Price?: number;
//     Change?: number;
//     ChangeRate?: number;
//   }>;
//   Items?: Array<{
//     SecurityId?: string;
//     ClosingPrice?: number;
//     LastPrice?: number;
//     Price?: number;
//     Change?: number;
//     ChangeRate?: number;
//   }>;
//   [key: string]: any;
// }

// async function fetchFromFunder(securityId: string): Promise<{ price: number; changePct: number } | null> {
//   // 1. הדבק כאן את המפתח שתייצר באתר הבורסה (לחיצה על Generate Credential)
//   const TASE_API_KEY = "hTO5g3vYk2kYUmfv1tleI0DBwj9qjLif";

//   // בדיקה שיש מפתח
//   if (!TASE_API_KEY || TASE_API_KEY.includes("הדבק_כאן")) {
//     console.error("[TASE API] Missing API Key. Please generate one at TASE Data Hub.");
//     return null;
//   }

//   console.log(`[TASE API] Fetching data for security: ${securityId}...`);

//   try {
//     // כתובת ה-API של הבורסה לנתוני סוף יום (Basic Data)
//     // שים לב: לפי התיעוד, הפרמטר הוא לפעמים id או securityId
//     const url = `https://shubapi.tase.co.il/api/v1/endofday/securities/data?securityId=${securityId}`;

//     const response = await fetchReliable(url, {
//       timeoutMs: 10000,
//       headers: {
//         // לפי הצילום מסך שלך, סוג האימות הוא "Key Auth"
//         // לרוב שולחים את המפתח בשדה Authorization או apikey
//         'Authorization': `Bearer ${TASE_API_KEY}`,
//         'apikey': TASE_API_KEY,
//         'Content-Type': 'application/json',
//         'Accept-Language': 'he-IL'
//       }
//     });

//     if (!response.ok) {
//       // נסה להדפיס את השגיאה מהבורסה כדי שנבין אם המפתח לא טוב
//       const errText = await response.text();
//       console.error(`[TASE API] Error ${response.status}: ${errText.substring(0, 200)}`);
//       return null;
//     }

//     const data = await response.json() as TaseApiResponse;

//     // לוגיקה לחילוץ המחיר מהתשובה של הבורסה
//     // המבנה לרוב הוא: { "Securities": [ { "SecurityId": "...", "ClosingPrice": 149.59, ... } ] }
//     const item = data.Securities ? data.Securities[0] : (data.Items ? data.Items[0] : data);

//     if (item) {
//       // שים לב: השמות עשויים להיות ClosingPrice / LastPrice / Price
//       const price = item.ClosingPrice || item.LastPrice || item.Price;
//       const changePct = item.Change || item.ChangeRate || 0;

//       if (price) {
//         console.log(`[TASE API] ✅ Success! Price: ${price}`);
//         return { price, changePct };
//       }
//     }

//     console.warn(`[TASE API] Data structure unexpected:`, JSON.stringify(data).substring(0, 200));
//     return null;

//   } catch (error) {
//     console.error("[TASE API] Critical Exception:", error);
//     return null;
//   }
// }

// /**
//  * Fetch stock/ETF/index prices from Yahoo Finance using chart endpoint (v8)
//  * Since quote endpoint returns 401, we derive latest price from chart data
//  */
// async function fetchYahooQuotes(
//   symbols: string[],
//   symbolToIdMap: Map<string, string>
// ): Promise<Map<string, QuoteResult>> {
//   const results = new Map<string, QuoteResult>();

//   if (symbols.length === 0) return results;

//   // Process each symbol individually (chart endpoint doesn't support batching)
//   // Use Promise.all for parallel requests with coalescing
//   const quotePromises = symbols.map(async (symbol) => {
//     const internalId = symbolToIdMap.get(symbol);
//     if (!internalId) {
//       // Fallback: infer ID from symbol format
//       if (symbol.endsWith('.TA') && /^\d+\.TA$/.test(symbol)) {
//         const securityId = symbol.replace('.TA', '');
//         return { symbol, internalId: `tase:${securityId}` };
//       }
//       return { symbol, internalId: `yahoo:${symbol}` };
//     }
//     return { symbol, internalId };
//   });

//   const symbolIdPairs = await Promise.all(quotePromises);

//   // Process symbols in parallel with coalescing
//   const fetchPromises = symbolIdPairs.map(async ({ symbol, internalId }) => {
//     try {
//       // Use coalescing per symbol to dedupe concurrent requests
//       // Try 1m interval with 1d range first (most recent data)
//       const coalesceKey1m = `yahoo_chart_quote:${symbol}:1d:1m`;

//       let response = await fetchWithCoalescing(coalesceKey1m, () => {
//         const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m`;

//         return fetchReliable(url, {
//           timeoutMs: 8000,
//           retries: 2,
//           headers: {
//             'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//             'Accept': 'application/json',
//             'Accept-Language': 'en-US,en;q=0.9',
//           },
//         });
//       });

//       if (!response.ok || response.status >= 400) {
//         // Fallback 1: Try 5m interval with 5d range
//         const coalesceKey5m = `yahoo_chart_quote:${symbol}:5d:5m`;
//         response = await fetchWithCoalescing(coalesceKey5m, () => {
//           const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=5m`;

//           return fetchReliable(url, {
//             timeoutMs: 8000,
//             retries: 2,
//             headers: {
//               'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//               'Accept': 'application/json',
//               'Accept-Language': 'en-US,en;q=0.9',
//             },
//           });
//         });

//         if (!response.ok || response.status >= 400) {
//           // Fallback 2: Try 1d interval with 5d range
//           const coalesceKey1d = `yahoo_chart_quote:${symbol}:5d:1d`;
//           response = await fetchWithCoalescing(coalesceKey1d, () => {
//             const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;

//             return fetchReliable(url, {
//               timeoutMs: 8000,
//               retries: 2,
//               headers: {
//                 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//                 'Accept': 'application/json',
//                 'Accept-Language': 'en-US,en;q=0.9',
//               },
//             });
//           });

//           if (!response.ok || response.status >= 400) {
//             return {
//               internalId,
//               error: `Yahoo Finance API error: HTTP ${response.status}`,
//             };
//           }

//           return await parseChartResponse(response, symbol, internalId, true);
//         }

//         return await parseChartResponse(response, symbol, internalId, false);
//       }

//       return await parseChartResponse(response, symbol, internalId, false);
//     } catch (error) {
//       console.error(`Yahoo chart quote error for ${symbol}:`, error);
//       return {
//         internalId,
//         error: `Yahoo Finance API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
//       };
//     }
//   });

//   const quoteResults = await Promise.all(fetchPromises);

//   // Apply Funder fallback for failed TASE symbols
//   // const funderFallbackPromises = quoteResults.map(async (result) => {
//   //   // Only apply to TASE symbols that failed on Yahoo OR have missing/null/zero price
//   //   if ((result.error || !result.price) && result.internalId?.startsWith('tase:')) {
//   //     const securityId = result.internalId.substring(5);
//   //     const funderData = await fetchFromFunder(securityId);

//   //     if (funderData !== null) {
//   //       return {
//   //         internalId: result.internalId,
//   //         price: funderData.price,
//   //         currency: 'ILS',
//   //         changePct: funderData.changePct,
//   //         timestamp: Date.now(),
//   //         source: 'funder' as const,
//   //       };
//   //     }
//   //   }
//   //   return result;
//   // });

//   // Apply Funder fallback for failed TASE symbols
//   const funderFallbackPromises = quoteResults.map(async (result) => {
//     // בדיקה האם צריך גיבוי: שגיאה או מחיר חסר/0, וגם מזהה שמתחיל ב-tase
//     const needsFallback = (result.error || !result.price) && result.internalId?.startsWith('tase:');

//     if (needsFallback) {
//       const securityId = result.internalId!.substring(5);
//       console.log(`[Fallback DEBUG] Triggering Funder for ${securityId}. Reason: Error=${result.error}, Price=${result.price}`);

//       const funderData = await fetchFromFunder(securityId);

//       if (funderData !== null) {
//         console.log(`[Fallback DEBUG] Replacement successful for ${securityId}`);
//         return {
//           internalId: result.internalId,
//           price: funderData.price,
//           currency: 'ILS',
//           changePct: funderData.changePct,
//           timestamp: Date.now(),
//           source: 'funder' as const,
//         };
//       } else {
//         console.log(`[Fallback DEBUG] Funder returned null for ${securityId}`);
//       }
//     }
//     return result;
//   });

//   const finalResults = await Promise.all(funderFallbackPromises);

//   // Add all results to map
//   for (const result of finalResults) {
//     if (result.internalId) {
//       results.set(result.internalId, {
//         id: result.internalId,
//         price: result.price,
//         currency: result.currency,
//         changePct: result.changePct,
//         timestamp: result.timestamp,
//         source: result.source || 'yahoo',
//         error: result.error,
//       });
//     }
//   }

//   return results;
// }

// /**
//  * Parse Yahoo chart response to extract latest price
//  */
// async function parseChartResponse(
//   response: Response,
//   symbol: string,
//   internalId: string,
//   isDailyFallback: boolean
// ): Promise<Partial<QuoteResult> & { internalId: string }> {
//   try {
//     const data = await fetchJsonSafe(response);

//     // Defensive parsing: ensure chart structure exists
//     if (!data || !data.chart || !Array.isArray(data.chart.result) || data.chart.result.length === 0) {
//       return {
//         internalId,
//         error: `Invalid chart response structure for ${symbol}`,
//       };
//     }

//     const chartResult = data.chart.result[0];
//     if (!chartResult) {
//       return {
//         internalId,
//         error: `No chart data found for ${symbol}`,
//       };
//     }

//     const meta = chartResult.meta || {};
//     const timestamps = chartResult.timestamp || [];
//     const quoteIndicators = chartResult.indicators?.quote?.[0];
//     const closes = quoteIndicators?.close || [];

//     // Extract price according to priority:
//     // 1. meta.regularMarketPrice (preferred)
//     // 2. latest non-null value from indicators.quote[0].close array
//     // 3. meta.previousClose (fallback)
//     let price: number | null = null;
//     let timestamp: number = Date.now();

//     // Priority 1: Use meta.regularMarketPrice if present
//     if (meta.regularMarketPrice !== null && meta.regularMarketPrice !== undefined) {
//       price = meta.regularMarketPrice;
//       if (meta.regularMarketTime) {
//         timestamp = meta.regularMarketTime * 1000;
//       }
//     } else if (closes.length > 0) {
//       // Priority 2: Use latest non-null value from closes array
//       for (let i = closes.length - 1; i >= 0; i--) {
//         if (closes[i] !== null && closes[i] !== undefined) {
//           price = closes[i];
//           if (timestamps[i]) {
//             timestamp = timestamps[i] * 1000; // Convert to milliseconds
//           }
//           break;
//         }
//       }
//     }

//     // Priority 3: Fallback to previousClose if still no price
//     if (price === null || price === undefined) {
//       price = meta.previousClose || null;
//       if (meta.previousClose && meta.regularMarketTime) {
//         timestamp = meta.regularMarketTime * 1000;
//       }
//     }

//     if (price === null || price === undefined) {
//       return {
//         internalId,
//         error: `No price data found for ${symbol}`,
//       };
//     }

//     // Extract currency
//     let currency = meta.currency || (symbol.endsWith('.TA') ? 'ILS' : 'USD');
//     // Normalize ILA -> ILS
//     if (currency === 'ILA') {
//       currency = 'ILS';
//     }

//     // TASE Special Handling: Convert Agorot to Shekels
//     // Apply ONLY to .TA non-index symbols with price > 500
//     if (symbol.endsWith('.TA') && !symbol.startsWith('^') && price > 500) {
//       price = price / 100;
//     }

//     // Calculate change percentage
//     let changePct = 0;
//     const previousClose = meta.regularMarketPreviousClose || meta.previousClose;

//     if (meta.regularMarketChangePercent !== undefined && meta.regularMarketChangePercent !== null) {
//       changePct = meta.regularMarketChangePercent;
//     } else if (previousClose && previousClose > 0) {
//       const adjustedPrevClose = symbol.endsWith('.TA') && !symbol.startsWith('^') && previousClose > 500
//         ? previousClose / 100
//         : previousClose;
//       const change = price - adjustedPrevClose;
//       changePct = (change / adjustedPrevClose) * 100;
//     }

//     return {
//       internalId,
//       price,
//       currency,
//       changePct,
//       timestamp,
//     };
//   } catch (error) {
//     console.error(`Error parsing chart response for ${symbol}:`, error);
//     return {
//       internalId,
//       error: `Failed to parse chart response: ${error instanceof Error ? error.message : 'Unknown error'}`,
//     };
//   }
// }

// /**
//  * Parse IDs from query string (supports both repeated params and comma-separated)
//  */
// function parseIdsFromQuery(query: any): string[] {
//   if (!query.ids) {
//     return [];
//   }

//   // Handle array of IDs: ?ids=id1&ids=id2
//   if (Array.isArray(query.ids)) {
//     return query.ids;
//   }

//   // Handle comma-separated: ?ids=id1,id2,id3
//   if (typeof query.ids === 'string') {
//     return query.ids.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
//   }

//   return [];
// }

// export default async function handler(
//   req: VercelRequest,
//   res: VercelResponse
// ) {
//   // Ensure JSON content-type for all responses
//   res.setHeader('Content-Type', 'application/json');

//   // CORS headers
//   res.setHeader('Access-Control-Allow-Origin', '*');
//   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

//   if (req.method === 'OPTIONS') {
//     return res.status(200).end();
//   }

//   const isGet = req.method === 'GET';
//   const isHead = req.method === 'HEAD';
//   const isPost = req.method === 'POST';

//   if (!isGet && !isHead && !isPost) {
//     return res.status(405).json({ error: 'Method not allowed' });
//   }

//   try {
//     let internalIds: string[] = [];
//     let symbols: string[] | undefined;

//     if (isGet || isHead) {
//       // Parse from query string
//       const queryIds = parseIdsFromQuery(req.query);
//       if (queryIds.length === 0) {
//         if (isHead) {
//           res.status(400).end();
//           return;
//         }
//         return res.status(400).json({ error: 'Query parameter "ids" is required (e.g., ?ids=yahoo:AAPL&ids=cg:bitcoin or ?ids=yahoo:AAPL,cg:bitcoin)' });
//       }
//       internalIds = queryIds;
//     } else if (isPost) {
//       // Parse from body
//       const { ids, symbols: bodySymbols } = req.body;
//       if (!ids && !bodySymbols) {
//         return res.status(400).json({ error: 'Either "ids" or "symbols" must be provided' });
//       }
//       internalIds = ids || [];
//       symbols = bodySymbols;
//     }

//     // Handle symbols in POST (convert to internal IDs)
//     if (symbols) {
//       symbols.forEach((symbol: string) => {
//         if (!internalIds.includes(`yahoo:${symbol}`)) {
//           internalIds.push(`yahoo:${symbol}`);
//         }
//       });
//     }

//     if (internalIds.length === 0) {
//       return res.status(400).json({ error: 'No valid IDs or symbols provided' });
//     }

//     // Separate by provider
//     const coinGeckoIds: string[] = [];
//     const yahooSymbols: string[] = [];
//     const idToSymbolMap = new Map<string, string>();
//     const symbolToIdMap = new Map<string, string>();

//     internalIds.forEach((id) => {
//       const { provider, symbol } = parseId(id);
//       idToSymbolMap.set(id, symbol);
//       symbolToIdMap.set(symbol, id); // Map symbol -> internal ID for result mapping

//       if (provider === 'coingecko') {
//         coinGeckoIds.push(symbol);
//       } else {
//         yahooSymbols.push(symbol);
//       }
//     });

//     // Fetch in parallel
//     const [cryptoResults, yahooResults] = await Promise.all([
//       fetchCoinGeckoQuotes(coinGeckoIds),
//       fetchYahooQuotes(yahooSymbols, symbolToIdMap),
//     ]);

//     // Merge results - ensure every requested ID has a response (success or error)
//     const allResults: QuoteResult[] = [];

//     internalIds.forEach((id) => {
//       const cryptoResult = cryptoResults.get(id);
//       const yahooResult = yahooResults.get(id);

//       if (cryptoResult) {
//         allResults.push(cryptoResult);
//       } else if (yahooResult) {
//         allResults.push(yahooResult);
//       } else {
//         // No result found - return error object
//         allResults.push({
//           id,
//           error: `No data available for ${id}`,
//         });
//       }
//     });

//     // Set cache headers - only for GET/HEAD requests (CDN caching)
//     if (isGet || isHead) {
//       res.setHeader('Cache-Control', 'max-age=0, s-maxage=60, stale-while-revalidate=300');
//       res.setHeader('CDN-Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
//     } else {
//       // POST requests: minimal caching (browser only, no CDN)
//       res.setHeader('Cache-Control', 'no-cache');
//     }

//     // HEAD requests: return headers only, no body
//     if (isHead) {
//       return res.status(200).end();
//     }

//     return res.status(200).json(allResults);
//   } catch (error: any) {
//     console.error('Quote API error:', error);
//     const requestId = req.headers['x-vercel-id'] || req.headers['x-request-id'] || 'unknown';
//     return res.status(500).json({
//       error: 'Internal server error',
//       details: error?.message || 'Unknown error',
//       requestId: String(requestId),
//     });
//   }
// }



























// import type { VercelRequest, VercelResponse } from '@vercel/node';
// import { fetchReliable, fetchJsonSafe, fetchWithCoalescing } from './_utils/http';
// import { getInstrumentBySecurityId } from './_data/taseInstruments';

// interface QuoteResult {
//   id: string;
//   price?: number;
//   currency?: string;
//   changePct?: number;
//   timestamp?: number;
//   source?: 'coingecko' | 'yahoo';
//   error?: string;
// }

// function parseId(id: string): { provider: string; symbol: string } {
//   if (id.startsWith('cg:')) {
//     return { provider: 'coingecko', symbol: id.substring(3) };
//   } else if (id.startsWith('yahoo:')) {
//     return { provider: 'yahoo', symbol: id.substring(6) };
//   } else if (id.startsWith('tase:')) {
//     const securityId = id.substring(5);
//     const inst = getInstrumentBySecurityId(securityId);
//     const symbol = inst?.yahooSymbol ?? `${securityId}.TA`;
//     return { provider: 'yahoo', symbol };
//   }
//   return { provider: 'yahoo', symbol: id };
// }

// async function fetchCoinGeckoQuotes(coinIds: string[]): Promise<Map<string, QuoteResult>> {
//   const results = new Map<string, QuoteResult>();
//   if (coinIds.length === 0) return results;

//   try {
//     const idsString = coinIds.join(',');
//     const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsString}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`;

//     // Low timeout for crypto to keep it snappy
//     const response = await fetchReliable(url, { timeoutMs: 5000, retries: 1 });

//     if (!response.ok) return results;

//     const data = await fetchJsonSafe(response);

//     for (const coinId of coinIds) {
//       const coinData = data[coinId];
//       if (coinData && coinData.usd) {
//         results.set(`cg:${coinId}`, {
//           id: `cg:${coinId}`,
//           price: coinData.usd,
//           currency: 'USD',
//           changePct: coinData.usd_24h_change || 0,
//           timestamp: coinData.last_updated_at ? coinData.last_updated_at * 1000 : Date.now(),
//           source: 'coingecko',
//         });
//       }
//     }
//   } catch (error) {
//     console.error('CoinGecko quote error:', error);
//   }

//   return results;
// }

// async function fetchYahooQuotes(
//   symbols: string[],
//   symbolToIdMap: Map<string, string>
// ): Promise<Map<string, QuoteResult>> {
//   const results = new Map<string, QuoteResult>();
//   if (symbols.length === 0) return results;

//   try {
//     const quotePromises = symbols.map(async (symbol) => {
//       const internalId = symbolToIdMap.get(symbol);
//       return { symbol, internalId: internalId || `yahoo:${symbol}` };
//     });

//     const symbolIdPairs = await Promise.all(quotePromises);

//     // Parallel fetch with coalescing to prevent duplicate requests
//     const fetchPromises = symbolIdPairs.map(async ({ symbol, internalId }) => {
//       try {
//         // Use coalescing per symbol. Try 1m interval for latest data.
//         const response = await fetchWithCoalescing(`yahoo_chart:${symbol}`, () =>
//           fetchReliable(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=1m`, {
//             timeoutMs: 5000,
//             headers: { 'User-Agent': 'Mozilla/5.0' }
//           })
//         );

//         // Defensive: Check response before parsing
//         if (!response || !response.ok) {
//           return {
//             internalId,
//             error: `Yahoo API HTTP error: ${response?.status || 'No response'}`
//           };
//         }

//         return await parseChartResponse(response, symbol, internalId);
//       } catch (error) {
//         // Catch individual symbol errors - don't let one failure crash the batch
//         console.error(`[fetchYahooQuotes] Error for ${symbol}:`, error);
//         return {
//           internalId,
//           error: `Yahoo API error: ${error instanceof Error ? error.message : 'Unknown'}`
//         };
//       }
//     });

//     const finalResults = await Promise.all(fetchPromises);

//     // Map all results (including errors)
//     for (const result of finalResults) {
//       if (result.internalId) {
//         results.set(result.internalId, result as QuoteResult);
//       }
//     }
//   } catch (error) {
//     // Catastrophic error - return error for all requested symbols
//     console.error('[fetchYahooQuotes] Catastrophic error:', error);
//     symbols.forEach((symbol) => {
//       const internalId = symbolToIdMap.get(symbol) || `yahoo:${symbol}`;
//       results.set(internalId, {
//         id: internalId,
//         error: `Batch processing failed: ${error instanceof Error ? error.message : 'Unknown'}`
//       });
//     });
//   }

//   return results;
// }

// async function parseChartResponse(
//   response: Response,
//   symbol: string,
//   internalId: string
// ): Promise<Partial<QuoteResult> & { internalId: string }> {
//   try {
//     // Defensive: Validate response object first
//     if (!response) {
//       return { internalId, error: 'Invalid response object' };
//     }

//     // Defensive: Parse JSON safely
//     let data: any;
//     try {
//       data = await fetchJsonSafe(response);
//     } catch (jsonError) {
//       console.error(`[parseChartResponse] JSON parse error for ${symbol}:`, jsonError);
//       return { internalId, error: 'Failed to parse JSON response' };
//     }

//     // Defensive: Check all levels of nested structure with safe property access
//     if (!data || typeof data !== 'object') {
//       return { internalId, error: 'Invalid data structure' };
//     }

//     if (!data.chart || typeof data.chart !== 'object') {
//       return { internalId, error: 'No chart object in response' };
//     }

//     if (!Array.isArray(data.chart.result)) {
//       return { internalId, error: 'Chart result is not an array' };
//     }

//     if (data.chart.result.length === 0) {
//       return { internalId, error: 'Empty chart result array' };
//     }

//     const result = data.chart.result[0];

//     // Defensive: Validate result object
//     if (!result || typeof result !== 'object') {
//       return { internalId, error: 'Invalid chart result object' };
//     }

//     if (!result.meta || typeof result.meta !== 'object') {
//       return { internalId, error: 'No meta data in chart result' };
//     }

//     const meta = result.meta;

//     // Defensive: Extract price with multiple fallbacks
//     let price: number | null = null;

//     if (typeof meta.regularMarketPrice === 'number' && !isNaN(meta.regularMarketPrice)) {
//       price = meta.regularMarketPrice;
//     } else if (typeof meta.previousClose === 'number' && !isNaN(meta.previousClose)) {
//       price = meta.previousClose;
//     }

//     // Validate price
//     if (price === null || price === undefined || isNaN(price)) {
//       return { internalId, error: 'No valid price found in meta' };
//     }

//     // TASE Special Handling: Convert Agorot to Shekels for stocks > 500
//     // (Ignoring indices starting with ^)
//     if (symbol.endsWith('.TA') && !symbol.startsWith('^') && price > 500) {
//       price = price / 100;
//     }

//     // Defensive: Extract currency with fallback
//     let currency = 'USD';
//     if (typeof meta.currency === 'string' && meta.currency.length > 0) {
//       currency = meta.currency;
//     } else if (symbol.endsWith('.TA')) {
//       currency = 'ILS';
//     }

//     // Normalize ILA to ILS
//     if (currency === 'ILA') currency = 'ILS';

//     // Defensive: Safely handle timestamp
//     let timestamp = Date.now();
//     if (meta.regularMarketTime && typeof meta.regularMarketTime === 'number' && !isNaN(meta.regularMarketTime)) {
//       timestamp = meta.regularMarketTime * 1000;
//     }

//     // Defensive: Safely handle change percentage
//     let changePct = 0;
//     if (typeof meta.regularMarketChangePercent === 'number' && !isNaN(meta.regularMarketChangePercent)) {
//       changePct = meta.regularMarketChangePercent;
//     }

//     return {
//       internalId,
//       price,
//       currency,
//       changePct,
//       timestamp
//     };
//   } catch (error) {
//     // Catch ANY unexpected error and return error object
//     console.error(`[parseChartResponse] Unexpected error for ${symbol}:`, error);
//     return {
//       internalId,
//       error: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`
//     };
//   }
// }

// export default async function handler(
//   req: VercelRequest,
//   res: VercelResponse
// ) {
//   // CRITICAL: Set headers FIRST to ensure they're always sent
//   res.setHeader('Content-Type', 'application/json');
//   res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS

//   if (req.method === 'OPTIONS') return res.status(200).end();

//   // DEBUG LOGGING
//   console.log('[QUOTE API] Request received:', {
//     method: req.method,
//     url: req.url,
//     query: req.query,
//     bodyType: typeof req.body,
//     bodyIsArray: Array.isArray(req.body),
//     bodyKeys: req.body ? Object.keys(req.body) : []
//   });

//   try {
//     // Parse IDs from query - CRITICAL: Handle both array and string formats
//     // When ?ids=A&ids=B is sent, req.query.ids is an ARRAY
//     // When ?ids=A,B is sent, req.query.ids is a STRING
//     let queryIds: string[] = [];

//     if (req.query.ids) {
//       if (Array.isArray(req.query.ids)) {
//         // Multiple params: ?ids=A&ids=B
//         queryIds = req.query.ids.map(id => String(id).trim()).filter(id => id.length > 0);
//       } else if (typeof req.query.ids === 'string') {
//         // Comma-separated: ?ids=A,B
//         queryIds = req.query.ids.split(',').map(id => id.trim()).filter(id => id.length > 0);
//       }
//     }

//     // Support POST body as well
//     const bodyIds = req.body && Array.isArray(req.body.ids) ? req.body.ids : [];

//     const internalIds = [...new Set([...queryIds, ...bodyIds])];

//     console.log('[QUOTE API] Parsed Internal IDs:', {
//       count: internalIds.length,
//       ids: internalIds
//     });

//     if (internalIds.length === 0) {
//       // Return 400 for bad request (this is appropriate)
//       return res.status(400).json({ error: 'No ids provided' });
//     }

//     const coinGeckoIds: string[] = [];
//     const yahooSymbols: string[] = [];
//     const symbolToIdMap = new Map<string, string>();

//     // Defensive: Wrap ID parsing in try-catch
//     try {
//       internalIds.forEach((id) => {
//         const { provider, symbol } = parseId(id);
//         symbolToIdMap.set(symbol, id);

//         if (provider === 'coingecko') {
//           coinGeckoIds.push(symbol);
//         } else {
//           yahooSymbols.push(symbol);
//         }
//       });
//     } catch (parseError) {
//       console.error('[QUOTE API] ID parsing error:', parseError);
//       // Return 200 with error objects for all requested IDs
//       const errorResults = internalIds.map(id => ({ id, error: 'Failed to parse ID' }));
//       return res.status(200).json(errorResults);
//     }

//     // Defensive: Wrap fetching in try-catch
//     let cryptoResults: Map<string, QuoteResult>;
//     let yahooResults: Map<string, QuoteResult>;

//     try {
//       [cryptoResults, yahooResults] = await Promise.all([
//         fetchCoinGeckoQuotes(coinGeckoIds),
//         fetchYahooQuotes(yahooSymbols, symbolToIdMap),
//       ]);
//     } catch (fetchError) {
//       console.error('[QUOTE API] Fetch error:', fetchError);
//       // Return 200 with error objects for all requested IDs
//       const errorResults = internalIds.map(id => ({
//         id,
//         error: `Fetch failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown'}`
//       }));
//       return res.status(200).json(errorResults);
//     }

//     // Combine results ensuring ALL requested IDs get a response (success or error)
//     const allResults = internalIds.map(id => {
//       const cryptoQuote = cryptoResults.get(id);
//       const yahooQuote = yahooResults.get(id);

//       // Return whichever result exists, or an error object if neither
//       return cryptoQuote || yahooQuote || { id, error: 'No data found' };
//     });

//     // Cache for 60 seconds
//     res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

//     // CRITICAL: Always return 200 with data (even if some/all quotes have errors)
//     return res.status(200).json(allResults);

//   } catch (error) {
//     // LAST RESORT: Catastrophic error handler
//     // Log detailed error for debugging
//     console.error('[QUOTE API] CATASTROPHIC ERROR:', {
//       error: error instanceof Error ? error.message : 'Unknown',
//       stack: error instanceof Error ? error.stack : undefined,
//       requestUrl: req.url,
//       method: req.method,
//       body: req.body
//     });

//     // CRITICAL: Return 200 (not 500!) with empty array
//     // This prevents the entire UI from crashing
//     return res.status(200).json([]);
//   }
// }



































import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getInstrumentBySecurityId } from './_data/taseInstruments';

// --- הגדרות מקומיות ---
const TIMEOUT_MS = 3500; // 3.5 שניות גג

async function quickFetch(url: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  
  try {
    const res = await fetch(url, { 
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PortfolioApp/1.0)' }
    });
    clearTimeout(timeoutId);
    return res;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function parseId(id: string): { provider: string; symbol: string } {
  try {
    if (!id) return { provider: 'yahoo', symbol: 'unknown' };
    if (id.startsWith('cg:')) return { provider: 'coingecko', symbol: id.substring(3) };
    if (id.startsWith('yahoo:')) return { provider: 'yahoo', symbol: id.substring(6) };
    if (id.startsWith('tase:')) {
      const securityId = id.substring(5);
      try {
        const inst = getInstrumentBySecurityId(securityId);
        const symbol = inst?.yahooSymbol ?? `${securityId}.TA`;
        return { provider: 'yahoo', symbol };
      } catch (e) {
        return { provider: 'yahoo', symbol: `${securityId}.TA` };
      }
    }
    return { provider: 'yahoo', symbol: id };
  } catch (e) {
    return { provider: 'yahoo', symbol: id };
  }
}

async function fetchYahooQuote(symbol: string, internalId: string): Promise<any> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=1m`;
    const response = await quickFetch(url);

    if (!response.ok) {
      return { id: internalId, error: `Yahoo HTTP ${response.status}` };
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;

    if (!meta) return { id: internalId, error: 'No Yahoo data' };

    let price = meta.regularMarketPrice ?? meta.previousClose;
    
    // המרת אגורות לשקלים
    if (symbol.endsWith('.TA') && !symbol.startsWith('^') && price > 500) {
      price = price / 100;
    }

    return {
      id: internalId,
      price,
      currency: meta.currency === 'ILA' ? 'ILS' : (meta.currency || 'USD'),
      changePct: meta.regularMarketChangePercent || 0,
      timestamp: (meta.regularMarketTime || Date.now() / 1000) * 1000,
      source: 'yahoo'
    };

  } catch (error) {
    return { id: internalId, error: 'Yahoo fetch failed' };
  }
}

async function fetchCoinGeckoQuotes(coinIds: string[]): Promise<any[]> {
  if (coinIds.length === 0) return [];
  try {
    const idsString = coinIds.join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsString}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`;
    const response = await quickFetch(url);
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return coinIds.map(id => {
      const d = data[id];
      if (!d) return { id: `cg:${id}`, error: 'Not found' };
      return {
        id: `cg:${id}`,
        price: d.usd,
        currency: 'USD',
        changePct: d.usd_24h_change || 0,
        timestamp: (d.last_updated_at || Date.now() / 1000) * 1000,
        source: 'coingecko'
      };
    });
  } catch (e) {
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // --- התיקון הקריטי כאן ---
    // מטפל במצב שהפרמטר ids מופיע כמה פעמים ב-URL
    let queryIds: string[] = [];
    if (req.query.ids) {
      if (Array.isArray(req.query.ids)) {
        queryIds = req.query.ids as string[];
      } else {
        queryIds = (req.query.ids as string).split(',');
      }
    }
    
    const bodyIds = req.body && req.body.ids ? req.body.ids : [];
    const rawIds = [...new Set([...queryIds, ...bodyIds])];

    if (rawIds.length === 0) {
      return res.status(400).json({ error: 'No IDs' });
    }

    const tasks = rawIds.map(async (id) => {
      try {
        const { provider, symbol } = parseId(id);
        
        if (provider === 'coingecko') {
          const res = await fetchCoinGeckoQuotes([symbol]);
          return res[0] || { id, error: 'CG Failed' };
        } else {
          return await fetchYahooQuote(symbol, id);
        }
      } catch (e) {
        return { id, error: 'Internal logic error' };
      }
    });

    const results = await Promise.all(tasks);
    
    // מחזיר 200 תמיד כדי לאפשר לקליינט להפעיל את הפרוקסי
    return res.status(200).json(results);

  } catch (criticalError: any) {
    console.error('[API CRASH]', criticalError);
    return res.status(200).json([{ error: 'Server Crash Handled', details: criticalError.message }]);
  }
} 