/** Third-party price API (Binance) for comparison. */

const BINANCE_SPOT = "https://api.binance.com/api/v3/ticker/price";
const BINANCE_FUTURES = "https://fapi.binance.com/fapi/v1/ticker/price";

function parseBinance(data: unknown): Record<string, string> {
  if (!Array.isArray(data)) return {};
  const next: Record<string, string> = {};
  data.forEach((it: { symbol?: string; price?: unknown }) => {
    if (typeof it.symbol === "string" && it.symbol.endsWith("USDT") && it.price != null) {
      next[it.symbol.slice(0, -4).toLowerCase()] = String(it.price);
    }
  });
  return next;
}

export function fetchTVPrices(onSuccess: (prices: Record<string, string>) => void): void {
  Promise.all([
    fetch(BINANCE_SPOT).then((r) => r.json()),
    fetch(BINANCE_FUTURES).then((r) => r.json()),
  ])
    .then(([spotData, futuresData]) => {
      const next = parseBinance(spotData);
      const futures = parseBinance(futuresData);
      if (futures.xmr != null) next.xmr = futures.xmr;
      if (Object.keys(next).length > 0) onSuccess(next);
    })
    .catch(() => {});
}

export function getTVTitle(): string {
  return "Binance";
}
