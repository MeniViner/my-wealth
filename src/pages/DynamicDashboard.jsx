import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAssets } from '../hooks/useAssets';
import { useCurrency } from '../hooks/useCurrency';
import { useSystemData } from '../hooks/useSystemData';
import { subscribeToChartConfigs, deleteChartConfig } from '../services/chartService';
import { aggregateData, getColorForItem } from '../utils/chartUtils';
import ChartRenderer from '../components/ChartRenderer';
import { Cloud, Trash2, Edit2, Filter, X, Settings, Eye, EyeOff, PieChart, BarChart, BarChart2, Radar, Gauge, LayoutGrid } from 'lucide-react';
import { confirmAlert, successAlert, errorAlert } from '../utils/alerts';
import { Link } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';

const DynamicDashboard = () => {
  const { user } = useAuth();
  const { currencyRate } = useCurrency(user);
  const { assets } = useAssets(user, currencyRate.rate);
  const { systemData } = useSystemData(user);

  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Load wealth visibility from localStorage
  const [isWealthVisible, setIsWealthVisible] = useState(() => {
    const saved = localStorage.getItem('wealthVisibility');
    return saved !== null ? saved === 'true' : true;
  });
  
  // Save wealth visibility to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('wealthVisibility', isWealthVisible.toString());
    // Dispatch custom event to sync with other components
    window.dispatchEvent(new Event('wealthVisibilityChange'));
  }, [isWealthVisible]);
  
  // Listen for changes from other components
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('wealthVisibility');
      if (saved !== null) {
        setIsWealthVisible(saved === 'true');
      }
    };
    
    // Listen to custom event (for same-tab sync)
    window.addEventListener('wealthVisibilityChange', handleStorageChange);
    // Listen to storage event (for cross-tab sync)
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('wealthVisibilityChange', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Main interactive chart state
  const [mainChartConfig, setMainChartConfig] = useState({
    chartType: 'PieChart',
    dataKey: 'category',
    filters: {
      category: '',
      platform: '',
      instrument: '',
      currency: ''
    }
  });

  // Subscribe to chart configurations
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToChartConfigs(user, (configs) => {
      // Filter only visible widgets and sort by order
      const visibleWidgets = configs
        .filter(config => config.isVisible !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      setWidgets(visibleWidgets);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Calculate total wealth
  const totalWealth = useMemo(() => {
    return assets.reduce((sum, item) => sum + item.value, 0);
  }, [assets]);

  // Get unique values for filters
  const uniqueCategories = useMemo(() => {
    return [...new Set(assets.map(a => a.category))].filter(Boolean).sort();
  }, [assets]);

  const uniquePlatforms = useMemo(() => {
    return [...new Set(assets.map(a => a.platform))].filter(Boolean).sort();
  }, [assets]);

  const uniqueInstruments = useMemo(() => {
    return [...new Set(assets.map(a => a.instrument))].filter(Boolean).sort();
  }, [assets]);

  const uniqueCurrencies = useMemo(() => {
    return [...new Set(assets.map(a => a.currency))].filter(Boolean).sort();
  }, [assets]);

  // Main chart data
  const mainChartData = useMemo(() => {
    const aggregatedData = aggregateData(assets, mainChartConfig.dataKey, mainChartConfig.filters);
    
    if (mainChartConfig.chartType === 'Treemap') {
      return aggregatedData.map(item => ({
        name: item.name,
        size: item.value,
        fill: getColorForItem(item.name, mainChartConfig.dataKey, systemData)
      }));
    }
    
    return aggregatedData;
  }, [assets, mainChartConfig, systemData]);

  const mainChartTotalValue = useMemo(() => {
    return mainChartData.reduce((sum, item) => sum + (item.value || item.size || 0), 0);
  }, [mainChartData]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.values(mainChartConfig.filters).some(val => val !== '');
  }, [mainChartConfig.filters]);

  const clearFilters = () => {
    setMainChartConfig(prev => ({
      ...prev,
      filters: {
        category: '',
        platform: '',
        instrument: '',
        currency: ''
      }
    }));
  };

  // Prepare chart data for each widget
  const getChartDataForWidget = (widget) => {
    const aggregatedData = aggregateData(assets, widget.dataKey, widget.filters || {});
    
    if (widget.chartType === 'Treemap') {
      return aggregatedData.map(item => ({
        name: item.name,
        size: item.value,
        fill: getColorForItem(item.name, widget.dataKey, systemData)
      }));
    }
    
    return aggregatedData;
  };

  const handleDeleteWidget = async (widgetId, widgetTitle) => {
    const confirmed = await confirmAlert(
      'מחיקת גרף',
      `האם אתה בטוח שברצונך למחוק את הגרף "${widgetTitle}"?`,
      'warning'
    );
    
    if (!confirmed) return;

    try {
      await deleteChartConfig(user, widgetId);
      await successAlert('הצלחה', 'הגרף נמחק בהצלחה');
    } catch (error) {
      console.error('Error deleting widget:', error);
      await errorAlert('שגיאה', 'אירעה שגיאה במחיקת הגרף');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100svh] md:min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">טוען דשבורד...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mr-12 md:mr-0">
        <div className="flex-1">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-2">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">דשבורד מותאם אישית</h2>
            <Link
              to="/chart-builder"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition border border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-700"
              title="ערוך דשבורדים"
            >
              <Settings size={16} /> ערוך דשבורדים
            </Link>
          </div>
        </div>
        <div className="text-left w-full md:w-auto md:relative">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-sm text-slate-400 dark:text-slate-500 whitespace-nowrap">סה"כ הון עצמי</div>
            <button
              onClick={() => setIsWealthVisible(!isWealthVisible)}
              className="md:absolute md:right-0 md:top-0 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 w-6 h-6 flex items-center justify-center flex-shrink-0"
              title={isWealthVisible ? 'הסתר' : 'הצג'}
            >
              {isWealthVisible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white font-mono">
            {isWealthVisible ? `₪${totalWealth.toLocaleString()}` : '••••••'}
          </div>
        </div>
      </header>

      {/* Main Interactive Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Controls Bar */}
        <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Chart Type Selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">סוג גרף:</span>
              <div className="flex flex-wrap gap-2">
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
                      onClick={() => setMainChartConfig(prev => ({ ...prev, chartType: type.value }))}
                      className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                        mainChartConfig.chartType === type.value
                          ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-105'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
                      }`}
                    >
                      <IconComponent size={16} className="flex-shrink-0" />
                      <span>{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Group By Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">קיבוץ:</span>
              <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                {[
                  { value: 'category', label: 'אפיקי השקעה' },
                  { value: 'platform', label: 'חשבונות וארנקים' },
                  { value: 'instrument', label: 'מטבעות בסיס' },
                  { value: 'tags', label: 'תגיות' },
                  { value: 'currency', label: 'מטבע' }
                ].map(group => (
                  <button
                    key={group.value}
                    onClick={() => setMainChartConfig(prev => ({ ...prev, dataKey: group.value }))}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition ${
                      mainChartConfig.dataKey === group.value
                        ? 'bg-slate-800 dark:bg-slate-700 text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <Filter size={14} className="text-slate-400 dark:text-slate-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">פילטרים:</span>
              
              {/* Category Filter */}
              <CustomSelect
                value={mainChartConfig.filters.category || ''}
                onChange={(val) => setMainChartConfig(prev => ({
                  ...prev,
                  filters: { ...prev.filters, category: val }
                }))}
                options={[
                  { value: '', label: 'כל הקטגוריות' },
                  ...uniqueCategories.map(cat => ({
                    value: cat,
                    label: cat,
                    iconColor: systemData?.categories?.find(c => c.name === cat)?.color
                  }))
                ]}
                placeholder="כל הקטגוריות"
                className="text-xs min-w-[120px]"
              />

              {/* Platform Filter */}
              <CustomSelect
                value={mainChartConfig.filters.platform || ''}
                onChange={(val) => setMainChartConfig(prev => ({
                  ...prev,
                  filters: { ...prev.filters, platform: val }
                }))}
                options={[
                  { value: '', label: 'כל הפלטפורמות' },
                  ...uniquePlatforms.map(plat => ({
                    value: plat,
                    label: plat,
                    iconColor: systemData?.platforms?.find(p => p.name === plat)?.color
                  }))
                ]}
                placeholder="כל הפלטפורמות"
                className="text-xs min-w-[120px]"
              />

              {/* Currency Filter */}
              <CustomSelect
                value={mainChartConfig.filters.currency || ''}
                onChange={(val) => setMainChartConfig(prev => ({
                  ...prev,
                  filters: { ...prev.filters, currency: val }
                }))}
                options={[
                  { value: '', label: 'כל המטבעות' },
                  ...uniqueCurrencies.map(curr => ({
                    value: curr,
                    label: curr
                  }))
                ]}
                placeholder="כל המטבעות"
                className="text-xs min-w-[120px]"
              />

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition flex items-center gap-1"
                  title="נקה פילטרים"
                >
                  <X size={12} />
                  נקה
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Chart Display */}
        <div className="p-6">
          <div className="h-80">
            <ChartRenderer
              config={mainChartConfig}
              chartData={mainChartData}
              systemData={systemData}
              totalValue={mainChartTotalValue}
            />
          </div>
        </div>
      </div>

      {/* Saved Widgets */}
      {widgets.length > 0 && (
        <>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-white">גרפים שמורים</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/chart-builder"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                title="ערוך דשבורדים"
              >
                <Settings size={14} /> ערוך דשבורדים
              </Link>
              <Link
                to="/chart-builder"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                <Edit2 size={14} /> הוסף גרף
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-fr">
            {widgets.map((widget) => {
              const chartData = getChartDataForWidget(widget);
              const totalValue = chartData.reduce((sum, item) => sum + (item.value || item.size || 0), 0);
              const size = widget.size || 'medium';
              
              // Grid classes based on size (desktop only, mobile always col-span-1)
              const gridClasses = {
                small: 'lg:col-span-1',
                medium: 'lg:col-span-2',
                large: 'lg:col-span-2 lg:row-span-2'
              };
              
              // Height based on size - larger for bar charts
              const heightClasses = {
                small: 'h-96',
                medium: 'h-[450px]',
                large: 'h-[640px]'
              };

              return (
                <div
                  key={widget.id}
                  className={`bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative group ${gridClasses[size]}`}
                >
                  {/* Delete button - appears on hover */}
                  <button
                    onClick={() => handleDeleteWidget(widget.id, widget.title)}
                    className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg"
                    title="מחק גרף"
                  >
                    <Trash2 size={14} />
                  </button>

                  <h3 className="text-base md:text-lg font-semibold text-slate-800 dark:text-white mb-4 pr-8">
                    {widget.title}
                  </h3>
                  <div className={heightClasses[size]}>
                    <ChartRenderer
                      config={widget}
                      chartData={chartData}
                      systemData={systemData}
                      totalValue={totalValue}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Empty State */}
      {widgets.length === 0 && (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 text-center">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-white mb-2">אין גרפים שמורים</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            צור גרפים חדשים באמצעות בונה הגרפים כדי לראות אותם כאן
          </p>
          <Link
            to="/chart-builder"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <Edit2 size={16} /> צור גרף חדש
          </Link>
        </div>
      )}
    </div>
  );
};

export default DynamicDashboard;

