import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/saku/AppShell";
import { buy, loadMarket, MARKET, saveMarket, sellAll, step, type MarketCat, type MarketState } from "@/lib/market";
import { rp, short, type Profile } from "@/lib/saku";

const TABS: { k: MarketCat; l: string }[] = [{ k: "reksadana", l: "Reksadana" }, { k: "saham", l: "Saham" }, { k: "crypto", l: "Crypto" }];
const RISK: Record<string, string> = {
  Rendah: "bg-investasi-soft text-success", Sedang: "bg-tabungan-soft text-tabungan",
  Tinggi: "bg-hidup-soft text-warning", "Sangat Tinggi": "bg-danger-soft text-destructive",
};
const fmt = (n: number) => (n >= 1000 ? rp(n) : "Rp " + n.toLocaleString("id-ID", { maximumFractionDigits: 2 }));

export function MarketPanel({ profile, save }: { profile: Profile; save: (p: Profile) => void }) {
  const [m, setM] = useState<MarketState | null>(null);
  const [tab, setTab] = useState<MarketCat>("reksadana");
  const [amt, setAmt] = useState<Record<string, number>>({});

  useEffect(() => { setM(loadMarket()); }, []);
  useEffect(() => {
    const id = setInterval(() => setM((cur) => {
      if (!cur) return cur;
      const prices = { ...cur.prices };
      MARKET.forEach((a) => { const h = prices[a.id] ?? [a.base]; prices[a.id] = [...h.slice(-19), step(h.at(-1) ?? a.base, a)]; });
      const next = { ...cur, prices }; saveMarket(next); return next;
    }), 10000);
    return () => clearInterval(id);
  }, []);
  if (!m) return null;

  const commit = (next: MarketState, tabungan: number) => { setM(next); saveMarket(next); save({ ...profile, tabungan }); };
  const owned = MARKET.reduce((s, a) => s + (m.units[a.id] ?? 0) * (m.prices[a.id]?.at(-1) ?? 0), 0);

  return (
    <Panel className="mt-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Pasar Investasi</h2>
        <span className="text-[11px] text-muted-foreground">Tabungan <b className="text-foreground">{short(profile.tabungan)}</b></span>
      </div>
      <p className="mb-2 text-[11px] text-muted-foreground">Nilai aset dibeli: <b className="text-foreground">{short(owned)}</b> · hasil jual masuk Tabungan</p>
      <div className="grid grid-cols-3 gap-2">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`rounded-xl py-2 text-xs font-bold ${tab === t.k ? "bg-ink text-ink-foreground" : "bg-accent"}`}>{t.l}</button>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {MARKET.filter((a) => a.cat === tab).map((a) => {
          const hist = m.prices[a.id] ?? [a.base];
          const price = hist.at(-1) ?? a.base;
          const prev = hist.at(-2) ?? price;
          const chg = ((price - prev) / prev) * 100;
          const value = (m.units[a.id] ?? 0) * price;
          const a2 = amt[a.id] ?? 100000;
          return (
            <div key={a.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                {a.logo && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-ink-foreground">{a.logo}</span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{a.cat === "crypto" ? `${a.id} · ${a.name}` : a.name}</p>
                  <p className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                    {a.risk && <span className={`rounded-full px-1.5 py-0.5 font-bold ${RISK[a.risk]}`}>Risiko {a.risk}</span>}
                    {a.cat === "crypto" && <span className="rounded-full bg-danger-soft px-1.5 py-0.5 font-bold text-destructive">Volatilitas Tinggi</span>}
                    <span>{a.platform}</span>
                  </p>
                </div>
                <div className="h-8 w-14 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hist.map((v, i) => ({ i, v }))}>
                      <Line type="monotone" dataKey="v" dot={false} strokeWidth={2} stroke={chg >= 0 ? "var(--investasi)" : "var(--darurat)"} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="mt-1 flex justify-between text-[11px]">
                <span>{a.cat === "reksadana" ? "NAB" : "Harga"} <b>{fmt(price)}</b> <span className={chg >= 0 ? "text-success" : "text-destructive"}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}%</span></span>
                <span className="text-muted-foreground">{a.range[0]}% s.d {a.range[1]}%/bln</span>
              </div>
              {value > 0 && <p className="text-[11px]">Dimiliki: <b>{rp(value)}</b></p>}
              <div className="mt-2 flex gap-2">
                <input type="number" aria-label={`Jumlah beli ${a.name}`} className="w-full min-w-0 flex-1 rounded-lg border border-input px-2 py-1 text-xs" value={a2 || ""} onChange={(e) => setAmt({ ...amt, [a.id]: Math.max(0, Number(e.target.value)) })} />
                <Button size="sm" className="h-7 rounded-lg" onClick={() => {
                  const r = buy(m, profile.tabungan, a.id, a2);
                  if (!r) { toast.error("Tabungan tidak cukup"); return; }
                  commit(r.m, r.tabungan); toast.success(`Beli ${a.id.startsWith("rd") ? a.name : a.id} ${short(a2)}`);
                }}>Beli</Button>
                <Button size="sm" variant="outline" className="h-7 rounded-lg" disabled={value <= 0} onClick={() => {
                  const r = sellAll(m, profile.tabungan, a.id);
                  commit(r.m, r.tabungan); toast.success(`Jual ${short(r.value)} → Tabungan`);
                }}>Jual</Button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-investasi" /> Harga simulasi · update tiap 10 detik</p>
    </Panel>
  );
}
