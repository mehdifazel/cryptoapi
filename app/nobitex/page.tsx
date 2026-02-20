"use client";

import { useMemo, useState, useEffect } from "react";
import ExchangePrices from "@/components/ExchangePrices";
import { nobitexAdapter } from "@/lib/adapters";
import { fetchWithdraw } from "@/lib/nobitex/api";

export default function NobitexPage() {
  const [withdrawCoins, setWithdrawCoins] = useState<Record<string, string[]>>({});
  const adapter = useMemo(() => nobitexAdapter(withdrawCoins), [withdrawCoins]);

  useEffect(() => {
    fetchWithdraw(setWithdrawCoins, 2);
  }, []);

  return <ExchangePrices key="Nobitex" adapter={adapter} exchangeName="Nobitex" withdrawCoins={withdrawCoins} />;
}
