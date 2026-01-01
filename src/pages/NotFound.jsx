import { useNavigate } from 'react-router-dom';
import { Home, ArrowRight } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-6" dir="rtl">
      <div className="text-center max-w-md w-full">
        <div className="mb-6">
          <h1 className="text-8xl font-bold text-slate-300 dark:text-slate-700 mb-4">404</h1>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
            הדף לא נמצא
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            הדף שחיפשת לא קיים או הועבר למיקום אחר.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
          >
            <Home className="w-5 h-5" />
            חזור לדף הבית
          </button>
          
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg transition-colors font-medium"
          >
            <ArrowRight className="w-5 h-5" />
            חזור אחורה
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
