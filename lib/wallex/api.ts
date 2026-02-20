import { WALLEX_CONFIG } from "./config";
import type { PriceStat } from "@/lib/shared/utils";

const API_BASE = "/api/wallex";

function apiFetch(path: string, opts?: RequestInit): Promise<Response> {
  return fetch(API_BASE + path, { cache: "no-store", ...opts });
}

export function fetchWallexMarkets(): Promise<Record<string, PriceStat>> {
  return apiFetch("/v1/markets")
    .then((r) => r.json())
    .then((d: { success?: boolean; result?: { symbols?: Record<string, { baseAsset?: string; quoteAsset?: string; stats?: { bidPrice?: number; askPrice?: number; lastPrice?: number; "24h_ch"?: number; "24h_quoteVolume"?: number } }> } }) => {
      if (!d.success || !d.result?.symbols) return {};
      const symbols = d.result.symbols;
      const stats: Record<string, PriceStat> = {};
      for (const sym of Object.keys(symbols)) {
        const s = symbols[sym];
        const st = s?.stats;
        if (!st) continue;
        const base = (s?.baseAsset ?? sym.replace(/TMN|USDT|IRT$/i, "")).toLowerCase();
        const quote = (s?.quoteAsset ?? (sym.indexOf("TMN") !== -1 ? "TMN" : "USDT")).toLowerCase();
        const pairKey = base + "-" + (quote === "tmn" ? "rls" : quote);
        stats[pairKey] = {
          bestBuy: st.bidPrice ?? st.askPrice,
          bestSell: st.askPrice ?? st.bidPrice,
          latest: st.lastPrice ?? st.bidPrice,
          dayChange: st["24h_ch"] != null ? String(st["24h_ch"]) : "",
          volumeDst: parseFloat(String(st["24h_quoteVolume"])) || 0,
        };
      }
      return stats;
    });
}

export interface OrderbookResult {
  status: string;
  asks: [string, string][];
  bids: [string, string][];
  lastTradePrice?: string;
}

export function fetchWallexDepth(symbol: string): Promise<OrderbookResult> {
  return apiFetch("/v1/depth?symbol=" + encodeURIComponent(symbol))
    .then((r) => r.json())
    .then((d: { success?: boolean; result?: { ask?: Array<{ price?: unknown; quantity?: unknown }>; bid?: Array<{ price?: unknown; quantity?: unknown }> }; message?: string }) => {
      if (!d.success || !d.result) {
        return { status: "error", asks: [], bids: [], message: d.message ?? "No data" };
      }
      const r = d.result;
      const toLevels = (arr: Array<{ price?: unknown; quantity?: unknown }> | undefined) =>
        (arr ?? []).map((x) => [String(x?.price ?? "0"), String(x?.quantity ?? "0")] as [string, string]);
      const asks = toLevels(r.ask);
      const bids = toLevels(r.bid);
      const lastPrice = (asks[0]?.[0]) ?? (bids[0]?.[0]);
      return { status: "ok", asks, bids, lastTradePrice: lastPrice };
    });
}

export function pairToWallexSymbol(pair: string): string {
  const parts = (pair ?? "").split("-");
  const base = (parts[0] ?? "").toUpperCase();
  const quote = (parts[1] ?? "").toLowerCase();
  if (quote === "rls" || quote === "tmn") return base + "TMN";
  if (quote === "usdt") return base + "USDT";
  return base + quote.toUpperCase();
}
