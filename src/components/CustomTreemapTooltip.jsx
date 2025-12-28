/**
 * Custom tooltip component for Treemap
 */
const CustomTreemapTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const name = data.name || '';
    const value = data.size || data.value || 0;
    const category = data.category || '';
    const platform = data.platform || '';
    
    return (
      <div className="bg-white p-4 border border-slate-200 shadow-xl rounded-lg text-right" dir="rtl">
        <p className="font-bold text-slate-800 mb-2 text-lg">{name}</p>
        <p className="text-emerald-600 font-semibold text-xl mb-2">₪{value.toLocaleString()}</p>
        {category && (
          <p className="text-sm text-slate-600 mb-1">
            <span className="font-medium">קטגוריה:</span> {category}
          </p>
        )}
        {platform && (
          <p className="text-sm text-slate-600">
            <span className="font-medium">פלטפורמה:</span> {platform}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default CustomTreemapTooltip;






