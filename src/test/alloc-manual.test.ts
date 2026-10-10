import { describe, it, expect } from "vitest";
import { setPocket, allocStatus, splitEven } from "@/components/saku/AllocationEditor";
const base = { darurat: 0, hidup: 40, tabungan: 20, investasi: 20, reward: 20 };
describe("manual allocation", () => {
  it("raises a pocket from 0 without touching others", () => {
    expect(setPocket(base, "darurat", 15)).toEqual({ ...base, darurat: 15 });
  });
  it("flags over 100% as melebihi", () => {
    expect(allocStatus(setPocket(base, "darurat", 15), 1_000_000).over).toBe(true);
  });
  it("reports sisa when under 100%", () => {
    const s = allocStatus(setPocket(base, "hidup", 30), 1_000_000);
    expect(s.sisaPct).toBe(10); expect(s.sisaRp).toBe(100_000);
  });
  it("bagi rata gives 20/20/20/30/10 totaling 100%", () => {
    expect(splitEven()).toEqual({ darurat: 20, investasi: 20, tabungan: 20, hidup: 30, reward: 10 });
    expect(allocStatus(splitEven(), 100).pct).toBe(100);
  });
});
