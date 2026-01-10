# Vercel Deployment Guide

מדריך לפריסה ואימות של האפליקציה ב-Vercel.

## הגדרות Vercel

### הגדרות פרויקט ב-Vercel Dashboard

כאשר מגדירים פרויקט חדש או בודקים הגדרות קיימות, ודאו:

1. **Root Directory**: חייב להיות שורש ה-repository (ריק או `"."`)
   - ❌ לא: `frontend` או `src`
   - ✅ כן: ריק או `"."`

2. **Output Directory**: `dist`
   - זה התיקייה ש-Vite בונה את הקבצים הסטטיים שלה אליה

3. **Framework Preset**: `Vite` (או `Other`)

4. **Node.js Version**: `20.x` (מומלץ)
   - ניתן להגדיר ב-`package.json`:
     ```json
     {
       "engines": {
         "node": ">=20.0.0"
       }
     }
     ```

5. **Build Command**: `npm run build` (או `yarn build`)
   - Vercel אמור לזהות זאת אוטומטית עבור Vite

6. **Install Command**: `npm install` (או `yarn install`)

### Environment Variables

אם יש משתני סביבה נדרשים, הוסיפו אותם ב-Vercel Dashboard:
- Settings → Environment Variables

## אימות פריסה

### 1. בדיקה מקומית עם Vercel CLI

לפני פריסה לייצור, בדקו שהכל עובד מקומית:

```powershell
# התקנת Vercel CLI (אם לא מותקן)
npm i -g vercel

# הרצת שרת מקומי (מאפשר לבדוק API endpoints מקומית)
vercel dev --listen 3000
```

השרת יעלה על `http://localhost:3000` ותוכלו לבדוק את ה-API endpoints.

**חשוב**: `vercel dev` מריץ את ה-Serverless Functions מקומית, כך שתוכלו לבדוק את ה-API endpoints לפני פריסה לייצור.

### 2. הרצת Smoke Tests

#### שימוש ב-npm scripts (מומלץ)

**בדיקה מקומית:**
```powershell
# הפעלת השרת המקומי (בטרמינל נפרד)
npm run vercel:dev

# הרצת בדיקות (בטרמינל אחר) - Windows PowerShell
npm run smoke:local

# או ב-Termux/Linux
npm run smoke:local:bash
```

**בדיקת Production:**
```powershell
# Windows PowerShell - הגדרת PROD_URL לפני הרצה
$env:PROD_URL = "https://my-wealth-orcin.vercel.app"
npm run smoke:prod

# או ב-Termux/Linux
PROD_URL="https://my-wealth-orcin.vercel.app" npm run smoke:prod:bash
```

#### הרצה ישירה (ללא npm scripts)

**Windows PowerShell:**

**בדיקה מקומית:**
```powershell
# הפעלת השרת המקומי (בטרמינל נפרד)
vercel dev --listen 3000

# הרצת בדיקות (בטרמינל אחר)
pwsh -File scripts/smoke-test.ps1 -BaseUrl http://localhost:3000
```

**בדיקת Production:**
```powershell
# בדיקת production (ברירת מחדל: https://my-wealth-orcin.vercel.app)
pwsh -File scripts/smoke-test.ps1 -ProdUrl "https://my-wealth-orcin.vercel.app"

# או עם URL מותאם אישית
pwsh -File scripts/smoke-test.ps1 -BaseUrl http://localhost:3000 -ProdUrl "https://your-app.vercel.app"
```

**Termux (Android/Linux):**

**התקנת דרישות:**
```bash
# התקנת curl ו-jq (אם לא מותקנים)
pkg install curl jq
```

**בדיקה מקומית:**
```bash
# הפעלת השרת המקומי (בטרמינל נפרד)
vercel dev --listen 3000

# הרצת בדיקות (בטרמינל אחר)
bash scripts/smoke-test.sh http://localhost:3000
```

**בדיקת Production:**
```bash
# בדיקת production (ברירת מחדל: https://my-wealth-orcin.vercel.app)
bash scripts/smoke-test.sh

# או עם URL מותאם אישית
bash scripts/smoke-test.sh https://your-app.vercel.app
```

**הערה**: ודאו שהסקריפט יש לו הרשאות הרצה:
```bash
chmod +x scripts/smoke-test.sh
```

**מה בודקים ה-Smoke Tests:**
- `/api/health` - Health check
- `/api/search?q=1183441` - TASE search
- `/api/quote?ids=yahoo:AAPL` - Yahoo quote (חייב להחזיר מחיר, לא 401)
- `/api/history?id=yahoo:AAPL&range=1mo&interval=1d` - Yahoo history (חייב להחזיר > 5 נקודות)
- `/api/quote?ids=tase:1183441` - TASE quote
- `/api/history?id=tase:1183441&range=1mo&interval=1d` - TASE history
- HEAD requests לכל ה-endpoints (חייב להחזיר 200, לא 405)

