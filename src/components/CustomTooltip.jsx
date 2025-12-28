/**
 * Custom tooltip component for Recharts
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const name = payload[0].name || label;
    
    return (
      <div className="bg-white p-3 border border-slate-100 shadow-lg rounded-lg text-right" dir="rtl">
        <p className="font-bold text-slate-800 mb-1">{name}</p>
        <p className="text-emerald-600 font-medium">₪{val.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export default CustomTooltip;

