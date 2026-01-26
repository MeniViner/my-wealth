import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { generateRandomColor } from '../../../constants/defaults';
import { successToast } from '../../../utils/alerts';
import TickerSearch from '../../../components/TickerSearch';

// Modal for Adding/Editing Source Items
const SourceItemModal = ({ isOpen, onClose, type, editingItem, onSave, systemData }) => {
    const [name, setName] = useState('');
    const [color, setColor] = useState('#3b82f6');
    const isSymbols = type === 'symbols';
    const isEditing = !!editingItem;

    useEffect(() => {
        if (isOpen) {
            if (editingItem) {
                setName(editingItem.name);
                setColor(editingItem.color);
            } else {
                setName('');
                setColor(generateRandomColor());
            }
        }
    }, [isOpen, editingItem]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        const trimmedValue = isSymbols ? name.trim().toUpperCase() : name.trim();
        const data = systemData[type] || [];

        // Check if already exists (only if not editing or name changed)
        if (!isEditing || trimmedValue !== editingItem.originalName) {
            const exists = data.some(item => {
                const itemName = (isSymbols && typeof item === 'string') ? item : item.name;
                return itemName === trimmedValue;
            });
            if (exists) {
                successToast('הפריט כבר קיים', 1500);
                return;
            }
        }

        onSave(trimmedValue, color);
    };

    if (!isOpen || !type) return null;

    const getTypeTitle = (t) => {
        switch (t) {
            case 'categories': return 'אפיקי השקעה';
            case 'platforms': return 'חשבונות וארנקים';
            case 'instruments': return 'מטבעות בסיס';
            // case 'symbols': return 'נכסים למעקב';
            default: return '';
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-800 w-full md:w-full md:max-w-md rounded-t-3xl md:rounded-2xl shadow-2xl animate-slide-up md:animate-fade-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {isEditing ? 'ערוך' : 'הוסף'} {getTypeTitle(type)}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition text-slate-500 dark:text-slate-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Color Picker */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                            צבע
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="color"
                                value={color}
                                onChange={e => setColor(e.target.value)}
                                className="w-16 h-16 rounded-xl cursor-pointer border-2 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition shadow-sm"
                            />
                            <div className="flex-1">
                                <div
                                    className="w-full h-12 rounded-lg shadow-sm"
                                    style={{ backgroundColor: color }}
                                />
                                <input
                                    type="text"
                                    value={color}
                                    onChange={e => setColor(e.target.value)}
                                    className="mt-2 w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-mono bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    placeholder="#3b82f6"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Name Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                            שם
                        </label>
                        {isSymbols ? (
                            <TickerSearch
                                type="us-stock"
                                value={name}
                                onSelect={(asset) => {
                                    if (asset) {
                                        setName(asset.symbol.toUpperCase());
                                    } else {
                                        setName('');
                                    }
                                }}
                                allowManual={true}
                                showCategorySelector={true}
                            />
                        ) : (
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="הכנס שם..."
                                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-base outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                autoFocus
                            />
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition font-medium"
                        >
                            ביטול
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-xl transition font-medium disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                        >
                            {isEditing ? 'שמור שינויים' : 'הוסף'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SourceItemModal;
