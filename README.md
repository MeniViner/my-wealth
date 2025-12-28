# MyWealth - ניהול תיק השקעות

אפליקציית ניהול תיק השקעות מקצועית עם אינטגרציה ל-Firebase, גרפים דינמיים ויועץ AI מבוסס Gemini.

## 🚀 התקנה והפעלה

### דרישות מוקדמות
- Node.js (גרסה 18 ומעלה)
- npm או yarn

### שלבי התקנה

1. **התקנת תלויות:**
```bash
npm install
```

2. **הגדרת משתני סביבה:**
צור קובץ `.env` בתיקיית השורש של הפרויקט והעתק את התוכן מ-`ENV_EXAMPLE.txt`:

```bash
# Windows PowerShell
Copy-Item ENV_EXAMPLE.txt .env

# Linux/Mac
cp ENV_EXAMPLE.txt .env
```

ערוך את הקובץ `.env` והזן את המפתחות שלך:
- Firebase Configuration - קבל מ-[Firebase Console](https://console.firebase.google.com/)

**הערה:** Gemini AI משתמש כעת ב-[Puter.js](https://developer.puter.com/tutorials/free-gemini-api) - חינמי ואין צורך במפתח API!

3. **הפעלת שרת פיתוח:**
```bash
npm run dev
```

האפליקציה תיפתח אוטומטית ב-`http://localhost:3000`

4. **בנייה לייצור:**
```bash
npm run build
```

הקבצים המבונים יישמרו בתיקייה `dist/`

## 📁 מבנה הפרויקט

```
my-Wealth/
├── src/
│   ├── components/          # רכיבי UI לשימוש חוזר
│   │   ├── Layout.jsx       # Layout עם Sidebar
│   │   ├── Modal.jsx        # מודל כללי
│   │   ├── MarkdownRenderer.jsx
│   │   ├── CustomTooltip.jsx
│   │   └── CustomTreemapContent.jsx
│   ├── pages/               # דפי האפליקציה
│   │   ├── Dashboard.jsx    # דשבורד ראשי
│   │   ├── AssetManager.jsx # ניהול נכסים
│   │   ├── AssetForm.jsx    # טופס הוספה/עריכה
│   │   ├── AIAdvisor.jsx    # יועץ AI
│   │   └── Settings.jsx     # הגדרות מערכת
│   ├── hooks/               # Custom Hooks
│   │   ├── useAuth.js       # ניהול אימות
│   │   ├── useAssets.js     # ניהול נכסים
│   │   ├── useSystemData.js # נתוני מערכת
│   │   └── useCurrency.js   # שערי מטבע
│   ├── services/            # שירותים חיצוניים
│   │   ├── firebase.js      # הגדרות Firebase
│   │   ├── gemini.js        # אינטגרציה עם Gemini AI דרך Puter.js
│   │   └── currency.js      # API שערי מטבע
│   ├── constants/           # קבועים
│   │   └── defaults.js      # נתוני ברירת מחדל
│   ├── App.jsx              # רכיב ראשי + Routing
│   ├── main.jsx             # נקודת כניסה
│   └── index.css            # סגנונות גלובליים
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 🛠️ טכנולוגיות

- **React 18** - ספריית UI
- **Vite** - Build tool מהיר
- **React Router DOM** - ניתוב
- **Firebase** - מסד נתונים ואימות
- **Recharts** - גרפים דינמיים
- **Tailwind CSS** - עיצוב
- **Lucide React** - אייקונים
- **Puter.js + Gemini AI** - יועץ AI (חינמי, ללא מפתח API)

## ✨ תכונות עיקריות

### 📊 דשבורד
- תצוגת שווי כולל
- גרף Radial Bar לפי קטגוריות
- גרף Radar לאיזון תיק
- Treemap לפי פלטפורמות
- Bar Chart לפי מכשירים

### 💼 ניהול נכסים
- טבלה עם מיון וסינון
- הוספה, עריכה ומחיקה של נכסים
- תצוגה דינמית של עמודות
- חיפוש מתקדם

### 🤖 יועץ AI
- ניתוח תיק אוטומטי
- דוחות היסטוריים
- המלצות השקעה

### ⚙️ הגדרות
- ניהול פלטפורמות, מכשירים וקטגוריות
- אתחול מסד נתונים
- עדכון שערי מטבע אוטומטי

## 🔐 אבטחה

- כל המפתחות נשמרים במשתני סביבה (`.env`)
- אימות אנונימי ב-Firebase
- נתונים מופרדים לפי משתמש

## 📝 הערות

- האפליקציה משתמשת ב-Firebase Anonymous Authentication
- שערי מטבע מתעדכנים אוטומטית מדי יום
- דוחות AI נשמרים ב-Firebase

## 🐛 פתרון בעיות

### שגיאת Firebase
ודא שהמפתחות ב-`.env` נכונים ושהשירותים מופעלים ב-Firebase Console.

### שגיאת Puter.js / Gemini AI
ודא שהסקריפט של Puter.js נטען ב-`index.html`. אם יש בעיות, בדוק את הקונסול של הדפדפן.

### בעיות בנייה
נסה למחוק את `node_modules` ולהתקין מחדש:
```bash
rm -rf node_modules
npm install
```

## 📄 רישיון

פרויקט זה הוא פרויקט אישי לשימוש פרטי.

