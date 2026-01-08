/**
 * FX API - Fetch exchange rates
 * Uses ExchangeRate-API (free tier, no API key required)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchReliable, fetchJsonSafe } from './_utils/http';

interface FXResult {
  base: string;
  quote: string;
  rate: number;
  timestamp: number;
  source: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Ensure JSON content-type for all responses
  res.setHeader('Content-Type', 'application/json');
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const base = (req.query.base as string) || 'USD';
  const quote = (req.query.quote as string) || 'ILS';

  try {
    // ExchangeRate-API provides USD as base
    if (base !== 'USD') {
      // For non-USD base, we need to convert
      // This is a simplified version - for production, use a more robust FX API
      return res.status(400).json({ 
        error: 'Only USD base currency is supported',
        message: 'Please use base=USD'
      });
    }

    const url = `https://api.exchangerate-api.com/v4/latest/${base}`;
    const response = await fetchReliable(url, { timeoutMs: 5000, retries: 2 });

    if (!response.ok) {
      throw new Error(`ExchangeRate API error: ${response.status}`);
    }

    const data = await fetchJsonSafe(response);
    const rate = data.rates?.[quote];

    if (!rate) {
      return res.status(404).json({ 
        error: `Exchange rate not found for ${base}/${quote}` 
      });
    }

    const result: FXResult = {
      base,
      quote,
      rate,
      timestamp: Date.now(),
      source: 'exchangerate-api',
    };

    // Set cache headers (FX rates change less frequently)
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('FX API error:', error);
    const requestId = req.headers['x-vercel-id'] || req.headers['x-request-id'] || 'unknown';
    return res.status(500).json({
      error: 'Internal server error',
      details: error?.message || 'Unknown error',
      requestId: String(requestId),
    });
  }
}
