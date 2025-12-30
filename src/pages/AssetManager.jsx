import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Eye, ArrowUpDown, LayoutGrid, Layers, Building2, ChevronDown, ChevronUp, X, Tag, Database, Palette, Check, ChevronRight, RefreshCw, TestTube } from 'lucide-react';
import Modal from '../components/Modal';
import { confirmAlert, successToast } from '../utils/alerts';
import CustomSelect from '../components/CustomSelect';
import { generateRandomColor, FIXED_INSTRUMENTS, FIXED_CATEGORIES } from '../constants/defaults';
import TickerSearch from '../components/TickerSearch';
import { useDemoData } from '../contexts/DemoDataContext';
import { useAdmin } from '../hooks/useAdmin';

const AssetManager = ({ assets, onDelete, systemData, setSystemData, onResetData, user, onRefreshPrices, pricesLoading, lastPriceUpdate }) => {
  const { demoAssets, isActive: isDemoActive, toggleDemoMode } = useDemoData();
  const { isAdmin } = useAdmin(user);
  
  // Use demo assets if tour is active, otherwise use real assets
  const displayAssets = isDemoActive && demoAssets.length > 0 ? demoAssets : assets;
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'value', direction: 'desc' });
  const [visibleColumns, setVisibleColumns] = useState({ 
    name: true, 
    symbol: true,
    instrument: true, 
    platform: true, 
    category: true, 
    tags: true, 
    value: true,
    quantity: false,
    purchasePrice: false,
    profitLoss: true
  });
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [groupBy, setGroupBy] = useState('platform'); // 'platform', 'category', 'instrument'
  const [expandedGroups, setExpandedGroups] = useState(new Set()); // Track which groups are expanded
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
    
    if (isFixedInstrument || isFixedCategory) {
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

  const getSourceTypeIcon = (type) => {
    switch(type) {
      case 'categories': return <Tag size={16} className="text-emerald-500" />;
      case 'platforms': return <Database size={16} className="text-emerald-500" />;
      case 'instruments': return <Palette size={16} className="text-emerald-500" />;
      case 'symbols': return <Tag size={16} className="text-emerald-500" />;
      default: return null;
    }
  };

  const getSourceTypeTitle = (type) => {
    switch(type) {
      case 'categories': return 'אפיקי השקעה';
      case 'platforms': return 'חשבונות וארנקים';
      case 'instruments': return 'מטבעות בסיס';
      case 'symbols': return 'נכסים למעקב';
      default: return '';
    }
  };

  const getSourceTypeDescription = (type) => {
    switch(type) {
      case 'categories':
        return 'חלוקת התיק הראשית';
      case 'platforms':
        return 'איפה הכסף שלך נמצא?';
      case 'instruments':
        return 'סוגי מטבע להערכת שווי';
      case 'symbols':
        return 'טיקרים וסמלים ספציפיים';
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
            {onRefreshPrices && (
              <button 
                onClick={onRefreshPrices}
                disabled={pricesLoading}
                className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-1.5 md:py-2.5 rounded-lg flex items-center gap-2 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                title={lastPriceUpdate ? `עדכון אחרון: ${lastPriceUpdate.toLocaleTimeString('he-IL')}` : 'רענן מחירים'}
              >
                <RefreshCw size={16} className={pricesLoading ? 'animate-spin' : ''} /> 
                <span className="hidden sm:inline">{pricesLoading ? 'מעדכן...' : 'רענן מחירים'}</span>
              </button>
            )}
          <button 
            onClick={() => navigate('/assets/add')} 
            className="bg-emerald-600 dark:bg-emerald-700 text-white px-5 py-1.5 md:py-2.5 rounded-lg flex items-center gap-2 font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors shadow-sm"
          >
            <Plus size={18} /> 
            <span className="hidden sm:inline">הוסף נכס</span>
            <span className="sm:hidden">הוסף</span>
          </button>
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('assets')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'assets'
              ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          נכסים
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'sources'
              ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          ניהול המקורות שלי
        </button>
      </div>

      {/* Sources Management Tab */}
      {activeTab === 'sources' && (
        <>
          {/* Reset Database Button (Admin only) or Demo Mode Button (Regular users) */}
          <div className="mb-6 flex justify-end">
            {isAdmin && onResetData && (
              <button 
                onClick={onResetData} 
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 font-medium"
                title="אתחול מסד נתונים - ימחק את כל הנתונים"
              >
                <RefreshCw size={16} />
                <span>אפס לנתונים ראשוניים⚠️</span>
              </button>
            )}
            
              <button 
                onClick={async () => {
                  toggleDemoMode();
                  await successToast(
                    isDemoActive 
                      ? 'מצב דמו כובה' 
                      : 'מצב דמו הופעל - נתוני דמו מוצגים',
                    2000
                  );
                }}
                className={`text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-2 border font-medium ${
                  isDemoActive
                    ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
                title={isDemoActive ? 'כבה מצב דמו' : 'הפעל מצב דמו - הצג נתוני דמו'}
              >
                <TestTube size={16} />
                <span>{isDemoActive ? 'כבה מצב דמו' : 'הפעל מצב דמו'}</span>
              </button>
            
          </div>
          <SourcesConfiguration
            systemData={systemData}
            onAdd={handleAddSource}
            onUpdate={handleUpdateSource}
            onDelete={handleDeleteSource}
            getSourceTypeTitle={getSourceTypeTitle}
            getSourceTypeDescription={getSourceTypeDescription}
            getSourceTypeIcon={getSourceTypeIcon}
          />
        </>
      )}

      {/* Assets Tab */}
      {activeTab === 'assets' && (
        <>

      {/* Filters and Group By */}
      <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="חיפוש חופשי..." 
              className="w-full pl-4 pr-10 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
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
            {/* View Button - Moved here next to filters */}
            <div className="relative">
              <button 
                onClick={() => setColMenuOpen(!colMenuOpen)} 
                className="px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700"
              >
                <Eye size={18} /> 
                <span className="hidden sm:inline">תצוגה</span>
              </button>
              {colMenuOpen && (
                <>
                  {/* Backdrop for mobile */}
                  <div 
                    className="fixed inset-0 bg-black/20 z-10 md:hidden"
                    onClick={() => setColMenuOpen(false)}
                  />
                  {/* Menu - Better positioned for mobile */}
                  <div className="absolute top-12 left-0 md:left-auto md:right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl p-4 z-30 w-[280px] md:w-56 max-h-[80svh] md:max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">עמודות להצגה</h3>
                      <button
                        onClick={() => setColMenuOpen(false)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <X size={16} className="text-slate-500 dark:text-slate-400" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {Object.keys(visibleColumns).map(key => (
                        <label 
                          key={key} 
                          className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 p-2 rounded-lg transition-colors"
                        >
                          <input 
                            type="checkbox" 
                            checked={visibleColumns[key]} 
                            onChange={() => setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }))} 
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">
                            {key === 'name' ? 'שם' : key === 'value' ? 'שווי' : key === 'symbol' ? 'סמל' : key === 'instrument' ? 'מטבעות בסיס' : key === 'platform' ? 'חשבונות וארנקים' : key === 'category' ? 'אפיקי השקעה' : key === 'tags' ? 'תגיות' : key}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Group By Selector */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
            {getGroupIcon()}
            חלוקה לפי:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setGroupBy('platform')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                groupBy === 'platform'
                  ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              <Building2 size={16} className="inline ml-1" />
              חשבונות וארנקים
            </button>
            <button
              onClick={() => setGroupBy('category')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                groupBy === 'category'
                  ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              <Layers size={16} className="inline ml-1" />
              אפיקי השקעה
            </button>
            <button
              onClick={() => setGroupBy('instrument')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                groupBy === 'instrument'
                  ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              <LayoutGrid size={16} className="inline ml-1" />
              מטבעות בסיס
            </button>
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
            {/* כפתור הרחב/צמצם הכל */}
            {groupedAssets.length > 1 && (
              <div className="flex justify-end">
                <button
                  onClick={toggleAllGroups}
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
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
              </div>
            )}
            
            {groupedAssets.map(({ key, items, totalValue }) => {
              const groupColor = getGroupColor(key);
              const isExpanded = expandedGroups.has(key);
              
              return (
                <div key={key} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {/* Group Header */}
                  <div
                    className="px-4 md:px-6 py-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
                    style={{ borderRight: `4px solid ${groupColor}` }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* שמאל: כפתור הוספה + הרחב/צמצם */}
                      <div className="flex items-center gap-3 flex-shrink-0">
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
                        <button
                          onClick={() => toggleGroup(key)}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                          title={isExpanded ? 'צמצם' : 'הרחב'}
                        >
                          {isExpanded ? (
                            <ChevronUp size={20} />
                          ) : (
                            <ChevronDown size={20} />
                          )}
                        </button>
                      </div>

                      {/* Center: Group Info */}
                      <button
                        onClick={() => toggleGroup(key)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-right hover:opacity-80 transition-opacity"
                      >
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm ring-2 ring-white dark:ring-slate-800"
                          style={{ 
                            backgroundColor: groupColor,
                            boxShadow: `0 0 0 2px ${groupColor}20, 0 2px 8px ${groupColor}40`
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white truncate">{key}</h3>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{items.length} נכסים</span>
                        </div>
                      </button>

                      {/* Right: Value Info */}
                      <div className="text-right flex-shrink-0 min-w-[100px]">
                        <div className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
                          ₪{totalValue.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {((totalValue / sortedAssets.reduce((sum, a) => sum + (a.value || 0), 0)) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* טבלת נכסים - ניתן לצמצום */}
                  {isExpanded && (
                    <div className="overflow-x-auto">
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
                        {visibleColumns.platform && (
                          <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('platform')}>
                            חשבונות וארנקים
                          </th>
                        )}
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
                          {visibleColumns.platform && (
                            <td className="p-3 md:p-4 text-slate-500 dark:text-slate-400">{asset.platform}</td>
                          )}
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
                                  {asset.hasLivePrice && (
                                    <div className="text-xs text-emerald-500">● Live</div>
                                  )}
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
                                {asset.currency === 'USD' ? '$' : '₪'}{(asset.originalValue || 0).toLocaleString()}
                              </div>
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
                                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors"
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
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      <Modal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)} title={selectedAsset?.name}>
        {selectedAsset && (
          <div className="space-y-6">
            {/* Value Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl">
                <div className="text-sm text-slate-500 dark:text-slate-400">שווי נוכחי</div>
                <div className="text-2xl font-bold text-slate-800 dark:text-white">₪{selectedAsset.value.toLocaleString()}</div>
                {selectedAsset.hasLivePrice && (
                  <div className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    מחיר חי
              </div>
                )}
              </div>
              {selectedAsset.profitLoss !== null && selectedAsset.profitLoss !== undefined ? (
                <div className={`p-4 rounded-xl ${selectedAsset.profitLoss >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                  <div className="text-sm text-slate-500 dark:text-slate-400">רווח/הפסד</div>
                  <div className={`text-2xl font-bold ${selectedAsset.profitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {selectedAsset.profitLoss >= 0 ? '+' : ''}₪{Math.round(selectedAsset.profitLoss).toLocaleString()}
                  </div>
                  <div className={`text-sm ${selectedAsset.profitLossPercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {selectedAsset.profitLossPercent >= 0 ? '+' : ''}{selectedAsset.profitLossPercent?.toFixed(2)}%
                  </div>
                </div>
              ) : (
              <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl">
                <div className="text-sm text-slate-500 dark:text-slate-400">שווי מקור</div>
                <div className="text-2xl font-bold text-slate-800 dark:text-white" dir="ltr">
                    {formatMoney(selectedAsset.originalValue || 0, selectedAsset.currency)}
                </div>
              </div>
              )}
            </div>

            {/* Quantity Info (if available) */}
            {selectedAsset.assetMode === 'QUANTITY' && selectedAsset.quantity && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                  <div className="text-xs text-blue-600 dark:text-blue-400">כמות</div>
                  <div className="font-bold text-blue-700 dark:text-blue-300 font-mono">
                    {selectedAsset.quantity.toLocaleString('en-US', { maximumFractionDigits: 6 })}
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg text-center">
                  <div className="text-xs text-purple-600 dark:text-purple-400">מחיר רכישה</div>
                  <div className="font-bold text-purple-700 dark:text-purple-300 font-mono" dir="ltr">
                    {selectedAsset.currency === 'USD' ? '$' : '₪'}{(selectedAsset.purchasePrice || 0).toLocaleString()}
                  </div>
                </div>
                {selectedAsset.currentPrice && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg text-center">
                    <div className="text-xs text-emerald-600 dark:text-emerald-400">מחיר נוכחי</div>
                    <div className="font-bold text-emerald-700 dark:text-emerald-300 font-mono" dir="ltr">
                      ${selectedAsset.currentPrice.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex border-b border-slate-100 dark:border-slate-700 pb-2">
                <span className="w-1/3 text-slate-500 dark:text-slate-400">חשבונות וארנקים</span>
                <span className="font-medium text-slate-800 dark:text-white">{selectedAsset.platform}</span>
              </div>
              <div className="flex border-b border-slate-100 dark:border-slate-700 pb-2">
                <span className="w-1/3 text-slate-500 dark:text-slate-400">מטבעות בסיס</span>
                <span className="font-medium text-slate-800 dark:text-white">{selectedAsset.instrument}</span>
              </div>
              <div className="flex border-b border-slate-100 dark:border-slate-700 pb-2">
                <span className="w-1/3 text-slate-500 dark:text-slate-400">אפיקי השקעה</span>
                <span className="font-medium text-slate-800 dark:text-white">{selectedAsset.category}</span>
              </div>
              <div className="flex border-b border-slate-100 dark:border-slate-700 pb-2">
                <span className="w-1/3 text-slate-500 dark:text-slate-400">סמל נכס</span>
                <span className="font-medium text-slate-800 dark:text-white font-mono">
                  {selectedAsset.symbol || <span className="text-slate-400 dark:text-slate-500 italic">ללא סמל</span>}
                </span>
              </div>
              {selectedAsset.purchaseDate && (
                <div className="flex border-b border-slate-100 dark:border-slate-700 pb-2">
                  <span className="w-1/3 text-slate-500 dark:text-slate-400">תאריך רכישה</span>
                  <span className="font-medium text-slate-800 dark:text-white">
                    {new Date(selectedAsset.purchaseDate).toLocaleDateString('he-IL')}
                  </span>
                </div>
              )}
              {selectedAsset.assetType && (
                <div className="flex border-b border-slate-100 dark:border-slate-700 pb-2">
                  <span className="w-1/3 text-slate-500 dark:text-slate-400">סוג נכס</span>
                  <span className="font-medium text-slate-800 dark:text-white">
                    {selectedAsset.assetType === 'CRYPTO' ? '🪙 קריפטו' : 
                     selectedAsset.assetType === 'STOCK' ? '📈 מניה' : 
                     selectedAsset.assetType === 'INDEX' ? '📊 מדד' : 
                     selectedAsset.assetType === 'ETF' ? '📦 תעודת סל' : '📝 ידני'}
                  </span>
                </div>
              )}
            </div>

            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">תגיות משויכות</div>
              <div className="flex flex-wrap gap-2">
                {selectedAsset.tags && selectedAsset.tags.map((tag, i) => (
                  <span key={i} className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-sm font-medium border border-purple-100 dark:border-purple-800">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button 
                onClick={() => { handleEdit(selectedAsset); setSelectedAsset(null); }} 
                className="bg-slate-900 dark:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-600"
              >
                <Edit2 size={16} /> ערוך נכס
              </button>
            </div>
          </div>
        )}
      </Modal>
        </>
      )}
    </div>
  );
};

// Modern Sources Configuration Component
const SourcesConfiguration = ({ systemData, onAdd, onUpdate, onDelete, getSourceTypeTitle, getSourceTypeDescription, getSourceTypeIcon }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editType, setEditType] = useState(null);
  const [expandedSections, setExpandedSections] = useState(new Set(['platforms', 'categories', 'symbols', 'instruments'])); // All expanded by default

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
    const allTypes = ['platforms', 'categories', 'symbols', 'instruments'];
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
    { key: 'symbols', order: 3 },
    { key: 'instruments', order: 4 }
  ];

  return (
    <>
      {/* כותרת עם כפתור הרחב/צמצם הכל */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">הגדרת מקורות</h3>
          {/* <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">נהל את החשבונות, אפיקי ההשקעה והנכסים למעקב</p> */}
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
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
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
                className={`divide-y divide-slate-100 dark:divide-slate-700/50 transition-all duration-300 ease-in-out overflow-hidden ${
                  isExpanded 
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
                  data.map((item) => {
                    const itemName = (isSymbols && typeof item === 'string') ? item : item.name;
                    const itemColor = (isSymbols && typeof item === 'string') ? '#94a3b8' : item.color;
                    
                    return (
                      <div
                        key={itemName}
                        className="group px-4 md:px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-4">
                          {/* Left: Color + Name */}
                          <div className="flex items-center gap-4 flex-1 min-w-0">
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
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditModal(type, item)}
                              className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
                              title="ערוך"
                            >
                              <Edit2 size={18} />
                            </button>
                            {/* Hide delete button for fixed data */}
                            {!(type === 'instruments' && FIXED_INSTRUMENTS.some(fi => fi.name === itemName)) &&
                             !(type === 'categories' && FIXED_CATEGORIES.some(fc => fc.name === itemName)) && (
                            <button
                              onClick={() => onDelete(type, itemName)}
                              className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              title="מחק"
                            >
                              <Trash2 size={18} />
                            </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
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
    switch(t) {
      case 'categories': return 'אפיקי השקעה';
      case 'platforms': return 'חשבונות וארנקים';
      case 'instruments': return 'מטבעות בסיס';
      case 'symbols': return 'נכסים למעקב';
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

export default AssetManager;

