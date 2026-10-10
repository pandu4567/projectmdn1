import { describe, expect, it } from "vitest";
import { happy, initState, lifeMult, salaryFor } from "@/lib/game";
import { emptyProfile, sortir } from "@/lib/saku";

const st = (h: number) => { const s = initState({ ...emptyProfile(), gaji: 1_000_000 }); s.happiness = h; return s; };
describe("happiness rules", () => {
  it("starts at 50", () => expect(initState(emptyProfile()).happiness).toBe(50));
  it("gain capped at +5", () => { const s = st(50); happy(s, 15); expect(s.happiness).toBe(55); });
  it("loss -12 becomes -15", () => { const s = st(50); happy(s, -12); expect(s.happiness).toBe(35); });
  it("<30 costs +30%, >80 discount 15%", () => { expect(lifeMult(st(29))).toBe(1.3); expect(lifeMult(st(81))).toBe(0.85); });
  it("freelancer 30-50 salary -15%", () => expect(salaryFor(st(40), "freelancer").amt).toBe(850_000));
  it(">80 auto saves 10%", () => expect(salaryFor(st(85), "kantoran").autoSave).toBe(100_000));
});
describe("expense sorting", () => {
  it("utilities are fixed, food+transport variable", () => {
    const r = sortir({ ...emptyProfile(), tinggal: 1, utilitas: 2, cicilan: 3, pajak: 12, makan: 10, transport: 20 });
    expect(r.tetap).toBe(7); expect(r.tidakTetap).toBe(30);
  });
});
