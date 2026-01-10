/**
 * Currency Conversion Service
 * Single source of truth for currency conversion and formatting
 */

// Debug flag
const DEBUG_CURRENCY = import.meta.env.DEV;

const EXCHANGE_RATE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

/**
 * Fetch exchange rate from API
 * Returns rate and date for caching
 * @returns {Promise<{rate: number, date: string}|null>} Exchange rate data
 */
export async function fetchExchangeRate() {
  try {
    const res = await fetch(EXCHANGE_RATE_API_URL);
    if (!res.ok) {
      throw new Error(`Exchange rate API error: ${res.status}`);
    }
    const data = await res.json();
    return { 
      rate: data.rates.ILS, 
      date: data.date || new Date().toISOString().split('T')[0]
    };
  } catch (error) {
    console.error("Failed to fetch exchange rates", error);
    return null;
  }
}

/**
 * Get USD to ILS exchange rate (number only)
 * @returns {Promise<number>} Exchange rate (USD to ILS)
 */
export async function getExchangeRate() {
  // Import dynamically to avoid circular dependencies
  const { getExchangeRate: getFxRate } = await import('./priceService');
  return await getFxRate();
}

/**
 * Convert amount from one currency to another
 * Single canonical function for all currency conversions
 * 
 * Rules:
 * - If fromCurrency or toCurrency is missing -> return amount as-is
 * - If fromCurrency === toCurrency -> return amount as-is (NO conversion)
 * - Use correct direction based on exchange rate
 * 
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency ('USD' | 'ILS')
 * @param {string} toCurrency - Target currency ('USD' | 'ILS')
 * @param {number} [fxRate] - Optional exchange rate (USD->ILS). If not provided, will fetch.
 * @returns {Promise<number>} Converted amount
 */
export async function convertAmount(amount, fromCurrency, toCurrency, fxRate = null) {
  // Validate inputs
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
    if (DEBUG_CURRENCY) {
      console.warn('[CURRENCY DEBUG] Invalid amount:', amount);
    }
    return amount;
  }

  // Rule 1: Missing currencies -> return as-is
  if (!fromCurrency || !toCurrency) {
    if (DEBUG_CURRENCY) {
      console.log('[CURRENCY DEBUG] Missing currency, returning as-is:', { amount, fromCurrency, toCurrency });
    }
    return amount;
  }

  // Rule 2: Same currency -> return as-is (NO conversion)
  if (fromCurrency === toCurrency) {
    if (DEBUG_CURRENCY) {
      console.log('[CURRENCY DEBUG] Same currency, no conversion:', { amount, currency: fromCurrency });
    }
    return amount;
  }

  // Get exchange rate if not provided
  let rate = fxRate;
  if (!rate) {
    // Only fetch rate if we need USD/ILS conversion
    if ((fromCurrency === 'USD' && toCurrency === 'ILS') || 
        (fromCurrency === 'ILS' && toCurrency === 'USD')) {
      rate = await getExchangeRate();
    } else {
      // Unsupported currency pair
      if (DEBUG_CURRENCY) {
        console.warn('[CURRENCY DEBUG] Unsupported currency pair:', { fromCurrency, toCurrency });
      }
      return amount;
    }
  }

  // Rule 3: Convert using correct direction
  // Rate is USD->ILS (e.g., 1 USD = 3.7 ILS)
  let result;
  if (fromCurrency === 'USD' && toCurrency === 'ILS') {
    result = amount * rate;
  } else if (fromCurrency === 'ILS' && toCurrency === 'USD') {
    result = amount / rate;
  } else {
    // Unsupported conversion
    if (DEBUG_CURRENCY) {
      console.warn('[CURRENCY DEBUG] Unsupported conversion direction:', { fromCurrency, toCurrency });
    }
    return amount;
  }

  // Debug logging
  if (DEBUG_CURRENCY) {
    console.log('[CURRENCY DEBUG] Conversion:', {
      amount,
      fromCurrency,
      toCurrency,
      rateUsed: rate,
      result
    });
  }

  return result;
}

/**
 * Format amount as currency
 * Uses the currency of the displayed number (selected display currency)
 * 
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code ('USD' | 'ILS')
 * @param {Object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency, options = {}) {
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
    return '—';
  }

  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    locale = 'he-IL'
  } = options;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || 'ILS',
      minimumFractionDigits,
      maximumFractionDigits
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    const symbol = currency === 'USD' ? '$' : '₪';
    return `${symbol}${amount.toLocaleString(locale, { minimumFractionDigits, maximumFractionDigits })}`;
  }
}