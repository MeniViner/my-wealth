# CHECKPOINT 1: Current Implementation Status Report

**Date:** Generated after codebase scan  
**Purpose:** Audit of existing `/api` endpoints and client services before refactoring

---

## A) Implementation Status Summary

### `/api/_utils/http.ts` ✅ **COMPLETE**

**Status:** Fully implemented with all required utilities.

**Features:**
- ✅ `fetchWithTimeout` - Timeout support with AbortController
- ✅ `fetchJsonSafe` - HTML error page detection
- ✅ `fetchWithRetry` - Exponential backoff for 429/5xx errors
- ✅ `fetchWithCoalescing` - Request deduplication (global `__inflight` map)
- ✅ `fetchReliable` - Combined utility with all features

**Notes:**
- Uses global `__inflight` Map for coalescing (good for serverless)
- Proper error types: `HttpError`, `TimeoutError`
- Default timeout: 10s, default retries: 3

---

### `/api/search.ts` ⚠️ **INCOMPLETE - TASE Search Missing**

**Status:** Partially implemented. CoinGecko and Yahoo Finance work, but TASE local search is **NOT implemented**.

**Current Implementation:**
- ✅ CoinGecko search (`searchCoinGecko`) - Works
- ✅ Yahoo Finance search (`searchYahooFinance`) - Works
- ❌ **TASE local search (`searchTASEStocks`) - Returns empty array** (line 31-35)
- ✅ Cache headers: `s-maxage=86400, stale-while-revalidate=604800` ✅

**Critical Issues:**

1. **TASE Security Number Search NOT Working:**
   ```typescript
   function searchTASEStocks(query: string): SearchResult[] {
     // We'll need to import the TASE data
     // For now, return empty array - we'll handle this with dynamic import
     return [];  // ❌ ALWAYS RETURNS EMPTY
   }
   ```
   - Comment on line 160-162 says: "TASE search is handled client-side in marketDataService.js"
   - **This means `/api/search?q=1183441` will NOT find TASE ETFs by security number**
   - User must rely on Yahoo Finance, which may not have all TASE instruments

2. **No Dataset Import:**
   - `src/data/taseStocks.ts` exists with ~200+ stocks including ETFs (1183441, 1186063, etc.)
   - But `/api/search.ts` does NOT import or use it
   - Serverless function cannot access client-side TypeScript files without bundling

3. **Numeric Query Handling:**
   - Code detects numeric queries (`isNumeric` check on line 149)
   - But TASE search is skipped (line 160-162)
   - Falls back to Yahoo Finance only, which may not have security-number-based symbols

**What Works:**
- ✅ Crypto search: `q=bitcoin` → returns CoinGecko results
- ✅ Stock search: `q=AAPL` → returns Yahoo Finance results
- ✅ Index search: `q=^GSPC` → returns Yahoo Finance results
- ✅ CORS headers set correctly

**What Doesn't Work:**
- ❌ `q=441` → Will NOT return TASE ETF (Invesco S&P 500)
- ❌ Hebrew queries for TASE stocks → Relies on Yahoo Finance only
- ❌ Partial security number matches → Not supported

---

### `/api/quote.ts` ⚠️ **INEFFICIENT - Uses Chart Endpoint Per Symbol**

**Status:** Works but inefficient. Uses Yahoo chart endpoint instead of batch quote endpoint.

**Current Implementation:**
- ✅ CoinGecko batch: Uses `/simple/price` with comma-separated IDs ✅
- ⚠️ Yahoo Finance: Uses `/v8/finance/chart` endpoint **per symbol** (line 96)
- ✅ TASE ID parsing: `tase:441` → `1183441.TA` ✅
- ✅ Cache headers: `s-maxage=60, stale-while-revalidate=300` ✅
- ✅ Parallel batching: Limits to 10 concurrent requests ✅

**Critical Issues:**

1. **Not Using Yahoo Batch Quote Endpoint:**
   ```typescript
   // Current (line 96): Per-symbol chart endpoint
   const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
   ```
   - **Should use:** `https://query1.finance.yahoo.com/v7/finance/quote?symbols=SYM1,SYM2,...`
   - Current approach makes N requests for N symbols (even with batching)
   - Yahoo v7 quote endpoint supports batch (comma-separated symbols)

