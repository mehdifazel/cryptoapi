/** Shared formatting and utility functions for crypto price apps. */

export function fmt(
  n: number | string | null | undefined,
  opts?: Intl.NumberFormatOptions
): string {
  if (n == null || n === "") return "-";
  const x = parseFloat(String(n));
  if (!Number.isFinite(x)) return "-";
  return x.toLocaleString("en-US", opts ?? { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

export function fmtRls(n: number | string | null | undefined): string {
  return fmt(n, { maximumFractionDigits: 0 });
}

export function fmtPrice(n: number | string | null | undefined): string {
  return fmt(n);
}

export function fmtPercent(n: number | string | null | undefined): string {
  const x = parseFloat(String(n)) || 0;
  return (x >= 0 ? "+" : "") + x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
}

export function fmtUsdtSetup(n: number | string | null | undefined): string {
  const x = parseFloat(String(n));
  return Number.isFinite(x) ? x.toLocaleString("en-US", { maximumFractionDigits: 4 }) : "-";
}

export interface BaseMultiplier {
  symbol: string;
  factor: number;
}

export function parseBaseMultiplier(base: string | null | undefined): BaseMultiplier | null {
  if (!base || typeof base !== "string") return null;
  const m = base.match(/^(\d+(?:\.\d+)?)\s*([kmb])_(.+)$/i);
  if (!m) return null;
  const num = parseFloat(m[1]);
  const letter = (m[2] ?? "").toUpperCase();
  const symbol = (m[3] ?? "").toLowerCase();
  const mult = letter === "K" ? 1e3 : letter === "M" ? 1e6 : letter === "B" ? 1e9 : null;
  if (mult == null || !Number.isFinite(num)) return null;
  return { symbol, factor: num * mult };
}

export interface PriceStat {
  bestBuy?: number;
  bestSell?: number;
  latest?: number;
  dayChange?: string;
  volumeDst?: number;
}

export function hasPriceData(s: PriceStat | null | undefined): boolean {
  if (!s || typeof s !== "object") return false;
  const n = (v: unknown) => {
    const x = parseFloat(String(v));
    return Number.isFinite(x) && x > 0;
  };
  return n(s.bestBuy) || n(s.bestSell) || n(s.latest);
}

export type OrderbookLevel = [string, number] | [string, string];

export function cumulUntilTarget(levels: OrderbookLevel[], targetRls: number): number | null {
  let v = 0,
    a = 0;
  for (let i = 0; i < levels.length; i++) {
    const p = parseFloat(String(levels[i][0]));
    const am = parseFloat(String(levels[i][1]));
    v += p * am;
    a += am;
    if (v >= targetRls) return v / a;
  }
  return null;
}

export function computeSetup(
  asks: OrderbookLevel[],
  bids: OrderbookLevel[],
  targetRls: number
): { buySetup: number | null; sellSetup: number | null } {
  return {
    buySetup: cumulUntilTarget(asks ?? [], targetRls),
    sellSetup: cumulUntilTarget(bids ?? [], targetRls),
  };
}

export function diffUsdtBuySetup(usdtBuyVal: number | null | undefined, tvPrice: number | null | undefined): number | null {
  if (usdtBuyVal == null || tvPrice == null || usdtBuyVal === 0) return null;
  const u = parseFloat(String(usdtBuyVal));
  const t = parseFloat(String(tvPrice));
  return Number.isFinite(u) && Number.isFinite(t) && u !== 0 ? (t / u - 1) * 100 : null;
}

export function diffUsdtSellSetup(usdtSellVal: number | null | undefined, tvPrice: number | null | undefined): number | null {
  if (usdtSellVal == null || tvPrice == null || tvPrice === 0) return null;
  const u = parseFloat(String(usdtSellVal));
  const t = parseFloat(String(tvPrice));
  return Number.isFinite(u) && Number.isFinite(t) && t !== 0 ? (u / t - 1) * 100 : null;
}

