import { useMemo, useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, 
  AreaChart, Area, CartesianGrid, LineChart, Line
} from 'recharts';
import { Cloud, Eye, EyeOff, Wallet, Calendar, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import CustomTooltip from '../components/CustomTooltip';
import TreemapChart from '../components/TreemapChart';
import SummaryCard from '../components/SummaryCard';
import { useDemoData } from '../contexts/DemoDataContext';
import { fetchPriceHistory } from '../services/priceService';

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

  // Calculate total profit/loss
  const totalProfitLoss = useMemo(() => {
    const totalPL = displayAssets.reduce((sum, item) => {
      if (item.profitLoss !== null && item.profitLoss !== undefined) {
        return sum + (item.profitLoss || 0);
      }
      return sum;
    }, 0);
    
    // Calculate total cost basis for percentage
    const totalCostBasis = displayAssets.reduce((sum, item) => {
      if (item.assetMode === 'QUANTITY' && item.quantity && item.purchasePrice) {
        const costBasis = item.quantity * item.purchasePrice;
        return sum + (item.currency === 'USD' ? costBasis * (currencyRate || 3.65) : costBasis);
      } else if (item.originalValue) {
        return sum + (item.currency === 'USD' ? item.originalValue * (currencyRate || 3.65) : item.originalValue);
      }
      return sum;
    }, 0);
    
    const totalPLPercent = totalCostBasis > 0 ? (totalPL / totalCostBasis) * 100 : 0;
    
    return {
      amount: totalPL,
      percent: totalPLPercent
    };
  }, [displayAssets, currencyRate]);

  // Calculate daily profit/loss (using 24h change if available, otherwise estimate)
  const dailyProfitLoss = useMemo(() => {
    // Try to use priceChange24h from assets
    let dailyPL = 0;
    let hasDailyData = false;
    
    displayAssets.forEach(item => {
      if (item.priceChange24h !== null && item.priceChange24h !== undefined && item.value) {
        // Calculate 24h change based on percentage
        const changePercent = item.priceChange24h;
        const changeAmount = (item.value * changePercent) / 100;
        dailyPL += changeAmount;
        hasDailyData = true;
      }
    });
    
    // If no daily data available, estimate as 0 or use a small portion of total P/L
    if (!hasDailyData) {
      // Estimate daily P/L as 1/30 of total P/L (rough monthly estimate)
      dailyPL = totalProfitLoss.amount / 30;
    }
    
    const dailyPLPercent = totalWealth > 0 ? (dailyPL / totalWealth) * 100 : 0;
    
    return {
      amount: dailyPL,
      percent: dailyPLPercent
    };
  }, [displayAssets, totalWealth, totalProfitLoss]);

  // Get main currency (most common currency in portfolio)
  const mainCurrency = useMemo(() => {
    const currencyMap = {};
    displayAssets.forEach(a => {
      currencyMap[a.currency] = (currencyMap[a.currency] || 0) + a.value;
    });
    const sorted = Object.entries(currencyMap).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : 'ILS';
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

  // State for collapsible chart
  const [isChartOpen, setIsChartOpen] = useState(false);
  
  // State for timeframe selection
  const [timeRange, setTimeRange] = useState('1M');
  
  // State for portfolio history data
  const [portfolioHistory, setPortfolioHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Calculate days based on timeRange
  const getDaysForTimeRange = (range) => {
    switch (range) {
      case '1D': return 1;
      case '1W': return 7;
      case '1M': return 30;
      case '3M': return 90;
      case '1Y': return 365;
      case 'ALL': return 730; // ~2 years
      default: return 30;
    }
  };

  // Format date for X-axis based on timeRange
  const formatDateForAxis = (date, range) => {
    const d = new Date(date);
    switch (range) {
      case '1D':
        return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      case '1W':
        return d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric' });
      case '1M':
      case '3M':
        return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
      case '1Y':
      case 'ALL':
        return d.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' });
      default:
        return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
    }
  };

  // Fetch portfolio history
  useEffect(() => {
    if (!hasData || !displayAssets || displayAssets.length === 0) {
      setPortfolioHistory([]);
      return;
    }

    const calculatePortfolioHistory = async () => {
      setHistoryLoading(true);
      
      try {
        const days = getDaysForTimeRange(timeRange);
        const rate = currencyRate || 3.65;
        
        // Get trackable assets (those with quantity and symbol/apiId)
        const trackableAssets = displayAssets.filter(asset => 
          asset.assetMode === 'QUANTITY' && 
          asset.quantity && 
          asset.quantity > 0 &&
          asset.marketDataSource && 
          asset.marketDataSource !== 'manual' &&
          (asset.apiId || asset.symbol)
        );

        if (trackableAssets.length === 0) {
          // If no trackable assets, create a simple flat line with current value
          const currentValue = totalWealth;
          const dataPoints = [];
          const now = new Date();
          
          for (let i = days; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            dataPoints.push({
              date: date.toISOString().split('T')[0],
              value: currentValue,
              timestamp: date.getTime()
            });
          }
          
          setPortfolioHistory(dataPoints);
          setHistoryLoading(false);
          return;
        }

        // Fetch price history for each asset
        const assetHistories = await Promise.all(
          trackableAssets.map(async (asset) => {
            try {
              const symbol = asset.apiId || asset.symbol;
              const source = asset.marketDataSource === 'coingecko' ? 'coingecko' : 'yahoo';
              
              const priceHistory = await fetchPriceHistory(symbol, source, days);
              
              if (!priceHistory || priceHistory.length === 0) {
                return null;
              }

              // Convert prices to ILS if needed and multiply by quantity
              return priceHistory.map(({ date, price }) => {
                const priceInILS = asset.currency === 'USD' ? price * rate : price;
                const assetValue = asset.quantity * priceInILS;
                return {
                  date: date.toISOString().split('T')[0],
                  timestamp: new Date(date).getTime(),
                  value: assetValue
                };
              });
            } catch (error) {
              console.error(`Error fetching history for ${asset.name}:`, error);
              return null;
            }
          })
        );

        // Filter out null results
        const validHistories = assetHistories.filter(h => h !== null && h.length > 0);
        
        if (validHistories.length === 0) {
          // Fallback: create flat line
          const currentValue = totalWealth;
          const dataPoints = [];
          const now = new Date();
          
          for (let i = days; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            dataPoints.push({
              date: date.toISOString().split('T')[0],
              value: currentValue,
              timestamp: date.getTime()
            });
          }
          
          setPortfolioHistory(dataPoints);
          setHistoryLoading(false);
          return;
        }

        // Aggregate by date: sum all asset values for each date
        const dateMap = new Map();
        
        validHistories.forEach(history => {
          history.forEach(({ date, timestamp, value }) => {
            if (!dateMap.has(date)) {
              dateMap.set(date, { date, timestamp, value: 0 });
            }
            dateMap.get(date).value += value;
          });
        });

        // Convert to array and sort by date
        const aggregated = Array.from(dateMap.values())
          .sort((a, b) => a.timestamp - b.timestamp);

        // Add non-trackable assets (fixed value) to each point
        const fixedAssetsValue = displayAssets
          .filter(asset => {
            // Assets that don't have live prices
            return !(asset.assetMode === 'QUANTITY' && 
                   asset.quantity && 
                   asset.quantity > 0 &&
                   asset.marketDataSource && 
                   asset.marketDataSource !== 'manual' &&
                   (asset.apiId || asset.symbol));
          })
          .reduce((sum, asset) => {
            return sum + (asset.value || 0);
          }, 0);

        // Add fixed value to each data point
        const finalData = aggregated.map(point => ({
          ...point,
          value: point.value + fixedAssetsValue
        }));

        setPortfolioHistory(finalData);
      } catch (error) {
        console.error('Error calculating portfolio history:', error);
        setPortfolioHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };

    calculatePortfolioHistory();
  }, [displayAssets, timeRange, currencyRate, totalWealth, hasData]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10" dir="rtl">

      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mr-12 md:mr-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">דשבורד ראשי</h2>
        </div>
      </header>

      {/* Top Summary Cards */}
      {hasData && (
        <div className="grid grid-cols-3 md:grid-cols-3 gap-1.5 md:gap-4 mb-6">
          <SummaryCard
            title={`תיק לפי מטבע ראשי (${mainCurrency})`}
            value={isWealthVisible ? formatCurrency(totalWealth) : '••••••'}
            icon={Wallet}
            iconBgColor="bg-blue-500/10"
          />
          <SummaryCard
            title="רווח/הפסד יומי"
            value={isWealthVisible ? formatCurrency(dailyProfitLoss.amount) : '••••••'}
            icon={Calendar}
            iconBgColor="bg-purple-500/10"
            plData={isWealthVisible ? dailyProfitLoss : null}
          />
          <SummaryCard
            title="רווח/הפסד כולל"
            value={isWealthVisible ? formatCurrency(totalProfitLoss.amount) : '••••••'}
            icon={TrendingUp}
            iconBgColor="bg-emerald-500/10"
            plData={isWealthVisible ? totalProfitLoss : null}
          />
        </div>
      )}

      {/* Collapsible Balance Chart Section */}
      {hasData && (
        <div className="bg-white dark:bg-[#1E1E2D] rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          {/* Clickable Header */}
          <div 
            onClick={() => setIsChartOpen(!isChartOpen)}
            className="flex justify-between items-center cursor-pointer mb-4"
            data-coachmark="wealth-card"
          >
            <div className="flex-1">
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">שווי לפי היסטוריה</div>
              <div className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white font-mono">
                {isWealthVisible ? formatCurrency(totalWealth) : '••••••'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsWealthVisible(!isWealthVisible);
                }}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 w-6 h-6 flex items-center justify-center flex-shrink-0"
                title={isWealthVisible ? 'הסתר' : 'הצג'}
              >
                {isWealthVisible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              {isChartOpen ? (
                <ChevronUp className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              )}
            </div>
          </div>

          {/* Collapsible Content */}
          <div 
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isChartOpen 
                ? 'max-h-[1000px] opacity-100 mt-4' 
                : 'max-h-0 opacity-0 mt-0'
            }`}
          >
            {/* Timeframe Selectors and XLS Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex flex-wrap gap-2">
                {['1D', '1W', '1M', '3M', '1Y', 'ALL'].map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimeRange(period)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      timeRange === period
                        ? 'bg-emerald-600 dark:bg-emerald-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
              {/* <button
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors flex items-center gap-1.5"
                title="ייצא ל-Excel"
              >
                <Cloud size={14} />
                XLS
              </button> */}
            </div>

            {/* Balance Chart - Time Series */}
            <div className="h-64 md:h-80">
              {historyLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">טוען נתונים...</p>
                  </div>
                </div>
              ) : portfolioHistory.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">אין נתונים להצגה</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={portfolioHistory} 
                    margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ 
                        fontSize: 11, 
                        fontFamily: HEBREW_FONT,
                        fill: '#64748b',
                      }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={{ stroke: '#e2e8f0' }}
                      tickFormatter={(value) => {
                        const point = portfolioHistory.find(p => p.date === value);
                        if (!point) return value;
                        return formatDateForAxis(new Date(point.timestamp), timeRange);
                      }}
                      angle={timeRange === '1D' ? 0 : -35}
                      textAnchor={timeRange === '1D' ? 'middle' : 'end'}
                      height={timeRange === '1D' ? 30 : 55}
                      dy={timeRange === '1D' ? 5 : 5}
                    />
                    <YAxis 
                      tick={{ 
                        fontSize: 11, 
                        fontFamily: HEBREW_FONT,
                        fill: '#64748b',
                      }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={{ stroke: '#e2e8f0' }}
                      tickFormatter={formatAxisTick}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload[0]) return null;
                        const data = payload[0].payload;
                        const date = new Date(data.timestamp);
                        const dateStr = date.toLocaleDateString('he-IL', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          ...(timeRange === '1D' && { hour: '2-digit', minute: '2-digit' })
                        });
                        return (
                          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{dateStr}</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">
                              {formatCurrency(data.value)}
                            </p>
                          </div>
                        );
                      }}
                      wrapperStyle={{ zIndex: 1000 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#balanceGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

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
