import type { PriceStat } from "@/lib/shared/utils";

const API_BASE = "/api/ramzinex";

function fetchApi(path: string, opts?: RequestInit): Promise<Response> {
  return fetch(API_BASE + path, { cache: "no-store", ...opts });
}

export interface RamzinexMarketsResult {
  stats: Record<string, PriceStat>;
  pairIds: Record<string, number>;
}

export function fetchRamzinexMarkets(): Promise<RamzinexMarketsResult> {
  return fetchApi("/exchange/api/v1.0/exchange/pairs")
    .then((r) => r.json())
    .then((d: { data?: Array<{ base_currency_symbol?: string | { en?: string; fa?: string }; quote_currency_symbol?: string | { en?: string; fa?: string }; buy?: number; sell?: number; pair_id?: number; financial?: { last24h?: { change_percent?: number; quote_volume?: number } } }>; result?: { data?: typeof d.data } }) => {
      const list = d.data ?? d.result?.data ?? [];
      const stats: Record<string, PriceStat> = {};
      const pairIds: Record<string, number> = {};
      for (const p of list) {
        const base =
          typeof p.base_currency_symbol === "string"
            ? p.base_currency_symbol.toLowerCase()
            : (p.base_currency_symbol as { en?: string; fa?: string })?.en ?? (p.base_currency_symbol as { en?: string; fa?: string })?.fa
            ? String((p.base_currency_symbol as { en?: string; fa?: string }).en ?? (p.base_currency_symbol as { en?: string; fa?: string }).fa).toLowerCase()
            : "";
        const q = typeof p.quote_currency_symbol === "string" ? p.quote_currency_symbol : (p.quote_currency_symbol as { en?: string; fa?: string })?.en ?? (p.quote_currency_symbol as { en?: string; fa?: string })?.fa;
        const quote = (q === "irr" || q === "irt" || q === "rial" ? "rls" : q === "usdt" ? "usdt" : String(q ?? "")).toLowerCase();
        if (!base || !quote) continue;
        const pairKey = base + "-" + quote;
        const buy = Number(p.buy);
        const sell = Number(p.sell);
        const fin = (p as { financial?: { last24h?: { change_percent?: number; quote_volume?: number } } }).financial?.last24h;
        const change = fin?.change_percent != null ? String(fin.change_percent) : "";
        const vol = fin?.quote_volume != null ? Number(fin.quote_volume) : 0;
        stats[pairKey] = {
          bestBuy: buy,
          bestSell: sell,
          latest: sell || buy,
          dayChange: change,
          volumeDst: vol,
        };
        if (p.pair_id != null) pairIds[pairKey] = p.pair_id;
      }
      return { stats, pairIds };
    });
}

export interface OrderbookResult {
  status: string;
  asks: [string, number][];
  bids: [string, number][];
  lastTradePrice?: string;
}

export function fetchRamzinexOrderbook(pairId: number): Promise<OrderbookResult> {
  return fetchApi("/exchange/api/v1.0/exchange/orderbooks/" + pairId + "/buys_sells")
    .then((r) => r.json())
    .then((d: { data?: { sells?: [string, number][]; buys?: [string, number][] } }) => {
      const data = d.data ?? (d as { sells?: [string, number][]; buys?: [string, number][] });
      const sells = (data.sells ?? []).slice(0, 50).map((x) => [String(x[0]), Number(x[1]) || 0] as [string, number]);
      const buys = (data.buys ?? []).slice(0, 50).map((x) => [String(x[0]), Number(x[1]) || 0] as [string, number]);
      const last = (sells[0]?.[0]) ?? (buys[0]?.[0]);
      return { status: "ok", asks: sells, bids: buys, lastTradePrice: last };
    });
}