### 3. בדיקות ידניות

#### Windows PowerShell

**Health Check:**
```powershell
Invoke-WebRequest -Uri "https://my-wealth-orcin.vercel.app/api/health" | Select-Object -ExpandProperty Content
# צפוי: { "ok": true, "timestamp": <number> }
```

**Search API:**
```powershell
Invoke-WebRequest -Uri "https://my-wealth-orcin.vercel.app/api/search?q=1183441" | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

**Quote API:**
```powershell
# GET request
Invoke-WebRequest -Uri "https://my-wealth-orcin.vercel.app/api/quote?ids=yahoo:AAPL" | Select-Object -ExpandProperty Content | ConvertFrom-Json

# POST request
$body = @{ ids = @("yahoo:AAPL", "cg:bitcoin") } | ConvertTo-Json
Invoke-WebRequest -Uri "https://my-wealth-orcin.vercel.app/api/quote" -Method POST -Body $body -ContentType "application/json" | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

**History API:**
```powershell
Invoke-WebRequest -Uri "https://my-wealth-orcin.vercel.app/api/history?id=yahoo:AAPL&range=1mo&interval=1d" | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

**HEAD requests (לבדיקת headers):**
```powershell
# בדיקת HEAD (לא מחזיר body, רק headers)
Invoke-WebRequest -Uri "https://my-wealth-orcin.vercel.app/api/quote?ids=yahoo:AAPL" -Method HEAD
Invoke-WebRequest -Uri "https://my-wealth-orcin.vercel.app/api/history?id=yahoo:AAPL&range=1mo&interval=1d" -Method HEAD
```

#### Termux (curl + jq)

**Health Check:**
```bash
curl "https://my-wealth-orcin.vercel.app/api/health" | jq
```

**Search API:**
```bash
curl "https://my-wealth-orcin.vercel.app/api/search?q=1183441" | jq
```

**Quote API:**
```bash
# GET request
curl "https://my-wealth-orcin.vercel.app/api/quote?ids=yahoo:AAPL" | jq

# POST request
curl -X POST "https://my-wealth-orcin.vercel.app/api/quote" \
  -H "Content-Type: application/json" \
  -d '{"ids":["yahoo:AAPL","cg:bitcoin"]}' | jq
```

**History API:**
```bash
curl "https://my-wealth-orcin.vercel.app/api/history?id=yahoo:AAPL&range=1mo&interval=1d" | jq '.points | length'
```

**HEAD requests:**
```bash
# בדיקת HEAD (לא מחזיר body, רק headers)
curl -I "https://my-wealth-orcin.vercel.app/api/quote?ids=yahoo:AAPL"
curl -I "https://my-wealth-orcin.vercel.app/api/history?id=yahoo:AAPL&range=1mo&interval=1d"
```

### 4. אימות CDN Cache Headers

#### Windows PowerShell

**בדיקת headers עם GET:**
```powershell
$response = Invoke-WebRequest -Uri "https://my-wealth-orcin.vercel.app/api/quote?ids=yahoo:AAPL"
$response.Headers['CDN-Cache-Control']
$response.Headers['Cache-Control']
```

**בדיקת headers עם HEAD:**
```powershell
$response = Invoke-WebRequest -Uri "https://my-wealth-orcin.vercel.app/api/quote?ids=yahoo:AAPL" -Method HEAD
$response.Headers['CDN-Cache-Control']
$response.Headers['Cache-Control']
```

**בדיקת CDN Cache Hit (בקשה שנייה):**
```powershell
# בקשה ראשונה
$r1 = Invoke-WebRequest -Uri "https://my-wealth-orcin.vercel.app/api/quote?ids=yahoo:AAPL"
$r1.Headers['x-vercel-cache']  # צפוי: MISS

# בקשה שנייה (מיד אחרי)
$r2 = Invoke-WebRequest -Uri "https://my-wealth-orcin.vercel.app/api/quote?ids=yahoo:AAPL"
$r2.Headers['x-vercel-cache']  # צפוי: HIT
```

#### Termux

**בדיקת headers:**
```bash
# עם GET (מחזיר body + headers)
curl -v "https://my-wealth-orcin.vercel.app/api/quote?ids=yahoo:AAPL" 2>&1 | grep -i "cdn-cache-control\|cache-control"

# עם HEAD (רק headers, לא body)
curl -I "https://my-wealth-orcin.vercel.app/api/quote?ids=yahoo:AAPL" | grep -i "cdn-cache-control\|cache-control"
```

**בדיקת CDN Cache Hit (בקשה שנייה):**
```bash
# בקשה ראשונה
curl -I "https://my-wealth-orcin.vercel.app/api/quote?ids=yahoo:AAPL" | grep -i "x-vercel-cache"  # צפוי: MISS

