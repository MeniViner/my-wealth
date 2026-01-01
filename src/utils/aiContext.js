/**
 * Utility for generating lightweight portfolio context strings for AI interactions
 * Creates a concise representation of the user's portfolio without heavy JSON objects
 * 
 * PRIVACY: Only sends minimal data - no PII (Personally Identifiable Information)
 * - Asset Ticker/Symbol
 * - Asset Category
 * - Current Value
 * - % Allocation
 * 
 * EXCLUDED (PII):
 * - User IDs
 * - User email/name
 * - Internal asset IDs
 * - Purchase dates
 * - Platform account details
 * - Any metadata that could identify the user
 */

/**
 * Generate a lightweight string representation of the portfolio for AI context
 * Only includes: Ticker, Category, Current Value, and % Allocation
 * @param {Array} assets - Array of asset objects
 * @returns {string} - Formatted context string (PII-free)
 */
export const generatePortfolioContext = (assets) => {
  if (!assets || assets.length === 0) {
    return "CURRENT PORTFOLIO CONTEXT:\n(No assets in portfolio)";
  }

  // Calculate total value
  const totalValue = assets.reduce((sum, asset) => sum + (asset.value || 0), 0);

  // Build asset list with ONLY safe fields (no PII)
  const assetLines = assets.map(asset => {
    // Only include: Symbol, Category, Current Value, % Allocation
    const symbol = asset.symbol || 'N/A';
    const category = asset.category || 'אחר';
    const value = asset.value || 0;
    const allocation = totalValue > 0 ? ((value / totalValue) * 100).toFixed(2) : '0.00';

    // Format: Symbol | Category | Value | Allocation%
    return `${symbol} | ${category} | ₪${value.toLocaleString('he-IL')} | ${allocation}%`;
  });

  // Format the context string (no user metadata, no IDs, no PII)
  const context = `CURRENT PORTFOLIO CONTEXT:
Format: Symbol | Category | Current Value | Allocation%
${assetLines.join('\n')}
Total Value: ₪${totalValue.toLocaleString('he-IL')}
Total Assets: ${assets.length}`;

  return context;
};

