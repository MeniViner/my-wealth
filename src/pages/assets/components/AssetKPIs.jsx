import { TrendingUp, TrendingDown, DollarSign, Package, Building2 } from 'lucide-react';

const AssetKPIs = ({ assets }) => {
    // Calculate KPIs from assets
    const totalValue = assets.reduce((sum, asset) => sum + (asset.value || 0), 0);
    const totalAssets = assets.length;
    const numOfPlatforms = new Set(assets.map(asset => asset.platform).filter(Boolean)).size;
    
    return (
        <div className="grid grid-cols-3 md:grid-cols-3 gap-4 ">
            {/* Total Value */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                        <DollarSign size={20} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">שווי כולל</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white truncate" dir="ltr">
                            ₪ {Math.round(totalValue).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Total Assets */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <Package size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">סך נכסים</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">
                            {totalAssets}
                        </p>
                    </div>
                </div>
            </div>

            {/* Number of Platforms */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                        <Building2 size={20} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400"> פלטפורמות</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">
                            {numOfPlatforms}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssetKPIs;
