#!/usr/bin/env python3
"""
Ramzinex API client – matches docs.ramzinex.com and official PHP SDK.
Public endpoints: publicapi.ramzinex.com (auth optional).
Private endpoints: ramzinex.com (auth required: Authorization Bearer <api_key>).
"""
import json
import urllib.request
import urllib.error

# Your API key (format from Ramzinex)
API_KEY = "ApiKeyRuZxXk9:b89c95d11a72f19c5be77e8239d860a963e89043736625233c2916ef95f0fbcf"

PUBLIC_BASE = "https://publicapi.ramzinex.com"
PRIVATE_BASE = "https://ramzinex.com"

# Set True to send Authorization on public endpoints too (for testing)
SEND_AUTH_ON_PUBLIC = True


def _request(url, method="GET", data=None, use_auth=False):
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "charset": "utf-8",
    }
    if use_auth and API_KEY:
        headers["Authorization"] = "Bearer " + API_KEY
    req = urllib.request.Request(url, headers=headers, method=method)
    if data is not None and method in ("POST", "PUT", "PATCH"):
        req.data = json.dumps(data).encode("utf-8")
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())


def _public(path, use_auth=SEND_AUTH_ON_PUBLIC):
    return _request(PUBLIC_BASE + path, use_auth=use_auth)


def _private(path, method="GET", data=None):
    return _request(PRIVATE_BASE + path, method=method, data=data, use_auth=True)


# ---------- Public (market data) ----------

def get_all_pairs():
    """All trading pairs with buy/sell, pair_id, 24h stats."""
    return _public("/exchange/api/v1.0/exchange/pairs")


def get_orderbook(pair_id):
    """Orderbook for one pair. pair_id from get_all_pairs()."""
    return _public("/exchange/api/v1.0/exchange/orderbooks/{}/buys_sells".format(int(pair_id)))


def get_price(pair_id):
    """Single pair details."""
    return _public("/exchange/api/v1.0/exchange/pairs/{}".format(int(pair_id)))


def get_networks(params=None):
    """Networks for deposit/withdraw. params: e.g. {'currency_id': 1, 'withdraw': 1}."""
    q = ("?" + urllib.parse.urlencode(params)) if params else ""
    return _public("/exchange/api/v1.0/exchange/networks" + q)


# ---------- Private (user) – need API key ----------

def get_orders(body=None):
    """User orders. body: limit, offset, pairs, states, isbuy."""
    return _private("/exchange/api/v1.0/exchange/users/me/orders3", method="POST", data=body or {})


def get_one_order(order_id):
    """Single order detail."""
    return _private("/exchange/api/v1.0/exchange/users/me/orders2/{}".format(order_id))


def get_balance_summary():
    """User funds summary."""
    return _private("/exchange/api/v1.0/exchange/users/me/funds/summaryDesktop")


def get_user_funds():
    """User funds details (all currencies)."""
    return _private("/exchange/api/v1.0/exchange/users/me/funds/details")


def get_currency_balance(currency_id):
    """Available balance for one currency."""
    return _private("/exchange/api/v1.0/exchange/users/me/funds/available/currency/{}".format(currency_id))


def get_total_currency_balance(currency_id):
    """Total balance for one currency."""
    return _private("/exchange/api/v1.0/exchange/users/me/funds/total/currency/{}".format(currency_id))


def set_limit_order(pair_id, amount, price, order_type):
    """order_type: 'buy' or 'sell'."""
    return _private("/exchange/api/v1.0/exchange/users/me/orders/limit/", method="POST", data={
        "pair_id": pair_id, "amount": amount, "price": price, "type": order_type
    })


def set_market_order(pair_id, amount, order_type):
    """order_type: 'buy' or 'sell'."""
    return _private("/exchange/api/v1.0/exchange/users/me/orders/market/", method="POST", data={
        "pair_id": pair_id, "amount": amount, "type": order_type
    })


def cancel_order(order_id):
    return _private("/exchange/api/v1.0/exchange/users/me/orders/{}/cancel".format(order_id), method="POST")


# ---------- Test / run ----------

if __name__ == "__main__":
    print("=== Ramzinex API (Python) ===\n")
    try:
        r = get_all_pairs()
        data = r.get("data") or []
        print("get_all_pairs(): {} pairs".format(len(data)))
        if data:
            p = data[0]
            print("  First: pair_id={}, buy={}, sell={}".format(p.get("pair_id"), p.get("buy"), p.get("sell")))
        pid = 272  # example
        ob = get_orderbook(pid)
        d = ob.get("data") or {}
        print("get_orderbook(272): buys={}, sells={}".format(len(d.get("buys") or []), len(d.get("sells") or [])))
    except urllib.error.HTTPError as e:
        print("HTTP error:", e.code, e.reason)
        if e.fp:
            print(e.fp.read().decode()[:500])
    except Exception as e:
        print("Error:", e)
