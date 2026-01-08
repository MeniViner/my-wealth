import { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  RadialBarChart, RadialBar, Treemap, AreaChart, Area, LineChart, Line,
  ComposedChart, CartesianGrid
} from 'recharts';
import CustomTooltip from './CustomTooltip';
import CustomTreemapContent from './CustomTreemapContent';
import CustomTreemapTooltip from './CustomTreemapTooltip';
import { getColorForItem } from '../utils/chartUtils';

// Hebrew font stack for SVG text elements
const HEBREW_FONT = "'Assistant', 'Heebo', 'Rubik', sans-serif";

// Custom RTL Legend component
const RTLLegend = ({ payload, align = 'right' }) => {
  if (!payload || payload.length === 0) return null;
  
  return (
    <div 
      dir="rtl"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        gap: '12px',
        padding: '8px 0',
        fontFamily: HEBREW_FONT,
      }}
    >
      {payload.map((entry, index) => (
        <div
          key={`legend-${index}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#475569',
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
          <span style={{ fontWeight: 500 }}>
            {entry.value || entry.payload?.name}
          </span>
        </div>
      ))}
    </div>
  );
};

// Custom RTL Legend for Pie/Radial with percentages
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
        gap: '8px',
        padding: '8px 0',
        fontFamily: HEBREW_FONT,
        maxHeight: '200px',
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
              fontSize: '12px',
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

// Format axis tick for Hebrew locale (numbers only)
const formatAxisTick = (value) => {
  if (typeof value === 'number') {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString('he-IL');
  }
  return value;
};

// Format axis tick with truncation (for vertical bar charts)
const formatAxisTickTruncated = (value) => {
  if (typeof value === 'number') {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
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
    style: { zIndex: 1000, pointerEvents: 'none' }
  },
  axisLine: { stroke: '#e2e8f0' },
  tickLine: { stroke: '#e2e8f0' },
};

// Empty state component
const NoDataMessage = ({ message = 'אין נתונים להצגה' }) => (
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
      width="48" 
      height="48" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5"
      style={{ marginBottom: '12px', opacity: 0.5 }}
    >
      <path d="M3 3v18h18" />
      <path d="M7 16l4-4 4 4 6-6" />
    </svg>
    <span style={{ fontSize: '14px', fontWeight: 500 }}>{message}</span>
    <span style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
      נסה להוסיף נכסים או לשנות את הפילטרים
    </span>
  </div>
);

// Custom pie label renderer with black text outside the pie (white in dark mode)
const renderPieLabel = ({ name, value, cx, cy, midAngle, outerRadius, totalValue }) => {
  const pct = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : 0;
  if (parseFloat(pct) < 5) return null;
  
  const RADIAN = Math.PI / 180;
  const radius = outerRadius * 1.15;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  // Check if dark mode is active
  const isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
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
};

/**
 * Render a chart based on configuration
 * @param {Object} config - Chart configuration
 * @param {Array} chartData - Aggregated chart data
 * @param {Object} systemData - System data for colors
 * @param {number} totalValue - Total value for percentage calculations
 */
const ChartRenderer = ({ config, chartData, systemData, totalValue }) => {
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  // Dark mode detection
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    // Listen for dark mode changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    return () => observer.disconnect();
  }, []);

  // Handle empty data state
  if (!chartData || chartData.length === 0) {
    return <NoDataMessage />;
  }
  
  // Get axis props with dark mode support
  const getAxisProps = () => {
    const baseTick = {
      fontSize: 11,
      fontFamily: HEBREW_FONT,
      fill: '#64748b',
      style: { zIndex: 1000, pointerEvents: 'none' }
    };
    
    // Add stroke/outline in dark mode for better visibility
    if (isDarkMode) {
      return {
        tick: {
          ...baseTick,
          fill: '#e2e8f0',
          stroke: '#1e293b',
          strokeWidth: 0.5,
          paintOrder: 'stroke fill'
        },
        axisLine: { stroke: '#475569' },
        tickLine: { stroke: '#475569' },
      };
    }
    
    return {
      tick: baseTick,
      axisLine: { stroke: '#e2e8f0' },
      tickLine: { stroke: '#e2e8f0' },
    };
  };
  
  const rtlAxisPropsWithDarkMode = getAxisProps();

  // Get minimum height based on chart type
  const getMinHeight = (chartType) => {
    switch (chartType) {
      case 'BarChart':
      case 'StackedBarChart':
        return '320px';
      case 'HorizontalBarChart':
        return '280px';
      case 'PieChart':
      case 'RadialBar':
        return '280px';
      case 'Treemap':
        return '280px';
      case 'AreaChart':
      case 'LineChart':
      case 'ComposedChart':
        return '300px';
      default:
        return '250px';
    }
  };

  // Check if grid should be shown (default true if not specified)
  const showGrid = config.showGrid !== false;

  // Common responsive container wrapper with dynamic min-height
  const ResponsiveWrapper = ({ children, chartType }) => (
    <div style={{ width: '100%', height: '100%', minHeight: getMinHeight(chartType), overflow: 'visible', position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );

  switch (config.chartType) {
    /**
     * PieChart - גרף עוגה
     * גרף מעגלי שמציג חלוקה יחסית של נתונים
     * כל פרוסה מייצגת חלק מהשלם, והגודל שלה מייצג את הערך היחסי
     * שימוש: להצגת חלוקה לפי קטגוריות, פלטפורמות, מטבעות וכו'
     */
    case 'PieChart':
      return (
        <ResponsiveWrapper chartType="PieChart">
          <PieChart>
            <Pie
              data={chartData}
              cx="40%"
              cy="50%"
              labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
              label={(props) => renderPieLabel({ ...props, totalValue })}
              outerRadius="65%"
              innerRadius="0%"
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
            <Tooltip 
              content={<CustomTooltip totalValue={totalValue} showPercentage />} 
              wrapperStyle={{ zIndex: 1000 }}
            />
            <Legend 
              content={<RTLLegendWithPercentage totalValue={totalValue} />}
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{ 
                paddingRight: '10px',
                right: 0,
              }}
            />
          </PieChart>
        </ResponsiveWrapper>
      );

    /**
     * BarChart - גרף עמודות
     * גרף שמציג נתונים כעמודות אנכיות
     * כל עמודה מייצגת ערך, והגובה שלה מייצגת את הערך הכמותי
     * שימוש: להשוואה בין קטגוריות שונות, נכסים, פלטפורמות וכו'
     */
    case 'BarChart':
      return (
        <ResponsiveWrapper chartType="BarChart">
          <BarChart 
            data={chartData} 
            margin={isMobile ? { top: 10, right: 20, left: -35, bottom: -5 } : { top: 10, right: 0, left: -35, bottom: 5 }}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <YAxis 
              {...rtlAxisPropsWithDarkMode}
              tickFormatter={formatAxisTick}
              width={45}
            />
            <Tooltip 
              content={<CustomTooltip totalValue={totalValue} showPercentage />} 
              cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
              wrapperStyle={{ zIndex: 1000 }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getColorForItem(entry.name, config.dataKey, systemData)} 
                />
              ))}
            </Bar>
            <XAxis 
              dataKey="name" 
              {...rtlAxisPropsWithDarkMode}
              tick={{
                ...rtlAxisPropsWithDarkMode.tick,
                style: { zIndex: 1000, pointerEvents: 'none' }
              }}
              tickFormatter={ formatAxisTickTruncated  }
              interval={0}
              angle={-35}
              textAnchor="end"
              height={60}
              dy={5}
              dx={isMobile ? -15 : -15}
            />
          </BarChart>
        </ResponsiveWrapper>
      );

    /**
     * StackedBarChart - גרף עמודות מוערמות
     * גרף עמודות שבו כל עמודה מחולקת לחלקים מוערמים
     * כל חלק מייצג קטגוריה שונה, והגובה הכולל מייצג את הסכום
     * שימוש: להצגת חלוקה פנימית בתוך כל קטגוריה והשוואה בין קטגוריות
     */
    case 'StackedBarChart':
      return (
        <ResponsiveWrapper chartType="StackedBarChart">
          <BarChart 
            data={chartData} 
            margin={{ top: 10, right: 10, left: 5, bottom: 5 }}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <YAxis 
              {...rtlAxisPropsWithDarkMode}
              tickFormatter={formatAxisTick}
              width={45}
            />
            <Tooltip 
              content={<CustomTooltip totalValue={totalValue} showPercentage />} 
              cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
              wrapperStyle={{ zIndex: 1000 }}
            />
            <Bar dataKey="value" stackId="a" radius={[4, 4, 0, 0]} maxBarSize={60}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getColorForItem(entry.name, config.dataKey, systemData)} 
                />
              ))}
            </Bar>
            <XAxis 
              dataKey="name" 
              {...rtlAxisPropsWithDarkMode}
              tick={{
                ...rtlAxisPropsWithDarkMode.tick,
                style: { zIndex: 1000, pointerEvents: 'none' }
              }}
              tickFormatter={formatAxisTickTruncated}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={60}
              dy={5}
            />
          </BarChart>
        </ResponsiveWrapper>
      );

    /**
     * HorizontalBarChart - גרף עמודות אופקי
     * גרף עמודות שבו העמודות מוצגות אופקית במקום אנכית
     * כל עמודה מייצגת ערך, והאורך שלה מייצג את הערך הכמותי
     * שימוש: כאשר יש שמות ארוכים או כשיש הרבה קטגוריות - יותר נוח לקרוא אופקית
     */
    case 'HorizontalBarChart':
      return (
        <ResponsiveWrapper chartType="HorizontalBarChart">
          <BarChart 
            data={chartData} 
            layout="vertical" 
            margin={isMobile ? { top: 5, right: -50, left: -10, bottom: 5 } : { top: 5, right: -80, left: 5, bottom: 5 }}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <XAxis 
              type="number" 
              {...rtlAxisPropsWithDarkMode}
              tickFormatter={formatAxisTick}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              tick={{ 
                fontSize: isMobile ? 10 : 11, 
                fontFamily: HEBREW_FONT,
                fill: isDarkMode ? '#e2e8f0' : '#64748b',
                stroke: isDarkMode ? '#1e293b' : 'none',
                strokeWidth: isDarkMode ? 0.5 : 0,
                paintOrder: isDarkMode ? 'stroke fill' : 'fill',
                ...rtlAxisPropsWithDarkMode.tick,
                style: { zIndex: 1000, pointerEvents: 'none' }
              }}
              axisLine={rtlAxisPropsWithDarkMode.axisLine}
              tickLine={rtlAxisPropsWithDarkMode.tickLine}
              width={isMobile ? 60 : 100}
              orientation="right"
            />
            <Tooltip 
              content={<CustomTooltip totalValue={totalValue} showPercentage />} 
              cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
              wrapperStyle={{ zIndex: 1000 }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={isMobile ? 40 : 50}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getColorForItem(entry.name, config.dataKey, systemData)} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveWrapper>
      );

    /**
     * RadarChart - גרף רדאר
     * גרף מעגלי שמציג נתונים על צירים רדיאליים (מהמרכז החוצה)
     * כל ציר מייצג קטגוריה, והנקודה על הציר מייצגת את הערך
     * שימוש: להשוואה בין כמה קטגוריות שונות, ניתוח פרופיל או חוזקות/חולשות
     */
    case 'RadarChart':
      return (
        <ResponsiveWrapper chartType="RadarChart">
          <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis 
              dataKey="name" 
              tick={{ 
                fontSize: 11, 
                fontFamily: HEBREW_FONT,
                fill: '#64748b',
              }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 'auto']} 
              tick={{ 
                fontSize: 10, 
                fontFamily: HEBREW_FONT,
                fill: '#94a3b8',
              }}
              tickFormatter={formatAxisTick}
            />
            <Radar 
              name="ערך" 
              dataKey="value" 
              stroke="#3b82f6" 
              fill="#3b82f6" 
              fillOpacity={0.5} 
            />
            <Tooltip 
              content={<CustomTooltip totalValue={totalValue} />} 
              wrapperStyle={{ zIndex: 1000 }}
            />
            <Legend content={<RTLLegend />} />
          </RadarChart>
        </ResponsiveWrapper>
      );

    /**
     * RadialBar - גרף רדיאלי
     * גרף מעגלי שמציג נתונים כקשתות רדיאליות (מהמרכז החוצה)
     * כל קשת מייצגת קטגוריה, והאורך שלה מייצג את הערך
     * שימוש: להצגת נתונים בצורה מעגלית, דומה לגרף עוגה אבל עם קשתות במקום פרוסות
     */
    case 'RadialBar':
      return (
        <ResponsiveWrapper chartType="RadialBar">
          <RadialBarChart 
            cx="40%" 
            cy="50%" 
            innerRadius="20%" 
            outerRadius="90%" 
            data={chartData.slice(0, 8)} 
            startAngle={90} 
            endAngle={-270}
          >
            <RadialBar 
              minAngle={15} 
              label={{ 
                position: 'insideStart', 
                fill: '#fff',
                fontFamily: HEBREW_FONT,
                fontSize: 10,
              }} 
              background={{ fill: '#f1f5f9' }}
              dataKey="value"
              cornerRadius={4}
            >
              {chartData.slice(0, 8).map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getColorForItem(entry.name, config.dataKey, systemData)} 
                />
              ))}
            </RadialBar>
            <Legend 
              content={<RTLLegendWithPercentage totalValue={totalValue} />}
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{ 
                paddingRight: '10px',
                right: 0,
              }}
            />
            <Tooltip 
              content={<CustomTooltip totalValue={totalValue} showPercentage />} 
              wrapperStyle={{ zIndex: 1000 }}
            />
          </RadialBarChart>
        </ResponsiveWrapper>
      );

    /**
     * AreaChart - גרף אזור
     * גרף שמציג נתונים כקו עם מילוי מתחתיו (אזור צבוע)
     * הקו מייצג את הערכים, והאזור הצבוע מדגיש את המגמה
     * שימוש: להצגת מגמות לאורך זמן, שינויים מצטברים, או הדגשת נפח נתונים
     */
    case 'AreaChart':
      return (
        <ResponsiveWrapper chartType="AreaChart">
          <AreaChart 
            data={chartData} 
            // margin={{ top: 10, right: 50, left: -50, bottom: -30 }}
            margin={isMobile ? { top: 10, right: 0, left: -45, bottom: -25 } : { top: 10, right: 0, left: -35, bottom: 5 }}

          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <Tooltip 
              content={<CustomTooltip totalValue={totalValue} showPercentage />}
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
            <XAxis 
              dataKey="name" 
              {...rtlAxisPropsWithDarkMode}
              tickFormatter={ formatAxisTick }
              textAnchor="end"
              height={55}
              dy={5}
              dx={isMobile ? -15 : -15}
            />
            <YAxis 
              {...rtlAxisPropsWithDarkMode}
              tickFormatter={formatAxisTick}
            />
          </AreaChart>
        </ResponsiveWrapper>
      );

    /**
     * LineChart - גרף קו
     * גרף שמציג נתונים כקו רציף בין נקודות
     * כל נקודה מייצגת ערך, והקו מחבר ביניהן
     * שימוש: להצגת מגמות לאורך זמן, שינויים רציפים, או השוואה בין כמה סדרות נתונים
     */
    case 'LineChart':
      return (
        <ResponsiveWrapper chartType="LineChart">
          <LineChart 
            data={chartData} 
            margin={isMobile ? { top: 10, right: 20, left: -35, bottom: -35 } : { top: 10, right: 0, left: -35, bottom: 5 }}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <Tooltip 
              content={<CustomTooltip totalValue={totalValue} showPercentage />}
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
            <XAxis 
              dataKey="name" 
              {...rtlAxisPropsWithDarkMode}
              tickFormatter={formatAxisTick }
              angle={isMobile ? -35 : 0}
              textAnchor="end"
              height={55}
              dy={5}
              dx={isMobile ? -15 : -15}
            />
            <YAxis 
              {...rtlAxisPropsWithDarkMode}
              tickFormatter={formatAxisTick}
            />
          </LineChart>
        </ResponsiveWrapper>
      );

    /**
     * ComposedChart - גרף משולב
     * גרף שמשלב כמה סוגי גרפים יחד באותו גרף
     * בדרך כלל משלב עמודות (Bar) וקו (Line) כדי להציג שני סוגי נתונים או מדדים שונים
     * שימוש: להשוואה בין נתונים כמותיים (עמודות) לבין מגמה או שינוי לאורך זמן (קו)
     */
    case 'ComposedChart':
      return (
        <ResponsiveWrapper chartType="ComposedChart">
          <ComposedChart 
            data={chartData} 
            margin={isMobile ? { top: 10, right: 20, left: -35, bottom: -35 } : { top: 10, right: 0, left: -35, bottom: 5 }}
          >
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <Tooltip 
              content={<CustomTooltip totalValue={totalValue} showPercentage />}
              wrapperStyle={{ zIndex: 1000 }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getColorForItem(entry.name, config.dataKey, systemData)} 
                />
              ))}
            </Bar>
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#ef4444" 
              strokeWidth={2}
              dot={false}
            />
            <XAxis 
              dataKey="name" 
              {...rtlAxisPropsWithDarkMode}
              tickFormatter={isMobile ? formatAxisTickTruncated : formatAxisTick }
              angle={isMobile ? -35 : 0}
              textAnchor="end"
              height={60}
              dy={5}
              dx={isMobile ? -15 : -15}
            />
            <YAxis 
              {...rtlAxisPropsWithDarkMode}
              tickFormatter={formatAxisTick}
              width={45}
            />
          </ComposedChart>
        </ResponsiveWrapper>
      );

    /**
     * Treemap - מפת עץ
     * גרף שמציג נתונים כמלבנים מקוננים (nested rectangles)
     * כל מלבן מייצג קטגוריה, והגודל שלו מייצג את הערך
     * המלבנים מסודרים כך שגדולים יותר תופסים יותר מקום
     * שימוש: להצגת חלוקה היררכית, השוואה בין קטגוריות רבות, או הדגשת הפרופורציות
     */
    case 'Treemap':
      const treemapData = chartData.map(item => ({
        name: item.name,
        size: item.value || item.size,
        fill: item.fill || getColorForItem(item.name, config.dataKey, systemData),
        category: item.category,
        platform: item.platform,
        instrument: item.instrument,
      }));
      
      return (
        <ResponsiveWrapper chartType="Treemap">
          <Treemap 
            data={treemapData} 
            dataKey="size" 
            aspectRatio={4 / 3} 
            stroke="#fff" 
            strokeWidth={2}
            content={<CustomTreemapContent />}
            animationDuration={300}
          >
            <Tooltip 
              content={<CustomTreemapTooltip totalValue={totalValue} />} 
              wrapperStyle={{ zIndex: 1000 }}
            />
          </Treemap>
        </ResponsiveWrapper>
      );

    default:
      return (
        <NoDataMessage message="סוג גרף לא נתמך" />
      );
  }
};

export default ChartRenderer;
