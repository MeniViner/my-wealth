import { useMemo, useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, 
  AreaChart, Area, CartesianGrid, LineChart, Line
} from 'recharts';
import { Cloud, TestTube, Eye, EyeOff } from 'lucide-react';
import CustomTooltip from '../components/CustomTooltip';
import TreemapChart from '../components/TreemapChart';
import { useDemoData } from '../contexts/DemoDataContext';

// Hebrew font stack
const HEBREW_FONT = "'Assistant', 'Heebo', 'Rubik', sans-serif";

// Format currency for Hebrew locale
const formatCurrency = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return '—';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Format axis tick for Hebrew locale (numbers only - don't truncate text)
const formatAxisTick = (value) => {
  if (typeof value === 'number') {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString('he-IL');
  }
  return value;
};

// Format axis tick with truncation (for vertical bar charts only)
const formatAxisTickTruncated = (value) => {
  if (typeof value === 'number') {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString('he-IL');
  }
  if (typeof value === 'string' && value.length > 8) {
    return value.substring(0, 7) + '…';
  }
  return value;
};

// Common axis props for RTL
const rtlAxisProps = {
  tick: { 
    fontSize: 11, 
    fontFamily: HEBREW_FONT,
    fill: '#64748b',
  },
  axisLine: { stroke: '#e2e8f0' },
  tickLine: { stroke: '#e2e8f0' },
};

// RTL Legend component with percentages
const RTLLegendWithPercentage = ({ payload, totalValue }) => {
  if (!payload || payload.length === 0) return null;
  
  // Check if dark mode is active
  const isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
  const textColor = isDarkMode ? '#e2e8f0' : '#475569';
  const percentageColor = isDarkMode ? '#ffffff' : '#1e293b';
  
  return (
    <div 
      dir="rtl"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '4px 0',
        fontFamily: HEBREW_FONT,
        maxHeight: '180px',
        overflowY: 'auto',
      }}
    >
      {payload.map((entry, index) => {
        const value = entry.payload?.value || 0;
        const percentage = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : 0;
        
        return (
          <div
            key={`legend-${index}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              color: textColor,
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '3px',
                backgroundColor: entry.color || entry.payload?.fill,
                flexShrink: 0,
              }}
            />
            <span style={{ fontWeight: 500, flex: 1 }}>
              {entry.payload?.name}
            </span>
            <span style={{ 
              fontWeight: 600, 
              color: percentageColor,
              fontFamily: 'system-ui, sans-serif',
            }}>
              {percentage}%
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Empty state component
const NoDataMessage = () => (
  <div 
    dir="rtl"
    style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#94a3b8',
      fontFamily: HEBREW_FONT,
      textAlign: 'center',
      padding: '20px',
    }}
  >
    <svg 
      width="40" 
      height="40" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5"
      style={{ marginBottom: '10px', opacity: 0.5 }}
    >
      <path d="M3 3v18h18" />
      <path d="M7 16l4-4 4 4 6-6" />
    </svg>
    <span style={{ fontSize: '13px', fontWeight: 500 }}>אין נתונים להצגה</span>
  </div>
);

const Dashboard = ({ assets, systemData, currencyRate }) => {
  const { demoAssets, isActive: isDemoActive, demoSystemData } = useDemoData();
  
  // Use demo assets if tour is active, otherwise use real assets
  const displayAssets = isDemoActive && demoAssets.length > 0 ? demoAssets : assets;
  
  // Use demo systemData if available, otherwise use real systemData
  const displaySystemData = isDemoActive && demoSystemData ? demoSystemData : systemData;
  
  // Check if dark mode is active
  const isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
  
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
  
  // Calculate total wealth
  const totalWealth = useMemo(() => {
    return displayAssets.reduce((sum, item) => sum + item.value, 0);
  }, [displayAssets]);

  // Data aggregations
  const dataByCategory = useMemo(() => {
    const map = {};
    displayAssets.forEach(a => {
      map[a.category] = (map[a.category] || 0) + a.value;
    });
    return Object.keys(map)
      .map(name => ({ name, value: map[name] }))
      .sort((a, b) => b.value - a.value);
  }, [displayAssets]);

  const dataByInstrument = useMemo(() => {
    const map = {};
    displayAssets.forEach(a => {
      map[a.instrument] = (map[a.instrument] || 0) + a.value;
    });
    return Object.keys(map)
      .map(name => ({ name, value: map[name] }))
      .sort((a, b) => b.value - a.value);
  }, [displayAssets]);

  const dataByPlatform = useMemo(() => {
    const map = {};
    displayAssets.forEach(a => {
      map[a.platform] = (map[a.platform] || 0) + a.value;
    });
    return Object.keys(map)
      .map(name => ({ name, value: map[name] }))
      .sort((a, b) => b.value - a.value);
  }, [displayAssets]);

  const dataByCurrency = useMemo(() => {
    const map = {};
    displayAssets.forEach(a => {
      map[a.currency] = (map[a.currency] || 0) + a.value;
    });
    return Object.keys(map)
      .map(name => ({ name, value: map[name] }))
      .sort((a, b) => b.value - a.value);
  }, [displayAssets]);

  const dataBySymbol = useMemo(() => {
    const map = {};
    displayAssets.forEach(a => {
      const key = a.symbol || a.name || 'ללא סמל';
      map[key] = (map[key] || 0) + a.value;
    });
    return Object.keys(map)
      .map(name => ({ name, value: map[name] }))
      .sort((a, b) => b.value - a.value);
  }, [displayAssets]);

  const topAssets = useMemo(() => {
    return [...displayAssets]
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map(a => ({ name: a.name, value: a.value, category: a.category }));
  }, [displayAssets]);

  // Prepare treemap data for platforms
  const treemapData = useMemo(() => {
    return dataByPlatform.map(p => ({
      name: p.name,
      size: p.value,
      fill: displaySystemData.platforms.find(sysP => sysP.name === p.name)?.color || '#94a3b8'
    }));
  }, [dataByPlatform, displaySystemData]);

  // Prepare treemap data for assets (by asset name)
  const treemapDataByAssets = useMemo(() => {
    return displayAssets.map(asset => ({
      name: asset.name,
      size: asset.value,
      fill: displaySystemData.categories.find(c => c.name === asset.category)?.color || '#3b82f6',
      category: asset.category,
      platform: asset.platform,
      instrument: asset.instrument
    }));
  }, [displayAssets, displaySystemData]);

  // Prepare pie chart data with percentages
  const pieDataByCategory = useMemo(() => {
    return dataByCategory.map(c => ({
      name: c.name,
      value: c.value,
      percentage: ((c.value / totalWealth) * 100).toFixed(1)
    }));
  }, [dataByCategory, totalWealth]);

  // Prepare area chart data for category distribution
  const areaDataByCategory = useMemo(() => {
    return dataByCategory.map(c => ({
      name: c.name,
      value: c.value,
      percentage: ((c.value / totalWealth) * 100).toFixed(1)
    }));
  }, [dataByCategory, totalWealth]);

  // Check if we have data (use displayAssets which includes demo data)
  const hasData = displayAssets && displayAssets.length > 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10" dir="rtl">
      {/* Demo Mode Banner */}
      {isDemoActive && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg border-2 border-blue-400/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <TestTube className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm">מצב דמו פעיל</div>
              <div className="text-xs text-blue-100">נתוני דמו מוצגים - הנתונים מקומיים בלבד</div>
            </div>
          </div>
        </div>
      )}

      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mr-12 md:mr-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">דשבורד ראשי</h2>
        </div>
        <div className="text-left w-full md:w-auto md:relative" data-coachmark="wealth-card">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-sm text-slate-400 dark:text-slate-500 whitespace-nowrap">שווי נקי</div>
            <button
              onClick={() => setIsWealthVisible(!isWealthVisible)}
              className="md:absolute md:right-0 md:top-0 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 w-6 h-6 flex items-center justify-center flex-shrink-0"
              title={isWealthVisible ? 'הסתר' : 'הצג'}
            >
              {isWealthVisible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white font-mono">
            {isWealthVisible ? formatCurrency(totalWealth) : '••••••'}
          </div>
        </div>
      </header>

      {!hasData ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <NoDataMessage />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Pie Chart - Category Distribution */}
            <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-visible">
              <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-white mb-4 md:mb-6">פיזור לפי קטגוריות</h3>
              <div className="h-64 md:h-80 min-h-[250px] overflow-visible">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieDataByCategory}
                      cx="40%"
                      cy="50%"
                      labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
                      label={({ name, percentage, cx, cy, midAngle, outerRadius }) => {
                        if (parseFloat(percentage) < 5) return null;
                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius * 1.2;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        const textColor = isDarkMode ? '#ffffff' : '#1e293b';
                        return (
                          <text 
                            x={x} 
                            y={y} 
                            fill={textColor}
                            textAnchor={x > cx ? 'start' : 'end'} 
                            dominantBaseline="central"
                            style={{ 
                              fontSize: '12px', 
                              fontWeight: 600, 
                              fontFamily: HEBREW_FONT,
                            }}
                          >
                            {name}
                          </text>
                        );
                      }}
                      outerRadius="65%"
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieDataByCategory.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={displaySystemData.categories.find(c => c.name === entry.name)?.color || '#3b82f6'} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={<CustomTooltip totalValue={totalWealth} showPercentage />}
                      wrapperStyle={{ zIndex: 1000 }}
                    />
                    <Legend 
                      content={<RTLLegendWithPercentage totalValue={totalWealth} />}
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      wrapperStyle={{ paddingRight: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Area Chart - Category Balance */}
            <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-white mb-4 md:mb-6">איזון תיק לפי קטגוריות</h3>
              <div className="h-72 md:h-80 min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaDataByCategory} margin={{ top: 10, right: 50, left: -50, bottom: -30 }}>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      {...rtlAxisProps}
                      tickFormatter={formatAxisTickTruncated}
                      angle={-35}
                      textAnchor="end"
                      height={55}
                      dy={5}
                    />
                    <YAxis 
                      {...rtlAxisProps}
                      tickFormatter={formatAxisTick}
                    />
                    <Tooltip 
                      content={<CustomTooltip totalValue={totalWealth} showPercentage />}
                      wrapperStyle={{ zIndex: 1000 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#areaGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Treemap - Platforms */}
            <TreemapChart 
              data={treemapData}
              title="מפת גודל נכסים לפי פלטפורמות"
              height="h-64"
              aspectRatio={4 / 3}
              totalValue={totalWealth}
            />

            {/* Bar Chart - Allocation by Symbol */}
            <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-white mb-4 md:mb-6">הקצאה לפי נכס</h3>
              <div className="h-72 md:h-80 min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataBySymbol} margin={{ top: 10, right: 10, left: 5, bottom: 5 }}>
                    <YAxis 
                      {...rtlAxisProps}
                      tickFormatter={formatAxisTick}
                      hide
                    />
                    <Tooltip 
                      content={<CustomTooltip totalValue={totalWealth} showPercentage />}
                      cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                      wrapperStyle={{ zIndex: 1000 }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                      {dataBySymbol.map((entry, index) => {
                        const symbol = displaySystemData.symbols?.find(s => {
                          const symbolName = typeof s === 'string' ? s : s.name;
                          return symbolName === entry.name;
                        });
                        const color = symbol ? (typeof symbol === 'string' ? '#94a3b8' : symbol.color) : 
                          ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#14b8a6'][index % 8];
                        return (
                          <Cell key={`cell-${index}`} fill={color} />
                        );
                      })}
                    </Bar>
                    <XAxis 
                      dataKey="name" 
                      {...rtlAxisProps}
                      tick={{
                        ...rtlAxisProps.tick,
                        style: { zIndex: 1000, pointerEvents: 'none' }
                      }}
                      tickFormatter={formatAxisTickTruncated}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={55}
                      dy={5}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Large Treemap Section - Full Width */}
          <TreemapChart 
            data={treemapDataByAssets}
            title="מפת נכסים - כל הנכסים"
            height="h-80 md:h-96"
            aspectRatio={16 / 9}
            className="mt-6"
            totalValue={totalWealth}
          />

          {/* Additional Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mt-6">
            {/* Bar Chart - Instruments */}
            <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-white mb-4 md:mb-6">במה מושקע הכסף?</h3>
              <div className="h-72 md:h-80 min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataByInstrument} margin={{ top: 10, right: 10, left: 5, bottom: 5 }}>
                    <YAxis {...rtlAxisProps} tickFormatter={formatAxisTick} hide />
                    <Tooltip 
                      content={<CustomTooltip totalValue={totalWealth} showPercentage />}
                      cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                      wrapperStyle={{ zIndex: 1000 }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                      {dataByInstrument.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={displaySystemData.instruments.find(i => i.name === entry.name)?.color || '#3b82f6'} 
                        />
                      ))}
                    </Bar>
                    <XAxis 
                      dataKey="name" 
                      {...rtlAxisProps}
                      tick={{
                        ...rtlAxisProps.tick,
                        style: { zIndex: 1000, pointerEvents: 'none' }
                      }}
                      tickFormatter={formatAxisTickTruncated}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={55}
                      dy={5}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart - Currency Distribution */}
            <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-visible">
              <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-white mb-4 md:mb-6">פיזור לפי מטבעות</h3>
              <div className="h-56 md:h-64 min-h-[220px] overflow-visible">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dataByCurrency}
                      cx="40%"
                      cy="50%"
                      labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
                      label={({ name, value, cx, cy, midAngle, outerRadius }) => {
                        const pct = totalWealth > 0 ? ((value / totalWealth) * 100).toFixed(1) : 0;
                        if (parseFloat(pct) < 5) return null;
                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius * 1.2;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        const textColor = isDarkMode ? '#ffffff' : '#1e293b';
                        return (
                          <text 
                            x={x} 
                            y={y} 
                            fill={textColor}
                            textAnchor={x > cx ? 'start' : 'end'} 
                            dominantBaseline="central"
                            style={{ 
                              fontSize: '11px', 
                              fontWeight: 600, 
                              fontFamily: HEBREW_FONT,
                            }}
                          >
                            {name}
                          </text>
                        );
                      }}
                      outerRadius="60%"
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {dataByCurrency.map((entry, index) => {
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                        return (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        );
                      })}
                    </Pie>
                    <Tooltip 
                      content={<CustomTooltip totalValue={totalWealth} showPercentage />}
                      wrapperStyle={{ zIndex: 1000 }}
                    />
                    <Legend 
                      content={<RTLLegendWithPercentage totalValue={totalWealth} />}
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      wrapperStyle={{ paddingRight: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Horizontal Bar Chart - Platforms - Full Width */}
          <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mt-6">
            <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-white mb-4 md:mb-6">פיזור לפי פלטפורמות</h3>
            <div className="h-64 md:h-80 min-h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataByPlatform} layout="vertical" margin={{ top: 5, right: -85, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    type="number" 
                    {...rtlAxisProps}
                    tickFormatter={formatAxisTick}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ 
                      fontSize: 11, 
                      fontFamily: HEBREW_FONT,
                      fill: '#64748b',
                    }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={{ stroke: '#e2e8f0' }}
                    width={100}
                    orientation="right"
                  />
                  <Tooltip 
                    content={<CustomTooltip totalValue={totalWealth} showPercentage />}
                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                    wrapperStyle={{ zIndex: 1000 }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={50}>
                    {dataByPlatform.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={displaySystemData.platforms.find(p => p.name === entry.name)?.color || '#3b82f6'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Additional Charts Section - Top 10 and Line Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mt-6">
            {/* Bar Chart - Top 10 Assets */}
            <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-white mb-4 md:mb-6">10 הנכסים הגדולים ביותר</h3>
              <div className="h-72 md:h-80 min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topAssets} margin={{ top: 10, right: 10, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <YAxis 
                      {...rtlAxisProps}
                      tickFormatter={formatAxisTick}
                    />
                    <Tooltip 
                      content={<CustomTooltip totalValue={totalWealth} showPercentage />}
                      cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                      wrapperStyle={{ zIndex: 1000 }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {topAssets.map((entry, index) => {
                        const categoryColor = displaySystemData.categories.find(c => c.name === entry.category)?.color || '#3b82f6';
                        return (
                          <Cell key={`cell-${index}`} fill={categoryColor} />
                        );
                      })}
                    </Bar>
                    <XAxis 
                      dataKey="name" 
                      {...rtlAxisProps}
                      tick={{
                        ...rtlAxisProps.tick,
                        style: { zIndex: 1000, pointerEvents: 'none' }
                      }}
                      tickFormatter={formatAxisTickTruncated}
                      angle={-35}
                      textAnchor="end"
                      height={55}
                      dy={5}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Line Chart - Category Comparison */}
            <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-white mb-4 md:mb-6">השוואת קטגוריות</h3>
              <div className="h-72 md:h-80 min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={areaDataByCategory} margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      {...rtlAxisProps}
                      tickFormatter={formatAxisTickTruncated}
                      angle={-35}
                      textAnchor="end"
                      height={55}
                      dy={5}
                    />
                    <YAxis 
                      {...rtlAxisProps}
                      tickFormatter={formatAxisTick}
                    />
                    <Tooltip 
                      content={<CustomTooltip totalValue={totalWealth} showPercentage />}
                      wrapperStyle={{ zIndex: 1000 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 7, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
