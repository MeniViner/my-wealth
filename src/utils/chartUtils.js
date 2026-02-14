/**
 * Utility functions for chart data aggregation and rendering
 * RTL and Hebrew locale aware
 */

// Hebrew font stack
export const HEBREW_FONT = "'Assistant', 'Heebo', 'Rubik', sans-serif";

// App color palette for charts
export const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
];

// Tag translation mapping (English to Hebrew)
const TAG_TRANSLATIONS = {
  'long-term': 'ארוך טווח',
  'short-term': 'קצר טווח',
  'high-risk': 'סיכון גבוה',
  'low-risk': 'סיכון נמוך',
  'medium-risk': 'סיכון בינוני',
  'dividend': 'דיבידנד',
  'growth': 'צמיחה',
  'value': 'ערך',
  'income': 'הכנסה',
  'emergency': 'חירום',
  'retirement': 'פנסיה',
  'savings': 'חיסכון',
  'investment': 'השקעה',
  'crypto': 'קריפטו',
  'stocks': 'מניות',
  'bonds': 'אגרות חוב',
  'real-estate': 'נדלן',
  'cash': 'מזומן',
  'liquid': 'נזיל',
  'illiquid': 'לא נזיל',
  'tax-advantaged': 'יתרון מס',
  'taxable': 'חייב במס',
  'diversified': 'מגוון',
  'concentrated': 'מרוכז',
  'domestic': 'מקומי',
  'international': 'בינלאומי',
  'emerging': 'מתפתח',
  'developed': 'מפותח',
};

/**
 * Translate tag from English to Hebrew
 * @param {string} tag - Tag name in English
 * @returns {string} Tag name in Hebrew
 */
export const translateTag = (tag) => {
  if (!tag) return tag;
  // Check if tag is already in Hebrew (contains Hebrew characters)
  const hasHebrew = /[\u0590-\u05FF]/.test(tag);
  if (hasHebrew) return tag;

  // Try to find translation
  const lowerTag = tag.toLowerCase().trim();
  return TAG_TRANSLATIONS[lowerTag] || tag;
};

/**
 * Format currency for Hebrew locale with proper spacing
 * @param {number} value - The value to format
 * @param {string} currency - Currency code (default: ILS)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currency = 'ILS') => {
  if (typeof value !== 'number' || isNaN(value)) return '—';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Format percentage for Hebrew locale
 * @param {number} value - The value
 * @param {number} total - The total for percentage calculation
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, total) => {
  if (!total || total === 0) return '0%';
  const pct = (value / total) * 100;
  return `${pct.toFixed(1)}%`;
};

/**
 * Format axis tick value for display
 * @param {number|string} value - The value to format
 * @returns {string} Formatted tick string
 */
export const formatAxisTick = (value) => {
  if (typeof value === 'number') {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString('he-IL');
  }
  // Truncate long Hebrew text
  if (typeof value === 'string' && value.length > 12) {
    return value.substring(0, 11) + '…';
  }
  return value;
};

/**
 * Truncate text with ellipsis if too long
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 1) + '…';
};

/**
 * Aggregate assets data based on grouping key
 * @param {Array} assets - Array of asset objects
 * @param {string} groupBy - Field to group by ('category', 'platform', 'instrument', 'tags', 'currency', 'symbol')
 * @param {Object} filters - Optional filters object
 * @param {string} labelMode - Display mode when groupBy is 'symbol': 'symbol' | 'name' | 'category' (default: 'symbol')
 * @returns {Array} Aggregated data in format [{ name, value }]
 */
