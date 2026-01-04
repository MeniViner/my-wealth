import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-white" dir="rtl">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowRight className="w-5 h-5 rotate-180" />
            חזרה לאפליקציה
          </button>
          <h1 className="text-4xl font-bold mb-4">מדיניות פרטיות</h1>
          <p className="text-slate-400 text-lg">עדכון אחרון: {new Date().toLocaleDateString('he-IL')}</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none bg-slate-800/50 rounded-2xl p-8 md:p-12 space-y-6 text-slate-200 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. מבוא</h2>
            <p className="mb-4">
              מדיניות פרטיות זו מגדירה את האופן שבו אנו אוספים, משתמשים, שומרים, ומשתפים מידע אישי ופיננסי של המשתמשים בשירות MyWealth ("השירות"). שימוש בשירות מהווה הסכמה מלאה למדיניות זו.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. איסוף מידע</h2>
            <p className="mb-4">
              אנו אוספים מידע מסוגים שונים, לרבות:
            </p>
            <ul className="list-disc list-inside space-y-2 mr-4 mb-4">
              <li><strong className="text-white">מידע אישי:</strong> שם, כתובת אימייל, תמונת פרופיל, וכל מידע אחר שמשתמש מספק מרצונו</li>
              <li><strong className="text-white">מידע פיננסי:</strong> פרטי נכסים, השקעות, חשבונות בנק, מטבעות קריפטו, מניות, וכל מידע פיננסי אחר שהמשתמש מזין לשירות</li>
              <li><strong className="text-white">מידע טכני:</strong> כתובת IP, סוג דפדפן, מערכת הפעלה, נתוני שימוש, ומידע טכני אחר הנאסף אוטומטית</li>
              <li><strong className="text-white">מידע אגרגטיבי:</strong> נתונים סטטיסטיים, מגמות, וניתוחים המבוססים על מידע מצטבר של משתמשים</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. שימוש במידע</h2>
            <p className="mb-4">
              המידע הנאסף משמש למטרות הבאות:
            </p>
            <ul className="list-disc list-inside space-y-2 mr-4 mb-4">
              <li>אספקה ותפעול השירות</li>
              <li>שיפור ואופטימיזציה של השירות</li>
              <li>ניתוח סטטיסטי ומחקר</li>
              <li>פיתוח תכונות חדשות ושירותים</li>
              <li>תקשורת עם המשתמשים</li>
              <li>אבטחה ומניעת הונאה</li>
            </ul>
          </section>

          <section className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-4">4. שיתוף והעברת מידע לצדדים שלישיים</h2>
            <p className="mb-4 text-amber-100">
              החברה שומרת לעצמה את הזכות המלאה לשתף, להעביר, למסור, או למסחר במידע אגרגטיבי ו/או פרטני עם צדדים שלישיים, שותפים עסקיים, ספקי שירותים, וכל גוף אחר, למטרות שונות, לרבות אך לא רק:
            </p>
            <ul className="list-disc list-inside space-y-2 mr-4 mb-4 text-amber-100">
              <li>טיוב שירות ופיתוח מוצרים</li>
              <li>ניתוח סטטיסטי והפקת תובנות מסחריות</li>
              <li>שיווק ופרסום מותאם אישית</li>
              <li>מחקר שוק וניתוח מגמות</li>
              <li>שיתוף פעולה עסקי עם שותפים אסטרטגיים</li>
              <li>מכירה או העברה של נכסים עסקיים</li>
            </ul>
            <p className="mb-4 text-amber-100">
              המידע עשוי להיות מועבר, נמכר, או משותף עם חברות טכנולוגיה, חברות פרסום, חברות אנליטיקה, ספקי שירותי ענן, וכל צד שלישי אחר, בארץ או בחו"ל, ללא צורך בהודעה נוספת למשתמש.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. מידע אגרגטיבי ופרטני</h2>
            <p className="mb-4">
              אנו רשאים לעבד ולהשתמש במידע הן ברמה האגרגטיבית (מידע מצטבר של מספר משתמשים) והן ברמה הפרטנית (מידע ספציפי של משתמש בודד). מידע זה עשוי לכלול:
            </p>
            <ul className="list-disc list-inside space-y-2 mr-4 mb-4">
              <li>פרופילים פיננסיים והתנהגות השקעה</li>
              <li>העדפות וצרכי משתמש</li>
              <li>נתוני שימוש ודפוסי פעילות</li>
              <li>מידע דמוגרפי וגיאוגרפי</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. אבטחת מידע</h2>
            <p className="mb-4">
              בעוד שאנו נוקטים אמצעי אבטחה טכנולוגיים סבירים, אין אנו יכולים להבטיח אבטחה מוחלטת של המידע. המשתמש מכיר בכך כי העברת מידע באינטרנט כרוכה בסיכונים, ואנו לא נהיה אחראים לכל גישה לא מורשית, שימוש לרעה, או חשיפה של מידע.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. עוגיות וטכנולוגיות מעקב</h2>
            <p className="mb-4">
              השירות עשוי להשתמש בעוגיות, תגי מעקב, וטכנולוגיות דומות לאיסוף מידע על השימוש בשירות. מידע זה עשוי להיות משותף עם צדדים שלישיים למטרות ניתוח, פרסום, ושיווק.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. זכויות המשתמש</h2>
            <p className="mb-4">
              המשתמש רשאי לבקש גישה, תיקון, או מחיקה של מידע אישי. עם זאת, אנו שומרים לעצמנו את הזכות לסרב לבקשות מסוימות, במיוחד כאשר הדבר עלול להשפיע על תפקוד השירות או כאשר המידע נדרש למטרות עסקיות לגיטימיות.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. שינויים במדיניות</h2>
            <p className="mb-4">
              אנו שומרים לעצמנו את הזכות לשנות מדיניות זו בכל עת, ללא הודעה מוקדמת. שינויים ייכנסו לתוקף מיידית עם פרסומם. המשך השימוש בשירות לאחר שינויים מהווה הסכמה למדיניות המעודכנת.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. הסכמה וויתור</h2>
            <p className="mb-4">
              על ידי שימוש בשירות, המשתמש מסכים במפורש למדיניות זו ומוותר על כל טענה, תביעה, או דרישה בקשר לאיסוף, שימוש, שיתוף, או מסחר במידע שלו, לרבות מידע פיננסי ופרטי, בהתאם למדיניות זו.
            </p>
            <p className="mb-4">
              המשתמש מכיר בכך כי שיתוף מידע עם צדדים שלישיים, מסחר במידע, ושימוש במידע למטרות מסחריות הם חלק בלתי נפרד ממודל העסקי של השירות, והמשתמש מסכים לכך מרצונו החופשי.
            </p>
          </section>

          <section className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6 mt-8">
            <h2 className="text-xl font-bold text-blue-400 mb-3">הצהרת הסכמה</h2>
            <p className="text-blue-200 mb-3">
              <strong>בשימוש בשירות, אתה מכיר ומסכים כי:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 mr-4 text-blue-200">
              <li>המידע שלך עשוי להיות משותף, מועבר, או נמכר לצדדים שלישיים</li>
              <li>המידע עשוי לשמש למטרות מסחריות, שיווקיות, ופרסומיות</li>
              <li>אתה מוותר על כל זכות פרטיות בקשר לפעולות עסקיות אלה</li>
              <li>אין לך זכות לתבוע או לדרוש פיצוי בגין שימוש במידע בהתאם למדיניות זו</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. יצירת קשר</h2>
            <p className="mb-4">
              לשאלות או בקשות בקשר למדיניות זו, ניתן ליצור קשר דרך האפליקציה או באמצעות ההגדרות.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
