import { useState, useMemo } from 'react';
import { RotateCcw, Search, AlertCircle, Check } from 'lucide-react';
import { confirmAlert, successToast } from '../utils/alerts';

/**
 * רכיב לניהול ושחזור עלויות מקוריות של נכסים
 */
const AssetCostReset = ({ assets, onUpdateAsset, isLoading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [resettingAssets, setResettingAssets] = useState(new Set());

  // סנן רק נכסים במצב QUANTITY שיש להם מחיר רכישה מקורי
  const quantityAssets = useMemo(() => {
    return assets.filter(asset => 
      asset.assetMode === 'QUANTITY' && 
      asset.quantity && 
      asset.purchasePrice
    );
  }, [assets]);

  // סנן לפי חיפוש
  const filteredAssets = useMemo(() => {
    if (!searchTerm) return quantityAssets;
    
    const term = searchTerm.toLowerCase();
    return quantityAssets.filter(asset => 
      asset.name?.toLowerCase().includes(term) ||
      asset.symbol?.toLowerCase().includes(term) ||
      asset.category?.toLowerCase().includes(term)
    );
  }, [quantityAssets, searchTerm]);

  /**
   * שחזר את העלות המקורית של נכס
   * מחזיר את המחיר הנוכחי למחיר הרכישה המקורי
   */
  const handleResetCost = async (asset) => {
    const confirmed = await confirmAlert(
      'שחזור עלות מקורית',
      `האם לשחזר את העלות המקורית של ${asset.name}?\n\nמחיר נוכחי: ${asset.currentPrice?.toFixed(2) || 'לא זמין'}\nמחיר רכישה מקורי: ${asset.purchasePrice.toFixed(2)}`,
      'question'
    );

    if (!confirmed) return;

    setResettingAssets(prev => new Set(prev).add(asset.id));

    try {
      // עדכן את הנכס - החזר את המחיר הנוכחי למחיר הרכישה המקורי
      await onUpdateAsset(asset.id, {
        ...asset,
        currentPrice: asset.purchasePrice,
        priceChange24h: 0,
        profitLoss: 0,
        profitLossPercent: 0,
        lastUpdated: new Date().toISOString()
      });

      await successToast(`העלות המקורית של ${asset.name} שוחזרה בהצלחה`, 2000);
    } catch (error) {
      console.error('Error resetting asset cost:', error);
      await confirmAlert(
        'שגיאה',
        `אירעה שגיאה בשחזור העלות: ${error.message}`,
        'error'
      );
    } finally {
      setResettingAssets(prev => {
        const newSet = new Set(prev);
        newSet.delete(asset.id);
        return newSet;
      });
    }
  };

  // חישוב סטטיסטיקות
  const stats = useMemo(() => {
    if (isLoading) {
      return { total: null, withLivePrice: null, withProfit: null, withLoss: null };
    }
    
    const total = quantityAssets.length;
    const withLivePrice = quantityAssets.filter(a => a.hasLivePrice).length;
    const withProfit = quantityAssets.filter(a => (a.profitLoss || 0) > 0).length;
    const withLoss = quantityAssets.filter(a => (a.profitLoss || 0) < 0).length;

    return { total, withLivePrice, withProfit, withLoss };
  }, [quantityAssets, isLoading]);

  if (quantityAssets.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <AlertCircle size={24} />
          <p>אין נכסים זמינים לשחזור עלות. רק נכסים במצב מעקב כמות עם מחיר רכישה יופיעו כאן.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* סטטיסטיקות */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
          <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">סה"כ נכסים</div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 h-8 flex items-center">
            {isLoading || stats.total === null ? (
              <div className="animate-pulse flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-300 dark:bg-blue-600 rounded"></div>
              </div>
            ) : (
              stats.total
            )}
          </div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
          <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">עם מחיר לייב</div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 h-8 flex items-center">
            {isLoading || stats.withLivePrice === null ? (
              <div className="animate-pulse flex items-center gap-2">
                <div className="w-6 h-6 bg-emerald-300 dark:bg-emerald-600 rounded"></div>
              </div>
            ) : (
              stats.withLivePrice
            )}
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
          <div className="text-sm text-green-600 dark:text-green-400 font-medium">ברווח</div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300 h-8 flex items-center">
            {isLoading || stats.withProfit === null ? (
              <div className="animate-pulse flex items-center gap-2">
                <div className="w-6 h-6 bg-green-300 dark:bg-green-600 rounded"></div>
              </div>
            ) : (
              stats.withProfit
            )}
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
          <div className="text-sm text-red-600 dark:text-red-400 font-medium">בהפסד</div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-300 h-8 flex items-center">
            {isLoading || stats.withLoss === null ? (
              <div className="animate-pulse flex items-center gap-2">
                <div className="w-6 h-6 bg-red-300 dark:bg-red-600 rounded"></div>
              </div>
            ) : (
              stats.withLoss
            )}
          </div>
        </div>
      </div>

      {/* חיפוש */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="חפש נכס לפי שם, סימול או קטגוריה..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pr-10 pl-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {/* רשימת נכסים */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">נכס</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">מחיר נוכחי</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">מחיר רכישה</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">רווח/הפסד</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">פעולה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    לא נמצאו נכסים התואמים את החיפוש
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const isResetting = resettingAssets.has(asset.id);
                  const profitLoss = asset.profitLoss || 0;
                  const profitLossPercent = asset.profitLossPercent || 0;
                  const isProfit = profitLoss > 0;
                  const isLoss = profitLoss < 0;

                  return (
                    <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 dark:text-slate-100">{asset.name}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {asset.symbol} • {asset.category}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {isLoading && (!asset.quantity || !asset.currentPrice) ? (
                              <div className="animate-pulse flex items-center gap-2">
                                <div className="w-20 h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
                              </div>
                            ) : asset.currentPrice ? (
                              `₪${(asset.value || (asset.quantity || 0) * (asset.currentPrice || 0)).toFixed(2)}`
                            ) : (
                              'לא זמין'
                            )}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {isLoading && !asset.currentPrice ? (
                              <div className="animate-pulse flex items-center gap-2">
                                <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                              </div>
                            ) : asset.currentPrice ? (
                              <>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  ₪{asset.currentPrice.toFixed(2)} למניה
                                </span>
                                {asset.hasLivePrice && (
                                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <Check size={10} /> לייב
                                  </span>
                                )}
                              </>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {isLoading && (!asset.quantity || !asset.purchasePrice) ? (
                              <div className="animate-pulse flex items-center gap-2">
                                <div className="w-20 h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
                              </div>
                            ) : (
                              `₪${(asset.originalValue || (asset.quantity || 0) * (asset.purchasePrice || 0)).toFixed(2)}`
                            )}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {isLoading && !asset.purchasePrice ? (
                              <div className="animate-pulse flex items-center gap-2">
                                <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                              </div>
                            ) : (
                              `₪${asset.purchasePrice.toFixed(2)} למניה`
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          {isLoading && (asset.profitLoss === null || asset.profitLoss === undefined) ? (
                            <div className="animate-pulse flex items-center gap-2">
                              <div className="w-20 h-5 bg-slate-200 dark:bg-slate-700 rounded"></div>
                            </div>
                          ) : (
                            <>
                              <span className={`font-medium ${
                                isProfit 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : isLoss 
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}>
                                {profitLoss > 0 ? '+' : ''}₪{profitLoss.toFixed(2)}
                              </span>
                              <span className={`text-xs ${
                                isProfit 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : isLoss 
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}>
                                {profitLossPercent > 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleResetCost(asset)}
                          disabled={isResetting}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <RotateCcw size={14} className={isResetting ? 'animate-spin' : ''} />
                          {isResetting ? 'משחזר...' : 'שחזר'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* הודעת עזרה */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <p className="font-medium">מה עושה שחזור עלות?</p>
            <p>
              כאשר תלחץ על "שחזר", המחיר הנוכחי של הנכס יוחזר למחיר הרכישה המקורי שהזנת. 
              זה שימושי אם מחיר בזמן אמת שגוי או אם אתה רוצה לאפס את הרווח/הפסד של נכס.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetCostReset;