export const aggregateData = (assets, groupBy, filters = {}, labelMode = 'symbol') => {
  if (!assets || assets.length === 0) return [];

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
  if (filters.subcategory) {
    filteredAssets = filteredAssets.filter(a => a.subcategory === filters.subcategory);
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
          const translatedTag = translateTag(tag);
          map[translatedTag] = (map[translatedTag] || 0) + asset.value;
        });
      } else {
        // If no tags, put in "ללא תגיות"
        map['ללא תגיות'] = (map['ללא תגיות'] || 0) + asset.value;
      }
    });
  } else if (groupBy === 'symbol') {
    // Special handling for symbol - use labelMode to determine display key
    filteredAssets.forEach(asset => {
      let key;
      switch (labelMode) {
        case 'name':
          // Display by asset name
          key = asset.name || asset.symbol || 'ללא שם';
          break;
        case 'category':
          // Display by category
          key = asset.category || 'אחר';
          break;
        case 'symbol':
        default:
          // Display by symbol (default)
          key = asset.symbol || asset.name || 'ללא סמל';
      }
      map[key] = (map[key] || 0) + asset.value;
    });
  } else if (groupBy === 'subcategory') {
    // Group by subcategory
    filteredAssets.forEach(asset => {
      const key = asset.subcategory || 'אחר';
      map[key] = (map[key] || 0) + asset.value;
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

/**
 * Get color for chart item based on data key and system data
 * @param {string} name - Item name
 * @param {string} dataKey - Data key (category, platform, instrument, etc.)
 * @param {Object} systemData - System data with colors
 * @returns {string} Color hex code
 */
export const getColorForItem = (name, dataKey, systemData) => {
  if (!systemData) {
    // Fallback to palette
    return CHART_COLORS[Math.abs(name?.charCodeAt(0) || 0) % CHART_COLORS.length];
  }

  if (dataKey === 'category') {
    const category = systemData.categories?.find(c => c.name === name);
    return category?.color || '#3b82f6';
  }
  if (dataKey === 'platform') {
    const platform = systemData.platforms?.find(p => p.name === name);
    return platform?.color || '#10b981';
  }
  if (dataKey === 'instrument') {
    const instrument = systemData.instruments?.find(i => i.name === name);
    return instrument?.color || '#f59e0b';
  }
  if (dataKey === 'symbol') {
    const symbol = systemData.symbols?.find(s => {
      const symbolName = typeof s === 'string' ? s : s.name;
      return symbolName === name;
    });
    if (symbol && typeof symbol !== 'string') {
      return symbol.color || '#94a3b8';
    }
  }
  if (dataKey === 'subcategory') {
    const subcategory = systemData.subcategories?.find(sc => sc.name === name);
    return subcategory?.color || '#8B5CF6';
  }

  // Default: use color palette based on name hash
  return CHART_COLORS[Math.abs(name?.charCodeAt(0) || 0) % CHART_COLORS.length];
};

/**
 * Common axis props for RTL charts
 */
export const getRTLAxisProps = () => ({
  tick: {
    fontSize: 11,
    fontFamily: HEBREW_FONT,
    fill: '#64748b',
  },
  axisLine: { stroke: '#e2e8f0' },
  tickLine: { stroke: '#e2e8f0' },
});

/**
 * Get responsive font size based on container width
 * @param {number} containerWidth - The container width
 * @param {number} minSize - Minimum font size
 * @param {number} maxSize - Maximum font size
 * @returns {number} Calculated font size
 */
export const getResponsiveFontSize = (containerWidth, minSize = 10, maxSize = 16) => {
  const calculated = Math.floor(containerWidth / 25);
  return Math.min(Math.max(calculated, minSize), maxSize);
};

/**
 * Calculate if content should be shown based on container dimensions
 * @param {number} width - Container width
 * @param {number} height - Container height
 * @param {string} contentType - Type of content ('text', 'value', 'both')
 * @returns {boolean} Whether content should be shown
 */
export const shouldShowContent = (width, height, contentType = 'text') => {
  const MIN_DIMS = {
    text: { width: 50, height: 35 },
    value: { width: 70, height: 50 },
    both: { width: 80, height: 60 },
  };

  const dims = MIN_DIMS[contentType] || MIN_DIMS.text;
  return width >= dims.width && height >= dims.height;
};
