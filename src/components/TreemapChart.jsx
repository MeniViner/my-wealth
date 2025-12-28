import { Treemap, Tooltip, ResponsiveContainer } from 'recharts';
import CustomTreemapContent from './CustomTreemapContent';
import CustomTreemapTooltip from './CustomTreemapTooltip';

/**
 * Reusable Treemap Chart Component
 */
const TreemapChart = ({ 
  data, 
  title, 
  height = 'h-64', 
  aspectRatio = 4 / 3,
  className = ''
}) => {
  return (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 ${className}`}>
      {title && (
        <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>
      )}
      <div className={`${height} bg-slate-100 rounded-lg p-2`}>
        <ResponsiveContainer width="100%" height="100%">
          <Treemap 
            data={data} 
            dataKey="size" 
            aspectRatio={aspectRatio} 
            stroke="#fff" 
            strokeWidth={1}
            content={<CustomTreemapContent />}
          >
            <Tooltip content={<CustomTreemapTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TreemapChart;






