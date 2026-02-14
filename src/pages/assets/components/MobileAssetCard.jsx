const MobileAssetCard = ({ asset, onClick }) => {
    return (
        <div
            onClick={() => onClick(asset)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
        >
            {/* Header: Name + Value */}
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                        {asset.name}
                    </h3>
                    {asset.symbol && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            {asset.symbol}
                        </p>
                    )}
                </div>
                <div className="text-right flex-shrink-0">
                    <p className="font-bold text-slate-900 dark:text-white" dir="ltr">
                        ₪{Math.round(asset.value).toLocaleString()}
                    </p>
                    {asset.currency && asset.originalValue && (
                        <p className="text-xs text-slate-400 dark:text-slate-500" dir="ltr">
                            בקניה: {asset.currency === 'USD' ? '$' : '₪'}{Math.round(asset.originalValue || 0).toLocaleString()}
                        </p>
                    )}
                </div>
            </div>

            {/* Metadata Row */}
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400" dir="ltr">


                {/* Live Price Indicator */}
                {asset.hasLivePrice && (
                    <span className="text-emerald-500 text-xs">● Live</span>
                )}

                {/* P/L */}
                {asset.profitLoss !== null && asset.profitLoss !== undefined && (
                    <span
                        className={`px-2 py-1 rounded font-medium ${asset.profitLoss >= 0
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            }`}
                    >
                        {asset.profitLoss >= 0 ? '↑' : '↓'} {Math.abs(asset.profitLossPercent || 0).toFixed(1)}%
                    </span>
                )}
            </div>

            {/* Quantity (if available) */}
            {asset.assetMode === 'QUANTITY' && asset.quantity && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    כמות: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                        {asset.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                    </span>
                </div>
            )}
        </div>
    );
};

export default MobileAssetCard;
