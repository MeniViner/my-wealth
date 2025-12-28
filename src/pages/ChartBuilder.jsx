import { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  RadialBarChart, RadialBar, Treemap
} from 'recharts';
import { useAuth } from '../hooks/useAuth';
import { useAssets } from '../hooks/useAssets';
import { useCurrency } from '../hooks/useCurrency';
import { useSystemData } from '../hooks/useSystemData';
import { saveChartConfig } from '../services/chartService';
import CustomTooltip from '../components/CustomTooltip';
import CustomTreemapContent from '../components/CustomTreemapContent';
import CustomTreemapTooltip from '../components/CustomTreemapTooltip';
import { successAlert, errorAlert } from '../utils/alerts';

/**
 * Aggregate assets data based on grouping key
 * @param {Array} assets - Array of asset objects
 * @param {string} groupBy - Field to group by ('category', 'platform', 'instrument', 'tags', 'currency')
 * @param {Object} filters - Optional filters object
 * @returns {Array} Aggregated data in format [{ name, value }]
 */
const aggregateData = (assets, groupBy, filters = {}) => {
  // Apply filters first
  let filteredAssets = assets;
  
  if (filters.category) {
    filteredAssets = filteredAssets.filter(a => a.category === filters.category);
  }
  if (filters.platform) {
    filteredAssets = filteredAssets.filter(a => a.platform === filters.platform);
  }
  if (filters.instrument) {
    filteredAssets = filteredAssets.filter(a => a.instrument === filters.instrument);
  }
  if (filters.currency) {
    filteredAssets = filteredAssets.filter(a => a.currency === filters.currency);
  }
  if (filters.tags && filters.tags.length > 0) {
    filteredAssets = filteredAssets.filter(a => 
      a.tags && a.tags.some(tag => filters.tags.includes(tag))
    );
  }

  const map = {};
  
  if (groupBy === 'tags') {
    // Special handling for tags - assets can have multiple tags
    filteredAssets.forEach(asset => {
      if (asset.tags && Array.isArray(asset.tags)) {
        asset.tags.forEach(tag => {
          map[tag] = (map[tag] || 0) + asset.value;
        });
      } else {
        // If no tags, put in "ללא תגיות"
        map['ללא תגיות'] = (map['ללא תגיות'] || 0) + asset.value;
      }
    });
  } else {
    // Standard grouping by single field
    filteredAssets.forEach(asset => {
      const key = asset[groupBy] || 'אחר';
      map[key] = (map[key] || 0) + asset.value;
    });
  }

  return Object.keys(map)
    .map(name => ({ name, value: map[name] }))
    .sort((a, b) => b.value - a.value);
};

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

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="h-80 flex items-center justify-center text-slate-400">
          אין נתונים להצגה. נסה לשנות את הפילטרים או את מקור הנתונים.
        </div>
      );
    }

    switch (config.chartType) {
      case 'PieChart':
        const totalValue = aggregatedData.reduce((sum, item) => sum + item.value, 0);
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => 
                  `${name}: ${((value / totalValue) * 100).toFixed(1)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColorForItem(entry.name, config.dataKey, systemData)} 
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                iconSize={12} 
                layout="vertical" 
                verticalAlign="middle" 
                wrapperStyle={{ right: 0 }}
                formatter={(value, entry) => `${entry.payload.name}: ${((entry.payload.value / totalValue) * 100).toFixed(1)}%`}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'BarChart':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ bottom: 20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} height={40} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColorForItem(entry.name, config.dataKey, systemData)} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'HorizontalBarChart':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColorForItem(entry.name, config.dataKey, systemData)} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'RadarChart':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 'auto']} tick={{ fontSize: 10 }} />
              <Radar 
                name="ערך" 
                dataKey="value" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.6} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'RadialBar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              cx="50%" 
              cy="50%" 
              innerRadius="20%" 
              outerRadius="80%" 
              data={chartData.slice(0, 10)} 
              startAngle={90} 
              endAngle={-270}
            >
              <RadialBar 
                minAngle={15} 
                label={{ position: 'insideStart', fill: '#fff' }} 
                background 
                dataKey="value"
              >
                {chartData.slice(0, 10).map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColorForItem(entry.name, config.dataKey, systemData)} 
                  />
                ))}
              </RadialBar>
              <Legend 
                iconSize={10} 
                layout="vertical" 
                verticalAlign="middle" 
                wrapperStyle={{ right: 0 }}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadialBarChart>
          </ResponsiveContainer>
        );

      case 'Treemap':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap 
              data={chartData} 
              dataKey="size" 
              aspectRatio={4 / 3} 
              stroke="#fff" 
              strokeWidth={1}
              content={<CustomTreemapContent />}
            >
              <Tooltip content={<CustomTreemapTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        );

      default:
        return <div>סוג גרף לא נתמך</div>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <header className="mb-6">
        <h2 className="text-3xl font-bold text-slate-800">בונה גרפים</h2>
        <p className="text-slate-500 mt-2">צור והתאם אישית גרפים לדשבורד שלך</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">הגדרות גרף</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  כותרת הגרף
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="לדוגמה: פיזור לפי קטגוריות"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  סוג גרף
                </label>
                <select
                  value={config.chartType}
                  onChange={(e) => setConfig({ ...config, chartType: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="PieChart">עוגה (Pie)</option>
                  <option value="BarChart">עמודות אנכיות (Bar)</option>
                  <option value="HorizontalBarChart">עמודות אופקיות (Horizontal Bar)</option>
                  <option value="RadarChart">רדאר (Radar)</option>
                  <option value="RadialBar">רדיאלי (Radial Bar)</option>
                  <option value="Treemap">מפת עץ (Treemap)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  קיבוץ לפי
                </label>
                <select
                  value={config.dataKey}
                  onChange={(e) => setConfig({ ...config, dataKey: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="category">קטגוריה</option>
                  <option value="platform">פלטפורמה</option>
                  <option value="instrument">כלי השקעה</option>
                  <option value="tags">תגיות</option>
                  <option value="currency">מטבע</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">פילטרים (אופציונלי)</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      קטגוריה
                    </label>
                    <select
                      value={config.filters.category}
                      onChange={(e) => setConfig({
                        ...config,
                        filters: { ...config.filters, category: e.target.value }
                      })}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">הכל</option>
                      {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      פלטפורמה
                    </label>
                    <select
                      value={config.filters.platform}
                      onChange={(e) => setConfig({
                        ...config,
                        filters: { ...config.filters, platform: e.target.value }
                      })}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">הכל</option>
                      {uniquePlatforms.map(plat => (
                        <option key={plat} value={plat}>{plat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      מטבע
                    </label>
                    <select
                      value={config.filters.currency}
                      onChange={(e) => setConfig({
                        ...config,
                        filters: { ...config.filters, currency: e.target.value }
                      })}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">הכל</option>
                      {uniqueCurrencies.map(curr => (
                        <option key={curr} value={curr}>{curr}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving || !config.title.trim()}
                  className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {saving ? 'שומר...' : 'שמור גרף'}
                </button>
              </div>
            </div>
          </div>

          {/* Data Summary */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">סיכום נתונים</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">פריטים בגרף:</span>
                <span className="font-medium">{aggregatedData.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">סה"כ ערך:</span>
                <span className="font-medium">
                  ₪{aggregatedData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {config.title || 'תצוגה מקדימה'}
            </h3>
            <div className="h-80">
              {renderChart()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartBuilder;

