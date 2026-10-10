export type InvestmentCategory = "reksadana" | "saham" | "crypto" | "emas";
export const INVESTMENT_TABS: { key: InvestmentCategory; label: string }[] = [
  { key: "reksadana", label: "Reksadana" }, { key: "saham", label: "Saham" },
  { key: "crypto", label: "Kripto" }, { key: "emas", label: "Emas" },
];
export interface Instrument { id: string; name: string; category: InvestmentCategory; symbol?: string; detail: string }
export const INSTRUMENTS: Instrument[] = [
  { id: "rd-pu", name: "Reksadana Pasar Uang", category: "reksadana", detail: "Risiko rendah · Bibit / Bareksa" },
  { id: "rd-pt", name: "Reksadana Pendapatan Tetap", category: "reksadana", detail: "Risiko sedang · Bibit / Bareksa" },
  { id: "rd-cp", name: "Reksadana Campuran", category: "reksadana", detail: "Risiko tinggi · Bibit / Bareksa" },
  { id: "rd-sh", name: "Reksadana Saham", category: "reksadana", detail: "Risiko sangat tinggi · Bibit / Bareksa" },
  ...["BBCA", "BBRI", "TLKM", "ASII", "GOTO", "BREN", "CUAN", "AMMN", "BMRI", "BBNI"].map((id) => ({ id, name: id, category: "saham" as const, symbol: `${id}.JK`, detail: "Bursa Efek Indonesia · IDR / lembar" })),
  { id: "BTC", name: "BTC · Bitcoin", category: "crypto", symbol: "BTC-USD", detail: "Kripto · USD · volatilitas tinggi" },
  { id: "ETH", name: "ETH · Ethereum", category: "crypto", symbol: "ETH-USD", detail: "Kripto · USD · volatilitas tinggi" },
  { id: "antam", name: "Emas Antam", category: "emas", detail: "Logam Mulia · IDR / gram" },
];
export interface PricePoint { time: number; price: number }
export interface InstrumentStats {
  id: string; price: number | null; currency: string; month: number | null; year: number | null;
  history: PricePoint[]; updatedAt: number | null; error: string | null;
}
export function emptyStats(instrument: Instrument): InstrumentStats {
  return { id: instrument.id, price: null, currency: instrument.category === "crypto" ? "USD" : "IDR", month: null, year: null, history: [], updatedAt: null,
    error: instrument.category === "reksadana" ? "NAB belum tersedia — pilih produk reksadana spesifik dari penyedia data." : instrument.category === "emas" ? "Harga resmi Antam belum terhubung." : "Sumber harga sedang tidak tersedia." };
}
export function marketSchedule(category: InvestmentCategory, now: Date) {
  if (category === "crypto") return { open: true, label: "Buka · 24/7", next: "" };
  if (category !== "saham") return { open: false, label: "Pembaruan harian", next: "" };
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const day = wib.getUTCDay();
  const minute = wib.getUTCHours() * 60 + wib.getUTCMinutes();
  if (day >= 1 && day <= 5 && minute >= 540 && minute < 960) return { open: true, label: "Pasar Buka", next: "" };
  const next = new Date(wib);
  if (day === 0 || day === 6 || minute >= 960) next.setUTCDate(next.getUTCDate() + 1);
  while (next.getUTCDay() === 0 || next.getUTCDay() === 6) next.setUTCDate(next.getUTCDate() + 1);
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return { open: false, label: "Tutup", next: `Buka lagi ${days[next.getUTCDay()]} 09.00 WIB` };
}
export function refreshInterval(category: InvestmentCategory, now: Date) {
  return category === "crypto" || (category === "saham" && marketSchedule(category, now).open) ? 60_000 : false;
}
export function changeSince(points: PricePoint[], price: number, target: number): number | null {
  const previous = points.filter((p) => p.time <= target).at(-1);
  return previous && previous.price > 0 ? (price / previous.price - 1) * 100 : null;
}
export function summarizePrices(id: string, currency: string, price: number, updatedAt: number, points: PricePoint[]): InstrumentStats {
  const month = new Date(updatedAt * 1000);
  // Clamp month-end to the last day of the preceding calendar month.
  const day = month.getUTCDate();
  month.setUTCDate(1); month.setUTCMonth(month.getUTCMonth() - 1);
  const lastDay = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
  month.setUTCDate(Math.min(day, lastDay));
  const year = new Date(updatedAt * 1000); year.setUTCFullYear(year.getUTCFullYear() - 1);
  return { id, currency, price, updatedAt, month: changeSince(points, price, month.getTime() / 1000), year: changeSince(points, price, year.getTime() / 1000), history: points.filter((p) => p.time >= month.getTime() / 1000), error: null };
}
export const formatStatPrice = (price: number | null, currency: string) => price === null ? "—" : `${currency === "USD" ? "$ " : "Rp "}${price.toLocaleString("id-ID", { maximumFractionDigits: currency === "USD" ? 2 : 0 })}`;
export const formatChange = (value: number | null) => value === null ? "—" : `${value >= 0 ? "+" : ""}${value.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;