import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Eye, ArrowUpDown, LayoutGrid, Layers, Building2, ChevronDown, ChevronUp, X } from 'lucide-react';
import Modal from '../components/Modal';
import { confirmAlert, successToast } from '../utils/alerts';

const AssetManager = ({ assets, onDelete, systemData }) => {
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
    value: true 
  });
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [groupBy, setGroupBy] = useState('platform'); // 'platform', 'category', 'instrument'
  const [expandedGroups, setExpandedGroups] = useState(new Set()); // Track which groups are expanded

  // Filtering
  const filteredAssets = assets.filter(asset => {
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

  // Toggle group expansion
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

  // Expand/collapse all groups
  const toggleAllGroups = () => {
    if (expandedGroups.size === groupedAssets.length) {
      // All expanded, collapse all
      setExpandedGroups(new Set());
    } else {
      // Expand all
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">ניהול נכסים</h2>
        <button 
          onClick={() => navigate('/assets/add')} 
          className="bg-emerald-600 dark:bg-emerald-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors shadow-sm"
        >
          <Plus size={18} /> 
          <span className="hidden sm:inline">הוסף נכס</span>
          <span className="sm:hidden">הוסף</span>
        </button>
      </header>

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
            <select 
              className="px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700" 
              value={filterCategory} 
              onChange={e => setFilterCategory(e.target.value)}
            >
              <option value="all">כל הקטגוריות</option>
              {systemData.categories.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
            <select 
              className="px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700" 
              value={filterPlatform} 
              onChange={e => setFilterPlatform(e.target.value)}
            >
              <option value="all">כל הפלטפורמות</option>
              {systemData.platforms.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
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
                  <div className="absolute top-12 left-0 md:left-auto md:right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl p-4 z-30 w-[280px] md:w-56 max-h-[80vh] overflow-y-auto">
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
                            {key === 'name' ? 'שם' : key === 'value' ? 'שווי' : key === 'symbol' ? 'סמל' : key === 'instrument' ? 'מכשיר' : key === 'platform' ? 'פלטפורמה' : key === 'category' ? 'קטגוריה' : key === 'tags' ? 'תגיות' : key}
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
              פלטפורמות
            </button>
            <button
              onClick={() => setGroupBy('category')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                groupBy === 'category'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Layers size={16} className="inline ml-1" />
              קטגוריות
            </button>
            <button
              onClick={() => setGroupBy('instrument')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                groupBy === 'instrument'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <LayoutGrid size={16} className="inline ml-1" />
              מכשירים
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
            {/* Expand/Collapse All Button */}
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
                  {/* Group Header - Clickable to expand/collapse */}
                  <button
                    onClick={() => toggleGroup(key)}
                    className="w-full px-4 md:px-6 py-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    style={{ borderRight: `4px solid ${groupColor}` }}
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronUp size={18} className="text-slate-400 dark:text-slate-500" />
                          ) : (
                            <ChevronDown size={18} className="text-slate-400 dark:text-slate-500" />
                          )}
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: groupColor }}
                          />
                        </div>
                        <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">{key}</h3>
                        <span className="text-sm text-slate-500 dark:text-slate-400">({items.length} נכסים)</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
                          ₪{totalValue.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {((totalValue / sortedAssets.reduce((sum, a) => sum + (a.value || 0), 0)) * 100).toFixed(1)}% מהסה"כ
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Assets Table - Collapsible */}
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
                            מכשיר
                          </th>
                        )}
                        {visibleColumns.platform && (
                          <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('platform')}>
                            פלטפורמה
                          </th>
                        )}
                        {visibleColumns.category && (
                          <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('category')}>
                            קטגוריה
                          </th>
                        )}
                        {visibleColumns.tags && <th className="p-4">תגיות</th>}
                        {visibleColumns.value && (
                          <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('value')}>
                            <div className="flex items-center gap-1">
                              שווי
                              <ArrowUpDown size={12} />
                            </div>
                          </th>
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
                          {visibleColumns.value && (
                            <td className="p-3 md:p-4">
                              <div className="font-bold text-slate-900 dark:text-white">₪{asset.value.toLocaleString()}</div>
                              <div className="text-xs text-slate-400 dark:text-slate-500" dir="ltr">
                                {asset.currency === 'USD' ? '$' : '₪'}{asset.originalValue.toLocaleString()}
                              </div>
                            </td>
                          )}
                          <td className="p-3 md:p-4" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl">
                <div className="text-sm text-slate-500 dark:text-slate-400">שווי בשקלים</div>
                <div className="text-2xl font-bold text-slate-800 dark:text-white">₪{selectedAsset.value.toLocaleString()}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl">
                <div className="text-sm text-slate-500 dark:text-slate-400">שווי מקור</div>
                <div className="text-2xl font-bold text-slate-800 dark:text-white" dir="ltr">
                  {formatMoney(selectedAsset.originalValue, selectedAsset.currency)}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex border-b border-slate-100 dark:border-slate-700 pb-2">
                <span className="w-1/3 text-slate-500 dark:text-slate-400">פלטפורמה</span>
                <span className="font-medium text-slate-800 dark:text-white">{selectedAsset.platform}</span>
              </div>
              <div className="flex border-b border-slate-100 dark:border-slate-700 pb-2">
                <span className="w-1/3 text-slate-500 dark:text-slate-400">מכשיר</span>
                <span className="font-medium text-slate-800 dark:text-white">{selectedAsset.instrument}</span>
              </div>
              <div className="flex border-b border-slate-100 dark:border-slate-700 pb-2">
                <span className="w-1/3 text-slate-500 dark:text-slate-400">קטגוריה</span>
                <span className="font-medium text-slate-800 dark:text-white">{selectedAsset.category}</span>
              </div>
              <div className="flex border-b border-slate-100 dark:border-slate-700 pb-2">
                <span className="w-1/3 text-slate-500 dark:text-slate-400">סמל נכס</span>
                <span className="font-medium text-slate-800 dark:text-white font-mono">
                  {selectedAsset.symbol || <span className="text-slate-400 dark:text-slate-500 italic">ללא סמל</span>}
                </span>
              </div>
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
    </div>
  );
};

export default AssetManager;

