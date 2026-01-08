/**
 * Service for fetching currency exchange rates
 * Now uses backend API (Vercel Functions) to avoid CORS issues
 */

import { getFx } from './backendApi';

/**
 * Fetches the current USD to ILS exchange rate
 * @returns {Promise<{rate: number, date: string} | null>}
 */
export const fetchExchangeRate = async () => {
  try {
    const fxData = await getFx('USD', 'ILS');
    if (!fxData || !fxData.rate) {
      return null;
    }
    
    return { 
      rate: fxData.rate, 
      date: new Date(fxData.timestamp).toISOString().split('T')[0]
    };
  } catch (error) {
    console.error("Failed to fetch exchange rates", error);
    return null;
  }
};

