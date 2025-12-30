import { useState } from 'react';
import { Wallet, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { errorAlert } from '../utils/alerts';

const Login = () => {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn();
    } catch (err) {
      console.error('Sign in error:', err);
      const errorMessage = err.code === 'auth/popup-closed-by-user' 
        ? 'ההתחברות בוטלה. אנא נסה שוב.'
        : err.message || 'אירעה שגיאה בהתחברות. אנא נסה שוב.';
      setError(errorMessage);
      await errorAlert('שגיאה בהתחברות', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100svh] md:min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 md:p-12 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Wallet className="w-12 h-12 text-emerald-500" />
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white">MyWealth</h1>
              <span className="text-xs bg-purple-600 px-2 py-1 rounded text-white flex items-center gap-1">
                <Sparkles size={12} />PRO
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-lg">ניהול הון אישי חכם</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Sign In Button */}
          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-6 py-4 rounded-xl font-semibold shadow-lg hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-400 dark:hover:border-slate-500 transition flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>מתחבר...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>התחבר עם Google</span>
                </>
              )}
            </button>

            <p className="text-xs text-center text-slate-500 dark:text-slate-400">
              על ידי התחברות, אתה מסכים לתנאי השימוש ומדיניות הפרטיות שלנו
            </p>
          </div>

          {/* Features */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">מה תקבל:</h3>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span>ניהול נכסים מרכזי</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span>יועץ AI חכם</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span>דשבורד מתקדם</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span>שמירה מאובטחת בענן</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

