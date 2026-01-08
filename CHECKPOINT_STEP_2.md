# CHECKPOINT STEP 2 - Yahoo v7 Batch Quote Endpoint

## Files Changed

1. **`api/quote.ts`** (UPDATED)
   - Added import: `getInstrumentBySecurityId` from `_data/taseInstruments.ts`
   - Added import: `fetchWithCoalescing` from `_utils/http.ts`
   - Updated `parseId()`: Now resolves TASE `yahooSymbol` from dataset first, fallback to `${securityId}.TA`
   - Replaced `fetchYahooQuotes()`: 
     - **OLD**: Per-symbol v8 chart endpoint calls (N requests for N symbols)
     - **NEW**: v7 batch quote endpoint (1 request per chunk of up to 50 symbols)
   - Added `symbolToIdMap`: Maps Yahoo symbols back to internal IDs for result mapping
   - Updated cache headers: Added all three Vercel CDN headers

## Implementation Details

### TASE Symbol Resolution
```typescript
// Before: Always assumed `${securityId}.TA`
return { provider: 'yahoo', symbol: `${securityId}.TA` };

// After: Resolves from dataset first
const inst = getInstrumentBySecurityId(securityId);
const symbol = inst?.yahooSymbol ?? `${securityId}.TA`;
```

### Yahoo Batch Endpoint
- **URL**: `https://query1.finance.yahoo.com/v7/finance/quote?symbols=SYM1,SYM2,...`
- **Chunking**: Up to 50 symbols per request (safe limit)
- **Coalescing**: Uses `fetchWithCoalescing` with key `yahoo_quote:${sortedSymbols.join(',')}`
- **Response parsing**: `data.quoteResponse.result[]` array

### Response Field Mapping
- `price`: `r.regularMarketPrice`
- `currency`: `r.currency` (normalized ILA → ILS)
- `changePct`: `r.regularMarketChangePercent` or computed from `(price - prevClose) / prevClose * 100`
- `timestamp`: `r.regularMarketTime * 1000` or `Date.now()`

### TASE Agorot Conversion
- Applied ONLY to `.TA` non-index symbols with `price > 500`
- Converts price: `price / 100`
- Also adjusts `previousClose` for change calculation if needed

### Cache Headers (Vercel CDN)
```typescript
res.setHeader('Cache-Control', 'max-age=0, s-maxage=60, stale-while-revalidate=300');
res.setHeader('CDN-Cache-Control', 'max-age=60, stale-while-revalidate=300');
res.setHeader('Vercel-CDN-Cache-Control', 'max-age=60, stale-while-revalidate=300');
```

## Test Commands (PowerShell)

### Test A: Batch Yahoo (3 symbols = 1 request)
```powershell
curl.exe -X POST "http://localhost:3000/api/quote" `
  -H "Content-Type: application/json" `
  -d '{\"ids\":[\"yahoo:AAPL\",\"yahoo:MSFT\",\"yahoo:^GSPC\"]}'
```

**Expected Response:**
```json
[
  {
    "id": "yahoo:AAPL",
    "price": 175.43,
    "currency": "USD",
    "changePct": 0.52,
    "timestamp": 1704067200000,
    "source": "yahoo"
  },
  {
    "id": "yahoo:MSFT",
    "price": 378.85,
    "currency": "USD",
    "changePct": -0.12,
    "timestamp": 1704067200000,
    "source": "yahoo"
  },
  {
    "id": "yahoo:^GSPC",
    "price": 4783.45,
    "currency": "USD",
    "changePct": 0.23,
    "timestamp": 1704067200000,
    "source": "yahoo"
  }
]
```

**Verification**: Check server logs - should see ONE Yahoo API call, not three.

### Test B: TASE via Dataset Resolution
```powershell
curl.exe -X POST "http://localhost:3000/api/quote" `
  -H "Content-Type: application/json" `
  -d '{\"ids\":[\"tase:1183441\"]}'
```

