/**
 * Service for fetching currency exchange rates
 */

const EXCHANGE_RATE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

/**
 * Fetches the current USD to ILS exchange rate
 * @returns {Promise<{rate: number, date: string} | null>}
 */
export const fetchExchangeRate = async () => {
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
};

