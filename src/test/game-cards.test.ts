import { describe, expect, it } from "vitest";
import { fitCount } from "@/lib/game";

const f = () => ({ id: "f1" });
describe("monthly card count", () => {
  it("pads to at least 7", () => expect(fitCount([{ id: "ins" }], 7, f)).toHaveLength(7));
  it("never exceeds 10", () => {
    const many = Array.from({ length: 14 }, (_, i) => ({ id: i % 2 ? "gadget" : "sick" }));
    expect(fitCount(many, 8, f).length).toBeLessThanOrEqual(10);
  });
  it("keeps spec cards over extras", () => {
    const cards = [{ id: "sp" }, { id: "flood" }, ...Array.from({ length: 10 }, () => ({ id: "loan" }))];
    const out = fitCount(cards, 7, f).map((c) => c.id);
    expect(out).toContain("sp");
    expect(out).toContain("flood");
  });
});
