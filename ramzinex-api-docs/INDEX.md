# Ramzinex API Documentation – Index

**Source:** https://docs.ramzinex.com/ · Postman: https://documenter.getpostman.com/view/15475713/UyxnD4dH  
**Crawl date:** 2025  
**Purpose:** Use of Ramzinex public REST API for market data and orderbook.

## Base URL (public, no auth)

```
https://publicapi.ramzinex.com
```

Public endpoints do not require API key. Private (account) endpoints use https://ramzinex.com with token auth.

## File structure

| File   | Description              |
|--------|--------------------------|
| `INDEX.md` | This index and reference |
| `PROXY.md` | How to fix CORS by deploying an optional proxy |
| `proxy-worker.js` | Cloudflare Worker script for the proxy |

## CORS / connection error

If the prices page shows "Connection error" when served over HTTP, the browser may be blocking requests (CORS). Deploy the optional proxy (see **PROXY.md** and `proxy-worker.js`), then set `API_PROXY_BASE` in `js/ramzinex/config.js` to your proxy URL.

## Public endpoints used by this project

| Method | Path | Description |
|--------|------|-------------|
| GET | `/exchange/api/v1.0/exchange/pairs` | All trading pairs with buy/sell, pair_id, base/quote symbols, 24h stats |
| GET | `/exchange/api/v1.0/exchange/orderbooks/{pair_id}/buys_sells` | Orderbook for one pair (buys = bids, sells = asks) |

## Pairs response shape

- **Response:** `{ "data": [ ... ] }` (array of pair objects). Some docs use `result.data`; actual API returns `data` at top level.
- **Each pair:** `pair_id` (number), `buy` (best bid), `sell` (best ask), `base_currency_symbol` (e.g. `{ "en": "btc" }`), `quote_currency_symbol` (e.g. `{ "en": "irr" }` or `{ "en": "usdt" }`), `financial.last24h.change_percent`, `financial.last24h.quote_volume`, `url_name`.

Quote symbol: `irr` = Rial (RLS); map to internal `rls` for consistency with Nobitex.

## Orderbook response shape

- **Path:** `.../orderbooks/{pair_id}/buys_sells` where `pair_id` is numeric from pairs list.
- **Response:** `{ "data": { "buys": [ ... ], "sells": [ ... ] }, "status": 0 }`.
- **buys** = bids (descending price); **sells** = asks (ascending price).
- Each level: array `[ price, amount, total, ... ]`. Use first two elements as `[ price, amount ]` for setup/cumulative logic.

## Authentication (private endpoints)

API key format provided: `ApiKeyRuZxXk9:secret`. Used for account/orders; not required for pairs or orderbook.

## Python client (this project)

A small Python client that mirrors the official endpoints and uses your API key is in the repo:

- **Script:** `scripts/ramzinex_api.py`
- **Run:** `python scripts/ramzinex_api.py` (no extra packages; uses only standard library).
- **Config:** Edit `API_KEY` and `SEND_AUTH_ON_PUBLIC` at the top of the script. Public endpoints work without auth per docs; you can set `SEND_AUTH_ON_PUBLIC = True` to send the key on public calls too for testing.

## References

- **Website:** https://ramzinex.com  
- **API docs:** https://docs.ramzinex.com/  
- **Postman:** https://documenter.getpostman.com/view/15475713/UyxnD4dH  
- **PHP SDK:** https://github.com/ramzinex/php-sdk  
- **Python SDK:** https://github.com/hsnkhaki/python-ramzinex  
