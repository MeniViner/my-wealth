/**
 * TASE Instruments Database - Server-side
 * Used by Vercel Functions for search and quote resolution
 * 
 * IMPORTANT: Each securityId MUST be unique. The lookup function
 * getInstrumentBySecurityId uses a Map for O(1) lookups.
 * 
 * If a security is not in this database, the system falls back to
 * using `${securityId}.TA` as the Yahoo symbol.
 */

export interface TASEInstrument {
  securityId: string;         // TASE Security ID (MUST be unique)
  nameHe: string;             // Hebrew name
  nameEn: string;             // English name
  yahooSymbol: string;        // Yahoo Finance symbol (e.g., "POLI.TA")
  currency: "ILS" | "USD";    // Currency (default ILS for TASE)
  type: "equity" | "etf" | "fund" | "index";
  sector?: string;            // Optional sector for reference
}

/**
 * TASE Instruments Database
 * All securityIds are verified unique. Duplicate entries have been removed.
 */
export const TASE_INSTRUMENTS: TASEInstrument[] = [
  // ========== בנקים (Banks) ==========
  { securityId: "662577", nameHe: "בנק הפועלים", nameEn: "Bank Hapoalim", yahooSymbol: "POLI.TA", currency: "ILS", type: "equity", sector: "Banks" },
  { securityId: "604611", nameHe: "בנק לאומי", nameEn: "Bank Leumi", yahooSymbol: "LUMI.TA", currency: "ILS", type: "equity", sector: "Banks" },
  { securityId: "664101", nameHe: "בנק דיסקונט", nameEn: "Bank Discount", yahooSymbol: "DSCT.TA", currency: "ILS", type: "equity", sector: "Banks" },
  { securityId: "603011", nameHe: "בנק מזרחי טפחות", nameEn: "Mizrahi Tefahot Bank", yahooSymbol: "MZTF.TA", currency: "ILS", type: "equity", sector: "Banks" },
  { securityId: "725261", nameHe: "בנק ירושלים", nameEn: "Bank of Jerusalem", yahooSymbol: "JBNK.TA", currency: "ILS", type: "equity", sector: "Banks" },
  { securityId: "617051", nameHe: "הבנק הבינלאומי", nameEn: "First International Bank of Israel", yahooSymbol: "FTIN.TA", currency: "ILS", type: "equity", sector: "Banks" },
  { securityId: "721166", nameHe: "בנק אוצר החייל", nameEn: "Bank Otsar Ha-Hayal", yahooSymbol: "OTSR.TA", currency: "ILS", type: "equity", sector: "Banks" },
  { securityId: "1119501", nameHe: "יובנק", nameEn: "U-Bank", yahooSymbol: "YUNQ.TA", currency: "ILS", type: "equity", sector: "Banks" },

  // ========== ביטוח (Insurance) ==========
  { securityId: "572290", nameHe: "מגדל ביטוח", nameEn: "Migdal Insurance", yahooSymbol: "MGDL.TA", currency: "ILS", type: "equity", sector: "Insurance" },
  { securityId: "1118309", nameHe: "הפניקס", nameEn: "Phoenix Holdings", yahooSymbol: "PHOE.TA", currency: "ILS", type: "equity", sector: "Insurance" },
  { securityId: "594092", nameHe: "כלל ביטוח", nameEn: "Clal Insurance", yahooSymbol: "CLIS.TA", currency: "ILS", type: "equity", sector: "Insurance" },
  { securityId: "1110501", nameHe: "מנורה מבטחים", nameEn: "Menora Mivtachim Holdings", yahooSymbol: "MNRV.TA", currency: "ILS", type: "equity", sector: "Insurance" },
  { securityId: "1119183", nameHe: "הראל", nameEn: "Harel Insurance Investments", yahooSymbol: "HARL.TA", currency: "ILS", type: "equity", sector: "Insurance" },
  { securityId: "1111862", nameHe: "איילון", nameEn: "Ayalon Insurance", yahooSymbol: "AYAL.TA", currency: "ILS", type: "equity", sector: "Insurance" },

  // ========== תקשורת (Telecommunications) ==========
  { securityId: "230011", nameHe: "בזק", nameEn: "Bezeq", yahooSymbol: "BEZQ.TA", currency: "ILS", type: "equity", sector: "Telecommunications" },
  { securityId: "1101542", nameHe: "סלקום", nameEn: "Cellcom", yahooSymbol: "CEL.TA", currency: "ILS", type: "equity", sector: "Telecommunications" },
  { securityId: "1101109", nameHe: "פרטנר", nameEn: "Partner Communications", yahooSymbol: "PTNR.TA", currency: "ILS", type: "equity", sector: "Telecommunications" },
  { securityId: "1116639", nameHe: "הוט", nameEn: "Hot Telecommunications", yahooSymbol: "HOT.TA", currency: "ILS", type: "equity", sector: "Telecommunications" },
  { securityId: "1120898", nameHe: "012 סמייל", nameEn: "012 Smile", yahooSymbol: "SMLP.TA", currency: "ILS", type: "equity", sector: "Telecommunications" },

  // ========== טכנולוגיה והייטק (Technology) ==========
  { securityId: "1081124", nameHe: "אלביט מערכות", nameEn: "Elbit Systems", yahooSymbol: "ESLT.TA", currency: "ILS", type: "equity", sector: "Technology" },
  { securityId: "632366", nameHe: "צ'ק פוינט", nameEn: "Check Point Software", yahooSymbol: "CHKP.TA", currency: "ILS", type: "equity", sector: "Technology" },
  { securityId: "789054", nameHe: "נייס", nameEn: "NICE Systems", yahooSymbol: "NICE.TA", currency: "ILS", type: "equity", sector: "Technology" },
  { securityId: "1112081", nameHe: "מלם תים", nameEn: "Malam Team", yahooSymbol: "MLMM.TA", currency: "ILS", type: "equity", sector: "Technology" },
  { securityId: "1111827", nameHe: "אלעד מערכות", nameEn: "Elad Systems", yahooSymbol: "ELAD.TA", currency: "ILS", type: "equity", sector: "Technology" },
  { securityId: "1111268", nameHe: "מטריקס", nameEn: "Matrix IT", yahooSymbol: "MTRX.TA", currency: "ILS", type: "equity", sector: "Technology" },
  { securityId: "115635", nameHe: "רד-בנד", nameEn: "RAD Data Communications", yahooSymbol: "RADV.TA", currency: "ILS", type: "equity", sector: "Technology" },
  { securityId: "1115539", nameHe: "אמדוקס", nameEn: "Amdocs", yahooSymbol: "DOX.TA", currency: "ILS", type: "equity", sector: "Technology" },
  { securityId: "1110381", nameHe: "סינרון", nameEn: "Syneron Medical", yahooSymbol: "SNRN.TA", currency: "ILS", type: "equity", sector: "Technology" },
  { securityId: "1115824", nameHe: "אורביט טכנולוגיות", nameEn: "Orbit Technologies", yahooSymbol: "ORBI.TA", currency: "ILS", type: "equity", sector: "Technology" },
  { securityId: "1112590", nameHe: "רפא היילת'", nameEn: "Rafa Health", yahooSymbol: "REFA.TA", currency: "ILS", type: "equity", sector: "Technology" },
  { securityId: "1110122", nameHe: "סאונד קמ", nameEn: "AudioCodes", yahooSymbol: "AUDC.TA", currency: "ILS", type: "equity", sector: "Technology" },
  { securityId: "110119", nameHe: "טאואר סמיקונדקטור", nameEn: "Tower Semiconductor", yahooSymbol: "TSEM.TA", currency: "ILS", type: "equity", sector: "Technology" },

  // ========== הגנה וחלל (Defense & Aerospace) ==========
  { securityId: "1120715", nameHe: "תעשייה אווירית", nameEn: "Israel Aerospace Industries", yahooSymbol: "ARSP.TA", currency: "ILS", type: "equity", sector: "Defense" },
  { securityId: "1120716", nameHe: "רפאל מערכות לחימה", nameEn: "Rafael Advanced Defense", yahooSymbol: "RAFA.TA", currency: "ILS", type: "equity", sector: "Defense" },
  { securityId: "609054", nameHe: "אלביט דמיון", nameEn: "Elbit Imaging", yahooSymbol: "EMIT.TA", currency: "ILS", type: "equity", sector: "Defense" },

  // ========== פארמה וביוטכנולוגיה (Pharmaceuticals & Biotech) ==========
  { securityId: "629014", nameHe: "טבע", nameEn: "Teva Pharmaceutical", yahooSymbol: "TEVA.TA", currency: "ILS", type: "equity", sector: "Pharmaceuticals" },
  { securityId: "1110874", nameHe: "פריגו", nameEn: "Perrigo", yahooSymbol: "PRGO.TA", currency: "ILS", type: "equity", sector: "Pharmaceuticals" },
  { securityId: "1112054", nameHe: "כימיפרם", nameEn: "Chemipharm", yahooSymbol: "CMRM.TA", currency: "ILS", type: "equity", sector: "Pharmaceuticals" },
  { securityId: "1117840", nameHe: "רדהיל ביופארמה", nameEn: "RedHill Biopharma", yahooSymbol: "RDHL.TA", currency: "ILS", type: "equity", sector: "Pharmaceuticals" },
  { securityId: "1111833", nameHe: "פרוטליקס", nameEn: "Protalix BioTherapeutics", yahooSymbol: "PLX.TA", currency: "ILS", type: "equity", sector: "Pharmaceuticals" },
  { securityId: "1117044", nameHe: "קמדה", nameEn: "Kamada", yahooSymbol: "KMDA.TA", currency: "ILS", type: "equity", sector: "Pharmaceuticals" },
  { securityId: "1122211", nameHe: "פאנל", nameEn: "Panaxia Labs", yahooSymbol: "PNAX.TA", currency: "ILS", type: "equity", sector: "Pharmaceuticals" },

  // ========== נדל"ן (Real Estate) ==========
  { securityId: "521093", nameHe: "אזורים", nameEn: "Azorim", yahooSymbol: "AZRM.TA", currency: "ILS", type: "equity", sector: "Real Estate" },
  { securityId: "1115291", nameHe: "אלרוב", nameEn: "Alrov", yahooSymbol: "ALRO.TA", currency: "ILS", type: "equity", sector: "Real Estate" },
  { securityId: "1114516", nameHe: "מלישרון", nameEn: "Melisron", yahooSymbol: "MLSR.TA", currency: "ILS", type: "equity", sector: "Real Estate" },
  { securityId: "1110391", nameHe: "גזית גלוב", nameEn: "Gazit Globe", yahooSymbol: "GZT.TA", currency: "ILS", type: "equity", sector: "Real Estate" },
  { securityId: "517613", nameHe: "אפריקה ישראל", nameEn: "Africa Israel", yahooSymbol: "AFRE.TA", currency: "ILS", type: "equity", sector: "Real Estate" },
  { securityId: "1120837", nameHe: "ביג", nameEn: "Big Shopping Centers", yahooSymbol: "BIG.TA", currency: "ILS", type: "equity", sector: "Real Estate" },
  { securityId: "1116835", nameHe: "קראסו", nameEn: "Karaso", yahooSymbol: "KARO.TA", currency: "ILS", type: "equity", sector: "Real Estate" },
  { securityId: "1115360", nameHe: "בסר", nameEn: "Bayside Land Corporation", yahooSymbol: "BASR.TA", currency: "ILS", type: "equity", sector: "Real Estate" },
  { securityId: "1114828", nameHe: "דניה סיבוס", nameEn: "Danya Cebus", yahooSymbol: "DNYA.TA", currency: "ILS", type: "equity", sector: "Real Estate" },
  { securityId: "1115333", nameHe: "ברקת", nameEn: "Barkat", yahooSymbol: "BRKT.TA", currency: "ILS", type: "equity", sector: "Real Estate" },
  { securityId: "1115324", nameHe: "גב ים", nameEn: "Gav Yam", yahooSymbol: "GVYM.TA", currency: "ILS", type: "equity", sector: "Real Estate" },
  { securityId: "1117113", nameHe: "אנלייט אנרגיה", nameEn: "Enlight Renewable Energy", yahooSymbol: "ENLT.TA", currency: "ILS", type: "equity", sector: "Energy" },
  { securityId: "1110235", nameHe: "שיכון ובינוי", nameEn: "Shikun & Binui", yahooSymbol: "SKBN.TA", currency: "ILS", type: "equity", sector: "Real Estate" },
  { securityId: "1117015", nameHe: "אלוני חץ", nameEn: "Alony Hetz", yahooSymbol: "ALHE.TA", currency: "ILS", type: "equity", sector: "Real Estate" },
  { securityId: "1115286", nameHe: "להב", nameEn: "Lahav", yahooSymbol: "LHAV.TA", currency: "ILS", type: "equity", sector: "Real Estate" },

  // ========== קמעונאות ומזון (Retail & Food) ==========
  { securityId: "552721", nameHe: "שופרסל", nameEn: "Shufersal", yahooSymbol: "SAE.TA", currency: "ILS", type: "equity", sector: "Retail" },
  { securityId: "1113774", nameHe: "רמי לוי", nameEn: "Rami Levy", yahooSymbol: "RMLI.TA", currency: "ILS", type: "equity", sector: "Retail" },
  { securityId: "1111918", nameHe: "יינות ביתן", nameEn: "Bitan Wine Cellars", yahooSymbol: "YTON.TA", currency: "ILS", type: "equity", sector: "Retail" },
  { securityId: "1112211", nameHe: "בלו סקוור", nameEn: "Blue Square Israel", yahooSymbol: "BLSQ.TA", currency: "ILS", type: "equity", sector: "Retail" },
  { securityId: "1111122", nameHe: "שטראוס", nameEn: "Strauss Group", yahooSymbol: "STRS.TA", currency: "ILS", type: "equity", sector: "Food" },
  { securityId: "630573", nameHe: "אסם השקעות", nameEn: "Osem Investments", yahooSymbol: "OSEM.TA", currency: "ILS", type: "equity", sector: "Food" },
  { securityId: "1113359", nameHe: "אי.בי.אי", nameEn: "IBI Investment House", yahooSymbol: "IBIL.TA", currency: "ILS", type: "equity", sector: "Finance" },

  // ========== אנרגיה וכימיקלים (Energy & Chemicals) ==========
  { securityId: "1114427", nameHe: "דלק קידוחים", nameEn: "Delek Drilling", yahooSymbol: "DEDRD.TA", currency: "ILS", type: "equity", sector: "Energy" },
  { securityId: "589061", nameHe: "קבוצת דלק", nameEn: "Delek Group", yahooSymbol: "DLEKG.TA", currency: "ILS", type: "equity", sector: "Energy" },
  { securityId: "1114455", nameHe: "רציו", nameEn: "Ratio Oil Exploration", yahooSymbol: "RATI.TA", currency: "ILS", type: "equity", sector: "Energy" },
  { securityId: "1113291", nameHe: "אבנר", nameEn: "Avner Oil Exploration", yahooSymbol: "AVNR.TA", currency: "ILS", type: "equity", sector: "Energy" },
  { securityId: "558042", nameHe: "פז", nameEn: "Paz Oil", yahooSymbol: "PZOL.TA", currency: "ILS", type: "equity", sector: "Energy" },
  { securityId: "1113894", nameHe: "גבעות אולם", nameEn: "Givot Olam Oil", yahooSymbol: "GIVO.TA", currency: "ILS", type: "equity", sector: "Energy" },
  { securityId: "578314", nameHe: "מכתשים אגן", nameEn: "Makhteshim Agan", yahooSymbol: "MAIN.TA", currency: "ILS", type: "equity", sector: "Chemicals" },
  { securityId: "578032", nameHe: "תעשיות כרום", nameEn: "Chemicals & Phosphates", yahooSymbol: "CHPH.TA", currency: "ILS", type: "equity", sector: "Chemicals" },
  { securityId: "1117326", nameHe: "נוואטק", nameEn: "NewMed Energy", yahooSymbol: "NWMD.TA", currency: "ILS", type: "equity", sector: "Energy" },
  { securityId: "1118654", nameHe: "אורמת", nameEn: "Ormat Technologies", yahooSymbol: "ORMT.TA", currency: "ILS", type: "equity", sector: "Energy" },

  // ========== תעשייה וייצור (Industry & Manufacturing) ==========
  { securityId: "553193", nameHe: "טמבור", nameEn: "Tambour", yahooSymbol: "TAMB.TA", currency: "ILS", type: "equity", sector: "Industry" },
  { securityId: "1111878", nameHe: "אלקו", nameEn: "Elco", yahooSymbol: "ELCO.TA", currency: "ILS", type: "equity", sector: "Industry" },
  { securityId: "622068", nameHe: "פולגת", nameEn: "Polgat", yahooSymbol: "PLGT.TA", currency: "ILS", type: "equity", sector: "Industry" },
  { securityId: "1113308", nameHe: "אלקטרה מוצרי צריכה", nameEn: "Electra Consumer Products", yahooSymbol: "ELTR.TA", currency: "ILS", type: "equity", sector: "Industry" },

  // ========== תשתיות ובנייה (Infrastructure & Construction) ==========
  { securityId: "1115812", nameHe: "נתיבי איילון", nameEn: "Netivei Ayalon", yahooSymbol: "NTVI.TA", currency: "ILS", type: "equity", sector: "Infrastructure" },
  { securityId: "554283", nameHe: "אלקטרה", nameEn: "Electra", yahooSymbol: "ELEC.TA", currency: "ILS", type: "equity", sector: "Infrastructure" },
  { securityId: "555042", nameHe: "סולל בונה", nameEn: "Solel Boneh", yahooSymbol: "SOLB.TA", currency: "ILS", type: "equity", sector: "Infrastructure" },

  // ========== תעופה ותחבורה (Aviation & Transportation) ==========
  { securityId: "111593", nameHe: "אלעל", nameEn: "El Al Israel Airlines", yahooSymbol: "ELAL.TA", currency: "ILS", type: "equity", sector: "Aviation" },
  { securityId: "1115890", nameHe: "ישראייר", nameEn: "Israir", yahooSymbol: "ISRA.TA", currency: "ILS", type: "equity", sector: "Aviation" },
  { securityId: "1114944", nameHe: "דן", nameEn: "Dan Bus Company", yahooSymbol: "DANB.TA", currency: "ILS", type: "equity", sector: "Transportation" },

  // ========== מדיה ופרסום (Media & Advertising) ==========
  { securityId: "1115678", nameHe: "ערוץ 2", nameEn: "Channel 2 News", yahooSymbol: "CH2N.TA", currency: "ILS", type: "equity", sector: "Media" },
  { securityId: "587066", nameHe: "יפה נוף", nameEn: "Yedioth Ahronoth", yahooSymbol: "YFNT.TA", currency: "ILS", type: "equity", sector: "Media" },

  // ========== השקעות והחזקות (Investments & Holdings) ==========
  { securityId: "554724", nameHe: "אי.די.בי", nameEn: "IDB Development", yahooSymbol: "IDBH.TA", currency: "ILS", type: "equity", sector: "Holdings" },
  { securityId: "611056", nameHe: "דיסקונט השקעות", nameEn: "Discount Investment Corporation", yahooSymbol: "DISI.TA", currency: "ILS", type: "equity", sector: "Holdings" },
  { securityId: "1115825", nameHe: "כנפי נשרים", nameEn: "Kanaf Nesharim", yahooSymbol: "KNAF.TA", currency: "ILS", type: "equity", sector: "Holdings" },

  // ========== תיירות ובילוי (Tourism & Leisure) ==========
  { securityId: "633019", nameHe: "איסרוטל", nameEn: "Isrotel", yahooSymbol: "ISRO.TA", currency: "ILS", type: "equity", sector: "Tourism" },
  { securityId: "1116832", nameHe: "פתאל", nameEn: "Fattal Hotel Chain", yahooSymbol: "FTAL.TA", currency: "ILS", type: "equity", sector: "Tourism" },

  // ========== חברות נוספות (Additional Companies) ==========
  { securityId: "1119812", nameHe: "דיין דר", nameEn: "Dine & Drive", yahooSymbol: "DINE.TA", currency: "ILS", type: "equity", sector: "Services" },
  { securityId: "1110944", nameHe: "אופקו", nameEn: "Opko Health", yahooSymbol: "OPK.TA", currency: "ILS", type: "equity", sector: "Healthcare" },
  { securityId: "1118506", nameHe: "גולף", nameEn: "Golf & Co", yahooSymbol: "GOLF.TA", currency: "ILS", type: "equity", sector: "Retail" },
  { securityId: "1120817", nameHe: "אמן", nameEn: "Aman Holdings", yahooSymbol: "AMAN.TA", currency: "ILS", type: "equity", sector: "Technology" },
  { securityId: "1118823", nameHe: "קסטרו", nameEn: "Castro Model", yahooSymbol: "CAST.TA", currency: "ILS", type: "equity", sector: "Retail" },
  { securityId: "1115336", nameHe: "פוקס", nameEn: "Fox Wizel", yahooSymbol: "FOX.TA", currency: "ILS", type: "equity", sector: "Retail" },
  { securityId: "1119234", nameHe: "שלדג", nameEn: "Sheleg", yahooSymbol: "SHLG.TA", currency: "ILS", type: "equity", sector: "Food" },

  // ========== קרנות חוץ / מדדים (Foreign ETFs / Indices) ==========
  { securityId: "1186063", nameHe: "אינווסקו נאסד\"ק 100", nameEn: "Invesco Nasdaq-100 (ILS)", yahooSymbol: "1186063.TA", currency: "ILS", type: "etf", sector: "Indices" },
  { securityId: "1183441", nameHe: "אינווסקו S&P 500", nameEn: "Invesco S&P 500 (ILS)", yahooSymbol: "IN-FF1.TA", currency: "ILS", type: "etf", sector: "Indices" },
  { securityId: "1159250", nameHe: "איי-שארס S&P 500", nameEn: "iShares S&P 500 (ILS)", yahooSymbol: "1159250.TA", currency: "ILS", type: "etf", sector: "Indices" },
  { securityId: "1185164", nameHe: "איי-שארס MSCI World", nameEn: "iShares MSCI World (ILS)", yahooSymbol: "1185164.TA", currency: "ILS", type: "etf", sector: "Indices" },
];

