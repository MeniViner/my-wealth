# מדריך דיבוג - הגדרת מנהל

## 🔍 איך לראות את ה-User ID שלך בקונסול

### שיטה 1: דרך הקונסול (הכי קל)

1. פתח את האפליקציה והתחבר
2. לחץ F12 כדי לפתוח את Developer Tools
3. עבור לטאב **Console**
4. הקלד את הפקודה הבאה:

```javascript
window.__getCurrentUser()
```

זה יציג את כל המידע על המשתמש המחובר, כולל ה-User ID.

### שיטה 2: דרך הלוגים האוטומטיים

כשאתה מתחבר, תראה בקונסול:
```
👤 Current User Info:
  User ID: [your-user-id]
  Email: [your-email]
  Display Name: [your-name]
  Photo URL: [your-photo]
```

## 🛠️ איך לבדוק אם אתה מנהל

### דרך הקונסול:

```javascript
// בדוק את הסטטוס הנוכחי
window.__getCurrentUser()

// בדוק את הלוגים - תראה:
// [Admin Check] User [your-id]: IS ADMIN
// או
// [Admin Check] User [your-id]: NOT ADMIN
```

## 📝 איך להוסיף את עצמך כמנהל

### שלב 1: מצא את ה-User ID שלך

השתמש באחת מהשיטות למעלה.

### שלב 2: הוסף את עצמך ב-Firebase Console

1. פתח [Firebase Console](https://console.firebase.google.com/)
2. בחר את הפרויקט שלך
3. עבור ל-**Firestore Database**
4. לחץ על **Start collection** (אם זו הפעם הראשונה)
5. צור את המבנה הבא:

**Collection ID:** `artifacts`
  - **Document ID:** `my-wealth-app` (או הערך של `VITE_APP_ID` שלך)
    - **Add collection** → **Collection ID:** `admins`
      - **Add document** → **Document ID:** [הדבק את ה-User ID שלך]
        - **Add field:**
          - Field: `isAdmin`
          - Type: `boolean`
          - Value: `true`
        - **Add field:**
          - Field: `createdAt`
          - Type: `timestamp`
          - Value: [לחץ על השעון לתאריך נוכחי]
        - **Add field:**
          - Field: `setBy`
          - Type: `string`
          - Value: `manual`

### שלב 3: רענן את האפליקציה

1. לחץ F5 או רענן את הדף
2. התנתק והתחבר מחדש
3. בדוק את הקונסול - אתה אמור לראות:
   ```
   [Admin Check] User [your-id]: IS ADMIN
   ```
4. אתה אמור לראות קישור **"ניהול משתמשים"** בתפריט

## 🐛 פתרון בעיות

### הבעיה: "Missing or insufficient permissions"

**פתרון:**
1. ודא שהעלית את ה-Firestore Rules המעודכנים ל-Firebase Console
2. ודא שהמבנה ב-Firestore נכון:
   ```
   artifacts/{appId}/admins/{userId}
   ```
3. המתן כמה דקות - הכללים לוקחים זמן להתעדכן

### הבעיה: לא רואה את הקישור "ניהול משתמשים"

**פתרון:**
1. בדוק את הקונסול - האם אתה רואה `IS ADMIN`?
2. אם לא, בדוק שהמסמך ב-Firestore קיים ו-`isAdmin` הוא `true`
3. רענן את הדף והתנתק והתחבר מחדש

### הבעיה: האתר איטי

**פתרונות:**
1. בדוק את Network tab ב-DevTools - האם יש קריאות איטיות ל-Firestore?
2. בדוק את הקונסול - האם יש שגיאות?
3. נסה לנקות את ה-Cache (Ctrl+Shift+Delete)
4. בדוק את ה-Firestore Rules - האם הם חוסמים קריאות?

## 📊 כלי דיבוג זמינים

בקונסול, תוכל להשתמש ב:

```javascript
// קבל מידע על המשתמש הנוכחי
window.__getCurrentUser()

// גש לאובייקט Auth של Firebase
window.__firebaseAuth

// בדוק את המשתמש הנוכחי
window.__firebaseAuth.currentUser
```

## ✅ בדיקת הצלחה

אחרי שהגדרת את עצמך כמנהל, אתה אמור לראות:

1. ✅ בקונסול: `[Admin Check] User [your-id]: IS ADMIN`
2. ✅ בתפריט: קישור **"ניהול משתמשים"** עם אייקון Shield
3. ✅ בדף ניהול משתמשים: רשימת כל המשתמשים במערכת

---

**טיפ:** אם אתה עדיין לא רואה את הקישור, נסה:
1. לנקות את ה-Cache
2. לפתוח את האפליקציה בחלון פרטי (Incognito)
3. לבדוק שוב את המבנה ב-Firestore

