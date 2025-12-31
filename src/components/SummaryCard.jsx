import { Wallet, Calendar, TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * SummaryCard Component
 * A reusable card component for displaying summary statistics
 * 
 * @param {string} title - The title/label of the card
 * @param {string|number} value - The main value to display
 * @param {React.Component} icon - The icon component to display
 * @param {Object} plData - Profit/Loss data (optional): { amount: number, percent: number }
 * @param {string} iconBgColor - Background color for the icon circle (optional)
 */
const SummaryCard = ({ title, value, icon: Icon, plData, iconBgColor = 'bg-blue-500/10' }) => {
  const isPositive = plData ? plData.amount >= 0 : null;
  const plColor = isPositive === true ? 'text-green-500' : isPositive === false ? 'text-red-500' : '';
  const plBgColor = isPositive === true ? 'bg-green-500/10' : isPositive === false ? 'bg-red-500/10' : '';
  
  return (
    <div className="bg-white dark:bg-[#1E1E2D] rounded-lg md:rounded-xl p-2 md:p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-1 md:mb-3">
        {/* Icon */}
        <div className={`${iconBgColor} rounded-full p-1 md:p-2.5 flex items-center justify-center`}>
          <Icon className="w-3 h-3 md:w-5 md:h-5 text-slate-700 dark:text-slate-300" />
        </div>
        
        {/* P/L Badge (if applicable) */}
        {plData && (
          <div className={`${plBgColor} ${plColor} px-1.5 py-0.5 md:px-2.5 md:py-1 rounded md:rounded-lg flex items-center gap-0.5 md:gap-1.5 text-[9px] md:text-xs font-semibold`}>
            {isPositive ? (
              <ArrowUp className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
            ) : (
              <ArrowDown className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
            )}
            <span>{Math.abs(plData.percent).toFixed(2)}%</span>
          </div>
        )}
      </div>
      
      {/* Title */}
      <div className="text-[9px] md:text-xs lg:text-sm text-slate-500 dark:text-slate-400 mb-0.5 md:mb-2 font-medium leading-tight">
        {title}
      </div>
      
      {/* Value */}
      <div className="text-sm md:text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white leading-tight">
        {value}
      </div>
      
      {/* P/L Amount (if applicable) */}
      {plData && (
        <div className={`text-[9px] md:text-sm font-medium mt-0.5 md:mt-2 ${plColor} leading-tight`}>
          {isPositive ? '+' : ''}{typeof plData.amount === 'number' 
            ? new Intl.NumberFormat('he-IL', {
                style: 'currency',
                currency: 'ILS',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(plData.amount)
            : plData.amount}
        </div>
      )}
    </div>
  );
};

export default SummaryCard;
