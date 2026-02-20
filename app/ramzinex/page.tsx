"use client";

import { useMemo } from "react";
import ExchangePrices from "@/components/ExchangePrices";
import { ramzinexAdapter } from "@/lib/adapters";

export default function RamzinexPage() {
  const adapter = useMemo(() => ramzinexAdapter(), []);
  return <ExchangePrices key="Ramzinex" adapter={adapter} exchangeName="Ramzinex" />;
}
