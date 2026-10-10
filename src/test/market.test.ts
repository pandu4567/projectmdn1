import { describe, expect, it } from "vitest";
import { buy, MARKET, sellAll, type MarketState } from "@/lib/market";

const m: MarketState = { prices: { BBCA: [10000] }, units: {} };
describe("market", () => {
  it("buying spends Tabungan", () => { expect(buy(m, 500000, "BBCA", 100000)!.tabungan).toBe(400000); });
  it("cannot buy more than Tabungan", () => { expect(buy(m, 50000, "BBCA", 100000)).toBeNull(); });
  it("selling adds value to Tabungan", () => {
    const b = buy(m, 500000, "BBCA", 100000)!;
    b.m.prices["BBCA"] = [12000];
    expect(sellAll(b.m, b.tabungan, "BBCA").tabungan).toBeCloseTo(520000);
  });
  it("has 4 reksadana, 5 saham, 5 crypto", () => {
    expect(["reksadana", "saham", "crypto"].map((c) => MARKET.filter((a) => a.cat === c).length)).toEqual([4, 5, 5]);
  });
});
