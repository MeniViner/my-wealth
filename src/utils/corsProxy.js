/**
 * CORS Proxy Utility
 * Single source of truth for all browser-side CORS proxy requests.
 * Used for TASE data scraping (Funder/Globes) and CoinGecko from browser.
 * 
 * Proxy rotation strategy:
 * 1. cors.eu.org  - Best reliability in production (GET only)
 * 2. corsproxy.io - Fast, supports POST, sometimes blocked
 * 3. allorigins.win - Reliable GET fallback (wraps response)
 */

// ==================== PROXY CONFIGURATIONS ====================

const PROXIES = [
  {
    name: 'cors.eu.org',
    buildUrl: (target) => `https://cors.eu.org/${target}`,
    supportsPost: true,
    requiresUnwrap: false,
    timeoutMs: 5000,
  },
  {
    name: 'corsproxy.io',
    buildUrl: (target) => `https://corsproxy.io/?${encodeURIComponent(target)}`,
    supportsPost: true,
    requiresUnwrap: false,
    timeoutMs: 4000,
  },
  {
    name: 'allorigins.win',
    buildUrl: (target) => `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`,
    supportsPost: false,
    requiresUnwrap: true, // Response is wrapped in { contents: "..." }
    timeoutMs: 6000,
  },
];

// ==================== CORE FUNCTION ====================

/**
 * Fetch a URL through CORS proxy rotation.
 * Tries each proxy sequentially until one succeeds.
 * 
 * @param {string} targetUrl - The actual URL to fetch
 * @param {RequestInit} options - Fetch options (method, headers, body)
 * @returns {Promise<Response>} - The response (unwrapped if needed)
 */
export async function fetchWithProxy(targetUrl, options = {}) {
  const method = options.method || 'GET';
  const isPost = method === 'POST';

  // Filter proxies based on request method
  const viableProxies = PROXIES.filter(proxy => !isPost || proxy.supportsPost);

  for (const proxy of viableProxies) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), proxy.timeoutMs);

      const proxyUrl = proxy.buildUrl(targetUrl);
      const fetchOptions = { ...options, signal: controller.signal };

      const response = await fetch(proxyUrl, fetchOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        continue; // Try next proxy
      }

      // Unwrap allorigins-style responses
      if (proxy.requiresUnwrap) {
        const json = await response.json();
        if (json.contents) {
          return new Response(json.contents, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        continue; // Unexpected format, try next
      }

      return response;
    } catch (error) {
      // Timeout or network error — try next proxy
      continue;
    }
  }

  // All proxies failed
  return new Response(JSON.stringify({ error: 'All CORS proxies failed' }), {
    status: 502,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Parse JSON from a proxy response.
 * Handles potential double-wrapping from allorigins.
 * 
 * @param {Response} response - Fetch response
 * @returns {Promise<any>} Parsed JSON
 */
export async function parseProxyJson(response) {
  const text = await response.text();
  let parsed = JSON.parse(text);

  // Handle allorigins double-wrapping (if upstream returned it directly)
  if (parsed && typeof parsed === 'object' && parsed.contents && typeof parsed.contents === 'string') {
    try {
      parsed = JSON.parse(parsed.contents);
    } catch {
      // contents is not JSON, return as-is
    }
  }

  return parsed;
}
