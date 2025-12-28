/**
 * Utility for generating lightweight portfolio context strings for AI interactions
 * Creates a concise representation of the user's portfolio without heavy JSON objects
 */

/**
 * Generate a lightweight string representation of the portfolio for AI context
 * @param {Array} assets - Array of asset objects
 * @returns {string} - Formatted context string
 */
export const generatePortfolioContext = (assets) => {
  if (!assets || assets.length === 0) {
    return "CURRENT PORTFOLIO CONTEXT:\n(No assets in portfolio)";
  }

  // Calculate total value
  const totalValue = assets.reduce((sum, asset) => sum + (asset.value || 0), 0);

  // Build asset list with only relevant fields
  const assetLines = assets.map(asset => {
    const symbol = asset.symbol ? `[${asset.symbol}]` : '';
    const name = asset.name || 'Unnamed Asset';
    const category = asset.category || 'אחר';
    const instrument = asset.instrument || '';
    const tags = asset.tags && Array.isArray(asset.tags) 
      ? asset.tags.join(', ') 
      : (asset.tags || '');
    
    // Build description: Name, Category, Instrument, Tags
    let description = `${category}`;
    if (instrument && instrument !== category) {
      description += ` (${instrument})`;
    }
    if (tags) {
      description += ` - Tags: ${tags}`;
    }

    return `- ${symbol} ${name}: ${description}`;
  });

  // Format the context string
  const context = `CURRENT PORTFOLIO CONTEXT:
${assetLines.join('\n')}
Total Value: ₪${totalValue.toLocaleString('he-IL')}
Total Assets: ${assets.length}`;

  return context;
};

