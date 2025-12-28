import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Eye, ArrowUpDown } from 'lucide-react';
import Modal from '../components/Modal';
import { confirmAlert, successToast } from '../utils/alerts';

const AssetManager = ({ assets, onDelete, systemData }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'value', direction: 'desc' });
  const [visibleColumns, setVisibleColumns] = useState({ 
    name: true, 
    instrument: true, 
    platform: true, 
    category: true, 
    tags: true, 
    value: true 
  });
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Filtering
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          asset.instrument.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (asset.tags && asset.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesPlatform = filterPlatform === 'all' || asset.platform === filterPlatform;
    const matchesCategory = filterCategory === 'all' || asset.category === filterCategory;
    return matchesSearch && matchesPlatform && matchesCategory;
  });

  // Sorting
  const sortedAssets = [...filteredAssets].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const formatMoney = (val, curr) => {
    return curr === 'USD' ? `$${val.toLocaleString()}` : `₪${val.toLocaleString()}`;
  };

  const handleEdit = (asset) => {
    navigate(`/assets/edit/${asset.id}`);
  };

  const handleDelete = async (assetId, assetName) => {
    const confirmed = await confirmAlert(
      'מחיקת נכס',
      `האם אתה בטוח שברצונך למחוק את הנכס "${assetName}"?\nפעולה זו אינה ניתנת לביטול.`,
      'warning',
      true // isDelete - כפתור אדום
    );
    if (confirmed) {
      onDelete(assetId);
      await successToast('נמחק בהצלחה', 2000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <header className="flex justify-between items-end mb-6">
        <h2 className="text-3xl font-bold text-slate-800">ניהול נכסים</h2>
        <div className="flex gap-2">
          <div className="relative">
            <button 
              onClick={() => setColMenuOpen(!colMenuOpen)} 
              className="bg-white border px-4 py-3 rounded-lg flex items-center gap-2 hover:bg-slate-50"
            >
              <Eye size={20} /> תצוגה
            </button>
            {colMenuOpen && (
              <div className="absolute top-12 left-0 bg-white border shadow-xl rounded-lg p-4 z-20 w-48 space-y-2">
                {Object.keys(visibleColumns).map(key => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={visibleColumns[key]} 
                      onChange={() => setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }))} 
                    />
                    {key === 'name' ? 'שם' : key === 'value' ? 'שווי' : key}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button 
            onClick={() => navigate('/assets/add')} 
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium hover:bg-emerald-700"
          >
            <Plus size={20} /> הוסף
          </button>
        </div>
      </header>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="חיפוש חופשי..." 
            className="w-full pl-4 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="p-2 border rounded-lg" 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="all">כל הקטגוריות</option>
            {systemData.categories.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
          <select 
            className="p-2 border rounded-lg" 
            value={filterPlatform} 
            onChange={e => setFilterPlatform(e.target.value)}
          >
            <option value="all">כל הפלטפורמות</option>
            {systemData.platforms.map(p => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                {visibleColumns.name && (
                  <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('name')}>
                    שם הנכס <ArrowUpDown size={12} className="inline" />
                  </th>
                )}
                {visibleColumns.instrument && (
                  <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('instrument')}>
                    מכשיר
                  </th>
                )}
                {visibleColumns.platform && (
                  <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('platform')}>
                    פלטפורמה
                  </th>
                )}
                {visibleColumns.category && (
                  <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('category')}>
                    קטגוריה
                  </th>
                )}
                {visibleColumns.tags && <th className="p-4">תגיות</th>}
                {visibleColumns.value && (
                  <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('value')}>
                    שווי <ArrowUpDown size={12} className="inline" />
                  </th>
                )}
                <th className="p-4 text-center">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedAssets.map(asset => (
                <tr 
                  key={asset.id} 
                  className="hover:bg-slate-50 transition cursor-pointer"
                  onClick={() => setSelectedAsset(asset)}
                >
                  {visibleColumns.name && (
                    <td className="p-4 font-bold text-slate-700">{asset.name}</td>
                  )}
                  {visibleColumns.instrument && (
                    <td className="p-4 text-slate-600">{asset.instrument}</td>
                  )}
                  {visibleColumns.platform && (
                    <td className="p-4 text-slate-500">{asset.platform}</td>
                  )}
                  {visibleColumns.category && (
                    <td className="p-4">
                      <span className="bg-slate-100 px-2 py-1 rounded-full text-xs">{asset.category}</span>
                    </td>
                  )}
                  {visibleColumns.tags && (
                    <td className="p-4">
                      <div className="flex gap-1 flex-wrap max-w-[200px]">
                        {asset.tags && asset.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-xs bg-slate-50 border px-1 rounded">{tag}</span>
                        ))}
                      </div>
                    </td>
                  )}
                  {visibleColumns.value && (
                    <td className="p-4">
                      <div className="font-bold">₪{asset.value.toLocaleString()}</div>
                      <div className="text-xs text-slate-400" dir="ltr">
                        {asset.currency === 'USD' ? '$' : '₪'}{asset.originalValue.toLocaleString()}
                      </div>
                    </td>
                  )}
                  <td className="p-4 flex justify-center gap-2" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => handleEdit(asset)} 
                      className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-500 rounded-full"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(asset.id, asset.name)} 
                      className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!selectedAsset} onClose={() => setSelectedAsset(null)} title={selectedAsset?.name}>
        {selectedAsset && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl">
                <div className="text-sm text-slate-500">שווי בשקלים</div>
                <div className="text-2xl font-bold text-slate-800">₪{selectedAsset.value.toLocaleString()}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl">
                <div className="text-sm text-slate-500">שווי מקור</div>
                <div className="text-2xl font-bold text-slate-800" dir="ltr">
                  {formatMoney(selectedAsset.originalValue, selectedAsset.currency)}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex border-b border-slate-100 pb-2">
                <span className="w-1/3 text-slate-500">פלטפורמה</span>
                <span className="font-medium text-slate-800">{selectedAsset.platform}</span>
              </div>
              <div className="flex border-b border-slate-100 pb-2">
                <span className="w-1/3 text-slate-500">מכשיר</span>
                <span className="font-medium text-slate-800">{selectedAsset.instrument}</span>
              </div>
              <div className="flex border-b border-slate-100 pb-2">
                <span className="w-1/3 text-slate-500">קטגוריה</span>
                <span className="font-medium text-slate-800">{selectedAsset.category}</span>
              </div>
            </div>

            <div>
              <div className="text-sm text-slate-500 mb-2">תגיות משויכות</div>
              <div className="flex flex-wrap gap-2">
                {selectedAsset.tags && selectedAsset.tags.map((tag, i) => (
                  <span key={i} className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium border border-purple-100">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button 
                onClick={() => { handleEdit(selectedAsset); setSelectedAsset(null); }} 
                className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800"
              >
                <Edit2 size={16} /> ערוך נכס
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AssetManager;

