const MobileAssetCard = ({ asset, onClick }) => {
    return (
        <div
            onClick={() => onClick(asset)}
            className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
        >
            <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{asset.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    {asset.symbol || (asset.assetMode === 'QUANTITY' && 'כמות')}
                </div>
            </div>
            <div className="text-left">
                <div className="font-bold text-sm text-slate-900 dark:text-white" dir="ltr">
                    ₪{Math.round(asset.value).toLocaleString()}
                </div>
                <div className="text-xs mt-0.5 flex justify-end gap-1">
                    {asset.profitLoss !== null && asset.profitLoss !== undefined ? (
                        <span
                            className={`${asset.profitLoss >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                                }`}
                            dir="ltr"
                        >
                            {asset.profitLoss >= 0 ? '+' : ''}{Math.round(asset.profitLoss).toLocaleString()} ({asset.profitLossPercent?.toFixed(1)}%)
                        </span>
                    ) : (
                        <span className="text-slate-400 dark:text-slate-500">
                            {asset.assetMode === 'QUANTITY' && asset.quantity
                                ? `כ: ${asset.quantity.toLocaleString()}`
                                : '---'}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MobileAssetCard;
