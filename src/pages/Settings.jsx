import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, DollarSign, Moon, Sun, Palette, Rocket, GraduationCap, RefreshCw } from 'lucide-react';
import { confirmAlert, successToast } from '../utils/alerts';
import { useDarkMode } from '../hooks/useDarkMode';

const Settings = ({ systemData, setSystemData, currencyRate, user, onResetData, onRefreshCurrency, onResetOnboarding, onStartCoachmarks }) => {
  const [activeSection, setActiveSection] = useState('appearance');
  const [isRefreshingCurrency, setIsRefreshingCurrency] = useState(false);
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // Read hash from URL to set active section
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'appearance' || hash === 'onboarding') {
      setActiveSection(hash);
    }
  }, []);

  // Update hash when active section changes
  useEffect(() => {
    if (activeSection) {
      window.location.hash = activeSection;
    }
  }, [activeSection]);

  const formatLastUpdated = (dateString) => {
    if (!dateString) return 'לא עודכן';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'עכשיו';
      if (diffMins < 60) return `לפני ${diffMins} דקות`;
      if (diffHours < 24) return `לפני ${diffHours} שעות`;
      if (diffDays === 1) return 'אתמול';
      if (diffDays < 7) return `לפני ${diffDays} ימים`;
      
      // Format full date in Hebrew
      return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'תאריך לא תקין';
    }
  };

  const handleRefreshCurrency = async () => {
    if (!onRefreshCurrency || isRefreshingCurrency) return;
    setIsRefreshingCurrency(true);
    try {
      await onRefreshCurrency();
      successToast('שער החליפין עודכן בהצלחה', 1500);
    } catch (error) {
      console.error('Error refreshing currency:', error);
      successToast('אירעה שגיאה בעדכון שער החליפין', 2000);
    } finally {
      setIsRefreshingCurrency(false);
    }
  };


  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Section */}
      <header className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 mr-12 md:mr-0">
        <div className="flex items-center gap-3">
          <SettingsIcon className="text-emerald-600 dark:text-emerald-400" size={24} />
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">הגדרות</h2>
            <p className="text-slate-500 dark:text-slate-300 text-sm mt-0.5">נהל את הגדרות המערכת, הגרפים והיעדים</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Currency Info */}
          <div className="relative group/currency">
            <div 
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              onClick={handleRefreshCurrency}
            >
              <DollarSign className="text-emerald-600 dark:text-emerald-400" size={16} />
              <span className={`font-medium ${isRefreshingCurrency ? 'opacity-50' : ''}`}>
                ₪{currencyRate.rate}
              </span>
              {isRefreshingCurrency && (
                <RefreshCw size={14} className="animate-spin text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover/currency:block z-50 pointer-events-none">
              <div className="bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-lg py-2 px-3 shadow-2xl whitespace-nowrap">
                {currencyRate.lastUpdated 
                  ? `עודכן לאחרונה: ${formatLastUpdated(currencyRate.lastUpdated)}`
                  : currencyRate.date 
                    ? `תאריך: ${currencyRate.date}`
                    : 'לחץ לעדכן'}
                <div className="absolute top-full left-4 -mt-1">
                  <div className="border-4 border-transparent border-t-slate-800 dark:border-t-slate-700"></div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </header>

      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveSection('appearance')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeSection === 'appearance'
              ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          מראה
        </button>
        <button
          onClick={() => setActiveSection('onboarding')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeSection === 'onboarding'
              ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          הדרכה
        </button>
      </div>

      {/* Appearance Section */}
      {activeSection === 'appearance' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <Palette size={18} className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-100">הגדרות מראה</h3>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isDarkMode ? (
                    <Moon size={20} className="text-slate-600 dark:text-slate-300" />
                  ) : (
                    <Sun size={20} className="text-slate-600 dark:text-slate-300" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-100">מצב כהה</p>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">החלף בין מצב בהיר לכהה</p>
                  </div>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    isDarkMode ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  role="switch"
                  aria-checked={isDarkMode}
                  aria-label="מצב כהה"
                >
                  <span
                    className={`absolute h-4 w-4 rounded-full bg-white transition-all ${
                      isDarkMode ? 'left-1' : 'right-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding & Tour Section */}
      {activeSection === 'onboarding' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <GraduationCap size={18} className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-100">הדרכה והכרת המערכת</h3>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Reset Onboarding */}
              <div className="flex items-center justify-between p-5 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700/50 dark:to-slate-800/50 border border-slate-200 dark:border-slate-600">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Rocket size={24} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-slate-800 dark:text-white mb-1">
                      הפעל תהליך Onboarding מחדש
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      תהליך ההתחלה המלא - בחירת מטבע, הוספת נכס ראשון, והכרת המערכת
                    </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const confirmed = await confirmAlert(
                      'איפוס תהליך ההתחלה',
                      'האם אתה בטוח שברצונך להפעיל מחדש את תהליך ההתחלה? זה יסתיר את כל הדפים ויציג את תהליך ההתחלה המלא.',
                      'question'
                    );
                    if (confirmed && onResetOnboarding) {
                      await onResetOnboarding();
                      await successToast('תהליך ההתחלה יופעל מחדש', 2000);
                      // Reload page to show onboarding
                      setTimeout(() => {
                        window.location.reload();
                      }, 500);
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 flex items-center gap-2"
                >
                  <Rocket size={18} />
                  הפעל מחדש
                </button>
              </div>

              {/* Start Coachmarks Tour */}
              <div className="flex items-center justify-between p-5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700/50 dark:to-slate-800/50 border border-slate-200 dark:border-slate-600">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <GraduationCap size={24} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-slate-800 dark:text-white mb-1">
                      הפעל מדריך מערכת
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      מדריך מודרך בין כל הדפים והפיצ'רים של המערכת - ללא איפוס נתונים
                    </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (onStartCoachmarks) {
                      onStartCoachmarks();
                      await successToast('המדריך הופעל', 1500);
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 flex items-center gap-2"
                >
                  <GraduationCap size={18} />
                  התחל מדריך
                </button>
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">ℹ</span>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
                    <p className="font-medium text-slate-700 dark:text-slate-200">מה ההבדל?</p>
                    <ul className="list-disc list-inside space-y-1 pr-4">
                      <li>
                        <strong>תהליך Onboarding מחדש:</strong> מפעיל את כל תהליך ההתחלה מההתחלה - בחירת מטבע, הוספת נכס ראשון, וכו'. מתאים למשתמשים חדשים או למי שרוצה להתחיל מחדש.
                      </li>
                      <li>
                        <strong>מדריך מערכת:</strong> מדריך מודרך בין כל הדפים והפיצ'רים של המערכת. לא משנה נתונים, רק מסביר איך להשתמש במערכת.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
