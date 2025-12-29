import { Treemap, Tooltip, ResponsiveContainer } from 'recharts';
import CustomTreemapContent from './CustomTreemapContent';
import CustomTreemapTooltip from './CustomTreemapTooltip';

// Hebrew font stack
const HEBREW_FONT = "'Assistant', 'Heebo', 'Rubik', sans-serif";

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
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
    <span style={{ fontSize: '14px', fontWeight: 500 }}>{message}</span>
    <span style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
      נסה להוסיף נכסים או לשנות את הפילטרים
    </span>
  </div>
);

/**
 * Reusable Treemap Chart Component
 * Clean, RTL-aware design
 */
const TreemapChart = ({ 
  data, 
  title, 
  height = 'h-64', 
  aspectRatio = 4 / 3,
  className = '',
  totalValue = null,
}) => {
  // Calculate total if not provided
  const calculatedTotal = totalValue || (data?.reduce((sum, item) => sum + (item.size || item.value || 0), 0) || 0);
  
  // Check for empty data
  const hasData = data && data.length > 0;

  return (
    <div 
      dir="rtl"
      className={`bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 ${className}`}
    >
      {title && (
        <h3 
          className="text-base md:text-lg font-bold text-slate-800 dark:text-white mb-4"
          style={{ fontFamily: HEBREW_FONT }}
        >
          {title}
        </h3>
      )}
      <div className={`${height} min-h-[200px]`}>
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap 
              data={data} 
              dataKey="size" 
              aspectRatio={aspectRatio} 
              stroke="#fff"
              strokeWidth={2}
              content={<CustomTreemapContent />}
              animationDuration={300}
            >
              <Tooltip 
                content={<CustomTreemapTooltip totalValue={calculatedTotal} />}
                wrapperStyle={{ zIndex: 1000 }}
              />
            </Treemap>
          </ResponsiveContainer>
        ) : (
          <NoDataMessage />
        )}
      </div>
    </div>
  );
};

export default TreemapChart;
