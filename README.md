# Crypto API – Live Prices

Next.js + TypeScript app for live prices from **Nobitex**, **Wallex**, and **Ramzinex**. One stack, one commands set for local and production.

## Commands

- **Local (dev):** `npm run dev` → open http://localhost:3000
- **Production build:** `npm run build`
- **Run production build:** `npm start` (e.g. on a VPS after `npm run build`)

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Static + API routes:** Wallex and Ramzinex are proxied via `/api/wallex` and `/api/ramzinex` to avoid CORS; Nobitex is called directly.

## Structure

- `app/` – pages (home, nobitex, wallex, ramzinex, withdraw-networks) and API routes (`app/api/ramzinex/[...path]`, `app/api/wallex/[...path]`)
- `components/` – shared UI (e.g. `ExchangePrices`)
- `lib/` – shared utils, TV API, network DB, exchange configs and API clients, adapters

## Deploy (VPS)

1. `npm run build`
2. `npm start` (or use a process manager like pm2)
3. Put a reverse proxy (nginx/Caddy) in front for HTTPS if needed.

No Python or separate proxy server required; Next.js serves the app and proxies Wallex/Ramzinex.
