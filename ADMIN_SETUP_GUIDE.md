# מדריך הגדרת מנהל - Admin Setup Guide

## 📋 סקירה כללית

מדריך זה מסביר איך להגדיר את עצמך כמנהל במערכת MyWealth, כך שתוכל לגשת לדף ניהול המשתמשים.

## 🎯 דרישות מוקדמות

1. חשבון Google מחובר לאפליקציה
2. גישה ל-Firebase Console
3. ה-User ID שלך (ניתן למצוא בקונסול של הדפדפן)

## 🚀 שיטה 1: דרך Firebase Console (מומלץ)

### שלב 1: מצא את ה-User ID שלך

1. התחבר לאפליקציה MyWealth
2. לחץ F12 כדי לפתוח את Developer Tools
3. עבור לטאב **Console**
4. הקלד את הפקודה הבאה ולחץ Enter:

```javascript
// אם אתה משתמש ב-React DevTools, תוכל לראות את ה-user object
// או השתמש בפקודה הזו:
console.log('User ID:', firebase.auth().currentUser?.uid);
```

**או** פשוט תסתכל על ה-URL של הדף - ה-User ID מופיע לעיתים בנתונים.

**או** דרך קוד זמני - הוסף את הקוד הזה ל-`src/App.jsx` זמנית:

```javascript
useEffect(() => {
  if (user) {
    console.log('Your User ID:', user.uid);
    alert('Your User ID: ' + user.uid);
  }
}, [user]);
```

### שלב 2: הוסף את עצמך כמנהל ב-Firebase Console

1. פתח את [Firebase Console](https://console.firebase.google.com/)
2. בחר את הפרויקט שלך
3. עבור ל-**Firestore Database**
4. לחץ על **Start collection** (אם זו הפעם הראשונה) או מצא את ה-collection `artifacts`
5. צור את המבנה הבא:

```
Collection ID: artifacts
  └── Document ID: my-wealth-app (או הערך של VITE_APP_ID שלך)
      └── Collection: admins
          └── Document ID: [YOUR_USER_ID]
              Fields:
                isAdmin: true (boolean)
                createdAt: [תאריך נוכחי] (timestamp)
                setBy: "manual" (string)
```

**שלבים מפורטים:**

1. לחץ על **Start collection** או מצא את `artifacts`
2. אם `artifacts` לא קיים, צור אותו:
   - Collection ID: `artifacts`
   - Document ID: `my-wealth-app` (או הערך של `VITE_APP_ID` מהקובץ `.env`)
3. בתוך המסמך `artifacts/my-wealth-app`, לחץ על **Add collection**
4. Collection ID: `admins`
5. לחץ על **Add document**
6. Document ID: הדבק את ה-User ID שלך (העתק-הדבק)
7. לחץ על **Add field** והוסף:
   - Field: `isAdmin`
   - Type: `boolean`
   - Value: `true`
8. לחץ על **Add field** והוסף:
   - Field: `createdAt`
   - Type: `timestamp`
   - Value: לחץ על השעון כדי להוסיף תאריך נוכחי
9. לחץ על **Add field** והוסף:
   - Field: `setBy`
   - Type: `string`
   - Value: `manual`
10. לחץ על **Save**

### שלב 3: בדוק שהכל עובד

1. רענן את האפליקציה
2. התנתק והתחבר מחדש
3. אתה אמור לראות קישור **"ניהול משתמשים"** בתפריט הצד
4. לחץ עליו כדי לבדוק שהדף נטען

## 🔧 שיטה 2: דרך קוד זמני (לפיתוח)

אם אתה מפתח את האפליקציה, תוכל להוסיף קוד זמני שיוסיף אותך כמנהל אוטומטית:

### הוסף קוד זמני ל-`src/App.jsx`:

```javascript
import { setUserAsAdmin } from './hooks/useAdmin';

// בתוך הפונקציה App, אחרי const { user } = useAuth();
useEffect(() => {
  if (user && user.email === 'your-email@gmail.com') { // החלף באימייל שלך
    setUserAsAdmin(user.uid).then(success => {
      if (success) {
        console.log('You are now an admin!');
      }
    });
  }
}, [user]);
```

**⚠️ חשוב:** מחק את הקוד הזה אחרי השימוש!

## 📝 מבנה הנתונים ב-Firestore

המבנה צריך להיות כך:

```
artifacts/
  └── {appId}/  (default: "my-wealth-app")
      ├── admins/
      │   └── {userId}/
      │       ├── isAdmin: true
      │       ├── createdAt: timestamp
      │       └── setBy: "manual"
      └── users/
          └── {userId}/
              └── [user data...]
```

## ✅ בדיקת הגדרות

לאחר ההגדרה, בדוק:

1. **בדיקת הרשאות:**
   - פתח את האפליקציה
   - התחבר עם החשבון שלך
   - בדוק אם מופיע קישור "ניהול משתמשים" בתפריט

2. **בדיקת Firestore Rules:**
   - ודא שהכללים ב-`firestore.rules` עודכנו
   - העלה אותם ל-Firebase Console

3. **בדיקת גישה:**
   - נסה לגשת ל-`/admin/users`
   - אתה אמור לראות את רשימת המשתמשים

## 🛠️ פתרון בעיות

### הבעיה: לא רואה את הקישור "ניהול משתמשים"

**פתרונות:**
1. ודא שהוספת את המסמך ב-`artifacts/{appId}/admins/{userId}`
2. ודא שה-`isAdmin` מוגדר ל-`true`
3. רענן את הדף והתנתק והתחבר מחדש
4. בדוק את ה-Console של הדפדפן לשגיאות

### הבעיה: מקבל שגיאת הרשאות

**פתרונות:**
1. ודא שהעלית את ה-Firestore Rules המעודכנים
2. בדוק שהכללים כוללים את הפונקציה `isAdmin()`
3. המתן כמה דקות - הכללים לוקחים זמן להתעדכן

### הבעיה: לא יודע מה ה-User ID שלי

**פתרונות:**
1. פתח את Developer Tools (F12)
2. עבור לטאב **Application** > **Local Storage**
3. חפש את המפתח `firebase:authUser`
4. או השתמש בקוד הזמני שהוצג למעלה

## 🔒 אבטחה

**חשוב לזכור:**
- רק מנהלים יכולים להוסיף מנהלים אחרים
- כל מנהל יכול לראות את כל הנתונים של כל המשתמשים
- השתמש בהרשאות מנהל בזהירות
- אל תשתף את ה-User ID שלך עם אחרים

## 📚 משאבים נוספים

- [Firebase Console](https://console.firebase.google.com/)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

---

**הערה:** אם אתה מגדיר את עצמך כמנהל בפעם הראשונה, ייתכן שתצטרך להוסיף את המסמך ידנית ב-Firebase Console, כי עדיין אין מנהל שיכול לעשות זאת דרך האפליקציה.

