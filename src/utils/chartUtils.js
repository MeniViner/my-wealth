/**
 * Utility functions for chart data aggregation and rendering
 */

/**
 * Aggregate assets data based on grouping key
 * @param {Array} assets - Array of asset objects
 * @param {string} groupBy - Field to group by ('category', 'platform', 'instrument', 'tags', 'currency', 'symbol')
 * @param {Object} filters - Optional filters object
 * @returns {Array} Aggregated data in format [{ name, value }]
 */
export const aggregateData = (assets, groupBy, filters = {}) => {
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
  } else if (groupBy === 'symbol') {
    // Special handling for symbol - fallback to name if symbol doesn't exist
    filteredAssets.forEach(asset => {
      const key = asset.symbol || asset.name || 'ללא סמל';
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

