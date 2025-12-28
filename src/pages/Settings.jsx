import { useState, useEffect } from 'react';
import { Plus, Trash2, Settings as SettingsIcon, RefreshCw, DollarSign, Palette, Tag, Database, Info, Edit2, Check, X, BarChart3, ArrowUp, ArrowDown, Target, Monitor, Smartphone, Moon, Sun, Sparkles } from 'lucide-react';
import { confirmAlert, successToast } from '../utils/alerts';
import { generateRandomColor } from '../constants/defaults';
import { subscribeToChartConfigs, deleteChartConfig, saveChartConfig, updateChartOrders } from '../services/chartService';
import { useDarkMode } from '../hooks/useDarkMode';
import { Link } from 'react-router-dom';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../services/firebase';

const Settings = ({ systemData, setSystemData, currencyRate, user, onResetData, onRefreshCurrency }) => {
  const [activeSection, setActiveSection] = useState('system');
  const [charts, setCharts] = useState([]);
  const [editingChart, setEditingChart] = useState(null);
  const [editChartName, setEditChartName] = useState('');
  const [isRefreshingCurrency, setIsRefreshingCurrency] = useState(false);
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // AI Config state
  const [aiConfig, setAiConfig] = useState({
    historyLimit: 10,
    contextEnabled: true
  });

  // Read hash from URL to set active section
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'charts' || hash === 'goals' || hash === 'appearance' || hash === 'ai') {
      setActiveSection(hash);
    }
  }, []);

  // Load AI Config from Firestore
  useEffect(() => {
    if (!user || !db) return;

    const aiConfigRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'aiConfig');
    
    const loadAiConfig = async () => {
      try {
        const docSnap = await getDoc(aiConfigRef);
        if (docSnap.exists()) {
          setAiConfig(docSnap.data());
        } else {
          // Create default config
          const defaultConfig = { historyLimit: 10, contextEnabled: true };
          await setDoc(aiConfigRef, defaultConfig);
          setAiConfig(defaultConfig);
        }
      } catch (error) {
        console.error('Error loading AI config:', error);
      }
    };

    loadAiConfig();

    // Listen for changes
    const unsubscribe = onSnapshot(aiConfigRef, (snapshot) => {
      if (snapshot.exists()) {
        setAiConfig(snapshot.data());
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Save AI Config to Firestore
  const saveAiConfig = async (newConfig) => {
    if (!user || !db) return;
    try {
      const aiConfigRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'aiConfig');
      await setDoc(aiConfigRef, newConfig);
      await successToast('ההגדרות נשמרו', 1500);
    } catch (error) {
      console.error('Error saving AI config:', error);
      await successToast('שגיאה בשמירת ההגדרות', 2000);
    }
  };

  // Update hash when active section changes
  useEffect(() => {
    if (activeSection !== 'system') {
      window.location.hash = activeSection;
    } else {
      // Remove hash for system section
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [activeSection]);

  // Subscribe to chart configurations
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = subscribeToChartConfigs(user, (configs) => {
      const sortedCharts = configs.sort((a, b) => (a.order || 0) - (b.order || 0));
      setCharts(sortedCharts);
    });

    return () => unsubscribe();
  }, [user]);


  const handleAdd = (type, name, color) => {
    if (!name.trim()) return;
    const newList = [...systemData[type], { name: name.trim(), color: color || generateRandomColor() }];
    const updatedData = { ...systemData, [type]: newList };
    setSystemData(updatedData);
    successToast('נוסף בהצלחה', 1500);
  };

  const handleUpdate = (type, oldName, newName, newColor) => {
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

  const getItemDescription = (type, itemName) => {
    switch(type) {
      case 'categories':
        return 'קטגוריות ראשיות למיון הנכסים שלך. כל נכס משויך לקטגוריה אחת (מניות, קריפטו, מזומן וכו\'). הצבע שתגדיר כאן יוצג בתרשימים ובדשבורד כדי להבדיל בין הקטגוריות השונות.';
      case 'platforms':
        return 'פלטפורמות שבהן אתה מחזיק נכסים - בנקים, בורסות, ארנקים דיגיטליים וכו\'. כל נכס משויך לפלטפורמה אחת. הצבע שתגדיר כאן יוצג בתרשימים כדי להבדיל בין הפלטפורמות השונות.';
      case 'instruments':
        return 'סוגי מכשירים פיננסיים - מזומן, מניות, קרנות סל (ETF), קרנות נאמנות, קריפטו וכו\'. כל נכס משויך למכשיר אחד. הצבע שתגדיר כאן יוצג בתרשימים כדי להבדיל בין סוגי המכשירים השונים.';
      case 'symbols':
        return 'סמלי נכסים (Tickers) - מזהה סטנדרטי לזיהוי נכסים זהים על פני פלטפורמות שונות. לדוגמה: BTC, ETH, AAPL, SPX. זה מאפשר לקבץ נכסים זהים מפלטפורמות שונות יחד. הצבע שתגדיר כאן יוצג בתרשימים.';
      default:
        return '';
    }
  };

  const handleDelete = async (type, name) => {
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

  const getTypeIcon = (type) => {
    switch(type) {
      case 'categories': return <Tag size={18} className="text-emerald-600" />;
      case 'platforms': return <Database size={18} className="text-emerald-600" />;
      case 'instruments': return <Palette size={18} className="text-emerald-600" />;
      case 'symbols': return <Tag size={18} className="text-emerald-600" />;
      default: return null;
    }
  };

  const getTypeTitle = (type) => {
    switch(type) {
      case 'categories': return 'קטגוריות (ראשי)';
      case 'platforms': return 'פלטפורמות';
      case 'instruments': return 'מכשירים';
      case 'symbols': return 'סמלי נכסים';
      default: return '';
    }
  };

  // Chart management functions
  const handleDeleteChart = async (chartId, chartTitle) => {
    const confirmed = await confirmAlert('מחיקה', `למחוק את הגרף "${chartTitle}"?`, 'warning', true);
    if (confirmed) {
      try {
        await deleteChartConfig(user, chartId);
        await successToast('נמחק בהצלחה', 2000);
      } catch (error) {
        console.error('Error deleting chart:', error);
        await successToast('אירעה שגיאה במחיקה', 2000);
      }
    }
  };

  const handleStartEditChart = (chart) => {
    setEditingChart(chart.id);
    setEditChartName(chart.title);
  };

  const handleSaveChartName = async (chart) => {
    if (!editChartName.trim()) return;
    
    try {
      await saveChartConfig(user, {
        ...chart,
        id: chart.id,
        title: editChartName.trim()
      });
      setEditingChart(null);
      setEditChartName('');
      await successToast('עודכן בהצלחה', 1500);
    } catch (error) {
      console.error('Error updating chart:', error);
      await successToast('אירעה שגיאה בעדכון', 2000);
    }
  };

  const handleCancelEditChart = () => {
    setEditingChart(null);
    setEditChartName('');
  };

  const handleMoveChart = async (chartId, direction) => {
    const currentIndex = charts.findIndex(c => c.id === chartId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= charts.length) return;

    const updatedCharts = [...charts];
    const [movedChart] = updatedCharts.splice(currentIndex, 1);
    updatedCharts.splice(newIndex, 0, movedChart);

    // Update orders
    const chartsWithNewOrders = updatedCharts.map((chart, index) => ({
      ...chart,
      order: index + 1
    }));

    try {
      await updateChartOrders(user, chartsWithNewOrders);
      await successToast('סדר עודכן בהצלחה', 1500);
    } catch (error) {
      console.error('Error updating chart order:', error);
      await successToast('אירעה שגיאה בעדכון הסדר', 2000);
    }
  };

  const handleChangeChartSize = async (chart, newSize) => {
    try {
      await saveChartConfig(user, {
        ...chart,
        id: chart.id,
        size: newSize
      });
      await successToast('גודל עודכן בהצלחה', 1500);
    } catch (error) {
      console.error('Error updating chart size:', error);
      await successToast('אירעה שגיאה בעדכון הגודל', 2000);
    }
  };

  const getSizeLabel = (size) => {
    switch(size) {
      case 'small': return 'קטן';
      case 'medium': return 'בינוני';
      case 'large': return 'גדול';
      default: return 'בינוני';
    }
  };

  const getSizeDescription = (size) => {
    switch(size) {
      case 'small': return 'חצי רוחב דף בשורה אחת';
      case 'medium': return 'כל רוחב הדף שורה אחת';
      case 'large': return 'כל רוחב הדף לשני שורות';
      default: return 'כל רוחב הדף שורה אחת';
    }
  };

  const formatLastUpdated = (dateString) => {
    if (!dateString) return 'לא עודכן';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'עכשיו';
      if (diffMins < 60) return `לפני ${diffMins} דקות`;
      if (diffHours < 24) return `לפני ${diffHours} שעות`;
      if (diffDays === 1) return 'אתמול';
      if (diffDays < 7) return `לפני ${diffDays} ימים`;
      
      // Format full date in Hebrew
      return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'תאריך לא תקין';
    }
  };

  const handleRefreshCurrency = async () => {
    if (!onRefreshCurrency || isRefreshingCurrency) return;
    setIsRefreshingCurrency(true);
    try {
      await onRefreshCurrency();
      successToast('שער החליפין עודכן בהצלחה', 1500);
    } catch (error) {
      console.error('Error refreshing currency:', error);
      successToast('אירעה שגיאה בעדכון שער החליפין', 2000);
    } finally {
      setIsRefreshingCurrency(false);
    }
  };

  const ListEditor = ({ type, data, title }) => {
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState('#3b82f6');
    const [isFocused, setIsFocused] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('');
    const isSymbols = type === 'symbols';

    const handleSubmit = (e) => {
      e.preventDefault();
      if (newName.trim()) {
        const trimmedValue = isSymbols ? newName.trim().toUpperCase() : newName.trim();
        // Check if already exists
        const exists = systemData[type].some(item => {
          const itemName = (type === 'symbols' && typeof item === 'string') ? item : item.name;
          return itemName === trimmedValue;
        });
        if (exists) {
          successToast('הפריט כבר קיים', 1500);
          return;
        }
        handleAdd(type, trimmedValue, newColor);
        setNewName('');
        setNewColor(generateRandomColor());
      }
    };

    const handleStartEdit = (item) => {
      const itemName = (isSymbols && typeof item === 'string') ? item : item.name;
      const itemColor = (isSymbols && typeof item === 'string') ? '#94a3b8' : item.color;
      setEditingItem(itemName);
      setEditName(itemName);
      setEditColor(itemColor);
    };

    const handleSaveEdit = () => {
      if (!editName.trim()) return;
      const trimmedValue = isSymbols ? editName.trim().toUpperCase() : editName.trim();
      // Check if new name conflicts with existing item
      if (trimmedValue !== editingItem) {
        const exists = systemData[type].some(item => {
          const itemName = (type === 'symbols' && typeof item === 'string') ? item : item.name;
          return itemName === trimmedValue && itemName !== editingItem;
        });
        if (exists) {
          successToast('הפריט כבר קיים', 1500);
          return;
        }
      }
      handleUpdate(type, editingItem, trimmedValue, editColor);
      setEditingItem(null);
      setEditName('');
      setEditColor('');
    };

    const handleCancelEdit = () => {
      setEditingItem(null);
      setEditName('');
      setEditColor('');
    };

    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {getTypeIcon(type)}
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-100">{title}</h3>
              <div className="relative group/info">
                <button 
                  className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  title={getItemDescription(type, '')}
                >
                  <Info size={14} />
                </button>
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover/info:block z-50 w-64 pointer-events-none">
                  <div className="bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-lg py-2 px-3 shadow-2xl pointer-events-auto">
                    {getItemDescription(type, '')}
                    <div className="absolute top-full left-4 -mt-1">
                      <div className="border-4 border-transparent border-t-slate-800 dark:border-t-slate-700"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">{data.length} פריטים</span>
          </div>
        </div>

        {/* Add Form */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input 
                  type="color" 
                  value={newColor} 
                  onChange={e => setNewColor(e.target.value)} 
                  className="w-9 h-9 rounded-md cursor-pointer border border-slate-300 hover:border-slate-400 transition"
                  title="בחר צבע"
                />
              </div>
              <input 
                type="text" 
                value={newName} 
                onChange={e => setNewName(isSymbols ? e.target.value.toUpperCase() : e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={isSymbols ? "סמל חדש (AAPL, BTC)" : "שם חדש..."}
                className={`flex-1 border rounded-md px-3 py-2 text-sm transition-all outline-none ${
                  isSymbols ? 'font-mono' : ''
                } ${
                  isFocused 
                    ? 'border-emerald-500 ring-1 ring-emerald-200 bg-white dark:bg-slate-800 dark:text-slate-200' 
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500'
                }`}
              />
              <button 
                type="submit"
                disabled={!newName.trim()}
                className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 text-sm font-medium"
              >
                <Plus size={16} />
                הוסף
              </button>
            </div>
          </form>
        </div>

        {/* Items List */}
        <div className="p-3 max-h-80 overflow-y-auto custom-scrollbar">
          {(!data || data.length === 0) ? (
            <div className="text-center py-6 text-slate-400 dark:text-slate-500">
              <p className="text-sm">אין פריטים עדיין</p>
            </div>
          ) : (
            <div className="space-y-1">
              {data.map((item, index) => {
                const itemName = (isSymbols && typeof item === 'string') ? item : item.name;
                const itemColor = (isSymbols && typeof item === 'string') ? '#94a3b8' : item.color;
                const isEditing = editingItem === itemName;
                
                return (
                  <div 
                    key={itemName} 
                    className="group flex items-center justify-between px-3 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <div className="relative">
                          <input 
                            type="color" 
                            value={editColor} 
                            onChange={e => setEditColor(e.target.value)} 
                            className="w-8 h-8 rounded-md cursor-pointer border border-slate-300"
                            title="בחר צבע"
                          />
                        </div>
                        <input 
                          type="text" 
                          value={editName}
                          onChange={e => setEditName(isSymbols ? e.target.value.toUpperCase() : e.target.value)}
                          className={`flex-1 border border-emerald-500 rounded-md px-2.5 py-1.5 text-sm outline-none ring-1 ring-emerald-200 bg-white dark:bg-slate-800 dark:text-slate-200 ${
                            isSymbols ? 'font-mono' : ''
                          }`}
                          autoFocus
                        />
                        <button 
                          onClick={handleSaveEdit}
                          className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 p-1.5 rounded-md transition-all"
                          title="שמור"
                        >
                          <Check size={14} />
                        </button>
                        <button 
                          onClick={handleCancelEdit}
                          className="text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 p-1.5 rounded-md transition-all"
                          title="ביטול"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div 
                            className="w-4 h-4 rounded-full border border-slate-200 flex-shrink-0"
                            style={{ backgroundColor: itemColor }}
                          />
                          <span className={`text-slate-700 dark:text-slate-100 text-sm truncate ${isSymbols ? 'font-mono' : ''}`}>
                            {itemName}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => handleStartEdit(item)}
                            className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 p-1.5 rounded-md transition-all"
                            title="ערוך"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(type, itemName)} 
                            className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-md transition-all"
                            title="מחק"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Section */}
      <header className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <SettingsIcon className="text-emerald-600 dark:text-emerald-400" size={24} />
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">הגדרות</h2>
            <p className="text-slate-500 dark:text-slate-300 text-sm mt-0.5">נהל את הגדרות המערכת, הגרפים והיעדים</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Currency Info */}
          <div className="relative group/currency">
            <div 
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              onClick={handleRefreshCurrency}
            >
              <DollarSign className="text-emerald-600 dark:text-emerald-400" size={16} />
              <span className={`font-medium ${isRefreshingCurrency ? 'opacity-50' : ''}`}>
                ₪{currencyRate.rate}
              </span>
              {isRefreshingCurrency && (
                <RefreshCw size={14} className="animate-spin text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover/currency:block z-50 pointer-events-none">
              <div className="bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-lg py-2 px-3 shadow-2xl whitespace-nowrap">
                {currencyRate.lastUpdated 
                  ? `עודכן לאחרונה: ${formatLastUpdated(currencyRate.lastUpdated)}`
                  : currencyRate.date 
                    ? `תאריך: ${currencyRate.date}`
                    : 'לחץ לעדכן'}
                <div className="absolute top-full left-4 -mt-1">
                  <div className="border-4 border-transparent border-t-slate-800 dark:border-t-slate-700"></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Reset Database Button - Small */}
          <button 
            onClick={onResetData} 
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 px-3 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800"
            title="אתחול מסד נתונים - ימחק את כל הנתונים"
          >
            <RefreshCw size={14} />
            אתחול
          </button>
        </div>
      </header>

      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveSection('system')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeSection === 'system'
              ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          הגדרות מערכת
        </button>
        <button
          onClick={() => setActiveSection('charts')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeSection === 'charts'
              ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          הגרפים הותאמים
        </button>
        <button
          onClick={() => setActiveSection('appearance')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeSection === 'appearance'
              ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          מראה
        </button>
        <button
          onClick={() => setActiveSection('ai')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeSection === 'ai'
              ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          הגדרות AI
        </button>
        <button
          onClick={() => setActiveSection('goals')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeSection === 'goals'
              ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          הגדרת יעדים
        </button>
      </div>

      {/* System Settings Section */}
      {activeSection === 'system' && (
        <div className="space-y-4">
          {/* List Editors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            <ListEditor type="categories" data={systemData.categories} title={getTypeTitle('categories')} />
            <ListEditor type="platforms" data={systemData.platforms} title={getTypeTitle('platforms')} />
            <ListEditor type="instruments" data={systemData.instruments} title={getTypeTitle('instruments')} />
            <ListEditor type="symbols" data={systemData.symbols || []} title={getTypeTitle('symbols')} />
          </div>
        </div>
      )}

      {/* Custom Charts Section */}
      {activeSection === 'charts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">ניהול גרפים מותאמים</h3>
              <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">ערוך, מחק ושנה את סדר הצגת הגרפים בדשבורד</p>
            </div>
            <Link
              to="/chart-builder"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition text-sm font-medium"
            >
              <Plus size={16} />
              צור גרף חדש
            </Link>
          </div>

          {charts.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-12 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
              <BarChart3 className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
              <h4 className="text-base font-semibold text-slate-700 dark:text-slate-100 mb-2">אין גרפים מותאמים</h4>
              <p className="text-sm text-slate-500 dark:text-slate-300 mb-6">צור גרפים חדשים באמצעות בונה הגרפים</p>
              <Link
                to="/chart-builder"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition text-sm font-medium"
              >
                <Plus size={16} />
                צור גרף חדש
              </Link>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {charts.map((chart, index) => {
                  const isEditing = editingChart === chart.id;
                  
                  return (
                    <div 
                      key={chart.id}
                      className="group p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {/* Order Controls */}
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleMoveChart(chart.id, 'up')}
                            disabled={index === 0}
                            className="p-1 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="הזז למעלה"
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            onClick={() => handleMoveChart(chart.id, 'down')}
                            disabled={index === charts.length - 1}
                            className="p-1 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="הזז למטה"
                          >
                            <ArrowDown size={16} />
                          </button>
                        </div>

                        {/* Chart Info */}
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editChartName}
                                onChange={(e) => setEditChartName(e.target.value)}
                                className="flex-1 border border-emerald-500 rounded-md px-3 py-1.5 text-sm outline-none ring-1 ring-emerald-200 bg-white dark:bg-slate-800 dark:text-slate-200"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveChartName(chart);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEditChart();
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleSaveChartName(chart)}
                                className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 p-1.5 rounded-md transition-all"
                                title="שמור"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={handleCancelEditChart}
                                className="text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 p-1.5 rounded-md transition-all"
                                title="ביטול"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <BarChart3 size={18} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                              <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100 truncate">{chart.title}</h4>
                            </div>
                          )}
                          
                          {!isEditing && (
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                              <span>סוג: {chart.chartType}</span>
                              <span>•</span>
                              <span>קיבוץ: {chart.dataKey}</span>
                            </div>
                          )}
                        </div>

                        {/* Size Selector */}
                        {!isEditing && (
                          <div className="flex items-center gap-2">
                            <Monitor size={16} className="text-slate-400 dark:text-slate-500" />
                            <select
                              value={chart.size || 'medium'}
                              onChange={(e) => handleChangeChartSize(chart, e.target.value)}
                              className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-800"
                              title="גודל הגרף במחשב (בטלפון תמיד אותו קוביה)"
                            >
                              <option value="small">קטן - חצי רוחב</option>
                              <option value="medium">בינוני - רוחב מלא</option>
                              <option value="large">גדול - רוחב מלא, 2 שורות</option>
                            </select>
                            <div className="text-xs text-slate-400 dark:text-slate-500 hidden md:block">
                              <Smartphone size={14} className="inline mr-1" />
                              בטלפון: תמיד אותו קוביה
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        {!isEditing && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => handleStartEditChart(chart)}
                              className="text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 p-2 rounded-md transition-all"
                              title="ערוך שם"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteChart(chart.id, chart.title)}
                              className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-md transition-all"
                              title="מחק"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Appearance Section */}
      {activeSection === 'appearance' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <Palette size={18} className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-100">הגדרות מראה</h3>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isDarkMode ? (
                    <Moon size={20} className="text-slate-600 dark:text-slate-300" />
                  ) : (
                    <Sun size={20} className="text-slate-600 dark:text-slate-300" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-100">מצב כהה</p>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">החלף בין מצב בהיר לכהה</p>
                  </div>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    isDarkMode ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  role="switch"
                  aria-checked={isDarkMode}
                  aria-label="מצב כהה"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isDarkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Configuration Section */}
      {activeSection === 'ai' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <Sparkles size={18} className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-100">הגדרות יועץ AI</h3>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* History Limit Slider */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-100">
                      זיכרון צ'אט (הודעות)
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                      מספר ההודעות האחרונות שנשלחות ל-AI (Context Window)
                    </p>
                  </div>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {aiConfig.historyLimit}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={aiConfig.historyLimit}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value);
                    const newConfig = { ...aiConfig, historyLimit: newValue };
                    setAiConfig(newConfig);
                    saveAiConfig(newConfig);
                  }}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mt-1">
                  <span>1</span>
                  <span>20</span>
                </div>
              </div>

              {/* Context Enabled Toggle */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-100">
                    כלול נתוני תיק השקעות
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                    כאשר מופעל, נתוני התיק נשלחים אוטומטית ל-AI כהקשר
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newConfig = { ...aiConfig, contextEnabled: !aiConfig.contextEnabled };
                    setAiConfig(newConfig);
                    saveAiConfig(newConfig);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    aiConfig.contextEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  role="switch"
                  aria-checked={aiConfig.contextEnabled}
                  aria-label="כלול נתוני תיק השקעות"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      aiConfig.contextEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goals Section */}
      {activeSection === 'goals' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
            <Target className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-white mb-2">הגדרת יעדים</h3>
            <p className="text-sm text-slate-500 dark:text-slate-300">פיצ'ר זה ייבנה בהמשך</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
