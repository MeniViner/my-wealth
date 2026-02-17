import { useMemo, useState, useEffect } from 'react';
import { Cloud, Eye, EyeOff, Wallet, Calendar, TrendingUp, ChevronDown, ChevronUp, XCircle, History, PieChart as PieChartIcon, LayoutGrid, Layers, Coins } from 'lucide-react';
import TreemapChart from '../components/TreemapChart';
import ChartRenderer from '../components/ChartRenderer';
import SummaryCard from '../components/SummaryCard';
import ErrorBoundary from '../components/ErrorBoundary';
import { useDemoData } from '../contexts/DemoDataContext';
import { fetchPriceHistory } from '../services/priceService';
import { resolveInternalId } from '../services/internalIds';
import { confirmAlert } from '../utils/alerts';
import { usePriceSync } from '../hooks/usePriceSync';
import { usePortfolioHistory } from '../hooks/usePortfolioHistory';

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

// Chart Loader Component
const ChartLoader = () => (
  <div className="h-full flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
      <p className="text-sm text-slate-500 dark:text-slate-400">טוען נתונים...</p>
    </div>
  </div>
);

const Dashboard = ({ assets, systemData, currencyRate, isLoading = false, user }) => {
  // Debug check
  useEffect(() => {
    console.log('XXX DASHBOARD MOUNTED XXX');
    // window.alert('Dashboard Mounted'); // Commented out to be less annoying, but let's see if console logs appear
  }, []);

  const { demoAssets, isActive: isDemoActive, demoSystemData, clearDemoAssets, refreshInterval } = useDemoData();

  // Use demo assets if tour is active, otherwise use real assets
  const displayAssets = useMemo(() => {
    return isDemoActive && demoAssets.length > 0 ? demoAssets : assets;
  }, [isDemoActive, demoAssets, assets]);

  // Use demo systemData if available, otherwise use real systemData
  const displaySystemData = useMemo(() => {
    return isDemoActive && demoSystemData ? demoSystemData : systemData;
  }, [isDemoActive, demoSystemData, systemData]);

  // Integrate price synchronization (only for real assets, not demo)
  const { lastSync } = usePriceSync(isDemoActive ? [] : assets);

  // Check if dark mode is active
  const isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Calculate total cost basis (historical value - שווי לפי היסטוריה)
  const totalCostBasis = useMemo(() => {
    return displayAssets.reduce((sum, item) => {
      if (item.assetMode === 'QUANTITY' && item.quantity && item.purchasePrice) {
        const costBasis = item.quantity * item.purchasePrice;
        return sum + (item.currency === 'USD' ? costBasis * (currencyRate || 3.65) : costBasis);
      } else if (item.originalValue) {
        return sum + (item.currency === 'USD' ? item.originalValue * (currencyRate || 3.65) : item.originalValue);
      }
      return sum;
    }, 0);
  }, [displayAssets, currencyRate]);

  // Calculate total profit/loss
  const totalProfitLoss = useMemo(() => {
    const totalPL = displayAssets.reduce((sum, item) => {
      if (item.profitLoss !== null && item.profitLoss !== undefined) {
        return sum + (item.profitLoss || 0);
      }
      return sum;
    }, 0);

    const totalPLPercent = totalCostBasis > 0 ? (totalPL / totalCostBasis) * 100 : 0;

    return {
      amount: totalPL,
      percent: totalPLPercent
    };
  }, [displayAssets, totalCostBasis]);

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

  const dataBySubcategory = useMemo(() => {
    const map = {};
    displayAssets.forEach(a => {
      const key = a.subcategory || 'אחר';
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

  // Fetch portfolio history from snapshots (preferred method)
  const { history: snapshotHistory, loading: snapshotLoading } = usePortfolioHistory(user, timeRange);

  // State for portfolio history data
  const [portfolioHistory, setPortfolioHistory] = useState([]);
  // State for Chart 2 (Distribution) configuration
  const [distributionView, setDistributionView] = useState('graph'); // 'graph' | 'map'
  const [distributionGroup, setDistributionGroup] = useState('category'); // 'category' | 'subcategory' | 'platform' | 'instrument'

  // Handle turning off demo mode
  const handleTurnOffDemo = async () => {
    const confirmed = await confirmAlert(
      'כיבוי מצב דמו',
      'תמיד ניתן להפעיל מחדש מצב דמו בהגדרות',
      'info'
    );
    if (confirmed) {
      clearDemoAssets();
    }
  };

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

  // Use portfolio snapshots if available, otherwise calculate from asset histories
  useEffect(() => {
    // Priority 1: Use saved snapshots (fast, accurate, includes all assets)
    if (snapshotHistory && snapshotHistory.length > 0 && !isDemoActive) {
      setPortfolioHistory(snapshotHistory);
      setHistoryLoading(snapshotLoading);
      return;
    }

    // Priority 2: Fallback to calculating from individual asset histories
    if (!hasData || !displayAssets || displayAssets.length === 0) {
      setPortfolioHistory([]);
      setHistoryLoading(false);
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
          // If no trackable assets, create history data
          const currentValue = totalWealth;
          const dataPoints = [];
          const now = new Date();

          // In demo mode, create animated history with variations
          if (isDemoActive) {
            // Create demo history with realistic variations
            let baseValue = currentValue * 0.85; // Start from 85% of current value
            const variationRange = currentValue * 0.15; // 15% variation range

            for (let i = days; i >= 0; i--) {
              const date = new Date(now);
              date.setDate(date.getDate() - i);

              // Create smooth variation using sine wave with some randomness
              const progress = (days - i) / days; // 0 to 1
              const sineWave = Math.sin(progress * Math.PI * 4); // Multiple cycles
              const randomFactor = (Math.random() - 0.5) * 0.3; // Small random variation
              const variation = sineWave * 0.5 + randomFactor;

              // Gradually increase towards current value with variations
              const trend = baseValue + (currentValue - baseValue) * progress;
              const value = trend + variation * variationRange * 0.3;

              dataPoints.push({
                date: date.toISOString().split('T')[0],
                value: Math.max(value, currentValue * 0.7), // Don't go below 70% of current
                timestamp: date.getTime()
              });
            }
          } else {
            // In real mode, create a simple flat line with current value
            for (let i = days; i >= 0; i--) {
              const date = new Date(now);
              date.setDate(date.getDate() - i);
              dataPoints.push({
                date: date.toISOString().split('T')[0],
                value: currentValue,
                timestamp: date.getTime()
              });
            }
          }

          setPortfolioHistory(dataPoints);
          setHistoryLoading(false);
          return;
        }

        // Fetch price history for each asset
        const assetHistories = await Promise.all(
          trackableAssets.map(async (asset) => {
            try {
              // Use resolveInternalId to get correct ID format
              const priceHistory = await fetchPriceHistory(asset, timeRange);

              if (!priceHistory || !priceHistory.points || priceHistory.points.length === 0) {
                return null;
              }

              // Convert prices to ILS if needed and multiply by quantity
              // History format: { points: [{ t: timestamp_ms, v: price }], currency: 'USD'|'ILS' }
              const assetCurrency = priceHistory.currency || asset.currency || 'USD';
              return priceHistory.points.map((point) => {
                const priceInILS = assetCurrency === 'USD' ? point.v * rate : point.v;
                const assetValue = asset.quantity * priceInILS;
                const date = new Date(point.t);
                return {
                  date: date.toISOString().split('T')[0],
                  timestamp: point.t,
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
          // Fallback: create history data
          const currentValue = totalWealth;
          const dataPoints = [];
          const now = new Date();

          // In demo mode, create animated history with variations
          if (isDemoActive) {
            // Create demo history with realistic variations
            let baseValue = currentValue * 0.85; // Start from 85% of current value
            const variationRange = currentValue * 0.15; // 15% variation range

            for (let i = days; i >= 0; i--) {
              const date = new Date(now);
              date.setDate(date.getDate() - i);

              // Create smooth variation using sine wave with some randomness
              const progress = (days - i) / days; // 0 to 1
              const sineWave = Math.sin(progress * Math.PI * 4); // Multiple cycles
              const randomFactor = (Math.random() - 0.5) * 0.3; // Small random variation
              const variation = sineWave * 0.5 + randomFactor;

              // Gradually increase towards current value with variations
              const trend = baseValue + (currentValue - baseValue) * progress;
              const value = trend + variation * variationRange * 0.3;

              dataPoints.push({
                date: date.toISOString().split('T')[0],
                value: Math.max(value, currentValue * 0.7), // Don't go below 70% of current
                timestamp: date.getTime()
              });
            }
          } else {
            // In real mode, create a simple flat line with current value
            for (let i = days; i >= 0; i--) {
              const date = new Date(now);
              date.setDate(date.getDate() - i);
              dataPoints.push({
                date: date.toISOString().split('T')[0],
                value: currentValue,
                timestamp: date.getTime()
              });
            }
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
  }, [displayAssets, timeRange, currencyRate, totalWealth, hasData, isDemoActive, snapshotHistory, snapshotLoading]);

  // Update history in real-time for demo mode
  useEffect(() => {
    if (!isDemoActive || !hasData || portfolioHistory.length === 0) return;

    const interval = setInterval(() => {
      setPortfolioHistory(prev => {
        if (prev.length === 0) return prev;

        // Update the last point with current totalWealth
        const updated = [...prev];
        const lastIndex = updated.length - 1;

        // Update last point to current value
        updated[lastIndex] = {
          ...updated[lastIndex],
          value: totalWealth,
          timestamp: new Date().getTime()
        };

        // Also update recent points slightly to create smooth animation
        const recentPoints = Math.min(10, updated.length);
        for (let i = Math.max(0, lastIndex - recentPoints); i < lastIndex; i++) {
          const progress = (i - (lastIndex - recentPoints)) / recentPoints;
          const oldValue = updated[i].value;
          const targetValue = totalWealth;
          // Smooth transition towards current value
          updated[i] = {
            ...updated[i],
            value: oldValue + (targetValue - oldValue) * 0.15 * (1 - progress) // More aggressive update
          };
        }

        return updated;
      });
    }, refreshInterval * 1000); // Use refreshInterval from DemoDataContext (convert seconds to milliseconds)

    return () => clearInterval(interval);
  }, [isDemoActive, hasData, totalWealth, portfolioHistory.length, refreshInterval]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10" dir="rtl">

      <header className="mb-6 flex flex md:flex-row justify-between items-start md:items-end gap-4 mr-12 md:mr-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">דשבורד ראשי</h2>
        </div>
        {isDemoActive && (
          <button
            onClick={handleTurnOffDemo}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg transition-colors text-sm font-medium"
          >
            <XCircle className="w-4 h-4" />
            כבה מצב דמו
          </button>
        )}
      </header>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 md:gap-4 mb-6">
        {!isMobile && (
          <SummaryCard
            title={`תיק לפי מטבע ראשי (${mainCurrency})`}
            value={isWealthVisible ? formatCurrency(totalWealth) : '••••••'}
            icon={Wallet}
            iconBgColor="bg-blue-500/10"
            loading={isLoading || !hasData}
          />
        )}
        {/* <SummaryCard
            title="שווי לפי היסטוריה"
            value={isWealthVisible ? formatCurrency(totalCostBasis) : '••••••'}
            icon={History}
            iconBgColor="bg-slate-500/10"
            loading={isLoading || !hasData}
          /> */}
        <SummaryCard
          title="רווח/הפסד יומי"
          value={isWealthVisible ? formatCurrency(dailyProfitLoss.amount) : '••••••'}
          icon={Calendar}
          iconBgColor="bg-purple-500/10"
          plData={dailyProfitLoss}
          loading={isLoading || !hasData}
        />
        <SummaryCard
          title="רווח/הפסד כולל"
          value={isWealthVisible ? formatCurrency(totalProfitLoss.amount) : '••••••'}
          icon={TrendingUp}
          iconBgColor="bg-emerald-500/10"
          plData={totalProfitLoss}
          loading={isLoading || !hasData}
        />
      </div>

      {/* Collapsible Balance Chart Section */}
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
              {isLoading || !hasData ? (
                <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              ) : isWealthVisible ? (
                formatCurrency(totalWealth)
              ) : (
                '••••••'
              )}
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
          className={`transition-all duration-300 ease-in-out overflow-hidden ${isChartOpen
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
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${timeRange === period
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
          <ErrorBoundary
            title="שגיאה בטעינת גרף ההיסטוריה"
            message="הגרף לא נטען. שאר הגרפים ימשיכו לעבוד כרגיל."
          >
            <div className="h-64 md:h-80">
              {isLoading || historyLoading || !hasData ? (
                <ChartLoader />
              ) : portfolioHistory.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">אין נתונים להצגה</p>
                </div>
              ) : (
                <ChartRenderer
                  config={{
                    chartType: 'AreaChart',
                    dataKey: 'date',
                    showGrid: true
                  }}
                  chartData={portfolioHistory}
                  systemData={displaySystemData}
                  totalValue={totalWealth}
                />
              )}
            </div>
          </ErrorBoundary>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Pie/Treemap Chart - Dynamic Distribution */}
        <ErrorBoundary
          title="שגיאה בטעינת השינויים"
          message="הגרף לא נטען. שאר הגרפים ימשיכו לעבוד כרגיל."
        >
          {console.log('Rendering Dynamic Distribution Chart', { distributionView, distributionGroup, hasData })}
          <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border-2 border-red-500 dark:border-slate-700 overflow-visible relative">
            <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded-bl-lg">Debug Mode</div>
            {/* Header with controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                {/* View Toggle (Graph/Map) - Right Side */}
                <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                  <button
                    onClick={() => setDistributionView('graph')}
                    className={`p-1.5 rounded-md transition-all ${distributionView === 'graph'
                      ? 'bg-white dark:bg-slate-600 shadow-sm text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    title="תצוגת גרף"
                  >
                    <PieChartIcon size={16} />
                  </button>
                  <button
                    onClick={() => setDistributionView('map')}
                    className={`p-1.5 rounded-md transition-all ${distributionView === 'map'
                      ? 'bg-white dark:bg-slate-600 shadow-sm text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    title="תצוגת מפה"
                  >
                    <LayoutGrid size={16} />
                  </button>
                </div>

                <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-white">
                  {distributionGroup === 'category' && 'פיזור לפי קטגוריות'}
                  {distributionGroup === 'subcategory' && 'פיזור לפי תת-קטגוריות'}
                  {distributionGroup === 'platform' && 'פיזור לפי פלטפורמות'}
                  {distributionGroup === 'instrument' && 'פיזור לפי נכסים'}
                </h3>
              </div>

              {/* Grouping Selection - Left Side */}
              <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 overflow-x-auto max-w-full">
                <button
                  onClick={() => setDistributionGroup('category')}
                  className={`p-1.5 rounded-md transition-all ${distributionGroup === 'category'
                    ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  title="קטגוריות"
                >
                  <PieChartIcon size={16} />
                </button>
                <button
                  onClick={() => setDistributionGroup('subcategory')}
                  className={`p-1.5 rounded-md transition-all ${distributionGroup === 'subcategory'
                    ? 'bg-white dark:bg-slate-600 shadow-sm text-purple-600 dark:text-purple-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  title="תת-קטגוריות"
                >
                  <Layers size={16} />
                </button>
                <button
                  onClick={() => setDistributionGroup('platform')}
                  className={`p-1.5 rounded-md transition-all ${distributionGroup === 'platform'
                    ? 'bg-white dark:bg-slate-600 shadow-sm text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  title="פלטפורמות"
                >
                  <Wallet size={16} />
                </button>
                <button
                  onClick={() => setDistributionGroup('instrument')}
                  className={`p-1.5 rounded-md transition-all ${distributionGroup === 'instrument'
                    ? 'bg-white dark:bg-slate-600 shadow-sm text-amber-600 dark:text-amber-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  title="נכסים/מכשירים"
                >
                  <Coins size={16} />
                </button>
              </div>
            </div>

            <div className="h-64 md:h-80 min-h-[250px] overflow-visible">
              {isLoading || !hasData ? (
                <ChartLoader />
              ) : (
                distributionView === 'map' ? (
                  <TreemapChart
                    data={
                      (distributionGroup === 'category' ? dataByCategory :
                        distributionGroup === 'subcategory' ? dataBySubcategory :
                          distributionGroup === 'platform' ? dataByPlatform :
                            dataByInstrument).map(item => ({
                              name: item.name,
                              size: item.value,
                              fill: distributionGroup === 'category'
                                ? (displaySystemData.categories.find(c => c.name === item.name)?.color || '#3b82f6')
                                : distributionGroup === 'platform'
                                  ? (displaySystemData.platforms.find(p => p.name === item.name)?.color || '#10b981')
                                  : undefined
                            }))
                    }
                    title=""
                    height="h-full"
                    aspectRatio={4 / 3}
                    totalValue={totalWealth}
                  />
                ) : (
                  <ChartRenderer
                    config={{
                      chartType: 'PieChart',
                      dataKey: distributionGroup,
                      showGrid: false
                    }}
                    chartData={
                      distributionGroup === 'category' ? pieDataByCategory : // optimized for category
                        (distributionGroup === 'subcategory' ? dataBySubcategory :
                          distributionGroup === 'platform' ? dataByPlatform :
                            dataByInstrument).map(item => ({
                              ...item,
                              percentage: ((item.value / totalWealth) * 100).toFixed(1)
                            }))
                    }
                    systemData={displaySystemData}
                    totalValue={totalWealth}
                  />
                )
              )}
            </div>
          </div>
        </ErrorBoundary>

        {/* Area Chart - Category Balance */}
        <ErrorBoundary
          title="שגיאה בטעינת גרף האיזון"
          message="הגרף לא נטען. שאר הגרפים ימשיכו לעבוד כרגיל."
        >
          <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-white mb-4 md:mb-6">איזון תיק לפי קטגוריות</h3>
            <div className="h-72 md:h-80 min-h-[280px]">
              {isLoading || !hasData ? (
                <ChartLoader />
              ) : (
                <ChartRenderer
                  config={{
                    chartType: 'AreaChart',
                    dataKey: 'category',
                    showGrid: true
                  }}
                  chartData={areaDataByCategory}
                  systemData={displaySystemData}
                  totalValue={totalWealth}
                />
              )}
            </div>
          </div>
        </ErrorBoundary>

        {/* Treemap - Platforms */}
        <ErrorBoundary
          title="שגיאה בטעינת מפת הפלטפורמות"
          message="הגרף לא נטען. שאר הגרפים ימשיכו לעבוד כרגיל."
        >
          {isLoading || !hasData ? (
            <div className="h-64 bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
              <ChartLoader />
            </div>
          ) : (
            <TreemapChart
              data={treemapData}
              title="מפת גודל נכסים לפי פלטפורמות"
              height="h-64"
              aspectRatio={4 / 3}
              totalValue={totalWealth}
            />
          )}
        </ErrorBoundary>

        {/* Bar Chart - Allocation by Symbol */}
        <ErrorBoundary
          title="שגיאה בטעינת גרף ההקצאה"
          message="הגרף לא נטען. שאר הגרפים ימשיכו לעבוד כרגיל."
        >
          <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-white mb-4 md:mb-6">הקצאה לפי נכס</h3>
            <div className="h-72 md:h-80 min-h-[280px]">
              {isLoading || !hasData ? (
                <ChartLoader />
              ) : (
                <ChartRenderer
                  config={{
                    chartType: 'BarChart',
                    dataKey: 'symbol',
                    showGrid: false
                  }}
                  chartData={dataBySymbol}
                  systemData={displaySystemData}
                  totalValue={totalWealth}
                />
              )}
            </div>
          </div>
        </ErrorBoundary>
      </div>

      {/* Large Treemap Section - Full Width */}
      <ErrorBoundary
        title="שגיאה בטעינת מפת הנכסים"
        message="הגרף לא נטען. שאר הגרפים ימשיכו לעבוד כרגיל."
      >
        {isLoading || !hasData ? (
          <div className="h-80 md:h-96 mt-6 bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
            <ChartLoader />
          </div>
        ) : (
          <TreemapChart
            data={treemapDataByAssets}
            title="מפת נכסים - כל הנכסים"
            height="h-80 md:h-96"
            aspectRatio={16 / 9}
            className="mt-6"
            totalValue={totalWealth}
          />
        )}
      </ErrorBoundary>

      {/* Additional Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mt-6">
        {/* Bar Chart - Instruments */}
        <ErrorBoundary
          title="שגיאה בטעינת גרף המכשירים"
          message="הגרף לא נטען. שאר הגרפים ימשיכו לעבוד כרגיל."
        >
          <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-white mb-4 md:mb-6">במה מושקע הכסף?</h3>
            <div className="h-72 md:h-80 min-h-[280px]">
              {isLoading || !hasData ? (
                <ChartLoader />
              ) : (
                <ChartRenderer
                  config={{
                    chartType: 'BarChart',
                    dataKey: 'instrument',
                    showGrid: false
                  }}
                  chartData={dataByInstrument}
                  systemData={displaySystemData}
                  totalValue={totalWealth}
                />
              )}
            </div>
          </div>
        </ErrorBoundary>

        {/* Pie Chart - Currency Distribution */}
        <ErrorBoundary
          title="שגיאה בטעינת גרף המטבעות"
          message="הגרף לא נטען. שאר הגרפים ימשיכו לעבוד כרגיל."
        >
          <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-visible">
            <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-white mb-4 md:mb-6">פיזור לפי מטבעות</h3>
            <div className="h-56 md:h-64 min-h-[220px] overflow-visible">
              {isLoading || !hasData ? (
                <ChartLoader />
              ) : (
                <ChartRenderer
                  config={{
                    chartType: 'PieChart',
                    dataKey: 'currency',
                    showGrid: false
                  }}
                  chartData={dataByCurrency}
                  systemData={displaySystemData}
                  totalValue={totalWealth}
                />
              )}
            </div>
          </div>
        </ErrorBoundary>
      </div>

      {/* Horizontal Bar Chart - Platforms - Full Width */}
      <ErrorBoundary
        title="שגיאה בטעינת גרף הפלטפורמות"
        message="הגרף לא נטען. שאר הגרפים ימשיכו לעבוד כרגיל."
      >
        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mt-6">
          <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-white mb-4 md:mb-6">פיזור לפי פלטפורמות</h3>
          <div className="h-64 md:h-80 min-h-[280px]">
            {isLoading || !hasData ? (
              <ChartLoader />
            ) : (
              <ChartRenderer
                config={{
                  chartType: 'HorizontalBarChart',
                  dataKey: 'platform',
                  showGrid: true
                }}
                chartData={dataByPlatform}
                systemData={displaySystemData}
                totalValue={totalWealth}
              />
            )}
          </div>
        </div>
      </ErrorBoundary>

      {/* Additional Charts Section - Top 10 and Line Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mt-6">
        {/* Bar Chart - Top 10 Assets */}
        <ErrorBoundary
          title="שגיאה בטעינת גרף 10 הנכסים הגדולים"
          message="הגרף לא נטען. שאר הגרפים ימשיכו לעבוד כרגיל."
        >
          <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-white mb-4 md:mb-6">10 הנכסים הגדולים ביותר</h3>
            <div className="h-72 md:h-80 min-h-[280px]">
              {isLoading || !hasData ? (
                <ChartLoader />
              ) : (
                <ChartRenderer
                  config={{
                    chartType: 'BarChart',
                    dataKey: 'symbol',
                    showGrid: true
                  }}
                  chartData={topAssets}
                  systemData={displaySystemData}
                  totalValue={totalWealth}
                />
              )}
            </div>
          </div>
        </ErrorBoundary>

        {/* Line Chart - Category Comparison */}
        <ErrorBoundary
          title="שגיאה בטעינת גרף ההשוואה"
          message="הגרף לא נטען. שאר הגרפים ימשיכו לעבוד כרגיל."
        >
          <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-white mb-4 md:mb-6">השוואת קטגוריות</h3>
            <div className="h-72 md:h-80 min-h-[280px]">
              {isLoading || !hasData ? (
                <ChartLoader />
              ) : (
                <ChartRenderer
                  config={{
                    chartType: 'LineChart',
                    dataKey: 'category',
                    showGrid: true
                  }}
                  chartData={areaDataByCategory}
                  systemData={displaySystemData}
                  totalValue={totalWealth}
                />
              )}
            </div>
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default Dashboard;
