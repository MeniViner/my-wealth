import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Sparkles, Loader2, Plus, ArrowRight } from 'lucide-react';
import { callGeminiAI } from '../services/gemini';
import { infoAlert, successToast } from '../utils/alerts';
import { generateRandomColor } from '../constants/defaults';
import TickerSearch from '../components/TickerSearch';
import CustomSelect from '../components/CustomSelect';

const AssetForm = ({ onSave, assets = [], systemData, setSystemData, portfolioContext = "" }) => {
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
    symbol: '',
    apiId: '', // API ID for price fetching (e.g., "bitcoin" for CoinGecko)
    marketDataSource: '', // "coingecko" | "yahoo" | "manual"
    instrument: systemData.instruments[0]?.name || '',
    platform: systemData.platforms[0]?.name || '',
    category: systemData.categories[0]?.name || 'אחר',
    currency: 'ILS',
    originalValue: '',
    tags: ''
  });
  const [tagLoading, setTagLoading] = useState(false);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [showNewSymbol, setShowNewSymbol] = useState(false);
  const [newSymbolValue, setNewSymbolValue] = useState('');
  const [showNewPlatform, setShowNewPlatform] = useState(false);
  const [newPlatformValue, setNewPlatformValue] = useState('');
  const [showNewInstrument, setShowNewInstrument] = useState(false);
  const [newInstrumentValue, setNewInstrumentValue] = useState('');

  // Handle adding new symbol
  const handleAddSymbol = () => {
    if (!newSymbolValue.trim()) return;
    const trimmedValue = newSymbolValue.trim().toUpperCase();
    const exists = systemData.symbols?.some(s => {
      const symbolName = typeof s === 'string' ? s : s.name;
      return symbolName === trimmedValue;
    });
    if (exists) {
      infoAlert('שגיאה', 'הסמל כבר קיים');
      return;
    }
    const newSymbol = { name: trimmedValue, color: generateRandomColor() };
    const updatedSymbols = [...(systemData.symbols || []), newSymbol];
    setSystemData({ ...systemData, symbols: updatedSymbols });
    setFormData({ ...formData, symbol: trimmedValue });
    setNewSymbolValue('');
    setShowNewSymbol(false);
    successToast('סמל נוסף בהצלחה', 1500);
  };

  // Handle adding new platform
  const handleAddPlatform = () => {
    if (!newPlatformValue.trim()) return;
    const trimmedValue = newPlatformValue.trim();
    if (systemData.platforms.find(p => p.name === trimmedValue)) {
      infoAlert('שגיאה', 'חשבון או ארנק זה כבר קיים');
      return;
    }
    const newPlatform = { name: trimmedValue, color: generateRandomColor() };
    const updatedPlatforms = [...systemData.platforms, newPlatform];
    setSystemData({ ...systemData, platforms: updatedPlatforms });
    setFormData({ ...formData, platform: trimmedValue });
    setNewPlatformValue('');
    setShowNewPlatform(false);
    successToast('חשבון או ארנק נוסף בהצלחה', 1500);
  };

  // Handle adding new instrument
  const handleAddInstrument = () => {
    if (!newInstrumentValue.trim()) return;
    const trimmedValue = newInstrumentValue.trim();
    if (systemData.instruments.find(i => i.name === trimmedValue)) {
      infoAlert('שגיאה', 'מטבע בסיס זה כבר קיים');
      return;
    }
    const newInstrument = { name: trimmedValue, color: generateRandomColor() };
    const updatedInstruments = [...systemData.instruments, newInstrument];
    setSystemData({ ...systemData, instruments: updatedInstruments });
    setFormData({ ...formData, instrument: trimmedValue });
    setNewInstrumentValue('');
    setShowNewInstrument(false);
    successToast('מטבע בסיס נוסף בהצלחה', 1500);
  };

  useEffect(() => {
    if (editAsset) {
      setFormData({
        name: editAsset.name,
        symbol: editAsset.symbol || '',
        apiId: editAsset.apiId || '',
        marketDataSource: editAsset.marketDataSource || '',
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
        symbol: '',
        apiId: '',
        marketDataSource: '',
        instrument: systemData.instruments[0]?.name || '',
        platform: systemData.platforms[0]?.name || '',
        category: systemData.categories[0]?.name || 'אחר',
        currency: 'ILS',
        originalValue: '',
        tags: ''
      });
    }
  }, [editAsset, systemData]);

  // Reset API data when category changes to non-searchable type
  useEffect(() => {
    if (formData.category !== 'מניות' && formData.category !== 'קריפטו') {
      if (formData.apiId || formData.marketDataSource) {
        setFormData(prev => ({
          ...prev,
          apiId: '',
          marketDataSource: ''
        }));
      }
    }
  }, [formData.category]);

  // Smart AI Suggest - suggests category, symbol, and tags based on portfolio patterns
  const handleAISuggest = async () => {
    if (!formData.name) {
      await infoAlert('שגיאה', 'הזן שם נכס');
      return;
    }
    setAiSuggestLoading(true);
    const prompt = `תבסס על דפוסי הפורטפוליו הנוכחי שלי (מצורף בהקשר) וידע פיננסי כללי, הצע metadata עבור הנכס החדש: "${formData.name}".

החזר תשובה בפורמט JSON בלבד (ללא טקסט נוסף) עם השדות הבאים:
1. "symbol" - סמל או מזהה סטנדרטי של הנכס. דוגמאות: 'Apple Stock' -> 'AAPL', 'S&P 500 Fund' -> 'SPX', 'Bitcoin' -> 'BTC', 'Tesla' -> 'TSLA'. אם לא ידוע, השתמש בשם קצר ותיאורי (עד 10 תווים).
2. "category" - קטגוריה מהרשימה: מניות, קריפטו, מזומן, נדלן, אחר
3. "tags" - רשימת תגיות מופרדת בפסיקים (מחרוזת אחת). חשוב: אם יש דפוסים בפורטפוליו (למשל, כל המניות האמריקאיות מסומנות כ-"Wall St"), השתמש באותם דפוסים.

החזר רק JSON, ללא הסברים נוספים. דוגמה: {"symbol": "TSLA", "category": "מניות", "tags": "מניות, טכנולוגיה, ארה\"ב, Wall St"}`;
    try {
      const result = await callGeminiAI(prompt, portfolioContext);
      // Try to parse JSON response
      let parsed;
      try {
        parsed = JSON.parse(result);
      } catch {
        // If not JSON, try to extract JSON from the response
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: treat as error
          await infoAlert('שגיאה', 'לא ניתן לפרש את תשובת ה-AI');
          setAiSuggestLoading(false);
          return;
        }
      }
      setFormData(prev => {
        const newCategory = parsed.category || prev.category;
        // Reset apiId and marketDataSource if category changed to non-searchable type
        const shouldResetApiData = newCategory !== 'מניות' && newCategory !== 'קריפטו';
        return {
          ...prev, 
          symbol: parsed.symbol || prev.symbol,
          category: newCategory,
          tags: parsed.tags ? parsed.tags.replace(/\.$/, '') : prev.tags,
          // Reset API data if category doesn't support smart search
          ...(shouldResetApiData && { apiId: '', marketDataSource: '' })
        };
      });
      await successToast('הצעות AI הוחלו בהצלחה', 2000);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      await infoAlert('שגיאה', 'אירעה שגיאה ביצירת הצעות AI');
    }
    setAiSuggestLoading(false);
  };

  const handleGenerateTags = async () => {
    if (!formData.name) {
      await infoAlert('שגיאה', 'הזן שם נכס');
      return;
    }
    setTagLoading(true);
    const prompt = `עבור הנכס: "${formData.name}", החזר תשובה בפורמט JSON בלבד (ללא טקסט נוסף) עם שני שדות:
1. "tags" - רשימת תגיות מופרדת בפסיקים (מחרוזת אחת)
2. "symbol" - סמל או מזהה סטנדרטי של הנכס. דוגמאות: 'Apple Stock' -> 'AAPL', 'S&P 500 Fund' -> 'SPX', 'Bitcoin' -> 'BTC', 'תעודת סל נאסד"ק' -> 'QQQ'. אם לא ידוע, השתמש בשם קצר ותיאורי (עד 10 תווים).

החזר רק JSON, ללא הסברים נוספים. דוגמה: {"tags": "מניות, טכנולוגיה, ארה\"ב", "symbol": "AAPL"}`;
    try {
      const result = await callGeminiAI(prompt, portfolioContext);
      // Try to parse JSON response
      let parsed;
      try {
        parsed = JSON.parse(result);
      } catch {
        // If not JSON, try to extract JSON from the response
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: treat as tags only
          parsed = { tags: result.replace(/\.$/, ''), symbol: '' };
        }
      }
      setFormData(prev => ({ 
        ...prev, 
        tags: parsed.tags ? parsed.tags.replace(/\.$/, '') : prev.tags,
        symbol: parsed.symbol || prev.symbol
      }));
    } catch (error) {
      console.error('Error parsing AI response:', error);
      // Fallback to original behavior
      const promptFallback = `החזר רק רשימת תגיות מופרדת בפסיקים עבור הנכס: ${formData.name}.`;
      const result = await callGeminiAI(promptFallback, portfolioContext);
      setFormData(prev => ({ ...prev, tags: result.replace(/\.$/, '') }));
    }
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

  const currentColor = (type, val) => {
    if (!val) return '#94a3b8';
    const item = systemData[type]?.find(i => {
      if (type === 'symbols') {
        const itemName = typeof i === 'string' ? i : i.name;
        return itemName === val;
      }
      return i.name === val;
    });
    if (type === 'symbols' && item) {
      return typeof item === 'string' ? '#94a3b8' : item.color;
    }
    return item?.color || '#94a3b8';
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <header className="flex items-center gap-4 mb-8 mr-12 md:mr-0">
        <button 
          onClick={() => navigate('/assets')} 
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition"
        >
          <ArrowRight size={24} className="text-slate-800 dark:text-slate-200" />
        </button>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">
          {editAsset ? 'עריכת נכס' : 'הוספת נכס חדש'}
        </h2>
      </header>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">חשבונות וארנקים</label>
            {!showNewPlatform ? (
              <CustomSelect
                value={formData.platform}
                onChange={(val) => {
                  if (val === '__NEW__') {
                    setShowNewPlatform(true);
                  } else {
                    setFormData({...formData, platform: val});
                  }
                }}
                options={[
                  ...systemData.platforms.map(p => ({
                    value: p.name,
                    label: p.name,
                    iconColor: p.color
                  })),
                  { value: '__NEW__', label: 'הוסף חדש' }
                ]}
                placeholder="בחר חשבונות וארנקים"
                iconColor={currentColor('platforms', formData.platform)}
              />
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newPlatformValue}
                  onChange={e => setNewPlatformValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddPlatform();
                    } else if (e.key === 'Escape') {
                      setShowNewPlatform(false);
                      setNewPlatformValue('');
                    }
                  }}
                  placeholder="הזן שם חשבון או ארנק חדש"
                  className="flex-1 p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddPlatform}
                  className="px-4 py-3 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 flex items-center gap-2"
                >
                  הוסף
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewPlatform(false);
                    setNewPlatformValue('');
                  }}
                  className="px-4 py-3 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500"
                >
                  ביטול
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">מטבעות בסיס</label>
            {!showNewInstrument ? (
              <CustomSelect
                value={formData.instrument}
                onChange={(val) => {
                  if (val === '__NEW__') {
                    setShowNewInstrument(true);
                  } else {
                    setFormData({...formData, instrument: val});
                  }
                }}
                options={[
                  ...systemData.instruments.map(i => ({
                    value: i.name,
                    label: i.name,
                    iconColor: i.color
                  })),
                  { value: '__NEW__', label: 'הוסף חדש' }
                ]}
                placeholder="בחר מטבע בסיס"
                iconColor={currentColor('instruments', formData.instrument)}
              />
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newInstrumentValue}
                  onChange={e => setNewInstrumentValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddInstrument();
                    } else if (e.key === 'Escape') {
                      setShowNewInstrument(false);
                      setNewInstrumentValue('');
                    }
                  }}
                  placeholder="הזן שם מטבע בסיס חדש"
                  className="flex-1 p-3 border rounded-lg"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddInstrument}
                  className="px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                >
                  הוסף
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewInstrument(false);
                    setNewInstrumentValue('');
                  }}
                  className="px-4 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                >
                  ביטול
                </button>
              </div>
            )}
          </div>
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">שם הנכס</label>
            </div>
            <input 
              type="text" 
              required 
              className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">סמל נכס / Ticker</label>
            {(formData.category === 'מניות' || formData.category === 'קריפטו') ? (
              // Smart Ticker Search with Category Selector
              <TickerSearch
                type={formData.category === 'קריפטו' ? 'crypto' : 'us-stock'} // Default type (will be overridden by selector)
                value={formData.symbol}
                onSelect={(asset) => {
                  if (asset) {
                    setFormData({
                      ...formData,
                      symbol: asset.symbol,
                      apiId: asset.id,
                      marketDataSource: asset.marketDataSource || 'yahoo'
                    });
                  } else {
                    setFormData({
                      ...formData,
                      symbol: '',
                      apiId: '',
                      marketDataSource: ''
                    });
                  }
                }}
                allowManual={true}
                showCategorySelector={true}
              />
            ) : (
              // Manual input for Cash, Real Estate, and Other categories
              <>
                {!showNewSymbol ? (
                  <div className="space-y-2">
                    <CustomSelect
                      value={formData.symbol || ''}
                      onChange={(val) => {
                        if (val === '__NEW__') {
                          setShowNewSymbol(true);
                        } else {
                          setFormData({...formData, symbol: val});
                        }
                      }}
                      options={[
                        { value: '', label: '-- בחר סמל --' },
                        ...(systemData.symbols && systemData.symbols.length > 0 
                          ? systemData.symbols.map(s => {
                              const symbolName = typeof s === 'string' ? s : s.name;
                              const symbolColor = typeof s === 'string' ? '#94a3b8' : s.color;
                              return {
                                value: symbolName,
                                label: symbolName,
                                iconColor: symbolColor
                              };
                            })
                          : []
                        ),
                        { value: '__NEW__', label: 'הוסף סמל חדש' }
                      ]}
                      placeholder="-- בחר סמל --"
                      iconColor={currentColor('symbols', formData.symbol)}
                    />
                    <input
                      type="text"
                      className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                      placeholder="או הזן סמל ידנית"
                      value={formData.symbol}
                      onChange={e => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                      dir="ltr"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSymbolValue}
                      onChange={e => setNewSymbolValue(e.target.value.toUpperCase())}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSymbol();
                        } else if (e.key === 'Escape') {
                          setShowNewSymbol(false);
                          setNewSymbolValue('');
                        }
                      }}
                      placeholder="הזן סמל חדש"
                      className="flex-1 p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                      autoFocus
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={handleAddSymbol}
                      className="px-4 py-3 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 flex items-center gap-2"
                    >
                      הוסף
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewSymbol(false);
                        setNewSymbolValue('');
                      }}
                      className="px-4 py-3 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500"
                    >
                      ביטול
                    </button>
                  </div>
                )}
              </>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1" dir="rtl">
              {formData.category === 'מניות' || formData.category === 'קריפטו' 
                ? 'חיפוש חכם - נבחר אוטומטית מהמאגר הרשמי' 
                : 'מזהה סטנדרטי לזיהוי נכסים זהים על פני פלטפורמות שונות'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">מטבע</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({...formData, currency: 'ILS'})}
                className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all font-medium ${
                  formData.currency === 'ILS'
                    ? 'bg-emerald-600 dark:bg-emerald-500 text-white border-emerald-600 dark:border-emerald-500 shadow-md'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500'
                }`}
              >
                <span className="text-2xl mb-1 block">₪</span>
                <span className="text-sm">שקל ישראלי</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, currency: 'USD'})}
                className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all font-medium ${
                  formData.currency === 'USD'
                    ? 'bg-emerald-600 dark:bg-emerald-500 text-white border-emerald-600 dark:border-emerald-500 shadow-md'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500'
                }`}
              >
                <span className="text-2xl mb-1 block">$</span>
                <span className="text-sm">דולר אמריקאי</span>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">שווי מקור</label>
            <input 
              type="number" 
              required 
              className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
              value={formData.originalValue} 
              onChange={e => setFormData({...formData, originalValue: e.target.value})} 
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">אפיקי השקעה</label>
            <div className="flex gap-2 flex-wrap">
              {systemData.categories.map(cat => (
                <button 
                  type="button" 
                  key={cat.name} 
                  onClick={() => setFormData({...formData, category: cat.name})} 
                  className={`px-4 py-2 rounded-full border flex items-center gap-2 transition
                    ${formData.category === cat.name ? 'bg-slate-800 dark:bg-slate-700 text-white' : 'bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100'}`}
                >
                  <div className="w-2 h-2 rounded-full" style={{backgroundColor: cat.color}}></div>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">תגיות</label>
              <button 
                type="button" 
                onClick={handleGenerateTags} 
                className="text-xs text-purple-600 dark:text-purple-400 font-bold flex gap-1 items-center"
              >
                {tagLoading ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>}    צור עם AI
              </button>
            </div>
            <input 
              type="text" 
              className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
              value={formData.tags} 
              onChange={e => setFormData({...formData, tags: e.target.value})} 
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button 
            type="button" 
            onClick={() => navigate('/assets')} 
            className="px-6 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
          >
            ביטול
          </button>
          <button type="submit" className="px-6 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600">
            שמור
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssetForm;

