/**
 * DEPRECATED: Use the project's Python server (see SERVING.md) for same-origin proxy.
 * Cloudflare Worker: proxy for Ramzinex public API (fixes CORS).
 * Allowed: GET /exchange/api/v1.0/exchange/pairs, GET /exchange/api/v1.0/exchange/orderbooks/{id}/buys_sells
 */
const RAMZINEX_ORIGIN = 'https://publicapi.ramzinex.com';

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function isAllowed(pathname) {
  if (pathname === '/exchange/api/v1.0/exchange/pairs') return true;
  var m = pathname.match(/^\/exchange\/api\/v1\.0\/exchange\/orderbooks\/(\d+)\/buys_sells$/);
  return !!m;
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);
    const path = url.pathname + url.search;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders(origin) });
    }

    if (!isAllowed(url.pathname)) {
      return new Response('Not found', { status: 404, headers: corsHeaders(origin) });
    }

    try {
      const res = await fetch(RAMZINEX_ORIGIN + path, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-store' },
      });
      const body = await res.arrayBuffer();
      const headers = new Headers(res.headers);
      headers.set('Access-Control-Allow-Origin', origin || '*');
      headers.delete('content-security-policy');
      headers.delete('x-frame-options');
      return new Response(body, { status: res.status, statusText: res.statusText, headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e.message || e) }), {
        status: 502,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }
  },
};
