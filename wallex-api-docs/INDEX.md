# Wallex API Documentation – Index

**Source:** https://api-docs.wallex.ir/  
**Crawl date:** 2025  
**Purpose:** Use of Wallex REST API (api.wallex.ir).

## Base URL

```
https://api.wallex.ir
```

## Authentication

- **Only endpoints that handle personal/account data require an API key.**
- Public endpoints (markets, depth, trades, OHLC) do **not** require and must **not** send `X-API-Key` in the official examples.
- For protected endpoints, send the key in the header:
  ```
  X-API-Key: <api-key>
  ```
- API keys can have an optional IP allowlist; empty list = all IPs allowed.
- Keys are valid up to 90 days and cannot be renewed.

## File structure

| File | Description |
|------|-------------|
| `INDEX.md` | This index and quick reference |
| `PROXY.md` | How to fix CORS by deploying an optional proxy |
| `proxy-worker.js` | Cloudflare Worker script for the proxy (copy into Workers dashboard) |

Full documentation (all sections, Farsi): https://api-docs.wallex.ir/

## Public endpoints (no API key)

Used by this project:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/markets` | List all markets with stats (bid/ask, 24h change, etc.) |
| GET | `/v1/depth?symbol=SYMBOL` | Order book for one market (e.g. `BTCUSDT`, `USDTTMN`) |
| GET | `/v2/depth/all` | Order book for all markets at once |

Other public:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/currencies/stats` | Global crypto stats |
| GET | `/v1/trades?symbol=SYMBOL` | Latest trades for a market |
| GET | `/v1/udf/history?symbol=...&resolution=...&from=...&to=...` | OHLC candles |

## Protected endpoints (require X-API-Key)

All under `/v1/account/`: profile, fee, card-numbers, ibans, balances, money-withdrawal, crypto-deposit, crypto-withdrawal, orders, openOrders, trades; and OTC under `/v1/account/otc/` and `/v1/otc/markets`.

## Request rules (from docs)

- All endpoints are only available at `https://api.wallex.ir`.
- Responses are JSON.
- GET: parameters in query string.
- PUT/POST/PATCH: body as `x-www-form-urlencoded` or `application/json`; set `Content-Type` accordingly.
- Rate limit: 100 requests per second (unless stated otherwise for specific endpoints).

## Why Wallex might fail in the browser while Nobitex works

1. **CORS**  
   The Wallex API may not send `Access-Control-Allow-Origin` for browser origins, so the browser blocks the response. **Fix:** Deploy the optional proxy (see **PROXY.md** and `proxy-worker.js`), then set `API_PROXY_BASE` in `js/wallex/config.js` to your proxy URL. The app will then load Wallex data via your proxy.

2. **Sending API key on public endpoints**  
   Public endpoints must not send `X-API-Key`; this project already uses a key-free fetch for `/v1/markets` and `/v1/depth`.

3. **Network / firewall**  
   Some networks or regions may block access to `api.wallex.ir`. The proxy (deployed on Cloudflare or your server) can help if your network allows it.

## Reference links

- **Wallex website:** https://wallex.ir/
- **API documentation:** https://api-docs.wallex.ir/
- **API management (create keys):** https://wallex.ir/app/my-account/api-management
