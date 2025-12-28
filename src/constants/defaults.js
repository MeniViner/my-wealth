/**
 * Default system data and initial seed data
 */

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
    { name: "מניות", color: "#3B82F6" },
    { name: "קריפטו", color: "#F59E0B" },
    { name: "מזומן", color: "#10B981" },
    { name: "נדלן", color: "#8B5CF6" },
    { name: "אחר", color: "#64748B" }
  ]
};
export const INITIAL_ASSETS_SEED = [
  { name: "יתרה בפסגות", platform: "פסגות", category: "מזומן", instrument: "מזומן (ILS)", currency: "ILS", originalValue: 47033, value: 47033, tags: ["נזיל", "לא מושקע"] },
  { name: "Invesco Russell 2000", platform: "פסגות", category: "מניות", instrument: "קרן סל (ETF)", currency: "ILS", originalValue: 2874, value: 2874, tags: ["ארהב", "Small Cap", "מדד"] },
  { name: "Invesco MSCI World", platform: "פסגות", category: "מניות", instrument: "קרן סל (ETF)", currency: "ILS", originalValue: 2700, value: 2700, tags: ["עולמי", "מפוזר", "מדד"] },
  { name: "Invesco Emerging Mkts", platform: "פסגות", category: "מניות", instrument: "קרן סל (ETF)", currency: "ILS", originalValue: 2630, value: 2630, tags: ["מתעוררים", "סיכון גבוה"] },
  { name: "S&P Energy ETF", platform: "פסגות", category: "מניות", instrument: "קרן סל (ETF)", currency: "ILS", originalValue: 1434, value: 1434, tags: ["ארהב", "סקטוריאלי", "אנרגיה"] },
  { name: "OKLO Stock", platform: "פסגות", category: "מניות", instrument: "מניה בודדת", currency: "ILS", originalValue: 491, value: 491, tags: ["גרעין", "ספקולטיבי"] },
  { name: "תכלית Ethereum", platform: "פסגות", category: "קריפטו", instrument: "קרן סל (ETF)", currency: "ILS", originalValue: 1693, value: 1693, tags: ["ETH", "שוק ההון"] },
  { name: "תכלית Bitcoin", platform: "פסגות", category: "קריפטו", instrument: "קרן סל (ETF)", currency: "ILS", originalValue: 938, value: 938, tags: ["BTC", "שוק ההון"] },
  { name: "IBIT (Bitcoin ETF)", platform: "פסגות", category: "קריפטו", instrument: "קרן סל (ETF)", currency: "ILS", originalValue: 316, value: 316, tags: ["BTC", "שוק ההון"] },
  { name: "קרן כספית איילון", platform: "בנק הפועלים", category: "מזומן", instrument: "קרן כספית", currency: "ILS", originalValue: 30115, value: 30115, tags: ["סולידי", "נזיל", "תחליף פיקדון"] },
  { name: "מניית בנק הפועלים", platform: "בנק הפועלים", category: "מניות", instrument: "מניה בודדת", currency: "ILS", originalValue: 285, value: 285, tags: ["ישראל", "בנקים"] },
  { name: "Buying Power", platform: "Blink", category: "מזומן", instrument: "מזומן (USD)", currency: "USD", originalValue: 2181, value: 2181 * 3.65, tags: ["מטח", "נזיל", "חול"] },
  { name: "קרן השתלמות", platform: "מיטב", category: "מניות", instrument: "קרן השתלמות", currency: "ILS", originalValue: 7400, value: 7400, tags: ["פנסיוני", "ארהב", "מדד", "S&P 500"] },
  { name: "הפקדה בתהליך", platform: "מיטב", category: "מזומן", instrument: "מזומן (ILS)", currency: "ILS", originalValue: 21240, value: 21240, tags: ["נזיל", "פנסיוני"] },
  { name: "Tonkeeper Wallet", platform: "אחר", category: "קריפטו", instrument: "אחר", currency: "USD", originalValue: 1210, value: 1210 * 3.65, tags: ["TON", "ארנק פרטי"] },
  { name: "Bybit Staking", platform: "Bybit", category: "קריפטו", instrument: "אחר", currency: "USD", originalValue: 979, value: 979 * 3.65, tags: ["Staking", "בורסה", "תשואה"] },
  { name: "Exodus Wallet", platform: "Exodus", category: "קריפטו", instrument: "אחר", currency: "USD", originalValue: 260, value: 260 * 3.65, tags: ["SOL", "ארנק פרטי"] }
];
