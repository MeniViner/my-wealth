import { useState } from 'react';
import { Plus, ChevronUp, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { FIXED_INSTRUMENTS, FIXED_CATEGORIES, FIXED_SUBCATEGORIES } from '../../../constants/defaults';
import SortableSourceItem from './SortableSourceItem';
import SourceItemModal from './SourceItemModal';

// Modern Sources Configuration Component
const SourcesConfiguration = ({ systemData, onAdd, onUpdate, onDelete, onReorder, getSourceTypeTitle, getSourceTypeDescription, getSourceTypeIcon }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [editType, setEditType] = useState(null);
    const [expandedSections, setExpandedSections] = useState(new Set()); // All expanded by default
    const [activeId, setActiveId] = useState(null);

    // Sensors for drag and drop (mobile-friendly)
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement before drag starts (prevents accidental drags)
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const openAddModal = (type) => {
        setModalType(type);
        setEditingItem(null);
        setModalOpen(true);
    };

    const openEditModal = (type, item) => {
        setModalType(type);
        setEditType(type);
        const itemName = (type === 'symbols' && typeof item === 'string') ? item : item.name;
        const itemColor = (type === 'symbols' && typeof item === 'string') ? '#94a3b8' : item.color;
        setEditingItem({ name: itemName, color: itemColor, originalName: itemName });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setModalType(null);
        setEditingItem(null);
        setEditType(null);
    };

    const toggleSection = (type) => {
        setExpandedSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(type)) {
                newSet.delete(type);
            } else {
                newSet.add(type);
            }
            return newSet;
        });
    };

    const toggleAllSections = () => {
        const allTypes = ['platforms', 'categories', 'subcategories', 'instruments'];
        if (expandedSections.size === allTypes.length) {
            // הכל מורחב, צמצם הכל
            setExpandedSections(new Set());
        } else {
            // הרחב הכל
            setExpandedSections(new Set(allTypes));
        }
    };

    const sourceTypes = [
        { key: 'platforms', order: 1 },
        { key: 'categories', order: 2 },
        { key: 'subcategories', order: 3 },
        { key: 'instruments', order: 4 }
    ];

    return (
        <>
            {/* כותרת עם כפתור הרחב/צמצם הכל */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">הגדרת מקורות</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">נהל את החשבונות, אפיקי ההשקעה והנכסים למעקב</p>
                </div>
                <button
                    onClick={toggleAllSections}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                    {expandedSections.size === sourceTypes.length ? (
                        <>
                            <ChevronUp size={16} />
                            <span>צמצם הכל</span>
                        </>
                    ) : (
                        <>
                            <ChevronDown size={16} />
                            <span>הרחב הכל</span>
                        </>
                    )}
                </button>
            </div>

            <div className="space-y-8">
                {sourceTypes.map(({ key: type }) => {
                    const data = systemData[type] || [];
                    const title = getSourceTypeTitle(type);
                    const description = getSourceTypeDescription(type);
                    const icon = getSourceTypeIcon(type);
                    const isSymbols = type === 'symbols';

                    const isExpanded = expandedSections.has(type);

                    return (
                        <div key={type} className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden backdrop-blur-sm">
                            {/* Section Header */}
                            <div className="px-4 md:px-6 py-5 border-b border-slate-100 dark:border-slate-700/50">
                                <div className="flex items-start justify-between gap-4">
                                    <button
                                        onClick={() => toggleSection(type)}
                                        className="flex-1 text-right hover:opacity-80 transition-opacity"
                                    >
                                        <div className="flex items-center gap-3 mb-1.5">
                                            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                                                {icon}
                                            </div>
                                            <h3
                                                className="text-lg font-bold text-slate-900 dark:text-white"
                                                data-coachmark={type === 'categories' ? 'asset-distribution-categories' : type === 'symbols' ? 'asset-distribution-symbols' : undefined}
                                            >
                                                {title}
                                            </h3>
                                            <div className="flex-shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                                <ChevronRight size={20} />
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 pr-11">{description}</p>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openAddModal(type);
                                        }}
                                        className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-all shadow-sm hover:shadow-md"
                                    >
                                        <Plus size={18} />
                                        <span className="hidden sm:inline">הוסף</span>
                                    </button>
                                </div>
                            </div>

                            {/* רשימת פריטים - ניתן לצמצום */}
                            <div
                                className={`divide-y divide-slate-100 dark:divide-slate-700/50 transition-all duration-300 ease-in-out overflow-hidden ${isExpanded
                                    ? 'max-h-[2000px] opacity-100 pointer-events-auto'
                                    : 'max-h-0 opacity-0 pointer-events-none'
                                    }`}
                            >
                                {data.length === 0 ? (
                                    <div className="px-4 md:px-6 py-12 text-center">
                                        <p className="text-sm text-slate-400 dark:text-slate-500">אין פריטים עדיין</p>
                                        <button
                                            onClick={() => openAddModal(type)}
                                            className="mt-3 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                                        >
                                            הוסף פריט ראשון
                                        </button>
                                    </div>
                                ) : (
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragStart={(event) => {
                                            setActiveId(event.active.id);
                                        }}
                                        onDragEnd={(event) => {
                                            const { active, over } = event;
                                            setActiveId(null);

                                            if (over && active.id !== over.id) {
                                                const oldIndex = data.findIndex(item => {
                                                    const itemName = (isSymbols && typeof item === 'string') ? item : item.name;
                                                    return itemName === active.id;
                                                });
                                                const newIndex = data.findIndex(item => {
                                                    const itemName = (isSymbols && typeof item === 'string') ? item : item.name;
                                                    return itemName === over.id;
                                                });

                                                if (oldIndex !== -1 && newIndex !== -1) {
                                                    onReorder(type, oldIndex, newIndex);
                                                }
                                            }
                                        }}
                                    >
                                        <SortableContext
                                            items={data.map(item => {
                                                const itemName = (isSymbols && typeof item === 'string') ? item : item.name;
                                                return itemName;
                                            })}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {data.map((item) => {
                                                const itemName = (isSymbols && typeof item === 'string') ? item : item.name;
                                                const itemColor = (isSymbols && typeof item === 'string') ? '#94a3b8' : item.color;
                                                const isFixed = (type === 'instruments' && FIXED_INSTRUMENTS.some(fi => fi.name === itemName)) ||
                                                    (type === 'categories' && FIXED_CATEGORIES.some(fc => fc.name === itemName)) ||
                                                    (type === 'subcategories' && FIXED_SUBCATEGORIES.some(fsc => fsc.name === itemName));

                                                return (
                                                    <SortableSourceItem
                                                        key={itemName}
                                                        item={item}
                                                        type={type}
                                                        isSymbols={isSymbols}
                                                        itemName={itemName}
                                                        itemColor={itemColor}
                                                        onEdit={openEditModal}
                                                        onDelete={onDelete}
                                                        isFixed={isFixed}
                                                    />
                                                );
                                            })}
                                        </SortableContext>
                                        <DragOverlay>
                                            {activeId ? (() => {
                                                const activeItem = data.find(item => {
                                                    const itemName = (isSymbols && typeof item === 'string') ? item : item.name;
                                                    return itemName === activeId;
                                                });
                                                const displayName = activeItem
                                                    ? (isSymbols && typeof activeItem === 'string') ? activeItem : activeItem.name
                                                    : activeId;
                                                return (
                                                    <div className="bg-white dark:bg-slate-800 px-4 md:px-6 py-4 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg opacity-95">
                                                        <div className="flex items-center gap-3">
                                                            <GripVertical size={20} className="text-slate-400" />
                                                            <span className="text-base font-medium text-slate-900 dark:text-white">
                                                                {displayName}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })() : null}
                                        </DragOverlay>
                                    </DndContext>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add/Edit Modal */}
            <SourceItemModal
                isOpen={modalOpen}
                onClose={closeModal}
                type={modalType}
                editingItem={editingItem}
                onSave={(name, color) => {
                    if (editingItem) {
                        onUpdate(editType, editingItem.originalName, name, color);
                    } else {
                        onAdd(modalType, name, color);
                    }
                    closeModal();
                }}
                systemData={systemData}
            />
        </>
    );
};

export default SourcesConfiguration;
