import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { INSTRUMENTS, emptyStats, summarizePrices, type PricePoint } from "@/lib/investment-stats";

interface YahooChart {
  chart?: { result?: { meta?: { regularMarketPrice?: number; regularMarketTime?: number; currency?: string }; timestamp?: number[]; indicators?: { quote?: { close?: (number | null)[] }[] } }[] };
}

// Public market data only. Symbols are selected from the fixed catalog, never caller-supplied URLs.
export const getInvestmentStats = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ category: z.enum(["reksadana", "saham", "crypto", "emas"]) }).parse(input))
  .handler(async ({ data }) => {
    const instruments = INSTRUMENTS.filter((a) => a.category === data.category);
    return Promise.all(instruments.map(async (instrument) => {
      const fallback = emptyStats(instrument);
      if (!instrument.symbol) return fallback;
      try {
        const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(instrument.symbol)}?range=2y&interval=1d`, {
          headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) return fallback;
        const body = await response.json() as YahooChart;
        const result = body.chart?.result?.[0];
        const price = result?.meta?.regularMarketPrice;
        const updatedAt = result?.meta?.regularMarketTime;
        if (typeof price !== "number" || !Number.isFinite(price) || price <= 0 || typeof updatedAt !== "number") return fallback;
        const closes = result?.indicators?.quote?.[0]?.close ?? [];
        const points: PricePoint[] = (result?.timestamp ?? []).flatMap((time, index) => {
          const close = closes[index];
          return typeof close === "number" && Number.isFinite(close) && close > 0 && Number.isFinite(time) ? [{ time, price: close }] : [];
        }).sort((a, b) => a.time - b.time);
        return summarizePrices(instrument.id, result?.meta?.currency ?? fallback.currency, price, updatedAt, points);
      } catch { return fallback; }
    }));
  });