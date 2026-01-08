# Deployment Verification Checklist

## סקירה כללית

מסמך זה מסכם את תהליך הבדיקה והתיקון של Vercel Functions (`/api/*`) בפרויקט.

---

## CHECKPOINT A — Repo Sanity ✅

### מה נבדק:
- ✅ `package.json` קיים
- ✅ `src/` קיים
- ✅ `api/` קיים עם כל הקבצים הנדרשים:
  - `search.ts`
  - `quote.ts`
  - `history.ts`
  - `fx.ts`
  - `health.ts` (נוצר)
  - `_data/taseInstruments.ts`
  - `_utils/http.ts`
  - `tsconfig.json`

### Git Status:
- ✅ כל הקבצים ב-`api/` tracked ב-git

---

## CHECKPOINT B — Local Verification ⚠️

### שינויים:
- ✅ נוצר `api/health.ts` — endpoint פשוט לבדיקה

**Diff:**
```typescript
+ /**
+  * Health check endpoint
+  * Returns 200 OK to verify API routes are working
+  */
+ 
+ import type { VercelRequest, VercelResponse } from '@vercel/node';
+ 
+ export default async function handler(
+   req: VercelRequest,
+   res: VercelResponse
+ ) {
+   // CORS headers
+   res.setHeader('Access-Control-Allow-Origin', '*');
+   res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
+   res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
+ 
+   if (req.method === 'OPTIONS') {
+     return res.status(200).end();
+   }
+ 
+   return res.status(200).json({ ok: true, timestamp: Date.now() });
+ }
```

### בדיקות מקומיות:

**הערה:** Vite dev server (`npm run dev`) לא תומך ב-serverless functions. צריך להשתמש ב-`vercel dev` לבדיקה מקומית.

**PowerShell Commands:**
```powershell
# 1. התחל vercel dev (בטרמינל נפרד)
cd "C:\Users\MeniV\OneDrive - click\Desktop\personal\projects\personal projects\my-wallet-pro\my-Wealth"
vercel dev --listen 3000

# 2. במיקום אחר, הרץ את הבדיקות:
curl.exe -i "http://localhost:3000/api/health"
curl.exe -i "http://localhost:3000/api/search?q=1183441"
curl.exe -i "http://localhost:3000/api/quote?ids=yahoo:AAPL"
curl.exe -i "http://localhost:3000/api/history?id=yahoo:AAPL&range=1mo&interval=1d"
```

**תוצאות צפויות:**
- ✅ `HTTP/1.1 200 OK` לכל ה-endpoints
- ✅ JSON response עם נתונים

---

## CHECKPOINT C — Production Verification ⚠️

### Production URL:
- **Aliased:** `https://my-wealth-orcin.vercel.app`
- **Latest:** `https://my-wealth-4wbwyngjm-meni-vners-projects.vercel.app`

### PowerShell Commands לבדיקת Production:

```powershell
# 1. Health check
curl.exe -i "https://my-wealth-orcin.vercel.app/api/health"

# 2. Search
curl.exe -i "https://my-wealth-orcin.vercel.app/api/search?q=1183441"

# 3. Quote
curl.exe -i "https://my-wealth-orcin.vercel.app/api/quote?ids=yahoo:AAPL"

# 4. Quote with cache headers check (ריץ פעמיים לבדיקת cache)
curl.exe -I "https://my-wealth-orcin.vercel.app/api/quote?ids=yahoo:AAPL"
# ריץ שוב מיד:
curl.exe -I "https://my-wealth-orcin.vercel.app/api/quote?ids=yahoo:AAPL"

# 5. History
curl.exe -i "https://my-wealth-orcin.vercel.app/api/history?id=yahoo:AAPL&range=1mo&interval=1d"
```

### Status Codes צפויים:

| Status Code | משמעות | פעולה |
|------------|---------|-------|
| **200 OK** | ✅ Function עובד | הכל תקין |
| **404 Not Found** | ❌ Function לא מזוהה | בדוק Root Directory ב-Vercel Dashboard |
| **401 Unauthorized** | ⚠️ בעיית auth/headers | בדוק CORS headers |
| **500 Internal Server Error** | ⚠️ שגיאת runtime | בדוק logs ב-Vercel Dashboard |

### תוצאות נוכחיות:
- ❌ כל ה-endpoints מחזירים **404 Not Found**
- ❌ `X-Vercel-Error: NOT_FOUND`

---

## CHECKPOINT D — Fix Deployment Detection ⚠️

### שינויים שבוצעו:

1. **נוצר `vercel.json`:**
```json
{
  "rewrites": [
    {
      "source": "/((?!api).*)",
      "destination": "/index.html"
    }
  ]
}
```

