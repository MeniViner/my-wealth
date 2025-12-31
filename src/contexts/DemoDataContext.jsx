import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { DEFAULT_SYSTEM_DATA } from '../constants/defaults';
import { generatePortfolioContext } from '../utils/aiContext';

const DemoDataContext = createContext();

const DEMO_MODE_KEY = 'myWealth_demoMode';
const DEMO_ASSETS_KEY = 'myWealth_demoAssets';
const DEMO_SYSTEM_DATA_KEY = 'myWealth_demoSystemData';
const DEMO_PORTFOLIO_CONTEXT_KEY = 'myWealth_demoPortfolioContext';
const DEMO_REFRESH_INTERVAL_KEY = 'myWealth_demoRefreshInterval';

/**
 * Demo Data Context - Provides demo assets locally (saved to localStorage, never to Firebase)
 * Used during the tour to show realistic data and for manual demo mode
 */
export const DemoDataProvider = ({ children }) => {
  const [demoAssets, setDemoAssets] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const [baseValues, setBaseValues] = useState({});
  const baseValuesRef = useRef({});
  const [demoSystemData, setDemoSystemData] = useState(null);
  const [demoPortfolioContext, setDemoPortfolioContext] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(() => {
    const saved = localStorage.getItem(DEMO_REFRESH_INTERVAL_KEY);
    return saved ? parseInt(saved, 10) : 3; // Default 3 seconds
  });

  // Initialize demo assets function (defined before useEffect that uses it)
  const initializeDemoAssets = useCallback(() => {
    const currencyRate = 3.65;
    
    // Helper function to generate random tags (2-3 tags per asset)
    const generateTags = (asset) => {
      const allTags = [
        'חיסכון', 'השקעה', 'פנסיה', 'השתלמות', 'נזיל', 'סיכון נמוך', 'סיכון בינוני', 'סיכון גבוה',
        'ארוך טווח', 'קצר טווח', 'דיבידנדים', 'צמיחה', 'ערך', 'טכנולוגיה', 'פיננסים', 'אנרגיה',
        'בריאות', 'צרכנות', 'נדל"ן', 'מט"ח', 'אינפלציה', 'ריבית', 'שוק הון', 'קריפטו',
        'ביטקוין', 'איתריום', 'דפי', 'סטייקינג', 'טרייד', 'הולד', 'ספקולציה', 'יציב'
      ];
      
      // Category-specific tags
      const categoryTags = {
        'מזומן': ['נזיל', 'בטוח', 'חיסכון', 'ריבית', 'נגיש'],
        'מניות': ['צמיחה', 'דיבידנדים', 'שוק הון', 'סיכון בינוני', 'ארוך טווח'],
        'קריפטו': ['קריפטו', 'ספקולציה', 'סיכון גבוה', 'טכנולוגיה', 'בלוקצ\'יין']
      };
      
      const relevantTags = [...allTags, ...(categoryTags[asset.category] || [])];
      const numTags = Math.floor(Math.random() * 2) + 2; // 2 or 3 tags
      const shuffled = [...relevantTags].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, numTags);
    };

    const baseAssets = [
      { id: 'demo-1', name: "חשבון עו\"ש בנק הפועלים", symbol: "ILS", platform: "בנק הפועלים", category: "מזומן", instrument: "מזומן (ILS)", currency: "ILS", originalValue: 45000 },
      { id: 'demo-2', name: "חיסכון בנק", symbol: "ILS", platform: "בנק הפועלים", category: "מזומן", instrument: "מזומן (ILS)", currency: "ILS", originalValue: 120000 },
      { id: 'demo-3', name: "קרן כספית מיטב", symbol: "MMF", platform: "מיטב", category: "מזומן", instrument: "קרן כספית", currency: "ILS", originalValue: 35000 },
      { id: 'demo-4', name: "קרן פנסיה", symbol: "SPX", platform: "מיטב", category: "מניות", instrument: "פנסיה", currency: "ILS", originalValue: 280000 },
      { id: 'demo-5', name: "קרן השתלמות", symbol: "URTH", platform: "מיטב", category: "מניות", instrument: "קרן השתלמות", currency: "ILS", originalValue: 95000 },
      { id: 'demo-6', name: "Apple Inc.", symbol: "AAPL", platform: "אחר", category: "מניות", instrument: "מניה בודדת", currency: "USD", originalValue: 15000 },
      { id: 'demo-7', name: "Google (Alphabet)", symbol: "GOOGL", platform: "אחר", category: "מניות", instrument: "מניה בודדת", currency: "USD", originalValue: 12000 },
      { id: 'demo-8', name: "Microsoft Corp.", symbol: "MSFT", platform: "אחר", category: "מניות", instrument: "מניה בודדת", currency: "USD", originalValue: 8500 },
      { id: 'demo-9', name: "S&P 500 ETF", symbol: "SPY", platform: "אחר", category: "מניות", instrument: "קרן סל (ETF)", currency: "USD", originalValue: 22000 },
      { id: 'demo-10', name: "Bitcoin", symbol: "BTC", platform: "Binance", category: "קריפטו", instrument: "Bitcoin", currency: "USD", originalValue: 8500 },
      { id: 'demo-11', name: "Ethereum", symbol: "ETH", platform: "Binance", category: "קריפטו", instrument: "Ethereum", currency: "USD", originalValue: 4200 },
      { id: 'demo-12', name: "Bitcoin Wallet", symbol: "BTC", platform: "Exodus", category: "קריפטו", instrument: "Bitcoin", currency: "USD", originalValue: 1500 },
      { id: 'demo-13', name: "USDT Staking", symbol: "USDT", platform: "Bybit", category: "קריפטו", instrument: "אחר", currency: "USD", originalValue: 5000 },
      { id: 'demo-14', name: "מזומן בארנק", symbol: "ILS", platform: "אחר", category: "מזומן", instrument: "מזומן (ILS)", currency: "ILS", originalValue: 2500 },
      { id: 'demo-15', name: "דולרים במזומן", symbol: "USD", platform: "אחר", category: "מזומן", instrument: "מזומן (USD)", currency: "USD", originalValue: 800 },
    ];

    // Add tags to each asset
    const assetsWithTags = baseAssets.map(asset => ({
      ...asset,
      tags: generateTags(asset)
    }));

    // Calculate values and add to assets
    const assetsWithValues = assetsWithTags.map(asset => ({
      ...asset,
      value: asset.currency === 'USD' 
        ? asset.originalValue * currencyRate 
        : asset.originalValue
    }));

    // Ensure all categories, platforms, and instruments exist in systemData
    // Use DEFAULT_SYSTEM_DATA as base with deep copy
    const enhancedSystemData = {
      platforms: DEFAULT_SYSTEM_DATA.platforms.map(p => ({ ...p })),
      instruments: DEFAULT_SYSTEM_DATA.instruments.map(i => ({ ...i })),
      categories: DEFAULT_SYSTEM_DATA.categories.map(c => ({ ...c })),
      symbols: DEFAULT_SYSTEM_DATA.symbols.map(s => ({ ...s }))
    };
    
    // Collect all unique categories, platforms, and instruments from demo assets
    const demoCategories = [...new Set(assetsWithTags.map(a => a.category))];
    const demoPlatforms = [...new Set(assetsWithTags.map(a => a.platform))];
    const demoInstruments = [...new Set(assetsWithTags.map(a => a.instrument))];
    const demoSymbols = [...new Set(assetsWithTags.map(a => a.symbol).filter(Boolean))];
    
    // Add missing categories
    demoCategories.forEach(cat => {
      if (!enhancedSystemData.categories.find(c => c.name === cat)) {
        const defaultCategory = DEFAULT_SYSTEM_DATA.categories.find(c => c.name === cat) ||
                                DEFAULT_SYSTEM_DATA.categories.find(c => c.name === 'אחר') ||
                                { name: 'אחר', color: '#64748B' };
        enhancedSystemData.categories.push({
          name: cat,
          color: defaultCategory.color
        });
      }
    });
    
    // Add missing platforms
    demoPlatforms.forEach(plat => {
      if (!enhancedSystemData.platforms.find(p => p.name === plat)) {
        const defaultPlatform = DEFAULT_SYSTEM_DATA.platforms.find(p => p.name === plat) ||
                                 DEFAULT_SYSTEM_DATA.platforms.find(p => p.name === 'אחר') ||
                                 { name: 'אחר', color: '#94A3B8' };
        enhancedSystemData.platforms.push({
          name: plat,
          color: defaultPlatform.color
        });
      }
    });
    
    // Add missing instruments
    demoInstruments.forEach(inst => {
      if (!enhancedSystemData.instruments.find(i => i.name === inst)) {
        const defaultInstrument = DEFAULT_SYSTEM_DATA.instruments.find(i => i.name === inst) ||
                                  DEFAULT_SYSTEM_DATA.instruments.find(i => i.name === 'אחר') ||
                                  { name: 'אחר', color: '#64748B' };
        enhancedSystemData.instruments.push({
          name: inst,
          color: defaultInstrument.color
        });
      }
    });
    
    // Add missing symbols
    demoSymbols.forEach(sym => {
      if (!enhancedSystemData.symbols.find(s => s.name === sym)) {
        const defaultSymbol = DEFAULT_SYSTEM_DATA.symbols.find(s => s.name === sym) ||
                              DEFAULT_SYSTEM_DATA.symbols.find(s => s.name === 'ILS') ||
                              { name: 'ILS', color: '#10B981' };
        enhancedSystemData.symbols.push({
          name: sym,
          color: defaultSymbol.color
        });
      }
    });
    
    // Generate portfolio context for demo assets (only once, won't be updated)
    const portfolioContext = generatePortfolioContext(assetsWithValues);

    // Store base values
    const values = {};
    assetsWithValues.forEach(asset => {
      values[asset.id] = asset.value;
    });
    
    setBaseValues(values);
    baseValuesRef.current = values;
    setDemoAssets(assetsWithValues);
    setDemoSystemData(enhancedSystemData);
    setDemoPortfolioContext(portfolioContext);
    setIsActive(true);
  }, []);

  // Helper to clear demo data from localStorage
  const clearDemoFromStorage = useCallback(() => {
    localStorage.removeItem(DEMO_MODE_KEY);
    localStorage.removeItem(DEMO_ASSETS_KEY);
    localStorage.removeItem(DEMO_SYSTEM_DATA_KEY);
    localStorage.removeItem(DEMO_PORTFOLIO_CONTEXT_KEY);
    // Don't remove refresh interval - keep user preference
  }, []);

  // Update refresh interval
  const updateRefreshInterval = useCallback((seconds) => {
    const clampedValue = Math.max(5, Math.min(60, seconds)); // Between 5 and 60 seconds
    setRefreshInterval(clampedValue);
    localStorage.setItem(DEMO_REFRESH_INTERVAL_KEY, clampedValue.toString());
  }, []);

  // Load demo mode from localStorage on mount
  useEffect(() => {
    const savedDemoMode = localStorage.getItem(DEMO_MODE_KEY);
    if (savedDemoMode === 'true') {
      const savedAssets = localStorage.getItem(DEMO_ASSETS_KEY);
      const savedSystemData = localStorage.getItem(DEMO_SYSTEM_DATA_KEY);
      const savedContext = localStorage.getItem(DEMO_PORTFOLIO_CONTEXT_KEY);
      
      if (savedAssets && savedSystemData) {
        try {
          const assets = JSON.parse(savedAssets);
          const systemData = JSON.parse(savedSystemData);
          const context = savedContext || '';
          
          // Restore base values from saved assets
          const values = {};
          assets.forEach(asset => {
            // Use the saved value as base value
            values[asset.id] = asset.value;
          });
          
          setBaseValues(values);
          baseValuesRef.current = values;
          setDemoAssets(assets);
          setDemoSystemData(systemData);
          setDemoPortfolioContext(context);
          setIsActive(true);
        } catch (error) {
          console.error('Error loading demo mode from localStorage:', error);
          // Clear corrupted data
          clearDemoFromStorage();
        }
      } else {
        // If demo mode flag exists but data is missing, reinitialize
        initializeDemoAssets();
      }
    }
  }, [initializeDemoAssets, clearDemoFromStorage]);

  // Save to localStorage whenever demo data changes
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemoDataContext.jsx:183',message:'localStorage save effect triggered',data:{isActive,demoAssetsLength:demoAssets.length,hasSystemData:!!demoSystemData,hasContext:!!demoPortfolioContext},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    if (isActive) {
      localStorage.setItem(DEMO_MODE_KEY, 'true');
      if (demoAssets.length > 0) {
        localStorage.setItem(DEMO_ASSETS_KEY, JSON.stringify(demoAssets));
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemoDataContext.jsx:187',message:'localStorage assets saved',data:{assetsCount:demoAssets.length,firstAssetId:demoAssets[0]?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
      }
      if (demoSystemData) {
        localStorage.setItem(DEMO_SYSTEM_DATA_KEY, JSON.stringify(demoSystemData));
      }
      if (demoPortfolioContext) {
        localStorage.setItem(DEMO_PORTFOLIO_CONTEXT_KEY, demoPortfolioContext);
      }
    } else {
      clearDemoFromStorage();
    }
  }, [isActive, demoAssets, demoSystemData, demoPortfolioContext, clearDemoFromStorage]);

  // Animate values - variations based on refreshInterval with profit/loss calculations
  useEffect(() => {
    if (!isActive || demoAssets.length === 0) return;

    const interval = setInterval(() => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemoDataContext.jsx:210',message:'animation interval triggered',data:{baseValuesCount:Object.keys(baseValuesRef.current).length,demoAssetsCount:demoAssets.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      setDemoAssets(prev => {
        const currencyRate = 3.65;
        const currentBaseValues = baseValuesRef.current;
        const updated = prev.map(asset => {
          const baseValue = currentBaseValues[asset.id] || 0;
          // #region agent log
          if (asset.id === prev[0]?.id) {
            fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemoDataContext.jsx:217',message:'animation calculating for asset',data:{assetId:asset.id,baseValue,currentValue:asset.value,baseValueExists:!!currentBaseValues[asset.id]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
          }
          // #endregion
          // Random variation between -2% and +2% for more noticeable changes
          const variation = (Math.random() - 0.5) * 0.04; // -2% to +2%
          const newValue = baseValue * (1 + variation);
          const roundedValue = Math.round(newValue);
          
          // Calculate profit/loss if we have purchase price or original value
          let profitLoss = null;
          let profitLossPercent = null;
          let priceChange24h = null;
          
          if (asset.assetMode === 'QUANTITY' && asset.quantity && asset.purchasePrice) {
            // QUANTITY mode: calculate P/L based on purchase price
            const costBasis = asset.quantity * (asset.purchasePrice || 0);
            const costBasisInILS = asset.currency === 'USD' ? costBasis * currencyRate : costBasis;
            profitLoss = roundedValue - costBasisInILS;
            profitLossPercent = costBasisInILS > 0 ? (profitLoss / costBasisInILS) * 100 : 0;
            
            // Calculate 24h change as percentage (simulate market movement)
            priceChange24h = variation * 100; // Convert to percentage
          } else if (asset.originalValue) {
            // LEGACY mode: calculate P/L based on original value
            const originalValueInILS = asset.currency === 'USD' 
              ? asset.originalValue * currencyRate 
              : asset.originalValue;
            profitLoss = roundedValue - originalValueInILS;
            profitLossPercent = originalValueInILS > 0 ? (profitLoss / originalValueInILS) * 100 : 0;
            
            // Calculate 24h change as percentage
            priceChange24h = variation * 100;
          }
          
          return {
            ...asset,
            value: roundedValue,
            originalValue: asset.currency === 'USD' 
              ? Math.round(newValue / currencyRate)
              : roundedValue,
            profitLoss: profitLoss !== null ? Math.round(profitLoss) : null,
            profitLossPercent: profitLossPercent !== null ? Number(profitLossPercent.toFixed(2)) : null,
            priceChange24h: priceChange24h !== null ? Number(priceChange24h.toFixed(2)) : null,
            hasLivePrice: true // Mark as having live price for UI display
          };
        });
        
        // DO NOT update portfolio context - keep it static
        // The portfolio context stays the same as when demo mode was initialized
        
        return updated;
      });
    }, refreshInterval * 1000); // Convert seconds to milliseconds

    return () => clearInterval(interval);
  }, [isActive, demoAssets.length, refreshInterval]);

  const clearDemoAssets = useCallback(() => {
    setDemoAssets([]);
    setBaseValues({});
    baseValuesRef.current = {};
    setDemoSystemData(null);
    setDemoPortfolioContext('');
    setIsActive(false);
    clearDemoFromStorage();
  }, [clearDemoFromStorage]);

  // Add demo asset (only to localStorage, never to Firebase)
  const addDemoAsset = useCallback((assetData) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemoDataContext.jsx:273',message:'addDemoAsset called',data:{isActive,assetDataName:assetData.name,assetDataCurrency:assetData.currency,assetDataOriginalValue:assetData.originalValue},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!isActive) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemoDataContext.jsx:275',message:'addDemoAsset early return - not active',data:{isActive},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return;
    }
    
    const currencyRate = 3.65;
    const newId = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newAsset = {
      ...assetData,
      id: newId,
      value: assetData.currency === 'USD' 
        ? (assetData.originalValue || 0) * currencyRate 
        : (assetData.originalValue || assetData.value || 0)
    };
    
    setDemoAssets(prev => {
      const updated = [...prev, newAsset];
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemoDataContext.jsx:312',message:'addDemoAsset inside setDemoAssets',data:{newId,newAssetValue:newAsset.value,prevCount:prev.length,updatedCount:updated.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // Update base values
      setBaseValues(prevValues => {
        const newBaseValues = {
          ...prevValues,
          [newId]: newAsset.value
        };
        baseValuesRef.current = newBaseValues;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemoDataContext.jsx:318',message:'addDemoAsset setBaseValues',data:{newId,newAssetValue:newAsset.value,baseValueSet:newBaseValues[newId]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return newBaseValues;
      });
      // Update portfolio context
      const newContext = generatePortfolioContext(updated);
      setDemoPortfolioContext(newContext);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemoDataContext.jsx:329',message:'addDemoAsset portfolio context updated',data:{newContextLength:newContext.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return updated;
    });
  }, [isActive]);

  // Update demo asset (only in localStorage, never in Firebase)
  const updateDemoAsset = useCallback((assetId, assetData) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemoDataContext.jsx:301',message:'updateDemoAsset called',data:{isActive,assetId,assetDataName:assetData.name,assetDataOriginalValue:assetData.originalValue},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (!isActive) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemoDataContext.jsx:303',message:'updateDemoAsset early return - not active',data:{isActive},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return;
    }
    
    const currencyRate = 3.65;
    const updatedAsset = {
      ...assetData,
      id: assetId,
      value: assetData.currency === 'USD' 
        ? (assetData.originalValue || 0) * currencyRate 
        : (assetData.originalValue || assetData.value || 0)
    };
    
    setDemoAssets(prev => {
      const assetExists = prev.find(a => a.id === assetId);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemoDataContext.jsx:365',message:'updateDemoAsset inside setDemoAssets',data:{assetId,updatedAssetValue:updatedAsset.value,assetExists:!!assetExists,oldValue:assetExists?.value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const updated = prev.map(asset => 
        asset.id === assetId ? updatedAsset : asset
      );
      // Update base values
      setBaseValues(prevValues => {
        const newBaseValues = {
          ...prevValues,
          [assetId]: updatedAsset.value
        };
        baseValuesRef.current = newBaseValues;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemoDataContext.jsx:372',message:'updateDemoAsset setBaseValues',data:{assetId,updatedAssetValue:updatedAsset.value,baseValueSet:newBaseValues[assetId],oldBaseValue:prevValues[assetId]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        return newBaseValues;
      });
      // Update portfolio context
      const newContext = generatePortfolioContext(updated);
      setDemoPortfolioContext(newContext);
      return updated;
    });
  }, [isActive]);

  // Delete demo asset (only from localStorage, never from Firebase)
  const deleteDemoAsset = useCallback((assetId) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemoDataContext.jsx:330',message:'deleteDemoAsset called',data:{isActive,assetId,currentBaseValue:baseValues[assetId]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (!isActive) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemoDataContext.jsx:332',message:'deleteDemoAsset early return - not active',data:{isActive},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return;
    }
    
    setDemoAssets(prev => {
      const assetExists = prev.find(a => a.id === assetId);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemoDataContext.jsx:393',message:'deleteDemoAsset inside setDemoAssets',data:{assetId,assetExists:!!assetExists,prevCount:prev.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const updated = prev.filter(asset => asset.id !== assetId);
      // Update base values
      setBaseValues(prevValues => {
        const newValues = { ...prevValues };
        const hadBaseValue = assetId in prevValues;
        delete newValues[assetId];
        baseValuesRef.current = newValues;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9e3f52cf-4e90-43db-844e-250150499d52',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemoDataContext.jsx:400',message:'deleteDemoAsset setBaseValues',data:{assetId,wasDeleted:!(assetId in newValues),hadBaseValue,oldBaseValue:prevValues[assetId],updatedCount:updated.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        return newValues;
      });
      // Update portfolio context
      const newContext = generatePortfolioContext(updated);
      setDemoPortfolioContext(newContext);
      return updated;
    });
  }, [isActive]);

  // Update demo systemData (only in localStorage, never in Firebase)
  const updateDemoSystemData = useCallback((newSystemData) => {
    if (!isActive) return;
    setDemoSystemData(newSystemData);
  }, [isActive]);

  // Toggle demo mode (for manual activation)
  const toggleDemoMode = useCallback(() => {
    if (isActive) {
      clearDemoAssets();
    } else {
      initializeDemoAssets();
    }
  }, [isActive, initializeDemoAssets, clearDemoAssets]);

  return (
    <DemoDataContext.Provider value={{ 
      demoAssets, 
      isActive, 
      demoSystemData,
      demoPortfolioContext,
      refreshInterval,
      initializeDemoAssets, 
      clearDemoAssets,
      toggleDemoMode,
      addDemoAsset,
      updateDemoAsset,
      deleteDemoAsset,
      updateDemoSystemData,
      updateRefreshInterval
    }}>
      {children}
    </DemoDataContext.Provider>
  );
};

export const useDemoData = () => {
  const context = useContext(DemoDataContext);
  if (!context) {
    throw new Error('useDemoData must be used within DemoDataProvider');
  }
  return context;
};
