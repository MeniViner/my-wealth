import { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAssets } from '../hooks/useAssets';
import { useCurrency } from '../hooks/useCurrency';
import { useSystemData } from '../hooks/useSystemData';
import { saveChartConfig } from '../services/chartService';
import { aggregateData, getColorForItem } from '../utils/chartUtils';
import ChartRenderer from '../components/ChartRenderer';
import { successAlert, errorAlert } from '../utils/alerts';
import { Save, BarChart3, Filter, X, Eye, PieChart, BarChart, BarChart2, Radar, Gauge, LayoutGrid } from 'lucide-react';

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
      await saveChartConfig(user, config);
      await successAlert('הצלחה', 'הגרף נשמר בהצלחה!');
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <header className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">בונה גרפים</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">צור והתאם אישית גרפים לדשבורד שלך</p>
      </header>

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
                { value: 'category', label: 'קטגוריה' },
                { value: 'platform', label: 'פלטפורמה' },
                { value: 'instrument', label: 'כלי' },
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
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">קטגוריה</label>
                <select
                  value={config.filters.category}
                  onChange={(e) => setConfig({
                    ...config,
                    filters: { ...config.filters, category: e.target.value }
                  })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="">הכל</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1.5">פלטפורמה</label>
                <select
                  value={config.filters.platform}
                  onChange={(e) => setConfig({
                    ...config,
                    filters: { ...config.filters, platform: e.target.value }
                  })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="">הכל</option>
                  {uniquePlatforms.map(plat => (
                    <option key={plat} value={plat}>{plat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1.5">מטבע</label>
                <select
                  value={config.filters.currency}
                  onChange={(e) => setConfig({
                    ...config,
                    filters: { ...config.filters, currency: e.target.value }
                  })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="">הכל</option>
                  {uniqueCurrencies.map(curr => (
                    <option key={curr} value={curr}>{curr}</option>
                  ))}
                </select>
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
                  {saving ? 'שומר...' : 'שמור גרף'}
                </button>
              </div>
            </div>

            {/* Chart Display */}
            <div className="p-6">
              <div className="h-96">
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
    </div>
  );
};

export default ChartBuilder;

