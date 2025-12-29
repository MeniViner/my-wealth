import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * CustomSelect - מעוצב Select component עם תמיכה בדארק מוד
 * 
 * @param {Object} props
 * @param {string} value - הערך הנבחר
 * @param {Function} onChange - callback כשמשנים את הערך: (value) => void
 * @param {Array} options - רשימת אופציות: [{value: string, label: string, ...}]
 * @param {string} placeholder - טקסט placeholder
 * @param {string} className - classes נוספים
 * @param {boolean} disabled - האם disabled
 * @param {React.ReactNode} icon - אייקון להצגה משמאל
 * @param {string} iconColor - צבע האייקון (אם icon הוא div עם צבע)
 */
const CustomSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'בחר...',
  className = '',
  disabled = false,
  icon = null,
  iconColor = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;

      const currentIndex = options.findIndex(opt => opt.value === value);
      let newIndex = currentIndex;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          newIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
          onChange(options[newIndex].value);
          break;
        case 'ArrowUp':
          event.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
          onChange(options[newIndex].value);
          break;
        case 'Enter':
          event.preventDefault();
          setIsOpen(false);
          break;
        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          break;
        default:
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, value, options, onChange]);

  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  const isSmall = className.includes('text-xs');
  const baseClasses = className.split(' ').filter(c => !c.startsWith('text-') && !c.startsWith('min-w-') && !c.startsWith('w-')).join(' ');
  
  return (
    <div className={`relative ${baseClasses}`} dir="rtl">
      <button
        type="button"
        ref={selectRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2
          px-3 ${isSmall ? 'py-2' : 'py-2.5'}
          border border-slate-200 dark:border-slate-600
          rounded-lg
          bg-white dark:bg-slate-700
          text-slate-900 dark:text-slate-100
          ${isSmall ? 'text-xs' : 'text-sm'}
          transition-all
          focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
          hover:border-slate-300 dark:hover:border-slate-500
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen ? 'ring-2 ring-emerald-500 border-emerald-500' : ''}
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {icon && (
            <div className="flex-shrink-0">
              {typeof icon === 'string' || iconColor ? (
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: iconColor || icon }}
                />
              ) : (
                icon
              )}
            </div>
          )}
          <span className={`truncate ${!selectedOption ? 'text-slate-400 dark:text-slate-500' : ''}`}>
            {displayLabel}
          </span>
        </div>
        <ChevronDown 
          size={18} 
          className={`flex-shrink-0 text-slate-400 dark:text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-auto"
          dir="rtl"
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 text-center">
              אין אופציות זמינות
            </div>
          ) : (
            <div className="py-1">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full flex items-center justify-between gap-2
                      px-3 ${isSmall ? 'py-1.5' : 'py-2'}
                      ${isSmall ? 'text-xs' : 'text-sm'}
                      text-right
                      transition-colors
                      ${isSelected 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium' 
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {option.icon && (
                        <div className="flex-shrink-0">
                          {typeof option.icon === 'string' || option.iconColor ? (
                            <div 
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: option.iconColor || option.icon }}
                            />
                          ) : (
                            option.icon
                          )}
                        </div>
                      )}
                      <span className="truncate">{option.label}</span>
                    </div>
                    {isSelected && (
                      <Check size={16} className="flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;