2. **TASE Symbol Resolution:**
   - `parseId` function (line 22-34) converts `tase:1183441` → `1183441.TA`
   - **Problem:** Assumes all TASE securities use `{securityNumber}.TA` format
   - **Reality:** Some TASE instruments may have different Yahoo symbols
   - **Missing:** No lookup from local dataset to get actual `yahooSymbol` field

3. **No Dataset Lookup for TASE:**
   - When `tase:1183441` is requested, code directly constructs `1183441.TA`
   - Should first check `taseStocks.ts` to find the actual Yahoo symbol
   - Some TASE instruments may not be on Yahoo Finance at all

**What Works:**
- ✅ Crypto quotes: `cg:bitcoin` → CoinGecko batch ✅
- ✅ Yahoo quotes: `yahoo:^GSPC` → Works (but inefficient)
- ✅ TASE quotes: `tase:1183441` → Attempts `1183441.TA` (may fail if symbol wrong)

**What's Risky:**
- ⚠️ Rate limiting: Making many chart endpoint calls (even batched) is inefficient
- ⚠️ TASE symbol guessing: Assumes `{id}.TA` format without verification
- ⚠️ No fallback: If Yahoo doesn't have the symbol, returns empty (no error message)

---

### `/api/history.ts` ✅ **MOSTLY COMPLETE - Missing Coalescing**

**Status:** Works but missing request coalescing.

**Current Implementation:**
- ✅ CoinGecko history: Uses `/market_chart` endpoint ✅
- ✅ Yahoo history: Uses `/v8/finance/chart` endpoint ✅
- ✅ TASE ID parsing: `tase:1183441` → `1183441.TA` ✅
- ✅ Agorot conversion: Handles TASE price conversion ✅
- ✅ Cache headers: `s-maxage=3600, stale-while-revalidate=86400` ✅
- ❌ **Missing:** Request coalescing (dedupe identical concurrent requests)

**Issues:**

