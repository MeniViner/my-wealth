import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAssets } from '../hooks/useAssets';
import { useCurrency } from '../hooks/useCurrency';
import { useSystemData } from '../hooks/useSystemData';
import { saveChartConfig, subscribeToChartConfigs, deleteChartConfig, updateChartOrders } from '../services/chartService';
import { aggregateData, getColorForItem } from '../utils/chartUtils';
import ChartRenderer from '../components/ChartRenderer';
import { successAlert, errorAlert, confirmAlert, successToast } from '../utils/alerts';
import CustomSelect from '../components/CustomSelect';
import { Save, BarChart3, Filter, X, Eye, PieChart, BarChart, BarChart2, Radar, Gauge, LayoutGrid, Plus, Trash2, ArrowUp, ArrowDown, Monitor, Smartphone, Edit2, Check } from 'lucide-react';

const ChartBuilder = () => {
  const { user } = useAuth();
  const { currencyRate } = useCurrency(user);
  const { assets } = useAssets(user, currencyRate.rate);
  const { systemData } = useSystemData(user);

  const [config, setConfig] = useState({
    title: '',
    chartType: 'PieChart',
    dataKey: 'category',
    aggregationType: 'sum',
    isVisible: true,
    order: 1,
    size: 'medium',
    filters: {
      category: '',
      platform: '',
      instrument: '',
      currency: '',
      tags: []
    }
  });

  const [saving, setSaving] = useState(false);
  const [charts, setCharts] = useState([]);
  const [editingChart, setEditingChart] = useState(null);
  const [editChartName, setEditChartName] = useState('');
  const [editingChartId, setEditingChartId] = useState(null); // For editing chart in create tab
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'manage'

  // Get unique values for filter dropdowns
  const uniqueCategories = useMemo(() => {
    return [...new Set(assets.map(a => a.category))].filter(Boolean);
  }, [assets]);

  const uniquePlatforms = useMemo(() => {
    return [...new Set(assets.map(a => a.platform))].filter(Boolean);
  }, [assets]);

  const uniqueInstruments = useMemo(() => {
    return [...new Set(assets.map(a => a.instrument))].filter(Boolean);
  }, [assets]);

  const uniqueCurrencies = useMemo(() => {
    return [...new Set(assets.map(a => a.currency))].filter(Boolean);
  }, [assets]);

  const allTags = useMemo(() => {
    const tagSet = new Set();
    assets.forEach(a => {
      if (a.tags && Array.isArray(a.tags)) {
        a.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet);
  }, [assets]);

  // Helper function to get color for chart items
  const getColorForItem = (name, dataKey, systemData) => {
    if (dataKey === 'category') {
      return systemData.categories.find(c => c.name === name)?.color || '#3b82f6';
    }
    if (dataKey === 'platform') {
      return systemData.platforms.find(p => p.name === name)?.color || '#10b981';
    }
    if (dataKey === 'instrument') {
      return systemData.instruments.find(i => i.name === name)?.color || '#f59e0b';
    }
    if (dataKey === 'symbol') {
      const symbol = systemData.symbols?.find(s => {
        const symbolName = typeof s === 'string' ? s : s.name;
        return symbolName === name;
      });
      if (symbol) {
        return typeof symbol === 'string' ? '#94a3b8' : symbol.color;
      }
    }
    // Default colors for other groupings
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#14b8a6'];
    return colors[Math.abs(name.charCodeAt(0)) % colors.length];
  };

  // Helper function to get chart data for a chart config
  const getChartDataForConfig = (chartConfig) => {
    const aggregated = aggregateData(assets, chartConfig.dataKey, chartConfig.filters || {});
    
    if (chartConfig.chartType === 'Treemap') {
      return aggregated.map(item => ({
        name: item.name,
        size: item.value,
        fill: getColorForItem(item.name, chartConfig.dataKey, systemData)
      }));
    }
    return aggregated;
  };

  // Aggregate data based on current config
  const aggregatedData = useMemo(() => {
    return aggregateData(assets, config.dataKey, config.filters);
  }, [assets, config.dataKey, config.filters]);

  // Prepare data for different chart types
  const chartData = useMemo(() => {
    if (config.chartType === 'Treemap') {
      return aggregatedData.map(item => ({
        name: item.name,
        size: item.value,
        fill: getColorForItem(item.name, config.dataKey, systemData)
      }));
    }
    return aggregatedData;
  }, [aggregatedData, config.chartType, config.dataKey, systemData]);

  const handleSave = async () => {
    if (!config.title.trim()) {
      await errorAlert('שגיאה', 'אנא הזן כותרת לגרף');
      return;
    }

    if (aggregatedData.length === 0) {
      await errorAlert('שגיאה', 'אין נתונים להצגה. נסה לשנות את הפילטרים או את מקור הנתונים.');
      return;
    }

    setSaving(true);
    try {
      if (editingChartId) {
        // Update existing chart
        await saveChartConfig(user, {
          ...config,
          id: editingChartId
        });
        await successAlert('הצלחה', 'הגרף עודכן בהצלחה!');
        setEditingChartId(null);
      } else {
        // Create new chart
        await saveChartConfig(user, config);
        await successAlert('הצלחה', 'הגרף נשמר בהצלחה!');
      }
      
      // Reset form
      setConfig({
        title: '',
        chartType: 'PieChart',
        dataKey: 'category',
        aggregationType: 'sum',
        isVisible: true,
        order: 1,
        size: 'medium',
        filters: {
          category: '',
          platform: '',
          instrument: '',
          currency: '',
          tags: []
        }
      });
    } catch (error) {
      console.error('Error saving chart config:', error);
      await errorAlert('שגיאה', 'אירעה שגיאה בשמירת הגרף');
    } finally {
      setSaving(false);
    }
  };

  const handleEditChart = (chart) => {
    // Load chart data into config
    setConfig({
      title: chart.title || '',
      chartType: chart.chartType || 'PieChart',
      dataKey: chart.dataKey || 'category',
      aggregationType: chart.aggregationType || 'sum',
      isVisible: chart.isVisible !== false,
      order: chart.order || 1,
      size: chart.size || 'medium',
      filters: {
        category: chart.filters?.category || '',
        platform: chart.filters?.platform || '',
        instrument: chart.filters?.instrument || '',
        currency: chart.filters?.currency || '',
        tags: chart.filters?.tags || []
      }
    });
    setEditingChartId(chart.id);
    setActiveTab('create');
  };

  // Calculate total value for percentage calculations
  const totalValue = useMemo(() => {
    return aggregatedData.reduce((sum, item) => sum + item.value, 0);
  }, [aggregatedData]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.values(config.filters).some(val => val !== '' && (Array.isArray(val) ? val.length > 0 : true));
  }, [config.filters]);

  const clearFilters = () => {
    setConfig(prev => ({
      ...prev,
      filters: {
        category: '',
        platform: '',
        instrument: '',
        currency: '',
        tags: []
      }
    }));
  };

  // Subscribe to chart configurations
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = subscribeToChartConfigs(user, (configs) => {
      const sortedCharts = configs.sort((a, b) => (a.order || 0) - (b.order || 0));
      setCharts(sortedCharts);
    });

    return () => unsubscribe();
  }, [user]);

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <header className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">בונה גרפים</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">צור והתאם אישית גרפים לדשבורד שלך</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => {
            if (!editingChartId) {
              // Reset form if not editing
              setConfig({
                title: '',
                chartType: 'PieChart',
                dataKey: 'category',
                aggregationType: 'sum',
                isVisible: true,
                order: 1,
                size: 'medium',
                filters: {
                  category: '',
                  platform: '',
                  instrument: '',
                  currency: '',
                  tags: []
                }
              });
            }
            setActiveTab('create');
          }}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'create'
              ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          צור גרף חדש
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'manage'
              ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          ניהול גרפים ({charts.length})
        </button>
      </div>

      {/* Create Chart Tab */}
      {activeTab === 'create' && (
        <>
          {editingChartId && (
            <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">אתה עורך גרף קיים</span>
              </div>
              <button
                onClick={() => {
                  setEditingChartId(null);
                  setConfig({
                    title: '',
                    chartType: 'PieChart',
                    dataKey: 'category',
                    aggregationType: 'sum',
                    isVisible: true,
                    order: 1,
                    size: 'medium',
                    filters: {
                      category: '',
                      platform: '',
                      instrument: '',
                      currency: '',
                      tags: []
                    }
                  });
                }}
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
              >
                ביטול עריכה
              </button>
            </div>
          )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Title Input */}
          <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 uppercase tracking-wide">
              כותרת הגרף
            </label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              placeholder="לדוגמה: פיזור לפי קטגוריות"
            />
          </div>

          {/* Chart Type Selector */}
          <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <label className="block text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">
              סוג גרף
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'PieChart', label: 'עוגה', icon: PieChart },
                { value: 'BarChart', label: 'עמודות', icon: BarChart },
                { value: 'HorizontalBarChart', label: 'אופקי', icon: BarChart2 },
                { value: 'RadarChart', label: 'רדאר', icon: Radar },
                { value: 'RadialBar', label: 'רדיאלי', icon: Gauge },
                { value: 'Treemap', label: 'מפה', icon: LayoutGrid }
              ].map(type => {
                const IconComponent = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setConfig({ ...config, chartType: type.value })}
                    className={`px-3 py-2.5 text-xs font-medium rounded-lg transition border flex flex-col items-center gap-1 ${
                      config.chartType === type.value
                        ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-600'
                        : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                    }`}
                  >
                    <IconComponent size={16} />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group By Selector */}
          <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <label className="block text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">
              קיבוץ לפי
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'category', label: 'אפיקי השקעה' },
                { value: 'platform', label: 'חשבונות וארנקים' },
                { value: 'instrument', label: 'מטבעות בסיס' },
                { value: 'symbol', label: 'סמל' },
                { value: 'tags', label: 'תגיות' },
                { value: 'currency', label: 'מטבע' }
              ].map(group => (
                <button
                  key={group.value}
                  onClick={() => setConfig({ ...config, dataKey: group.value })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                    config.dataKey === group.value
                      ? 'bg-slate-800 dark:bg-slate-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                <Filter size={14} />
                פילטרים
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                  title="נקה פילטרים"
                >
                  <X size={12} />
                  נקה
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">אפיקי השקעה</label>
                <CustomSelect
                  value={config.filters.category || ''}
                  onChange={(val) => setConfig({
                    ...config,
                    filters: { ...config.filters, category: val }
                  })}
                  options={[
                    { value: '', label: 'הכל' },
                    ...uniqueCategories.map(cat => ({
                      value: cat,
                      label: cat,
                      iconColor: systemData?.categories?.find(c => c.name === cat)?.color
                    }))
                  ]}
                  placeholder="הכל"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">חשבונות וארנקים</label>
                <CustomSelect
                  value={config.filters.platform || ''}
                  onChange={(val) => setConfig({
                    ...config,
                    filters: { ...config.filters, platform: val }
                  })}
                  options={[
                    { value: '', label: 'הכל' },
                    ...uniquePlatforms.map(plat => ({
                      value: plat,
                      label: plat,
                      iconColor: systemData?.platforms?.find(p => p.name === plat)?.color
                    }))
                  ]}
                  placeholder="הכל"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">מטבע</label>
                <CustomSelect
                  value={config.filters.currency || ''}
                  onChange={(val) => setConfig({
                    ...config,
                    filters: { ...config.filters, currency: val }
                  })}
                  options={[
                    { value: '', label: 'הכל' },
                    ...uniqueCurrencies.map(curr => ({
                      value: curr,
                      label: curr
                    }))
                  ]}
                  placeholder="הכל"
                  className="text-xs"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Preview Area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Preview Header */}
            <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Eye size={18} className="text-slate-500 dark:text-slate-400" />
                <h3 className="text-base md:text-lg font-semibold text-slate-800 dark:text-white">
                  {config.title || 'תצוגה מקדימה'}
                </h3>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                {!config.title && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                    הזן כותרת כדי לשמור
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving || !config.title.trim()}
                  className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-900 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 shadow-sm"
                >
                  <Save size={14} />
                  {saving ? 'שומר...' : editingChartId ? 'עדכן גרף' : 'שמור גרף'}
                </button>
              </div>
            </div>

            {/* Chart Display */}
            <div className="p-6">
              <div className="h-80">
                <ChartRenderer
                  config={config}
                  chartData={chartData}
                  systemData={systemData}
                  totalValue={totalValue}
                />
              </div>
            </div>
          </div>

          {/* Data Summary - Desktop only */}
          <div className="hidden lg:block">
            <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={14} className="text-slate-500 dark:text-slate-400" />
                <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">סיכום נתונים</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-300">פריטים בגרף</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{aggregatedData.length}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-300">סה"כ ערך</span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    ₪{aggregatedData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Data Summary - Mobile only */}
          <div className="lg:hidden">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={14} className="text-slate-500" />
                <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">סיכום נתונים</h3>
              </div>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
                  <span className="text-slate-600">פריטים בגרף</span>
                  <span className="font-semibold text-slate-800">{aggregatedData.length}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-600">סה"כ ערך</span>
                  <span className="font-semibold text-slate-800">
                    ₪{aggregatedData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Manage Charts Tab */}
      {activeTab === 'manage' && (
        <div className="space-y-6 pb-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">ניהול גרפים מותאמים</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">ערוך, מחק ושנה את סדר הצגת הגרפים בדשבורד</p>
            </div>
            <button
              onClick={() => setActiveTab('create')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all text-sm font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-95"
            >
              <Plus size={18} />
              <span>צור גרף חדש</span>
            </button>
          </div>

          {charts.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-8 md:p-12 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <BarChart3 className="text-slate-400 dark:text-slate-500" size={40} />
              </div>
              <h4 className="text-lg font-bold text-slate-700 dark:text-slate-100 mb-2">אין גרפים מותאמים</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">צור גרפים חדשים באמצעות בונה הגרפים כדי להציג אותם בדשבורד</p>
              <button
                onClick={() => setActiveTab('create')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all text-sm font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-95"
              >
                <Plus size={18} />
                <span>צור גרף חדש</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {charts.map((chart, index) => {
                const isEditing = editingChart === chart.id;
                
                // Calculate chart data for this chart
                const chartChartData = getChartDataForConfig(chart);
                const chartTotalValue = chartChartData.reduce((sum, item) => sum + (item.value || item.size || 0), 0);
                
                return (
                  <div 
                    key={chart.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="p-4 md:p-5 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800">
                      {isEditing ? (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <input
                            type="text"
                            value={editChartName}
                            onChange={(e) => setEditChartName(e.target.value)}
                            className="flex-1 border-2 border-emerald-500 rounded-xl px-4 py-3 text-base font-medium outline-none ring-2 ring-emerald-200 dark:ring-emerald-800 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveChartName(chart);
                              } else if (e.key === 'Escape') {
                                handleCancelEditChart();
                              }
                            }}
                            placeholder="הזן שם לגרף"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveChartName(chart)}
                              className="flex-1 sm:flex-none px-5 py-3 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all font-medium text-sm shadow-md active:scale-95"
                              title="שמור"
                            >
                              <span className="hidden sm:inline">שמור</span>
                              <Check size={18} className="sm:hidden mx-auto" />
                            </button>
                            <button
                              onClick={handleCancelEditChart}
                              className="px-5 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all font-medium text-sm active:scale-95"
                              title="ביטול"
                            >
                              <span className="hidden sm:inline">ביטול</span>
                              <X size={18} className="sm:hidden mx-auto" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
                              <BarChart3 size={20} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{chart.title}</h4>
                              <div className="flex flex-wrap items-center gap-2.5 mt-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                  {chart.chartType}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                  {chart.dataKey}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                              #{index + 1}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chart Preview */}
                    {!isEditing && chartChartData.length > 0 && (
                      <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                        <div className="h-96 md:h-[450px]">
                          <ChartRenderer
                            config={chart}
                            chartData={chartChartData}
                            systemData={systemData}
                            totalValue={chartTotalValue}
                          />
                        </div>
                      </div>
                    )}

                    {/* Card Body */}
                    {!isEditing && (
                      <div className="p-4 md:p-5 space-y-4">
                        {/* Size Selector - Hidden on mobile */}
                        <div className="hidden md:flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                            <Monitor size={18} className="text-slate-400 dark:text-slate-500" />
                            <span>גודל במחשב:</span>
                          </div>
                          <select
                            value={chart.size || 'medium'}
                            onChange={(e) => handleChangeChartSize(chart, e.target.value)}
                            className="flex-1 sm:flex-none sm:w-auto px-4 py-2.5 text-sm border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                          >
                            <option value="small">קטן - חצי רוחב</option>
                            <option value="medium">בינוני - רוחב מלא</option>
                            <option value="large">גדול - רוחב מלא, 2 שורות</option>
                          </select>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Smartphone size={14} />
                            <span>בטלפון: תמיד אותו קוביה</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                          {/* Order Controls - Mobile: Full width, Desktop: Auto */}
                          <div className="flex items-center gap-2 md:mr-auto">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">סדר:</span>
                            <button
                              onClick={() => handleMoveChart(chart.id, 'up')}
                              disabled={index === 0}
                              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                              title="הזז למעלה"
                            >
                              <ArrowUp size={18} />
                            </button>
                            <button
                              onClick={() => handleMoveChart(chart.id, 'down')}
                              disabled={index === charts.length - 1}
                              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                              title="הזז למטה"
                            >
                              <ArrowDown size={18} />
                            </button>
                          </div>

                          {/* Edit & Delete - Mobile: Stack, Desktop: Row */}
                          <div className="flex items-center gap-2">
                            {/* Edit Chart Button - Opens in create tab */}
                            <button
                              onClick={() => handleEditChart(chart)}
                              className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all font-medium text-sm flex items-center justify-center gap-2 active:scale-95 shadow-md"
                            >
                              <Edit2 size={16} />
                              <span>ערוך גרף</span>
                            </button>
                            {/* Edit Name Button - Desktop only */}
                            <button
                              onClick={() => handleStartEditChart(chart)}
                              className="hidden md:flex px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all font-medium text-sm items-center justify-center gap-2 active:scale-95"
                            >
                              <Edit2 size={16} />
                              <span>ערוך שם</span>
                            </button>
                            <button
                              onClick={() => handleDeleteChart(chart.id, chart.title)}
                              className="flex-1 md:flex-none px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all font-medium text-sm flex items-center justify-center gap-2 active:scale-95"
                            >
                              <Trash2 size={16} />
                              <span>מחק</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChartBuilder;

