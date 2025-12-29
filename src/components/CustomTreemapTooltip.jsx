/**
 * Custom RTL tooltip component for Treemap
 * Proper Hebrew text direction and currency formatting
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

const CustomTreemapTooltip = ({ active, payload, totalValue }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;
  const name = data.name || '';
  const value = data.size || data.value || 0;
  const category = data.category || '';
  const platform = data.platform || '';
  const instrument = data.instrument || '';
  const color = data.fill || '#3b82f6';

  return (
    <div
      dir="rtl"
      style={{
        direction: 'rtl',
        textAlign: 'right',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        padding: '12px 16px',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 2px 10px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        minWidth: '160px',
        maxWidth: '280px',
        fontFamily: HEBREW_FONT,
      }}
    >
      {/* Header with color indicator and name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '10px',
          paddingBottom: '10px',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '4px',
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontWeight: 700,
            fontSize: '15px',
            color: '#1e293b',
            lineHeight: 1.3,
          }}
        >
          {name}
        </span>
      </div>

      {/* Main value */}
      <div
        style={{
          fontSize: '20px',
          fontWeight: 800,
          color: '#059669',
          marginBottom: '8px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {formatCurrency(value)}
      </div>

      {/* Percentage if total is available */}
      {totalValue && totalValue > 0 && (
        <div
          style={{
            fontSize: '13px',
            color: '#64748b',
            marginBottom: '10px',
          }}
        >
          <span style={{ fontWeight: 500 }}>אחוז מהתיק:</span>{' '}
          <span style={{ fontWeight: 600, color: '#475569' }}>
            {formatPercentage(value, totalValue)}
          </span>
        </div>
      )}

      {/* Additional details */}
      {(category || platform || instrument) && (
        <div
          style={{
            paddingTop: '8px',
            borderTop: '1px solid #f1f5f9',
            fontSize: '12px',
            color: '#64748b',
          }}
        >
          {category && (
            <div style={{ marginBottom: '4px' }}>
              <span style={{ fontWeight: 600 }}>אפיקי השקעה:</span> {category}
            </div>
          )}
          {platform && (
            <div style={{ marginBottom: '4px' }}>
              <span style={{ fontWeight: 600 }}>חשבונות וארנקים:</span> {platform}
            </div>
          )}
          {instrument && (
            <div>
              <span style={{ fontWeight: 600 }}>מטבעות בסיס:</span> {instrument}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomTreemapTooltip;
