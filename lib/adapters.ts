import type { ExchangeAdapter, OrderbookData } from "./exchange-types";
import type { OrderbookLevel } from "./shared/utils";
import { fetchNobitex, fetchNobitexStats, pairToNobitexSymbol, fetchNobitexOrderbook } from "./nobitex/api";
import { NOBITEX_CONFIG } from "./nobitex/config";
import { fetchWallexMarkets, fetchWallexDepth, pairToWallexSymbol } from "./wallex/api";
import { WALLEX_CONFIG } from "./wallex/config";
import { fetchRamzinexMarkets, fetchRamzinexOrderbook } from "./ramzinex/api";
import { RAMZINEX_CONFIG } from "./ramzinex/config";

function toOrderbookLevels(arr: [string, string][] | [string, number][]): OrderbookLevel[] {
  return arr.map(([p, a]) => [p, typeof a === "string" ? parseFloat(a) || 0 : a] as OrderbookLevel);
}

export function nobitexAdapter(withdrawCoins: Record<string, string[]>): ExchangeAdapter {
  const withdrawEnabled = (base: string) => {
    const b = base.toLowerCase();
    if (Object.keys(withdrawCoins).length === 0) return true;
    return (withdrawCoins[b]?.length ?? 0) > 0;
  };
  return {
    name: "Nobitex",
    quoteLabel: "RLS",
    mtToQuote: (mt) => (Number.isFinite(mt) && mt > 0 ? mt * 1e7 : NOBITEX_CONFIG.MT_DEFAULT),
    fetchMarkets: () => fetchNobitexStats().then((stats) => ({ stats })),
    getOrderbookKey: (pair, _pairIds?) => pairToNobitexSymbol(pair),
    fetchOrderbook: (pair, symbol) =>
      fetchNobitexOrderbook(String(symbol))
        .then((r) => r.json())
        .then((d: { status?: string; asks?: [string, string][]; bids?: [string, string][]; lastTradePrice?: string }) => ({
          status: d.status ?? "error",
          asks: d.asks ?? [],
          bids: d.bids ?? [],
          lastTradePrice: d.lastTradePrice,
        }))
        .then((d) => ({ ...d, asks: toOrderbookLevels(d.asks), bids: toOrderbookLevels(d.bids) })),
    withdrawEnabled,
  };
}

export function wallexAdapter(): ExchangeAdapter {
  return {
    name: "Wallex",
    quoteLabel: "TMN",
    mtToQuote: (mt) => (Number.isFinite(mt) && mt > 0 ? mt * 1e6 : WALLEX_CONFIG.MT_DEFAULT),
    fetchMarkets: () => fetchWallexMarkets().then((stats) => ({ stats })),
    getOrderbookKey: (pair, _pairIds?) => pairToWallexSymbol(pair),
    fetchOrderbook: (_pair, symbol) =>
      fetchWallexDepth(String(symbol)).then((d) => ({
        status: d.status,
        asks: d.asks.map(([p, a]) => [p, typeof a === "string" ? parseFloat(a) || 0 : a]) as OrderbookLevel[],
        bids: d.bids.map(([p, a]) => [p, typeof a === "string" ? parseFloat(a) || 0 : a]) as OrderbookLevel[],
        lastTradePrice: d.lastTradePrice,
      })),
  };
}

export function ramzinexAdapter(): ExchangeAdapter {
  return {
    name: "Ramzinex",
    quoteLabel: "RLS",
    mtToQuote: (mt) => (Number.isFinite(mt) && mt > 0 ? mt * 1e7 : RAMZINEX_CONFIG.MT_DEFAULT),
    fetchMarkets: () => fetchRamzinexMarkets().then((r) => ({ stats: r.stats, pairIds: r.pairIds })),
    getOrderbookKey: (pair, pairIds) => (pairIds?.[pair] ?? 0) as number,
    fetchOrderbook: (_pair, pairId) =>
      fetchRamzinexOrderbook(Number(pairId)).then((d) => ({
        status: d.status,
        asks: d.asks as OrderbookLevel[],
        bids: d.bids as OrderbookLevel[],
        lastTradePrice: d.lastTradePrice,
      })),
  };
}
