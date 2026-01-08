# 🚀 מדריך פריסה ל-Vercel

מדריך מפורט לפריסת הפרויקט MyWealth ל-Vercel.

## 📋 דרישות מוקדמות

1. חשבון Vercel (ניתן להירשם ב-[vercel.com](https://vercel.com))
2. הפרויקט צריך להיות ב-GitHub, GitLab או Bitbucket
3. משתני סביבה של Firebase מוכנים

## 🔧 שלבי הפריסה

### שלב 1: הכנת הפרויקט

1. **ודא שהפרויקט עובד מקומית:**
   ```bash
   npm run build
   npm run preview
   ```

2. **ודא שכל הקבצים הנדרשים בקומיט:**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push
   ```

### שלב 2: יצירת פרויקט ב-Vercel

#### דרך 1: דרך הממשק הגרפי (מומלץ למתחילים)

1. היכנס ל-[vercel.com](https://vercel.com) והתחבר
2. לחץ על **"Add New..."** > **"Project"**
3. בחר את המאגר (Repository) שלך
4. Vercel יזהה אוטומטית שזה פרויקט Vite

#### דרך 2: דרך Vercel CLI

1. **התקן את Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **התחבר ל-Vercel:**
   ```bash
   vercel login
   ```

3. **פרוס את הפרויקט:**
   ```bash
   vercel
   ```

4. **לפריסה לייצור:**
   ```bash
   vercel --prod
   ```

### שלב 3: הגדרת משתני סביבה

**חשוב מאוד!** יש להגדיר את כל משתני הסביבה ב-Vercel:

1. בפרויקט ב-Vercel, לך ל-**Settings** > **Environment Variables**
2. הוסף את כל המשתנים הבאים:

```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_APP_ID=my-wealth-app
```

3. ודא שכל המשתנים מוגדרים עבור:
   - ✅ **Production**
   - ✅ **Preview**
   - ✅ **Development** (אופציונלי)

4. לחץ על **Save**

### שלב 4: הגדרות נוספות (אופציונלי)

#### הגדרת Domain מותאם אישית

1. לך ל-**Settings** > **Domains**
2. הוסף את הדומיין שלך
3. עקוב אחר ההוראות להגדרת DNS

#### הגדרת Build Settings

הקובץ `vercel.json` כבר מוגדר, אבל תוכל לבדוק ב-**Settings** > **General**:
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### שלב 5: פריסה מחדש

אחרי הגדרת משתני הסביבה:

1. לך ל-**Deployments**
2. לחץ על **"..."** ליד הפריסה האחרונה
3. בחר **"Redeploy"**
4. או פשוט עשה push חדש ל-Git:
   ```bash
   git push
   ```

## ✅ בדיקות אחרי הפריסה

1. **בדוק שהאפליקציה נטענת:**
   - פתח את ה-URL שקיבלת מ-Vercel
   - ודא שהדף נטען ללא שגיאות

2. **בדוק את הקונסול:**
   - פתח את Developer Tools (F12)
   - בדוק את ה-Console לשגיאות
   - ודא שאין שגיאות Firebase

3. **בדוק משתני סביבה:**
   - ודא ש-Firebase מתחבר בהצלחה
   - בדוק שהאימות עובד

## 🔍 פתרון בעיות נפוצות

### שגיאת 404 בדפים
**פתרון:** הקובץ `vercel.json` כבר מכיל את ה-rewrite rules הנדרשים. אם עדיין יש בעיה, ודא שהקובץ קיים.

### משתני סביבה לא עובדים
**פתרון:**
1. ודא שהמשתנים מוגדרים ב-Vercel
2. ודא שהמשתנים מתחילים ב-`VITE_`
3. בצע Redeploy אחרי הוספת משתנים

### שגיאת Build
**פתרון:**
1. בדוק את ה-Logs ב-Vercel
2. ודא ש-`package.json` מכיל את כל התלויות
3. נסה לבנות מקומית: `npm run build`

### Firebase לא עובד
**פתרון:**
1. ודא שכל משתני Firebase מוגדרים ב-Vercel
2. בדוק את Firebase Console שהשירותים מופעלים
3. ודא שה-Firebase Hosting לא חוסם את Vercel (אם יש)

## 📝 הערות חשובות

- **משתני סביבה:** כל משתנה שמתחיל ב-`VITE_` נחשף ל-client-side. אל תשים מידע רגיש!
- **Firebase Rules:** ודא שה-Firestore Rules מוגדרות נכון ב-Firebase Console
- **CORS:** אם יש בעיות CORS, ודא ש-Firebase מאפשר את הדומיין של Vercel

## 🔄 עדכונים עתידיים

כל push ל-Git יגרום לפריסה אוטומטית חדשה ב-Vercel (אם הגדרת כך).

לפריסה ידנית:
```bash
vercel --prod
```

## 📚 משאבים נוספים

- [תיעוד Vercel](https://vercel.com/docs)
- [תיעוד Vite + Vercel](https://vercel.com/guides/deploying-vite-to-vercel)
- [Firebase Console](https://console.firebase.google.com/)

---

**בהצלחה! 🎉**
