import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DemoDataContext = createContext();

/**
 * Demo Data Context - Provides demo assets locally (not saved to Firebase)
 * Used during the tour to show realistic data
 */
export const DemoDataProvider = ({ children }) => {
  const [demoAssets, setDemoAssets] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const [baseValues, setBaseValues] = useState({});

  // Initialize base values for demo assets
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

    // Store base values
    const values = {};
    baseAssets.forEach(asset => {
      values[asset.id] = asset.currency === 'USD' 
        ? asset.originalValue * currencyRate 
        : asset.originalValue;
    });
    setBaseValues(values);
    setDemoAssets(baseAssets);
    setIsActive(true);
  }, []);

  // Animate values - slight variations every second
  useEffect(() => {
    if (!isActive || demoAssets.length === 0) return;

    const interval = setInterval(() => {
      setDemoAssets(prev => prev.map(asset => {
        const baseValue = baseValues[asset.id] || 0;
        // Random variation between -0.5% and +0.5%
        const variation = (Math.random() - 0.5) * 0.01;
        const newValue = baseValue * (1 + variation);
        
        return {
          ...asset,
          value: Math.round(newValue),
          originalValue: asset.currency === 'USD' 
            ? Math.round(newValue / 3.65)
            : Math.round(newValue)
        };
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, demoAssets.length, baseValues]);

  const clearDemoAssets = useCallback(() => {
    setDemoAssets([]);
    setBaseValues({});
    setIsActive(false);
  }, []);

  return (
    <DemoDataContext.Provider value={{ 
      demoAssets, 
      isActive, 
      initializeDemoAssets, 
      clearDemoAssets 
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

