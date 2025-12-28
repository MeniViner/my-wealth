import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Wallet, LayoutDashboard, Sparkles, Database, Plus, Settings, BarChart3, LogOut, User, Shield, LayoutGrid, Scale, Eye, EyeOff, Menu, X, Moon, Sun } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAdmin } from '../hooks/useAdmin';
import { useDarkMode } from '../hooks/useDarkMode';
import { confirmAlert } from '../utils/alerts';

const Layout = ({ children, totalWealth, currencyRate, user }) => {
  const { signOut } = useAuth();
  const { isAdmin } = useAdmin(user);
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [isWealthVisible, setIsWealthVisible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    const confirmed = await confirmAlert(
      'התנתקות',
      'האם אתה בטוח שברצונך להתנתק?',
      'question'
    );
    if (confirmed) {
      try {
        await signOut();
      } catch (error) {
        console.error('Sign out error:', error);
      }
    }
  };
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-900 font-sans text-right overflow-x-hidden" dir="rtl">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-lg hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
        aria-label="תפריט"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Dark Mode Toggle - Mobile */}
      <button
        onClick={toggleDarkMode}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-lg hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
        aria-label="מצב כהה"
      >
        {isDarkMode ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} />}
      </button>

      <aside className={`${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0 fixed md:fixed md:top-0 md:right-0 w-64 bg-slate-900 dark:bg-slate-950 text-white p-4 md:p-6 flex flex-col shadow-xl z-40 md:z-20 transition-transform duration-300 md:transition-none h-screen`}>
        <div className="flex items-center justify-between mb-6 md:mb-10">
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2 tracking-tight">
            <Wallet className="w-6 h-6 md:w-8 md:h-8 text-emerald-400" />
            MyWealth 
          </h1>
          {/* Dark Mode Toggle - Desktop */}
          <button
            onClick={toggleDarkMode}
            className="hidden md:flex p-2 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="מצב כהה"
          >
            {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
          </button>
          {/* Close button for mobile */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-2 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="סגור תפריט"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 space-y-2 md:space-y-3 overflow-y-auto custom-scrollbar">
          <NavLink 
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) => 
              `w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition font-medium text-sm md:text-base ${
                isActive 
                  ? 'bg-emerald-600 dark:bg-emerald-700 text-white' 
                  : 'hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-300'
              }`
            }
          >
            <LayoutDashboard size={20} /> דשבורד ראשי
          </NavLink>
          <NavLink 
            to="/dashboard/custom"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) => 
              `w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition font-medium text-sm md:text-base ${
                isActive 
                  ? 'bg-emerald-600 dark:bg-emerald-700 text-white' 
                  : 'hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-300'
              }`
            }
          >
            <LayoutGrid size={20} /> דשבורד מותאם
          </NavLink>
          <NavLink 
            to="/advisor"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) => 
              `w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition font-medium text-sm md:text-base ${
                isActive 
                  ? 'bg-purple-600 dark:bg-purple-700 text-white' 
                  : 'hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-300'
              }`
            }
          >
            <Sparkles size={20} /> יועץ AI
          </NavLink>
          <NavLink 
            to="/assets"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) => 
              `w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition font-medium text-sm md:text-base ${
                isActive 
                  ? 'bg-emerald-600 dark:bg-emerald-700 text-white' 
                  : 'hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-300'
              }`
            }
          >
            <Database size={20} /> ניהול נכסים
          </NavLink>
          <NavLink 
            to="/assets/add"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) => 
              `w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition font-medium text-sm md:text-base ${
                isActive 
                  ? 'bg-emerald-600 dark:bg-emerald-700 text-white' 
                  : 'hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-300'
              }`
            }
          >
            <Plus size={20} /> הוספת נכס
          </NavLink>
          <NavLink 
            to="/chart-builder"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) => 
              `w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition font-medium text-sm md:text-base ${
                isActive 
                  ? 'bg-emerald-600 dark:bg-emerald-700 text-white' 
                  : 'hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-300'
              }`
            }
          >
            <BarChart3 size={20} /> בונה גרפים
          </NavLink>
          <NavLink 
            to="/rebalancing"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) => 
              `w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition font-medium text-sm md:text-base ${
                isActive 
                  ? 'bg-emerald-600 dark:bg-emerald-700 text-white' 
                  : 'hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-300'
              }`
            }
          >
            <Scale size={20} /> איזון תיק
          </NavLink>
          <NavLink 
            to="/settings"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) => 
              `w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition font-medium text-sm md:text-base ${
                isActive 
                  ? 'bg-slate-700 dark:bg-slate-600 text-white' 
                  : 'hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-300'
              }`
            }
          >
            <Settings size={20} /> הגדרות
          </NavLink>
          {isAdmin && (
            <NavLink 
              to="/admin/users"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => 
                `w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition font-medium text-sm md:text-base ${
                  isActive 
                    ? 'bg-purple-600 dark:bg-purple-700 text-white' 
                    : 'hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-300'
                }`
              }
            >
              <Shield size={20} /> ניהול משתמשים
            </NavLink>
          )}
        </nav>
        <div className="mt-auto pt-4 md:pt-6 border-t border-slate-800 dark:border-slate-700 space-y-3 md:space-y-4">
          {/* User Info */}
          {user && (
            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'משתמש'} 
                  className="w-7 h-7 md:w-8 md:h-8 rounded-full"
                />
              ) : (
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                  <User size={14} className="md:w-4 md:h-4 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs md:text-sm font-medium text-white truncate">
                  {user.displayName || user.email || 'משתמש'}
                </div>
                {user.email && (
                  <div className="text-[10px] md:text-xs text-slate-400 truncate">{user.email}</div>
                )}
              </div>
            </div>
          )}
          
          {/* Wealth Summary */}
          <div className="mb-3 md:mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-[10px] md:text-xs text-slate-500">סה"כ הון עצמי</div>
              <button
                onClick={() => setIsWealthVisible(!isWealthVisible)}
                className="text-slate-400 hover:text-slate-300 transition-colors p-1 rounded hover:bg-slate-800 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center flex-shrink-0"
                title={isWealthVisible ? 'הסתר' : 'הצג'}
              >
                {isWealthVisible ? <Eye size={10} className="md:w-3 md:h-3" /> : <EyeOff size={10} className="md:w-3 md:h-3" />}
              </button>
            </div>
            <div className="text-lg md:text-xl font-bold text-emerald-400">
              {isWealthVisible ? `₪${totalWealth.toLocaleString()}` : '••••••'}
            </div>
            <div className="text-[10px] md:text-xs text-slate-600 dark:text-slate-400 mt-1 md:mt-2">1$ = ₪{currencyRate.rate}</div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition font-medium bg-slate-800 dark:bg-slate-700 hover:bg-red-600 dark:hover:bg-red-700 text-slate-300 dark:text-slate-200 hover:text-white text-sm md:text-base"
          >
            <LogOut size={16} className="md:w-[18px] md:h-[18px]" /> התנתק
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 dark:bg-black/70 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <main className="flex-1 p-4 md:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen md:mr-64">
        {children}
      </main>
    </div>
  );
};

export default Layout;

