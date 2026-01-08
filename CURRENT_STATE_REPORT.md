# Current State Report: Financial Data Architecture Analysis

**Date:** Generated on analysis  
**Project:** my-Wealth (React App on Vercel)  
**Purpose:** Technical audit of data fetching architecture before refactoring

---

## 1. Executive Summary

### Current Data Sources

The application currently fetches financial data from **3 primary external APIs** and uses **1 local JSON database**:

1. **CoinGecko API** - Crypto prices (direct, no proxy needed)
2. **Yahoo Finance API** - Stock/Index prices (via CORS proxies)
3. **ExchangeRate-API** - USD/ILS exchange rates (direct)
4. **Local TASE Stocks Database** (`src/data/taseStocks.ts`) - Israeli stock search data

### Reliability Issues Identified

1. **CORS Proxy Dependencies**: Yahoo Finance requires public CORS proxies (`allorigins.win`, `thingproxy.freeboard.io`, `corsproxy.io`) which are unreliable third-party services
2. **No Retry Logic**: Failed requests return `null` without retries or exponential backoff
3. **Brittle HTML Parsing**: Code attempts to parse HTML error pages when proxies fail
4. **Rate Limiting**: No rate limit handling for CoinGecko or Yahoo Finance
5. **Missing API Keys**: Finnhub API key (`VITE_FINNHUB_API_KEY`) is optional and may not be set in Vercel
6. **Cache Expiration**: In-memory cache expires quickly (1-5 minutes), causing frequent re-fetches

### Local JSON Dependencies

- **`src/data/taseStocks.ts`**: Contains ~200+ Israeli stock listings with Hebrew/English names, symbols, and Security IDs. Used for search autocomplete when Yahoo Finance fails.

### Biggest Risks

1. **CORS Proxy Failure**: If all proxy services fail, Yahoo Finance data becomes unavailable (stocks, indices, Israeli stocks)
2. **CoinGecko Rate Limits**: Free tier has rate limits that could cause failures under heavy load
3. **No Fallback Strategy**: When APIs fail, the UI shows empty/null data without graceful degradation
4. **Client-Side Only**: All API calls are made from the browser, exposing API keys and consuming user bandwidth

---

## 2. Inventory Table

| Source Type | Name | Base URL / File Path | Where Used | Data Type | Reliability Notes |
|------------|------|---------------------|------------|-----------|-------------------|
| **API (Direct)** | CoinGecko | `https://api.coingecko.com/api/v3/` | `src/services/priceService.js`, `src/services/marketDataService.js` | Crypto prices, search | Good - No CORS issues, but rate limits apply |
| **API (Via Proxy)** | Yahoo Finance | `https://query1.finance.yahoo.com/v8/finance/chart/` | `src/services/priceService.js` | Stock/Index prices | **Poor** - Requires CORS proxies, often blocked |
| **API (Via Proxy)** | Yahoo Finance Search | `https://query1.finance.yahoo.com/v1/finance/search` | `src/services/marketDataService.js` | Stock search/autocomplete | **Poor** - Same CORS issues |
| **API (Direct)** | ExchangeRate-API | `https://api.exchangerate-api.com/v4/latest/USD` | `src/services/currency.js` | USD/ILS exchange rate | Good - Reliable, no auth needed |
| **API (Optional)** | Finnhub | `https://finnhub.io/api/v1/` | `src/services/marketDataService.js` | Stock search (fallback) | **Unknown** - Requires `VITE_FINNHUB_API_KEY`, may not be set |
| **CORS Proxy** | allorigins.win | `https://api.allorigins.win/raw?url=` | `src/services/priceService.js`, `src/services/marketDataService.js` | Proxy for Yahoo Finance | **Unreliable** - Third-party service, no SLA |
| **CORS Proxy** | thingproxy.freeboard.io | `https://thingproxy.freeboard.io/fetch/` | `src/services/priceService.js` | Proxy for Yahoo Finance | **Unreliable** - Third-party service, no SLA |
| **CORS Proxy** | corsproxy.io | `https://corsproxy.io/?` | `src/services/marketDataService.js` | Proxy for Yahoo Finance | **Unreliable** - Third-party service, no SLA |
| **Local JSON** | TASE Stocks | `src/data/taseStocks.ts` | `src/services/marketDataService.js` | Israeli stock search data | Static - Needs manual updates, ~200 stocks |

---

## 3. Detailed Findings

