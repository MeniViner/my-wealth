import { Edit2, Trash2, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Item Component
const SortableSourceItem = ({ item, type, isSymbols, itemName, itemColor, onEdit, onDelete, isFixed }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: itemName });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group px-4 md:px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors ${isDragging ? 'z-50' : ''}`}
        >
            <div className="flex items-center justify-between gap-4">
                {/* Left: Drag Handle + Color + Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 touch-none"
                        aria-label="גרור לשנות סדר"
                    >
                        <GripVertical size={20} />
                    </button>
                    <div
                        className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm ring-2 ring-white dark:ring-slate-800"
                        style={{
                            backgroundColor: itemColor,
                            boxShadow: `0 0 0 2px ${itemColor}20, 0 2px 8px ${itemColor}40`
                        }}
                    />
                    <span className={`text-base font-medium text-slate-900 dark:text-white truncate ${isSymbols ? 'font-mono' : ''}`}>
                        {itemName}
                    </span>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onEdit(type, item)}
                        className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-all"
                        title="ערוך"
                    >
                        <Edit2 size={18} />
                    </button>
                    {!isFixed && (
                        <button
                            onClick={() => onDelete(type, itemName)}
                            className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-all"
                            title="מחק"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SortableSourceItem;
