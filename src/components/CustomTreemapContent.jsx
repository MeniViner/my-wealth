/**
 * Custom content component for Recharts Treemap
 * Clean, minimal RTL-aware design with smart text handling
 */

// Hebrew font stack
const HEBREW_FONT = "'Assistant', 'Heebo', 'Rubik', sans-serif";

// Format currency for Hebrew locale
const formatCurrency = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return '';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Truncate text with ellipsis if too long
const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 1) + '…';
};

// Calculate contrasting text color based on background
const getContrastColor = (hexColor) => {
  if (!hexColor) return '#1e293b';
  const hex = hexColor.replace('#', '');
  
  // Validate hex length - need at least 6 characters for RGB
  if (hex.length < 6) {
    // If short hex (e.g., #abc), expand it (e.g., #aabbcc)
    if (hex.length === 3) {
      const expanded = hex.split('').map(char => char + char).join('');
      const r = parseInt(expanded.substring(0, 2), 16) || 0;
      const g = parseInt(expanded.substring(2, 4), 16) || 0;
      const b = parseInt(expanded.substring(4, 6), 16) || 0;
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? '#1e293b' : '#ffffff';
    }
    // If invalid, return default
    return '#1e293b';
  }
  
  // Parse RGB values with fallback to 0 if invalid
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Return dark text for light backgrounds, light text for dark backgrounds
  return luminance > 0.5 ? '#1e293b' : '#ffffff';
};

const CustomTreemapContent = (props) => {
  const { x, y, width, height, name, size, fill, depth } = props;
  
  // Skip rendering for root node
  if (depth === 0) return null;
  
  // Minimum dimensions to show any content
  const MIN_WIDTH_FOR_TEXT = 50;
  const MIN_HEIGHT_FOR_TEXT = 35;
  const MIN_WIDTH_FOR_VALUE = 70;
  const MIN_HEIGHT_FOR_VALUE = 50;
  
  // Determine what to show based on available space
  const showText = width >= MIN_WIDTH_FOR_TEXT && height >= MIN_HEIGHT_FOR_TEXT;
  const showValue = width >= MIN_WIDTH_FOR_VALUE && height >= MIN_HEIGHT_FOR_VALUE;
  
  // Calculate responsive font sizes
  const nameFontSize = Math.min(Math.max(Math.floor(width / 8), 10), 16);
  const valueFontSize = Math.min(Math.max(Math.floor(width / 10), 9), 13);
  
  // Calculate max characters based on width
  const maxChars = Math.max(Math.floor(width / (nameFontSize * 0.6)), 3);
  
  // Get tile color
  const tileColor = fill || '#94a3b8';
  
  // Get text color based on background - use contrast color with stroke outline
  const textColor = getContrastColor(tileColor);
  const strokeColor = textColor === '#ffffff' ? '#000000' : '#ffffff';
  
  // Calculate text position (centered)
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  
  // Truncated name for display
  const displayName = truncateText(name, maxChars);
  
  return (
    <g>
      {/* Main tile rectangle - clean flat color */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: tileColor,
          stroke: '#ffffff',
          strokeWidth: 2,
          cursor: 'pointer',
        }}
        rx={4}
        ry={4}
      />
      
      {/* Name text with stroke outline for readability */}
      {showText && displayName && (
        <text
          x={centerX}
          y={showValue ? centerY - valueFontSize * 0.5 : centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fill: textColor,
            fontSize: `${nameFontSize}px`,
            fontWeight: 700,
            fontFamily: HEBREW_FONT,
            pointerEvents: 'none',
            stroke: strokeColor,
            strokeWidth: 2.5,
            paintOrder: 'stroke fill',
          }}
        >
          {displayName}
        </text>
      )}
      
      {/* Value text with stroke outline */}
      {showValue && size && (
        <text
          x={centerX}
          y={centerY + nameFontSize * 0.7}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fill: textColor,
            fontSize: `${valueFontSize}px`,
            fontWeight: 600,
            fontFamily: HEBREW_FONT,
            pointerEvents: 'none',
            stroke: strokeColor,
            strokeWidth: 2,
            paintOrder: 'stroke fill',
            opacity: 0.9,
          }}
        >
          {formatCurrency(size)}
        </text>
      )}
    </g>
  );
};

export default CustomTreemapContent;
