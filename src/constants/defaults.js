/**
 * Default system data and initial seed data
 */

// Helper function to generate random color
export const generateRandomColor = () => {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#6366F1', '#EC4899', '#14B8A6', '#F97316', '#06B6D4',
    '#84CC16', '#A855F7', '#22C55E', '#EAB308', '#F43F5E'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Fixed data that cannot be deleted (always present)
export const FIXED_INSTRUMENTS = [
  { name: "ILS", color: "#10B981", isFixed: true },
  { name: "USD", color: "#22C55E", isFixed: true }
];

export const FIXED_CATEGORIES = [
  { name: "מניות", color: "#3B82F6", isFixed: true }, // Blue
  { name: "קריפטו", color: "#F59E0B", isFixed: true }, // Yellow
  { name: "מזומן", color: "#10B981", isFixed: true } // Green
];

export const DEFAULT_SYSTEM_DATA = {
  platforms: [
    { name: "פסגות", color: "#A855F7" },
    { name: "מיטב", color: "#10B981" },
    { name: "בנק הפועלים", color: "#EF4444" },
    { name: "Binance", color: "#F59E0B" },
    { name: "Bybit", color: "#141414" },
    { name: "Exodus", color: "#6366F1" },
    { name: "Blink", color: "#10B981" },
    { name: "אחר", color: "#94A3B8" }
  ],
  instruments: [
    ...FIXED_INSTRUMENTS,
    { name: "מזומן (ILS)", color: "#10B981" },
    { name: "מזומן (USD)", color: "#22C55E" },
    { name: "מניה בודדת", color: "#3B82F6" },
    { name: "קרן סל (ETF)", color: "#6366F1" },
    { name: "קרן נאמנות", color: "#8B5CF6" },
    { name: "קרן כספית", color: "#A855F7" },
    { name: "Bitcoin", color: "#F59E0B" },
    { name: "Ethereum", color: "#6366F1" },
    { name: "קרן השתלמות", color: "#F43F5E" },
    { name: "פנסיה", color: "#8B5CF6" },
    { name: "נדלן", color: "#A8A29E" },
    { name: "אחר", color: "#64748B" }
  ],
  categories: [
    ...FIXED_CATEGORIES,
    { name: "נדלן", color: "#8B5CF6" },
    { name: "אחר", color: "#64748B" }
  ],
  symbols: [
    { name: "ILS", color: "#10B981" },
    { name: "RTY", color: "#3B82F6" },
    { name: "URTH", color: "#6366F1" },
    { name: "EEM", color: "#8B5CF6" },
    { name: "XLE", color: "#F59E0B" },
    { name: "OKLO", color: "#EF4444" },
    { name: "ETH", color: "#6366F1" },
    { name: "BTC", color: "#F59E0B" },
    { name: "MMF", color: "#10B981" },
    { name: "POLI", color: "#EF4444" },
    { name: "USD", color: "#22C55E" },
    { name: "SPX", color: "#3B82F6" },
    { name: "TON", color: "#06B6D4" },
    { name: "USDT", color: "#14B8A6" },
    { name: "SOL", color: "#A855F7" }
  ]
};
export const INITIAL_ASSETS_SEED = [
  // --- פסגות ---
  { name: "יתרה בפסגות", symbol: "ILS", platform: "פסגות", category: "מזומן", instrument: "מזומן (ILS)", currency: "ILS", originalValue: 47033, value: 47033, tags: ["נזיל", "לא מושקע"] },
  { name: "Invesco Russell 2000", symbol: "RTY", platform: "פסגות", category: "מניות", instrument: "קרן סל (ETF)", currency: "ILS", originalValue: 2874, value: 2874, tags: ["ארהב", "Small Cap", "מדד"] },
  { name: "Invesco MSCI World", symbol: "URTH", platform: "פסגות", category: "מניות", instrument: "קרן סל (ETF)", currency: "ILS", originalValue: 2700, value: 2700, tags: ["עולמי", "מפוזר", "מדד"] },
  { name: "Invesco Emerging Mkts", symbol: "EEM", platform: "פסגות", category: "מניות", instrument: "קרן סל (ETF)", currency: "ILS", originalValue: 2630, value: 2630, tags: ["מתעוררים", "סיכון גבוה"] },
  { name: "S&P Energy ETF", symbol: "XLE", platform: "פסגות", category: "מניות", instrument: "קרן סל (ETF)", currency: "ILS", originalValue: 1434, value: 1434, tags: ["ארהב", "סקטוריאלי", "אנרגיה"] },
  { name: "OKLO Stock", symbol: "OKLO", platform: "פסגות", category: "מניות", instrument: "מניה בודדת", currency: "ILS", originalValue: 491, value: 491, tags: ["גרעין", "ספקולטיבי"] },
  
  // קריפטו בתוך פסגות
  { name: "תכלית Ethereum", symbol: "ETH", platform: "פסגות", category: "קריפטו", instrument: "קרן סל (ETF)", currency: "ILS", originalValue: 1693, value: 1693, tags: ["ETH", "שוק ההון"] },
  { name: "תכלית Bitcoin", symbol: "BTC", platform: "פסגות", category: "קריפטו", instrument: "קרן סל (ETF)", currency: "ILS", originalValue: 938, value: 938, tags: ["BTC", "שוק ההון"] },
  { name: "IBIT (Bitcoin ETF)", symbol: "BTC", platform: "פסגות", category: "קריפטו", instrument: "קרן סל (ETF)", currency: "ILS", originalValue: 316, value: 316, tags: ["BTC", "שוק ההון"] },

  // --- בנק הפועלים ---
  { name: "קרן כספית איילון", symbol: "MMF", platform: "בנק הפועלים", category: "מזומן", instrument: "קרן כספית", currency: "ILS", originalValue: 30115, value: 30115, tags: ["סולידי", "נזיל", "תחליף פיקדון"] },
  { name: "מניית בנק הפועלים", symbol: "POLI", platform: "בנק הפועלים", category: "מניות", instrument: "מניה בודדת", currency: "ILS", originalValue: 285, value: 285, tags: ["ישראל", "בנקים"] },

  // --- Blink ---
  { name: "Buying Power", symbol: "USD", platform: "Blink", category: "מזומן", instrument: "מזומן (USD)", currency: "USD", originalValue: 2181, value: 2181 * 3.65, tags: ["מטח", "נזיל", "חול"] },

  // --- מיטב ---
  { name: "קרן השתלמות", symbol: "SPX", platform: "מיטב", category: "מניות", instrument: "קרן השתלמות", currency: "ILS", originalValue: 7400, value: 7400, tags: ["פנסיוני", "ארהב", "מדד", "S&P 500"] },
  { name: "הפקדה בתהליך", symbol: "ILS", platform: "מיטב", category: "מזומן", instrument: "מזומן (ILS)", currency: "ILS", originalValue: 21240, value: 21240, tags: ["נזיל", "פנסיוני"] },

  // --- קריפטו חיצוני ---
  { name: "Tonkeeper Wallet", symbol: "TON", platform: "אחר", category: "קריפטו", instrument: "אחר", currency: "USD", originalValue: 1210, value: 1210 * 3.65, tags: ["TON", "ארנק פרטי"] },
  { name: "Bybit Staking", symbol: "USDT", platform: "Bybit", category: "קריפטו", instrument: "אחר", currency: "USD", originalValue: 979, value: 979 * 3.65, tags: ["Staking", "בורסה", "תשואה"] },
  { name: "Exodus Wallet", symbol: "SOL", platform: "Exodus", category: "קריפטו", instrument: "אחר", currency: "USD", originalValue: 260, value: 260 * 3.65, tags: ["SOL", "ארנק פרטי"] }
];
