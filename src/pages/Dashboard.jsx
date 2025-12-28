import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, 
  AreaChart, Area, CartesianGrid, LineChart, Line
} from 'recharts';
import { Cloud } from 'lucide-react';
import CustomTooltip from '../components/CustomTooltip';
import TreemapChart from '../components/TreemapChart';

const Dashboard = ({ assets, systemData, currencyRate }) => {
  // Calculate total wealth
  const totalWealth = useMemo(() => {
    return assets.reduce((sum, item) => sum + item.value, 0);
  }, [assets]);

  // Data aggregations
  const dataByCategory = useMemo(() => {
    const map = {};
    assets.forEach(a => {
      map[a.category] = (map[a.category] || 0) + a.value;
    });
    return Object.keys(map)
      .map(name => ({ name, value: map[name] }))
      .sort((a, b) => b.value - a.value);
  }, [assets]);

  const dataByInstrument = useMemo(() => {
    const map = {};
    assets.forEach(a => {
      map[a.instrument] = (map[a.instrument] || 0) + a.value;
    });
    return Object.keys(map)
      .map(name => ({ name, value: map[name] }))
      .sort((a, b) => b.value - a.value);
  }, [assets]);

  const dataByPlatform = useMemo(() => {
    const map = {};
    assets.forEach(a => {
      map[a.platform] = (map[a.platform] || 0) + a.value;
    });
    return Object.keys(map)
      .map(name => ({ name, value: map[name] }))
      .sort((a, b) => b.value - a.value);
  }, [assets]);

  const dataByCurrency = useMemo(() => {
    const map = {};
    assets.forEach(a => {
      map[a.currency] = (map[a.currency] || 0) + a.value;
    });
    return Object.keys(map)
      .map(name => ({ name, value: map[name] }))
      .sort((a, b) => b.value - a.value);
  }, [assets]);

  const topAssets = useMemo(() => {
    return [...assets]
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map(a => ({ name: a.name, value: a.value, category: a.category }));
  }, [assets]);

  // Prepare treemap data for platforms
  const treemapData = useMemo(() => {
    return dataByPlatform.map(p => ({
      name: p.name,
      size: p.value,
      fill: systemData.platforms.find(sysP => sysP.name === p.name)?.color || '#94a3b8'
    }));
  }, [dataByPlatform, systemData]);

  // Prepare treemap data for assets (by asset name)
  const treemapDataByAssets = useMemo(() => {
    return assets.map(asset => ({
      name: asset.name,
      size: asset.value,
      fill: systemData.categories.find(c => c.name === asset.category)?.color || '#3b82f6',
      category: asset.category,
      platform: asset.platform,
      instrument: asset.instrument
    }));
  }, [assets, systemData]);

  // Prepare pie chart data with percentages
  const pieDataByCategory = useMemo(() => {
    return dataByCategory.map(c => ({
      name: c.name,
      value: c.value,
      percentage: ((c.value / totalWealth) * 100).toFixed(1)
    }));
  }, [dataByCategory, totalWealth]);

  // Prepare area chart data for category distribution
  const areaDataByCategory = useMemo(() => {
    return dataByCategory.map(c => ({
      name: c.name,
      value: c.value,
      percentage: ((c.value / totalWealth) * 100).toFixed(1)
    }));
  }, [dataByCategory, totalWealth]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">דשבורד ראשי</h2>
          <p className="text-slate-500 flex items-center gap-2">
            <Cloud size={14} /> מסונכרן לענן בזמן אמת
          </p>
        </div>
        <div className="text-left hidden md:block">
          <div className="text-sm text-slate-400">שווי נקי</div>
          <div className="text-3xl font-black text-slate-800 font-mono">
            ₪{totalWealth.toLocaleString()}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">פיזור לפי קטגוריות</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieDataByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieDataByCategory.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={systemData.categories.find(c => c.name === entry.name)?.color || '#3b82f6'} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  iconSize={12} 
                  layout="vertical" 
                  verticalAlign="middle" 
                  wrapperStyle={{ right: 0 }}
                  formatter={(value, entry) => `${entry.payload.name}: ${entry.payload.percentage}%`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">איזון תיק לפי קטגוריות</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaDataByCategory} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#areaGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <TreemapChart 
          data={treemapData}
          title="מפת גודל נכסים לפי פלטפורמות (Treemap)"
          height="h-64"
          aspectRatio={4 / 3}
        />

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">במה מושקע הכסף? (Instruments)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataByInstrument} margin={{ bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} height={40} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {dataByInstrument.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={systemData.instruments.find(i => i.name === entry.name)?.color || '#3b82f6'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Large Treemap Section - Full Width */}
      <TreemapChart 
        data={treemapDataByAssets}
        title="מפת נכסים - כל הנכסים"
        height="h-96"
        aspectRatio={16 / 9}
        className="mt-6"
      />

      {/* Additional Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">פיזור לפי מטבעות</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataByCurrency}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ₪${value.toLocaleString()}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dataByCurrency.map((entry, index) => {
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={colors[index % colors.length]} 
                      />
                    );
                  })}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">פיזור לפי פלטפורמות</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataByPlatform} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {dataByPlatform.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={systemData.platforms.find(p => p.name === entry.name)?.color || '#3b82f6'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">10 הנכסים הגדולים ביותר</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topAssets} margin={{ bottom: 40, left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {topAssets.map((entry, index) => {
                    const categoryColor = systemData.categories.find(c => c.name === entry.category)?.color || '#3b82f6';
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={categoryColor} 
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">השוואת קטגוריות</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={areaDataByCategory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

