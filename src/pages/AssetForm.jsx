import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Sparkles, Loader2, Plus, ArrowRight, Calculator, RefreshCw, Calendar, Hash, X, Layers, Search, DollarSign, Tag } from 'lucide-react';
import { callGeminiAI } from '../services/gemini';
import { infoAlert, successToast, errorAlert } from '../utils/alerts';
import { generateRandomColor } from '../constants/defaults';
import TickerSearch from '../components/TickerSearch';
import CustomSelect from '../components/CustomSelect';
import FormSection from '../components/FormSection';
import AssetModeSelector from '../components/AssetModeSelector';
import CalculatedField from '../components/CalculatedField';
import { fetchAssetPrice, fetchAssetHistoricalPrice, convertCurrency } from '../services/priceService';

const AssetForm = ({ onSave, assets = [], systemData, setSystemData, portfolioContext = "" }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const editAsset = id ? assets.find(a => a.id === id) : null;

  // Redirect if trying to edit non-existent asset
  useEffect(() => {
    if (id && !editAsset && assets.length > 0) {
      navigate('/assets');
    }
  }, [id, editAsset, assets.length, navigate]);

  // Get initial values from query params (for "Add to this group" button)
  const initialPlatform = searchParams.get('platform') || systemData.platforms[0]?.name || '';
  const initialCategory = searchParams.get('category') || systemData.categories[0]?.name || 'אחר';
  const initialInstrument = searchParams.get('instrument') || systemData.instruments[0]?.name || '';

  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    displayName: '', // Hebrew/display name for UI
    apiId: '', // API ID for price fetching (e.g., "bitcoin" for CoinGecko)
    marketDataSource: '', // "coingecko" | "yahoo" | "manual"
    instrument: initialInstrument,
    platform: initialPlatform,
    category: initialCategory,
    currency: initialCategory === 'קריפטו' ? 'USD' : 'ILS',
    originalValue: '',
    tags: '',
    // New fields for real-time tracking
    assetType: 'STOCK', // 'CRYPTO' | 'STOCK' | 'INDEX' | 'ETF' | 'MANUAL'
    assetMode: 'QUANTITY', // 'QUANTITY' | 'LEGACY'
    quantity: '',
    purchasePrice: '',
    purchaseDate: new Date().toISOString().split('T')[0], // Today's date as default
    totalCost: '' // For reverse calculation
  });
  const [tagLoading, setTagLoading] = useState(false);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [currentPriceData, setCurrentPriceData] = useState(null);
  const [lastEditedField, setLastEditedField] = useState(null); // Track which field was edited last

  // Reactive currency conversion state
  const [nativePrice, setNativePrice] = useState(null); // Raw price from API in native currency
  const [nativeCurrency, setNativeCurrency] = useState(null); // Native currency of the asset (e.g., 'USD', 'ILS')
  const [exchangeRate, setExchangeRate] = useState(null); // Cached USD/ILS exchange rate
  const [isPriceManual, setIsPriceManual] = useState(false); // True if user manually edited price (disable auto-updates)
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
        name: editAsset.name || '',
        symbol: editAsset.symbol || '',
        displayName: editAsset.displayName || '',
        apiId: editAsset.apiId || '',
        marketDataSource: editAsset.marketDataSource || '',
        instrument: editAsset.instrument || (systemData.instruments[0]?.name || ''),
        platform: editAsset.platform || (systemData.platforms[0]?.name || ''),
        category: editAsset.category || (systemData.categories[0]?.name || 'אחר'),
        currency: editAsset.currency || 'ILS',
        originalValue: editAsset.originalValue || editAsset.value || '',
        tags: editAsset.tags ? editAsset.tags.join(', ') : '',
        // Load new fields from existing asset
        assetType: editAsset.assetType || 'STOCK',
        assetMode: editAsset.assetMode || (editAsset.quantity ? 'QUANTITY' : 'LEGACY'),
        quantity: editAsset.quantity || '',
        purchasePrice: editAsset.purchasePrice || '',
        purchaseDate: editAsset.purchaseDate || new Date().toISOString().split('T')[0],
        totalCost: editAsset.totalCost || ''
      });
    } else if (!id) {
      // Only reset on new asset (not edit), and preserve query params
      setFormData(prev => ({
        name: '',
        symbol: '',
        apiId: '',
        marketDataSource: '',
        displayName: '',
        instrument: initialInstrument,
        platform: initialPlatform,
        category: initialCategory,
        currency: initialCategory === 'קריפטו' ? 'USD' : 'ILS',
        originalValue: '',
        tags: '',
        assetType: 'STOCK',
        assetMode: 'QUANTITY',
        quantity: '',
        purchasePrice: '',
        purchaseDate: new Date().toISOString().split('T')[0]
      }));
    }
  }, [editAsset, id, initialPlatform, initialCategory, initialInstrument]);

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

  // Reset related fields when switching between מניות/קריפטו categories
  const prevCategoryRef = useRef(formData.category);
  useEffect(() => {
    const prevCategory = prevCategoryRef.current;
    const currentCategory = formData.category;
    let updates = {};

    // If switching between מניות and קריפטו, reset related fields
    if ((prevCategory === 'מניות' && currentCategory === 'קריפטו') ||
      (prevCategory === 'קריפטו' && currentCategory === 'מניות')) {
      updates = {
        name: '',
        symbol: '',
        displayName: '',
        apiId: '',
        marketDataSource: '',
        purchasePrice: '',
        totalCost: '',
        quantity: ''
      };
      setCurrentPriceData(null);
      setNativePrice(null);
      setNativeCurrency(null);
      setIsPriceManual(false);
      setLastEditedField(null);
    }

    // Auto-set currency to USD when switching TO Crypto
    if (currentCategory === 'קריפטו' && prevCategory !== 'קריפטו') {
      updates.currency = 'USD';
    }

    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
    }

    prevCategoryRef.current = currentCategory;
  }, [formData.category]);

  // Reset related fields when symbol/apiId is cleared (for מניות/קריפטו categories)
  const prevSymbolRef = useRef(formData.symbol);
  const prevApiIdRef = useRef(formData.apiId);
  useEffect(() => {
    // Only for מניות/קריפטו categories
    if (formData.category !== 'מניות' && formData.category !== 'קריפטו') {
      prevSymbolRef.current = formData.symbol;
      prevApiIdRef.current = formData.apiId;
      return;
    }

    const prevSymbol = prevSymbolRef.current;
    const prevApiId = prevApiIdRef.current;
    const currentSymbol = formData.symbol;
    const currentApiId = formData.apiId;

    // If symbol/apiId were cleared (had value before, now empty), reset related fields
    if ((prevSymbol && !currentSymbol && !currentApiId) ||
      (prevApiId && !currentApiId && !currentSymbol)) {
      setFormData(prev => ({
        ...prev,
        name: '',
        purchasePrice: '',
        totalCost: '',
        quantity: ''
      }));
      setCurrentPriceData(null);
      setNativePrice(null);
      setNativeCurrency(null);
      setIsPriceManual(false);
      setLastEditedField(null);
    }

    prevSymbolRef.current = currentSymbol;
    prevApiIdRef.current = currentApiId;
  }, [formData.symbol, formData.apiId, formData.category]);

  // [FIX #3] Identity Theft: Reset Metadata on Symbol Change
  // This ensures that if a user types a new ticker manually,
  // the old "tase-local" or "yahoo" source doesn't persist inappropriately.
  useEffect(() => {
    // Skip on initial load
    if (!formData.symbol) return;

    // If symbol changed and it's not a verified API ID match, reset the source
    // This forces the system to re-evaluate the source based on the new symbol
    const isVerifiedMatch = formData.apiId && (
      formData.apiId.includes(formData.symbol) ||
      formData.apiId.endsWith(formData.symbol)
    );

    if (!isVerifiedMatch && formData.marketDataSource) {
      console.log('[ASSET FORM] Symbol changed manually, resetting data source');
      setFormData(prev => ({
        ...prev,
        marketDataSource: '', // Clear source to prevent "Identity Theft"
        apiId: ''
      }));
    }
  }, [formData.symbol]);

  // Auto-switch to LEGACY mode for Cash category
  useEffect(() => {
    if (formData.category === 'מזומן' && formData.assetMode !== 'LEGACY') {
      setFormData(prev => ({
        ...prev,
        assetMode: 'LEGACY',
        quantity: '',
        purchasePrice: '',
        purchaseDate: '',
        totalCost: '',
        apiId: '',
        marketDataSource: ''
      }));
    }
  }, [formData.category]);

  // Auto-set currency based on symbol for Cash category
  useEffect(() => {
    if (formData.category === 'מזומן' && formData.symbol) {
      const symbol = formData.symbol;
      // Check if symbol is exactly ILS or USD, or contains them in parentheses
      if (symbol === 'ILS' || symbol === 'מזומן (ILS)' || symbol.includes('(ILS)')) {
        setFormData(prev => ({ ...prev, currency: 'ILS' }));
      } else if (symbol === 'USD' || symbol === 'מזומן (USD)' || symbol.includes('(USD)')) {
        setFormData(prev => ({ ...prev, currency: 'USD' }));
      }
    }
  }, [formData.category, formData.symbol]);

  // Fetch current price when asset is selected (for QUANTITY mode)
  const handleFetchCurrentPrice = async () => {
    if (!formData.apiId && !formData.symbol) {
      await infoAlert('שגיאה', 'נא לבחור נכס קודם');
      return;
    }

    setPriceLoading(true);
    try {
      const priceData = await fetchAssetPrice({
        apiId: formData.apiId,
        marketDataSource: formData.marketDataSource,
        symbol: formData.symbol,
        assetType: formData.assetType,
        securityId: formData.securityId
      });

      // Check if quote is valid: exists, no error, has valid price
      if (priceData &&
        !priceData.error &&
        typeof priceData.currentPrice === 'number' &&
        isFinite(priceData.currentPrice) &&
        priceData.currentPrice > 0) {
        setCurrentPriceData(priceData);
        // [FIX #4] The Critical Change:
        // If we are in "Edit Mode" (editAsset exists), DO NOT auto-fill purchase price.
        // Just show the toast.
        // Only auto-fill for NEW assets (creating for the first time).
        const shouldAutoFill = !editAsset;

        if (shouldAutoFill) {
          setNativePrice(priceData.currentPrice);
          setNativeCurrency(priceData.currency || 'USD');
          setIsPriceManual(false);
        }

        // Get converted price for toast message
        const { convertAmount } = await import('../services/currency');
        const displayPrice = await convertAmount(priceData.currentPrice, priceData.currency || 'USD', formData.currency);

        await successToast(
          `מחיר נוכחי: ${displayPrice.toFixed(2)} ${formData.currency}` +
          (shouldAutoFill ? '' : ' (לא עודכן בטופס למניעת דריסת היסטוריה)'),
          3000
        );
      } else {
        // Invalid quote - show error with details
        const errorMsg = priceData?.error
          ? `לא ניתן לשלוף מחיר: ${priceData.error}`
          : 'לא ניתן לשלוף מחיר. נסה שוב או הזן ידנית.';
        await errorAlert('שגיאה', errorMsg);
      }
    } catch (error) {
      console.error('Error fetching price:', error);
      await errorAlert('שגיאה', `שגיאה בשליפת מחיר: ${error.message || 'שגיאה לא ידועה'}`);
    }
    setPriceLoading(false);
  };

  // Fetch historical price for the purchase date
  const handleFetchHistoricalPrice = async () => {
    if (!formData.apiId && !formData.symbol) {
      await infoAlert('שגיאה', 'נא לבחור נכס קודם');
      return;
    }
    if (!formData.purchaseDate) {
      await infoAlert('שגיאה', 'נא לבחור תאריך רכישה');
      return;
    }

    setPriceLoading(true);
    try {
      const historicalPrice = await fetchAssetHistoricalPrice({
        apiId: formData.apiId,
        marketDataSource: formData.marketDataSource,
        symbol: formData.symbol
      }, formData.purchaseDate);

      if (historicalPrice !== null) {
        // Get native currency (from current price data or default)
        const assetNativeCurrency = nativeCurrency || 'USD';

        // Update native price (this will trigger Effect C to convert)
        setNativePrice(historicalPrice);
        if (!nativeCurrency) {
          setNativeCurrency(assetNativeCurrency);
        }
        setIsPriceManual(false); // Reset manual mode

        // Get converted price for toast message
        let displayPrice = historicalPrice;
        if (assetNativeCurrency !== formData.currency) {
          displayPrice = await convertCurrency(historicalPrice, assetNativeCurrency, formData.currency);
        }

        await successToast(`מחיר היסטורי: ${displayPrice.toFixed(2)} ${formData.currency}`, 2000);
      } else {
        await errorAlert('שגיאה', 'לא ניתן לשלוף מחיר היסטורי. נסה תאריך אחר או הזן ידנית.');
      }
    } catch (error) {
      console.error('Error fetching historical price:', error);
      await errorAlert('שגיאה', 'שגיאה בשליפת מחיר היסטורי');
    }
    setPriceLoading(false);
  };

  // Calculate estimated value based on quantity and price (REACTIVE - updates instantly)
  const estimatedValue = useMemo(() => {
    if (formData.assetMode === 'QUANTITY' && formData.quantity && formData.purchasePrice) {
      const qty = Number(formData.quantity) || 0;
      const price = Number(formData.purchasePrice) || 0;
      return qty * price;
    }
    return Number(formData.originalValue) || 0;
  }, [formData.assetMode, formData.quantity, formData.purchasePrice, formData.originalValue]);

  // Auto-calculate: when totalCost changes → update quantity, when quantity changes → update totalCost (REACTIVE)
  useEffect(() => {
    if (formData.assetMode !== 'QUANTITY') return;

    const price = Number(formData.purchasePrice) || 0;

    // Need price to calculate anything
    if (price <= 0) return;

    const quantity = Number(formData.quantity) || 0;
    const totalCost = Number(formData.totalCost) || 0;

    // User edited totalCost → calculate quantity
    if (lastEditedField === 'totalCost' && totalCost > 0) {
      const calculatedQuantity = totalCost / price;
      if (calculatedQuantity > 0 && !isNaN(calculatedQuantity) && isFinite(calculatedQuantity)) {
        const newQuantity = calculatedQuantity.toFixed(6);
        if (Math.abs(Number(newQuantity) - Number(formData.quantity)) > 0.000001) {
          setFormData(prev => ({
            ...prev,
            quantity: newQuantity
          }));
        }
      }
    }

    // User edited quantity → calculate totalCost (REACTIVE - updates instantly)
    if (lastEditedField === 'quantity' && quantity > 0) {
      const calculatedTotal = quantity * price;
      if (calculatedTotal > 0 && !isNaN(calculatedTotal) && isFinite(calculatedTotal)) {
        const newTotal = calculatedTotal.toFixed(2);
        if (newTotal !== formData.totalCost) {
          setFormData(prev => ({
            ...prev,
            totalCost: newTotal
          }));
        }
      }
    }

    // Also update totalCost when price changes (REACTIVE)
    if (lastEditedField !== 'totalCost' && quantity > 0 && price > 0) {
      const calculatedTotal = quantity * price;
      if (calculatedTotal > 0 && !isNaN(calculatedTotal) && isFinite(calculatedTotal)) {
        const newTotal = calculatedTotal.toFixed(2);
        if (newTotal !== formData.totalCost) {
          setFormData(prev => ({
            ...prev,
            totalCost: newTotal
          }));
        }
      }
    }
  }, [formData.quantity, formData.purchasePrice, formData.totalCost, formData.assetMode, lastEditedField]);

  // Auto-fetch historical price when date changes and we have an asset selected
  useEffect(() => {
    const fetchPriceForDate = async () => {
      if (
        formData.assetMode !== 'QUANTITY' ||
        !formData.purchaseDate ||
        (!formData.apiId && !formData.symbol) ||
        isPriceManual // Don't auto-fetch if user is in manual mode
      ) {
        return;
      }

      setPriceLoading(true);
      try {
        const historicalPrice = await fetchAssetHistoricalPrice({
          apiId: formData.apiId,
          marketDataSource: formData.marketDataSource,
          symbol: formData.symbol
        }, formData.purchaseDate);

        if (historicalPrice !== null && historicalPrice > 0) {
          // Get native currency from current price data or default to USD
          const assetNativeCurrency = nativeCurrency || 'USD';

          // Update native price (this will trigger Effect C to convert)
          setNativePrice(historicalPrice);
          if (!nativeCurrency) {
            setNativeCurrency(assetNativeCurrency);
          }
          setIsPriceManual(false); // Reset manual mode
        }
      } catch (error) {
        console.error('Error auto-fetching historical price:', error);
      }
      setPriceLoading(false);
    };

    // Debounce the fetch
    const timeoutId = setTimeout(fetchPriceForDate, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.purchaseDate, formData.apiId, formData.symbol, formData.marketDataSource, formData.assetMode, nativeCurrency, isPriceManual]);

  // ==================== REACTIVE CURRENCY CONVERSION SYSTEM ====================

  // Effect A: Fetch native price when asset is selected
  useEffect(() => {
    const fetchNativePrice = async () => {
      // Only fetch if we have an asset and we're in QUANTITY mode
      if (formData.assetMode !== 'QUANTITY' || (!formData.apiId && !formData.symbol)) {
        return;
      }

      // Don't fetch if price is manually entered (user is in manual mode)
      if (isPriceManual) {
        return;
      }

      setPriceLoading(true);
      try {
        const priceData = await fetchAssetPrice({
          apiId: formData.apiId,
          marketDataSource: formData.marketDataSource,
          symbol: formData.symbol
        });

        if (priceData) {
          setCurrentPriceData(priceData);
          const assetNativeCurrency = priceData.currency || 'USD';
          const assetNativePrice = priceData.currentPrice;

          // Update native price and currency
          setNativePrice(assetNativePrice);
          setNativeCurrency(assetNativeCurrency);
          setIsPriceManual(false); // Reset manual mode when fetching from API
        }
      } catch (error) {
        console.error('Error fetching native price:', error);
      }
      setPriceLoading(false);
    };

    // Debounce to avoid too many API calls
    const timeoutId = setTimeout(fetchNativePrice, 300);
    return () => clearTimeout(timeoutId);
  }, [formData.apiId, formData.symbol, formData.marketDataSource, formData.assetMode, isPriceManual]);

  // Effect B: Fetch/update exchange rate when needed
  useEffect(() => {
    const updateExchangeRate = async () => {
      // Only fetch if we need conversion (native currency !== selected currency)
      if (!nativeCurrency || nativeCurrency === formData.currency) {
        return;
      }

      // Only fetch if we need USD/ILS conversion
      if ((nativeCurrency === 'USD' && formData.currency === 'ILS') ||
        (nativeCurrency === 'ILS' && formData.currency === 'USD')) {
        try {
          const { getExchangeRate } = await import('../services/priceService');
          const rate = await getExchangeRate();
          setExchangeRate(rate);
        } catch (error) {
          console.error('Error fetching exchange rate:', error);
        }
      }
    };

    updateExchangeRate();
  }, [nativeCurrency, formData.currency]);

  // Effect C: Convert price when currency or native price changes (REACTIVE)
  useEffect(() => {
    const convertPrice = async () => {
      // Don't convert if:
      // 1. No native price
      // 2. No native currency
      // 3. Currently loading
      if (!nativePrice || !nativeCurrency || priceLoading) {
        return;
      }

      // Use canonical conversion function (handles same-currency case)
      try {
        const { convertAmount } = await import('../services/currency');
        const convertedPrice = await convertAmount(
          nativePrice,
          nativeCurrency,
          formData.currency,
          exchangeRate
        );

        // Update price field immediately (Excel-like reactivity)
        // Only update if the price actually changed (avoid unnecessary updates)
        const currentPrice = Number(formData.purchasePrice) || 0;
        const priceDiff = Math.abs(convertedPrice - currentPrice);

        if (priceDiff > 0.000001) { // רגישות גבוהה יותר
          setFormData(prev => ({
            ...prev,
            // אם המספר קטן מ-10 (כמו 4.2392), נשמור 4 ספרות. אם גדול, 2 מספיק.
            purchasePrice: convertedPrice < 10 ? convertedPrice.toFixed(4) : convertedPrice.toFixed(2)
          }));
        }
      } catch (error) {
        console.error('Error converting price:', error);
      }
    };

    // Small delay to avoid race conditions
    const timeoutId = setTimeout(convertPrice, 50);
    return () => clearTimeout(timeoutId);
  }, [nativePrice, nativeCurrency, formData.currency, exchangeRate, priceLoading]);

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

  const handleClearForm = () => {
    setFormData({
      name: '',
      symbol: '',
      displayName: '',
      apiId: '',
      marketDataSource: '',
      instrument: systemData.instruments[0]?.name || '',
      platform: systemData.platforms[0]?.name || '',
      category: systemData.categories[0]?.name || 'אחר',
      currency: 'ILS',
      originalValue: '',
      tags: '',
      assetType: 'STOCK',
      assetMode: 'QUANTITY',
      quantity: '',
      purchasePrice: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      totalCost: ''
    });
    // Reset all related state
    setCurrentPriceData(null);
    setNativePrice(null);
    setNativeCurrency(null);
    setExchangeRate(null);
    setIsPriceManual(false);
    setLastEditedField(null);
    setShowNewSymbol(false);
    setNewSymbolValue('');
    setShowNewPlatform(false);
    setNewPlatformValue('');
    setShowNewInstrument(false);
    setNewInstrumentValue('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Build asset data based on mode
    const assetData = {
      name: formData.name,
      symbol: formData.symbol,
      apiId: formData.apiId,
      marketDataSource: formData.marketDataSource,
      instrument: formData.instrument,
      platform: formData.platform,
      category: formData.category,
      currency: formData.currency,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      assetType: formData.assetType,
      assetMode: formData.assetMode
    };

    if (formData.assetMode === 'QUANTITY') {
      // New quantity-based tracking
      assetData.quantity = Number(formData.quantity) || 0;
      assetData.purchasePrice = Number(formData.purchasePrice) || 0;
      assetData.purchaseDate = formData.purchaseDate || null;
      // Calculate originalValue as costBasis for reference
      assetData.originalValue = assetData.quantity * assetData.purchasePrice;
    } else {
      // Legacy mode - static value
      assetData.originalValue = Number(formData.originalValue) || 0;
      assetData.quantity = null;
      assetData.purchasePrice = null;
      assetData.purchaseDate = null;
    }

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
    <div className="max-w-3xl mx-auto pb-safe" style={{ paddingBottom: 'max(3rem, env(safe-area-inset-bottom))' }}>
      <header className="flex items-center gap-4 mb-8 mr-12 md:mr-0">
        <button
          onClick={() => navigate('/assets')}
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition"
        >
          <ArrowRight size={24} className="text-slate-800 dark:text-slate-200" />
        </button>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">
          {editAsset ? 'עריכת נכס' : 'הוספת נכס'}
        </h2>
        {!editAsset && (
          <button
            onClick={handleClearForm}
            className="mr-auto px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition flex items-center gap-2"
            title="נקה את כל השדות"
          >
            <X size={18} />
            נקה
          </button>
        )}
      </header>
      <form onSubmit={handleSubmit} className="md:bg-white md:dark:bg-slate-800 p-2 md:p-8 md:rounded-2xl md:shadow-lg md:border md:border-slate-100 dark:border-slate-700 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">חשבון או ארנק</label>
            {!showNewPlatform ? (
              <CustomSelect
                value={formData.platform || ''}
                onChange={(val) => {
                  if (val === '__NEW__') {
                    setShowNewPlatform(true);
                  } else {
                    setFormData({ ...formData, platform: val });
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
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">מטבע בסיס</label>
            {!showNewInstrument ? (
              <CustomSelect
                value={formData.instrument || ''}
                onChange={(val) => {
                  if (val === '__NEW__') {
                    setShowNewInstrument(true);
                  } else {
                    setFormData({ ...formData, instrument: val });
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
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">קטגוריית השקעה</label>
            <div className="flex gap-2 flex-wrap">
              {systemData.categories.map(cat => (
                <button
                  type="button"
                  key={cat.name}
                  onClick={() => setFormData({ ...formData, category: cat.name })}
                  className={`px-3.5 py-1 md:px-4 md:py-2 rounded-full border flex items-center gap-2 transition
                    ${formData.category === cat.name ? 'bg-emerald-600 dark:bg-emerald-500 text-white border-emerald-600 dark:border-emerald-500' : 'bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100'}`}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Soft Section Divider */}
        <div className="border-t border-slate-100 dark:border-slate-800 -mx-2 md:-mx-8" />

        {/* Asset Identification Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* סמל נכס / Ticker - Hidden for Cash category */}
          {formData.category !== 'מזומן' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">חיפוש נכס או סימול</label>
              {(formData.category === 'מניות' || formData.category === 'קריפטו') ? (
                // Smart Ticker Search with Category Selector
                <TickerSearch
                  type={formData.category === 'קריפטו' ? 'crypto' : 'us-stock'} // Default type (will be overridden by selector)
                  value={formData.symbol || ''}
                  displayValue={formData.displayName || formData.name || ''} // Show Hebrew name
                  onSelect={(asset) => {
                    if (asset) {
                      // Determine asset type from the selection
                      let assetType = 'STOCK';
                      if (asset.marketDataSource === 'coingecko') {
                        assetType = 'CRYPTO';
                      } else if (asset.assetType === 'INDEX' || asset.symbol?.startsWith('^')) {
                        assetType = 'INDEX';
                      } else if (asset.assetType === 'ETF') {
                        assetType = 'ETF';
                      }

                      // Get the best display name (Hebrew if available)
                      const displayName = asset.nameHe || asset.name || asset.symbol;

                      // Ensure apiId has correct prefix format
                      let apiId = asset.id;
                      if (asset.provider === 'tase-local' || asset.exchange === 'TASE') {
                        // For TASE assets, ensure apiId is in "tase:..." format
                        if (!apiId.startsWith('tase:')) {
                          const securityNumber = asset.securityId || asset.extra?.securityNumber || apiId.replace(/^tase:/, '');
                          apiId = `tase:${securityNumber}`;
                        }
                      } else if (asset.marketDataSource === 'coingecko') {
                        // For crypto, ensure apiId is in "cg:..." format
                        if (!apiId.startsWith('cg:')) {
                          apiId = `cg:${apiId}`;
                        }
                      } else if (apiId && !apiId.includes(':')) {
                        // For other assets, ensure apiId is in "yahoo:..." format
                        apiId = `yahoo:${apiId}`;
                      }

                      setFormData({
                        ...formData,
                        name: formData.name || displayName, // Use Hebrew name for display
                        displayName: displayName, // Store display name separately
                        symbol: asset.symbol, // Always store the ticker
                        apiId: apiId, // Store with correct prefix
                        marketDataSource: asset.marketDataSource || (asset.provider === 'tase-local' ? 'tase-local' : 'yahoo'),
                        assetType: assetType,
                        // Store securityId for TASE assets
                        ...(asset.securityId && { securityId: asset.securityId }),
                        // Reset price when asset changes so it can be auto-fetched
                        purchasePrice: ''
                      });
                      // Clear price data when asset changes
                      setCurrentPriceData(null);
                      setLastEditedField(null);
                      // Reset native price and currency - will be set by useEffect
                      setNativePrice(null);
                      setNativeCurrency(null);
                      setIsPriceManual(false); // Reset manual mode when selecting new asset
                    } else {
                      // Clear all related fields when asset is cleared
                      setFormData({
                        ...formData,
                        name: '',
                        symbol: '',
                        displayName: '',
                        apiId: '',
                        marketDataSource: '',
                        assetType: 'STOCK',
                        purchasePrice: '',
                        totalCost: '',
                        quantity: ''
                      });
                      setCurrentPriceData(null);
                      setNativePrice(null);
                      setNativeCurrency(null);
                      setIsPriceManual(false);
                      setLastEditedField(null);
                    }
                  }}
                  allowManual={true}
                  showCategorySelector={true}
                  allowedCategories={
                    formData.category === 'מניות'
                      ? ['us-stock', 'il-stock', 'index'] // Stocks: show US, IL, and Indices
                      : formData.category === 'קריפטו'
                        ? ['crypto'] // Crypto: show only Crypto
                        : ['us-stock', 'il-stock', 'index', 'crypto'] // Default: show all
                  }
                />
              ) : (
                // Manual input for Real Estate and Other categories
                <>
                  {!showNewSymbol ? (
                    <div className="space-y-2">
                      <CustomSelect
                        value={formData.symbol || ''}
                        onChange={(val) => {
                          if (val === '__NEW__') {
                            setShowNewSymbol(true);
                          } else {
                            setFormData({ ...formData, symbol: val });
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
                        value={formData.symbol || ''}
                        onChange={e => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}

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
              {/* <p className="text-xs text-slate-500 dark:text-slate-400 mt-1" dir="rtl">
                {formData.category === 'מניות' || formData.category === 'קריפטו'
                  ? 'חיפוש חכם - נבחר אוטומטית מהמאגר הרשמי'
                  : 'מזהה סטנדרטי לזיהוי נכסים זהים על פני פלטפורמות שונות'}
              </p> */}
            </div>
          )}
          <div className="md:col-span-2">
            <div className="flex justify-betweFen items-center mb-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">שם הנכס</label>
              {(formData.category === 'מניות' || formData.category === 'קריפטו') && (
                <label className="text-xs mr-2 text-slate-500 dark:text-slate-400">(במניות וקריפטו מוזן אוטומטי)</label>
              )}
            </div>
            <input
              type="text"
              required
              className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="לדוג': מחקה מדד נאסד''ק"
            />
          </div>

          {/* Technical Symbol/ID Field - Shows what will actually be saved */}
          {formData.category !== 'מזומן' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {formData.category === 'מניות' && formData.apiId?.startsWith('tase:')
                  ? 'מספר נייר ערך (ת״א)'
                  : formData.category === 'מניות'
                    ? 'סימול מניה (Ticker)'
                    : formData.category === 'קריפטו'
                      ? 'סימול מטבע קריפטו'
                      : 'מזהה טכני'}
                <span className="text-xs text-slate-500 dark:text-slate-400 mr-2">
                  (עוזר למעקב מחיר עדכני)
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full p-3 pr-16 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 font-mono text-sm"
                  value={
                    formData.apiId?.startsWith('tase:')
                      ? formData.apiId.replace('tase:', '')
                      : formData.apiId?.startsWith('cg:')
                        ? formData.apiId.replace('cg:', '')
                        : formData.apiId?.startsWith('yahoo:')
                          ? formData.apiId.replace('yahoo:', '')
                          : formData.symbol || formData.apiId || ''
                  }
                  onChange={e => {
                    const rawValue = e.target.value.trim();
                    let newApiId = rawValue;

                    // Add appropriate prefix based on category
                    if (rawValue) {
                      if (formData.category === 'קריפטו') {
                        newApiId = rawValue.startsWith('cg:') ? rawValue : `cg:${rawValue}`;
                      } else if (formData.marketDataSource === 'tase-local' || /^\d+$/.test(rawValue)) {
                        newApiId = rawValue.startsWith('tase:') ? rawValue : `tase:${rawValue}`;
                      } else {
                        newApiId = rawValue.startsWith('yahoo:') ? rawValue : `yahoo:${rawValue}`;
                      }
                    }

                    setFormData({
                      ...formData,
                      apiId: newApiId,
                      symbol: rawValue
                    });
                  }}
                  placeholder={
                    formData.category === 'מניות' && formData.apiId?.startsWith('tase:')
                      ? 'לדוגמה: 5138524'
                      : formData.category === 'מניות'
                        ? 'לדוגמה: AAPL'
                        : formData.category === 'קריפטו'
                          ? 'לדוגמה: bitcoin'
                          : 'מזהה ייחודי'
                  }
                  readOnly={!formData.category || formData.category === 'מזומן'}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900/50 px-2 py-0.5 rounded-full pointer-events-none">
                  {formData.apiId?.startsWith('tase:') ? 'TASE'
                    : formData.apiId?.startsWith('cg:') ? 'CG'
                      : formData.apiId?.startsWith('yahoo:') ? 'Yahoo'
                        : 'ID'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                {formData.category === 'מניות' && formData.apiId?.startsWith('tase:')
                  ? '💡 מספר הנייר בבורסה בתל אביב - נשלף אוטומטית מהחיפוש'
                  : formData.category === 'מניות'
                    ? '💡 סימול המניה בבורסה (לדוגמה: AAPL, TSLA, MSFT)'
                    : formData.category === 'קריפטו'
                      ? '💡 שם המטבע הקריפטוגרפי ללא prefix (לדוגמה: bitcoin, ethereum)'
                      : 'המזהה הטכני לנכס במערכת'}
              </p>
            </div>
          )}
        </div>

        {/* Soft Section Divider */}
        <div className="border-t border-slate-100 dark:border-slate-800 -mx-2 md:-mx-8" />

        {/* Value Tracking Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Asset  Tracking Method - Hidden for Cash */}
          {formData.category !== 'מזומן' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                אופן חישוב ערך הנכס
              </label>
              <AssetModeSelector
                value={formData.assetMode}
                onChange={(mode) => setFormData({ ...formData, assetMode: mode })}
              />
            </div>
          )}

          {/* Currency selector - Hidden for Cash category */}
          {formData.category !== 'מזומן' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">מטבע</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, currency: 'ILS' })}
                  className={`flex-1 px-4 py-1 rounded-xl border-2 transition-all font-medium ${formData.currency === 'ILS'
                    ? 'bg-emerald-600 dark:bg-emerald-500 text-white border-emerald-600 dark:border-emerald-500 shadow-md'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500'
                    }`}
                >
                  <span className="text-2xl mb-1 block">₪</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, currency: 'USD' })}
                  className={`flex-1 px-4 py-1 rounded-xl border-2 transition-all font-medium ${formData.currency === 'USD'
                    ? 'bg-emerald-600 dark:bg-emerald-500 text-white border-emerald-600 dark:border-emerald-500 shadow-md'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500'
                    }`}
                >
                  <span className="text-2xl mb-1 mt-1 block">$</span>
                </button>
              </div>
            </div>
          )}

          {/* QUANTITY Mode Fields - Hidden for Cash category */}
          {formData.category === 'מזומן' ? (
            /* Cash category - only show amount */
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">סכום</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  step="any"
                  className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono pr-12"
                  value={formData.originalValue || ''}
                  onChange={e => setFormData({ ...formData, originalValue: e.target.value })}
                  placeholder="הזן סכום"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-sm font-bold">
                  {formData.currency === 'ILS' ? '₪' : '$'}
                </span>
              </div>
            </div>
          ) : formData.assetMode === 'QUANTITY' ? (
            <>
              {/* Row 1: Date + Price (auto-fetched) */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <span className="flex items-center gap-2">
                    <Calendar size={14} />
                    מתי ביצעת את הרכישה?
                  </span>
                </label>
                <input
                  type="date"
                  className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  value={formData.purchaseDate}
                  onChange={e => {
                    setFormData({ ...formData, purchaseDate: e.target.value, purchasePrice: '' });
                    setLastEditedField('purchaseDate');
                    setIsPriceManual(false); // Reset manual mode when date changes (allow auto-fetch)
                  }}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-2">
                      מחיר ליחידה ברכישה
                    </span>
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={handleFetchCurrentPrice}
                      disabled={priceLoading || (!formData.apiId && !formData.symbol)}
                      className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex gap-1 items-center disabled:opacity-50"
                      title="שלוף מחיר נוכחי"
                    >
                      {priceLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      נוכחי
                    </button>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={handleFetchHistoricalPrice}
                      disabled={priceLoading || (!formData.apiId && !formData.symbol) || !formData.purchaseDate}
                      className="text-xs text-blue-600 dark:text-blue-400 font-bold flex gap-1 items-center disabled:opacity-50"
                      title="שלוף מחיר היסטורי לפי תאריך"
                    >
                      {priceLoading ? <Loader2 size={12} className="animate-spin" /> : <Calendar size={12} />}
                      היסטורי
                    </button>
                  </div>
                </div>
                <div className="relative">
                  {/* <input
                    type="number"
                    step="any"
                    className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-600 text-slate-900 dark:text-slate-100 font-mono pr-12"
                    value={formData.purchasePrice || ''}
                    onChange={e => {
                      const newPrice = e.target.value;
                      const priceNum = Number(newPrice);

                      setFormData({ ...formData, purchasePrice: newPrice });
                      setLastEditedField('purchasePrice');

                      // If user enters a valid price manually, store it as native price in current currency
                      // This allows currency conversion to work even in manual mode
                      if (priceNum > 0 && !isNaN(priceNum)) {
                        // Store the manually entered price as native price in the selected currency
                        // This way, currency conversion will work from this base
                        setNativePrice(priceNum);
                        if (!nativeCurrency) {
                          setNativeCurrency(formData.currency);
                        }
                        setIsPriceManual(true); // Still mark as manual to prevent auto-fetch
                      }
                    }}
                    placeholder="לדוגמה: 50,000 או 5.5"
                  /> */}
                  <input
                    type="number"
                    step="any" // מאפשר כל דיוק עשרוני
                    className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-600 text-slate-900 dark:text-slate-100 font-mono pr-12"
                    value={formData.purchasePrice || ''}
                    onChange={e => {
                      const newPrice = e.target.value;
                      // שמירה על הערך הגולמי המדויק (string) כדי לא לאבד אפסים או ספרות
                      setFormData({ ...formData, purchasePrice: newPrice });
                      setLastEditedField('purchasePrice');

                      const priceNum = Number(newPrice);
                      if (priceNum > 0 && !isNaN(priceNum)) {
                        setNativePrice(priceNum);
                        if (!nativeCurrency) {
                          setNativeCurrency(formData.currency);
                        }
                        setIsPriceManual(true);
                      }
                    }}
                    onBlur={() => {
                      // אופציונלי: פורמט יפה ביציאה מהשדה, אבל בזהירות לא לאבד דיוק
                      if (formData.purchasePrice) {
                        const num = Number(formData.purchasePrice);
                        // מציג עד 4 ספרות אם צריך, אבל לא סתם אפסים
                        // למשל: 4.2392 יישאר 4.2392, אבל 4.2000 יהפוך ל-4.2
                        setFormData(prev => ({
                          ...prev,
                          purchasePrice: num.toString()
                        }));
                      }
                    }}
                    placeholder="נשלף אוטומטית"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-sm">
                    {formData.currency === 'ILS' ? '₪' : '$'}
                  </span>
                  {priceLoading && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 size={16} className="animate-spin text-blue-500" />
                    </span>
                  )}
                </div>
              </div>

              {/* Row 2: Total Cost OR Quantity - user chooses which to fill */}
              <div className="md:col-span-2">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                  {/* <p className="text-sm text-blue-700 dark:text-blue-300 mb-3 font-medium">
                    💡 בחר אחד מהשניים - השני יחושב אוטומטית:
                  </p> */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Total Cost Input */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        <span className="flex items-center gap-2">
                          💵 כמה השקעת בסה"כ?
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          className={`w-full p-3 border rounded-lg text-slate-900 dark:text-slate-100 font-mono pr-12 transition-all ${lastEditedField === 'totalCost'
                            ? 'border-blue-400 dark:border-blue-500 bg-white dark:bg-slate-700 ring-2 ring-blue-200 dark:ring-blue-800'
                            : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700'
                            }`}
                          value={formData.totalCost || ''}
                          onChange={e => {
                            setFormData({ ...formData, totalCost: e.target.value });
                            setLastEditedField('totalCost');
                          }}
                          placeholder={`לדוגמה: ${formData.currency === 'ILS' ? '5,000 ₪' : '$1,000'}`}

                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-sm font-bold">
                          {formData.currency === 'ILS' ? '₪' : '$'}
                        </span>
                      </div>
                      {lastEditedField === 'totalCost' && formData.purchasePrice && formData.totalCost && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                          ✓ כמות: {(Number(formData.totalCost) / Number(formData.purchasePrice)).toFixed(6)} יחידות
                        </p>
                      )}
                    </div>

                    {/* Quantity Input */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        <span className="flex items-center gap-2">
                          <Hash size={14} />
                          כמה יחידות רכשת?
                        </span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        className={`w-full p-3 border rounded-lg text-slate-900 dark:text-slate-100 font-mono transition-all ${lastEditedField === 'quantity'
                          ? 'border-blue-400 dark:border-blue-500 bg-white dark:bg-slate-700 ring-2 ring-blue-200 dark:ring-blue-800'
                          : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700'
                          }`}
                        value={formData.quantity || ''}
                        onChange={e => {
                          setFormData({ ...formData, quantity: e.target.value });
                          setLastEditedField('quantity');
                        }}
                        placeholder="לדוגמה: 2.5 יחידות"

                      />
                      {lastEditedField === 'quantity' && formData.purchasePrice && formData.quantity && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                          ✓ עלות: {formData.currency === 'ILS' ? '₪' : '$'}{(Number(formData.quantity) * Number(formData.purchasePrice)).toLocaleString('he-IL', { maximumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Display */}
              <div className="md:col-span-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                  סיכום עסקה
                </label>
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono" >
                    {formData.currency === 'ILS' ? '₪' : '$'}
                    {estimatedValue.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm text-emerald-600/80 dark:text-emerald-400/80">
                    = {formData.quantity || '?'} יחידות × {formData.purchasePrice ? `${formData.currency === 'ILS' ? '₪' : '$'}${Number(formData.purchasePrice).toLocaleString('he-IL', { maximumFractionDigits: 4 })}` : '?'} ליחידה
                  </div>
                </div>
                {!formData.purchasePrice && formData.apiId && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    בחר תאריך רכישה כדי לשלוף מחיר אוטומטית
                  </p>
                )}
              </div>
            </>
          ) : (
            /* LEGACY Mode - Static Value */
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">שווי כולל</label>
              <input
                type="number"
                required
                className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                value={formData.originalValue}
                onChange={e => setFormData({ ...formData, originalValue: e.target.value })}
              />
            </div>
          )}
        </div>

        {/* Soft Section Divider */}
        <div className="border-t border-slate-100 dark:border-slate-800 -mx-2 md:-mx-8" />

        {/* Optional Metadata Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <div className="flex justify-between mb-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Tag size={14} />
                תגיות (אופציונלי)
              </label>
              <button
                type="button"
                onClick={handleGenerateTags}
                className="text-xs text-purple-600 dark:text-purple-400 font-bold flex gap-1 items-center"
              >
                {tagLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}    צור עם AI
              </button>
            </div>
            <input
              type="text"
              className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              value={formData.tags || ''}
              onChange={e => setFormData({ ...formData, tags: e.target.value })}
              placeholder="לדוגמה: הכנסה פסיבית, ארוך טווח"
            />
          </div>
        </div>

        {/* Action Buttons with Clear Hierarchy */}
        <div className="flex flex-col-reverse md:flex-row justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700 mt-8">
          <button
            type="button"
            onClick={() => navigate('/assets')}
            className="px-6 py-3 md:py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
          >
            ביטול
          </button>
          <button
            type="submit"
            className="flex-1 md:flex-initial px-8 py-3 md:py-2.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md"
          >
            {id ? 'עדכן נכס' : 'שמור נכס'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssetForm;

