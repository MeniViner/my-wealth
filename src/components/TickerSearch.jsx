import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, AlertCircle, X } from 'lucide-react';
import { searchAssets } from '../services/marketDataService';

/**
 * TickerSearch Component
 * Smart autocomplete component for searching crypto and stock tickers
 * 
 * @param {string} type - Asset type: "crypto" | "stock"
 * @param {Function} onSelect - Callback when user selects an asset: (asset) => void
 * @param {string} value - Current selected value (for controlled component)
 * @param {string} placeholder - Placeholder text
 * @param {boolean} allowManual - Allow manual entry if API fails (default: true)
 */
const TickerSearch = ({ 
  type, 
  onSelect, 
  value = '', 
  placeholder = 'חפש טיקר...',
  allowManual = true 
}) => {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceTimerRef = useRef(null);

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
      const searchResults = await searchAssets(searchQuery.trim(), type);
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
  }, [type]);

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
    setQuery(asset.symbol);
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

  // Update query when value prop changes (for controlled component)
  useEffect(() => {
    if (value !== query) {
      setQuery(value || '');
    }
  }, [value]);

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
      <div className="relative">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
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
          placeholder={placeholder}
          className="w-full p-3 pr-10 border rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
          dir="ltr"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setShowDropdown(false);
              onSelect(null);
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-center gap-2 text-sm text-amber-600">
          <AlertCircle size={14} />
          <span>{error}</span>
          {allowManual && (
            <span className="text-slate-500">(ניתן להזין ידנית)</span>
          )}
        </div>
      )}

      {/* Dropdown results */}
      {showDropdown && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {results.map((asset, index) => (
            <button
              key={`${asset.id}-${index}`}
              type="button"
              onClick={() => handleSelect(asset)}
              className={`w-full text-right p-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 ${
                selectedIndex === index ? 'bg-slate-100' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {asset.image && (
                  <img
                    src={asset.image}
                    alt={asset.name}
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <div className="flex-1 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="font-bold text-slate-900 font-mono">
                      {asset.symbol}
                    </span>
                    {type === 'crypto' && (
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {type === 'crypto' ? 'קריפטו' : 'מניה'}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 mt-0.5">
                    {asset.name}
                  </div>
                </div>
              </div>
            </button>
          ))}
          
          {allowManual && query.trim() && (
            <div className="border-t border-slate-200 p-2 bg-slate-50">
              <button
                type="button"
                onClick={handleManualEntry}
                className="w-full text-right p-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
              >
                <span className="font-mono">{query.trim().toUpperCase()}</span>
                <span className="mr-2">הזן ידנית</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* No results message */}
      {showDropdown && !loading && results.length === 0 && query.trim().length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-4 text-center text-slate-500">
          לא נמצאו תוצאות
          {allowManual && (
            <div className="mt-2">
              <button
                type="button"
                onClick={handleManualEntry}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
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

