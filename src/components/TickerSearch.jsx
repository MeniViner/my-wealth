import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, AlertCircle, X, TrendingUp } from 'lucide-react';
import { searchAssets, POPULAR_INDICES } from '../services/marketDataService';

/**
 * TickerSearch Component
 * Smart autocomplete component for searching crypto and stock tickers
 * 
 * @param {string} type - Asset type: "crypto" | "us-stock" | "il-stock" | "stock" (legacy)
 * @param {Function} onSelect - Callback when user selects an asset: (asset) => void
 * @param {string} value - Current selected value (ticker symbol for controlled component)
 * @param {string} displayValue - Display name (Hebrew or full name) to show in input
 * @param {string} placeholder - Placeholder text
 * @param {boolean} allowManual - Allow manual entry if API fails (default: true)
 * @param {boolean} showCategorySelector - Show category selector tabs (default: true)
 * @param {string[]} allowedCategories - Array of allowed categories to show: ['us-stock', 'il-stock', 'index', 'crypto'] (default: all)
 */
const TickerSearch = ({
  type,
  onSelect,
  value = '',
  displayValue = '',
  placeholder = 'חפש טיקר...',
  allowManual = true,
  showCategorySelector = true,
  allowedCategories = ['us-stock', 'il-stock', 'index', 'crypto'] // Default: show all
  isEditing = false
}) => {
  // Category selector state - set initial to first allowed category
  const getInitialCategory = () => {
    if (allowedCategories.length > 0) {
      return allowedCategories[0];
    }
    return 'us-stock';
  };
  const [selectedCategory, setSelectedCategory] = useState(getInitialCategory());
  const [query, setQuery] = useState(displayValue && displayValue !== value ? `${displayValue} (${value})` : value || '');
  //const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedAsset, setSelectedAsset] = useState(null); // Track full selected asset info

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const prevAllowedCategoriesRef = useRef(JSON.stringify(allowedCategories));

  // Determine actual search type based on category selector or prop
  const actualSearchType = showCategorySelector ? selectedCategory : (type || 'us-stock');

  // Get placeholder based on category
  const getPlaceholder = () => {
    if (!showCategorySelector) return placeholder;

    switch (selectedCategory) {
      case 'crypto':
        return ' (BTC, ETH, SOL...) חפש מטבע קריפטו';
      case 'il-stock':
        return ' (POLI.TA, TEVA...) חפש מניה ישראלית';
      case 'index':
        return ' (S&P 500, ת"א 35, NASDAQ...) חפש מדד';
      case 'us-stock':
      default:
        return ' (AAPL, TSLA, SPY...) חפש מניה אמריקאית';
    }
  };

  // Load popular indices when INDEX category is selected
  useEffect(() => {
    if (selectedCategory === 'index' && !query) {
      // Show popular indices when no search query
      const popularIndices = POPULAR_INDICES.slice(0, 8).map(idx => ({
        ...idx,
        image: null,
        assetType: 'INDEX'
      }));
      setResults(popularIndices);
      setShowDropdown(true);
    }
  }, [selectedCategory, query]);

  // Debounced search function
  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchResults = await searchAssets(searchQuery.trim(), actualSearchType);
      setResults(searchResults);
      setShowDropdown(searchResults.length > 0);
      setSelectedIndex(-1);
    } catch (err) {
      console.error('Search error:', err);
      setError('שגיאה בחיפוש. נסה שוב או הזן ידנית.');
      setResults([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  }, [actualSearchType]);

  // Update selectedCategory when allowedCategories changes
  useEffect(() => {
    const currentAllowedStr = JSON.stringify(allowedCategories);
    const prevAllowedStr = prevAllowedCategoriesRef.current;

    // Only update if allowedCategories actually changed
    if (currentAllowedStr !== prevAllowedStr) {
      prevAllowedCategoriesRef.current = currentAllowedStr;

      if (allowedCategories.length > 0 && !allowedCategories.includes(selectedCategory)) {
        const firstAllowed = allowedCategories[0];
        setSelectedCategory(firstAllowed);
       // setQuery('');
        setResults([]);
        setShowDropdown(false);
        setSelectedIndex(-1);
        setSelectedAsset(null);
      //  onSelect(null);
      }
    }
  }, [allowedCategories, selectedCategory, onSelect]);

  // Handle category change - clear results and query
  const handleCategoryChange = (newCategory) => {
    setSelectedCategory(newCategory);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
    setSelectedAsset(null);
    // onSelect(null); // Clear selection when switching categories
    if (!isEditing) {
      onSelect(null);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setError(null);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If query is too short, clear results
    if (newQuery.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    // Set new timer for debounced search
    debounceTimerRef.current = setTimeout(() => {
      performSearch(newQuery);
    }, 500); // 500ms debounce
  };

  // Handle selection from dropdown
  const handleSelect = (asset) => {
    // Store the full asset info for display
    setSelectedAsset(asset);
    // Set query to display format (Hebrew name + ticker)
    const displayText = asset.nameHe || asset.name || asset.symbol;
    setQuery(`${displayText} (${asset.symbol})`);
    setShowDropdown(false);
    setResults([]);
    setSelectedIndex(-1);
    onSelect(asset);
  };

  // Handle manual entry (when user presses Enter or blurs without selecting)
  const handleManualEntry = () => {
    if (query.trim() && allowManual) {
      const manualAsset = {
        id: query.trim().toUpperCase(),
        symbol: query.trim().toUpperCase(),
        name: query.trim().toUpperCase(),
        image: null,
        marketDataSource: 'manual'
      };
      onSelect(manualAsset);
      setShowDropdown(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showDropdown || results.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        handleManualEntry();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        } else if (query.trim() && allowManual) {
          handleManualEntry();
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
        // If query exists and no selection was made, allow manual entry
        if (query.trim() && allowManual) {
          handleManualEntry();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [query, allowManual]);

  // Update query when value/displayValue props change (for controlled component)
  useEffect(() => {
    if (value) {
      // If we have a displayValue, show it with the symbol
     // if (displayValue && displayValue !== value) {
       // setQuery(`${displayValue} (${value})`);
    //  } else if (!query || !query.includes(value)) {
      //  setQuery(value);
     // }
      const expectedQuery = displayValue && displayValue !== value ? `${displayValue} (${value})` : value;
if (query !== expectedQuery) {
  setQuery(expectedQuery);
}
    } else {
      // If value is empty (e.g. cleared by parent), clear the query
      // check if query is not already empty to avoid infinite loops or unnecessary renders
      if (query) {
        setQuery('');
      }
    }
  }, [value, displayValue]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full">
      {/* Category Selector - Segmented Control */}
      {showCategorySelector && (
        <div className="mb-3 flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg flex-wrap">
          {allowedCategories.includes('us-stock') && (
            <button
              type="button"
              onClick={() => handleCategoryChange('us-stock')}
              className={`flex-1 min-w-[70px] px-2 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${selectedCategory === 'us-stock'
                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              מניות US
            </button>
          )}
          {allowedCategories.includes('il-stock') && (
            <button
              type="button"
              onClick={() => handleCategoryChange('il-stock')}
              className={`flex-1 min-w-[70px] px-2 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${selectedCategory === 'il-stock'
                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              מניות IL
            </button>
          )}
          {allowedCategories.includes('index') && (
            <button
              type="button"
              onClick={() => handleCategoryChange('index')}
              className={`flex-1 min-w-[70px] px-2 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${selectedCategory === 'index'
                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              מדדים
            </button>
          )}
          {allowedCategories.includes('crypto') && (
            <button
              type="button"
              onClick={() => handleCategoryChange('crypto')}
              className={`flex-1 min-w-[70px] px-2 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${selectedCategory === 'crypto'
                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              קריפטו
            </button>
          )}
        </div>
      )}

      <div className="relative">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Search size={18} />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={getPlaceholder()}
          className="w-full p-3 pl-10 pr-10 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono text-right focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
          dir="ltr"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setShowDropdown(false);
              setSelectedAsset(null);
              onSelect(null);
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400" dir="rtl">
          <AlertCircle size={14} />
          <span>{error}</span>
          {allowManual && (
            <span className="text-slate-500 dark:text-slate-400">(ניתן להזין ידנית)</span>
          )}
        </div>
      )}

      {/* Dropdown results */}
      {showDropdown && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-64 overflow-y-auto"
          dir="rtl"
        >
          {results.map((asset, index) => (
            <button
              key={`${asset.id}-${index}`}
              type="button"
              onClick={() => handleSelect(asset)}
              className={`w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-b-0 ${selectedIndex === index ? 'bg-slate-100 dark:bg-slate-700' : ''
                }`}
            >
              <div className="flex items-center gap-3">
                {asset.image && (
                  <img
                    src={asset.image}
                    alt={asset.name}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <div className="flex-1 text-right" dir="rtl">
                  <div className="flex items-center gap-2 justify-start">
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-right">
                      {asset.symbol}
                    </span>
                    {actualSearchType === 'crypto' && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                        קריפטו
                      </span>
                    )}
                    {actualSearchType === 'il-stock' && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                        ישראל
                      </span>
                    )}
                    {actualSearchType === 'us-stock' && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
                        ארה"ב
                      </span>
                    )}
                    {actualSearchType === 'index' && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded">
                        מדד
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 text-right" dir="rtl">
                    {/* For Israeli stocks and indices, show Hebrew name prominently */}
                    {(actualSearchType === 'il-stock' || actualSearchType === 'index') && asset.nameHe ? (
                      <div className="flex flex-col items-start">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{asset.nameHe}</span>
                        {asset.name && asset.name !== asset.nameHe && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">{asset.name}</span>
                        )}
                      </div>
                    ) : (
                      <span dir="rtl">{asset.name}</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}

          {allowManual && query.trim() && (
            <div className="border-t border-slate-200 dark:border-slate-700 p-2 bg-slate-50 dark:bg-slate-800">
              <button
                type="button"
                onClick={handleManualEntry}
                className="w-full text-right p-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors flex items-center justify-end gap-2"
              >
                <span className="font-mono text-right">{query.trim().toUpperCase()}</span>
                <span>הזן ידנית</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* No results message */}
      {showDropdown && !loading && results.length === 0 && query.trim().length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg p-4 text-center text-slate-500 dark:text-slate-400" dir="rtl">
          לא נמצאו תוצאות
          {allowManual && (
            <div className="mt-2">
              <button
                type="button"
                onClick={handleManualEntry}
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
              >
                הזן ידנית: {query.trim().toUpperCase()}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TickerSearch;

