import { NOBITEX_CONFIG } from "./config";
import type { PriceStat } from "@/lib/shared/utils";

const BASE = NOBITEX_CONFIG.API_BASE;

export function fetchNobitex(path: string, opts?: RequestInit): Promise<Response> {
  return fetch(BASE + path, { cache: "no-store", ...opts });
}

export function fetchNobitexStats(): Promise<Record<string, PriceStat>> {
  return fetchNobitex("/market/stats")
    .then((r) => r.json())
    .then((d: { status?: string; stats?: Record<string, PriceStat> }) => (d.status === "ok" && d.stats ? d.stats : {}));
}

export function pairToNobitexSymbol(pair: string): string {
  const p = pair.split("-");
  return p[0].toUpperCase() + (p[1] === "rls" ? "IRT" : "USDT");
}

const NOBITEX_ORDERBOOK_PROXY = "/api/nobitex";

/** Fetch orderbook via Next.js proxy to avoid CORS when called from browser. */
export function fetchNobitexOrderbook(symbol: string): Promise<Response> {
  return fetch(NOBITEX_ORDERBOOK_PROXY + "/v3/orderbook/" + encodeURIComponent(symbol), {
    cache: "no-store",
  });
}

export type WithdrawCoins = Record<string, string[]>;

export function fetchWithdraw(onSuccess: (coins: WithdrawCoins) => void, retries = 0): void {
  fetchNobitex("/v2/options")
    .then((r) => r.json())
    .then((d: { status?: string; coins?: Array<{ coin?: string; networkList?: Record<string, { withdrawEnable?: boolean; name?: string; network?: string }> }> }) => {
      if (d.status !== "ok" || !Array.isArray(d.coins)) {
        if (retries > 0) setTimeout(() => fetchWithdraw(onSuccess, retries - 1), 2000);
        return;
      }
      const next: WithdrawCoins = {};
      d.coins.forEach((c) => {
        const k = (c.coin ?? "").toLowerCase();
        if (!k) return;
        const list = c.networkList ?? {};
        const nets = Object.keys(list)
          .map((key) => list[key])
          .filter((n) => n?.withdrawEnable)
          .map((n) => n?.name || n?.network || "")
          .filter(Boolean);
        if (nets.length) next[k] = nets;
      });
      onSuccess(next);
    })
    .catch(() => {
      if (retries > 0) setTimeout(() => fetchWithdraw(onSuccess, retries - 1), 2000);
    });
}
