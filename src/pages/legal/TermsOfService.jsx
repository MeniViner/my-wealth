import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const TermsOfService = () => {
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
        <h1 className="text-4xl font-bold mb-4">תנאי שימוש</h1>
        <p className="text-slate-400 text-lg">עדכון אחרון: {new Date().toLocaleDateString('he-IL')}</p>
      </div>

      {/* Content */}
      <div className="prose prose-invert max-w-none bg-slate-800/50 rounded-2xl p-8 md:p-12 space-y-6 text-slate-200 leading-relaxed">
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">1. הצהרת מטרה והצהרת אי-אחריות</h2>
          <p className="mb-4">
            האפליקציה MyWealth ("השירות") היא כלי טכנולוגי לניהול ועקיבה אחר נכסים פיננסיים. השירות מוצע "כפי שהוא" (AS IS) ללא כל התחייבות, הבטחה או אחריות מכל סוג שהוא.
          </p>
          <p className="mb-4">
            <strong className="text-white">השירות אינו מהווה ייעוץ השקעות, המלצה להשקעה, או ייעוץ פיננסי מקצועי.</strong> השירות אינו רשום כמתן ייעוץ השקעות ואינו מוסמך לספק ייעוץ כזה על פי הדין הישראלי או כל דין אחר.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">2. אחריות המשתמש</h2>
          <p className="mb-4">
            המשתמש מכיר בכך כי כל החלטה פיננסית או השקעה המתקבלת על ידו היא על אחריותו הבלעדית. המשתמש נושא באחריות מלאה לכל פעולה, החלטה או נזק הנובעים משימוש בשירות, לרבות אך לא רק:
          </p>
          <ul className="list-disc list-inside space-y-2 mr-4 mb-4">
            <li>החלטות השקעה או פעולות פיננסיות המתבססות על מידע המוצג בשירות</li>
            <li>נזקים פיננסיים הנובעים משימוש בשירות</li>
            <li>אובדן רווחים, הזדמנויות עסקיות, או כל נזק עקיף אחר</li>
            <li>טעויות, אי-דיוקים, או אי-עדכון של נתונים המוצגים בשירות</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">3. אי-אחריות המפתח</h2>
          <p className="mb-4">
            המפתח, מפתחי השירות, וכל מי שקשור בפיתוח, תפעול או אספקת השירות, לא יהיו אחראים בשום צורה שהיא, בין אם בחוזה, נזיקין, או כל בסיס משפטי אחר, לכל נזק, הפסד, או הוצאה הנובעים משימוש או אי-יכולת להשתמש בשירות, לרבות אך לא רק:
          </p>
          <ul className="list-disc list-inside space-y-2 mr-4 mb-4">
            <li>נזקים ישירים, עקיפים, מקריים, מיוחדים, או תוצאתיים</li>
            <li>אובדן רווחים, הכנסות, נתונים, או הזדמנויות עסקיות</li>
            <li>נזקים הנובעים מטעויות, באגים, או תקלות טכניות</li>
            <li>נזקים הנובעים מהתרסקות שרתים, אובדן נתונים, או בעיות תשתית</li>
            <li>נזקים הנובעים מאי-דיוק בנתונים, מחירים לא מעודכנים, או מידע שגוי</li>
            <li>נזקים הנובעים משימוש במידע המוצג בשירות לקבלת החלטות השקעה</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">4. דיוק הנתונים</h2>
          <p className="mb-4">
            בעוד שאנו משתדלים לספק מידע מדויק ועדכני, אנו לא מתחייבים לדיוק, שלמות, או עדכניות של כל המידע המוצג בשירות. המידע עשוי לכלול טעויות, אי-דיוקים, או מידע לא מעודכן. המשתמש מסכים כי השימוש במידע הוא על אחריותו הבלעדית.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">5. שירותים חיצוניים</h2>
          <p className="mb-4">
            השירות עשוי להשתמש בשירותים חיצוניים, APIs, או מקורות נתונים של צדדים שלישיים. אנו לא אחראים לזמינות, דיוק, או תפקוד של שירותים אלה. כל בעיה או תקלה בשירותים חיצוניים אינה באחריותנו.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">6. שינויים והפסקת שירות</h2>
          <p className="mb-4">
            אנו שומרים לעצמנו את הזכות לשנות, להפסיק, או להשבית את השירות בכל עת, ללא הודעה מוקדמת וללא כל אחריות. המשתמש לא יהיה זכאי לפיצוי או החזר כלשהו במקרה של שינוי, הפסקה, או השבתה של השירות.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">7. ויתור על זכויות</h2>
          <p className="mb-4">
            על ידי שימוש בשירות, המשתמש מוותר במפורש על כל זכות לתבוע, לדרוש פיצוי, או לטעון לכל טענה כנגד המפתח, מפתחי השירות, או כל מי שקשור בהם, בקשר לכל נזק, הפסד, או הוצאה הנובעים משימוש או אי-יכולת להשתמש בשירות.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">8. דין שולט</h2>
          <p className="mb-4">
            תנאי שימוש אלה כפופים לדין הישראלי. כל מחלוקת הנובעת מתנאים אלה תיפתר בבתי המשפט המוסמכים בישראל בלבד.
          </p>
        </section>

        <section className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 mt-8">
          <h2 className="text-xl font-bold text-red-400 mb-3">הצהרה חשובה</h2>
          <p className="text-red-200">
            <strong>בשימוש בשירות, אתה מכיר ומסכים כי:</strong>
          </p>
          <ul className="list-disc list-inside space-y-2 mr-4 mt-3 text-red-200">
            <li>השירות אינו מהווה ייעוץ השקעות או המלצה להשקעה</li>
            <li>אתה נושא באחריות מלאה לכל החלטה פיננסית</li>
            <li>המפתח לא יהיה אחראי לכל נזק הנובע משימוש בשירות</li>
            <li>אתה מוותר על כל זכות לתבוע או לדרוש פיצוי</li>
          </ul>
        </section>
      </div>
    </div>
    </div>
  );
};

export default TermsOfService;