1. **No Request Coalescing:**
   - If 5 users request `history?id=yahoo:^GSPC&range=1mo` simultaneously
   - Function makes 5 separate Yahoo Finance calls
   - Should use `fetchWithCoalescing` from `_utils/http.ts` (but it's not used)

2. **TASE Symbol Resolution (Same as quote.ts):**
   - Assumes `tase:1183441` → `1183441.TA` without dataset lookup
   - May fail for instruments with different Yahoo symbols

**What Works:**
- ✅ Crypto history: `cg:bitcoin` → CoinGecko ✅
- ✅ Stock history: `yahoo:AAPL` → Yahoo Finance ✅
- ✅ TASE history: `tase:1183441` → Attempts Yahoo (may work if symbol exists)

---

### `/api/fx.ts` ⚠️ **RESTRICTED - USD Base Only**

**Status:** Works but artificially restricted to USD base.

**Current Implementation:**
- ✅ ExchangeRate-API: Uses free tier (no API key) ✅
- ✅ Cache headers: `s-maxage=3600, stale-while-revalidate=86400` ✅
- ❌ **Restriction:** Only supports `base=USD` (line 39-45)
   ```typescript
   if (base !== 'USD') {
     return res.status(400).json({ 
       error: 'Only USD base currency is supported',
       message: 'Please use base=USD'
     });
   }
   ```

**Issues:**

1. **Unnecessary Restriction:**
   - ExchangeRate-API v4 supports any base currency: `/v4/latest/{base}`
   - Code could easily support `base=EUR`, `base=GBP`, etc.
   - Current restriction may be intentional (to keep it simple), but limits flexibility

**What Works:**
- ✅ `fx?base=USD&quote=ILS` → Works ✅
- ❌ `fx?base=EUR&quote=ILS` → Returns 400 error (unnecessarily)

---

### `src/services/backendApi.js` ✅ **MOSTLY COMPLETE - Missing Coalescing**

**Status:** Well-implemented client wrapper with IndexedDB caching.

**Current Implementation:**
- ✅ IndexedDB cache integration ✅
- ✅ Cache-first strategy with background refresh ✅
- ✅ Stale cache fallback on API failure ✅
- ✅ Batch handling for quotes (20 per batch) ✅
- ❌ **Missing:** Request coalescing for identical concurrent calls

**What Works:**
- ✅ `searchAssets(q)` → Uses cache, falls back to stale ✅
- ✅ `getQuotes(ids)` → Batches, uses cache per ID ✅
- ✅ `getHistory(id, range, interval)` → Uses cache ✅
- ✅ `getFx(base, quote)` → Uses cache ✅

**What's Missing:**
- ⚠️ If 3 components call `getQuotes(['cg:bitcoin'])` simultaneously
- ⚠️ Makes 3 separate API calls (should coalesce)

---

### `src/data/taseStocks.ts` ✅ **EXISTS BUT INCOMPLETE**

**Status:** Contains ~200+ stocks including some ETFs, but missing type classification.

**Current Structure:**
```typescript
interface TASEStock {
  nameHe: string;
  nameEn: string;
  symbol: string;        // e.g., "1183441.TA"
  securityId: string;    // e.g., "1183441"
  sector: string;         // e.g., "Indices"
}
```

**Found ETFs by Security Number:**
- ✅ `1183441` → Invesco S&P 500 (ILS) - `symbol: "1183441.TA"`
- ✅ `1186063` → Invesco Nasdaq-100 (ILS) - `symbol: "1186063.TA"`
- ✅ `1159250` → iShares S&P 500 (ILS) - `symbol: "1159250.TA"`
- ✅ `1185164` → iShares MSCI World (ILS) - `symbol: "1185164.TA"`

**Issues:**

1. **Missing Type Field:**
   - No `type: 'equity' | 'etf' | 'fund' | 'index'` field
   - All entries use `sector: "Indices"` for ETFs (confusing)
   - Cannot distinguish between equity stocks and ETFs programmatically

2. **Missing Yahoo Symbol Field:**
   - Assumes `symbol` field (e.g., `"1183441.TA"`) is the Yahoo symbol
   - **Reality:** Some TASE instruments may have different Yahoo symbols
   - Should have explicit `yahooSymbol?: string` field

3. **Missing Currency Field:**
   - No explicit `currency: 'ILS' | 'USD'` field
   - Assumes ILS for all TASE instruments (may not be true for foreign ETFs)

4. **Limited Coverage:**
   - Only ~200 stocks
   - Missing many TASE-traded foreign ETFs (e.g., 1206895 mentioned in requirements)
   - Needs expansion for comprehensive coverage

**What Works:**
- ✅ `searchTASEStocks(query)` function exists and works client-side
- ✅ Supports Hebrew, English, symbol, and security ID search
- ✅ Returns up to 20 results

---

## B) Explicit List of Incomplete / Risky / Wrong Items

### 🔴 **CRITICAL - Must Fix**

1. **`/api/search.ts` - TASE Search NOT Implemented**
   - ❌ `searchTASEStocks()` always returns `[]`
   - ❌ Query `q=1183441` will NOT find Invesco S&P 500 ETF
   - ❌ No server-side TASE dataset import
   - **Impact:** Users cannot search Israeli ETFs by security number via API

2. **`/api/quote.ts` - Inefficient Yahoo Batch**
   - ⚠️ Uses chart endpoint per symbol instead of v7 quote batch endpoint
   - ⚠️ Makes N requests for N symbols (even with 10-symbol batching)
   - **Impact:** Slower, more rate-limit prone, inefficient

3. **`/api/quote.ts` - TASE Symbol Guessing**
   - ⚠️ Assumes `tase:1183441` → `1183441.TA` without verification
   - ⚠️ No lookup from `taseStocks.ts` to get actual Yahoo symbol
   - **Impact:** May fail for instruments with different Yahoo symbols

4. **`/api/history.ts` - No Request Coalescing**
   - ⚠️ Identical concurrent requests make duplicate API calls
   - **Impact:** Wastes API quota, slower responses

### 🟡 **MEDIUM - Should Fix**

5. **`taseStocks.ts` - Missing Type Classification**
   - ⚠️ No `type` field to distinguish equity/ETF/fund/index
   - **Impact:** Cannot programmatically filter by asset type

6. **`taseStocks.ts` - Missing Yahoo Symbol Field**
   - ⚠️ Assumes `symbol` field is the Yahoo symbol
   - **Impact:** May fail if Yahoo uses different symbol format

7. **`src/services/backendApi.js` - No Request Coalescing**
   - ⚠️ Identical concurrent client calls make duplicate API requests
   - **Impact:** Wastes bandwidth, slower UI

8. **`/api/fx.ts` - Unnecessary USD Restriction**
   - ⚠️ Could support other base currencies but doesn't
   - **Impact:** Limits flexibility (low priority)

### 🟢 **LOW - Nice to Have**

9. **`taseStocks.ts` - Limited Coverage**
   - ⚠️ Only ~200 stocks, missing some ETFs
   - **Impact:** Some TASE instruments not searchable

---

## C) Specific Answers to Critical Questions

### Q1: Does `search.ts` really support TASE security-number search?

**Answer: ❌ NO**

- `searchTASEStocks()` function exists but returns empty array (line 31-35)
- Comment says "TASE search is handled client-side" (line 160-162)
- Query `q=1183441` will NOT return TASE ETF result
- Falls back to Yahoo Finance only, which may not have all TASE instruments

**Required Fix:**
- Import `taseStocks.ts` dataset (or create server-side version)
- Implement real `searchTASEStocks()` that searches by security ID
- Return `{ id: 'tase:1183441', type: 'etf', ... }` for numeric queries

---

### Q2: Does `quote.ts` batch Yahoo requests or spam chart endpoints?

**Answer: ⚠️ SPAMS CHART ENDPOINTS**

- Uses `/v8/finance/chart` endpoint **per symbol** (line 96)
- Batches to 10 concurrent requests (line 86-91)
- **Does NOT use** Yahoo v7 batch quote endpoint: `/v7/finance/quote?symbols=SYM1,SYM2,...`

**Example:**
- Request: `ids: ['yahoo:AAPL', 'yahoo:MSFT', 'yahoo:GOOGL']`
- Current: Makes 3 separate chart endpoint calls
- Should: Make 1 batch quote endpoint call

**Required Fix:**
- Replace chart endpoint with v7 quote endpoint for batch requests
- Keep chart endpoint only for history (where it's appropriate)

---

### Q3: Does `tase:<securityNo>` correctly resolve to a real tradable symbol for quotes/history?

**Answer: ⚠️ ASSUMES FORMAT WITHOUT VERIFICATION**

**Current Resolution:**
- `tase:1183441` → `1183441.TA` (line 30 in quote.ts, line 31 in history.ts)
- Assumes format `{securityNumber}.TA` for all TASE instruments

**Problems:**
1. **No Dataset Lookup:**
   - Does not check `taseStocks.ts` to verify the symbol exists
   - Does not get actual `yahooSymbol` if different from `{id}.TA`

2. **May Fail:**
   - If Yahoo Finance uses different symbol format → Request fails silently
   - If instrument not on Yahoo Finance → Returns null/empty

3. **No Fallback:**
   - If `1183441.TA` doesn't exist on Yahoo, no alternative strategy

**Required Fix:**
- Lookup `taseStocks.ts` (or server-side dataset) to get actual Yahoo symbol
- Use `yahooSymbol` field if available, fallback to `{id}.TA` if not
- Document fallback strategy clearly

---

## Summary

### ✅ What Works Well
- HTTP utilities (`_utils/http.ts`) - Complete and robust
- CoinGecko integration - Batch support, proper error handling
- Client caching (`backendApi.js`) - IndexedDB integration, stale-while-revalidate
- Cache headers - All endpoints set appropriate CDN caching

### ❌ What Must Be Fixed
1. **TASE search** - Implement server-side dataset import and search
2. **Yahoo batch quotes** - Use v7 quote endpoint instead of chart endpoint
3. **TASE symbol resolution** - Add dataset lookup before constructing symbols

### ⚠️ What Should Be Improved
1. Request coalescing in `history.ts` and `backendApi.js`
2. Type classification in `taseStocks.ts` dataset
3. Expand TASE dataset coverage

---

## Next Steps (After Checkpoint Approval)

1. **STEP 1:** Implement TASE search in `/api/search.ts` with dataset import
2. **STEP 2:** Replace Yahoo chart endpoint with v7 quote batch in `/api/quote.ts`
3. **STEP 3:** Add request coalescing to `/api/history.ts`
4. **STEP 4:** Improve TASE dataset with type/currency/yahooSymbol fields
5. **STEP 5:** Add client-side request coalescing to `backendApi.js`
6. **STEP 6:** Test all endpoints with real examples

---

**END OF CHECKPOINT 1 REPORT**






