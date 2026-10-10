export type MarketCat = "reksadana" | "saham" | "crypto";
export interface MarketAsset {
  id: string;
  cat: MarketCat;
  name: string;
  /** Monthly return range in %. */
  range: [number, number];
  base: number;
  risk?: "Rendah" | "Sedang" | "Tinggi" | "Sangat Tinggi";
  platform: string;
  logo?: string;
}

export const MARKET: MarketAsset[] = [
  { id: "rd-pu", cat: "reksadana", name: "Reksadana Pasar Uang", range: [0.3, 0.8], base: 1500, risk: "Rendah", platform: "Bibit / Bareksa" },
  { id: "rd-pt", cat: "reksadana", name: "Reksadana Pendapatan Tetap", range: [0.5, 1.5], base: 2100, risk: "Sedang", platform: "Bibit / Bareksa" },
  { id: "rd-cp", cat: "reksadana", name: "Reksadana Campuran", range: [0.8, 2.5], base: 1800, risk: "Tinggi", platform: "Bibit / Bareksa" },
  { id: "rd-sh", cat: "reksadana", name: "Reksadana Saham", range: [1, 4], base: 1250, risk: "Sangat Tinggi", platform: "Bibit / Bareksa" },
  { id: "BBCA", cat: "saham", name: "BBCA", range: [-5, 7], base: 9800, platform: "Ajaib / Stockbit" },
  { id: "TLKM", cat: "saham", name: "TLKM", range: [-5, 7], base: 3200, platform: "Ajaib / Stockbit" },
  { id: "GOTO", cat: "saham", name: "GOTO", range: [-5, 7], base: 70, platform: "Ajaib / Stockbit" },
  { id: "BBRI", cat: "saham", name: "BBRI", range: [-5, 7], base: 4500, platform: "Ajaib / Stockbit" },
  { id: "ASII", cat: "saham", name: "ASII", range: [-5, 7], base: 5100, platform: "Ajaib / Stockbit" },
  { id: "BTC", cat: "crypto", name: "Bitcoin", range: [-10, 12], base: 1_050_000_000, platform: "Indodax / Pintu", logo: "₿" },
  { id: "ETH", cat: "crypto", name: "Ethereum", range: [-10, 12], base: 52_000_000, platform: "Indodax / Pintu", logo: "Ξ" },
  { id: "SOL", cat: "crypto", name: "Solana", range: [-10, 12], base: 2_400_000, platform: "Indodax / Pintu", logo: "◎" },
  { id: "BNB", cat: "crypto", name: "BNB", range: [-10, 12], base: 9_500_000, platform: "Indodax / Pintu", logo: "◆" },
  { id: "DOGE", cat: "crypto", name: "Dogecoin", range: [-10, 12], base: 2_500, platform: "Indodax / Pintu", logo: "Ð" },
];

export interface MarketState {
  prices: Record<string, number[]>; // last 20 prices
  units: Record<string, number>;
}

const KEY = "saku5-market";
export const randIn = ([a, b]: [number, number]) => a + Math.random() * (b - a);

/** Move one price by a random return within the asset's monthly range. */
export function step(price: number, a: MarketAsset, r = randIn(a.range)) {
  return Math.max(0.0001, price * (1 + r / 100));
}

export function initMarket(): MarketState {
  const prices: Record<string, number[]> = {};
  MARKET.forEach((a) => {
    let p = a.base;
    prices[a.id] = Array.from({ length: 20 }, () => (p = step(p, a)));
  });
  return { prices, units: {} };
}

export function loadMarket(): MarketState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const m = JSON.parse(raw) as MarketState;
      const fresh = initMarket();
      return { prices: { ...fresh.prices, ...m.prices }, units: m.units ?? {} };
    }
  } catch { /* ignore */ }
  return initMarket();
}
export const saveMarket = (m: MarketState) => localStorage.setItem(KEY, JSON.stringify(m));

/** Buy: spend `amount` of Tabungan for units at current price. Returns null if not enough Tabungan. */
export function buy(m: MarketState, tabungan: number, id: string, amount: number) {
  const price = m.prices[id]?.at(-1) ?? 0;
  if (amount <= 0 || amount > tabungan || price <= 0) return null;
  return { m: { ...m, units: { ...m.units, [id]: (m.units[id] ?? 0) + amount / price } }, tabungan: tabungan - amount };
}
/** Sell all units; proceeds go to Tabungan. */
export function sellAll(m: MarketState, tabungan: number, id: string) {
  const value = (m.units[id] ?? 0) * (m.prices[id]?.at(-1) ?? 0);
  const units = { ...m.units }; delete units[id];
  return { m: { ...m, units }, tabungan: tabungan + value, value };
}