**Expected Response:**
```json
[
  {
    "id": "tase:1183441",
    "price": 253.20,
    "currency": "ILS",
    "changePct": 0.15,
    "timestamp": 1704067200000,
    "source": "yahoo"
  }
]
```

**Verification**: 
- Dataset lookup should resolve `1183441` → `1183441.TA` (from `taseInstruments.ts`)
- Yahoo API receives symbol `1183441.TA`
- If price > 500 (in agorot), it's divided by 100

### Test C: Crypto (CoinGecko - Unchanged)
```powershell
curl.exe -X POST "http://localhost:3000/api/quote" `
  -H "Content-Type: application/json" `
  -d '{\"ids\":[\"cg:bitcoin\"]}'
```

**Expected Response:**
```json
[
  {
    "id": "cg:bitcoin",
    "price": 43250.50,
    "currency": "USD",
    "changePct": 2.34,
    "timestamp": 1704067200000,
    "source": "coingecko"
  }
]
```

**Verification**: CoinGecko batch logic unchanged, still works.

### Test D: Mixed Batch (Crypto + Yahoo + TASE)
```powershell
curl.exe -X POST "http://localhost:3000/api/quote" `
  -H "Content-Type: application/json" `
  -d '{\"ids\":[\"cg:bitcoin\",\"yahoo:^GSPC\",\"tase:1183441\"]}'
```

**Expected Response:**
```json
[
  {
    "id": "cg:bitcoin",
    "price": 43250.50,
    "currency": "USD",
    "changePct": 2.34,
    "timestamp": 1704067200000,
    "source": "coingecko"
  },
  {
    "id": "yahoo:^GSPC",
    "price": 4783.45,
    "currency": "USD",
    "changePct": 0.23,
    "timestamp": 1704067200000,
    "source": "yahoo"
  },
  {
    "id": "tase:1183441",
    "price": 253.20,
    "currency": "ILS",
    "changePct": 0.15,
    "timestamp": 1704067200000,
    "source": "yahoo"
  }
]
```

**Verification**: 
- CoinGecko: 1 batch request
- Yahoo: 1 batch request (contains both `^GSPC` and `1183441.TA`)
- Total: 2 external API calls (not 3)

## Performance Improvements

### Before (v8 chart endpoint)
- Request: `ids: ["yahoo:AAPL", "yahoo:MSFT", "yahoo:GOOGL"]`
- API calls: **3 separate requests** (even with 10-symbol batching)
- URL pattern: `/v8/finance/chart/{symbol}?interval=1d&range=1d`

### After (v7 batch endpoint)
- Request: `ids: ["yahoo:AAPL", "yahoo:MSFT", "yahoo:GOOGL"]`
- API calls: **1 batch request**
- URL pattern: `/v7/finance/quote?symbols=AAPL,MSFT,GOOGL`

**Result**: ~3x fewer requests for 3 symbols, scales better for larger batches.

## Error Handling

- If Yahoo batch call fails (non-200), chunk is skipped, other chunks continue
- If individual symbol missing from Yahoo response, it's omitted (no crash)
- TASE symbol resolution: Falls back to `${securityId}.TA` if not in dataset
- CoinGecko errors: Returns empty Map (graceful degradation)

## Assumptions

1. **Yahoo v7 Endpoint**: Assumes `/v7/finance/quote` supports comma-separated symbols (verified: yes)
2. **Chunk Size**: 50 symbols per request (safe limit, Yahoo may support more)
3. **TASE Agorot**: Heuristic `price > 500` for `.TA` non-index symbols (consistent with existing code)
4. **Symbol Mapping**: `symbolToIdMap` ensures correct ID mapping even if Yahoo returns symbols in different order

## Build Status

✅ Build successful - no TypeScript errors
✅ No lint errors
✅ All imports resolved correctly

## Next Steps

- STEP 3: Add request coalescing to `/api/history.ts`
- STEP 4: Improve client-side caching in `backendApi.js`

---

**END OF CHECKPOINT STEP 2**
