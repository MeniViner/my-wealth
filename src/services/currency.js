/**
 * Currency Conversion Service
 * Single source of truth for currency conversion and formatting.
 * 
 * NO circular dependencies — uses backendApi.getFx() for exchange rate.
 * Fallback: direct fetch to exchangerate-api.com if backend unavailable.
 */

import { getFx } from './backendApi';

// ==================== EXCHANGE RATE CACHE ====================

const fxCache = {
  rate: null,
  timestamp: null,
  TTL: 60 * 60 * 1000, // 1 hour
};

/**
 * Fetch USD→ILS exchange rate
 * Priority: Backend /api/fx → Direct API → Cached/Default
 * @returns {Promise<{rate: number, date: string}>}
 */
export async function fetchExchangeRate() {
  // Return cached if fresh
  if (fxCache.rate && fxCache.timestamp && (Date.now() - fxCache.timestamp < fxCache.TTL)) {
    return { rate: fxCache.rate, date: new Date(fxCache.timestamp).toISOString().split('T')[0] };
  }

  // Try 1: Backend API
  try {
    const data = await getFx('USD', 'ILS');
    if (data && typeof data.rate === 'number' && data.rate > 0) {
      fxCache.rate = data.rate;
      fxCache.timestamp = Date.now();
      return { rate: data.rate, date: new Date().toISOString().split('T')[0] };
    }
  } catch (err) {
    console.warn('[CURRENCY] Backend FX failed, trying direct API:', err.message);
  }

  // Try 2: Direct API (fallback for localhost or backend failure)
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (res.ok) {
      const data = await res.json();
      if (data.rates?.ILS) {
        fxCache.rate = data.rates.ILS;
        fxCache.timestamp = Date.now();
        return { rate: data.rates.ILS, date: data.date || new Date().toISOString().split('T')[0] };
      }
    }
  } catch (err) {
    console.warn('[CURRENCY] Direct API also failed:', err.message);
  }

  // Fallback: cached or default
  return { rate: fxCache.rate || 3.65, date: 'fallback' };
}

/**
 * Get USD→ILS exchange rate (number only)
 * @returns {Promise<number>}
 */
export async function getExchangeRate() {
  const data = await fetchExchangeRate();
  return data.rate;
}

/**
 * Convert amount from one currency to another
 * 
 * Rules:
 * - Missing currencies → return as-is
 * - Same currency → return as-is
 * - Only USD↔ILS supported; other pairs return as-is
 * 
 * @param {number} amount
 * @param {string} fromCurrency - 'USD' | 'ILS'
 * @param {string} toCurrency - 'USD' | 'ILS'
 * @param {number} [fxRate] - Optional pre-fetched rate
 * @returns {Promise<number>}
 */
export async function convertAmount(amount, fromCurrency, toCurrency, fxRate = null) {
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) return amount;
  if (!fromCurrency || !toCurrency) return amount;
  if (fromCurrency === toCurrency) return amount;

  // Only support USD↔ILS
  if (
    !(fromCurrency === 'USD' && toCurrency === 'ILS') &&
    !(fromCurrency === 'ILS' && toCurrency === 'USD')
  ) {
    return amount;
  }

  const rate = fxRate || await getExchangeRate();

  if (fromCurrency === 'USD' && toCurrency === 'ILS') {
    return amount * rate;
  }
  if (fromCurrency === 'ILS' && toCurrency === 'USD') {
    return amount / rate;
  }

  return amount;
}

/**
 * Format amount as currency string
 * @param {number} amount
 * @param {string} currency - 'USD' | 'ILS'
 * @param {Object} options
 * @returns {string}
 */
export function formatCurrency(amount, currency, options = {}) {
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) return '—';

  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    locale = 'he-IL',
  } = options;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || 'ILS',
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(amount);
  } catch {
    const symbol = currency === 'USD' ? '$' : '₪';
    return `${symbol}${amount.toLocaleString(locale, { minimumFractionDigits, maximumFractionDigits })}`;
  }
}
