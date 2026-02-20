/**
 * DEPRECATED: Use the project's Python server (see SERVING.md) for same-origin proxy.
 * Cloudflare Worker: proxy for Wallex public API (fixes CORS).
 * Allowed: GET /v1/markets, GET /v1/depth?symbol=...
 */
const WALLEX_ORIGIN = 'https://api.wallex.ir';
const ALLOWED_PATHS = ['/v1/markets', '/v1/depth'];

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function isAllowed(pathname, search) {
  if (pathname === '/v1/markets') return true;
  if (pathname === '/v1/depth' && search && search.startsWith('?symbol=')) return true;
  return false;
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

    if (!isAllowed(url.pathname, url.search)) {
      return new Response('Not found', { status: 404, headers: corsHeaders(origin) });
    }

    try {
      const res = await fetch(WALLEX_ORIGIN + path, {
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
