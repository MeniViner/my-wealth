import { useState } from 'react';
import { Plus, Trash2, Settings as SettingsIcon, RefreshCw, DollarSign, Palette, Tag, Database } from 'lucide-react';
import { confirmAlert, successToast } from '../utils/alerts';

const Settings = ({ systemData, setSystemData, currencyRate, user, onResetData }) => {
  const handleAdd = (type, name, color) => {
    if (!name.trim()) return;
    const newList = [...systemData[type], { name: name.trim(), color: color || '#94a3b8' }];
    const updatedData = { ...systemData, [type]: newList };
    setSystemData(updatedData);
    successToast('נוסף בהצלחה', 1500);
  };

  const handleDelete = async (type, name) => {
    const confirmed = await confirmAlert('מחיקה', `למחוק את ${name}?`, 'warning', true);
    if (confirmed) {
      const newList = systemData[type].filter(item => item.name !== name);
      const updatedData = { ...systemData, [type]: newList };
      setSystemData(updatedData);
      await successToast('נמחק בהצלחה', 2000);
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'categories': return <Tag size={20} className="text-purple-600" />;
      case 'platforms': return <Database size={20} className="text-blue-600" />;
      case 'instruments': return <Palette size={20} className="text-emerald-600" />;
      default: return null;
    }
  };

  const getTypeTitle = (type) => {
    switch(type) {
      case 'categories': return 'קטגוריות (ראשי)';
      case 'platforms': return 'פלטפורמות';
      case 'instruments': return 'מכשירים';
      default: return '';
    }
  };

  const ListEditor = ({ type, data, title }) => {
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState('#3b82f6');
    const [isFocused, setIsFocused] = useState(false);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (newName.trim()) {
        handleAdd(type, newName, newColor);
        setNewName('');
        setNewColor('#3b82f6');
      }
    };

    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden transition-all hover:shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            {getTypeIcon(type)}
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          </div>
          <p className="text-sm text-slate-500 mt-1">{data.length} פריטים</p>
        </div>

        {/* Add Form */}
        <div className="p-5 bg-slate-50 border-b border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <input 
                  type="color" 
                  value={newColor} 
                  onChange={e => setNewColor(e.target.value)} 
                  className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-300 hover:border-slate-400 transition shadow-sm"
                  title="בחר צבע"
                />
                <div 
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  style={{ 
                    background: `linear-gradient(45deg, transparent 30%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.1) 70%, transparent 70%)`
                  }}
                />
              </div>
              <input 
                type="text" 
                value={newName} 
                onChange={e => setNewName(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="הזן שם חדש..."
                className={`flex-1 border-2 rounded-lg px-4 py-2.5 text-sm transition-all outline-none ${
                  isFocused 
                    ? 'border-emerald-500 ring-2 ring-emerald-200 bg-white' 
                    : 'border-slate-300 bg-white hover:border-slate-400'
                }`}
              />
              <button 
                type="submit"
                disabled={!newName.trim()}
                className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
              >
                <Plus size={18} />
                הוסף
              </button>
            </div>
          </form>
        </div>

        {/* Items List */}
        <div className="p-4 max-h-80 overflow-y-auto custom-scrollbar">
          {data.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-sm">אין פריטים עדיין</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.map((item, index) => (
                <div 
                  key={item.name} 
                  className="group flex items-center justify-between p-3 bg-white rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:shadow-md transition-all animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div 
                      className="w-5 h-5 rounded-full shadow-sm border-2 border-white flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-700 font-medium text-sm truncate">{item.name}</span>
                  </div>
                  <button 
                    onClick={() => handleDelete(type, item.name)} 
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all flex-shrink-0"
                    title="מחק"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header Section */}
      <header className="bg-gradient-to-r from-slate-50 to-white rounded-2xl p-6 shadow-lg border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-100 p-3 rounded-xl">
              <SettingsIcon className="text-emerald-600" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-800">ניהול הגדרות מערכת</h2>
              <p className="text-slate-500 mt-1 text-sm">נהל קטגוריות, פלטפורמות ומכשירים</p>
            </div>
          </div>
          
          {/* Currency Info Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl px-5 py-3 flex items-center gap-3 shadow-sm">
            <div className="bg-blue-100 p-2 rounded-lg">
              <DollarSign className="text-blue-600" size={20} />
            </div>
            <div>
              <div className="text-xs text-blue-600 font-medium">שער דולר נוכחי</div>
              <div className="text-lg font-bold text-blue-800">₪{currencyRate.rate}</div>
              <div className="text-xs text-blue-500">{currencyRate.date}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Reset Database Button */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-lg">
            <RefreshCw className="text-amber-700" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-amber-900">אתחול מסד נתונים</h3>
            <p className="text-sm text-amber-700">פעולה זו תמחק את כל הנתונים ותטען ברירת מחדל</p>
          </div>
        </div>
        <button 
          onClick={onResetData} 
          className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 whitespace-nowrap"
        >
          <RefreshCw size={20} />
          אתחול מלא
        </button>
      </div>

      {/* Editors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ListEditor type="categories" data={systemData.categories} title={getTypeTitle('categories')} />
        <ListEditor type="platforms" data={systemData.platforms} title={getTypeTitle('platforms')} />
        <ListEditor type="instruments" data={systemData.instruments} title={getTypeTitle('instruments')} />
      </div>
    </div>
  );
};

export default Settings;

