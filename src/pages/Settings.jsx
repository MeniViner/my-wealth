import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, DollarSign, Moon, Sun, Palette, Rocket, GraduationCap, RefreshCw, TestTube, Clock, Bomb, TrendingUp, RotateCcw } from 'lucide-react';
import { confirmAlert, successToast } from '../utils/alerts';
import { useDarkMode } from '../hooks/useDarkMode';
import { useDemoData } from '../contexts/DemoDataContext';
import { useAdmin } from '../hooks/useAdmin';
import { useSettings } from '../hooks/useSettings';
import DataRepair from '../components/DataRepair';
import AssetCostReset from '../components/AssetCostReset';


const Settings = ({ systemData, setSystemData, currencyRate, user, onResetData, onRefreshCurrency, onResetOnboarding, onStartCoachmarks, assets, onUpdateAsset }) => {
  const [activeSection, setActiveSection] = useState('appearance');
  const [isRefreshingCurrency, setIsRefreshingCurrency] = useState(false);
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { isActive: isDemoActive, refreshInterval, updateRefreshInterval, toggleDemoMode } = useDemoData();
  const { isAdmin } = useAdmin(user);
  const { settings, updateSettings, loading: settingsLoading } = useSettings(user);

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

      </header>

      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <button
          onClick={() => setActiveSection('appearance')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeSection === 'appearance'
            ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
        >
          כללי
        </button>
        <button
          onClick={() => setActiveSection('prices')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeSection === 'prices'
            ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
        >
          מחירים
        </button>
        <button
          onClick={() => setActiveSection('assets-reset')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeSection === 'assets-reset'
            ? 'border-purple-600 dark:border-purple-400 text-purple-600 dark:text-purple-400'
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
        >
          שחזור עלויות
        </button>
        <button
          onClick={() => setActiveSection('demo')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeSection === 'demo'
            ? 'border-amber-600 dark:border-amber-400 text-amber-600 dark:text-amber-400'
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
        >
          מצב דמו
        </button>
        <button
          onClick={() => setActiveSection('onboarding')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeSection === 'onboarding'
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
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${isDarkMode ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  role="switch"
                  aria-checked={isDarkMode}
                  aria-label="מצב כהה"
                >
                  <span
                    className={`absolute h-4 w-4 rounded-full bg-white transition-all ${isDarkMode ? 'left-1' : 'right-1'
                      }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <DollarSign className="text-emerald-600 dark:text-emerald-400" size={18} />
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-100">שער הדולר</h3>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign className="text-emerald-600 dark:text-emerald-400" size={20} />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-100">דולר לשקל</p>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">₪{currencyRate.rate}</p>
                  </div>
                </div>
                <button
                  onClick={handleRefreshCurrency}
                  aria-checked={isRefreshingCurrency}
                  aria-label="עדכון שער המרה"
                  className={isRefreshingCurrency ? "animate-spin" : ""}
                >
                  <RefreshCw size={20} className=" text-emerald-600 dark:text-emerald-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Reset Database Button (Admin only) or Demo Mode Button (Regular users) */}
          {isAdmin && onResetData && (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2.5">
                  <Bomb size={18} className="text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-base font-semibold text-slate-700 dark:text-slate-100">אזור מסוכן</h3>
                </div>
              </div>
              <div className='p-4 flex justify-between'>
                <p className="text-sm text-slate-500 dark:text-slate-300 mt-0.5">איפוס נתוני המניות למה שהוגדר בהתחלה</p>
                <div className="mb-6 flex ">
                  <button
                    onClick={onResetData}
                    className="text-sm ml-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 font-medium"
                    title="אתחול מסד נתונים - ימחק את כל הנתונים"
                  >
                    <RefreshCw size={16} />
                    <span>אפס לנתונים ראשוניים ⚠️</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Emergency Data Repair Tool (Admin only) */}
          {isAdmin && <DataRepair />}
        </div>

      )}

      {/* Prices Section */}
      {activeSection === 'prices' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <TrendingUp size={18} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-100">הגדרות עדכון מחירים</h3>
              </div>
            </div>
            <div className="p-6">
              {/* כיבוי עדכון מחירים אוטומטי */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 md:p-5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700/50 dark:to-slate-800/50 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3 md:gap-4 flex-1">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 ${
                    settings.disableLivePriceUpdates
                      ? 'bg-gradient-to-br from-slate-400 to-slate-600 shadow-slate-500/20'
                      : 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-blue-500/20'
                    }`}>
                    <TrendingUp size={20} className="md:w-6 md:h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-semibold text-slate-800 dark:text-white mb-1">
                      כיבוי עדכון מחירים בזמן אמת
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {settings.disableLivePriceUpdates
                        ? 'עדכון מחירים אוטומטי כבוי - המחירים המקוריים לא ישתנו'
                        : 'עדכון מחירים אוטומטי פעיל - מחירים מתעדכנים בזמן אמת'
                      }
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      כאשר מכובה, המחירים המקוריים שהזנת לא ישתנו גם כאשר מגיעים נתוני מחיר חדשים מהשרת
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end md:justify-start md:flex-shrink-0">
                  <button
                    onClick={async () => {
                      const newValue = !settings.disableLivePriceUpdates;
                      await updateSettings({ disableLivePriceUpdates: newValue });
                      await successToast(
                        newValue
                          ? 'עדכון מחירים אוטומטי כובה - המחירים המקוריים לא ישתנו'
                          : 'עדכון מחירים אוטומטי הופעל',
                        2000
                      );
                    }}
                    disabled={settingsLoading}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      !settings.disableLivePriceUpdates ? 'bg-blue-600' : 'bg-slate-300'
                    } ${settingsLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    role="switch"
                    aria-checked={!settings.disableLivePriceUpdates}
                    aria-label="עדכון מחירים אוטומטי"
                  >
                    <span
                      className={`absolute h-4 w-4 rounded-full bg-white transition-all ${
                        !settings.disableLivePriceUpdates ? 'left-1' : 'right-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* הודעת הסבר */}
              <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-slate-600 dark:text-slate-400 text-xs font-medium">ℹ</span>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2 flex-1">
                    <p className="font-medium text-slate-700 dark:text-slate-300">למה לכבות עדכון מחירים?</p>
                    <div className="space-y-2 pr-2">
                      <div>
                        <strong className="text-slate-700 dark:text-slate-200">שמירת מחירים מקוריים:</strong> כאשר מכובה, המחירים שהזנת ידנית לא ישתנו, גם אם מגיעים נתוני מחיר חדשים מהשרת.
                      </div>
                      <div>
                        <strong className="text-slate-700 dark:text-slate-200">שליטה מלאה:</strong> אידיאלי למשתמשים שרוצים לשלוט בדיוק באיזה מחיר מוצג לכל נכס.
                      </div>
                      <div>
                        <strong className="text-slate-700 dark:text-slate-200">הערה:</strong> אפשר תמיד לעדכן מחירים ידנית או להפעיל מחדש את העדכון האוטומטי.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assets Cost Reset Section */}
      {activeSection === 'assets-reset' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <RotateCcw size={18} className="text-purple-600 dark:text-purple-400" />
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-100">שחזור עלויות מקוריות</h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">
                לכל נכס ניתן לשחזר את העלות המקורית שלו בעת הזנה ראשונית
              </p>
            </div>
            <div className="p-6">
              <AssetCostReset 
                assets={assets || []} 
                onUpdateAsset={onUpdateAsset}
              />
            </div>
          </div>
        </div>
      )}

      {/* Demo Mode Section */}
      {activeSection === 'demo' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <TestTube size={18} className="text-amber-600 dark:text-amber-400" />
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-100">הגדרות מצב דמו</h3>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Toggle Demo Mode */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 md:p-5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-700/50 dark:to-slate-800/50 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-3 md:gap-4 flex-1">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 ${isDemoActive
                    ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/20'
                    : 'bg-gradient-to-br from-slate-400 to-slate-600 shadow-slate-500/20'
                    }`}>
                    <TestTube size={20} className="md:w-6 md:h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-semibold text-slate-800 dark:text-white mb-1">
                      מצב דמו
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {isDemoActive
                        ? 'מצב דמו פעיל - נתוני דמו מוצגים במקום הנתונים האמיתיים'
                        : 'הפעל מצב דמו כדי לראות נתוני דמו במקום הנתונים האמיתיים'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end md:justify-start md:flex-shrink-0">
                  <button

                    onClick={async () => {
                      toggleDemoMode();
                      await successToast(
                        isDemoActive
                          ? 'מצב דמו כובה'
                          : 'מצב דמו הופעל - נתוני דמו מוצגים',
                        2000
                      );
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${isDemoActive ? 'bg-amber-600' : 'bg-slate-300'
                      }`}
                    role="switch"
                    aria-checked={isDemoActive}
                    aria-label="מצב דמו"
                  >
                    <span
                      className={`absolute h-4 w-4 rounded-full bg-white transition-all ${isDemoActive ? 'left-1' : 'right-1'
                        }`}
                    />
                  </button>
                </div>
              </div>

              {/* Refresh Interval Control - Only show when demo is active */}
              {isDemoActive && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Clock size={20} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-slate-800 dark:text-white">
                        מרווח רענון נתונים
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        בחר כמה שניות בין כל רענון של ערכי הנכסים במצב דמו
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-700/50 p-5 rounded-xl border border-slate-200 dark:border-slate-600">
                    <div className="flex items-center gap-4 mb-4">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-shrink-0">
                        מרווח (שניות):
                      </label>
                      <input
                        type="number"
                        min="3"
                        max="60"
                        value={refreshInterval}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10);
                          if (!isNaN(value) && value >= 3 && value <= 60) {
                            updateRefreshInterval(value);
                          }
                        }}
                        className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                      <span className="text-sm text-slate-500 dark:text-slate-400 flex-shrink-0">
                        שניות
                      </span>
                    </div>

                    <div className="mt-4">
                      <input
                        type="range"
                        min="3"
                        max="60"
                        step="1"
                        value={refreshInterval}
                        onChange={(e) => updateRefreshInterval(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
                        <span>3 שניות</span>
                        <span>60 שניות (דקה)</span>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-xs text-amber-800 dark:text-amber-200">
                        <strong>הערה:</strong> המספר הוא בשניות בלבד. הערכים ירעננו כל {refreshInterval} שניות.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Onboarding & Tour Section */}
      {activeSection === 'onboarding' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 md:px-5 py-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <GraduationCap size={18} className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-100">הדרכה והכרת המערכת</h3>
              </div>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              {/* Reset Onboarding */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <div className="p-4 md:p-5 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <Rocket size={20} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-semibold text-slate-800 dark:text-white mb-1">
                        הפעל תהליך Onboarding מחדש
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
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
                    className="w-full md:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Rocket size={16} />
                    הפעל מחדש
                  </button>
                </div>
              </div>

              {/* Start Coachmarks Tour */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <div className="p-4 md:p-5 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <GraduationCap size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-semibold text-slate-800 dark:text-white mb-1">
                        הפעל מדריך מערכת
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
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
                    className="w-full md:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <GraduationCap size={16} />
                    התחל מדריך
                  </button>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-slate-600 dark:text-slate-400 text-xs font-medium">ℹ</span>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2 flex-1">
                    <p className="font-medium text-slate-700 dark:text-slate-300">מה ההבדל?</p>
                    <div className="space-y-2 pr-2">
                      <div>
                        <strong className="text-slate-700 dark:text-slate-200">תהליך Onboarding מחדש:</strong> מפעיל את כל תהליך ההתחלה מההתחלה - בחירת מטבע, הוספת נכס ראשון, וכו'. מתאים למשתמשים חדשים או למי שרוצה להתחיל מחדש.
                      </div>
                      <div>
                        <strong className="text-slate-700 dark:text-slate-200">מדריך מערכת:</strong> מדריך מודרך בין כל הדפים והפיצ'רים של המערכת. לא משנה נתונים, רק מסביר איך להשתמש במערכת.
                      </div>
                    </div>
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
