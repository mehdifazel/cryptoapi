"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchNetworkDbFromApi } from "@/lib/shared/network-db";
import type { NetworkDb } from "@/lib/shared/network-db";

function getNetworksList(entry: string[] | { networks: string[]; fees?: Record<string, { amount: string; coin: string }> } | undefined): string[] {
  if (!entry) return [];
  return Array.isArray(entry) ? entry : entry.networks ?? [];
}

function getFeeDisplay(
  entry: { networks: string[]; fees?: Record<string, { amount: string; coin: string }> } | undefined,
  sym: string
): { fee: string; coin: string } {
  if (!entry || !entry.fees) return { fee: "-", coin: "-" };
  const nets = getNetworksList(entry);
  const feeParts = nets
    .map((n) => {
      const f = entry.fees![n];
      return f ? `${n}: ${f.amount}` : null;
    })
    .filter(Boolean) as string[];
  const coinSet: Record<string, boolean> = {};
  Object.keys(entry.fees!).forEach((n) => {
    const c = entry.fees![n].coin;
    if (c) coinSet[c] = true;
  });
  return {
    fee: feeParts.length ? feeParts.join("; ") : "-",
    coin: Object.keys(coinSet).length ? Object.keys(coinSet).join(", ") : sym.toUpperCase(),
  };
}

export default function WithdrawNetworksPage() {
  const [db, setDb] = useState<NetworkDb>({});
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchNetworkDbFromApi()
      .then((d) => {
        setDb(d ?? {});
        setError("");
      })
      .catch(() => {
        fetch("/data/nobitex-withdraw-networks.json", { cache: "no-store" })
          .then((r) => r.json())
          .then(setDb)
          .catch(() => setError("Failed to load data"));
      })
      .finally(() => setLoading(false));
  }, []);

  const keys = Object.keys(db).sort();
  const filtered = search.trim() ? keys.filter((k) => k.toLowerCase().includes(search.trim().toLowerCase())) : keys;

  return (
    <>
      <div className="exchange-nav">
        <Link href="/" className="nav-link">
          ← Home
        </Link>
      </div>
      <h1>Nobitex Withdraw Networks</h1>
      <p className="subtitle">Active withdrawal networks per cryptocurrency (from Nobitex API)</p>
      <p className="subtitle" style={{ marginTop: -12, fontSize: 12 }}>Auto-refreshes every 4 hours</p>

      <div className="main-content">
        <div className="db-header">
          <input
            type="text"
            className="db-search"
            placeholder="Search coin (e.g. cake, btc)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            Refresh from API
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "nobitex-withdraw-networks.json";
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            Download JSON
          </button>
        </div>
        <div className="db-stats">{loading ? "Loading..." : `${filtered.length} coins (total: ${keys.length})`}</div>
        {error && <div className="error">{error}</div>}
        <table className="db-table" style={{ display: loading && !keys.length ? "none" : "table" }}>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Networks</th>
              <th>Withdraw Fee</th>
              <th>Fee Coin</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sym) => {
              const entry = db[sym];
              const nets = getNetworksList(entry);
              const fd = getFeeDisplay(typeof entry === "object" && !Array.isArray(entry) ? entry : undefined, sym);
              return (
                <tr key={sym}>
                  <td className="pair">{sym.toUpperCase()}</td>
                  <td className="networks">{nets.join(", ")}</td>
                  <td className="networks">{fd.fee}</td>
                  <td className="networks">{fd.coin}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
