/**
 * Health check endpoint
 * Returns 200 OK to verify API routes are working
 * Minimal and resilient - no external dependencies
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const isGet = req.method === 'GET';
    const isHead = req.method === 'HEAD';

    if (!isGet && !isHead) {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // HEAD requests: return headers only, no body
    if (isHead) {
      return res.status(200).end();
    }

    return res.status(200).json({ ok: true, timestamp: Date.now() });
  } catch (error: any) {
    // Defensive: ensure JSON response even on unexpected errors
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      error: 'Internal server error',
      details: error?.message || 'Unknown error',
    });
  }
}
