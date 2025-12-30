import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEFAULT_SYSTEM_DATA } from '../constants/defaults';
import { generatePortfolioContext } from '../utils/aiContext';

const DemoDataContext = createContext();

const DEMO_MODE_KEY = 'myWealth_demoMode';
const DEMO_ASSETS_KEY = 'myWealth_demoAssets';
const DEMO_SYSTEM_DATA_KEY = 'myWealth_demoSystemData';
const DEMO_PORTFOLIO_CONTEXT_KEY = 'myWealth_demoPortfolioContext';

/**
 * Demo Data Context - Provides demo assets locally (saved to localStorage, never to Firebase)
 * Used during the tour to show realistic data and for manual demo mode
 */
export const DemoDataProvider = ({ children }) => {
  const [demoAssets, setDemoAssets] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const [baseValues, setBaseValues] = useState({});
  const [demoSystemData, setDemoSystemData] = useState(null);
  const [demoPortfolioContext, setDemoPortfolioContext] = useState('');

  // Initialize demo assets function (defined before useEffect that uses it)
  const initializeDemoAssets = useCallback(() => {
    const currencyRate = 3.65;
    
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

    // Calculate values and add to assets
    const assetsWithValues = baseAssets.map(asset => ({
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
    const demoCategories = [...new Set(baseAssets.map(a => a.category))];
    const demoPlatforms = [...new Set(baseAssets.map(a => a.platform))];
    const demoInstruments = [...new Set(baseAssets.map(a => a.instrument))];
    const demoSymbols = [...new Set(baseAssets.map(a => a.symbol).filter(Boolean))];
    
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
    if (isActive && demoAssets.length > 0) {
      localStorage.setItem(DEMO_MODE_KEY, 'true');
      localStorage.setItem(DEMO_ASSETS_KEY, JSON.stringify(demoAssets));
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

  // Animate values - very slight variations every 3 seconds (no portfolio context update)
  useEffect(() => {
    if (!isActive || demoAssets.length === 0) return;

    const interval = setInterval(() => {
      setDemoAssets(prev => {
        const updated = prev.map(asset => {
          const baseValue = baseValues[asset.id] || 0;
          // Very small random variation between -0.1% and +0.1% (much smaller than before)
          const variation = (Math.random() - 0.5) * 0.002; // Changed from 0.01 to 0.002
          const newValue = baseValue * (1 + variation);
          
          return {
            ...asset,
            value: Math.round(newValue),
            originalValue: asset.currency === 'USD' 
              ? Math.round(newValue / 3.65)
              : Math.round(newValue)
          };
        });
        
        // DO NOT update portfolio context - keep it static
        // The portfolio context stays the same as when demo mode was initialized
        
        return updated;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isActive, demoAssets.length, baseValues]);

  const clearDemoAssets = useCallback(() => {
    setDemoAssets([]);
    setBaseValues({});
    setDemoSystemData(null);
    setDemoPortfolioContext('');
    setIsActive(false);
    clearDemoFromStorage();
  }, [clearDemoFromStorage]);

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
      initializeDemoAssets, 
      clearDemoAssets,
      toggleDemoMode
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
