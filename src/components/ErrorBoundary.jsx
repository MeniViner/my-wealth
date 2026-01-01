import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

class ErrorBoundaryClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Default fallback UI
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
          onGoHome={this.props.onGoHome}
          title={this.props.title || 'שגיאה בטעינת הרכיב'}
          message={this.props.message || 'אירעה שגיאה בטעינת הרכיב. אנא נסה לרענן או לחזור לדף הבית.'}
        />
      );
    }

    return this.props.children;
  }
}

// User-friendly fallback component
const ErrorFallback = ({ error, onReset, onGoHome, title, message }) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      navigate('/');
    }
    if (onReset) {
      onReset();
    }
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
          {title}
        </h2>
        
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          {message}
        </p>

        {import.meta.env.DEV && error && (
          <details className="mb-6 text-right">
            <summary className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer mb-2">
              פרטי שגיאה (מצב פיתוח)
            </summary>
            <pre className="text-xs bg-slate-100 dark:bg-slate-900 p-3 rounded mt-2 overflow-auto max-h-40 text-slate-700 dark:text-slate-300">
              {error.toString()}
              {error.stack && `\n${error.stack}`}
            </pre>
          </details>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onReset && (
            <button
              onClick={onReset}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              נסה שוב
            </button>
          )}
          
          <button
            onClick={handleGoHome}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg transition-colors font-medium text-sm"
          >
            <Home className="w-4 h-4" />
            חזור לדף הבית
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook-based wrapper for easier usage
export const ErrorBoundary = ({ children, ...props }) => {
  return <ErrorBoundaryClass {...props}>{children}</ErrorBoundaryClass>;
};

export default ErrorBoundary;
