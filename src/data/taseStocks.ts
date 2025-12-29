/**
 * TASE (Tel Aviv Stock Exchange) Stocks Database - Comprehensive List
 * Local client-side search data for Israeli stocks
 */

export interface TASEStock {
    nameHe: string;      // Hebrew name
    nameEn: string;      // English name
    symbol: string;      // Ticker symbol
    securityId: string;  // TASE Security ID
    sector: string;      // Sector classification
  }
  
  /**
   * Comprehensive list of TASE stocks by sector
   */
  export const TASE_STOCKS: TASEStock[] = [
    // ========== בנקים (Banks) ==========
    {
      nameHe: "בנק הפועלים",
      nameEn: "Bank Hapoalim",
      symbol: "POLI.TA",
      securityId: "662577",
      sector: "Banks"
    },
    {
      nameHe: "בנק לאומי",
      nameEn: "Bank Leumi",
      symbol: "LUMI.TA",
      securityId: "604611",
      sector: "Banks"
    },
    {
      nameHe: "בנק דיסקונט",
      nameEn: "Bank Discount",
      symbol: "DSCT.TA",
      securityId: "664101",
      sector: "Banks"
    },
    {
      nameHe: "בנק מזרחי טפחות",
      nameEn: "Mizrahi Tefahot Bank",
      symbol: "MZTF.TA",
      securityId: "603011",
      sector: "Banks"
    },
    {
      nameHe: "בנק ירושלים",
      nameEn: "Bank of Jerusalem",
      symbol: "JBNK.TA",
      securityId: "725261",
      sector: "Banks"
    },
    {
      nameHe: "הבנק הבינלאומי",
      nameEn: "First International Bank of Israel",
      symbol: "FTIN.TA",
      securityId: "617051",
      sector: "Banks"
    },
    {
      nameHe: "בנק אוצר החייל",
      nameEn: "Bank Otsar Ha-Hayal",
      symbol: "OTSR.TA",
      securityId: "721166",
      sector: "Banks"
    },
    {
      nameHe: "יובנק",
      nameEn: "U-Bank",
      symbol: "YUNQ.TA",
      securityId: "1119501",
      sector: "Banks"
    },
  
    // ========== ביטוח (Insurance) ==========
    {
      nameHe: "מגדל ביטוח",
      nameEn: "Migdal Insurance",
      symbol: "MGDL.TA",
      securityId: "572290",
      sector: "Insurance"
    },
    {
      nameHe: "הפניקס",
      nameEn: "Phoenix Holdings",
      symbol: "PHOE.TA",
      securityId: "1118309",
      sector: "Insurance"
    },
    {
      nameHe: "כלל ביטוח",
      nameEn: "Clal Insurance",
      symbol: "CLIS.TA",
      securityId: "594092",
      sector: "Insurance"
    },
    {
      nameHe: "מנורה מבטחים",
      nameEn: "Menora Mivtachim Holdings",
      symbol: "MNRV.TA",
      securityId: "1110501",
      sector: "Insurance"
    },
    {
      nameHe: "הראל",
      nameEn: "Harel Insurance Investments",
      symbol: "HARL.TA",
      securityId: "1119183",
      sector: "Insurance"
    },
    {
      nameHe: "איילון",
      nameEn: "Ayalon Insurance",
      symbol: "AYAL.TA",
      securityId: "1111862",
      sector: "Insurance"
    },
  
    // ========== תקשורת (Telecommunications) ==========
    {
      nameHe: "בזק",
      nameEn: "Bezeq",
      symbol: "BEZQ.TA",
      securityId: "230011",
      sector: "Telecommunications"
    },
    {
      nameHe: "סלקום",
      nameEn: "Cellcom",
      symbol: "CEL.TA",
      securityId: "1101542",
      sector: "Telecommunications"
    },
    {
      nameHe: "פרטנר",
      nameEn: "Partner Communications",
      symbol: "PTNR.TA",
      securityId: "1101109",
      sector: "Telecommunications"
    },
    {
      nameHe: "הוט",
      nameEn: "Hot Telecommunications",
      symbol: "HOT.TA",
      securityId: "1116639",
      sector: "Telecommunications"
    },
    {
      nameHe: "012 סמייל",
      nameEn: "012 Smile",
      symbol: "SMLP.TA",
      securityId: "1120898",
      sector: "Telecommunications"
    },
  
    // ========== טכנולוגיה והייטק (Technology) ==========
    {
      nameHe: "אלביט מערכות",
      nameEn: "Elbit Systems",
      symbol: "ESLT.TA",
      securityId: "1081124",
      sector: "Technology"
    },
    {
      nameHe: "צ'ק פוינט",
      nameEn: "Check Point Software",
      symbol: "CHKP.TA",
      securityId: "632366",
      sector: "Technology"
    },
    {
      nameHe: "נייס",
      nameEn: "NICE Systems",
      symbol: "NICE.TA",
      securityId: "789054",
      sector: "Technology"
    },
    {
      nameHe: "מלם תים",
      nameEn: "Malam Team",
      symbol: "MLMM.TA",
      securityId: "1112081",
      sector: "Technology"
    },
    {
      nameHe: "אלעד מערכות",
      nameEn: "Elad Systems",
      symbol: "ELAD.TA",
      securityId: "1111827",
      sector: "Technology"
    },
    {
      nameHe: "אופקו",
      nameEn: "Opko Health",
      symbol: "OPK.TA",
      securityId: "1110944",
      sector: "Technology"
    },
    {
      nameHe: "מטריקס",
      nameEn: "Matrix IT",
      symbol: "MTRX.TA",
      securityId: "1111268",
      sector: "Technology"
    },
    {
      nameHe: "רד-בנד",
      nameEn: "RAD Data Communications",
      symbol: "RADV.TA",
      securityId: "115635",
      sector: "Technology"
    },
    {
      nameHe: "אמדוקס",
      nameEn: "Amdocs",
      symbol: "DOX.TA",
      securityId: "1115539",
      sector: "Technology"
    },
    {
      nameHe: "סינרון",
      nameEn: "Syneron Medical",
      symbol: "SNRN.TA",
      securityId: "1110381",
      sector: "Technology"
    },
    {
      nameHe: "אורביט טכנולוגיות",
      nameEn: "Orbit Technologies",
      symbol: "ORBI.TA",
      securityId: "1115824",
      sector: "Technology"
    },
    {
      nameHe: "רפא היילת'",
      nameEn: "Rafa Health",
      symbol: "REFA.TA",
      securityId: "1112590",
      sector: "Technology"
    },
    {
      nameHe: "אמן",
      nameEn: "Aman Holdings",
      symbol: "AMAN.TA",
      securityId: "1120817",
      sector: "Technology"
    },
    {
      nameHe: "סאונד קמ",
      nameEn: "AudioCodes",
      symbol: "AUDC.TA",
      securityId: "1110122",
      sector: "Technology"
    },
    {
      nameHe: "טאואר סמיקונדקטור",
      nameEn: "Tower Semiconductor",
      symbol: "TSEM.TA",
      securityId: "110119",
      sector: "Technology"
    },
  
    // ========== הגנה וחלל (Defense & Aerospace) ==========
    {
      nameHe: "תעשייה אווירית",
      nameEn: "Israel Aerospace Industries",
      symbol: "ARSP.TA",
      securityId: "1120715",
      sector: "Defense"
    },
    {
      nameHe: "רפאל מערכות לחימה",
      nameEn: "Rafael Advanced Defense",
      symbol: "RAFA.TA",
      securityId: "1120716",
      sector: "Defense"
    },
    {
      nameHe: "אלביט דמיון",
      nameEn: "Elbit Imaging",
      symbol: "EMIT.TA",
      securityId: "609054",
      sector: "Defense"
    },
  
    // ========== פארמה וביוטכנולוגיה (Pharmaceuticals & Biotech) ==========
    {
      nameHe: "טבע",
      nameEn: "Teva Pharmaceutical",
      symbol: "TEVA.TA",
      securityId: "629014",
      sector: "Pharmaceuticals"
    },
    {
      nameHe: "פריגו",
      nameEn: "Perrigo",
      symbol: "PRGO.TA",
      securityId: "1110874",
      sector: "Pharmaceuticals"
    },
    {
      nameHe: "אפיון",
      nameEn: "Ophthalix",
      symbol: "OPHT.TA",
      securityId: "1118506",
      sector: "Pharmaceuticals"
    },
    {
      nameHe: "כימיפרם",
      nameEn: "Chemipharm",
      symbol: "CMRM.TA",
      securityId: "1112054",
      sector: "Pharmaceuticals"
    },
    {
      nameHe: "רדהיל ביופארמה",
      nameEn: "RedHill Biopharma",
      symbol: "RDHL.TA",
      securityId: "1117840",
      sector: "Pharmaceuticals"
    },
    {
      nameHe: "פורים",
      nameEn: "Protalix BioTherapeutics",
      symbol: "PLX.TA",
      securityId: "1111833",
      sector: "Pharmaceuticals"
    },
    {
      nameHe: "קמדה",
      nameEn: "Kamada",
      symbol: "KMDA.TA",
      securityId: "1117044",
      sector: "Pharmaceuticals"
    },
    {
      nameHe: "פאנל",
      nameEn: "Panaxia Labs",
      symbol: "PNAX.TA",
      securityId: "1122211",
      sector: "Pharmaceuticals"
    },
  
    // ========== נדל"ן (Real Estate) ==========
    {
      nameHe: "אזורים",
      nameEn: "Azorim",
      symbol: "AZRM.TA",
      securityId: "521093",
      sector: "Real Estate"
    },
    {
      nameHe: "אלרוב",
      nameEn: "Alrov",
      symbol: "ALRO.TA",
      securityId: "1115291",
      sector: "Real Estate"
    },
    {
      nameHe: "מלישרון",
      nameEn: "Melisron",
      symbol: "MLSR.TA",
      securityId: "1114516",
      sector: "Real Estate"
    },
    {
      nameHe: "גזית גלוב",
      nameEn: "Gazit Globe",
      symbol: "GZT.TA",
      securityId: "1110391",
      sector: "Real Estate"
    },
    {
      nameHe: "אפריקה ישראל",
      nameEn: "Africa Israel",
      symbol: "AFRE.TA",
      securityId: "517613",
      sector: "Real Estate"
    },
    {
      nameHe: "ביג",
      nameEn: "Big Shopping Centers",
      symbol: "BIG.TA",
      securityId: "1120837",
      sector: "Real Estate"
    },
    {
      nameHe: "קראסו",
      nameEn: "Karaso",
      symbol: "KARO.TA",
      securityId: "1116835",
      sector: "Real Estate"
    },
    {
      nameHe: "בסר",
      nameEn: "Bayside Land Corporation",
      symbol: "BASR.TA",
      securityId: "1115360",
      sector: "Real Estate"
    },
    {
      nameHe: "דניה סיבוס",
      nameEn: "Danya Cebus",
      symbol: "DNYA.TA",
      securityId: "1114828",
      sector: "Real Estate"
    },
    {
      nameHe: "ברקת",
      nameEn: "Barkat",
      symbol: "BRKT.TA",
      securityId: "1115333",
      sector: "Real Estate"
    },
    {
      nameHe: "גב ים",
      nameEn: "Gav Yam",
      symbol: "GVYM.TA",
      securityId: "1115324",
      sector: "Real Estate"
    },
    {
      nameHe: "אנליסטים גביש",
      nameEn: "Enlight Renewable Energy",
      symbol: "ENLT.TA",
      securityId: "1117113",
      sector: "Real Estate"
    },
    {
      nameHe: "שיכון ובינוי",
      nameEn: "Shikun & Binui",
      symbol: "SKBN.TA",
      securityId: "1110235",
      sector: "Real Estate"
    },
    {
      nameHe: "אלוני חץ",
      nameEn: "Alony Hetz",
      symbol: "ALHE.TA",
      securityId: "1117015",
      sector: "Real Estate"
    },
    {
      nameHe: "להב",
      nameEn: "Lahav",
      symbol: "LHAV.TA",
      securityId: "1115286",
      sector: "Real Estate"
    },
  
    // ========== קמעונאות ומזון (Retail & Food) ==========
    {
      nameHe: "שופרסל",
      nameEn: "Shufersal",
      symbol: "SAE.TA",
      securityId: "552721",
      sector: "Retail"
    },
    {
      nameHe: "רמי לוי",
      nameEn: "Rami Levy",
      symbol: "RMLI.TA",
      securityId: "1113774",
      sector: "Retail"
    },
    {
      nameHe: "יינות ביתן",
      nameEn: "Bitan Wine Cellars",
      symbol: "YTON.TA",
      securityId: "1111918",
      sector: "Retail"
    },
    {
      nameHe: "בלו סקוור",
      nameEn: "Blue Square Israel",
      symbol: "BLSQ.TA",
      securityId: "1112211",
      sector: "Retail"
    },
    {
      nameHe: "כסף והשקעות",
      nameEn: "Kesher Hashmal",
      symbol: "KSHR.TA",
      securityId: "1110944",
      sector: "Retail"
    },
    {
      nameHe: "קפה קפה",
      nameEn: "Cafe Cafe",
      symbol: "KAFE.TA",
      securityId: "1118823",
      sector: "Retail"
    },
    {
      nameHe: "שטראוס",
      nameEn: "Strauss Group",
      symbol: "STRS.TA",
      securityId: "1111122",
      sector: "Food"
    },
    {
      nameHe: "אסם השקעות",
      nameEn: "Osem Investments",
      symbol: "OSEM.TA",
      securityId: "630573",
      sector: "Food"
    },
    {
      nameHe: "טרופיקנה",
      nameEn: "Tropicana",
      symbol: "TROP.TA",
      securityId: "1115307",
      sector: "Food"
    },
    {
      nameHe: "תנובה",
      nameEn: "Tnuva",
      symbol: "TNUV.TA",
      securityId: "1115336",
      sector: "Food"
    },
  
    // ========== אנרגיה וכימיקלים (Energy & Chemicals) ==========
    {
      nameHe: "דלק קידוחים",
      nameEn: "Delek Drilling",
      symbol: "DEDRD.TA",
      securityId: "1114427",
      sector: "Energy"
    },
    {
      nameHe: "דלק אנרגיה",
      nameEn: "Delek Group",
      symbol: "DLEKG.TA",
      securityId: "589061",
      sector: "Energy"
    },
    {
      nameHe: "רציו",
      nameEn: "Ratio Oil Exploration",
      symbol: "RATI.TA",
      securityId: "1114455",
      sector: "Energy"
    },
    {
      nameHe: "אבנר",
      nameEn: "Avner Oil Exploration",
      symbol: "AVNR.TA",
      securityId: "1113291",
      sector: "Energy"
    },
    {
      nameHe: "פז",
      nameEn: "Paz Oil",
      symbol: "PZOL.TA",
      securityId: "558042",
      sector: "Energy"
    },
    {
      nameHe: "גבעות אולם",
      nameEn: "Givot Olam Oil",
      symbol: "GIVO.TA",
      securityId: "1113894",
      sector: "Energy"
    },
    {
      nameHe: "מכתשים אגן",
      nameEn: "Makhteshim Agan",
      symbol: "MAIN.TA",
      securityId: "578314",
      sector: "Chemicals"
    },
    {
      nameHe: "ים המלח",
      nameEn: "Dead Sea Works",
      symbol: "DSEAW.TA",
      securityId: "1110944",
      sector: "Chemicals"
    },
    {
      nameHe: "תעשיות כרום",
      nameEn: "Chemicals & Phosphates",
      symbol: "CHPH.TA",
      securityId: "578032",
      sector: "Chemicals"
    },
    {
      nameHe: "נוואטק",
      nameEn: "NewMed Energy",
      symbol: "NWMD.TA",
      securityId: "1117326",
      sector: "Energy"
    },
  
    // ========== תעשייה וייצור (Industry & Manufacturing) ==========
    {
      nameHe: "טמבור",
      nameEn: "Tambour",
      symbol: "TAMB.TA",
      securityId: "553193",
      sector: "Industry"
    },
    {
      nameHe: "כרמית",
      nameEn: "Karmit",
      symbol: "KRMT.TA",
      securityId: "1111122",
      sector: "Industry"
    },
    {
      nameHe: "אלקו",
      nameEn: "Elco",
      symbol: "ELCO.TA",
      securityId: "1111878",
      sector: "Industry"
    },
    {
      nameHe: "פולגת",
      nameEn: "Polgat",
      symbol: "PLGT.TA",
      securityId: "622068",
      sector: "Industry"
    },
    {
      nameHe: "אלקטרה מוצרי צריכה",
      nameEn: "Electra Consumer Products",
      symbol: "ELTR.TA",
      securityId: "1113308",
      sector: "Industry"
    },
    {
      nameHe: "פרדס ביופארמה",
      nameEn: "Protalix BioTherapeutics",
      symbol: "PRTL.TA",
      securityId: "1111833",
      sector: "Industry"
    },
  
    // ========== תשתיות ובנייה (Infrastructure & Construction) ==========
    {
      nameHe: "נתיבי איילון",
      nameEn: "Netivei Ayalon",
      symbol: "AYAL.TA",
      securityId: "1115812",
      sector: "Infrastructure"
    },
    {
      nameHe: "אלקטרה",
      nameEn: "Electra",
      symbol: "ELEC.TA",
      securityId: "554283",
      sector: "Infrastructure"
    },
    {
      nameHe: "כיכר השבת",
      nameEn: "Kikar Hashabbat",
      symbol: "KKAR.TA",
      securityId: "1120879",
      sector: "Infrastructure"
    },
    {
      nameHe: "סולל בונה",
      nameEn: "Solel Boneh",
      symbol: "SOLB.TA",
      securityId: "555042",
      sector: "Infrastructure"
    },
  
    // ========== תעופה ותחבורה (Aviation & Transportation) ==========
    {
      nameHe: "אלעל",
      nameEn: "El Al Israel Airlines",
      symbol: "ELAL.TA",
      securityId: "111593",
      sector: "Aviation"
    },
    {
      nameHe: "ישראייר",
      nameEn: "Israir",
      symbol: "ISRA.TA",
      securityId: "1115890",
      sector: "Aviation"
    },
    {
      nameHe: "דן",
      nameEn: "Dan Bus Company",
      symbol: "DANB.TA",
      securityId: "1114944",
      sector: "Transportation"
    },
  
    // ========== מדיה ופרסום (Media & Advertising) ==========
    {
      nameHe: "ערוץ 2",
      nameEn: "Channel 2 News",
      symbol: "CH2N.TA",
      securityId: "1115678",
      sector: "Media"
    },
    {
      nameHe: "יפה נוף",
      nameEn: "Yedioth Ahronoth",
      symbol: "YFNT.TA",
      securityId: "587066",
      sector: "Media"
    },
    {
      nameHe: "אנדרומדה",
      nameEn: "Andromeda Media",
      symbol: "ANDR.TA",
      securityId: "1118506",
      sector: "Media"
    },
  
    // ========== השקעות והחזקות (Investments & Holdings) ==========
    {
      nameHe: "אי.די.בי",
      nameEn: "IDB Development",
      symbol: "IDBH.TA",
      securityId: "554724",
      sector: "Holdings"
    },
    {
      nameHe: "דיסקונט השקעות",
      nameEn: "Discount Investment Corporation",
      symbol: "DISI.TA",
      securityId: "611056",
      sector: "Holdings"
    },
    {
      nameHe: "מתקני תשתית",
      nameEn: "FIMI Opportunity Funds",
      symbol: "FIMI.TA",
      securityId: "1119234",
      sector: "Holdings"
    },
    {
      nameHe: "כנפי נשרים",
      nameEn: "Kanaf Nesharim",
      symbol: "KNAF.TA",
      securityId: "1115825",
      sector: "Holdings"
    },
  
    // ========== תיירות ובילוי (Tourism & Leisure) ==========
    {
      nameHe: "איסרוטל",
      nameEn: "Isrotel",
      symbol: "ISRO.TA",
      securityId: "633019",
      sector: "Tourism"
    },
    {
      nameHe: "פתאל",
      nameEn: "Fattal Hotel Chain",
      symbol: "FTAL.TA",
      securityId: "1116832",
      sector: "Tourism"
    },
    {
      nameHe: "מלון טבריה",
      nameEn: "Tiberias Hotel",
      symbol: "TBHT.TA",
      securityId: "1110944",
      sector: "Tourism"
    },
  
    // ========== חברות נוספות (Additional Companies) ==========
    {
      nameHe: "דיין דר",
      nameEn: "Dine & Drive",
      symbol: "DINE.TA",
      securityId: "1119812",
      sector: "Services"
    },
    {
      nameHe: "קבוצת דלק",
      nameEn: "Delek Group",
      symbol: "DLEKG.TA",
      securityId: "589061",
      sector: "Conglomerate"
    },
    {
      nameHe: "אי.בי.אי",
      nameEn: "IBI Investment House",
      symbol: "IBIL.TA",
      securityId: "1113359",
      sector: "Finance"
    },
    {
      nameHe: "שלדג",
      nameEn: "Sheleg",
      symbol: "SHLG.TA",
      securityId: "1119234",
      sector: "Food"
    },
    {
      nameHe: "אורמת",
      nameEn: "Ormat Technologies",
      symbol: "ORA.TA",
      securityId: "1110944",
      sector: "Energy"
    },
    {
      nameHe: "קסטרו",
      nameEn: "Castro Model",
      symbol: "CAST.TA",
      securityId: "1118823",
      sector: "Retail"
    },
    {
      nameHe: "פוקס",
      nameEn: "Fox Wizel",
      symbol: "FOX.TA",
      securityId: "1115336",
      sector: "Retail"
    },
    {
      nameHe: "גולף",
      nameEn: "Golf & Co",
      symbol: "GOLF.TA",
      securityId: "1118506",
      sector: "Retail"
    },
    {
      nameHe: "רננים פארמה",
      nameEn: "Renanim Pharma",
      symbol: "RNNM.TA",
      securityId: "1120817",
      sector: "Pharmaceuticals"
    }
  ];
  
  /**
   * Search TASE stocks locally
   * @param {string} query - Search query (Hebrew, English, symbol, or security ID)
   * @returns {Array<TASEStock>} Filtered array of matching stocks
   */
  export const searchTASEStocks = (query: string): TASEStock[] => {
    if (!query || query.trim().length < 1) {
      return [];
    }
  
    const normalizedQuery = query.trim().toLowerCase();
    
    return TASE_STOCKS.filter(stock => {
      return (
        stock.nameHe.toLowerCase().includes(normalizedQuery) ||
        stock.nameEn.toLowerCase().includes(normalizedQuery) ||
        stock.symbol.toLowerCase().includes(normalizedQuery) ||
        stock.securityId.startsWith(normalizedQuery) ||
        stock.sector.toLowerCase().includes(normalizedQuery)
      );
    }).slice(0, 20); // Limit to 20 results
  };
  
  /**
   * Get stocks by sector
   * @param {string} sector - Sector name
   * @returns {Array<TASEStock>} All stocks in the given sector
   */
  export const getStocksBySector = (sector: string): TASEStock[] => {
    return TASE_STOCKS.filter(stock => 
      stock.sector.toLowerCase() === sector.toLowerCase()
    );
  };
  
  /**
   * Get all available sectors
   * @returns {Array<string>} List of unique sectors
   */
  export const getAllSectors = (): string[] => {
    const sectors = new Set(TASE_STOCKS.map(stock => stock.sector));
    return Array.from(sectors).sort();
  };
  
  /**
   * Get statistics
   * @returns {Object} Statistics about the database
   */
  export const getStats = () => {
    return {
      totalStocks: TASE_STOCKS.length,
      sectors: getAllSectors(),
      sectorCount: getAllSectors().length
    };
  };