**הסבר:** ה-rewrite rule מבטיח ש-`/api/*` לא יועבר ל-`/index.html`, אבל שאר ה-routes כן.

2. **נוצר `api/health.ts`** (ראה CHECKPOINT B)

### בעיה שנותרה:
- ❌ עדיין 404 — Vercel לא מזהה את ה-API routes

### סיבות אפשריות:

1. **Root Directory לא נכון:**
   - Vercel Dashboard → Project Settings → General
   - בדוק ש-"Root Directory" הוא `.` (root) או התיקייה הנכונה

2. **Functions לא נשלחים:**
   - Vercel Dashboard → Deployments → בחר deployment → Functions
   - בדוק אם יש functions ב-`api/`

3. **Build לא כולל את `api/`:**
   - בדוק את ה-build logs ב-Vercel Dashboard
   - ודא ש-`api/` נכלל ב-deployment

### שלבים לתיקון ב-Vercel Dashboard:

1. **בדוק Root Directory:**
   - לך ל: **Project Settings** → **General**
   - בדוק את **"Root Directory"**
   - אם זה monorepo, הגדר את התיקייה הנכונה
   - אם לא, השאר ריק או `.`

2. **בדוק Functions:**
   - לך ל: **Deployments** → בחר deployment → **Functions**
   - בדוק אם יש functions ב-`api/`
   - אם אין, זה אומר שה-API routes לא מזוהים

3. **Redeploy:**
   - אחרי שינויים, בצע **Redeploy** מה-Dashboard
   - או הרץ: `vercel --prod --yes`

### Commands לבדיקה חוזרת:

```powershell
# אחרי תיקון ב-Vercel Dashboard:
curl.exe -i "https://my-wealth-orcin.vercel.app/api/health"
curl.exe -i "https://my-wealth-orcin.vercel.app/api/quote?ids=yahoo:AAPL"

# בדיקת cache (ריץ פעמיים):
curl.exe -I "https://my-wealth-orcin.vercel.app/api/quote?ids=yahoo:AAPL"
# בקשה ראשונה: x-vercel-cache: MISS
# בקשה שנייה (תוך 60 שניות): x-vercel-cache: HIT
```

---

## סיבות נפוצות ל-404 ב-`/api`:

### 1. Root Directory לא נכון
**תסמינים:** כל ה-endpoints מחזירים 404  
**פתרון:** Vercel Dashboard → Settings → General → Root Directory → הגדר ל-`.` או התיקייה הנכונה

### 2. `vercel.json` חוסם את `/api`
**תסמינים:** 404 רק ל-`/api/*`, שאר ה-routes עובדים  
**פתרון:** ודא ש-`vercel.json` לא מעביר `/api/*` ל-`/index.html`

### 3. Functions לא נשלחים
**תסמינים:** 404, אין functions ב-Deployments → Functions  
**פתרון:** בדוק ש-`api/` tracked ב-git ונשלח ב-deployment

### 4. Build לא כולל את `api/`
**תסמינים:** 404, build logs לא מראים את `api/`  
**פתרון:** בדוק את `.gitignore` ו-`.vercelignore` — ודא ש-`api/` לא מוחרג

---

## איפה ללחוץ ב-Vercel UI:

### 1. בדיקת Functions:
- **Deployments** → בחר deployment → **Functions** tab
- צריך לראות: `api/health`, `api/quote`, `api/search`, וכו'

### 2. בדיקת Root Directory:
- **Settings** → **General** → **Root Directory**
- צריך להיות: `.` (root) או התיקייה הנכונה

### 3. בדיקת Build Logs:
- **Deployments** → בחר deployment → **Build Logs**
- חפש: `api/` או `functions`

### 4. Redeploy:
- **Deployments** → בחר deployment → **"..."** → **Redeploy**

---

## סיכום:

### ✅ מה עובד:
- כל הקבצים ב-`api/` קיימים ומעקבים ב-git
- `vercel.json` מוגדר נכון
- `api/health.ts` נוצר

### ❌ מה לא עובד:
- Vercel לא מזהה את ה-API routes (404)
- צריך לבדוק ב-Vercel Dashboard:
  1. Root Directory
  2. Functions tab
  3. Build logs

### 📝 פעולות נדרשות:
1. לך ל-Vercel Dashboard → Settings → General
2. בדוק Root Directory
3. לך ל-Deployments → Functions
4. בדוק אם יש functions
5. אם לא, בדוק את Build Logs
6. Redeploy אחרי תיקונים

---

**END OF DEPLOYMENT_VERIFICATION.md**