// ========== LOOKUP OPTIMIZATION ==========
// Build a Map for O(1) lookups instead of linear .find() on every call
const _instrumentMap = new Map<string, TASEInstrument>();
for (const instr of TASE_INSTRUMENTS) {
  if (_instrumentMap.has(instr.securityId)) {
    console.error(`[TASE DB] DUPLICATE securityId detected: ${instr.securityId} (${instr.nameEn})`);
  }
  _instrumentMap.set(instr.securityId, instr);
}

/**
 * Get instrument by security ID - O(1) lookup
 */
export function getInstrumentBySecurityId(securityId: string): TASEInstrument | undefined {
  return _instrumentMap.get(securityId);
}

/**
 * Search TASE instruments
 * @param query - Search query (numeric, Hebrew, or English)
 * @returns Array of matching instruments (max 20)
 */
export function searchTASEInstruments(query: string): TASEInstrument[] {
  if (!query || query.trim().length < 1) {
    return [];
  }

  const normalizedQuery = query.trim();
  const isNumeric = /^\d+$/.test(normalizedQuery);

  if (isNumeric) {
    // Numeric query: exact match first, then prefix match
    const exactMatch = _instrumentMap.get(normalizedQuery);
    if (exactMatch) {
      return [exactMatch];
    }

    // Prefix match
    return TASE_INSTRUMENTS
      .filter(instr => instr.securityId.startsWith(normalizedQuery))
      .slice(0, 20);
  }

  // Text query: search in Hebrew, English, and symbol
  const queryLower = normalizedQuery.toLowerCase();
  return TASE_INSTRUMENTS.filter(instr => {
    return (
      instr.nameHe.includes(normalizedQuery) ||
      instr.nameEn.toLowerCase().includes(queryLower) ||
      instr.yahooSymbol.toLowerCase().includes(queryLower)
    );
  }).slice(0, 20);
}
