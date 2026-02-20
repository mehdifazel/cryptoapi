/** Withdraw network data and display helpers. */

import type { BaseMultiplier } from "./utils";

export type NetworkDbEntry = { networks: string[]; fees?: Record<string, { amount: string; coin: string }> };
export type NetworkDb = Record<string, string[] | NetworkDbEntry>;

const COLORS: Record<string, string> = {
  ERC20: "#3d4a6e",
  "BEP20 (BSC)": "#6e5a24",
  TRC20: "#7a2d2d",
  Solana: "#1e5e4a",
  XRP: "#2d2d38",
  BCH: "#445a2a",
  BTC: "#8a5a14",
  LTC: "#4a4a4a",
  DOGE: "#5e5a1e",
  MATIC: "#42385e",
  AVAX: "#6e2a2a",
  BASE: "#1e3a6e",
  "Arbitrum one": "#2a4a6e",
  Optimism: "#6e1e2a",
  FIAT: "#1e5a38",
  "MultiversX eGold": "#1e6a5e",
  "Hedera Hashgraph": "#1e425e",
  "Hyperliquid HyperEVM": "#4a3e6e",
  Vaulta: "#4a3e6e",
  Lightning: "#8a5a14",
};

export function getColor(network: string): string {
  if (COLORS[network]) return COLORS[network];
  let h = 0;
  for (let i = 0; i < network.length; i++) h = ((h << 5) - h + network.charCodeAt(i)) | 0;
  return "hsl(" + Math.abs(h % 360) + ", 25%, 36%)";
}

export function shortName(network: string): string {
  if (!network) return "";
  const idx = network.indexOf(" ");
  return idx >= 0 ? network.substring(0, idx) : network;
}

function getNetworksArray(entry: string[] | NetworkDbEntry | null | undefined): string[] {
  if (!entry) return [];
  if (Array.isArray(entry)) return entry;
  if (entry.networks && Array.isArray(entry.networks)) return entry.networks;
  return [];
}

export function getNetworks(
  base: string,
  dbOverride: NetworkDb | null | undefined,
  parseBase: ((b: string) => BaseMultiplier | null) | null
): string[] {
  const b = (base ?? "").toLowerCase();
  const parsed = parseBase ? parseBase(base) : null;
  const keys = [b];
  if (parsed) keys.push(parsed.symbol.toLowerCase());
  const db = dbOverride && Object.keys(dbOverride).length ? dbOverride : {};
  for (let i = 0; i < keys.length; i++) {
    const entry = db[keys[i]];
    const nets = getNetworksArray(entry);
    if (nets.length) return nets;
  }
  return [];
}

export function getFee(
  base: string,
  network: string,
  dbOverride: NetworkDb | null | undefined,
  parseBase: ((b: string) => BaseMultiplier | null) | null
): { amount: string; coin: string } | null {
  const b = (base ?? "").toLowerCase();
  const parsed = parseBase ? parseBase(base) : null;
  const keys = [b];
  if (parsed) keys.push(parsed.symbol.toLowerCase());
  const db = dbOverride && Object.keys(dbOverride).length ? dbOverride : {};
  for (let i = 0; i < keys.length; i++) {
    const entry = db[keys[i]];
    if (entry && typeof entry === "object" && !Array.isArray(entry) && entry.fees && entry.fees[network])
      return entry.fees[network];
  }
  return null;
}

export function hasNetwork(
  base: string,
  shortFilter: string,
  dbOverride: NetworkDb | null | undefined,
  parseBase: ((b: string) => BaseMultiplier | null) | null
): boolean {
  if (!shortFilter) return true;
  const nets = getNetworks(base, dbOverride, parseBase);
  return nets.some((n) => shortName(n) === shortFilter);
}

export function getAllNetworkShortNames(dbOverride: NetworkDb | null | undefined): string[] {
  const db = dbOverride && Object.keys(dbOverride).length ? dbOverride : {};
  const set: Record<string, boolean> = {};
  Object.keys(db).forEach((k) => {
    getNetworksArray(db[k]).forEach((n) => (set[shortName(n)] = true));
  });
  return Object.keys(set).filter(Boolean).sort();
}

export interface PairTag {
  label: string;
  color: string;
  title: string;
}

export function getPairTags(
  base: string,
  dbOverride: NetworkDb | null | undefined,
  parseBase: ((b: string) => BaseMultiplier | null) | null
): PairTag[] {
  const nets = getNetworks(base, dbOverride, parseBase);
  if (!nets.length) return [];
  return nets.map((n) => {
    const label = shortName(n);
    const fee = getFee(base, n, dbOverride, parseBase);
    const title = fee?.amount ? `Withdraw fee: ${fee.amount} ${fee.coin ?? ""} · ${n}` : n;
    return { label, color: getColor(n), title };
  });
}

const NOBITEX_OPTIONS_URL = "https://apiv2.nobitex.ir/v2/options";
export const REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000;

function parseFee(s: unknown): string | null {
  if (s == null) return null;
  const clean = String(s).replace(/_/g, "");
  const num = parseFloat(clean);
  return Number.isFinite(num) ? num.toString() : clean;
}

export function fetchNetworkDbFromApi(): Promise<NetworkDb> {
  return fetch(NOBITEX_OPTIONS_URL, { cache: "no-store" })
    .then((r) => r.json())
    .then((data: { status?: string; coins?: Array<{ coin?: string; networkList?: Record<string, { withdrawEnable?: boolean; name?: string; network?: string; withdrawFee?: unknown }> }> }) => {
      if (data.status !== "ok" || !Array.isArray(data.coins)) return {};
      const next: NetworkDb = {};
      data.coins.forEach((c) => {
        const coin = (c.coin ?? "").toLowerCase();
        if (!coin) return;
        const list = c.networkList ?? {};
        const networks: string[] = [];
        const fees: Record<string, { amount: string; coin: string }> = {};
        const coinUpper = (c.coin ?? "").toUpperCase();
        Object.keys(list).forEach((k) => {
          const n = list[k];
          if (!n || !n.withdrawEnable) return;
          const name = n.name || n.network || "";
          if (!name) return;
          networks.push(name);
          const feeAmount = parseFee(n.withdrawFee);
          if (feeAmount) fees[name] = { amount: feeAmount, coin: coinUpper };
        });
        if (networks.length) next[coin] = { networks, fees: Object.keys(fees).length ? fees : undefined };
      });
      return next;
    });
}

export function fetchNetworkDbFromJson(): Promise<NetworkDb> {
  return fetch("/data/nobitex-withdraw-networks.json", { cache: "no-store" }).then((r) => r.json());
}
