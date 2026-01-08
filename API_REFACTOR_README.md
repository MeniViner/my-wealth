# API Refactor - Data Layer Documentation

## סקירה כללית

הפרויקט עבר רפקטורינג מלא של שכבת הנתונים כדי לפתור בעיות CORS ולשפר את האמינות. כל הקריאות ל-APIs חיצוניים עברו ל-Vercel Serverless Functions, והקוד משתמש ב-IndexedDB ל-caching מתמשך.

## ארכיטקטורה

### Vercel Functions (`/api`)

כל ה-endpoints נמצאים בתיקיית `/api`:

1. **`/api/search.ts`** - חיפוש מאוחד של נכסים (crypto, stocks, ETFs, indices)
2. **`/api/quote.ts`** - קבלת מחירים נוכחיים (POST עם ids או symbols)
3. **`/api/history.ts`** - נתוני היסטוריה לגרפים (GET עם id, range, interval)
4. **`/api/fx.ts`** - שערי חליפין (GET עם base ו-quote)

### Utilities (`/api/_utils/http.ts`)

ספריית עזר משותפת עם:
- `fetchWithTimeout` - timeout אוטומטי
- `fetchJsonSafe` - זיהוי דפי HTML שגיאה
- `fetchWithRetry` - retry עם exponential backoff
- `fetchWithCoalescing` - מניעת בקשות כפולות

### Client Services

- **`src/services/backendApi.js`** - Wrapper ל-Vercel Functions עם caching
- **`src/utils/indexedDbCache.js`** - IndexedDB cache module
- **`src/services/priceService.js`** - עודכן להשתמש ב-backendApi
- **`src/services/marketDataService.js`** - עודכן להשתמש ב-backendApi
- **`src/services/currency.js`** - עודכן להשתמש ב-backendApi

## Caching Strategy

### CDN Caching (Vercel)
- **Quotes**: `s-maxage=60, stale-while-revalidate=300` (1 דקה + 5 דקות stale)
- **Search**: `s-maxage=86400, stale-while-revalidate=604800` (24 שעות + שבוע stale)
- **History**: `s-maxage=3600, stale-while-revalidate=86400` (שעה + יום stale)
- **FX**: `s-maxage=3600, stale-while-revalidate=86400` (שעה + יום stale)

### IndexedDB Cache (Client)
- **Search**: 24 שעות
- **Quotes**: 5 דקות
- **History**: שעה
- **FX**: שעה

האפליקציה תמיד:
1. קוראת מ-cache קודם (instant response)
2. מעדכנת ב-background
3. אם ה-provider נכשל, משתמשת ב-cache עם `isStale=true`

## Internal ID Format

כל נכס מקבל ID פנימי יציב:
- **Crypto**: `cg:bitcoin`
- **Yahoo Finance**: `yahoo:^GSPC` או `yahoo:AAPL`
- **TASE**: `tase:1183441` (security number)

## Environment Variables

אין צורך ב-environment variables חדשים. ה-API base URL הוא `/api` (default) או ניתן להגדיר:
```env
VITE_API_BASE=/api
```

## Local Development

### התקנת תלויות
```bash
yarn install
```

### הרצה מקומית
```bash
yarn dev
```

Vercel Functions יעבדו אוטומטית דרך Vite dev server.

### בדיקת API Endpoints

```bash
# Search
curl "http://localhost:3000/api/search?q=bitcoin"

# Quote (POST)
curl -X POST http://localhost:3000/api/quote \
  -H "Content-Type: application/json" \
  -d '{"ids": ["cg:bitcoin", "yahoo:^GSPC"]}'

# History
curl "http://localhost:3000/api/history?id=cg:bitcoin&range=1mo&interval=1d"

# FX
curl "http://localhost:3000/api/fx?base=USD&quote=ILS"
```

## Deployment

### Vercel

הפרויקט מוכן ל-deployment ב-Vercel:
1. כל ה-Functions ב-`/api` יזוהו אוטומטית
2. CDN caching יעבוד אוטומטית
3. אין צורך בהגדרות נוספות

### Environment Variables (Production)

אין צורך ב-environment variables חדשים. כל ה-APIs הם חינמיים ואינם דורשים API keys.

## Breaking Changes

### Removed
- כל השימוש ב-CORS proxies (corsproxy.io, allorigins.win, thingproxy.freeboard.io)
- קריאות ישירות ל-CoinGecko, Yahoo Finance, ExchangeRate-API מהקליינט

### Backward Compatibility
- כל ה-functions הקיימים (`fetchCryptoPrice`, `fetchYahooPrice`, `searchAssets`, וכו') עדיין עובדים
- ה-API שלהם לא השתנה, רק ה-implementation הפנימי

## Performance Improvements

1. **No CORS delays** - כל הקריאות הן server-side
2. **Better caching** - IndexedDB + CDN caching
3. **Request coalescing** - בקשות זהות חולקות אותה promise
4. **Retry logic** - retry אוטומטי על 429/5xx errors
5. **Stale-while-revalidate** - האפליקציה תמיד זמינה גם אם ה-provider נכשל

## Troubleshooting

### Functions לא עובדות מקומית
- ודא ש-Vercel CLI מותקן (אופציונלי)
- Vite dev server צריך לטפל ב-`/api/*` routes

### Cache לא עובד
- בדוק ש-IndexedDB נתמך בדפדפן
- פתח DevTools > Application > IndexedDB > WealthCache

### שגיאות CORS
- אם עדיין רואים שגיאות CORS, ודא שכל הקריאות עוברות דרך `/api/*`

## Testing

לבדיקה מקומית, ניתן להשתמש ב-script הבא:

```javascript
// test-api.js
const testSearch = async () => {
  const res = await fetch('http://localhost:3000/api/search?q=bitcoin');
  console.log(await res.json());
};

const testQuote = async () => {
  const res = await fetch('http://localhost:3000/api/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: ['cg:bitcoin', 'yahoo:^GSPC'] })
  });
  console.log(await res.json());
};

testSearch();
testQuote();
```

## Support

לשאלות או בעיות, בדוק:
1. Console logs ב-browser DevTools
2. Vercel Function logs (אם deployed)
3. Network tab ב-DevTools לבדיקת קריאות API
