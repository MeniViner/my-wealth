import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAssets } from '../hooks/useAssets';
import { useCurrency } from '../hooks/useCurrency';
import { useSystemData } from '../hooks/useSystemData';
import { saveChartConfig, subscribeToChartConfigs, deleteChartConfig, updateChartOrders } from '../services/chartService';
import { aggregateData, getColorForItem, translateTag } from '../utils/chartUtils';
import ChartRenderer from '../components/ChartRenderer';
import { successAlert, errorAlert, confirmAlert, successToast } from '../utils/alerts';
import CustomSelect from '../components/CustomSelect';
import { generatePortfolioContext } from '../utils/aiContext';
import { callGeminiAI } from '../services/gemini';
import { Save, BarChart3, Filter, X, Eye, PieChart, BarChart, BarChart2, Radar, Gauge, LayoutGrid, Plus, Trash2, ArrowUp, ArrowDown, Monitor, Smartphone, Edit2, Check, AreaChart, LineChart, TrendingUp, Grid, Settings, Sparkles, Loader2, ChevronDown, ChevronUp, LucideBarChartHorizontal } from 'lucide-react';

const ChartBuilder = () => {
  const { user } = useAuth();
  const { currencyRate } = useCurrency(user);
  const { assets } = useAssets(user, currencyRate.rate);
  const { systemData } = useSystemData(user);

  const [config, setConfig] = useState({
    title: '',
    chartType: 'PieChart',
    dataKey: 'category',
    aggregationType: 'sum',
    isVisible: true,
    order: 1,
    size: 'medium',
    showGrid: true,
    filters: {
      category: '',
      platform: '',
      instrument: '',
      currency: '',
      tags: []
    }
  });

  const [saving, setSaving] = useState(false);
  const [charts, setCharts] = useState([]);
  const [editingChart, setEditingChart] = useState(null);
  const [editChartName, setEditChartName] = useState('');
  const [editingChartId, setEditingChartId] = useState(null); // For editing chart in create tab
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'manage'
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // Mobile drawer state
  const [isEditingTitle, setIsEditingTitle] = useState(false); // For inline title editing
  const [aiSuggestions, setAiSuggestions] = useState([]); // AI chart suggestions
  const [loadingSuggestions, setLoadingSuggestions] = useState(false); // Loading state for suggestions
  const [customPrompt, setCustomPrompt] = useState(''); // Custom prompt for chart creation
  const [loadingCustomChart, setLoadingCustomChart] = useState(false); // Loading state for custom chart
  const [isAiSectionOpen, setIsAiSectionOpen] = useState(false); // AI section collapsed state (default: open)

  // Translation functions for chart types and data keys
  const translateChartType = (chartType) => {
    const translations = {
      'PieChart': 'גרף עוגה',
      'BarChart': 'גרף עמודות',
      'StackedBarChart': 'עמודות מוערמות',
      'HorizontalBarChart': 'גרף אופקי',
      'AreaChart': 'גרף אזור',
      'LineChart': 'גרף קו',
      'ComposedChart': 'גרף משולב',
      'RadarChart': 'גרף רדאר',
      'RadialBar': 'גרף רדיאלי',
      'Treemap': 'מפת עץ'
    };
    return translations[chartType] || chartType;
  };

  const translateDataKey = (dataKey) => {
    const translations = {
      'category': 'אפיקי השקעה',
      'platform': 'חשבונות וארנקים',
      'instrument': 'מטבעות בסיס',
      'symbol': 'סמל נכס',
      'tags': 'תגיות נכסים',
      'currency': 'מטבע נכס'
    };
    return translations[dataKey] || dataKey;
  };

  // Get unique values for filter dropdowns
  const uniqueCategories = useMemo(() => {
    return [...new Set(assets.map(a => a.category))].filter(Boolean);
  }, [assets]);

  const uniquePlatforms = useMemo(() => {
    return [...new Set(assets.map(a => a.platform))].filter(Boolean);
  }, [assets]);

  const uniqueInstruments = useMemo(() => {
    return [...new Set(assets.map(a => a.instrument))].filter(Boolean);
  }, [assets]);

  const uniqueCurrencies = useMemo(() => {
    return [...new Set(assets.map(a => a.currency))].filter(Boolean);
  }, [assets]);

  const allTags = useMemo(() => {
    const tagSet = new Set();
    assets.forEach(a => {
      if (a.tags && Array.isArray(a.tags)) {
        a.tags.forEach(tag => {
          const translatedTag = translateTag(tag);
          tagSet.add(translatedTag);
        });
      }
    });
    return Array.from(tagSet);
  }, [assets]);

  // Helper function to get color for chart items
  const getColorForItem = (name, dataKey, systemData) => {
    if (dataKey === 'category') {
      return systemData.categories.find(c => c.name === name)?.color || '#3b82f6';
    }
    if (dataKey === 'platform') {
      return systemData.platforms.find(p => p.name === name)?.color || '#10b981';
    }
    if (dataKey === 'instrument') {
      return systemData.instruments.find(i => i.name === name)?.color || '#f59e0b';
    }
    if (dataKey === 'symbol') {
      const symbol = systemData.symbols?.find(s => {
        const symbolName = typeof s === 'string' ? s : s.name;
        return symbolName === name;
      });
      if (symbol) {
        return typeof symbol === 'string' ? '#94a3b8' : symbol.color;
      }
    }
    // Default colors for other groupings
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#14b8a6'];
    return colors[Math.abs(name.charCodeAt(0)) % colors.length];
  };

  // Helper function to get chart data for a chart config
  const getChartDataForConfig = (chartConfig) => {
    const aggregated = aggregateData(assets, chartConfig.dataKey, chartConfig.filters || {});
    
    if (chartConfig.chartType === 'Treemap') {
      return aggregated.map(item => ({
        name: item.name,
        size: item.value,
        fill: getColorForItem(item.name, chartConfig.dataKey, systemData)
      }));
    }
    return aggregated;
  };

  // Aggregate data based on current config
  const aggregatedData = useMemo(() => {
    return aggregateData(assets, config.dataKey, config.filters);
  }, [assets, config.dataKey, config.filters]);

  // Prepare data for different chart types
  const chartData = useMemo(() => {
    if (config.chartType === 'Treemap') {
      return aggregatedData.map(item => ({
        name: item.name,
        size: item.value,
        fill: getColorForItem(item.name, config.dataKey, systemData)
      }));
    }
    return aggregatedData;
  }, [aggregatedData, config.chartType, config.dataKey, systemData]);

  const handleSave = async () => {
    if (!config.title.trim()) {
      await errorAlert('שגיאה', 'אנא הזן כותרת לגרף');
      return;
    }

    if (aggregatedData.length === 0) {
      await errorAlert('שגיאה', 'אין נתונים להצגה. נסה לשנות את הפילטרים או את מקור הנתונים.');
      return;
    }

    setSaving(true);
    try {
      if (editingChartId) {
        // Update existing chart
        await saveChartConfig(user, {
          ...config,
          id: editingChartId
        });
        await successAlert('הצלחה', 'הגרף עודכן בהצלחה!');
        setEditingChartId(null);
      } else {
        // Create new chart
        await saveChartConfig(user, config);
        await successAlert('הצלחה', 'הגרף נשמר בהצלחה!');
      }
      
      // Reset form
      setConfig({
        title: '',
        chartType: 'PieChart',
        dataKey: 'category',
        aggregationType: 'sum',
        isVisible: true,
        order: 1,
        size: 'medium',
        showGrid: true,
        filters: {
          category: '',
          platform: '',
          instrument: '',
          currency: '',
          tags: []
        }
      });

      // Switch to manage tab after successful save
      setActiveTab('manage');
    } catch (error) {
      console.error('Error saving chart config:', error);
      await errorAlert('שגיאה', 'אירעה שגיאה בשמירת הגרף');
    } finally {
      setSaving(false);
    }
  };

  const handleEditChart = (chart) => {
    // Load chart data into config
    setConfig({
      title: chart.title || '',
      chartType: chart.chartType || 'PieChart',
      dataKey: chart.dataKey || 'category',
      aggregationType: chart.aggregationType || 'sum',
      isVisible: chart.isVisible !== false,
      order: chart.order || 1,
      size: chart.size || 'medium',
      showGrid: chart.showGrid !== false,
      filters: {
        category: chart.filters?.category || '',
        platform: chart.filters?.platform || '',
        instrument: chart.filters?.instrument || '',
        currency: chart.filters?.currency || '',
        tags: chart.filters?.tags || []
      }
    });
    setEditingChartId(chart.id);
    setActiveTab('create');
  };

  // Calculate total value for percentage calculations
  const totalValue = useMemo(() => {
    return aggregatedData.reduce((sum, item) => sum + item.value, 0);
  }, [aggregatedData]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.values(config.filters).some(val => val !== '' && (Array.isArray(val) ? val.length > 0 : true));
  }, [config.filters]);

  const clearFilters = () => {
    setConfig(prev => ({
      ...prev,
      filters: {
        category: '',
        platform: '',
        instrument: '',
        currency: '',
        tags: []
      }
    }));
  };

  // Subscribe to chart configurations
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = subscribeToChartConfigs(user, (configs) => {
      const sortedCharts = configs.sort((a, b) => (a.order || 0) - (b.order || 0));
      setCharts(sortedCharts);
    });

    return () => unsubscribe();
  }, [user]);

  // Generate AI suggestions for charts
  const generateAiSuggestions = async () => {
    if (assets.length === 0) {
      await errorAlert('שגיאה', 'אין נכסים בתיק ליצירת הצעות');
      return;
    }

    setLoadingSuggestions(true);
    try {
      const portfolioContext = generatePortfolioContext(assets);
      
      // Get available options for the AI
      const availableChartTypes = ['PieChart', 'BarChart', 'HorizontalBarChart', 'RadialBar', 'Treemap', 'RadarChart', 'AreaChart', 'LineChart', 'ComposedChart'];
      const availableDataKeys = ['category', 'platform', 'instrument', 'symbol', 'tags', 'currency'];
      const availableCategories = uniqueCategories;
      const availablePlatforms = uniquePlatforms;
      const availableInstruments = uniqueInstruments;
      const availableCurrencies = uniqueCurrencies;

      const prompt = `אתה עוזר ליצירת גרפים עבור תיק השקעות.

${portfolioContext}

זמינים לך:
- סוגי גרפים: ${availableChartTypes.join(', ')}
- קיבוץ לפי: ${availableDataKeys.join(', ')}
- קטגוריות: ${availableCategories.join(', ') || 'אין'}
- פלטפורמות: ${availablePlatforms.join(', ') || 'אין'}
- מטבעות בסיס: ${availableInstruments.join(', ') || 'אין'}
- מטבעות: ${availableCurrencies.join(', ') || 'אין'}

צור 3 הצעות שונות ומעניינות לגרפים שיעזרו למשתמש להבין את התיק שלו.
כל הצעה צריכה להיות שונה ומציגה זווית אחרת של התיק.

החזר JSON בלבד בפורמט הבא (ללא טקסט נוסף):
{
  "suggestions": [
    {
      "title": "שם הגרף בעברית",
      "chartType": "PieChart",
      "dataKey": "category",
      "aggregationType": "sum",
      "filters": {
        "category": "",
        "platform": "",
        "instrument": "",
        "currency": "",
        "tags": []
      },
      "size": "medium",
      "showGrid": true
    }
  ]
}

חשוב:
- השם צריך להיות בעברית ותיאורי
- בחר סוג גרף שמתאים לנתונים
- בחר dataKey שמתאים לניתוח
- השתמש בפילטרים רק אם זה מוסיף ערך
- ודא שהגרף יציג נתונים מעניינים`;

      const response = await callGeminiAI(prompt, portfolioContext);
      
      // Try to extract JSON from response
      let jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Try to find JSON in code blocks
        jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          jsonMatch = [jsonMatch[0], jsonMatch[1]];
        } else {
          jsonMatch = response.match(/```\s*(\{[\s\S]*?\})\s*```/);
          if (jsonMatch) {
            jsonMatch = [jsonMatch[0], jsonMatch[1]];
          }
        }
      }

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
          // Validate and set default values
          const validatedSuggestions = parsed.suggestions.slice(0, 3).map(suggestion => ({
            title: suggestion.title || 'גרף חדש',
            chartType: availableChartTypes.includes(suggestion.chartType) ? suggestion.chartType : 'PieChart',
            dataKey: availableDataKeys.includes(suggestion.dataKey) ? suggestion.dataKey : 'category',
            aggregationType: suggestion.aggregationType || 'sum',
            isVisible: true,
            order: 1,
            size: suggestion.size || 'medium',
            showGrid: suggestion.showGrid !== false,
            filters: {
              category: availableCategories.includes(suggestion.filters?.category) ? suggestion.filters.category : '',
              platform: availablePlatforms.includes(suggestion.filters?.platform) ? suggestion.filters.platform : '',
              instrument: availableInstruments.includes(suggestion.filters?.instrument) ? suggestion.filters.instrument : '',
              currency: availableCurrencies.includes(suggestion.filters?.currency) ? suggestion.filters.currency : '',
              tags: Array.isArray(suggestion.filters?.tags) ? suggestion.filters.tags : []
            }
          }));
          
          setAiSuggestions(validatedSuggestions);
          
          // Save suggestions to localStorage
          try {
            const storageKey = `chartBuilder_aiSuggestions_${user?.uid || 'guest'}`;
            localStorage.setItem(storageKey, JSON.stringify(validatedSuggestions));
          } catch (storageError) {
            console.error('Error saving suggestions to localStorage:', storageError);
          }
        } else {
          throw new Error('פורמט תשובה לא תקין');
        }
      } else {
        throw new Error('לא נמצא JSON בתשובה');
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      await errorAlert('שגיאה', 'אירעה שגיאה ביצירת הצעות. נסה שוב.');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Generate chart from custom prompt
  const generateChartFromPrompt = async () => {
    if (!customPrompt.trim()) {
      await errorAlert('שגיאה', 'אנא הזן בקשת גרף');
      return;
    }

    if (assets.length === 0) {
      await errorAlert('שגיאה', 'אין נכסים בתיק ליצירת גרף');
      return;
    }

    setLoadingCustomChart(true);
    try {
      const portfolioContext = generatePortfolioContext(assets);
      
      const availableChartTypes = ['PieChart', 'BarChart', 'HorizontalBarChart', 'RadialBar', 'Treemap', 'RadarChart', 'AreaChart', 'LineChart', 'ComposedChart'];
      const availableDataKeys = ['category', 'platform', 'instrument', 'symbol', 'tags', 'currency'];
      const availableCategories = uniqueCategories;
      const availablePlatforms = uniquePlatforms;
      const availableInstruments = uniqueInstruments;
      const availableCurrencies = uniqueCurrencies;

      const prompt = `אתה עוזר ליצירת גרף עבור תיק השקעות.

${portfolioContext}

זמינים לך:
- סוגי גרפים: ${availableChartTypes.join(', ')}
- קיבוץ לפי: ${availableDataKeys.join(', ')}
- קטגוריות: ${availableCategories.join(', ') || 'אין'}
- פלטפורמות: ${availablePlatforms.join(', ') || 'אין'}
- מטבעות בסיס: ${availableInstruments.join(', ') || 'אין'}
- מטבעות: ${availableCurrencies.join(', ') || 'אין'}

המשתמש ביקש: "${customPrompt}"

צור גרף שמתאים לבקשה. החזר JSON בלבד בפורמט הבא (ללא טקסט נוסף):
{
  "title": "שם הגרף בעברית",
  "chartType": "PieChart",
  "dataKey": "category",
  "aggregationType": "sum",
  "filters": {
    "category": "",
    "platform": "",
    "instrument": "",
    "currency": "",
    "tags": []
  },
  "size": "medium",
  "showGrid": true
}

חשוב:
- השם צריך להיות בעברית ותיאורי
- בחר סוג גרף שמתאים לבקשה
- בחר dataKey שמתאים לניתוח
- השתמש בפילטרים רק אם זה מוסיף ערך`;

      const response = await callGeminiAI(prompt, portfolioContext);
      
      // Try to extract JSON from response
      let jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          jsonMatch = [jsonMatch[0], jsonMatch[1]];
        } else {
          jsonMatch = response.match(/```\s*(\{[\s\S]*?\})\s*```/);
          if (jsonMatch) {
            jsonMatch = [jsonMatch[0], jsonMatch[1]];
          }
        }
      }

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        // Validate and set default values
        const chartConfig = {
          title: parsed.title || 'גרף חדש',
          chartType: availableChartTypes.includes(parsed.chartType) ? parsed.chartType : 'PieChart',
          dataKey: availableDataKeys.includes(parsed.dataKey) ? parsed.dataKey : 'category',
          aggregationType: parsed.aggregationType || 'sum',
          isVisible: true,
          order: 1,
          size: parsed.size || 'medium',
          showGrid: parsed.showGrid !== false,
          filters: {
            category: availableCategories.includes(parsed.filters?.category) ? parsed.filters.category : '',
            platform: availablePlatforms.includes(parsed.filters?.platform) ? parsed.filters.platform : '',
            instrument: availableInstruments.includes(parsed.filters?.instrument) ? parsed.filters.instrument : '',
            currency: availableCurrencies.includes(parsed.filters?.currency) ? parsed.filters.currency : '',
            tags: Array.isArray(parsed.filters?.tags) ? parsed.filters.tags : []
          }
        };
        
        setConfig(chartConfig);
        setCustomPrompt('');
        await successToast('הגרף נוצר בהצלחה!', 2000);
      } else {
        throw new Error('לא נמצא JSON בתשובה');
      }
    } catch (error) {
      console.error('Error generating chart from prompt:', error);
      await errorAlert('שגיאה', 'אירעה שגיאה ביצירת הגרף. נסה שוב.');
    } finally {
      setLoadingCustomChart(false);
    }
  };

  // Load suggestions from localStorage on mount
  useEffect(() => {
    if (user && assets.length > 0) {
      try {
        const storageKey = `chartBuilder_aiSuggestions_${user.uid}`;
        const savedSuggestions = localStorage.getItem(storageKey);
        if (savedSuggestions) {
          const parsed = JSON.parse(savedSuggestions);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAiSuggestions(parsed);
          }
        }
      } catch (error) {
        console.error('Error loading suggestions from localStorage:', error);
      }
    }
  }, [user, assets.length]);

  // Load suggestions on mount (only once when entering create tab with assets)
  useEffect(() => {
    if (activeTab === 'create' && assets.length > 0 && aiSuggestions.length === 0 && !loadingSuggestions) {
      generateAiSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Chart management functions
  const handleDeleteChart = async (chartId, chartTitle) => {
    const confirmed = await confirmAlert('מחיקה', `למחוק את הגרף "${chartTitle}"?`, 'warning', true);
    if (confirmed) {
      try {
        await deleteChartConfig(user, chartId);
        await successToast('נמחק בהצלחה', 2000);
      } catch (error) {
        console.error('Error deleting chart:', error);
        await successToast('אירעה שגיאה במחיקה', 2000);
      }
    }
  };

  const handleStartEditChart = (chart) => {
    setEditingChart(chart.id);
    setEditChartName(chart.title);
  };

  const handleSaveChartName = async (chart) => {
    if (!editChartName.trim()) return;
    
    try {
      await saveChartConfig(user, {
        ...chart,
        id: chart.id,
        title: editChartName.trim()
      });
      setEditingChart(null);
      setEditChartName('');
      await successToast('עודכן בהצלחה', 1500);
    } catch (error) {
      console.error('Error updating chart:', error);
      await successToast('אירעה שגיאה בעדכון', 2000);
    }
  };

  const handleCancelEditChart = () => {
    setEditingChart(null);
    setEditChartName('');
  };

  const handleMoveChart = async (chartId, direction) => {
    const currentIndex = charts.findIndex(c => c.id === chartId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= charts.length) return;

    const updatedCharts = [...charts];
    const [movedChart] = updatedCharts.splice(currentIndex, 1);
    updatedCharts.splice(newIndex, 0, movedChart);

    // Update orders
    const chartsWithNewOrders = updatedCharts.map((chart, index) => ({
      ...chart,
      order: index + 1
    }));

    try {
      await updateChartOrders(user, chartsWithNewOrders);
      await successToast('סדר עודכן בהצלחה', 1500);
    } catch (error) {
      console.error('Error updating chart order:', error);
      await successToast('אירעה שגיאה בעדכון הסדר', 2000);
    }
  };

  const handleChangeChartSize = async (chart, newSize) => {
    try {
      await saveChartConfig(user, {
        ...chart,
        id: chart.id,
        size: newSize
      });
      await successToast('גודל עודכן בהצלחה', 1500);
    } catch (error) {
      console.error('Error updating chart size:', error);
      await successToast('אירעה שגיאה בעדכון הגודל', 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => {
            if (!editingChartId) {
              // Reset form if not editing
              setConfig({
                title: '',
                chartType: 'PieChart',
                dataKey: 'category',
                aggregationType: 'sum',
                isVisible: true,
                order: 1,
                size: 'medium',
                showGrid: true,
                filters: {
                  category: '',
                  platform: '',
                  instrument: '',
                  currency: '',
                  tags: []
                }
              });
            }
            setActiveTab('create');
          }}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'create'
              ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          צור גרף חדש
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'manage'
              ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          ניהול גרפים ({charts.length})
        </button>
      </div>

      {/* Create Chart Tab */}
      {activeTab === 'create' && (
        <>
          {editingChartId && (
            <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">אתה עורך גרף קיים</span>
              </div>
              <button
                onClick={() => {
                  setEditingChartId(null);
                  setConfig({
                    title: '',
                    chartType: 'PieChart',
                    dataKey: 'category',
                    aggregationType: 'sum',
                    isVisible: true,
                    order: 1,
                    size: 'medium',
                    filters: {
                      category: '',
                      platform: '',
                      instrument: '',
                      currency: '',
                      tags: []
                    }
                  });
                }}
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
              >
                ביטול עריכה
              </button>
            </div>
          )}

          {/* AI Chart Creation Section */}
          {!editingChartId && (
            <div className="mb-6">
              {/* Collapsible Header */}
              <button
                onClick={() => setIsAiSectionOpen(!isAiSectionOpen)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 hover:bg-gradient-to-r hover:from-emerald-100 hover:to-blue-100 dark:hover:from-emerald-900/30 dark:hover:to-blue-900/30 transition"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">יצירת גרפים עם AI</h3>
                </div>
                {isAiSectionOpen ? (
                  <ChevronUp size={20} className="text-slate-600 dark:text-slate-400" />
                ) : (
                  <ChevronDown size={20} className="text-slate-600 dark:text-slate-400" />
                )}
              </button>

              {/* Collapsible Content */}
              {isAiSectionOpen && (
                <div className="mt-4 space-y-4">
                  {/* Custom Prompt Section */}
                  <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                    {/* <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={20} className="text-emerald-600 dark:text-emerald-400" />
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white">צור גרף עם AI</h3>
                    </div> */}
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                      תאר את הגרף שברצונך ליצור, וה-AI ימלא את כל השדות עבורך
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            generateChartFromPrompt();
                          }
                        }}
                        placeholder="לדוגמה: 'גרף עוגה של חלוקת התיק לפי קטגוריות' או 'גרף עמודות של נכסים לפי פלטפורמה'"
                        className="flex-1 w-full px-4 py-3 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        disabled={loadingCustomChart}
                      />
                      <button
                        onClick={generateChartFromPrompt}
                        disabled={loadingCustomChart || !customPrompt.trim()}
                        className="w-full sm:w-auto px-6 py-3 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 font-medium shadow-lg whitespace-nowrap"
                      >
                        {loadingCustomChart ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>יוצר...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={18} />
                            <span>צור גרף</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* AI Suggestions Section */}
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <BarChart3 size={20} className="text-slate-600 dark:text-slate-400" />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">הצעות AI לגרפים</h3>
                      </div>
                      <button
                        onClick={generateAiSuggestions}
                        disabled={loadingSuggestions || assets.length === 0}
                        className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                      >
                        {loadingSuggestions ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>טוען...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            <span>רענן הצעות</span>
                          </>
                        )}
                      </button>
                    </div>
                    
                    {loadingSuggestions ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map((index) => (
                          <div
                            key={index}
                            className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 animate-pulse"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-3/4"></div>
                              <div className="h-6 w-6 bg-slate-300 dark:bg-slate-700 rounded"></div>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                              <div className="h-5 bg-slate-300 dark:bg-slate-700 rounded w-16"></div>
                              <div className="h-5 bg-slate-300 dark:bg-slate-700 rounded w-20"></div>
                            </div>
                            <div className="h-3 bg-slate-300 dark:bg-slate-700 rounded w-2/3"></div>
                          </div>
                        ))}
                      </div>
                    ) : aiSuggestions.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {aiSuggestions.map((suggestion, index) => {
                          const suggestionData = aggregateData(assets, suggestion.dataKey, suggestion.filters);
                          return (
                            <div
                              key={index}
                              className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition cursor-pointer group"
                              onClick={() => setConfig(suggestion)}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <h4 className="font-semibold text-slate-800 dark:text-white text-sm flex-1">
                                  {suggestion.title}
                                </h4>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfig(suggestion);
                                  }}
                                  className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition"
                                  title="השתמש בהצעה זו"
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2 mb-3">
                                <span className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                                  {translateChartType(suggestion.chartType)}
                                </span>
                                <span className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                                  {translateDataKey(suggestion.dataKey)}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {suggestionData.length} פריטים • ₪{suggestionData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <p className="text-sm">לחץ על "רענן הצעות" כדי ליצור 3 הצעות לגרפים</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel - Hidden on mobile, shown in drawer */}
        <div className="hidden lg:block lg:col-span-1 space-y-4">
          {/* Chart Type Selector */}
          <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <label className="block text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">
              סוג גרף
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'BarChart', label: 'עמודות', icon: BarChart },
                // { value: 'StackedBarChart', label: 'מוערם', icon: BarChart2 },
                { value: 'HorizontalBarChart', label: 'אופקי', icon: BarChart2 },
                { value: 'RadialBar', label: 'רדיאלי', icon: Gauge },
                { value: 'PieChart', label: 'עוגה', icon: PieChart },
                { value: 'Treemap', label: 'מפה', icon: LayoutGrid },
                { value: 'RadarChart', label: 'רדאר', icon: Radar },
                { value: 'AreaChart', label: 'אזור', icon: AreaChart },
                { value: 'LineChart', label: 'קו', icon: LineChart },
                { value: 'ComposedChart', label: 'משולב', icon: TrendingUp },
              ].map(type => {
                const IconComponent = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setConfig({ ...config, chartType: type.value })}
                    className={`px-3 py-2.5 text-xs font-medium rounded-lg transition border flex flex-col items-center gap-1 ${
                      config.chartType === type.value
                        ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-600'
                        : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                    }`}
                  >
                    <IconComponent size={16} />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid Lines Toggle - Only for charts that support it */}
          {/* {['BarChart', 'StackedBarChart', 'HorizontalBarChart', 'AreaChart', 'LineChart', 'ComposedChart'].includes(config.chartType) && (
            <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">
                קווי רשת
              </label>
              <button
                onClick={() => setConfig({ ...config, showGrid: !config.showGrid })}
                className={`w-full px-4 py-3 rounded-lg transition flex items-center justify-between ${
                  config.showGrid
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500 dark:border-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2" >
                  <Grid size={18} className={config.showGrid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'} />
                  <span className={`text-sm font-medium ${config.showGrid ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}>
                    {config.showGrid ? 'מוצגים' : 'מוסתרים'}
                  </span>
                </div>
                <div dir='ltr' className={`w-12 h-6 rounded-full transition-colors ${config.showGrid ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${config.showGrid ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`} />
                </div>
              </button>
            </div>
          )} */}

          {/* Group By Selector */}
          <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <label className="block text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">
              קיבוץ לפי
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'category', label: 'אפיקי השקעה' },
                { value: 'platform', label: 'חשבונות וארנקים' },
                { value: 'instrument', label: 'מטבעות בסיס' },
                { value: 'symbol', label: 'סמל' },
                { value: 'tags', label: 'תגיות' },
                { value: 'currency', label: 'מטבע' }
              ].map(group => (
                <button
                  key={group.value}
                  onClick={() => setConfig({ ...config, dataKey: group.value })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                    config.dataKey === group.value
                      ? 'bg-slate-800 dark:bg-slate-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                <Filter size={14} />
                פילטרים
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                  title="נקה פילטרים"
                >
                  <X size={12} />
                  נקה
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">אפיקי השקעה</label>
                <CustomSelect
                  value={config.filters.category || ''}
                  onChange={(val) => setConfig({
                    ...config,
                    filters: { ...config.filters, category: val }
                  })}
                  options={[
                    { value: '', label: 'הכל' },
                    ...uniqueCategories.map(cat => ({
                      value: cat,
                      label: cat,
                      iconColor: systemData?.categories?.find(c => c.name === cat)?.color
                    }))
                  ]}
                  placeholder="הכל"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">חשבונות וארנקים</label>
                <CustomSelect
                  value={config.filters.platform || ''}
                  onChange={(val) => setConfig({
                    ...config,
                    filters: { ...config.filters, platform: val }
                  })}
                  options={[
                    { value: '', label: 'הכל' },
                    ...uniquePlatforms.map(plat => ({
                      value: plat,
                      label: plat,
                      iconColor: systemData?.platforms?.find(p => p.name === plat)?.color
                    }))
                  ]}
                  placeholder="הכל"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">מטבע</label>
                <CustomSelect
                  value={config.filters.currency || ''}
                  onChange={(val) => setConfig({
                    ...config,
                    filters: { ...config.filters, currency: val }
                  })}
                  options={[
                    { value: '', label: 'הכל' },
                    ...uniqueCurrencies.map(curr => ({
                      value: curr,
                      label: curr
                    }))
                  ]}
                  placeholder="הכל"
                  className="text-xs"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Preview Area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Preview Header */}
            <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Chart Title - Editable */}
                {isEditingTitle ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                      type="text"
                      value={config.title}
                      onChange={(e) => setConfig({ ...config, title: e.target.value })}
                      onBlur={() => setIsEditingTitle(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setIsEditingTitle(false);
                        } else if (e.key === 'Escape') {
                          setIsEditingTitle(false);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-base md:text-lg font-semibold text-slate-800 dark:text-white bg-white dark:bg-slate-700 border-2 border-emerald-500 dark:border-emerald-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="הזן שם לגרף"
                      autoFocus
                    />
                    <button
                      onClick={() => setIsEditingTitle(false)}
                      className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300"
                      aria-label="סיים עריכה"
                    >
                      <Check size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      onClick={() => setIsEditingTitle(true)}
                      className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 transition"
                      aria-label="ערוך שם"
                      title="ערוך שם"
                    >
                      <Edit2 size={16} />
                    </button>
                    <h3 
                      onClick={() => setIsEditingTitle(true)}
                      className="text-base md:text-lg font-semibold text-slate-800 dark:text-white flex-1 min-w-0 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition truncate"
                      title="לחץ לעריכה"
                    >
                      {config.title || 'לחץ להוספת שם לגרף'}
                    </h3>
                  </div>
                )}
                {/* Grid Lines Toggle - Only for charts that support it */}
                {['BarChart', 'StackedBarChart', 'HorizontalBarChart', 'AreaChart', 'LineChart', 'ComposedChart'].includes(config.chartType) && (
                  <button
                    onClick={() => setConfig({ ...config, showGrid: !config.showGrid })}
                    className={`p-2 rounded-lg transition hidden md:block ${
                      config.showGrid
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                    title={config.showGrid ? 'הסתר קווי רשת' : 'הצג קווי רשת'}
                    aria-label={config.showGrid ? 'הסתר קווי רשת' : 'הצג קווי רשת'}
                  >
                    <Grid size={18} />
                  </button>
                )}
                {/* Mobile Settings Button */}
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  className="lg:hidden p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                  aria-label="פתח תפריט עריכה"
                >
                  <Settings size={20} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                {/* Desktop Save Button */}
                <button
                  onClick={handleSave}
                  disabled={saving || !config.title.trim()}
                  className="hidden md:flex px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-900 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition items-center gap-2 shadow-sm"
                >
                  <Save size={14} />
                  {saving ? 'שומר...' : editingChartId ? 'עדכן גרף' : 'שמור גרף'}
                </button>
              </div>
            </div>

            {/* Chart Display */}
            <div className="p-4 md:p-6">
              <div className="h-[calc(100vh-280px)] md:h-80 min-h-[380px] md:min-h-[320px]">
                <ChartRenderer
                  config={config}
                  chartData={chartData}
                  systemData={systemData}
                  totalValue={totalValue}
                />
              </div>
            </div>

            {/* Mobile Save Button - Below Chart */}
            {config.title && (
              <div className="lg:hidden px-4 pb-4">
                <button
                  onClick={handleSave}
                  disabled={saving || !config.title.trim()}
                  className="w-full px-4 py-3 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-md"
                >
                  <Save size={18} />
                  {saving ? 'שומר...' : editingChartId ? 'עדכן גרף' : 'שמור גרף'}
                </button>
              </div>
            )}
          </div>

          {/* Data Summary - Desktop only */}
          <div className="hidden lg:block">
            <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={14} className="text-slate-500 dark:text-slate-400" />
                <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">סיכום נתונים</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-300">פריטים בגרף</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{aggregatedData.length}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-300">סה"כ ערך</span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    ₪{aggregatedData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile Bottom Drawer */}
      <div 
        className={`lg:hidden fixed inset-0 z-50 transition-transform duration-300 ease-out ${
          isDrawerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={() => setIsDrawerOpen(false)}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={() => setIsDrawerOpen(false)} />
        
        {/* Drawer Content */}
        <div 
          className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          dir="rtl"
        >
          {/* Drawer Handle */}
          <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between z-10">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">עריכת גרף</h3>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              aria-label="סגור"
            >
              <X size={20} />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="p-4 space-y-4 pb-8">
            {/* Chart Type Selector */}
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3 uppercase tracking-wide">
                סוג גרף
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { value: 'PieChart', label: 'עוגה', icon: PieChart },
                  { value: 'BarChart', label: 'עמודות', icon: BarChart3 },
                  // { value: 'StackedBarChart', label: 'מוערם', icon: BarChart2 },
                  { value: 'HorizontalBarChart', label: 'אופקי', icon: LucideBarChartHorizontal  },
                  { value: 'AreaChart', label: 'אזור', icon: AreaChart },
                  { value: 'LineChart', label: 'קו', icon: LineChart },
                  { value: 'ComposedChart', label: 'משולב', icon: TrendingUp },
                  { value: 'RadarChart', label: 'רדאר', icon: Radar },
                  { value: 'RadialBar', label: 'רדיאלי', icon: Gauge },
                  { value: 'Treemap', label: 'מפה', icon: LayoutGrid }
                ].map(type => {
                  const IconComponent = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setConfig({ ...config, chartType: type.value })}
                      className={`px-3 py-2.5 text-xs font-medium rounded-lg transition border flex flex-col items-center gap-1 ${
                        config.chartType === type.value
                          ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-600'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                      }`}
                    >
                      <IconComponent size={16} />
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid Lines Toggle - Only for charts that support it */}
            {['BarChart', 'StackedBarChart', 'HorizontalBarChart', 'AreaChart', 'LineChart', 'ComposedChart'].includes(config.chartType) && (
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3 uppercase tracking-wide">
                  קווי רשת
                </label>
                <button
                  onClick={() => setConfig({ ...config, showGrid: !config.showGrid })}
                  className={`w-full px-4 py-3 rounded-lg transition flex items-center justify-between ${
                    config.showGrid
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500 dark:border-emerald-600'
                      : 'bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Grid size={18} className={config.showGrid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'} />
                    <span className={`text-sm font-medium ${config.showGrid ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}>
                      {config.showGrid ? 'מוצגים' : 'מוסתרים'}
                    </span>
                  </div>
                  <div dir='ltr' className={`w-12 h-6 rounded-full transition-colors ${config.showGrid ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${config.showGrid ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`} />
                  </div>
                </button>
              </div>
            )}

            {/* Group By Selector */}
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3 uppercase tracking-wide">
                קיבוץ לפי
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'category', label: 'אפיקי השקעה' },
                  { value: 'platform', label: 'חשבונות וארנקים' },
                  { value: 'instrument', label: 'מטבעות בסיס' },
                  { value: 'symbol', label: 'סמל' },
                  { value: 'tags', label: 'תגיות' },
                  { value: 'currency', label: 'מטבע' }
                ].map(group => (
                  <button
                    key={group.value}
                    onClick={() => setConfig({ ...config, dataKey: group.value })}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                      config.dataKey === group.value
                        ? 'bg-slate-800 dark:bg-slate-700 text-white'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600'
                    }`}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  <Filter size={14} />
                  פילטרים
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1"
                    title="נקה פילטרים"
                  >
                    <X size={12} />
                    נקה
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">אפיקי השקעה</label>
                  <CustomSelect
                    value={config.filters.category || ''}
                    onChange={(val) => setConfig({
                      ...config,
                      filters: { ...config.filters, category: val }
                    })}
                    options={[
                      { value: '', label: 'הכל' },
                      ...uniqueCategories.map(cat => ({
                        value: cat,
                        label: cat,
                        iconColor: systemData?.categories?.find(c => c.name === cat)?.color
                      }))
                    ]}
                    placeholder="הכל"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">חשבונות וארנקים</label>
                  <CustomSelect
                    value={config.filters.platform || ''}
                    onChange={(val) => setConfig({
                      ...config,
                      filters: { ...config.filters, platform: val }
                    })}
                    options={[
                      { value: '', label: 'הכל' },
                      ...uniquePlatforms.map(plat => ({
                        value: plat,
                        label: plat,
                        iconColor: systemData?.platforms?.find(p => p.name === plat)?.color
                      }))
                    ]}
                    placeholder="הכל"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">מטבע</label>
                  <CustomSelect
                    value={config.filters.currency || ''}
                    onChange={(val) => setConfig({
                      ...config,
                      filters: { ...config.filters, currency: val }
                    })}
                    options={[
                      { value: '', label: 'הכל' },
                      ...uniqueCurrencies.map(curr => ({
                        value: curr,
                        label: curr
                      }))
                    ]}
                    placeholder="הכל"
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Data Summary - Mobile only in drawer */}
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={14} className="text-slate-500 dark:text-slate-400" />
                <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">סיכום נתונים</h3>
              </div>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-300">פריטים בגרף</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{aggregatedData.length}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-600 dark:text-slate-300">סה"כ ערך</span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    ₪{aggregatedData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Save Button - Mobile */}
            <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 -mx-4 px-4 py-4 -mb-4">
              <button
                onClick={() => {
                  handleSave();
                  setIsDrawerOpen(false);
                }}
                disabled={saving || !config.title.trim()}
                className="w-full px-4 py-3 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-lg"
              >
                <Save size={18} />
                {saving ? 'שומר...' : editingChartId ? 'עדכן גרף' : 'שמור גרף'}
              </button>
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Manage Charts Tab */}
      {activeTab === 'manage' && (
        <div className="space-y-6 pb-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">ניהול גרפים מותאמים</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">ערוך, מחק ושנה את סדר הצגת הגרפים בדשבורד</p>
            </div>
            <button
              onClick={() => setActiveTab('create')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all text-sm font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-95"
            >
              <Plus size={18} />
              <span>צור גרף חדש</span>
            </button>
          </div>

          {charts.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-8 md:p-12 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <BarChart3 className="text-slate-400 dark:text-slate-500" size={40} />
              </div>
              <h4 className="text-lg font-bold text-slate-700 dark:text-slate-100 mb-2">אין גרפים מותאמים</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">צור גרפים חדשים באמצעות בונה הגרפים כדי להציג אותם בדשבורד</p>
              <button
                onClick={() => setActiveTab('create')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all text-sm font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-95"
              >
                <Plus size={18} />
                <span>צור גרף חדש</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {charts.map((chart, index) => {
                const isEditing = editingChart === chart.id;
                
                // Calculate chart data for this chart
                const chartChartData = getChartDataForConfig(chart);
                const chartTotalValue = chartChartData.reduce((sum, item) => sum + (item.value || item.size || 0), 0);
                
                return (
                  <div 
                    key={chart.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="p-4 md:p-5 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800">
                      {isEditing ? (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <input
                            type="text"
                            value={editChartName}
                            onChange={(e) => setEditChartName(e.target.value)}
                            className="flex-1 border-2 border-emerald-500 rounded-xl px-4 py-3 text-base font-medium outline-none ring-2 ring-emerald-200 dark:ring-emerald-800 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveChartName(chart);
                              } else if (e.key === 'Escape') {
                                handleCancelEditChart();
                              }
                            }}
                            placeholder="הזן שם לגרף"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveChartName(chart)}
                              className="flex-1 sm:flex-none px-5 py-3 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all font-medium text-sm shadow-md active:scale-95"
                              title="שמור"
                            >
                              <span className="hidden sm:inline">שמור</span>
                              <Check size={18} className="sm:hidden mx-auto" />
                            </button>
                            <button
                              onClick={handleCancelEditChart}
                              className="px-5 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all font-medium text-sm active:scale-95"
                              title="ביטול"
                            >
                              <span className="hidden sm:inline">ביטול</span>
                              <X size={18} className="sm:hidden mx-auto" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
                              <BarChart3 size={20} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{chart.title}</h4>
                              <div className="flex flex-wrap items-center gap-2.5 mt-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                  {translateChartType(chart.chartType)}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                  {translateDataKey(chart.dataKey)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                              #{index + 1}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chart Preview */}
                    {!isEditing && chartChartData.length > 0 && (
                      <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                        <div className="h-96 md:h-[450px]">
                          <ChartRenderer
                            config={chart}
                            chartData={chartChartData}
                            systemData={systemData}
                            totalValue={chartTotalValue}
                          />
                        </div>
                      </div>
                    )}

                    {/* Card Body */}
                    {!isEditing && (
                      <div className="p-4 md:p-5 space-y-4">
                        {/* Size Selector - Hidden on mobile */}
                        <div className="hidden md:flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                            <Monitor size={18} className="text-slate-400 dark:text-slate-500" />
                            <span>גודל במחשב:</span>
                          </div>
                          <select
                            value={chart.size || 'medium'}
                            onChange={(e) => handleChangeChartSize(chart, e.target.value)}
                            className="flex-1 sm:flex-none sm:w-auto px-4 py-2.5 text-sm border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                          >
                            <option value="small">קטן - חצי רוחב</option>
                            <option value="medium">בינוני - רוחב מלא</option>
                            <option value="large">גדול - רוחב מלא, 2 שורות</option>
                          </select>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Smartphone size={14} />
                            <span>בטלפון: תמיד אותו קוביה</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                          {/* Order Controls - Mobile: Full width, Desktop: Auto */}
                          <div className="flex items-center gap-2 md:mr-auto">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">סדר:</span>
                            <button
                              onClick={() => handleMoveChart(chart.id, 'up')}
                              disabled={index === 0}
                              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                              title="הזז למעלה"
                            >
                              <ArrowUp size={18} />
                            </button>
                            <button
                              onClick={() => handleMoveChart(chart.id, 'down')}
                              disabled={index === charts.length - 1}
                              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                              title="הזז למטה"
                            >
                              <ArrowDown size={18} />
                            </button>
                          </div>

                          {/* Edit & Delete - Mobile: Stack, Desktop: Row */}
                          <div className="flex items-center gap-2">
                            {/* Edit Chart Button - Opens in create tab */}
                            <button
                              onClick={() => handleEditChart(chart)}
                              className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all font-medium text-sm flex items-center justify-center gap-2 active:scale-95 shadow-md"
                            >
                              <Edit2 size={16} />
                              <span>ערוך גרף</span>
                            </button>
                            {/* Edit Name Button - Desktop only */}
                            <button
                              onClick={() => handleStartEditChart(chart)}
                              className="hidden md:flex px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all font-medium text-sm items-center justify-center gap-2 active:scale-95"
                            >
                              <Edit2 size={16} />
                              <span>ערוך שם</span>
                            </button>
                            <button
                              onClick={() => handleDeleteChart(chart.id, chart.title)}
                              className="flex-1 md:flex-none px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all font-medium text-sm flex items-center justify-center gap-2 active:scale-95"
                            >
                              <Trash2 size={16} />
                              <span>מחק</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChartBuilder;

