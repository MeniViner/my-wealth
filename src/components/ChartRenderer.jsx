import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  RadialBarChart, RadialBar, Treemap
} from 'recharts';
import CustomTooltip from './CustomTooltip';
import CustomTreemapContent from './CustomTreemapContent';
import CustomTreemapTooltip from './CustomTreemapTooltip';
import { getColorForItem } from '../utils/chartUtils';

/**
 * Render a chart based on configuration
 * @param {Object} config - Chart configuration
 * @param {Array} chartData - Aggregated chart data
 * @param {Object} systemData - System data for colors
 * @param {number} totalValue - Total value for percentage calculations
 */
const ChartRenderer = ({ config, chartData, systemData, totalValue }) => {
  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-slate-400">
        אין נתונים להצגה
      </div>
    );
  }

  switch (config.chartType) {
    case 'PieChart':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => 
                `${name}: ${((value / totalValue) * 100).toFixed(1)}%`
              }
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getColorForItem(entry.name, config.dataKey, systemData)} 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              iconSize={12} 
              layout="vertical" 
              verticalAlign="middle" 
              wrapperStyle={{ right: 0 }}
              formatter={(value, entry) => `${entry.payload.name}: ${((entry.payload.value / totalValue) * 100).toFixed(1)}%`}
            />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'BarChart':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ bottom: 20 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} height={40} />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getColorForItem(entry.name, config.dataKey, systemData)} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );

    case 'HorizontalBarChart':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getColorForItem(entry.name, config.dataKey, systemData)} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );

    case 'RadarChart':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis angle={90} domain={[0, 'auto']} tick={{ fontSize: 10 }} />
            <Radar 
              name="ערך" 
              dataKey="value" 
              stroke="#3b82f6" 
              fill="#3b82f6" 
              fillOpacity={0.6} 
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      );

    case 'RadialBar':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart 
            cx="50%" 
            cy="50%" 
            innerRadius="20%" 
            outerRadius="80%" 
            data={chartData.slice(0, 10)} 
            startAngle={90} 
            endAngle={-270}
          >
            <RadialBar 
              minAngle={15} 
              label={{ position: 'insideStart', fill: '#fff' }} 
              background 
              dataKey="value"
            >
              {chartData.slice(0, 10).map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getColorForItem(entry.name, config.dataKey, systemData)} 
                />
              ))}
            </RadialBar>
            <Legend 
              iconSize={10} 
              layout="vertical" 
              verticalAlign="middle" 
              wrapperStyle={{ right: 0 }}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadialBarChart>
        </ResponsiveContainer>
      );

    case 'Treemap':
      const treemapData = chartData.map(item => ({
        name: item.name,
        size: item.value,
        fill: getColorForItem(item.name, config.dataKey, systemData)
      }));
      return (
        <ResponsiveContainer width="100%" height="100%">
          <Treemap 
            data={treemapData} 
            dataKey="size" 
            aspectRatio={4 / 3} 
            stroke="#fff" 
            strokeWidth={1}
            content={<CustomTreemapContent />}
          >
            <Tooltip content={<CustomTreemapTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      );

    default:
      return <div className="h-80 flex items-center justify-center text-slate-400">סוג גרף לא נתמך</div>;
  }
};

export default ChartRenderer;

