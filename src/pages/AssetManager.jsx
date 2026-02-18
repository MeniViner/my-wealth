import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Eye, ArrowUpDown, LayoutGrid, Layers, Building2, ChevronDown, ChevronUp, X, Tag, Database, Palette, RefreshCw, TestTube, TrendingUp, BarChart3, Package, FileText, Bitcoin } from 'lucide-react';
import Modal from '../components/Modal';
import { confirmAlert, successToast } from '../utils/alerts';
import CustomSelect from '../components/CustomSelect';
import { useDemoData } from '../contexts/DemoDataContext';
import { useAdmin } from '../hooks/useAdmin';
import { arrayMove } from '@dnd-kit/sortable';
import SourcesConfiguration from './assets/components/SourcesConfiguration';
import AssetKPIs from './assets/components/AssetKPIs';
import ViewPresetSelector, { VIEW_PRESETS } from './assets/components/ViewPresetSelector';
import MobileAssetCard from './assets/components/MobileAssetCard';
import { usePriceSync } from '../hooks/usePriceSync';

const AssetManager = ({ assets, onDelete, systemData, setSystemData, onResetData, user }) => {
  const { demoAssets, isActive: isDemoActive, toggleDemoMode } = useDemoData();
  const { isAdmin } = useAdmin(user);

  // Use demo assets if tour is active, otherwise use real assets
  const displayAssets = isDemoActive && demoAssets.length > 0 ? demoAssets : assets;

  // Integrate price synchronization (only for real assets, not demo)
  const { syncPrices, isSyncing, lastSync } = usePriceSync(isDemoActive ? [] : assets);

  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'value', direction: 'desc' });
  const [viewPreset, setViewPreset] = useState('compact');
  const [visibleColumns, setVisibleColumns] = useState(VIEW_PRESETS.compact.columns);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState('bottom'); // 'top' or 'bottom'
  const colMenuButtonRef = useRef(null);

  // Update columns when preset changes
  useEffect(() => {
    if (VIEW_PRESETS[viewPreset]) {
      setVisibleColumns(VIEW_PRESETS[viewPreset].columns);
    }
  }, [viewPreset]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [groupBy, setGroupBy] = useState('platform'); // 'platform', 'category', 'instrument'
  const [expandedGroups, setExpandedGroups] = useState(new Set(['platforms', 'categories', 'symbols', 'instruments'])); // Track which groups are expanded
  const [activeTab, setActiveTab] = useState('assets'); // 'assets' or 'sources'

  // Filtering
  const filteredAssets = displayAssets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.instrument.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.symbol && asset.symbol.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.tags && asset.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesPlatform = filterPlatform === 'all' || asset.platform === filterPlatform;
    const matchesCategory = filterCategory === 'all' || asset.category === filterCategory;
    return matchesSearch && matchesPlatform && matchesCategory;
  });

  // Sorting
  const sortedAssets = [...filteredAssets].sort((a, b) => {
    const aVal = a[sortConfig.key] || '';
    const bVal = b[sortConfig.key] || '';
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Group assets by selected criteria
  const groupedAssets = useMemo(() => {
    const groups = {};
    sortedAssets.forEach(asset => {
      const groupKey = asset[groupBy] || 'אחר';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(asset);
    });

    // Sort groups by total value
    const sortedGroups = Object.entries(groups).map(([key, items]) => {
      const totalValue = items.reduce((sum, item) => sum + (item.value || 0), 0);
      return { key, items, totalValue };
    }).sort((a, b) => b.totalValue - a.totalValue);

    return sortedGroups;
  }, [sortedAssets, groupBy]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const formatMoney = (val, curr) => {
    return curr === 'USD' ? `$${val.toLocaleString()}` : `₪${val.toLocaleString()}`;
  };

  const handleEdit = (asset) => {
    navigate(`/assets/edit/${asset.id}`);
  };

  const handleDelete = async (assetId, assetName) => {
    const confirmed = await confirmAlert(
      'מחיקת נכס',
      `האם אתה בטוח שברצונך למחוק את הנכס "${assetName}"?\nפעולה זו אינה ניתנת לביטול.`,
      'warning',
      true // isDelete - כפתור אדום
    );
    if (confirmed) {
      onDelete(assetId);
      await successToast('נמחק בהצלחה', 2000);
    }
  };

  const getGroupColor = (groupName) => {
    if (groupBy === 'platform') {
      const platform = systemData.platforms.find(p => p.name === groupName);
      return platform?.color || '#94A3B8';
    }
    if (groupBy === 'category') {
      const category = systemData.categories.find(c => c.name === groupName);
      return category?.color || '#94A3B8';
    }
    if (groupBy === 'instrument') {
      const instrument = systemData.instruments.find(i => i.name === groupName);
      return instrument?.color || '#94A3B8';
    }
    return '#94A3B8';
  };

  const getGroupIcon = () => {
    if (groupBy === 'platform') return <Building2 size={18} />;
    if (groupBy === 'category') return <Layers size={18} />;
    return <LayoutGrid size={18} />;
  };

  // החלף הרחבה/צמצום של קבוצה
  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  // הרחב/צמצם את כל הקבוצות
  const toggleAllGroups = () => {
    if (expandedGroups.size === groupedAssets.length) {
      // הכל מורחב, צמצם הכל
      setExpandedGroups(new Set());
    } else {
      // הרחב הכל
      setExpandedGroups(new Set(groupedAssets.map(g => g.key)));
    }
  };

  // Initialize all groups as expanded by default when groups change
  useEffect(() => {
    if (groupedAssets.length > 0) {
      const groupKeys = groupedAssets.map(g => g.key);
      const currentKeys = Array.from(expandedGroups);

      // Check if groups have changed (different keys or different count)
      const groupsChanged = groupKeys.length !== currentKeys.length ||
        !groupKeys.every(key => currentKeys.includes(key));

      // Only auto-expand if groups changed and no groups are currently expanded
      if (groupsChanged && expandedGroups.size === 0) {
        setExpandedGroups(new Set(groupKeys));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy, groupedAssets.length]);

  // Source management functions
  const handleAddSource = (type, name, color) => {
    if (!name.trim()) return;
    const newList = [...systemData[type], { name: name.trim(), color: color || generateRandomColor() }];
    const updatedData = { ...systemData, [type]: newList };
    setSystemData(updatedData);
    successToast('נוסף בהצלחה', 1500);
  };

  const handleUpdateSource = (type, oldName, newName, newColor) => {
    if (!newName.trim()) return;
    const newList = systemData[type].map(item => {
      const itemName = type === 'symbols' && typeof item === 'string' ? item : item.name;
      if (itemName === oldName) {
        return { name: newName.trim(), color: newColor };
      }
      return item;
    });
    const updatedData = { ...systemData, [type]: newList };
    setSystemData(updatedData);
    successToast('עודכן בהצלחה', 1500);
  };

  const handleDeleteSource = async (type, name) => {
    // Check if trying to delete fixed data
    const isFixedInstrument = type === 'instruments' && FIXED_INSTRUMENTS.some(fi => fi.name === name);
    const isFixedCategory = type === 'categories' && FIXED_CATEGORIES.some(fc => fc.name === name);

    if (isFixedCategory) {
      await confirmAlert('שגיאה', `${name} הוא נתון קבוע ולא ניתן למחיקה. ניתן לערוך רק את הצבע.`, 'error', false);
      return;
    }

    const confirmed = await confirmAlert('מחיקה', `למחוק את ${name}?`, 'warning', true);
    if (confirmed) {
      const newList = systemData[type].filter(item => {
        const itemName = type === 'symbols' && typeof item === 'string' ? item : item.name;
        return itemName !== name;
      });
      const updatedData = { ...systemData, [type]: newList };
      setSystemData(updatedData);
      await successToast('נמחק בהצלחה', 2000);
    }
  };

  // Handle reordering sources
  const handleReorderSource = (type, oldIndex, newIndex) => {
    const items = [...systemData[type]];
    const reorderedItems = arrayMove(items, oldIndex, newIndex);
    const updatedData = { ...systemData, [type]: reorderedItems };
    setSystemData(updatedData);
  };

  const getSourceTypeIcon = (type) => {
    switch (type) {
      case 'categories': return <Tag size={16} className="text-emerald-500" />;
      case 'subcategories': return <Layers size={16} className="text-emerald-500" />;
      case 'platforms': return <Database size={16} className="text-emerald-500" />;
      case 'instruments': return <Palette size={16} className="text-emerald-500" />;
      case 'symbols': return <Tag size={16} className="text-emerald-500" />;
      default: return null;
    }
  };

  const getSourceTypeTitle = (type) => {
    switch (type) {
      case 'categories': return 'אפיקי השקעה';
      case 'subcategories': return 'קטגוריות חלוקה';
      case 'platforms': return 'חשבונות וארנקים';
      case 'instruments': return 'מטבעות בסיס';
      default: return '';
    }
  };

  const getSourceTypeDescription = (type) => {
    switch (type) {
      case 'categories':
        return 'חלוקת התיק הראשית';
      case 'subcategories':
        return 'חלק נכסים לסקטורים ונושאים';
      case 'platforms':
        return 'איפה הכסף שלך נמצא?';
      case 'instruments':
        return 'סוגי מטבע להערכת שווי';
      default:
        return '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <header className="flex justify-between items-center gap-4 mr-12 md:mr-0">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">ניהול נכסים</h2>
        {activeTab === 'assets' && (
          <div className="flex items-center gap-2">
            {/* Refresh Prices Button */}
            <button
              onClick={syncPrices}
              disabled={isSyncing}
              className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 md:px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
              title={lastSync ? `עדכון אחרון: ${new Date(lastSync).toLocaleTimeString('he-IL')}` : 'רענן מחירים'}
            >
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{isSyncing ? 'מעדכן...' : 'רענן מחירים'}</span>
              {lastSync && !isSyncing && (
                <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400">
                  ({Math.floor((Date.now() - new Date(lastSync)) / 60000)}m)
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/assets/add')}
              className="bg-emerald-600 dark:bg-emerald-700 text-white px-5 py-1.5 md:py-2.5 rounded-lg flex items-center gap-2 font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors shadow-sm"
              data-coachmark="add-asset"
            >
              <span className="hidden sm:inline">הוסף נכס</span>
              <span className="sm:hidden">הוסף</span>
              <Plus size={18} />
            </button>
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('assets')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'assets'
            ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          data-coachmark="assets-tab"
        >
          נכסים
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'sources'
            ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          data-coachmark="sources-tab"
        >
          ניהול המקורות שלי
        </button>
      </div>

      {/* Sources Management Tab */}
      {activeTab === 'sources' && (
        <SourcesConfiguration
          systemData={systemData}
          onAdd={handleAddSource}
          onUpdate={handleUpdateSource}
          onDelete={handleDeleteSource}
          onReorder={handleReorderSource}
          getSourceTypeTitle={getSourceTypeTitle}
          getSourceTypeDescription={getSourceTypeDescription}
          getSourceTypeIcon={getSourceTypeIcon}
        />
      )}

      {/* Assets Tab */}
      {activeTab === 'assets' && (
        <>
          {/* KPIs */}
          <div className="mb-6">
            <AssetKPIs assets={filteredAssets} />
          </div>

          {/* Filters and Group By */}
          <div className="bg-white dark:bg-slate-800 p-4 md:p-5 md:rounded-xl md:shadow-sm md:border md:border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="חיפוש חופשי..."
                  className="w-full pl-4 pr-10 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  data-coachmark="asset-search"
                />
              </div>
              <div className="flex gap-2">
                <CustomSelect
                  value={filterCategory}
                  onChange={(val) => setFilterCategory(val)}
                  options={[
                    { value: 'all', label: 'כל אפיקי ההשקעה' },
                    ...systemData.categories.map(c => ({
                      value: c.name,
                      label: c.name,
                      iconColor: c.color
                    }))
                  ]}
                  placeholder="כל אפיקי ההשקעה"
                  className="min-w-[150px]"
                />
                <CustomSelect
                  value={filterPlatform}
                  onChange={(val) => setFilterPlatform(val)}
                  options={[
                    { value: 'all', label: 'כל החשבונות' },
                    ...systemData.platforms.map(p => ({
                      value: p.name,
                      label: p.name,
                      iconColor: p.color
                    }))
                  ]}
                  placeholder="כל החשבונות"
                  className="min-w-[150px]"
                />
              </div>
            </div>

            {/* Group By Selector */}
            <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                {getGroupIcon()}
                <span>חלוקה לפי:</span>
              </span>
              <div
                className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-thin-horizontal"
                // data-coachmark="asset-grouping"
                data-coachmark="asset-distribution-categories"
              >
                <button
                  onClick={() => setGroupBy('platform')}
                  className={`px-4 py-2 mb-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 whitespace-nowrap ${groupBy === 'platform'
                    ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}

                >
                  חשבונות וארנקים
                </button>
                <button
                  onClick={() => setGroupBy('category')}
                  className={`px-4 py-2 mb-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 whitespace-nowrap ${groupBy === 'category'
                    ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                >
                  אפיקי השקעה
                </button>
                <button
                  onClick={() => setGroupBy('instrument')}
                  className={`px-4 py-2 mb-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 whitespace-nowrap ${groupBy === 'instrument'
                    ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                >
                  מטבעות בסיס
                </button>
              </div>

              {/* View Preset Selector - moved next to groupBy */}
              <div className="mt-2 md:block hidden">
                <ViewPresetSelector
                  value={viewPreset}
                  onChange={setViewPreset}
                  onCustomize={() => setColMenuOpen(true)}
                />
              </div>
            </div>
          </div>

          {/* Grouped Assets */}
          <div className="space-y-4">
            {groupedAssets.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
                <p className="text-slate-500 dark:text-slate-400 text-lg">לא נמצאו נכסים</p>
              </div>
            ) : (
              <>
                {/* כפתורים - הרחב/צמצם הכל ותצוגה */}
                <div className="flex justify-between items-center gap-2">
                  <div className="relative">
                    <button
                      ref={colMenuButtonRef}
                      onClick={() => {
                        if (colMenuButtonRef.current) {
                          const rect = colMenuButtonRef.current.getBoundingClientRect();
                          const spaceBelow = window.innerHeight - rect.bottom;
                          const spaceAbove = rect.top;
                          const menuHeight = 400; // Estimated menu height

                          // אם יש מספיק מקום למטה, הצג למטה. אחרת הצג למעלה
                          if (spaceBelow >= menuHeight || spaceBelow > spaceAbove) {
                            setMenuPosition('bottom');
                          } else {
                            setMenuPosition('top');
                          }
                        }
                        setColMenuOpen(!colMenuOpen);
                      }}
                      className="hidden md:block px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 font-medium text-sm shadow-sm hover:shadow-md"
                    >
                      <Eye size={18} />
                      <span>בחר נתונים להצגה</span>
                    </button>

                    {colMenuOpen && (
                      <>
                        {/* Backdrop for mobile */}
                        <div
                          className="fixed inset-0 bg-black/20 z-40 md:hidden"
                          onClick={() => setColMenuOpen(false)}
                        />
                        {/* Menu - Positioned dynamically */}
                        <div
                          className={`absolute ${menuPosition === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'} right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl p-4 z-50 w-[200px] md:w-64 max-h-[80svh] md:max-h-[80vh] overflow-y-auto scrollbar-thin-horizontal`}
                          dir="rtl"
                        >
                          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">עמודות להצגה</h3>
                            <button
                              onClick={() => setColMenuOpen(false)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              aria-label="סגור"
                            >
                              <X size={18} className="text-slate-500 dark:text-slate-400" />
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {Object.keys(visibleColumns).map(key => {
                              const labels = {
                                name: 'שם הנכס',
                                value: 'שווי',
                                symbol: 'סמל',
                                instrument: 'מטבע בסיס',
                                category: 'אפיק השקעה',
                                tags: 'תגיות',
                                quantity: 'כמות',
                                purchasePrice: 'מחיר רכישה',
                                profitLoss: 'רווח/הפסד'
                              };
                              return (
                                <label
                                  key={key}
                                  className="flex items-center gap-3 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 p-2.5 rounded-lg transition-colors group"
                                >
                                  <input
                                    type="checkbox"
                                    checked={visibleColumns[key]}
                                    onChange={() => {
                                      setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
                                      setViewPreset('custom'); // Reset preset when manually changing columns
                                    }}
                                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 cursor-pointer"
                                  />
                                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                    {labels[key] || key}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  {groupedAssets.length > 1 && (
                    <button
                      onClick={toggleAllGroups}
                      className="text-sm text-left mr-auto text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 "
                    >
                      {expandedGroups.size === groupedAssets.length ? (
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
                  )}
                </div>

                {groupedAssets.map(({ key, items, totalValue }) => {
                  const groupColor = getGroupColor(key);
                  const isExpanded = expandedGroups.has(key);

                  return (
                    <div key={key} className={`rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-all ${!isExpanded ? 'bg-surface-light dark:bg-surface-dark' : 'bg-white dark:bg-slate-800'}`}>
                      {/* Group Header */}
                      <div
                        className={`px-4 md:px-6 py-3 cursor-pointer transition-colors ${!isExpanded
                          ? 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                          : 'bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700'
                          }`}
                        onClick={() => toggleGroup(key)}
                      >
                        {/* Mobile Layout - Clean Row + Expanded Action */}
                        <div className="flex flex-col md:hidden">
                          {/* Main Row: Toggle + Info + Value */}
                          <div className="flex items-center justify-between gap-3">
                            {/* Left: Checkbox & Name - Icon Removed */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {/* Icon removed per user request */}
                              <div className="flex flex-col min-w-0">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate leading-tight">
                                  {key}
                                </h3>
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                  {items.length} נכסים
                                </span>
                              </div>
                            </div>

                            {/* Right: Value & % */}
                            <div className="text-right flex-shrink-0">
                              <div className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                                ₪{Math.round(totalValue).toLocaleString()}
                              </div>
                              <div className="flex items-center justify-end gap-1 mt-0.5">
                                <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded" dir="ltr">
                                  {((totalValue / sortedAssets.reduce((sum, a) => sum + (a.value || 0), 0)) * 100).toFixed(1)}%
                                </div>
                                <div className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                  <ChevronDown size={20} />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Content: Add Button (Moved to top of list area logically, but visually here is fine if styled right) */}
                          {/* Actually in Stitch design, the add button is at the TOP of the list or bottom? 
                              Asset List v2 HTML shows it at the top of the list: <div className="px-4 py-3"><button...></div> 
                              So let's keep it here but style it correctly. */}
                          {isExpanded && (
                            <div className="pt-3 pb-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const params = new URLSearchParams();
                                  if (groupBy === 'platform') {
                                    params.set('platform', key);
                                  } else if (groupBy === 'category') {
                                    params.set('category', key);
                                  } else if (groupBy === 'instrument') {
                                    params.set('instrument', key);
                                  }
                                  navigate(`/assets/add?${params.toString()}`);
                                }}
                                className="w-full py-2.5 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-bold flex justify-center items-center gap-2 transition-colors"
                              >
                                <Plus size={16} />
                                <span className="text-sm font-bold">הוסף נכס ל-{key}</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Desktop Layout - Single Row */}
                        <div className="hidden md:flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Icon removed per user request */}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">{key}</h3>
                              <span className="text-xs text-slate-500 dark:text-slate-400">{items.length} נכסים</span>
                            </div>
                          </div>

                          {/* Right: Value Info + Plus Button */}
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="text-right min-w-[100px]">
                              <div className="text-lg font-bold text-slate-900 dark:text-white">
                                ₪{totalValue.toLocaleString()}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {((totalValue / sortedAssets.reduce((sum, a) => sum + (a.value || 0), 0)) * 100).toFixed(1)}%
                              </div>
                            </div>
                            <div className={`p-1.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                              <ChevronDown size={20} />
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const params = new URLSearchParams();
                                if (groupBy === 'platform') {
                                  params.set('platform', key);
                                } else if (groupBy === 'category') {
                                  params.set('category', key);
                                } else if (groupBy === 'instrument') {
                                  params.set('instrument', key);
                                }
                                navigate(`/assets/add?${params.toString()}`);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white p-2 rounded-lg flex items-center justify-center transition-all shadow-sm hover:shadow-md"
                              title="הוסף נכס לקבוצה זו"
                            >
                              <Plus size={18} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Assets List - Conditional Mobile/Desktop Rendering */}
                      {isExpanded && (
                        <>
                          {/* Mobile: List Layout (No Spacing) */}
                          <div className="md:hidden px-4 pb-2">
                            {items.map(asset => (
                              <MobileAssetCard
                                key={asset.id}
                                asset={asset}
                                onClick={setSelectedAsset}
                              />
                            ))}
                          </div>

                          {/* Desktop: Table Layout */}
                          <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-right">
                              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                  {visibleColumns.name && (
                                    <th className="p-3 md:p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" onClick={() => handleSort('name')}>
                                      <div className="flex items-center gap-1">
                                        שם הנכס
                                        <ArrowUpDown size={12} />
                                      </div>
                                    </th>
                                  )}
                                  {visibleColumns.symbol && (
                                    <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('symbol')}>
                                      <div className="flex items-center gap-1">
                                        סמל
                                        <ArrowUpDown size={12} />
                                      </div>
                                    </th>
                                  )}
                                  {visibleColumns.instrument && (
                                    <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('instrument')}>
                                      מטבעות בסיס
                                    </th>
                                  )}
                                  {/* {visibleColumns.platform && (
                                    <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('platform')}>
                                      חשבונות וארנקים
                                    </th>
                                  )} */}
                                  {visibleColumns.category && (
                                    <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('category')}>
                                      אפיקי השקעה
                                    </th>
                                  )}
                                  {visibleColumns.tags && <th className="p-4">תגיות</th>}
                                  {visibleColumns.quantity && (
                                    <th className="p-4">כמות</th>
                                  )}
                                  {visibleColumns.value && (
                                    <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('value')}>
                                      <div className="flex items-center gap-1">
                                        שווי
                                        <ArrowUpDown size={12} />
                                      </div>
                                    </th>
                                  )}
                                  {visibleColumns.profitLoss && (
                                    <th className="p-4">רווח/הפסד</th>
                                  )}
                                  <th className="p-4 text-center">פעולות</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                {items.map(asset => (
                                  <tr
                                    key={asset.id}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group"
                                    onClick={() => setSelectedAsset(asset)}
                                  >
                                    {visibleColumns.name && (
                                      <td className="p-3 md:p-4">
                                        <div className="font-semibold text-slate-800 dark:text-slate-100">{asset.name}</div>
                                      </td>
                                    )}
                                    {visibleColumns.symbol && (
                                      <td className="p-3 md:p-4">
                                        <span className="text-slate-600 dark:text-slate-300 font-mono text-sm bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded">
                                          {asset.symbol || <span className="text-slate-400 dark:text-slate-500 italic">ללא סמל</span>}
                                        </span>
                                      </td>
                                    )}
                                    {visibleColumns.instrument && (
                                      <td className="p-3 md:p-4 text-slate-600 dark:text-slate-300">{asset.instrument}</td>
                                    )}
                                    {/* {visibleColumns.platform && (
                                      <td className="p-3 md:p-4 text-slate-500 dark:text-slate-400">{asset.platform}</td>
                                    )} */}
                                    {visibleColumns.category && (
                                      <td className="p-3 md:p-4">
                                        <span className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200">
                                          {asset.category}
                                        </span>
                                      </td>
                                    )}
                                    {visibleColumns.tags && (
                                      <td className="p-3 md:p-4">
                                        <div className="flex gap-1.5 flex-wrap max-w-[200px]">
                                          {asset.tags && asset.tags.slice(0, 3).map((tag, i) => (
                                            <span key={i} className="text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                                              {tag}
                                            </span>
                                          ))}
                                          {asset.tags && asset.tags.length > 3 && (
                                            <span className="text-xs text-slate-400 dark:text-slate-500">+{asset.tags.length - 3}</span>
                                          )}
                                        </div>
                                      </td>
                                    )}
                                    {visibleColumns.quantity && (
                                      <td className="p-3 md:p-4">
                                        {asset.assetMode === 'QUANTITY' && asset.quantity ? (
                                          <div className="font-mono text-sm text-slate-700 dark:text-slate-300">
                                            {asset.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
                                        )}
                                      </td>
                                    )}
                                    {visibleColumns.value && (
                                      <td className="p-3 md:p-4">
                                        <div className="font-bold text-slate-900 dark:text-white">₪{asset.value.toLocaleString()}</div>
                                        <div className="text-xs text-slate-400 dark:text-slate-500" dir="ltr">
                                          בקניה: {asset.currency === 'USD' ? '$' : '₪'}{Math.round(asset.originalValue || 0).toLocaleString()}
                                        </div>
                                        {asset.priceChange24h !== null && asset.priceChange24h !== undefined && (
                                          <div className={`text-xs mt-1 font-medium ${asset.priceChange24h >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {asset.priceChange24h >= 0 ? '↑' : '↓'} {Math.abs(asset.priceChange24h).toFixed(2)}% (24h)
                                          </div>
                                        )}
                                      </td>
                                    )}
                                    {visibleColumns.profitLoss && (
                                      <td className="p-3 md:p-4">
                                        {asset.profitLoss !== null && asset.profitLoss !== undefined ? (
                                          <div>
                                            <div className={`font-bold ${asset.profitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                              {asset.profitLoss >= 0 ? '+' : ''}₪{Math.round(asset.profitLoss).toLocaleString()}
                                            </div>
                                            <div className={`text-xs ${asset.profitLossPercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                              {asset.profitLossPercent >= 0 ? '+' : ''}{asset.profitLossPercent?.toFixed(1)}%
                                            </div>

                                          </div>
                                        ) : (
                                          <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
                                        )}
                                      </td>
                                    )}
                                    <td className="p-3 md:p-4" onClick={e => e.stopPropagation()}>
                                      <div className="flex justify-center gap-1 transition-opacity">
                                        <button
                                          onClick={() => handleEdit(asset)}
                                          className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 text-slate-400 dark:text-slate-500 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-colors"
                                          title="ערוך"
                                        >
                                          <Edit2 size={16} />
                                        </button>
                                        <button
                                          onClick={() => handleDelete(asset.id, asset.name)}
                                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                                          title="מחק"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </>
            )
            }
          </div>

          <Modal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)} title={selectedAsset?.name}>
            {selectedAsset && (
              <div className="space-y-6 ">
                {/* Value Cards */}
                <div className="grid grid-cols-2  gap-4">
                  {/* שווי נוכחי (תמיד מוצג) */}
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
                    <div className="text-base md:text-sm text-slate-500 dark:text-slate-400">שווי נוכחי</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400" dir="ltr">
                      ₪{selectedAsset.value.toLocaleString()}
                    </div>
                    {/* הצג שווי מקור רק אם שונה משווי נוכחי */}
                    {selectedAsset.originalValue && selectedAsset.originalValue !== selectedAsset.value && (
                      <div className="text-sm md:text-xs text-slate-400 dark:text-slate-500 mt-1" dir="ltr">
                        בקניה: {selectedAsset.currency === 'USD' ? '$' : '₪'}{(selectedAsset.originalValue || 0).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* רווח/הפסד (אם קיים) */}
                  {/* רווח/הפסד (אם קיים) */}
                  {selectedAsset.profitLoss !== null && selectedAsset.profitLoss !== undefined && (
                    <div className={`p-4 rounded-xl ${selectedAsset.profitLoss >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                      <div className="text-base md:text-sm text-slate-500 dark:text-slate-400">רווח/הפסד</div>
                      <div className={`text-2xl font-bold ${selectedAsset.profitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {selectedAsset.profitLoss >= 0 ? '+' : ''}₪{Math.round(selectedAsset.profitLoss).toLocaleString()}
                      </div>
                      <div className={`text-base md:text-sm ${selectedAsset.profitLossPercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {selectedAsset.profitLossPercent >= 0 ? '+' : ''}{selectedAsset.profitLossPercent?.toFixed(2)}%
                      </div>
                    </div>
                  )}
                </div>

                {/* Quantity Info (if available) */}
                {selectedAsset.assetMode === 'QUANTITY' && selectedAsset.quantity && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                      <div className="text-sm md:text-xs text-green-600 dark:text-green-400">כמות</div>
                      <div className="font-bold text-green-700 dark:text-green-300 font-mono">
                        {selectedAsset.quantity.toLocaleString('en-US', { maximumFractionDigits: 6 })}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/20 p-3 rounded-lg text-center">
                      <div className="text-sm md:text-xs text-gray-600 dark:text-gray-400">מחיר רכישה</div>
                      <div className="font-bold text-gray-700 dark:text-gray-300 font-mono" dir="ltr">
                        {selectedAsset.currency === 'USD' ? '$' : '₪'}{(selectedAsset.purchasePrice || 0).toLocaleString()}
                      </div>
                    </div>
                    {(typeof selectedAsset.currentPriceNative === 'number' && selectedAsset.currentPriceNative > 0) ||
                      (typeof selectedAsset.currentPrice === 'number' && selectedAsset.currentPrice > 0) ? (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg text-center">
                        <div className="text-sm md:text-xs text-emerald-600 dark:text-emerald-400">מחיר נוכחי</div>
                        <div className="font-bold text-emerald-700 dark:text-emerald-300 font-mono" dir="ltr">
                          {typeof selectedAsset.currentPriceNative === 'number' && selectedAsset.currentPriceNative > 0
                            ? `${selectedAsset.currency === 'USD' ? '$' : '₪'}${selectedAsset.currentPriceNative.toLocaleString()}`
                            : `₪${(selectedAsset.currentPrice || 0).toLocaleString()}`}
                        </div>
                        {selectedAsset.hasLivePrice && (
                          <div className="text-xs text-emerald-500 flex items-center justify-center gap-1 mt-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            Live
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex border-b border-slate-100 dark:border-slate-700 pb-2">
                    <span className="w-2/5 text-base md:text-sm text-slate-500 dark:text-slate-400">חשבונות וארנקים</span>
                    <span className="font-medium  text-base md:text-sm text-slate-800 dark:text-white">{selectedAsset.platform}</span>
                  </div>
                  <div className="flex border-b border-slate-100 dark:border-slate-700 pb-2">
                    <span className="w-2/5 text-base md:text-sm text-slate-500 dark:text-slate-400">מטבעות בסיס</span>
                    <span className="font-medium  text-base md:text-sm text-slate-800 dark:text-white">{selectedAsset.instrument}</span>
                  </div>
                  <div className="flex border-b border-slate-100 dark:border-slate-700 pb-2">
                    <span className="w-2/5 text-base md:text-sm text-slate-500 dark:text-slate-400">אפיקי השקעה</span>
                    <span className="font-medium  text-base md:text-sm text-slate-800 dark:text-white">{selectedAsset.category}</span>
                  </div>
                  <div className="flex border-b border-slate-100 dark:border-slate-700 pb-2">
                    <span className="w-2/5 text-base md:text-sm text-slate-500 dark:text-slate-400">סמל נכס</span>
                    <span className="font-medium  text-base md:text-sm text-slate-800 dark:text-white font-mono">
                      {selectedAsset.symbol || <span className="text-slate-400 dark:text-slate-500 italic">ללא סמל</span>}
                    </span>
                  </div>
                  {selectedAsset.purchaseDate && (
                    <div className="flex border-b border-slate-100 dark:border-slate-700 pb-2">
                      <span className="w-2/5 text-base md:text-sm text-slate-500 dark:text-slate-400">תאריך רכישה</span>
                      <span className="font-medium  text-base md:text-sm text-slate-800 dark:text-white">
                        {new Date(selectedAsset.purchaseDate).toLocaleDateString('he-IL')}
                      </span>
                    </div>
                  )}
                  {selectedAsset.subcategory && (
                    <div className="flex border-b border-slate-100 dark:border-slate-700 pb-2">
                      <span className="w-2/5 text-base md:text-sm text-slate-500 dark:text-slate-400">קטגוריית חלוקה</span>
                      <span className="font-medium  text-base md:text-sm text-slate-800 dark:text-white">{selectedAsset.subcategory}</span>
                    </div>
                  )}

                  {/* {selectedAsset.assetType && (
                    <div className="flex border-b border-slate-100 dark:border-slate-700 pb-2">
                      <span className="w-1/3 text-slate-500 dark:text-slate-400">סוג נכס</span>
                      <span className="font-medium text-slate-800 dark:text-white">
                        <span className="flex items-center gap-1.5">
                          {selectedAsset.assetType === 'CRYPTO' ? (
                            <><Bitcoin size={16} className="text-amber-500" /> קריפטו</>
                          ) : selectedAsset.assetType === 'STOCK' ? (
                            <><TrendingUp size={16} className="text-green-500" /> מניה</>
                          ) : selectedAsset.assetType === 'INDEX' ? (
                            <><BarChart3 size={16} className="text-gray-500" /> מדד</>
                          ) : selectedAsset.assetType === 'ETF' ? (
                            <><Package size={16} className="text-green-500" /> תעודת סל</>
                          ) : (
                            <><FileText size={16} className="text-slate-500" /> ידני</>
                          )}
                        </span>
                      </span>
                    </div>
                  )} */}
                </div>

                <div>
                  <div className="text-base md:text-sm text-slate-500 dark:text-slate-400 mb-2">תגיות משויכות</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedAsset.tags && selectedAsset.tags.map((tag, i) => (
                      <span key={i} className="bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 px-3 py-1.5 md:py-1 rounded-full text-base md:text-sm font-medium border border-gray-100 dark:border-gray-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => { handleDelete(selectedAsset.id, selectedAsset.name); setSelectedAsset(null); }}
                    className="border border-red-500 text-red-500 bg-red-500/10 hover:bg-red-500/20 dark:bg-red-500/10 dark:hover:bg-red-500/20 px-4 py-2 md:py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-base md:text-sm font-medium"
                  >
                    <Trash2 size={18} /> מחק נכס
                  </button>
                  <button
                    onClick={() => { handleEdit(selectedAsset); setSelectedAsset(null); }}
                    className="border border-slate-600 text-slate-600 dark:text-slate-300 px-4 py-2 md:py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors text-base md:text-sm font-medium"
                  >
                    <Edit2 size={18} /> ערוך נכס
                  </button>
                </div>
              </div>
            )}
          </Modal>
        </>
      )
      }
    </div >
  );
};

export default AssetManager;
