"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import type { ExchangeAdapter } from "@/lib/exchange-types";
import type { PriceStat } from "@/lib/shared/utils";
import {
  fmtPrice,
  fmtRls,
  fmtPercent,
  fmtUsdtSetup,
  parseBaseMultiplier,
  hasPriceData,
  computeSetup,
  cumulUntilTarget,
  diffUsdtSellSetup,
  diffUsdtBuySetup,
  type OrderbookLevel,
} from "@/lib/shared/utils";
import { fetchTVPrices, getTVTitle } from "@/lib/shared/tv-api";
import {
  getPairTags,
  getAllNetworkShortNames,
  hasNetwork,
  fetchNetworkDbFromApi,
  fetchNetworkDbFromJson,
  type NetworkDb,
} from "@/lib/shared/network-db";
const TV_INTERVAL_MS = 5000;
const REST_POLL_MS = 5000;

interface ExchangePricesProps {
  adapter: ExchangeAdapter;
  exchangeName: string;
  withdrawCoins?: Record<string, string[]>;
}

export default function ExchangePrices({ adapter, exchangeName, withdrawCoins = {} }: ExchangePricesProps) {
  const [filter, setFilter] = useState<"rls" | "usdt">("rls");
  const [networkFilter, setNetworkFilter] = useState("");
  const [stats, setStats] = useState<Record<string, PriceStat>>({});
  const [pairIds, setPairIds] = useState<Record<string, number>>({});
  const [networkDb, setNetworkDb] = useState<NetworkDb | null>(null);
  const [orderbookPair, setOrderbookPair] = useState<string | null>(null);
  const [orderbookData, setOrderbookData] = useState<{ asks: OrderbookLevel[]; bids: OrderbookLevel[]; lastTradePrice?: string } | null>(null);
  const [orderbookLoading, setOrderbookLoading] = useState(false);
  const [allOrderbooks, setAllOrderbooks] = useState<Record<string, { asks: OrderbookLevel[]; bids: OrderbookLevel[] }>>({});
  const [allOrderbooksLoading, setAllOrderbooksLoading] = useState(false);
  const [tvPrices, setTvPrices] = useState<Record<string, string>>({});
  const [mtInput, setMtInput] = useState(100);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [connectionWarning, setConnectionWarning] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>("—");
  const restPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tvIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const orderbookPanelRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const quoteLabel = adapter.quoteLabel;
  const withdrawEnabled = (base: string) =>
    !adapter.withdrawEnabled ? true : adapter.withdrawEnabled(base);

  const getTVPriceForBase = useCallback(
    (base: string): number | null => {
      const p = parseBaseMultiplier(base);
      if (p) {
        const v = tvPrices[p.symbol];
        return v != null ? parseFloat(v) * p.factor : null;
      }
      const v = tvPrices[base];
      return v != null ? parseFloat(v) : null;
    },
    [tvPrices]
  );

  const fetchMarkets = useCallback(() => {
    adapter
      .fetchMarkets()
      .then((r) => {
        setStats(r.stats);
        if (r.pairIds) setPairIds(r.pairIds);
        setLoading(false);
        setError("");
        setConnectionWarning(false);
        setLastUpdateTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
      })
      .catch(() => {
        if (Object.keys(stats).length) setConnectionWarning(true);
        else {
          setError("Connection error. Try again or check your network.");
          setLoading(false);
        }
      });
  }, [adapter]);

  useEffect(() => {
    fetchMarkets();
    if (!restPollRef.current) restPollRef.current = setInterval(fetchMarkets, REST_POLL_MS);
    return () => {
      if (restPollRef.current) clearInterval(restPollRef.current);
    };
  }, [fetchMarkets]);

  useEffect(() => {
    fetchTVPrices(setTvPrices);
    if (!tvIntervalRef.current) tvIntervalRef.current = setInterval(() => fetchTVPrices(setTvPrices), TV_INTERVAL_MS);
    return () => {
      if (tvIntervalRef.current) clearInterval(tvIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    fetchNetworkDbFromApi()
      .then((d) => d && Object.keys(d).length && setNetworkDb(d))
      .catch(() => fetchNetworkDbFromJson().then((d) => d && Object.keys(d).length && setNetworkDb(d)));
  }, []);

  useEffect(() => {
    setLastUpdateTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
  }, []);

  useEffect(() => {
    try {
      const v = localStorage.getItem(`crypto-api-mt-${exchangeName}`);
      if (v != null) {
        const n = parseInt(v, 10);
        if (Number.isFinite(n) && n > 0) setMtInput(n);
      }
    } catch {}
  }, [exchangeName]);

  useEffect(() => {
    try {
      localStorage.setItem(`crypto-api-mt-${exchangeName}`, String(mtInput));
    } catch {}
  }, [exchangeName, mtInput]);

  const showOrderbook = useCallback(
    (pair: string) => {
      const key = adapter.getOrderbookKey(pair, pairIds);
      if (adapter.name === "Ramzinex" && typeof key === "number" && key === 0) {
        setOrderbookData(null);
        setOrderbookPair(pair);
        if (orderbookPanelRef.current) orderbookPanelRef.current.classList.add("show");
        return;
      }
      setOrderbookPair(pair);
      setOrderbookLoading(true);
      setOrderbookData(null);
      if (orderbookPanelRef.current) orderbookPanelRef.current.classList.add("show");
      adapter
        .fetchOrderbook(pair, key)
        .then((d) => {
          setOrderbookData(
            d.status === "ok" && d.asks && d.bids
              ? { asks: d.asks, bids: d.bids, lastTradePrice: d.lastTradePrice }
              : null
          );
        })
        .catch(() => setOrderbookData(null))
        .finally(() => setOrderbookLoading(false));
    },
    [adapter, pairIds]
  );

  const closeOrderbook = useCallback(() => {
    orderbookPanelRef.current?.classList.remove("show");
  }, []);

  const pairsRls =
    filter === "rls"
      ? Object.entries(stats)
          .filter(
            ([k, s]) =>
              k.endsWith("-rls") &&
              withdrawEnabled(k.slice(0, -4)) &&
              hasPriceData(s) &&
              hasNetwork(k.slice(0, -4).toLowerCase(), networkFilter, networkDb ?? undefined, parseBaseMultiplier)
          )
          .sort((a, b) => (b[1].volumeDst ?? 0) - (a[1].volumeDst ?? 0))
      : [];
  const pairsUsdt =
    filter === "usdt"
      ? Object.entries(stats)
          .filter(
            ([k, s]) =>
              k.endsWith("-usdt") &&
              hasPriceData(s) &&
              hasNetwork(k.slice(0, -5).toLowerCase(), networkFilter, networkDb ?? undefined, parseBaseMultiplier)
          )
          .sort((a, b) => (b[1].volumeDst ?? 0) - (a[1].volumeDst ?? 0))
      : [];

  const netOptions = getAllNetworkShortNames(networkDb ?? undefined);
  const ur = stats["usdt-rls"];
  const mt = Number.isFinite(mtInput) && mtInput > 0 ? mtInput : 100;
  const targetRls = adapter.mtToQuote(mt);

  const fetchAllOrderbooks = useCallback(
    (pairsToFetch: string[]) => {
      const uniq = Array.from(new Set(pairsToFetch));
      if (!uniq.length) return;
      setAllOrderbooksLoading(true);
      const CONCURRENCY = 5;
      const results: Record<string, { asks: OrderbookLevel[]; bids: OrderbookLevel[] }> = {};
      let index = 0;
      const run = (): Promise<void> => {
        if (index >= uniq.length) return Promise.resolve();
        const batch = uniq.slice(index, index + CONCURRENCY);
        index += CONCURRENCY;
        return Promise.all(
          batch.map((pair) => {
            const key = adapter.getOrderbookKey(pair, pairIds);
            if (adapter.name === "Ramzinex" && typeof key === "number" && key === 0)
              return Promise.resolve();
            return adapter
              .fetchOrderbook(pair, key)
              .then((d) => {
                if (d.status === "ok" && d.asks?.length && d.bids?.length)
                  results[pair] = { asks: d.asks, bids: d.bids };
              })
              .catch(() => {});
          })
        ).then(() => run());
      };
      run().then(() => {
        setAllOrderbooks((prev) => ({ ...prev, ...results }));
        setAllOrderbooksLoading(false);
      });
    },
    [adapter, pairIds]
  );

  const pairListKey =
    filter === "rls"
      ? pairsRls
          .map(([p]) => p)
          .sort()
          .join(",")
      : "";

  const usdtQuotePair = "usdt-rls";

  useEffect(() => {
    if (!Object.keys(stats).length) return;
    if (adapter.name === "Ramzinex" && !Object.keys(pairIds).length) return;
    const key = adapter.getOrderbookKey(usdtQuotePair, pairIds);
    if (adapter.name === "Ramzinex" && typeof key === "number" && key === 0) return;
    let cancelled = false;
    adapter
      .fetchOrderbook(usdtQuotePair, key)
      .then((d) => {
        if (cancelled) return;
        const asks = Array.isArray(d.asks) ? d.asks : [];
        const bids = Array.isArray(d.bids) ? d.bids : [];
        if (d.status === "ok" && asks.length > 0 && bids.length > 0) {
          setAllOrderbooks((prev) => ({ ...prev, [usdtQuotePair]: { asks, bids } }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [adapter, stats, pairIds]);

  const pairsUsdtRlsKey =
    filter === "usdt" ? pairsUsdt.map(([p]) => p.slice(0, -5) + "-rls").sort().join(",") : "";
  const pairsUsdtKey = filter === "usdt" ? pairsUsdt.map(([p]) => p).sort().join(",") : "";
  useEffect(() => {
    if (!Object.keys(stats).length) return;
    if (adapter.name === "Ramzinex" && !Object.keys(pairIds).length) return;
    const list =
      filter === "rls"
        ? [...pairsRls.map(([p]) => p), usdtQuotePair]
        : [usdtQuotePair, ...pairsUsdt.map(([p]) => p.slice(0, -5) + "-rls"), ...pairsUsdt.map(([p]) => p)];
    fetchAllOrderbooks(Array.from(new Set(list)));
  }, [filter, pairListKey, pairsUsdtRlsKey, pairsUsdtKey, Object.keys(pairIds).length, Object.keys(stats).length, fetchAllOrderbooks]);

  const onRefreshSetup = useCallback(() => {
    fetchTVPrices(setTvPrices);
    const list =
      filter === "rls"
        ? [...pairsRls.map(([p]) => p), "usdt-rls"]
        : ["usdt-rls", ...pairsUsdt.map(([p]) => p.slice(0, -5) + "-rls"), ...pairsUsdt.map(([p]) => p)];
    fetchAllOrderbooks(Array.from(new Set(list)));
  }, [fetchAllOrderbooks, filter, pairsRls, pairsUsdt]);

  const usdtRlsOb = allOrderbooks["usdt-rls"];
  const globalAvgBuyMT = useMemo(() => {
    if (!usdtRlsOb?.asks?.length || targetRls <= 0) return null;
    return cumulUntilTarget(usdtRlsOb.asks, targetRls);
  }, [usdtRlsOb, targetRls]);
  const globalAvgSellMT = useMemo(() => {
    if (!usdtRlsOb?.bids?.length || targetRls <= 0) return null;
    return cumulUntilTarget(usdtRlsOb.bids, targetRls);
  }, [usdtRlsOb, targetRls]);

  const targetUsdtForSellSetup =
    globalAvgBuyMT != null && globalAvgBuyMT > 0 ? targetRls / globalAvgBuyMT : null;
  const targetUsdtForBuySetup =
    globalAvgSellMT != null && globalAvgSellMT > 0 ? targetRls / globalAvgSellMT : null;

  const getRlsSortValue = useCallback(
    ([rlsPair, s]: [string, PriceStat], col: string): number | null => {
      if (col === "rls24h") return parseFloat(String(s.dayChange ?? 0)) ?? null;
      const ob = allOrderbooks[rlsPair];
      if (!ob?.asks?.length || !ob?.bids?.length) return null;
      const { sellSetup, buySetup } = computeSetup(ob.asks, ob.bids, targetRls);
      const base = rlsPair.slice(0, -4);
      const binance = getTVPriceForBase(base.toLowerCase());
      if (col === "usdtSellSetup") {
        const usdtSellVal =
          sellSetup != null && globalAvgBuyMT != null && globalAvgBuyMT > 0 ? sellSetup / globalAvgBuyMT : null;
        return diffUsdtSellSetup(usdtSellVal, binance ?? null);
      }
      if (col === "usdtBuySetup") {
        const usdtBuyVal =
          buySetup != null && globalAvgSellMT != null && globalAvgSellMT > 0 ? buySetup / globalAvgSellMT : null;
        return diffUsdtBuySetup(usdtBuyVal, binance ?? null);
      }
      return null;
    },
    [allOrderbooks, targetRls, globalAvgBuyMT, globalAvgSellMT, getTVPriceForBase]
  );

  const getUsdtSortValue = useCallback(
    ([pair, s]: [string, PriceStat], col: string): number | null => {
      if (col === "usdt24h") return parseFloat(String(s.dayChange ?? 0)) ?? null;
      const base = pair.slice(0, -5);
      const ob = allOrderbooks[pair];
      const binance = getTVPriceForBase(base.toLowerCase());
      if (col === "usdtSellSetup") {
        if (!ob?.bids?.length || targetUsdtForSellSetup == null || targetUsdtForSellSetup <= 0) return null;
        const usdtSellVal = cumulUntilTarget(ob.bids, targetUsdtForSellSetup);
        return diffUsdtSellSetup(usdtSellVal, binance ?? null);
      }
      if (col === "usdtBuySetup") {
        if (!ob?.asks?.length || targetUsdtForBuySetup == null || targetUsdtForBuySetup <= 0) return null;
        const usdtBuyVal = cumulUntilTarget(ob.asks, targetUsdtForBuySetup);
        return diffUsdtBuySetup(usdtBuyVal, binance ?? null);
      }
      return null;
    },
    [allOrderbooks, targetUsdtForSellSetup, targetUsdtForBuySetup, getTVPriceForBase]
  );

  const sortedRls = useMemo(() => {
    if (!sortCol || (sortCol !== "rls24h" && sortCol !== "usdtSellSetup" && sortCol !== "usdtBuySetup"))
      return pairsRls;
    const dir = sortDir;
    return [...pairsRls].sort((a, b) => {
      const va = getRlsSortValue(a, sortCol);
      const vb = getRlsSortValue(b, sortCol);
      const na = va == null;
      const nb = vb == null;
      if (na && nb) return 0;
      if (na) return 1;
      if (nb) return -1;
      return (va! - vb!) * dir;
    });
  }, [pairsRls, sortCol, sortDir, getRlsSortValue]);

  const sortedUsdt = useMemo(() => {
    if (!sortCol || (sortCol !== "usdt24h" && sortCol !== "usdtSellSetup" && sortCol !== "usdtBuySetup"))
      return pairsUsdt;
    const dir = sortDir;
    return [...pairsUsdt].sort((a, b) => {
      const va = getUsdtSortValue(a, sortCol);
      const vb = getUsdtSortValue(b, sortCol);
      const na = va == null;
      const nb = vb == null;
      if (na && nb) return 0;
      if (na) return 1;
      if (nb) return -1;
      return (va! - vb!) * dir;
    });
  }, [pairsUsdt, sortCol, sortDir, getUsdtSortValue]);

  const handleSort = useCallback(
    (col: string) => {
      setSortCol(col);
      setSortDir((prevDir) => (sortCol === col ? -prevDir : 1));
    },
    [sortCol]
  );

  return (
    <>
      <div className="exchange-nav">
        <Link href="/" className="nav-link">
          ← Home
        </Link>
        <Link href="/nobitex" className="nav-link">
          Nobitex
        </Link>
        <Link href="/wallex" className="nav-link">
          Wallex
        </Link>
        <Link href="/ramzinex" className="nav-link">
          Ramzinex
        </Link>
      </div>
      <h1>Live Prices</h1>
      <p className="subtitle">
        Market: {exchangeName} · Updates every {REST_POLL_MS / 1000} seconds
      </p>

      {connectionWarning && (
        <div className="connection-warning" style={{ display: "block" }}>
          Connection interrupted. Retrying in the background.
        </div>
      )}
      {error && <div className="error">{error}</div>}
      {loading && Object.keys(stats).length === 0 && <div className="loading">Loading markets...</div>}

      <div className="main-wrap" style={{ display: loading && !stats.length ? "none" : "flex" }}>
        <div id="orderbookTooltip" className="orderbook-tooltip" style={{ display: "none" }} ref={tooltipRef} />
        <aside ref={orderbookPanelRef} className="orderbook-panel">
          <div className="orderbook-header">
            <h2 id="orderbookTitle">
              {orderbookPair
                ? orderbookPair.split("-").map((x) => x.toUpperCase()).join(" / ")
                : "Market Depth"}
            </h2>
            <button type="button" className="orderbook-close" onClick={closeOrderbook} aria-label="Close">
              ×
            </button>
          </div>
          {orderbookLoading && <div className="orderbook-loading">Loading...</div>}
          <div className="orderbook-body" style={{ display: orderbookLoading ? "none" : "flex" }}>
            {orderbookData && (
              <>
                <table className="orderbook-table">
                  <thead>
                    <tr>
                      <th>Price</th>
                      <th>Amount</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...(orderbookData.asks ?? [])].reverse().slice(0, 50).map((row, i) => {
                      const px = String(row[0]);
                      const am = Number(row[1]);
                      const tot = parseFloat(px) * am;
                      return (
                        <tr key={`a-${i}`} className="ask-row">
                          <td>{fmtPrice(px)}</td>
                          <td>{am.toLocaleString("en-US", { maximumFractionDigits: 6 })}</td>
                          <td>{fmtPrice(tot)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="orderbook-price-line">
                  {orderbookData.lastTradePrice != null ? fmtPrice(orderbookData.lastTradePrice) : "-"}
                </div>
                <table className="orderbook-table">
                  <thead>
                    <tr>
                      <th>Price</th>
                      <th>Amount</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(orderbookData.bids ?? []).slice(0, 50).map((row, i) => {
                      const px = String(row[0]);
                      const am = Number(row[1]);
                      const tot = parseFloat(px) * am;
                      return (
                        <tr key={`b-${i}`} className="bid-row">
                          <td>{fmtPrice(px)}</td>
                          <td>{am.toLocaleString("en-US", { maximumFractionDigits: 6 })}</td>
                          <td>{fmtPrice(tot)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
            {!orderbookLoading && !orderbookData && orderbookPair && (
              <div className="orderbook-loading">No data for this market.</div>
            )}
          </div>
        </aside>

        <div className="main-content">
          <div className="stats-bar">
            <div className="stat usdt-rial">
              USDT/{quoteLabel} Buy <span>{ur ? fmtPrice(ur.bestSell) : "-"}</span>
            </div>
            <div className="stat usdt-rial">
              USDT/{quoteLabel} Sell <span>{ur ? fmtPrice(ur.bestBuy) : "-"}</span>
            </div>
            <div className="stat usdt-avg-100mt mt-inline">
              <span id="usdtAvgBuy100MT">{globalAvgBuyMT != null ? fmtRls(globalAvgBuyMT) : "-"}</span>
              <span className="stat-unit">Avg buy ({mt}M)</span>
            </div>
            <div className="stat usdt-avg-100mt mt-inline">
              <span id="usdtAvgSell100MT">{globalAvgSellMT != null ? fmtRls(globalAvgSellMT) : "-"}</span>
              <span className="stat-unit">Avg sell ({mt}M)</span>
            </div>
            <div className="stat usdt-mt-input mt-inline">
              <label htmlFor="mt-input">MT</label>
              <input
                id="mt-input"
                type="number"
                className="mt-input"
                min={1}
                value={mtInput}
                onChange={(e) => setMtInput(parseFloat(e.target.value) || 100)}
              />
            </div>
            <div className="stat">
              <button
                type="button"
                className="setup-refresh-btn"
                onClick={onRefreshSetup}
                disabled={allOrderbooksLoading}
                title="Refresh Avg buy, Avg sell, USDT setups"
              >
                {allOrderbooksLoading ? "…" : "Refresh"}
              </button>
            </div>
            <div className="stat">
              Last update <span id="lastUpdate" suppressHydrationWarning>{lastUpdateTime}</span>
            </div>
            <div className="stat">
              Markets <span id="marketCount">{filter === "rls" ? pairsRls.length : pairsUsdt.length}</span>
            </div>
          </div>

          <div className="tabs">
            <button
              type="button"
              className={"tab " + (filter === "rls" ? "active" : "")}
              onClick={() => setFilter("rls")}
            >
              {quoteLabel}
            </button>
            <button
              type="button"
              className={"tab " + (filter === "usdt" ? "active" : "")}
              onClick={() => setFilter("usdt")}
            >
              USDT
            </button>
            <select
              className="network-filter"
              value={networkFilter}
              onChange={(e) => setNetworkFilter(e.target.value)}
              aria-label="Filter by network"
            >
              <option value="">All networks</option>
              {netOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <table className="price-table" style={{ display: loading && !Object.keys(stats).length ? "none" : "table" }}>
            <thead>
              <tr>
                {filter === "rls" && (
                  <>
                    <th>Market</th>
                    <th>{quoteLabel} Buy</th>
                    <th>{quoteLabel} Sell</th>
                    <th>{quoteLabel} Last</th>
                    <th
                      className={"sortable" + (sortCol === "rls24h" ? (sortDir === 1 ? " sort-asc" : " sort-desc") : "")}
                      onClick={() => handleSort("rls24h")}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && handleSort("rls24h")}
                    >
                      {quoteLabel} 24h
                    </th>
                    <th>{quoteLabel} Sell Setup</th>
                    <th>{quoteLabel} Buy Setup</th>
                    <th
                      className={"sortable" + (sortCol === "usdtSellSetup" ? (sortDir === 1 ? " sort-asc" : " sort-desc") : "")}
                      onClick={() => handleSort("usdtSellSetup")}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && handleSort("usdtSellSetup")}
                    >
                      USDT Sell Setup
                    </th>
                    <th
                      className={"sortable" + (sortCol === "usdtBuySetup" ? (sortDir === 1 ? " sort-asc" : " sort-desc") : "")}
                      onClick={() => handleSort("usdtBuySetup")}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && handleSort("usdtBuySetup")}
                    >
                      USDT Buy Setup
                    </th>
                    <th title={getTVTitle()}>{getTVTitle()}</th>
                  </>
                )}
                {filter === "usdt" && (
                  <>
                    <th>Market</th>
                    <th>USDT Buy</th>
                    <th>USDT Sell</th>
                    <th>USDT Last</th>
                    <th
                      className={"sortable" + (sortCol === "usdt24h" ? (sortDir === 1 ? " sort-asc" : " sort-desc") : "")}
                      onClick={() => handleSort("usdt24h")}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && handleSort("usdt24h")}
                    >
                      USDT 24h
                    </th>
                    <th
                      className={"sortable" + (sortCol === "usdtSellSetup" ? (sortDir === 1 ? " sort-asc" : " sort-desc") : "")}
                      onClick={() => handleSort("usdtSellSetup")}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && handleSort("usdtSellSetup")}
                    >
                      USDT Sell Setup
                    </th>
                    <th
                      className={"sortable" + (sortCol === "usdtBuySetup" ? (sortDir === 1 ? " sort-asc" : " sort-desc") : "")}
                      onClick={() => handleSort("usdtBuySetup")}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && handleSort("usdtBuySetup")}
                    >
                      USDT Buy Setup
                    </th>
                    <th title={getTVTitle()}>{getTVTitle()}</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody ref={tbodyRef}>
              {filter === "rls" &&
                sortedRls.map(([rlsPair, s]) => {
                  const base = rlsPair.slice(0, -4);
                  const tags = getPairTags(base, networkDb ?? undefined, parseBaseMultiplier);
                  return (
                    <tr
                      key={rlsPair}
                      data-rls-pair={rlsPair}
                      data-day-change={s.dayChange ?? ""}
                      onClick={() => showOrderbook(rlsPair)}
                    >
                      <td className="pair">
                        {base.toUpperCase()}
                        {tags.map((t) => (
                          <span key={t.label} className="pair-net-tag" style={{ background: t.color }} title={t.title}>
                            {t.label}
                          </span>
                        ))}
                      </td>
                      <td className="price">{fmtPrice(s.bestBuy)}</td>
                      <td className="price">{fmtPrice(s.bestSell)}</td>
                      <td className="price">{fmtPrice(s.latest)}</td>
                      <td className={parseFloat(String(s.dayChange || 0)) >= 0 ? "positive" : "negative"}>
                        {fmtPercent(s.dayChange)}
                      </td>
                      <td className="price">
                        {(() => {
                          const ob = allOrderbooks[rlsPair];
                          if (!ob?.asks?.length || !ob?.bids?.length) return "-";
                          const { sellSetup } = computeSetup(ob.asks, ob.bids, targetRls);
                          return sellSetup != null ? fmtRls(sellSetup) : "-";
                        })()}
                      </td>
                      <td className="price">
                        {(() => {
                          const ob = allOrderbooks[rlsPair];
                          if (!ob?.asks?.length || !ob?.bids?.length) return "-";
                          const { buySetup } = computeSetup(ob.asks, ob.bids, targetRls);
                          return buySetup != null ? fmtRls(buySetup) : "-";
                        })()}
                      </td>
                      <td className="price">
                        {(() => {
                          const ob = allOrderbooks[rlsPair];
                          if (!ob?.asks?.length || !ob?.bids?.length) return "-";
                          const { sellSetup } = computeSetup(ob.asks, ob.bids, targetRls);
                          if (sellSetup == null || globalAvgBuyMT == null || globalAvgBuyMT <= 0) return "-";
                          const usdtSellVal = sellSetup / globalAvgBuyMT;
                          const binance = getTVPriceForBase(base.toLowerCase());
                          const diff = diffUsdtSellSetup(usdtSellVal, binance ?? null);
                          return (
                            <>
                              {fmtUsdtSetup(usdtSellVal)}
                              {diff != null && (
                                <>
                                  <br />
                                  <span className={`price-diff ${diff >= 0 ? "positive" : "negative"}`}>
                                    {diff >= 0 ? "+" : ""}
                                    {diff.toFixed(2)}%
                                  </span>
                                </>
                              )}
                            </>
                          );
                        })()}
                      </td>
                      <td className="price">
                        {(() => {
                          const ob = allOrderbooks[rlsPair];
                          if (!ob?.asks?.length || !ob?.bids?.length) return "-";
                          const { buySetup } = computeSetup(ob.asks, ob.bids, targetRls);
                          if (buySetup == null || globalAvgSellMT == null || globalAvgSellMT <= 0) return "-";
                          const usdtBuyVal = buySetup / globalAvgSellMT;
                          const binance = getTVPriceForBase(base.toLowerCase());
                          const diff = diffUsdtBuySetup(usdtBuyVal, binance ?? null);
                          return (
                            <>
                              {fmtUsdtSetup(usdtBuyVal)}
                              {diff != null && (
                                <>
                                  <br />
                                  <span className={`price-diff ${diff >= 0 ? "positive" : "negative"}`}>
                                    {diff >= 0 ? "+" : ""}
                                    {diff.toFixed(2)}%
                                  </span>
                                </>
                              )}
                            </>
                          );
                        })()}
                      </td>
                      <td className="price">{getTVPriceForBase(base.toLowerCase()) != null ? fmtUsdtSetup(getTVPriceForBase(base.toLowerCase())) : "-"}</td>
                    </tr>
                  );
                })}
              {filter === "usdt" &&
                sortedUsdt.map(([pair, s]) => {
                  const base = pair.slice(0, -5);
                  const tags = getPairTags(base, networkDb ?? undefined, parseBaseMultiplier);
                  return (
                    <tr key={pair} data-pair={pair} data-day-change={s.dayChange ?? ""} onClick={() => showOrderbook(pair)}>
                      <td className="pair">
                        {base.toUpperCase()}
                        {tags.map((t) => (
                          <span key={t.label} className="pair-net-tag" style={{ background: t.color }} title={t.title}>
                            {t.label}
                          </span>
                        ))}
                      </td>
                      <td className="price">{fmtPrice(s.bestBuy)}</td>
                      <td className="price">{fmtPrice(s.bestSell)}</td>
                      <td className="price">{fmtPrice(s.latest)}</td>
                      <td className={parseFloat(String(s.dayChange || 0)) >= 0 ? "positive" : "negative"}>
                        {fmtPercent(s.dayChange)}
                      </td>
                      <td className="price">
                        {(() => {
                          const ob = allOrderbooks[pair];
                          if (!ob?.bids?.length || targetUsdtForSellSetup == null || targetUsdtForSellSetup <= 0)
                            return "-";
                          const usdtSellVal = cumulUntilTarget(ob.bids, targetUsdtForSellSetup);
                          if (usdtSellVal == null) return "-";
                          const binance = getTVPriceForBase(base.toLowerCase());
                          const diff = diffUsdtSellSetup(usdtSellVal, binance ?? null);
                          return (
                            <>
                              {fmtUsdtSetup(usdtSellVal)}
                              {diff != null && (
                                <>
                                  <br />
                                  <span className={`price-diff ${diff >= 0 ? "positive" : "negative"}`}>
                                    {diff >= 0 ? "+" : ""}
                                    {diff.toFixed(2)}%
                                  </span>
                                </>
                              )}
                            </>
                          );
                        })()}
                      </td>
                      <td className="price">
                        {(() => {
                          const ob = allOrderbooks[pair];
                          if (!ob?.asks?.length || targetUsdtForBuySetup == null || targetUsdtForBuySetup <= 0)
                            return "-";
                          const usdtBuyVal = cumulUntilTarget(ob.asks, targetUsdtForBuySetup);
                          if (usdtBuyVal == null) return "-";
                          const binance = getTVPriceForBase(base.toLowerCase());
                          const diff = diffUsdtBuySetup(usdtBuyVal, binance ?? null);
                          return (
                            <>
                              {fmtUsdtSetup(usdtBuyVal)}
                              {diff != null && (
                                <>
                                  <br />
                                  <span className={`price-diff ${diff >= 0 ? "positive" : "negative"}`}>
                                    {diff >= 0 ? "+" : ""}
                                    {diff.toFixed(2)}%
                                  </span>
                                </>
                              )}
                            </>
                          );
                        })()}
                      </td>
                      <td className="price">{getTVPriceForBase(base.toLowerCase()) != null ? fmtUsdtSetup(getTVPriceForBase(base.toLowerCase())) : "-"}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
