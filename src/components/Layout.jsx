import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Wallet, LayoutDashboard, Sparkles, Database, Plus, Settings, BarChart3, LogOut, User, Shield, LayoutGrid, Scale, Eye, EyeOff, Menu, X, Moon, Sun } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAdmin } from '../hooks/useAdmin';
import { useDarkMode } from '../hooks/useDarkMode';
import { confirmAlert } from '../utils/alerts';

const Layout = ({ children, totalWealth, currencyRate, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { isAdmin } = useAdmin(user);
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  // Load wealth visibility from localStorage
  const [isWealthVisible, setIsWealthVisible] = useState(() => {
    const saved = localStorage.getItem('wealthVisibility');
    return saved !== null ? saved === 'true' : true;
  });
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Save wealth visibility to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('wealthVisibility', isWealthVisible.toString());
    // Dispatch custom event to sync with other components
    window.dispatchEvent(new Event('wealthVisibilityChange'));
  }, [isWealthVisible]);
  
  // Listen for changes from other components
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('wealthVisibility');
      if (saved !== null) {
        setIsWealthVisible(saved === 'true');
      }
    };
    
    // Listen to custom event
    window.addEventListener('wealthVisibilityChange', handleStorageChange);
    // Listen to storage event (for cross-tab sync)
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('wealthVisibilityChange', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // Check if current route is AI Advisor (needs full height)
  const isAdvisorPage = location.pathname === '/advisor';

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
    <div className="min-h-[100svh] md:min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-900 font-sans text-right overflow-x-hidden" dir="rtl">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed top-4 right-4 z-[70] p-2 bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-lg hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
        aria-label="תפריט"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0 fixed md:fixed md:top-0 md:right-0 w-72 md:w-64 bg-gradient-to-b from-slate-900 to-slate-950 dark:from-slate-950 dark:to-black text-white p-5 md:p-6 flex flex-col shadow-2xl z-[60] md:z-20 transition-transform duration-300 md:transition-none h-[100svh] md:h-screen`}>
        {/* Mobile Header - Only on Desktop */}
        <div className="hidden md:flex items-center justify-between mb-6 md:mb-10 ">
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2 tracking-tight">
            <Wallet className="w-6 h-6 md:w-8 md:h-8 text-emerald-400" />
            MyWealth
          </h1>
          {/* החלף מצב כהה - שולחן עבודה */}
          <button
            onClick={toggleDarkMode}
            className="p-2 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="מצב כהה"
          >
            {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
          </button>
        </div>

        {/* Mobile Header - Only on Mobile */}
        <div className="md:hidden flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold flex items-center gap-3 mr-10 font-hebrew">
              <Wallet className="w-8 h-8 text-emerald-400 flex-shrink-0" />
              <span>MyWealth</span>
            </h1>
          </div>
          {/* <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2.5 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
            aria-label="סגור תפריט"
          >
            <X size={20} />
          </button> */}
          <button
            onClick={toggleDarkMode}
            className="p-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-all shadow-lg"
            aria-label="מצב כהה"
          >
            {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
          </button>
        </div>
        <nav className="flex-1 space-y-2 md:space-y-3 overflow-y-auto custom-scrollbar -mx-1 px-1">
          <NavLink
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `w-full flex items-center gap-4 px-5 py-4 md:py-3 rounded-xl transition-all font-semibold text-base md:text-base ${isActive
                ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
                : 'hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-300 dark:text-slate-300 hover:text-white'
              }`
            }
          >
            <LayoutDashboard size={22} className="flex-shrink-0" /> <span className="font-hebrew">דשבורד ראשי</span>
          </NavLink>
          <NavLink
            to="/dashboard/custom"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `w-full flex items-center gap-4 px-5 py-4 md:py-3 rounded-xl transition-all font-semibold text-base md:text-base ${isActive
                ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
                : 'hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-300 dark:text-slate-300 hover:text-white'
              }`
            }
          >
            <LayoutGrid size={22} className="flex-shrink-0" /> <span className="font-hebrew">דשבורד מותאם</span>
          </NavLink>
          <NavLink
            to="/advisor"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `w-full flex items-center gap-4 px-5 py-4 md:py-3 rounded-xl transition-all font-semibold text-base md:text-base ${isActive
                ? 'bg-purple-600 dark:bg-purple-700 text-white shadow-lg shadow-purple-500/20'
                : 'hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-300 dark:text-slate-300 hover:text-white'
              }`
            }
          >
            <Sparkles size={22} className="flex-shrink-0" /> <span className="font-hebrew">יועץ AI</span>
          </NavLink>
          <NavLink
            to="/assets"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `w-full flex items-center gap-4 px-5 py-4 md:py-3 rounded-xl transition-all font-semibold text-base md:text-base ${isActive
                ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
                : 'hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-300 dark:text-slate-300 hover:text-white'
              }`
            }
          >
            <Database size={22} className="flex-shrink-0" /> <span className="font-hebrew">ניהול נכסים</span>
          </NavLink>
          {/* <NavLink
            to="/assets/add"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `w-full flex items-center gap-4 px-5 py-4 md:py-3 rounded-xl transition-all font-semibold text-base md:text-base ${isActive
                ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
                : 'hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-300 dark:text-slate-300 hover:text-white'
              }`
            }
          >
            <Plus size={22} className="flex-shrink-0" /> <span className="font-hebrew">הוספת נכס</span>
          </NavLink> */}
          <NavLink
            to="/chart-builder"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `w-full flex items-center gap-4 px-5 py-4 md:py-3 rounded-xl transition-all font-semibold text-base md:text-base ${isActive
                ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
                : 'hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-300 dark:text-slate-300 hover:text-white'
              }`
            }
          >
            <BarChart3 size={22} className="flex-shrink-0" /> <span className="font-hebrew">בונה גרפים</span>
          </NavLink>
          <NavLink
            to="/rebalancing"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `w-full flex items-center gap-4 px-5 py-4 md:py-3 rounded-xl transition-all font-semibold text-base md:text-base ${isActive
                ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
                : 'hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-300 dark:text-slate-300 hover:text-white'
              }`
            }
          >
            <Scale size={22} className="flex-shrink-0" /> <span className="font-hebrew">איזון תיק</span>
          </NavLink>
          <NavLink
            to="/settings"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `w-full flex items-center gap-4 px-5 py-4 md:py-3 rounded-xl transition-all font-semibold text-base md:text-base ${isActive
                ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-lg'
                : 'hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-300 dark:text-slate-300 hover:text-white'
              }`
            }
          >
            <Settings size={22} className="flex-shrink-0" /> <span className="font-hebrew">הגדרות</span>
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/admin/users"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `w-full flex items-center gap-4 px-5 py-4 md:py-3 rounded-xl transition-all font-semibold text-base md:text-base ${isActive
                  ? 'bg-purple-600 dark:bg-purple-700 text-white shadow-lg shadow-purple-500/20'
                  : 'hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-300 dark:text-slate-300 hover:text-white'
                }`
              }
            >
              <Shield size={22} className="flex-shrink-0" /> <span className="font-hebrew">ניהול משתמשים</span>
            </NavLink>
          )}
        </nav>
        <div className="mt-auto pt-4 md:pt-6 border-t border-slate-800 dark:border-slate-700 space-y-3 md:space-y-4">
          {/* User Info */}
          {user && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/profile');
              }}
              className="w-full flex items-center gap-3 mb-3 md:mb-4 p-3 rounded-xl bg-slate-800/50 dark:bg-slate-800/30 hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors text-right"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'משתמש'}
                  className="w-9 h-9 md:w-10 md:h-10 rounded-full ring-2 ring-emerald-500/30 flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-emerald-500/30 flex-shrink-0">
                  <User size={16} className="md:w-5 md:h-5 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-base md:text-base font-semibold text-white truncate font-hebrew">
                  {user.displayName || user.email || 'משתמש'}
                </div>
                {user.email && (
                  <div className="text-sm text-slate-400 truncate font-sans">{user.email}</div>
                )}
              </div>
            </button>
          )}

          {/* Wealth Summary */}
          <div className="mb-3 md:mb-4 p-4 rounded-xl bg-slate-800/50 dark:bg-slate-800/30">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm md:text-sm text-slate-400 font-hebrew">סה"כ הון עצמי</div>
              <button
                onClick={() => setIsWealthVisible(!isWealthVisible)}
                className="text-slate-400 hover:text-slate-300 transition-colors p-1.5 rounded-lg hover:bg-slate-700"
                title={isWealthVisible ? 'הסתר' : 'הצג'}
              >
                {isWealthVisible ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            <div className="text-2xl md:text-2xl font-bold text-emerald-400 mb-1 font-hebrew">
              {isWealthVisible ? `₪${totalWealth.toLocaleString()}` : '••••••'}
            </div>
            <div className="text-xs text-slate-500 font-sans">1$ = ₪{currencyRate.rate}</div>
          </div>

         
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 dark:bg-black/70 z-[55]"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <main className={`flex-1 ${isAdvisorPage ? 'p-0' : 'p-4 md:p-8'} bg-slate-50 dark:bg-slate-900 ${isAdvisorPage ? 'h-[100svh] md:h-screen' : 'min-h-[100svh] md:min-h-screen'} md:mr-64 overflow-hidden`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;

