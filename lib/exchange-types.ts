import type { PriceStat } from "./shared/utils";
import type { OrderbookLevel } from "./shared/utils";

export type QuoteLabel = "RLS" | "TMN" | "USDT";

export interface OrderbookData {
  asks: OrderbookLevel[];
  bids: OrderbookLevel[];
  lastTradePrice?: string;
  status: string;
}

export interface ExchangeAdapter {
  name: string;
  quoteLabel: QuoteLabel; // RLS for Nobitex/Ramzinex, TMN for Wallex
  fetchMarkets(): Promise<{ stats: Record<string, PriceStat>; pairIds?: Record<string, number> }>;
  fetchOrderbook(pair: string, pairIdOrSymbol: number | string): Promise<OrderbookData>;
  getOrderbookKey(pair: string, pairIds?: Record<string, number>): number | string; // pairId for Ramzinex, symbol for Nobitex/Wallex
  mtToQuote(mt: number): number;
  withdrawEnabled?(base: string): boolean;
}
