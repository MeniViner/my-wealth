import { Calculator, CreditCard } from 'lucide-react';

/**
 * AssetModeSelector - Visual selector for quantity tracking vs static value
 * Replaces technical radio buttons with user-friendly cards
 */
const AssetModeSelector = ({ value, onChange, disabled = false }) => {
    const modes = [
        {
            value: 'QUANTITY',
            icon: Calculator,
            title: 'מעקב אוטומטי',
            description: 'המערכת תחשב ערך לפי כמות × מחיר שוק נוכחי',
            badge: 'מומלץ'
        },
        {
            value: 'LEGACY',
            icon: CreditCard,
            title: 'ערך קבוע',
            description: 'אתה מזין ערך סטטי שלא ישתנה'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {modes.map((mode) => {
                const Icon = mode.icon;
                const isSelected = value === mode.value;

                return (
                    <button
                        key={mode.value}
                        type="button"
                        onClick={() => !disabled && onChange(mode.value)}
                        disabled={disabled}
                        className={`
              relative p-4 rounded-xl border-2 transition-all text-right
              ${isSelected
                                ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                            }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
                    >
                        {mode.badge && isSelected && (
                            <span className="absolute top-2 left-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">
                                {mode.badge}
                            </span>
                        )}

                        <div className="flex items-start gap-3">
                            <Icon
                                className={`mt-0.5 flex-shrink-0 ${isSelected
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-slate-400 dark:text-slate-500'
                                    }`}
                                size={20}
                            />
                            <div className="flex-1 min-w-0">
                                <div className={`font-semibold text-base mb-1 ${isSelected
                                        ? 'text-emerald-900 dark:text-emerald-100'
                                        : 'text-slate-900 dark:text-white'
                                    }`}>
                                    {mode.title}
                                </div>
                                <div className={`text-xs leading-relaxed ${isSelected
                                        ? 'text-emerald-700 dark:text-emerald-300'
                                        : 'text-slate-500 dark:text-slate-400'
                                    }`}>
                                    {mode.description}
                                </div>
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

export default AssetModeSelector;
