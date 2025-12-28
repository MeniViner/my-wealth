import { NavLink } from 'react-router-dom';
import { Wallet, LayoutDashboard, Sparkles, Database, Plus, Settings, BarChart3 } from 'lucide-react';

const Layout = ({ children, totalWealth, currencyRate }) => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans text-right" dir="rtl">
      <aside className="w-full md:w-64 bg-slate-900 text-white p-6 flex flex-col shadow-xl z-20 sticky top-0 md:h-screen">
        <h1 className="text-2xl font-bold mb-10 flex items-center gap-2 tracking-tight">
          <Wallet className="w-8 h-8 text-emerald-400" />
          MyWealth <span className="text-xs bg-purple-600 px-1.5 py-0.5 rounded text-white flex items-center gap-1">
            <Sparkles size={10} />PRO
          </span>
        </h1>
        <nav className="flex-1 space-y-3">
          <NavLink 
            to="/"
            className={({ isActive }) => 
              `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${
                isActive 
                  ? 'bg-emerald-600 text-white' 
                  : 'hover:bg-slate-800 text-slate-400'
              }`
            }
          >
            <LayoutDashboard size={20} /> דשבורד
          </NavLink>
          <NavLink 
            to="/advisor"
            className={({ isActive }) => 
              `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${
                isActive 
                  ? 'bg-purple-600 text-white' 
                  : 'hover:bg-slate-800 text-slate-400'
              }`
            }
          >
            <Sparkles size={20} /> יועץ AI
          </NavLink>
          <NavLink 
            to="/assets"
            className={({ isActive }) => 
              `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${
                isActive 
                  ? 'bg-emerald-600 text-white' 
                  : 'hover:bg-slate-800 text-slate-400'
              }`
            }
          >
            <Database size={20} /> ניהול נכסים
          </NavLink>
          <NavLink 
            to="/assets/add"
            className={({ isActive }) => 
              `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${
                isActive 
                  ? 'bg-emerald-600 text-white' 
                  : 'hover:bg-slate-800 text-slate-400'
              }`
            }
          >
            <Plus size={20} /> הוספת נכס
          </NavLink>
          <NavLink 
            to="/chart-builder"
            className={({ isActive }) => 
              `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${
                isActive 
                  ? 'bg-emerald-600 text-white' 
                  : 'hover:bg-slate-800 text-slate-400'
              }`
            }
          >
            <BarChart3 size={20} /> בונה גרפים
          </NavLink>
          <NavLink 
            to="/settings"
            className={({ isActive }) => 
              `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${
                isActive 
                  ? 'bg-slate-700 text-white' 
                  : 'hover:bg-slate-800 text-slate-400'
              }`
            }
          >
            <Settings size={20} /> הגדרות
          </NavLink>
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="text-xs text-slate-500 mb-1">סה"כ הון עצמי</div>
          <div className="text-xl font-bold text-emerald-400">₪{totalWealth.toLocaleString()}</div>
          <div className="text-xs text-slate-600 mt-2">1$ = ₪{currencyRate.rate}</div>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50/50">
        {children}
      </main>
    </div>
  );
};

export default Layout;

