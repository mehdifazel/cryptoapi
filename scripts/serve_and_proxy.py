#!/usr/bin/env python3
"""
Local server: serves project files and proxies API requests to fix CORS.
Run from project root:  python scripts/serve_and_proxy.py
Then open:  http://localhost:8888/ramzinex-prices.html  and  http://localhost:8888/wallex-prices.html
Uses only standard library (no pip install).
"""
import json
import os
import urllib.request
import urllib.error
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8888
RAMZINEX_PREFIX = "/api/ramzinex"
WALLEX_PREFIX = "/api/wallex"
RAMZINEX_BASE = "https://publicapi.ramzinex.com"
WALLEX_BASE = "https://api.wallex.ir"


class ProxyHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith(RAMZINEX_PREFIX):
            self._proxy(RAMZINEX_BASE, self.path[len(RAMZINEX_PREFIX):])
            return
        if self.path.startswith(WALLEX_PREFIX):
            self._proxy(WALLEX_BASE, self.path[len(WALLEX_PREFIX):])
            return
        super().do_GET()

    def _proxy(self, base_url, path):
        url = base_url + path
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json", "Cache-Control": "no-store"})
            with urllib.request.urlopen(req, timeout=15) as r:
                body = r.read()
                self.send_response(200)
                self.send_header("Content-Type", r.headers.get("Content-Type") or "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(body)
        except urllib.error.HTTPError as e:
            body = e.read() if e.fp else b""
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def log_message(self, format, *args):
        print("[%s] %s" % (self.log_date_time_string(), format % args))


def main():
    # Run from project root (parent of scripts/)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(script_dir)
    os.chdir(root)
    server = HTTPServer(("", PORT), ProxyHandler)
    print("Serving at http://localhost:%s (Ramzinex + Wallex API proxied)" % PORT)
    print("Open: http://localhost:%s/ramzinex-prices.html" % PORT)
    print("Open: http://localhost:%s/wallex-prices.html" % PORT)
    print("Press Ctrl+C to stop.")
    server.serve_forever()


if __name__ == "__main__":
    main()