# בקשה שנייה (מיד אחרי)
curl -I "https://my-wealth-orcin.vercel.app/api/quote?ids=yahoo:AAPL" | grep -i "x-vercel-cache"  # צפוי: HIT
```

**צפוי ל-quote:**
- `CDN-Cache-Control: public, s-maxage=60, stale-while-revalidate=300`
- `Cache-Control: max-age=0, s-maxage=60, stale-while-revalidate=300`

**צפוי ל-history:**
- `CDN-Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`
- `Cache-Control: max-age=0, s-maxage=3600, stale-while-revalidate=86400`

## Function Runtime Logs

### איפה למצוא לוגים ב-Vercel Dashboard

1. **Deployments Tab**:
   - בחרו את ה-deployment הרלוונטי
   - לחצו על "Functions" או "View Function Logs"
   - תראו את כל ה-logs של ה-Serverless Functions

2. **Real-time Logs**:
   - Vercel Dashboard → Project → Logs
   - או ישירות: `https://vercel.com/[team]/[project]/logs`

3. **Function Logs בפרטי Deployment**:
   - פתחו deployment ספציפי
   - גללו למטה ל-"Function Logs"
   - תראו logs לפי function (`/api/health`, `/api/search`, וכו')

### צפייה ב-Logs דרך CLI

```powershell
# צפייה ב-logs של deployment אחרון
vercel logs

# צפייה ב-logs של deployment ספציפי
vercel logs [deployment-url]
```

### Debugging Common Issues

#### 1. Function לא עובד
- בדקו את ה-logs ב-Vercel Dashboard
- ודאו שה-function נמצא ב-`/api/` directory
- בדקו שה-export default הוא async function

#### 2. CORS Errors
- ודאו שה-CORS headers מוגדרים בכל handler:
  ```typescript
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  ```

#### 4. HEAD Requests Return 405
- ודאו שה-handler תומך ב-HEAD method
- HEAD צריך להתנהג כמו GET אבל להחזיר רק headers (ללא body)
- השתמשו ב-`res.status(200).end()` עבור HEAD responses

#### 3. 500 Errors
- בדקו את ה-logs ב-Vercel Dashboard
- ודאו שכל ה-imports תקינים
- בדקו שה-API keys או credentials מוגדרים כ-Environment Variables

#### 4. 404 Errors
- ודאו שה-function נמצא ב-`/api/[name].ts`
- בדקו שה-`vercel.json` לא חוסם את ה-API routes

## Troubleshooting

### Build Fails
1. בדקו את ה-Build Logs ב-Vercel Dashboard
2. ודאו ש-Node.js version תואם (20.x)
3. בדקו שה-dependencies מותקנות נכון

### Functions Timeout
- Vercel Hobby plan: 10 seconds timeout
- Vercel Pro plan: 60 seconds timeout
- ודאו שה-timeouts ב-`_utils/http.ts` מתאימים

### Cache Issues
- בדקו את ה-`Cache-Control` headers
- CDN cache יכול להימשך עד 60 שניות (לפי ה-headers)
- לניקוי cache: Vercel Dashboard → Deployments → Redeploy

## Best Practices

1. **תמיד הרצו smoke tests לפני פריסה לייצור**
2. **בדקו את ה-logs אחרי כל deployment**
3. **השתמשו ב-Environment Variables עבור secrets**
4. **ודאו שה-error handling מחזיר JSON תמיד**
5. **בדקו שה-Content-Type headers מוגדרים נכון**

## Quick Reference

```powershell
# Development
npm run vercel:dev

# Local Smoke Test (PowerShell)
npm run smoke:local

# Local Smoke Test (Bash/Termux)
npm run smoke:local:bash

# Production Smoke Test (PowerShell)
$env:PROD_URL = "https://your-app.vercel.app"
npm run smoke:prod

# Production Smoke Test (Bash/Termux)
PROD_URL="https://your-app.vercel.app" npm run smoke:prod:bash

# View Logs
vercel logs
```

## Acceptance Criteria (קריטריוני קבלה)

לאחר פריסה, ודאו שכל הקריטריונים הבאים מתקיימים:

### A) Production Quote - Yahoo
```bash
curl -s https://<domain>/api/quote?ids=yahoo:AAPL | jq .
```
**צפוי**: מערך עם פריט AAPL שמכיל `price` מספרי (לא שגיאת HTTP 401).

### B) Production History - Yahoo
```bash
curl -s https://<domain>/api/history?id=yahoo:AAPL&range=1mo&interval=1d | jq '.points | length'
```
**צפוי**: מספר > 5 (יש לפחות 5 נקודות היסטוריות).

### C) TASE Quote
```bash
curl -s https://<domain>/api/quote?ids=tase:1183441 | jq .
```
**צפוי**: מחיר מספרי או הודעת שגיאה ספציפית **ללא** 401.

### D) HEAD Support
```bash
curl -I https://<domain>/api/quote?ids=yahoo:AAPL
```
**צפוי**: HTTP 200 (לא 405).
