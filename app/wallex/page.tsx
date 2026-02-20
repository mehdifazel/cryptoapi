"use client";

import { useMemo } from "react";
import ExchangePrices from "@/components/ExchangePrices";
import { wallexAdapter } from "@/lib/adapters";

export default function WallexPage() {
  const adapter = useMemo(() => wallexAdapter(), []);
  return <ExchangePrices key="Wallex" adapter={adapter} exchangeName="Wallex" />;
}