### 3.1 CoinGecko API (Crypto)

**Location:** `src/services/priceService.js` (lines 146-238), `src/services/marketDataService.js` (lines 41-79)

**Endpoints Used:**
- `GET /api/v3/simple/price?ids={coinId}&vs_currencies=usd&include_24hr_change=true` - Current prices
- `GET /api/v3/search?query={query}` - Search crypto assets
- `GET /api/v3/coins/{coinId}/history?date={date}` - Historical prices
- `GET /api/v3/coins/{coinId}/market_chart?vs_currency=usd&days={days}` - Price history charts

**Code Example:**
```146:187:src/services/priceService.js
export const fetchCryptoPrice = async (coinId, vsCurrency = 'usd') => {
  if (!coinId) return null;

  const cacheKey = `crypto:${coinId}:${vsCurrency}`;
  const cached = getCachedPrice(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${vsCurrency}&include_24hr_change=true&include_last_updated_at=true`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const coinData = data[coinId];

    if (!coinData) {
      throw new Error(`No data found for ${coinId}`);
    }

    const result = {
      symbol: coinId.toUpperCase(),
      name: coinId,
      currentPrice: coinData[vsCurrency] || 0,
      currency: vsCurrency.toUpperCase(),
      change24h: coinData[`${vsCurrency}_24h_change`] || 0,
      changeAmount: (coinData[vsCurrency] * (coinData[`${vsCurrency}_24h_change`] || 0)) / 100,
      lastUpdated: new Date(coinData.last_updated_at * 1000),
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
```

**Reliability:**
- ✅ No CORS issues (direct fetch)
- ⚠️ Rate limits: Free tier allows ~10-50 calls/minute
- ⚠️ No retry logic on failure
- ⚠️ Returns `null` on error (silent failure)

**Where Used:**
- `src/hooks/useAssets.js` - Fetches prices for crypto assets
- `src/pages/AssetForm.jsx` - Fetches current price when adding crypto
- `src/pages/Dashboard.jsx` - Fetches price history for charts

---

### 3.2 Yahoo Finance API (Stocks/Indices)

**Location:** `src/services/priceService.js` (lines 247-363), `src/services/marketDataService.js` (lines 130-222, 288-377, 425-512)

**Endpoints Used:**
- `GET /v8/finance/chart/{symbol}?interval=1d&range=1d` - Current prices
- `GET /v8/finance/chart/{symbol}?period1={ts}&period2={ts}&interval=1d` - Historical prices
- `GET /v1/finance/search?q={query}&quotesCount=20` - Search/autocomplete

**CORS Proxy Implementation:**
```56:114:src/services/priceService.js
const fetchWithProxy = async (targetUrl) => {
  // List of proxy services to try, in order
  const proxies = [
    {
      name: 'allorigins.win (raw)',
      url: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      parseResponse: async (response) => {
        const text = await response.text();
        return JSON.parse(text);
      }
    },
    {
      name: 'thingproxy.freeboard.io',
      url: (url) => `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(url)}`,
      parseResponse: async (response) => {
        const text = await response.text();
        return JSON.parse(text);
      }
    }
  ];

  let lastError = null;

  // Try each proxy in order
  for (const proxy of proxies) {
    try {
      const proxyUrl = proxy.url(targetUrl);
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        // Attempt to parse to ensure valid JSON before committing to this proxy
        try {
          await proxy.parseResponse(response.clone()); // clone because parse will consume body
          return {
            response,
            proxyUsed: proxy.name,
            parseResponse: proxy.parseResponse
          };
        } catch (parseErr) {
          console.warn(`${proxy.name} returned non-JSON or malformed response, trying next proxy...`);
          // continue to next proxy
        }
      } else {
        console.warn(`${proxy.name} returned ${response.status}, trying next proxy...`);
        lastError = new Error(`${proxy.name}: HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn(`${proxy.name} failed:`, error.message);
      lastError = error;
    }
  }

  // All proxies failed
  console.error('All proxy services failed. Last error:', lastError);
  throw new Error('Proxy fetch failed: Unable to fetch data through available proxies');
};
```

**Reliability Issues:**
- ❌ **CORS Blocked**: Yahoo Finance blocks direct browser requests
- ❌ **Proxy Dependency**: Relies on 3rd-party CORS proxies with no SLA
- ❌ **HTML Error Pages**: When blocked, Yahoo returns HTML instead of JSON, requiring parsing logic
- ⚠️ **No Retry Logic**: If all proxies fail, returns `null` immediately
- ⚠️ **TASE Price Conversion**: Special logic to convert Agorot to Shekels (heuristic-based, can fail)

**TASE Special Handling:**
```292:304:src/services/priceService.js
    // TASE Special Handling: Convert Agorot to Shekels
    // TASE stocks/ETFs are usually quoted in Agorot (100 Agorot = 1 ILS)
    // Yahoo often returns the Agorot value (e.g., 25320) but we want Shekels (253.20)
    // Heuristic: If symbol ends in .TA and price > 500 (5 NIS), it's likely Agorot
    // We also check for explicit 'ILA' currency (Israeli Agorot)
    if (symbol.endsWith('.TA') && !symbol.startsWith('^') && (currency === 'ILA' || currentPrice > 500)) {
      currentPrice = currentPrice / 100;
      currency = 'ILS';
    }

    const previousClose = symbol.endsWith('.TA') && !symbol.startsWith('^') && previousCloseRaw > 500
      ? previousCloseRaw / 100
      : previousCloseRaw;
```

**Where Used:**
- `src/hooks/useAssets.js` - Fetches prices for stocks/indices
- `src/pages/AssetForm.jsx` - Fetches current price when adding stocks
- `src/pages/Dashboard.jsx` - Fetches price history for charts
- `src/services/marketDataService.js` - Search/autocomplete for stocks

---

### 3.3 ExchangeRate-API (Currency)

**Location:** `src/services/currency.js`

**Endpoint:**
- `GET https://api.exchangerate-api.com/v4/latest/USD` - USD to ILS (and other currencies)

**Code:**
```11:26:src/services/currency.js
export const fetchExchangeRate = async () => {
  try {
    const res = await fetch(EXCHANGE_RATE_API_URL);
    if (!res.ok) {
      throw new Error(`Exchange rate API error: ${res.status}`);
    }
    const data = await res.json();
    return { 
      rate: data.rates.ILS, 
      date: data.date || new Date().toISOString().split('T')[0]
    };
  } catch (error) {
    console.error("Failed to fetch exchange rates", error);
    return null;
  }
};
```

**Reliability:**
- ✅ No CORS issues
- ✅ No API key required
- ⚠️ No retry logic
- ✅ Cached in Firebase (per user, per day)

**Where Used:**
- `src/hooks/useCurrency.js` - Fetches and caches exchange rate
- Used throughout app for USD/ILS conversion

---

### 3.4 Finnhub API (Optional Stock Search)

**Location:** `src/services/marketDataService.js` (lines 88-128, 384-422)

**Endpoint:**
- `GET https://finnhub.io/api/v1/search?q={query}&token={apiKey}` - Stock search

**Code:**
```102:128:src/services/marketDataService.js
  const finnhubApiKey = import.meta.env.VITE_FINNHUB_API_KEY;

  if (finnhubApiKey) {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query.trim())}&token=${finnhubApiKey}`
      );

      if (response.ok) {
        const data = await response.json();

        // Map Finnhub results to our format
        const results = (data.result || []).slice(0, 10).map(stock => ({
          id: stock.symbol, // Use symbol as ID for stocks
          symbol: stock.symbol, // Ticker symbol (e.g., "AAPL")
          name: stock.description || stock.symbol, // Company name or symbol
          image: null, // Finnhub doesn't provide images
          marketDataSource: 'finnhub'
        }));

        setCachedResult(cacheKey, results);
        return results;
      }
    } catch (error) {
      console.error('Error searching stocks via Finnhub:', error);
    }
  }
```

**Reliability:**
- ⚠️ **Optional**: Falls back to Yahoo Finance if API key not set
- ⚠️ **May Not Be Configured**: `VITE_FINNHUB_API_KEY` may not exist in Vercel env vars
- ✅ No CORS issues (direct fetch)
- ⚠️ Free tier has rate limits

**Where Used:**
- `src/services/marketDataService.js` - `searchUSStocks()` and `searchStockAssets()` (legacy)

---

### 3.5 Local TASE Stocks Database

**Location:** `src/data/taseStocks.ts`

**Content:**
- ~200+ Israeli stocks with:
  - Hebrew name (`nameHe`)
  - English name (`nameEn`)
  - Ticker symbol (e.g., `POLI.TA`)
  - TASE Security ID
  - Sector classification

**Usage:**
```241:264:src/services/marketDataService.js
  // Try local TASE stocks database first (supports Hebrew, Security IDs, symbols, English names)
  try {
    const { searchTASEStocks } = await import('../data/taseStocks');
    const localResults = searchTASEStocks(query);

    if (localResults.length > 0) {
      // Map local results to our format
      const results = localResults.map(stock => ({
        id: stock.symbol, // Use symbol as ID
        symbol: stock.symbol, // Ticker symbol (e.g., "POLI.TA")
        name: `${stock.nameHe} (${stock.symbol})`, // Hebrew name + symbol for display
        nameHe: stock.nameHe, // Hebrew name
        nameEn: stock.nameEn, // English name
        securityId: stock.securityId, // TASE Security ID
        image: null,
        marketDataSource: 'tase-local'
      }));

      setCachedResult(cacheKey, results);
      return results;
    }
  } catch (error) {
    console.warn('Failed to load TASE stocks database:', error);
  }
```

**Why It Exists:**
- Provides Hebrew search support (Yahoo Finance search doesn't support Hebrew well)
- Faster than API calls for common Israeli stocks
- Works offline/without network
- Includes Security IDs for direct TASE lookups

**Replacement Strategy:**
- Could be replaced with a TASE API if one exists
- Or kept as a fallback/cache layer
- Needs periodic manual updates to stay current

---

## 4. Data Flow & UI Wiring

### 4.1 Price Fetching Flow

**Component:** `src/hooks/useAssets.js`

**Flow:**
```
1. User logs in → useAssets hook initializes
2. Firestore snapshot listener → rawAssets updated
3. useEffect triggers → refreshPrices() called
4. fetchAssetPricesBatch() → Separates crypto vs stocks
5. Parallel fetch:
   - fetchCryptoPricesBatch() → CoinGecko API
   - fetchYahooPricesBatch() → Yahoo Finance (via proxy)
6. Results merged → livePrices state updated
7. useEffect recalculates → assets array with values
8. Dashboard/UI re-renders with new prices
```

**Code:**
```101:124:src/hooks/useAssets.js
  // Fetch live prices for all trackable assets
  const refreshPrices = useCallback(async () => {
    if (rawAssets.length === 0) return;

    // Filter assets that can have live prices
    const trackableAssets = rawAssets.filter(asset => 
      asset.assetMode === 'QUANTITY' && 
      asset.marketDataSource && 
      asset.marketDataSource !== 'manual' &&
      (asset.apiId || asset.symbol)
    );

    if (trackableAssets.length === 0) return;

    setPricesLoading(true);
    try {
      const prices = await fetchAssetPricesBatch(trackableAssets);
      setLivePrices(prices);
      setLastPriceUpdate(new Date());
    } catch (error) {
      console.error('Error fetching live prices:', error);
    }
    setPricesLoading(false);
  }, [rawAssets]);
```

**Auto-Refresh:**
- Initial fetch when assets load
- Auto-refresh every 5 minutes (line 147)
- Manual refresh via `refreshPrices()` function

---

### 4.2 Search Flow (Asset Form)

**Component:** `src/pages/AssetForm.jsx` → `src/components/TickerSearch.jsx`

**Flow:**
```
1. User types in search box
2. TickerSearch component → calls searchAssets(query, assetType)
3. marketDataService.searchAssets() → routes to:
   - searchCryptoAssets() → CoinGecko
   - searchUSStocks() → Finnhub (if key exists) → Yahoo Finance (fallback)
   - searchIsraeliStocks() → Local TASE DB → Yahoo Finance (fallback)
   - searchIndices() → Local POPULAR_INDICES → Yahoo Finance (fallback)
4. Results displayed in dropdown
5. User selects → AssetForm populates fields
```

**Search Priority (Israeli Stocks):**
1. Local TASE database (`taseStocks.ts`)
2. Direct symbol entry (if `.TA` suffix or numeric ID)
3. Yahoo Finance search (via CORS proxy)

---

### 4.3 Historical Price Chart Flow

**Component:** `src/pages/Dashboard.jsx` (lines 517-598)

**Flow:**
```
1. User selects time range (7d, 30d, 90d, 1y)
2. useEffect triggers → fetchPriceHistory() for each asset
3. Parallel fetch:
   - CoinGecko: /market_chart endpoint
   - Yahoo Finance: /v8/finance/chart with range parameter
4. Prices converted to ILS if needed
5. Multiplied by quantity → asset value over time
6. Aggregated by date → portfolio total value
7. Chart renders with Recharts
```

**Code:**
```517:545:src/pages/Dashboard.jsx
        // Fetch price history for each asset
        const assetHistories = await Promise.all(
          trackableAssets.map(async (asset) => {
            try {
              const symbol = asset.apiId || asset.symbol;
              const source = asset.marketDataSource === 'coingecko' ? 'coingecko' : 'yahoo';

              const priceHistory = await fetchPriceHistory(symbol, source, days);

              if (!priceHistory || priceHistory.length === 0) {
                return null;
              }

              // Convert prices to ILS if needed and multiply by quantity
              return priceHistory.map(({ date, price }) => {
                const priceInILS = asset.currency === 'USD' ? price * rate : price;
                const assetValue = asset.quantity * priceInILS;
                return {
                  date: date.toISOString().split('T')[0],
                  timestamp: new Date(date).getTime(),
                  value: assetValue
                };
              });
            } catch (error) {
              console.error(`Error fetching history for ${asset.name}:`, error);
              return null;
            }
          })
        );
```

---

### 4.4 Caching Strategy

**In-Memory Cache (priceService.js):**
- Price cache: 1 minute TTL (line 10)
- History cache: 5 minutes TTL (line 11)
- Search cache: 5 minutes TTL (`marketDataService.js`, line 8)

**Firebase Cache (currency.js):**
- Exchange rate cached per user, per day
- Stored in: `artifacts/{appId}/users/{uid}/settings/currencyRate`

**localStorage:**
- Wealth visibility preference
- Demo data (if in demo mode)

**No Persistent Cache:**
- Prices are not cached to localStorage or IndexedDB
- Every page refresh requires new API calls

---

## 5. Reliability Issues: Why It "Sometimes Doesn't Work"

### 5.1 CORS Proxy Failures

**Issue:** Yahoo Finance blocks direct browser requests, requiring CORS proxies.

**Failure Modes:**
1. **All proxies down**: `fetchWithProxy()` throws error, returns `null`
2. **Proxy returns HTML**: Yahoo Finance returns HTML error page instead of JSON
3. **Proxy timeout**: No timeout set, request hangs indefinitely
4. **Proxy rate limiting**: Third-party proxies may rate limit requests

**Code Location:**
- `src/services/priceService.js:56-114` (fetchWithProxy)
- `src/services/marketDataService.js:136-154` (search fallback)

**How to Reproduce:**
1. Block `allorigins.win` and `thingproxy.freeboard.io` in browser
2. Try to add a stock or view dashboard
3. Prices will be `null`, UI shows empty/zero values

**UI Manifestation:**
- Asset values show as 0 or original purchase price
- Charts show "No data" message
- Search returns empty results

---

### 5.2 Missing API Keys

**Issue:** `VITE_FINNHUB_API_KEY` is optional and may not be set in Vercel.

**Failure Mode:**
- Finnhub search skipped, falls back to Yahoo Finance (which also fails due to CORS)

**Code Location:**
- `src/services/marketDataService.js:102`, `396`

**How to Reproduce:**
1. Check Vercel environment variables
2. If `VITE_FINNHUB_API_KEY` is missing, US stock search uses Yahoo Finance only

**UI Manifestation:**
- Search may return fewer results or fail entirely

---

### 5.3 CoinGecko Rate Limiting

**Issue:** Free tier has rate limits (~10-50 calls/minute).

**Failure Mode:**
- API returns 429 (Too Many Requests)
- Code returns `null` without retry

**Code Location:**
- `src/services/priceService.js:146-187` (fetchCryptoPrice)

**How to Reproduce:**
1. Add 50+ crypto assets
2. Refresh prices rapidly
3. Some prices will fail to fetch

**UI Manifestation:**
- Some crypto assets show old prices or zero values

---

### 5.4 No Retry Logic

**Issue:** All API calls return `null` on first failure, no retries.

**Code Pattern:**
```javascript
try {
  const response = await fetch(url);
  if (!response.ok) throw new Error();
  return data;
} catch (error) {
  console.error('Error:', error);
  return null; // ❌ No retry
}
```

**Locations:**
- `src/services/priceService.js` - All fetch functions
- `src/services/marketDataService.js` - All search functions
- `src/services/currency.js` - Exchange rate fetch

**Impact:**
- Transient network errors cause permanent failures
- User must manually refresh to retry

---

### 5.5 HTML Error Page Parsing

**Issue:** When Yahoo Finance blocks requests, it returns HTML instead of JSON.

**Code:**
```120:136:src/services/priceService.js
const parseProxyResponse = async (response, parseResponseFn) => {
  try {
    // Use the proxy-specific parser
    const data = await parseProxyResponse(response, parseResponseFn);

    // Check if data looks like an HTML error
    if (typeof data === 'string' && (data.trim().startsWith('<!DOCTYPE') || data.trim().startsWith('<html'))) {
      console.warn('Received HTML instead of JSON - likely blocked by Yahoo Finance');
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error parsing proxy response:', error);
    return null;
  }
};
```

**Failure Mode:**
- Proxy returns HTML error page
- Code tries to parse as JSON, fails
- Returns `null`

**Impact:**
- Stock prices fail silently
- No user-facing error message

---

### 5.6 TASE Price Conversion Heuristic

**Issue:** Israeli stocks are quoted in Agorot (100 = 1 ILS), but conversion is heuristic-based.

**Code:**
```297:304:src/services/priceService.js
    if (symbol.endsWith('.TA') && !symbol.startsWith('^') && (currency === 'ILA' || currentPrice > 500)) {
      currentPrice = currentPrice / 100;
      currency = 'ILS';
    }

    const previousClose = symbol.endsWith('.TA') && !symbol.startsWith('^') && previousCloseRaw > 500
      ? previousCloseRaw / 100
      : previousCloseRaw;
```

**Failure Mode:**
- If stock price is < 5 ILS (500 Agorot), conversion may not trigger
- If stock price is > 5 ILS but already in Shekels, it gets divided incorrectly

**Impact:**
- Some Israeli stocks show incorrect prices (10x too high or too low)

---

### 5.7 No Timeout Handling

**Issue:** `fetch()` calls have no timeout, can hang indefinitely.

**Impact:**
- User waits forever for prices to load
- No feedback that request is stuck

---

## 6. Recommendations (Implementation Plan)

### 6.1 Target Architecture

**Proposed Data Layer Structure:**
```
┌─────────────────────────────────────────┐
│         React Frontend (Vercel)          │
│  - useAssets, useCurrency hooks         │
│  - Dashboard, AssetForm components      │
└──────────────┬──────────────────────────┘
               │
               │ HTTP Requests
               ▼
┌─────────────────────────────────────────┐
│    Vercel Serverless Functions         │
│  ┌─────────────────────────────────┐  │
│  │ /api/prices (proxy)             │  │
│  │ - CoinGecko                     │  │
│  │ - Yahoo Finance (no CORS)       │  │
│  │ - Retry logic                   │  │
│  │ - Rate limiting                 │  │
│  │ - Caching (Vercel KV/Redis)     │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ /api/search (proxy)             │  │
│  │ - CoinGecko                     │  │
│  │ - Yahoo Finance                 │  │
│  │ - TASE API (if available)       │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ /api/exchange-rate              │  │
│  │ - ExchangeRate-API             │  │
│  │ - Cache in Vercel KV           │  │
│  └─────────────────────────────────┘  │
└─────────────────────────────────────────┘
               │
               │ Direct API Calls
               ▼
┌─────────────────────────────────────────┐
│      External APIs                      │
│  - CoinGecko                            │
│  - Yahoo Finance                        │
│  - ExchangeRate-API                    │
└─────────────────────────────────────────┘
```

### 6.2 Implementation Steps

#### Phase 1: Create Vercel Functions Proxy

**Files to Create:**
- `api/prices/index.js` - Proxy for price fetching
- `api/search/index.js` - Proxy for asset search
- `api/exchange-rate/index.js` - Proxy for exchange rates

**Benefits:**
- ✅ No CORS issues (server-side requests)
- ✅ API keys hidden from client
- ✅ Can implement retry logic
- ✅ Can implement rate limiting
- ✅ Can cache responses (Vercel KV or Redis)

#### Phase 2: Centralized Error Handling

**Create:** `src/services/apiClient.js`
- Wrapper around fetch with:
  - Exponential backoff retry (3 attempts)
  - Timeout (10 seconds)
  - Error logging
  - Fallback strategies

#### Phase 3: Replace CORS Proxies

**Remove:**
- `fetchWithProxy()` function
- All CORS proxy URLs
- HTML parsing logic

**Replace with:**
- Direct calls to Vercel Functions
- Functions make server-side requests (no CORS)

#### Phase 4: Enhanced Caching

**Implement:**
- Vercel KV for server-side caching (1 hour TTL for prices)
- Client-side cache with longer TTL (5-10 minutes)
- Cache invalidation on manual refresh

#### Phase 5: TASE Stocks Migration

**Options:**
1. **Keep as fallback**: Keep `taseStocks.ts` as offline/search fallback
2. **Move to API**: If TASE API exists, fetch from there
3. **Hybrid**: Use local DB for search, API for prices

**Recommendation:** Keep as fallback, but add API endpoint if available.

#### Phase 6: Monitoring & Alerts

**Add:**
- Error tracking (Sentry or similar)
- API health checks
- Rate limit monitoring
- User-facing error messages (not just console.log)

### 6.3 Code Structure Proposal

```
src/
  services/
    apiClient.js          # NEW: Centralized fetch wrapper
    priceService.js       # MODIFY: Call Vercel Functions instead of direct APIs
    marketDataService.js # MODIFY: Call Vercel Functions instead of direct APIs
    currency.js          # MODIFY: Call Vercel Functions instead of direct API

api/
  prices/
    index.js            # NEW: Vercel Function for price fetching
  search/
    index.js            # NEW: Vercel Function for asset search
  exchange-rate/
    index.js            # NEW: Vercel Function for exchange rates
```

### 6.4 Environment Variables Needed

**Vercel Environment Variables:**
- `COINGECKO_API_KEY` (optional, for higher rate limits)
- `FINNHUB_API_KEY` (optional, for stock search)
- `VERCEL_KV_REST_API_URL` (for caching)
- `VERCEL_KV_REST_API_TOKEN` (for caching)

**Remove from Client:**
- `VITE_FINNHUB_API_KEY` (move to server-side only)

### 6.5 Migration Strategy

1. **Week 1**: Create Vercel Functions, test locally
2. **Week 2**: Deploy functions, update client to use them
3. **Week 3**: Remove CORS proxy code, add retry logic
4. **Week 4**: Add caching, monitoring, error handling
5. **Week 5**: Test, optimize, document

### 6.6 Risk Mitigation

**Backward Compatibility:**
- Keep old code paths as fallback initially
- Feature flag to switch between old/new architecture
- Gradual rollout (10% → 50% → 100% of users)

**Testing:**
- Unit tests for API client
- Integration tests for Vercel Functions
- E2E tests for price fetching flow

---

## 7. File Reference Summary

### Key Files for Data Fetching

| File | Purpose | Lines of Interest |
|------|---------|------------------|
| `src/services/priceService.js` | Price fetching (crypto + stocks) | 1-736 |
| `src/services/marketDataService.js` | Asset search/autocomplete | 1-688 |
| `src/services/currency.js` | Exchange rate fetching | 1-27 |
| `src/hooks/useAssets.js` | Asset management + price refresh | 1-224 |
| `src/hooks/useCurrency.js` | Currency rate management | 1-73 |
| `src/pages/Dashboard.jsx` | Price history charts | 517-598 |
| `src/pages/AssetForm.jsx` | Asset creation with price lookup | 394-500 |
| `src/data/taseStocks.ts` | Local Israeli stocks database | 1-918 |

### Files Using Data Services

- `src/App.jsx` - Main app, uses `useAssets`, `useCurrency`
- `src/pages/DynamicDashboard.jsx` - Uses `useAssets` for asset data
- `src/components/TickerSearch.jsx` - Uses `marketDataService` for search
- `src/components/ChartRenderer.jsx` - Uses `priceService` for chart data

---

## 8. Conclusion

The current architecture is **functional but fragile** due to:

1. **CORS proxy dependencies** (biggest risk)
2. **No retry logic** (transient failures become permanent)
3. **Client-side API calls** (exposes keys, consumes bandwidth)
4. **Brittle error handling** (silent failures)

**Recommended Next Steps:**
1. Create Vercel Functions as backend proxy
2. Implement retry logic and error handling
3. Add server-side caching
4. Remove CORS proxy dependencies
5. Add monitoring and user-facing error messages

This refactoring will significantly improve reliability and user experience.

---

**Report Generated:** Analysis of codebase  
**Analyst:** Cursor AI (Senior Full-Stack Engineer + Code Archaeologist)  
**Status:** Ready for implementation planning
