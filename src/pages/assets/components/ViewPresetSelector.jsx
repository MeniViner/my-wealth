import { useState } from 'react';
import { ChevronDown, Settings } from 'lucide-react';

const VIEW_PRESETS = {
    compact: {
        label: 'תצוגה מצומצמת',
        columns: {
            name: true,
            symbol: true,
            instrument: false,
            platform: false,
            category: false,
            tags: false,
            value: true,
            quantity: true,
            purchasePrice: true,
            profitLoss: true
        }
    },
    detailed: {
        label: 'תצוגה מפורטת',
        columns: {
            name: true,
            symbol: true,
            instrument: false,
            platform: false,
            category: false,
            tags: true,
            value: true,
            quantity: true,
            purchasePrice: true,
            profitLoss: true
        }
    },
    plFocus: {
        label: 'מיקוד רווח/הפסד',
        columns: {
            name: true,
            symbol: false,
            instrument: false,
            platform: true,
            category: false,
            tags: false,
            value: true,
            quantity: false,
            purchasePrice: false,
            profitLoss: true
        }
    }
};

const ViewPresetSelector = ({ value, onChange, onCustomize }) => {
    const [isOpen, setIsOpen] = useState(false);

    const currentPreset = VIEW_PRESETS[value] || VIEW_PRESETS.compact;

    return (
        <div className="flex items-center gap-2">
            {/* Preset Selector */}
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                >
                    <span className="hidden sm:inline">תצוגה:</span>
                    <span>{currentPreset.label}</span>
                    <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Dropdown Menu */}
                        <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-20 overflow-hidden">
                            {Object.entries(VIEW_PRESETS).map(([key, preset]) => (
                                <button
                                    key={key}
                                    onClick={() => {
                                        onChange(key);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-right px-4 py-2.5 text-sm transition-colors ${value === key
                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-medium'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Custom Columns Button */}
            <button
                onClick={onCustomize}
                className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                title="התאמה אישית של עמודות"
            >
                <Settings size={18} />
            </button>
        </div>
    );
};

export { ViewPresetSelector, VIEW_PRESETS };
export default ViewPresetSelector;
