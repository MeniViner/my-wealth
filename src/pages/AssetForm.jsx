import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { callGeminiAI } from '../services/gemini';
import { infoAlert, successToast } from '../utils/alerts';

const AssetForm = ({ onSave, assets = [], systemData }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const editAsset = id ? assets.find(a => a.id === id) : null;

  // Redirect if trying to edit non-existent asset
  useEffect(() => {
    if (id && !editAsset && assets.length > 0) {
      navigate('/assets');
    }
  }, [id, editAsset, assets.length, navigate]);
  const [formData, setFormData] = useState({
    name: '',
    instrument: systemData.instruments[0]?.name || '',
    platform: systemData.platforms[0]?.name || '',
    category: systemData.categories[0]?.name || 'אחר',
    currency: 'ILS',
    originalValue: '',
    tags: ''
  });
  const [tagLoading, setTagLoading] = useState(false);

  useEffect(() => {
    if (editAsset) {
      setFormData({
        name: editAsset.name,
        instrument: editAsset.instrument,
        platform: editAsset.platform,
        category: editAsset.category,
        currency: editAsset.currency || 'ILS',
        originalValue: editAsset.originalValue || editAsset.value,
        tags: editAsset.tags ? editAsset.tags.join(', ') : ''
      });
    } else {
      // Reset form when not editing
      setFormData({
        name: '',
        instrument: systemData.instruments[0]?.name || '',
        platform: systemData.platforms[0]?.name || '',
        category: systemData.categories[0]?.name || 'אחר',
        currency: 'ILS',
        originalValue: '',
        tags: ''
      });
    }
  }, [editAsset, systemData]);

  const handleGenerateTags = async () => {
    if (!formData.name) {
      await infoAlert('שגיאה', 'הזן שם נכס');
      return;
    }
    setTagLoading(true);
    const prompt = `החזר רק רשימת תגיות מופרדת בפסיקים עבור הנכס: ${formData.name}.`;
    const result = await callGeminiAI(prompt);
    setFormData(prev => ({ ...prev, tags: result.replace(/\.$/, '') }));
    setTagLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const assetData = {
      ...formData,
      originalValue: Number(formData.originalValue),
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t)
    };
    const isEdit = !!editAsset;
    if (isEdit) {
      assetData.id = editAsset.id;
    }
    await onSave(assetData);
    
    // הצגת הודעת הצלחה
    if (isEdit) {
      await successToast(`עריכה - ${formData.name} - נשמרה`, 2000);
    }
    
    navigate('/assets');
  };

  const currentColor = (type, val) => systemData[type]?.find(i => i.name === val)?.color;

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <header className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/assets')} 
          className="p-2 hover:bg-slate-200 rounded-full transition"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-3xl font-bold text-slate-800">
          {editAsset ? 'עריכת נכס' : 'הוספת נכס חדש'}
        </h2>
      </header>
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">פלטפורמה</label>
            <div className="flex items-center gap-2 border rounded-lg p-3 bg-white">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: currentColor('platforms', formData.platform) }}
              ></div>
              <select 
                className="w-full outline-none bg-transparent" 
                value={formData.platform} 
                onChange={e => setFormData({...formData, platform: e.target.value})}
              >
                {systemData.platforms.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">מכשיר</label>
            <div className="flex items-center gap-2 border rounded-lg p-3 bg-white">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: currentColor('instruments', formData.instrument) }}
              ></div>
              <select 
                className="w-full outline-none bg-transparent" 
                value={formData.instrument} 
                onChange={e => setFormData({...formData, instrument: e.target.value})}
              >
                {systemData.instruments.map(i => (
                  <option key={i.name} value={i.name}>{i.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">שם הנכס</label>
            <input 
              type="text" 
              required 
              className="w-full p-3 border rounded-lg" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">מטבע</label>
            <select 
              className="w-full p-3 border rounded-lg" 
              value={formData.currency} 
              onChange={e => setFormData({...formData, currency: e.target.value})}
            >
              <option value="ILS">₪ שקל</option>
              <option value="USD">$ דולר</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">שווי מקור</label>
            <input 
              type="number" 
              required 
              className="w-full p-3 border rounded-lg" 
              value={formData.originalValue} 
              onChange={e => setFormData({...formData, originalValue: e.target.value})} 
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">קטגוריה</label>
            <div className="flex gap-2 flex-wrap">
              {systemData.categories.map(cat => (
                <button 
                  type="button" 
                  key={cat.name} 
                  onClick={() => setFormData({...formData, category: cat.name})} 
                  className={`px-4 py-2 rounded-full border flex items-center gap-2 transition
                    ${formData.category === cat.name ? 'bg-slate-800 text-white' : 'bg-white hover:bg-slate-50'}`}
                >
                  <div className="w-2 h-2 rounded-full" style={{backgroundColor: cat.color}}></div>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">תגיות</label>
              <button 
                type="button" 
                onClick={handleGenerateTags} 
                className="text-xs text-purple-600 font-bold flex gap-1 items-center"
              >
                {tagLoading ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} AI צור
              </button>
            </div>
            <input 
              type="text" 
              className="w-full p-3 border rounded-lg" 
              value={formData.tags} 
              onChange={e => setFormData({...formData, tags: e.target.value})} 
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button 
            type="button" 
            onClick={() => navigate('/assets')} 
            className="px-6 py-2 rounded-lg hover:bg-slate-100"
          >
            ביטול
          </button>
          <button type="submit" className="px-6 py-2 bg-slate-900 text-white rounded-lg">
            שמור
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssetForm;

