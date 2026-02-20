# Serving & deployment

This project runs as a **Next.js** app. Use:

- **Local:** `npm run dev` → http://localhost:3000  
- **Production:** `npm run build` then `npm start`  

See **README.md** for full instructions. Wallex and Ramzinex are proxied via Next.js API routes; no separate proxy server needed.

---

## Legacy: static HTML + Python proxy (optional)

Wallex and Ramzinex APIs may block browser requests (CORS). Run the included server so API calls are same-origin; the frontend uses `/api/ramzinex` and `/api/wallex` whenever the page is loaded over HTTP/HTTPS (not `file://`).

## Run from project root (no extra install)

```bash
python scripts/serve_and_proxy.py
```

Then open:

- **Home:** http://localhost:8888/
- **Ramzinex:** http://localhost:8888/ramzinex-prices.html
- **Wallex:** http://localhost:8888/wallex-prices.html
- **Nobitex:** http://localhost:8888/nobitex-prices.html

The server serves all static files and proxies:

- `GET /api/ramzinex/*` → `https://publicapi.ramzinex.com/*`
- `GET /api/wallex/*` → `https://api.wallex.ir/*`

Nobitex is unchanged and still calls its API directly.

## Production (VPS / cloud)

On a virtual server, run the same command. The script binds to all interfaces (`0.0.0.0`), so you can use the server IP or a domain.

- For HTTPS, put a reverse proxy (e.g. nginx or Caddy) in front and proxy to `http://127.0.0.1:8888`.
- Optional: run in the background (e.g. `nohup python scripts/serve_and_proxy.py &` or a systemd service).
