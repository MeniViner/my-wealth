import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, setDoc, onSnapshot, collection, addDoc } from 'firebase/firestore';
import { Scale, Target, Loader2, Save, Sparkles, AlertCircle, TrendingUp, TrendingDown, Plus, Trash2, X, Tag, Database, Palette, DollarSign, Layers, Copy, Check, Eye, Percent } from 'lucide-react';
import { db, appId } from '../services/firebase';
import { callGeminiAI } from '../services/gemini';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { successToast, errorAlert, confirmAlert } from '../utils/alerts';

const GROUP_TYPES = {
  category: { label: 'אפיקי השקעה', icon: Tag, color: '#3B82F6' },
  platform: { label: 'חשבונות וארנקים', icon: Database, color: '#10B981' },
  instrument: { label: 'מטבעות בסיס', icon: Palette, color: '#8B5CF6' },
  symbol: { label: 'סמל', icon: Layers, color: '#F59E0B' },
  tags: { label: 'תגיות', icon: Tag, color: '#EF4444' },
  currency: { label: 'מטבע', icon: DollarSign, color: '#6366F1' }
};

const Rebalancing = ({ assets, systemData, user, currencyRate, portfolioContext = "" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [groups, setGroups] = useState([]);
  const [lastAnalysis, setLastAnalysis] = useState('');
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupType, setNewGroupType] = useState('');
  const [groupAIPrompts, setGroupAIPrompts] = useState({});
  const [groupAILoading, setGroupAILoading] = useState({});
  const [activeGroupView, setActiveGroupView] = useState(null); // For tabs
  const [copied, setCopied] = useState(false);
  const [showAmounts, setShowAmounts] = useState(true); // החלף בין הצגת סכומים (₪) או אחוזים (%)
  const [firebaseLoaded, setFirebaseLoaded] = useState(false); // Track if Firebase data was loaded
  
  // Check URL hash for tab navigation
  useEffect(() => {
    if (location.hash === '#reports') {
      setActiveTab('reports');
    }
  }, [location.hash]);
  
  const [activeTab, setActiveTab] = useState(() => {
    // Check if URL has #reports hash
    return location.hash === '#reports' ? 'reports' : 'rebalancing';
  });

  // Load rebalancing settings from Firebase
  useEffect(() => {
    if (!user || !db) return;

    const rebalancingRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rebalancing');
    
    const unsubscribe = onSnapshot(rebalancingRef, (snapshot) => {
      setFirebaseLoaded(true); // Mark as loaded after first snapshot
      
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.groups && Array.isArray(data.groups) && data.groups.length > 0) {
          setGroups(prevGroups => {
            // Only update if groups actually changed (to avoid overriding local changes)
            const groupsChanged = JSON.stringify(prevGroups) !== JSON.stringify(data.groups);
            if (groupsChanged) {
              return data.groups;
            }
            return prevGroups;
          });
          // Set active view only if not already set
          setActiveGroupView(prev => {
            if (!prev && data.groups.length > 0) {
              return data.groups[0].id;
            }
            return prev;
          });
        } else if (data.targets && typeof data.targets === 'object') {
          const migratedGroup = {
            id: 'category-default',
            type: 'category',
            targets: data.targets || {}
          };
          setGroups([migratedGroup]);
          setActiveGroupView('category-default');
        }
        // Don't set groups to [] if snapshot exists but has no groups - let default init handle it
        setLastAnalysis(data.lastAnalysis || '');
      }
      // Don't set groups to [] if snapshot doesn't exist - let default init handle it
    }, (error) => {
      console.error('Error loading rebalancing settings:', error);
      setFirebaseLoaded(true); // Mark as loaded even on error to allow default init
    });

    return () => unsubscribe();
  }, [user]);

  // Initialize default groups (category and symbol)
  // Only initialize if Firebase has been checked and no groups exist
  useEffect(() => {
    if (systemData && groups.length === 0 && firebaseLoaded) {
      const defaultGroups = [];
      
      if (systemData.categories && systemData.categories.length > 0) {
        const categoryTargets = {};
        systemData.categories.forEach(cat => {
          categoryTargets[cat.name] = 0;
        });
        defaultGroups.push({
          id: 'category-default',
          type: 'category',
          targets: categoryTargets
        });
      }

      if (systemData.symbols && systemData.symbols.length > 0) {
        const symbolTargets = {};
        systemData.symbols.forEach(sym => {
          const symName = typeof sym === 'string' ? sym : sym.name;
          symbolTargets[symName] = 0;
        });
        defaultGroups.push({
          id: 'symbol-default',
          type: 'symbol',
          targets: symbolTargets
        });
      }

      if (defaultGroups.length > 0) {
        setGroups(defaultGroups);
        setActiveGroupView(defaultGroups[0].id);
      }
    }
  }, [systemData, groups.length, firebaseLoaded]);

  // Calculate total wealth
  const totalWealth = useMemo(() => {
    return assets.reduce((sum, asset) => sum + asset.value, 0);
  }, [assets]);

  // Get available items for a group type
  const getAvailableItems = (groupType) => {
    if (!systemData || !assets) return [];

    switch (groupType) {
      case 'category':
        return systemData.categories || [];
      case 'platform':
        return systemData.platforms || [];
      case 'instrument':
        return systemData.instruments || [];
      case 'symbol':
        return systemData.symbols || [];
      case 'tags':
        const tagSet = new Set();
        assets.forEach(asset => {
          if (Array.isArray(asset.tags)) {
            asset.tags.forEach(tag => tagSet.add(tag));
          }
        });
        return Array.from(tagSet).map(tag => ({ name: tag, color: '#94a3b8' }));
      case 'currency':
        const currencySet = new Set();
        assets.forEach(asset => {
          if (asset.currency) currencySet.add(asset.currency);
        });
        return Array.from(currencySet).map(curr => ({ name: curr, color: '#94a3b8' }));
      default:
        return [];
    }
  };

  // Calculate current allocation for a group
  const calculateCurrentAllocation = (group) => {
    if (!assets || assets.length === 0 || totalWealth === 0) return {};

    const allocation = {};
    const availableItems = getAvailableItems(group.type);

    availableItems.forEach(item => {
      const itemName = typeof item === 'string' ? item : item.name;
      let matchingAssets = [];

      switch (group.type) {
        case 'category':
          matchingAssets = assets.filter(a => a.category === itemName);
          break;
        case 'platform':
          matchingAssets = assets.filter(a => a.platform === itemName);
          break;
        case 'instrument':
          matchingAssets = assets.filter(a => a.instrument === itemName);
          break;
        case 'symbol':
          matchingAssets = assets.filter(a => a.symbol === itemName);
          break;
        case 'tags':
          matchingAssets = assets.filter(a => 
            Array.isArray(a.tags) && a.tags.includes(itemName)
          );
          break;
        case 'currency':
          matchingAssets = assets.filter(a => a.currency === itemName);
          break;
      }

      const totalValue = matchingAssets.reduce((sum, a) => sum + a.value, 0);
      allocation[itemName] = (totalValue / totalWealth) * 100;
    });

    return allocation;
  };

  // Calculate total percentage for a group
  const getGroupTotalPercentage = (group) => {
    if (!group || !group.targets || typeof group.targets !== 'object') {
      return 0;
    }
    return Object.values(group.targets).reduce((sum, val) => {
      const numVal = Number(val);
      return sum + (isNaN(numVal) ? 0 : numVal);
    }, 0);
  };

  // Handle target change
  const handleTargetChange = (groupId, itemName, value) => {
    const numValue = Number(value) || 0;
    if (numValue < 0) return;

    setGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          targets: {
            ...group.targets,
            [itemName]: numValue
          }
        };
      }
      return group;
    }));
  };

  // Add new group
  const handleAddGroup = () => {
    if (!newGroupType) return;

    if (groups.some(g => g.type === newGroupType)) {
      errorAlert('שגיאה', 'סוג קיבוץ זה כבר קיים');
      return;
    }

    const availableItems = getAvailableItems(newGroupType);
    const newTargets = {};
    availableItems.forEach(item => {
      const itemName = typeof item === 'string' ? item : item.name;
      newTargets[itemName] = 0;
    });

    const newGroup = {
      id: `${newGroupType}-${Date.now()}`,
      type: newGroupType,
      targets: newTargets
    };

    setGroups(prev => [...prev, newGroup]);
    setShowAddGroup(false);
    setNewGroupType('');
    // Always select the newly added group for editing
    setActiveGroupView(newGroup.id);
  };

  // Remove group
  const handleRemoveGroup = async (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const isDefault = group.id.includes('default');
    if (isDefault && groups.length <= 2) {
      await errorAlert('שגיאה', 'לא ניתן למחוק את כל קבוצות האיזון');
      return;
    }

    const confirmed = await confirmAlert('מחיקת קבוצה', `למחוק את קבוצת האיזון "${GROUP_TYPES[group.type]?.label}"?`, 'warning', true);
    if (confirmed) {
      setGroups(prev => prev.filter(g => g.id !== groupId));
      if (activeGroupView === groupId && groups.length > 1) {
        const remainingGroups = groups.filter(g => g.id !== groupId);
        setActiveGroupView(remainingGroups[0].id);
      }
    }
  };

  // Save all groups to Firebase
  const handleSaveTargets = async () => {
    const invalidGroups = groups.filter(group => {
      const total = getGroupTotalPercentage(group);
      return Math.abs(total - 100) > 0.01;
    });

    if (invalidGroups.length > 0) {
      const groupLabels = invalidGroups.map(g => GROUP_TYPES[g.type]?.label).join(', ');
      await errorAlert('שגיאה', `קבוצות האיזון הבאות לא מסתכמות ל-100%: ${groupLabels}`);
      return;
    }

    setSaving(true);
    try {
      if (!user || !db) {
        throw new Error('משתמש לא מחובר');
      }

      const rebalancingRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rebalancing');
      await setDoc(rebalancingRef, {
        groups,
        lastAnalysis: lastAnalysis || ''
      }, { merge: true });

      await successToast('היעדים נשמרו בהצלחה', 2000);
    } catch (error) {
      console.error('Error saving targets:', error);
      await errorAlert('שגיאה', 'אירעה שגיאה בשמירת היעדים: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Analyze with AI
  const handleAnalyze = async () => {
    const invalidGroups = groups.filter(group => {
      const total = getGroupTotalPercentage(group);
      return Math.abs(total - 100) > 0.01;
    });

    if (invalidGroups.length > 0) {
      await errorAlert('שגיאה', 'אנא הגדר יעדים תקינים (100%) לכל הקבוצות לפני הניתוח');
      return;
    }

    if (!assets || assets.length === 0) {
      await errorAlert('שגיאה', 'אין נכסים לניתוח. אנא הוסף נכסים תחילה.');
      return;
    }

    setAnalyzing(true);
    try {
      const analysisData = groups.map(group => {
        const currentAlloc = calculateCurrentAllocation(group);
        const groupTypeLabel = GROUP_TYPES[group.type]?.label || group.type;
        
        const currentSummary = Object.entries(currentAlloc)
          .map(([item, pct]) => `- ${item}: ${pct.toFixed(2)}%`)
          .join('\n');

        const targetSummary = Object.entries(group.targets || {})
          .filter(([_, pct]) => pct > 0)
          .map(([item, pct]) => `- ${item}: ${pct}%`)
          .join('\n');

        const assetsByItem = {};
        const availableItems = getAvailableItems(group.type);
        
        availableItems.forEach(item => {
          const itemName = typeof item === 'string' ? item : item.name;
          let matchingAssets = [];

          switch (group.type) {
            case 'category':
              matchingAssets = assets.filter(a => a.category === itemName);
              break;
            case 'platform':
              matchingAssets = assets.filter(a => a.platform === itemName);
              break;
            case 'instrument':
              matchingAssets = assets.filter(a => a.instrument === itemName);
              break;
            case 'symbol':
              matchingAssets = assets.filter(a => a.symbol === itemName);
              break;
            case 'tags':
              matchingAssets = assets.filter(a => 
                Array.isArray(a.tags) && a.tags.includes(itemName)
              );
              break;
            case 'currency':
              matchingAssets = assets.filter(a => a.currency === itemName);
              break;
          }

          if (matchingAssets.length > 0) {
            const total = matchingAssets.reduce((sum, a) => sum + a.value, 0);
            assetsByItem[itemName] = {
              total,
              assets: matchingAssets.map(a => `  - ${a.name}: ₪${a.value.toLocaleString()}`).join('\n')
            };
          }
        });

        const assetsSummary = Object.entries(assetsByItem)
          .map(([item, data]) => `${item} (₪${data.total.toLocaleString()}):\n${data.assets}`)
          .join('\n\n');

        return {
          type: groupTypeLabel,
          currentSummary,
          targetSummary,
          assetsSummary
        };
      });

      const prompt = `
אתה יועץ השקעות מקצועי. עזור למשתמש לאזן את תיק ההשקעות שלו.

**נתונים כלליים:**
- סה"כ תיק: ₪${totalWealth.toLocaleString()}
- שער חליפין: 1$ = ₪${currencyRate.rate}

${analysisData.map((data, idx) => `
**${data.type} - הקצאה נוכחית:**
${data.currentSummary}

**${data.type} - יעדי הקצאה:**
${data.targetSummary}

**${data.type} - פירוט נכסים:**
${data.assetsSummary}
`).join('\n---\n')}

**בקשה:**
אנא החזר תשובה בעברית בפורמט Markdown עם:
1. **סיכום המצב הנוכחי** - השוואה בין הקצאה נוכחית ליעד לכל קבוצת איזון
2. **המלצות ספציפיות** - בדיוק כמה כסף (בשקלים) למכור מכל פריט שעבר את היעד, וכמה לקנות בכל פריט שתחת היעד
3. **תוכנית פעולה** - צעדים מעשיים לביצוע

השתמש בנתונים המדויקים שסופקו. תן המלצות ספציפיות בכסף (₪) ולא רק באחוזים.
`;

      const result = await callGeminiAI(prompt, portfolioContext);

      if (result && result.includes('שגיאה')) {
        throw new Error(result);
      }

      if (user && db) {
        const rebalancingRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'rebalancing');
        await setDoc(rebalancingRef, {
          groups,
          lastAnalysis: result
        }, { merge: true });

        const newReport = {
          date: new Date().toISOString(),
          displayDate: new Date().toLocaleDateString('he-IL'),
          content: result,
          tag: 'ייעוץ באיזון',
          source: 'rebalancing'
        };
        
        try {
          await addDoc(
            collection(db, 'artifacts', appId, 'users', user.uid, 'reports'),
            newReport
          );
        } catch (reportError) {
          console.error('Error saving to reports:', reportError);
        }
      }

      setLastAnalysis(result);
      await successToast('הניתוח הושלם בהצלחה', 2000);
    } catch (error) {
      console.error('Error analyzing:', error);
      await errorAlert('שגיאה', error.message || 'אירעה שגיאה בניתוח. אנא נסה שוב.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Get difference for an item in a group
  // Uses the correct financial formula:
  // targetValue = (Total Portfolio Value * Target Percentage) / 100
  // difference = targetValue - currentValue
  const getItemDifference = (group, itemName) => {
    const currentAlloc = calculateCurrentAllocation(group);
    const current = currentAlloc[itemName] || 0;
    const target = group.targets[itemName] || 0;
    
    // Calculate current and target values in ILS
    const currentValue = (current / 100) * totalWealth;
    const targetValue = (target / 100) * totalWealth;
    
    // Calculate difference: positive = need to add, negative = need to reduce
    const difference = targetValue - currentValue;
    
    // Percentage difference for display
    const diffPercentage = current - target;
    
    return { 
      current, 
      target, 
      diff: diffPercentage, // For percentage display
      diffAmount: difference, // Actual ILS amount (positive = add, negative = reduce)
      currentValue,
      targetValue
    };
  };

  // Get color for progress bar
  const getProgressColor = (diff) => {
    const absDiff = Math.abs(diff);
    if (absDiff <= 2) return 'bg-emerald-500';
    if (absDiff <= 5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Handle AI allocation for a group
  const handleAIDistribute = async (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const prompt = groupAIPrompts[groupId] || '';
    if (!prompt.trim()) {
      await errorAlert('שגיאה', 'אנא הזן בקשה ל-AI');
      return;
    }

    setGroupAILoading(prev => ({ ...prev, [groupId]: true }));

    try {
      const availableItems = getAvailableItems(group.type);
      const itemsList = availableItems.map(item => {
        const itemName = typeof item === 'string' ? item : item.name;
        return itemName;
      }).join(', ');

      // Calculate current allocation for this specific group
      const currentAlloc = calculateCurrentAllocation(group);
      const currentAllocSummary = Object.entries(currentAlloc)
        .filter(([_, pct]) => pct > 0.01) // Only show items with meaningful allocation
        .map(([item, pct]) => `- ${item}: ${pct.toFixed(2)}%`)
        .join('\n');

      // Get current targets if any
      const currentTargets = Object.entries(group.targets || {})
        .filter(([_, pct]) => pct > 0)
        .map(([item, pct]) => `- ${item}: ${pct}%`)
        .join('\n');

      const groupTypeLabel = GROUP_TYPES[group.type]?.label || group.type;

      const aiPrompt = `
אתה עוזר לחלק אחוזי הקצאה בתיק השקעות.

**סוג קיבוץ:** ${groupTypeLabel}
**רשימת פריטים זמינים:** ${itemsList}

**ההקצאה הנוכחית בפועל (מה יש עכשיו בתיק):**
${currentAllocSummary || 'אין הקצאה נוכחית'}

${currentTargets ? `**יעדים נוכחיים (אם קיימים):**\n${currentTargets}\n` : ''}
**בקשה מהמשתמש:** ${prompt}

**הוראות:**
1. החזר רק JSON עם המבנה הבא (ללא טקסט נוסף):
{
  "item1": percentage1,
  "item2": percentage2,
  ...
}

2. כל האחוזים חייבים להסתכם בדיוק ל-100%
3. השתמש בשמות הפריטים בדיוק כפי שמופיעים ברשימה
4. קח בחשבון את ההקצאה הנוכחית והבקשה של המשתמש
5. החזר רק את ה-JSON, ללא הסברים נוספים

דוגמה:
{"מניות": 60, "קריפטו": 30, "מזומן": 10}
`;

      const result = await callGeminiAI(aiPrompt, portfolioContext);

      if (result && result.includes('שגיאה')) {
        throw new Error(result);
      }

      let parsedResult;
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('לא נמצא JSON בתשובה');
        }
      } catch (parseError) {
        console.error('Parse error:', parseError, 'Result:', result);
        throw new Error('לא ניתן לפרש את תשובת ה-AI. אנא נסה שוב עם בקשה ברורה יותר.');
      }

      const total = Object.values(parsedResult).reduce((sum, val) => sum + (Number(val) || 0), 0);
      if (Math.abs(total - 100) > 0.1) {
        throw new Error(`האחוזים שהתקבלו מסתכמים ל-${total.toFixed(2)}% במקום 100%. אנא נסה שוב.`);
      }

      setGroups(prev => prev.map(g => {
        if (g.id === groupId) {
          const newTargets = { ...g.targets };
          Object.keys(newTargets).forEach(key => {
            newTargets[key] = 0;
          });
          Object.entries(parsedResult).forEach(([itemName, percentage]) => {
            if (newTargets.hasOwnProperty(itemName)) {
              newTargets[itemName] = Number(percentage);
            }
          });
          return {
            ...g,
            targets: newTargets
          };
        }
        return g;
      }));

      await successToast('האחוזים עודכנו בהצלחה', 2000);
      setGroupAIPrompts(prev => ({ ...prev, [groupId]: '' }));
    } catch (error) {
      console.error('Error in AI distribute:', error);
      await errorAlert('שגיאה', error.message || 'אירעה שגיאה בחלוקת האחוזים. אנא נסה שוב.');
    } finally {
      setGroupAILoading(prev => ({ ...prev, [groupId]: false }));
    }
  };

  // Get item color
  const getItemColor = (group, item) => {
    if (group.type === 'symbol') {
      const sym = systemData?.symbols?.find(s => {
        const sName = typeof s === 'string' ? s : s.name;
        return sName === item;
      });
      return typeof sym === 'string' ? '#94a3b8' : (sym?.color || '#94a3b8');
    }

    if (group.type === 'category') {
      return systemData?.categories?.find(c => c.name === item)?.color || '#94a3b8';
    }

    if (group.type === 'platform') {
      return systemData?.platforms?.find(p => p.name === item)?.color || '#94a3b8';
    }

    if (group.type === 'instrument') {
      return systemData?.instruments?.find(i => i.name === item)?.color || '#94a3b8';
    }

    return '#94a3b8';
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(lastAnalysis);
      setCopied(true);
      await successToast('הועתק ללוח', 1500);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Calculate all group totals for warning banner
  const allGroupTotals = useMemo(() => {
    if (!groups || groups.length === 0) return [];
    return groups.map(group => {
      const total = getGroupTotalPercentage(group);
      // Check if all targets are 0 (initial state - not an error)
      const allTargetsZero = Object.values(group.targets || {}).every(val => {
        const numVal = Number(val);
        return isNaN(numVal) || numVal === 0;
      });
      return {
        id: group.id,
        type: group.type,
        total: total,
        isValid: Math.abs(total - 100) < 0.01 || allTargetsZero
      };
    });
  }, [groups]);

  const hasInvalidGroups = allGroupTotals.some(g => !g.isValid);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 md:pb-12" dir="rtl">
      {/* Header */}
      <header className="flex flex-col mr-12 md:mr-0 md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Scale className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">איזון תיק השקעות</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">הגדר יעדי הקצאה והשווה למצב הנוכחי</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">סה"כ תיק</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">₪{totalWealth.toLocaleString()}</div>
          </div>
        </div>
      </header>


      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('rebalancing')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'rebalancing'
              ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          איזון תיק
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'reports'
              ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          דוחות וניתוחים
        </button>
      </div>

      {/* Total Percentage Warning Banner - Only show in rebalancing tab */}
      {activeTab === 'rebalancing' && hasInvalidGroups && (
        <div className="bg-red-50 dark:bg-red-900/20 border-r-4 border-red-500 dark:border-red-600 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
              <div>
                <div className="font-semibold text-red-900 dark:text-red-300 text-sm">סכום היעדים לא תקין</div>
                <div className="text-xs text-red-700 dark:text-red-400 mt-1">
                  {allGroupTotals.filter(g => !g.isValid).map(g => (
                    <span key={g.id} className="inline-block ml-2">
                      {GROUP_TYPES[g.type]?.label}: {g.total.toFixed(2)}%
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-red-600 dark:text-red-400 font-bold text-lg">
              {allGroupTotals.filter(g => !g.isValid).reduce((sum, g) => sum + Math.abs(100 - g.total), 0).toFixed(2)}% חריגה
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'rebalancing' && (
        <>
          {/* Section A: Set Targets - Card-based Design */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Target className="text-emerald-600 dark:text-emerald-400" size={20} />
              <div>
                <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">יעדי הקצאה</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">הגדר את החלוקה הרצויה של התיק</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddGroup(!showAddGroup)}
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all font-medium"
            >
              <Plus size={16} />
              הוסף קבוצה
            </button>
          </div>
        </div>

        {/* Add Group Form */}
        {showAddGroup && (
          <div className="px-4 md:px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <select
                value={newGroupType}
                onChange={(e) => setNewGroupType(e.target.value)}
                className="flex-1 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="">בחר סוג קיבוץ...</option>
                {Object.entries(GROUP_TYPES).map(([key, config]) => {
                  const exists = groups.some(g => g.type === key);
                  return (
                    <option key={key} value={key} disabled={exists}>
                      {config.label} {exists && '(קיים כבר)'}
                    </option>
                  );
                })}
              </select>
              <button
                onClick={handleAddGroup}
                disabled={!newGroupType}
                className="bg-emerald-600 dark:bg-emerald-700 text-white px-6 py-2.5 rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus size={16} />
                הוסף
              </button>
              <button
                onClick={() => {
                  setShowAddGroup(false);
                  setNewGroupType('');
                }}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="p-6">
          {groups.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              <Target className="mx-auto mb-3 text-slate-300 dark:text-slate-600" size={48} />
              <p className="text-sm">אין קבוצות איזון. לחץ על "הוסף קבוצה" כדי להתחיל.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Group Tabs */}
              {groups.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {groups.map((group) => {
                    const groupConfig = GROUP_TYPES[group.type];
                    const Icon = groupConfig?.icon || Tag;
                    const groupTotal = getGroupTotalPercentage(group);
                    const isActive = activeGroupView === group.id;
                    
                    return (
                      <button
                        key={group.id}
                        onClick={() => setActiveGroupView(group.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                          isActive
                            ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-md'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        <Icon size={16} />
                        {groupConfig?.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Active Group Content */}
              {groups.map((group) => {
                if (groups.length > 1 && activeGroupView !== group.id) return null;
                
                const groupConfig = GROUP_TYPES[group.type];
                const Icon = groupConfig?.icon || Tag;
                const availableItems = getAvailableItems(group.type);

                return (
                  <div key={group.id} className="space-y-4">
                    {/* Group Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                          style={{ backgroundColor: groupConfig?.color || '#94a3b8', opacity: 0.15 }}
                        >
                          <Icon size={20} style={{ color: groupConfig?.color || '#94a3b8' }} />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-slate-900 dark:text-white">{groupConfig?.label || group.type}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">קיבוץ לפי {groupConfig?.label}</p>
                        </div>
                      </div>
                      {groups.length > 2 && (
                        <button
                          onClick={() => handleRemoveGroup(group.id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all"
                          title="מחק קבוצה"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {/* AI Distribution Input */}
                    <div className="p-4 bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 dark:from-purple-900/30 dark:via-pink-900/30 dark:to-purple-900/30 rounded-2xl border border-purple-200 dark:border-purple-800 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
                        <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          חלוקה אוטומטית עם AI
                        </label>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={groupAIPrompts[group.id] || ''}
                          onChange={(e) => setGroupAIPrompts(prev => ({ ...prev, [group.id]: e.target.value }))}
                          placeholder="לדוגמה: 60% מניות, 30% קריפטו, 10% מזומן"
                          className="flex-1 border border-purple-300 dark:border-purple-600 rounded-xl px-4 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAIDistribute(group.id);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleAIDistribute(group.id)}
                          disabled={groupAILoading[group.id] || !groupAIPrompts[group.id]?.trim()}
                          className="bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm font-medium whitespace-nowrap"
                        >
                          {groupAILoading[group.id] ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              מחשב...
                            </>
                          ) : (
                            <>
                              <Sparkles size={16} />
                              חלק עם AI
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Target Cards - Horizontal Scrollable */}
                    {availableItems.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                        אין פריטים זמינים עבור {groupConfig?.label}
                      </div>
                    ) : (
                      <div className="overflow-x-auto pb-4 custom-scrollbar">
                        <div className="flex gap-4 min-w-max md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:min-w-0">
                          {availableItems.map((item) => {
                            const itemName = typeof item === 'string' ? item : item.name;
                            const itemColor = getItemColor(group, itemName);
                            const targetValue = group.targets[itemName] || 0;
                            
                            return (
                              <div
                                key={itemName}
                                className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-5 border border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-all min-w-[180px] md:min-w-0"
                              >
                                <div className="flex items-center gap-3 mb-4">
                                  <div 
                                    className="w-5 h-5 rounded-full border-2 border-white dark:border-slate-700 shadow-sm flex-shrink-0"
                                    style={{ backgroundColor: itemColor }}
                                  />
                                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{itemName}</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={targetValue}
                                    onChange={(e) => handleTargetChange(group.id, itemName, e.target.value)}
                                    className="flex-1 text-3xl font-black text-slate-900 dark:text-white bg-transparent border-none outline-none focus:ring-0 p-0 w-20 text-right"
                                    style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                                  />
                                  <span className="text-xl font-bold text-slate-500 dark:text-slate-400">%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Save Button */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  {/* Current Group Status - 3/4 width */}
                  <div className="flex-1" style={{ flex: '3' }}>
                    {(() => {
                      // Find the active group (or first group if only one)
                      const activeGroup = groups.length > 1 
                        ? groups.find(g => g.id === activeGroupView) || groups[0]
                        : groups[0];
                      
                      if (!activeGroup) return null;
                      
                      const groupTotal = getGroupTotalPercentage(activeGroup);
                      const diff = 100 - groupTotal;
                      const absDiff = Math.abs(diff);
                      const groupConfig = GROUP_TYPES[activeGroup.type];
                      
                      return (
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 h-full">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: groupConfig?.color || '#94a3b8', opacity: 0.15 }}
                            >
                              {groupConfig?.icon && (
                                <groupConfig.icon size={16} style={{ color: groupConfig?.color || '#94a3b8' }} />
                              )}
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{groupConfig?.label || activeGroup.type}</div>
                              <div className="text-lg font-black text-slate-900 dark:text-white">{groupTotal.toFixed(1)}%</div>
                            </div>
                          </div>
                          <div className="text-right">
                            {absDiff < 0.01 ? (
                              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                                <Check size={16} />
                                <span className="text-sm">100%</span>
                              </div>
                            ) : diff > 0 ? (
                              <div className="flex items-center gap-2 text-orange-600 font-bold">
                                <AlertCircle size={16} />
                                <span className="text-sm">חסר {diff.toFixed(1)}%</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-red-600 font-bold">
                                <AlertCircle size={16} />
                                <span className="text-sm">עודף {absDiff.toFixed(1)}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  {/* Save Button - 1/4 width */}
                  <div style={{ flex: '1' }}>
                    <button
                      onClick={handleSaveTargets}
                      disabled={saving || hasInvalidGroups}
                      className="w-full bg-emerald-600 text-white px-6 py-3.5 rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-emerald-200 h-full"
                    >
                      {saving ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          שומר...
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          שמור כל היעדים
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
        </>
      )}

      {activeTab === 'reports' && (
        <>
          {/* Create New AI Report Button - Top */}
          <div className="flex justify-end">
            <button
              onClick={handleAnalyze}
              disabled={analyzing || groups.length === 0 || !assets || assets.length === 0 || hasInvalidGroups}
              className="bg-slate-700 dark:bg-slate-600 text-white px-6 py-3 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 text-sm font-medium"
            >
              {analyzing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  מנתח...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  צור דוח AI חדש
                </>
              )}
            </button>
          </div>

          {/* Section B: Analysis & Progress - Comparison Table */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
         <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800">
           <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
             <div className="flex items-center gap-3">
               <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={20} />
               <div>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white">ניתוח והשוואה</h3>
                 <p className="text-xs text-slate-500 dark:text-slate-400">נוכחי מול יעד</p>
               </div>
             </div>
             <div className="flex items-center gap-2">
               {/* כפתור החלפה להצגת סכומים או אחוזים */}
               <button
                 onClick={() => setShowAmounts(!showAmounts)}
                 className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-600"
                 title={showAmounts ? 'הצג אחוזים במקום סכומים' : 'הצג סכומים במקום אחוזים'}
               >
                 {showAmounts ? (
                   <Percent size={18} />
                 ) : (
                   <DollarSign size={18} />
                 )}
               </button>
             </div>
           </div>
         </div>

        <div className="p-6">
          {groups.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              <AlertCircle className="mx-auto mb-3 text-slate-300 dark:text-slate-600" size={48} />
              <p className="text-sm">אין קבוצות איזון מוגדרות. אנא הוסף קבוצות איזון תחילה.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Group Tabs for Analysis View */}
              {groups.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {groups.map((group) => {
                    const groupConfig = GROUP_TYPES[group.type];
                    const Icon = groupConfig?.icon || Tag;
                    const isActive = activeGroupView === group.id;
                    
                    return (
                      <button
                        key={group.id}
                        onClick={() => setActiveGroupView(group.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                          isActive
                            ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-md'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        <Icon size={16} />
                        {groupConfig?.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Comparison Table for Active Group */}
              {groups.map((group) => {
                if (groups.length > 1 && activeGroupView !== group.id) return null;
                
                const groupConfig = GROUP_TYPES[group.type];
                const currentAlloc = calculateCurrentAllocation(group);
                const availableItems = getAvailableItems(group.type);
                const itemsWithData = availableItems.filter(item => {
                  const itemName = typeof item === 'string' ? item : item.name;
                  const { current, target } = getItemDifference(group, itemName);
                  return current > 0 || target > 0;
                });

                if (itemsWithData.length === 0) {
                  return (
                    <div key={group.id} className="text-center py-12 text-slate-400 dark:text-slate-500">
                      <p className="text-sm">אין נתונים להצגה עבור {groupConfig?.label}</p>
                    </div>
                  );
                }

                return (
                  <div key={group.id} className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                          <th className="text-right py-3 px-4 text-sm font-bold text-slate-700 dark:text-slate-300">פריט</th>
                          <th className="text-center py-3 px-4 text-sm font-bold text-slate-700 dark:text-slate-300 min-w-[200px]">הקצאה</th>
                          <th className="text-center py-3 px-4 text-sm font-bold text-slate-700 dark:text-slate-300 min-w-[80px]">נוכחי</th>
                          <th className="text-center py-3 px-4 text-sm font-bold text-slate-700 dark:text-slate-300 min-w-[80px]">יעד</th>
                          <th className="text-center py-3 px-4 text-sm font-bold text-slate-700 dark:text-slate-300 min-w-[100px] hidden md:table-cell">הפרש</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {itemsWithData.map((item) => {
                          const itemName = typeof item === 'string' ? item : item.name;
                          const { current, target, diff, diffAmount, currentValue, targetValue } = getItemDifference(group, itemName);
                          const absDiff = Math.abs(diff);
                          const absDiffAmount = Math.abs(diffAmount);
                          const itemColor = getItemColor(group, itemName);
                          
                          // Determine status: diffAmount > 0 means need to add, < 0 means need to reduce
                          const isUnderweight = diffAmount > 0.01; // Need to add money
                          const isOverweight = diffAmount < -0.01; // Need to reduce money
                          const isBalanced = !isUnderweight && !isOverweight;

                          return (
                            <tr key={itemName} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div 
                                    className="w-4 h-4 rounded-full border-2 border-white dark:border-slate-700 shadow-sm flex-shrink-0"
                                    style={{ backgroundColor: itemColor }}
                                  />
                                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{itemName}</span>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                {/* Percentage labels above the bar */}
                                <div className="relative mb-1 h-4 flex justify-between items-center">
                                  <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">0%</span>
                                  <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">100%</span>
                                </div>
                                
                                <div className="relative h-10 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden border border-slate-200 dark:border-slate-600 shadow-inner">
                                  {/* Current allocation bar - בר נוכחי */}
                                  {/* RTL: starts from right (0%) and extends leftward */}
                                  <div
                                    className="absolute h-full transition-all duration-500  border-l-2 border-white shadow-sm"
                                    style={{
                                      right: 0,
                                      width: `${Math.min(current, 100)}%`,
                                      backgroundColor: itemColor,
                                      opacity: 0.9
                                    }}
                                    title={`נוכחי: ${current.toFixed(1)}%`}
                                  />
                                  
                                  {/* Target marker - קו יעד */}
                                  {/* RTL: positioned from right (0% = right: 0, 100% = right: 100%) */}
                                  {target > 0 && (
                                    <div
                                      className="absolute h-full z-30 flex items-center"
                                      style={{ right: `${target}%`, transform: 'translateX(50%)' }}
                                      title={`יעד: ${target}%`}
                                    >
                                      {/* White background circle for better visibility */}
                                      <div className="absolute -left-1.5 w-3 h-3 bg-white dark:bg-slate-800 border-2 border-blue-600 dark:border-blue-500 shadow-md z-10" />
                                      {/* Vertical line with shadow for visibility */}
                                      <div className="relative h-full w-1 bg-blue-600 shadow-lg" style={{ marginRight: '-1px' }}>
                                        {/* Pulsing animation for attention */}
                                        <div className="absolute inset-0 bg-blue-400 animate-pulse opacity-50 " />
                                        {/* Percentage label on the line itself - centered on the line */}
                                        <div className="absolute top-1/2 -translate-y-1/2 translate-x-1/2 right-1/2 whitespace-nowrap z-20">
                                          <span className="text-[9px] font-bold text-blue-700 dark:text-blue-400 bg-white/95 dark:bg-slate-800/95 px-1 py-0.5 rounded shadow-sm border border-blue-300 dark:border-blue-600">
                                            {target}%
                                          </span>
                                        </div>
                                      </div>
                                      {/* Label above the line */}
                                      <div className="absolute -top-7 left-0 transform -translate-x-1/2 whitespace-nowrap z-20">
                                        <div className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1  shadow-lg border border-blue-700">
                                          יעד: {target}%
                                        </div>
                                        {/* Arrow pointing down */}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-blue-600" />
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Difference indicator - מציין הפרש */}
                                  {/* RTL: all calculations from right (0% = right: 0) */}
                                  {absDiffAmount > 1 && target > 0 && (
                                    <>
                                      {isUnderweight ? (
                                        // Need to add - צריך להוסיף (ירוק)
                                        // Gap from current to target (extends leftward from current position)
                                        <div
                                          className="absolute h-full bg-emerald-400 opacity-60  border-2 border-emerald-600 border-dashed z-10 flex items-center justify-start pl-1"
                                          style={{
                                            right: `${current}%`,
                                            width: `${Math.min(target - current, 100 - current)}%`
                                          }}
                                          title={showAmounts ? `צריך להוסיף: ₪${absDiffAmount.toLocaleString()}` : `צריך להוסיף: ${absDiff.toFixed(1)}%`}
                                        >
                                          <TrendingUp size={12} className="text-emerald-700" />
                                        </div>
                                      ) : isOverweight ? (
                                        // Need to reduce - צריך להסיר (אדום)
                                        // Excess from target to current (extends leftward from target position)
                                        <div
                                          className="absolute h-full bg-red-400 opacity-60  border-2 border-red-600 border-dashed z-10 flex items-center justify-start pl-1"
                                          style={{
                                            right: `${target}%`,
                                            width: `${Math.min(current - target, 100 - target)}%`
                                          }}
                                          title={showAmounts ? `צריך להסיר: ₪${absDiffAmount.toLocaleString()}` : `צריך להסיר: ${absDiff.toFixed(1)}%`}
                                        >
                                          <TrendingDown size={12} className="text-red-700" />
                                        </div>
                                      ) : null}
                                    </>
                                  )}
                                  
                                  {/* Legend tooltip on hover */}
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                                    <div className="bg-slate-900 dark:bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                      נוכחי: {current.toFixed(1)}% | יעד: {target}%
                                    </div>
                                  </div>
                                </div>
                                
                                  {/* Legend below the bar */}
                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-600 dark:text-slate-300">
                                  <div className="flex items-center gap-1.5">
                                    <div 
                                      className="w-3 h-3 rounded-full border border-white dark:border-slate-700 shadow-sm"
                                      style={{ backgroundColor: itemColor }}
                                    />
                                    <span>נוכחי</span>
                                  </div>
                                  {target > 0 && (
                                    <>
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-0.5 h-3 bg-blue-600 dark:bg-blue-400" />
                                        <span>יעד</span>
                                      </div>
                                      {absDiffAmount > 1 && (
                                        <div className="flex items-center gap-1.5">
                                          <div className={`w-3 h-3 rounded-full border-2 border-dashed ${
                                            isUnderweight ? 'bg-emerald-400 dark:bg-emerald-500 border-emerald-600 dark:border-emerald-400' : 'bg-red-400 dark:bg-red-500 border-red-600 dark:border-red-400'
                                          }`} />
                                          <span>{isUnderweight 
                                            ? (showAmounts ? `צריך להוסיף ₪${absDiffAmount.toLocaleString()}` : `צריך להוסיף ${absDiff.toFixed(1)}%`)
                                            : (showAmounts ? `צריך להסיר ₪${absDiffAmount.toLocaleString()}` : `צריך להסיר ${absDiff.toFixed(1)}%`)
                                          }</span>
                                        </div>
                                      )}
                                      {isBalanced && target > 0 && (
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-3 h-3 rounded-full border-2 border-slate-400 dark:border-slate-500 bg-slate-200 dark:bg-slate-600" />
                                          <span className="text-slate-500 dark:text-slate-400">מאוזן</span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{current.toFixed(1)}%</span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                {target > 0 ? (
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{target}%</span>
                                ) : (
                                  <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-center hidden md:table-cell">
                                {absDiffAmount > 1 && target > 0 && (
                                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                                    isUnderweight
                                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                      : isOverweight
                                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}>
                                    {isUnderweight ? (
                                      <>
                                        <TrendingUp size={12} />
                                        {showAmounts ? `הוסף ₪${absDiffAmount.toLocaleString()}` : `הוסף ${absDiff.toFixed(1)}%`}
                                      </>
                                    ) : isOverweight ? (
                                      <>
                                        <TrendingDown size={12} />
                                        {showAmounts ? `הסר ₪${absDiffAmount.toLocaleString()}` : `הסר ${absDiff.toFixed(1)}%`}
                                      </>
                                    ) : (
                                      <span className="text-slate-500 dark:text-slate-400">מאוזן</span>
                                    )}
                                  </span>
                                )}
                                {isBalanced && target > 0 && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                    מאוזן
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}

              {/* AI Analysis Result - Chat Bubble Style */}
              {lastAnalysis && (
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 rounded-2xl p-6 border-2 border-purple-200 dark:border-slate-700 shadow-lg relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-md">
                          <Sparkles className="text-white" size={20} />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-slate-900 dark:text-white">המלצות AI</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400">ניתוח מותאם אישית</p>
                        </div>
                      </div>
                      <button
                        onClick={handleCopy}
                        className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-slate-700/50 transition-all text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400"
                        title="העתק ללוח"
                      >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                      </button>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <MarkdownRenderer content={lastAnalysis} />
                    </div>
                  </div>
                </div>
              )}

              {!lastAnalysis && (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-700 mt-6">
                  <Sparkles className="mx-auto mb-3 text-slate-300 dark:text-slate-600" size={48} />
                  <p className="text-sm font-medium">לחץ על "צור דוח AI חדש" כדי לקבל המלצות מותאמות אישית</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
        </>
      )}

    </div>
  );
};

export default Rebalancing;
