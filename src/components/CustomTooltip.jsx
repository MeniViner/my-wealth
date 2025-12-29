/**
 * Custom RTL tooltip component for Recharts
 * Used for PieChart, BarChart, AreaChart, LineChart, etc.
 * Proper Hebrew text direction and currency/percentage formatting
 */

// Hebrew font stack
const HEBREW_FONT = "'Assistant', 'Heebo', 'Rubik', sans-serif";

// Format currency for Hebrew locale with proper spacing
const formatCurrency = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return '—';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Format percentage
const formatPercentage = (value, total) => {
  if (!total || total === 0) return '';
  const pct = (value / total) * 100;
  return `${pct.toFixed(1)}%`;
};

const CustomTooltip = ({ active, payload, label, totalValue, showPercentage = false }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0];
  const payloadData = data.payload || {};
  
  // Try multiple ways to get the value - different chart types use different structures
  // For BarChart/AreaChart/LineChart: data.value
  // For PieChart: data.value or payload.value
  // For some charts: payload.size
  const value = data.value ?? payloadData.value ?? payloadData.size ?? 0;
  
  // Try multiple ways to get the name
  // Priority: label (X-axis label) > payload.name (actual data point name) > data.name (but skip if it's the dataKey like "value")
  let name = label || payloadData.name || '';
  // If name is still empty or is a generic dataKey name, try other options
  if (!name || name === 'value' || name === 'size') {
    name = data.name && data.name !== 'value' && data.name !== 'size' ? data.name : '';
  }
  // Final fallback
  if (!name) {
    name = data.dataKey || '';
  }
  
  // Try multiple ways to get the color
  const color = data.color || payloadData.fill || data.fill || '#3b82f6';
  
  // Try multiple ways to get percentage
  const percentage = payloadData.percentage || (value && totalValue ? ((value / totalValue) * 100).toFixed(1) : null);

  return (
    <div
      dir="rtl"
      className="chart-tooltip-rtl"
      style={{
        direction: 'rtl',
        textAlign: 'right',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        padding: '10px 14px',
        borderRadius: '10px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        minWidth: '140px',
        maxWidth: '250px',
        fontFamily: HEBREW_FONT,
      }}
    >
      {/* Header with name and color indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '3px',
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontWeight: 600,
            fontSize: '14px',
            color: '#1e293b',
            lineHeight: 1.3,
          }}
        >
          {name}
        </span>
      </div>

      {/* Value display - RTL formatted */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'flex-start',
          gap: '8px',
        }}
      >
        <span
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#64748b',
          }}
        >
          שווי:
        </span>
        <span
          style={{
            fontSize: '17px',
            fontWeight: 700,
            color: '#059669',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {formatCurrency(value)}
        </span>
      </div>

      {/* Percentage if available */}
      {(percentage || (showPercentage && totalValue)) && (
        <div
          style={{
            marginTop: '6px',
            paddingTop: '6px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#64748b',
            }}
          >
            אחוז:
          </span>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#475569',
            }}
          >
            {percentage ? `${percentage}%` : formatPercentage(value, totalValue)}
          </span>
        </div>
      )}
    </div>
  );
};

export default CustomTooltip;
