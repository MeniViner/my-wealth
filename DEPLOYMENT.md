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

# הרצת שרת מקומי
npm run vercel:dev
# או
vercel dev --listen 3000
```

השרת יעלה על `http://localhost:3000` ותוכלו לבדוק את ה-API endpoints.

### 2. הרצת Smoke Tests מקומית

```powershell
# הפעלת השרת המקומי (בטרמינל נפרד)
npm run vercel:dev

# הרצת בדיקות (בטרמינל אחר)
npm run smoke:local
```

או ישירות:

```powershell
pwsh -File scripts/smoke-test.ps1 -BaseUrl http://localhost:3000
```

### 3. בדיקת Production

לאחר פריסה לייצור:

```powershell
# הגדרת URL של Production
$env:PROD_URL = "https://your-app.vercel.app"

# הרצת בדיקות
npm run smoke:prod
```

או ישירות:

```powershell
pwsh -File scripts/smoke-test.ps1 -BaseUrl http://localhost:3000 -ProdUrl "https://your-app.vercel.app"
```

### 4. בדיקות ידניות

#### Health Check
```powershell
Invoke-WebRequest -Uri "https://your-app.vercel.app/api/health"
```

צפוי: `{ "ok": true, "timestamp": <number> }`

#### Search API
```powershell
Invoke-WebRequest -Uri "https://your-app.vercel.app/api/search?q=1183441"
```

#### Quote API
```powershell
Invoke-WebRequest -Uri "https://your-app.vercel.app/api/quote?ids=yahoo:AAPL"
```

#### History API
```powershell
Invoke-WebRequest -Uri "https://your-app.vercel.app/api/history?id=yahoo:AAPL&range=1mo&interval=1d"
```

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  ```

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

# Local Smoke Test
npm run smoke:local

# Production Smoke Test
$env:PROD_URL = "https://your-app.vercel.app"
npm run smoke:prod

# View Logs
vercel logs
```
