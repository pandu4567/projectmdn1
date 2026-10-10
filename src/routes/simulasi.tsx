import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Heart, Trophy, Skull, Play, Volume2, VolumeX, Wallet } from "lucide-react";
import { useCardSound } from "@/hooks/useCardSound";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Character } from "@/components/saku/Character";
import { Slider } from "@/components/ui/slider";
import type { Job } from "@/lib/saku";
import { Loading } from "@/components/saku/AppShell";
import {
  beginMonth, endCard, initState, monthCards, MONTHS, MONTHS_FULL, premiGame, startCards, wealth, lifeMult,
  type GCard, type GState, type InvKey,
} from "@/lib/game";
import { jobLabel, short, sortir, useProfile, type Profile } from "@/lib/saku";

export const Route = createFileRoute("/simulasi")({
  head: () => ({
    meta: [
      { title: "Perjalanan 1 Tahun — SAKU 5 WARNA PRO" },
      { name: "description", content: "Game simulasi: kelola uang 12 bulan dan jaga kebahagiaanmu tetap di atas 10." },
      { property: "og:title", content: "Perjalanan 1 Tahun — SAKU 5 WARNA PRO" },
      { property: "og:description", content: "Game simulasi keuangan 12 bulan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Simulasi,
});

type Phase = "intro" | "walk" | "card" | "over" | "win";
interface Queued { card: GCard; at: number }

function buildMonth(p: Profile, s: GState): Queued[] {
  const start = startCards(p, s).map((card) => ({ card, at: 0 }));
  const mid = monthCards(p, s);
  const midQ = mid.map((card, i) => ({ card, at: 8 + ((i + 1) / (mid.length + 1)) * 82 }));
  return [...start, ...midQ, { card: endCard(s), at: 96 }];
}

function Simulasi() {
  const { profile } = useProfile();
  const nav = useNavigate();
  const [g, setG] = useState<GState | null>(null);
  const [queue, setQueue] = useState<Queued[]>([]);
  const [current, setCurrent] = useState<GCard | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [amount, setAmount] = useState(0);
  const [finOpen, setFinOpen] = useState(false);
  const { muted, toggle: toggleSound, play: playCardSound, ding } = useCardSound();
  const [monthTotal, setMonthTotal] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!banner) return;
    const id = setTimeout(() => setBanner(null), 2000);
    return () => clearTimeout(id);
  }, [banner]);

  const start = () => {
    if (!profile) return;
    const s = initState(profile);
    beginMonth(s);
    setG(s);
    const q = buildMonth(profile, s);
    setQueue(q);
    setMonthTotal(q.length);
    setProgress(0);
    setPhase("walk");
  };

  // walking loop
  useEffect(() => {
    if (phase !== "walk" || finOpen) return;
    const id = setInterval(() => setProgress((p) => Math.min(100, p + 0.7)), 60);
    return () => clearInterval(id);
  }, [phase, finOpen]);

  // trigger cards / advance months
  useEffect(() => {
    if (phase !== "walk" || !g || !profile) return;
    const next = queue[0];
    if (next && progress >= next.at) {
      setQueue((q) => q.slice(1));
      setCurrent(next.card);
      setAmount(next.card.input ? Math.max(0, Math.min(next.card.input.max(g), next.card.input.def(g))) : 0);
      setPhase("card");
      playCardSound();
      return;
    }
    if (!next && progress >= 100) {
      if (g.month >= 11) {
        setPhase("win");
        localStorage.setItem("saku5-game", JSON.stringify({ result: "win", wealth: wealth(g), happiness: g.happiness }));
        return;
      }
      const s: GState = structuredClone(g);
      s.month += 1;
      beginMonth(s);
      setG(s);
      const q = buildMonth(profile, s);
      setQueue(q);
      setMonthTotal(q.length);
      setProgress(0);
      setBanner(MONTHS_FULL[s.month] ?? "");
      ding();
    }
  }, [progress, phase, queue, g, profile, playCardSound, ding]);

  const resolve = useCallback((idx: number) => {
    if (!g || !current) return;
    const s: GState = structuredClone(g);
    const choice = current.choices[idx];
    if (!choice) return;
    const msg = choice.run(s, amount);
    s.log.push({ m: s.month, t: msg });
    setG(s);
    toast(msg, { duration: 1800 });
    setCurrent(null);
    if (s.happiness < 10) {
      setPhase("over");
      localStorage.setItem("saku5-game", JSON.stringify({ result: "over", wealth: wealth(s), happiness: s.happiness }));
    } else setPhase("walk");
  }, [g, current, amount]);

  if (!profile) return <Loading />;
  if (phase === "intro" || !g) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="rounded-[24px] bg-sky p-6"><Character job={profile.pekerjaan} walking /></div>
        <h1 className="text-2xl font-extrabold">Perjalanan 1 Tahun</h1>
        <p className="text-sm text-muted-foreground">Kelola uangmu Januari–Desember. Kartu akan jatuh tiap bulan — pilih dengan bijak. Jangan biarkan Happiness turun di bawah 10!</p>
        <div className="grid w-full grid-cols-3 gap-2 text-xs">
          <div className="rounded-xl bg-darurat-soft p-2">Happiness awal <b>50</b></div>
          <div className="rounded-xl bg-hidup-soft p-2">{"<"}30: biaya hidup <b>+30%</b></div>
          <div className="rounded-xl bg-investasi-soft p-2">{">"}80: diskon <b>15%</b></div>
        </div>
        <Button size="lg" className="w-full rounded-xl" onClick={start}><Play className="mr-1 h-4 w-4" /> Mulai Simulasi</Button>
        <Link to="/" className="text-sm text-muted-foreground">Kembali ke Beranda</Link>
      </div>
    );
  }

  const hpColor = g.happiness < 30 ? "bg-darurat" : g.happiness > 80 ? "bg-investasi" : "bg-hidup";
  const sisa = queue.length;
  const taken = Math.max(0, monthTotal - sisa);
  const almost = sisa > 0 && sisa <= 2;

  return (
    <div className="relative mx-auto h-[100dvh] max-w-md overflow-hidden bg-sky">
      {/* top bar: happiness */}
      <div className="absolute inset-x-0 top-0 z-40 p-3">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
          <Button size="icon" variant="secondary" aria-label="Kembali ke Beranda" onClick={() => nav({ to: "/" })} className="shrink-0 bg-card shadow-float"><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0 rounded-xl bg-card px-3 py-2 shadow-float">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1 text-[11px] font-bold">
              <span className="flex min-w-0 items-center gap-1"><Heart className="h-3.5 w-3.5 shrink-0 fill-destructive text-destructive" /> <span>Happiness {g.happiness}/100</span></span>
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${g.happiness < 30 ? "bg-danger-soft text-destructive" : g.happiness > 80 ? "bg-investasi-soft text-success" : "bg-muted text-muted-foreground"}`}>
                {g.happiness < 30 ? "Stres · Hidup +30%" : g.happiness > 80 ? "Bahagia · Diskon 15% + Nabung 10%" : g.happiness <= 50 && profile.pekerjaan === "freelancer" ? "Lesu · Gaji freelancer -15%" : "Normal"}
              </span>
            </div>
            <div className="relative mt-1 h-2.5 rounded-full bg-accent">
              <div className={`h-full rounded-full ${hpColor} transition-all duration-500`} style={{ width: `${g.happiness}%` }} />
              <span className="absolute inset-y-0 left-[30%] w-px bg-ink/30" />
              <span className="absolute inset-y-0 left-[80%] w-px bg-ink/30" />
            </div>
          </div>
        </div>
        {/* mini calendar Jan-Des */}
        <div className="mt-2 mr-[7rem] grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1">
          <div className="grid min-w-0 grid-cols-6 gap-0.5 rounded-xl bg-card p-1.5 shadow-float" aria-label="Kalender">
            {MONTHS.map((m, i) => (
              <span key={m} className={`rounded px-0.5 py-0.5 text-center text-[8px] font-bold ${i < g.month ? "bg-investasi text-ink-foreground" : i === g.month ? "animate-dot-blink text-foreground" : "bg-muted text-muted-foreground/60"}`}>{m}</span>
            ))}
          </div>
          <Button size="icon" variant="secondary" className="shrink-0 bg-card shadow-float" onClick={toggleSound} aria-pressed={!muted} aria-label={muted ? "Aktifkan suara kartu" : "Matikan suara kartu"} title={muted ? "Aktifkan suara kartu" : "Matikan suara kartu"}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
        {/* month progress */}
        <div className="mt-1 mr-[7rem] rounded-xl bg-card px-2 py-1.5 shadow-float">
          <p className="text-[10px] font-bold">Bulan {MONTHS_FULL[g.month]} · {sisa > 0 ? `Sisa ${sisa} kartu lagi` : "Bulan selesai"}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {Array.from({ length: monthTotal }, (_, i) => (
              <span key={i} className={`h-2 w-2 rounded-full ${i < taken ? "bg-ink" : almost ? "animate-dot-blink" : "bg-accent"}`} />
            ))}
          </div>
          {almost && <p className="mt-0.5 text-[10px] font-bold text-warning">Hampir ganti bulan!</p>}
        </div>
      </div>

      {/* floating finance card (top-right) — tap to pause & reallocate */}
      <Button variant="outline" aria-label="Buka kartu keuangan dan jeda" onClick={() => setFinOpen(true)} className="absolute right-3 top-[4.75rem] z-40 h-auto w-[6.5rem] flex-col items-start gap-0.5 whitespace-normal rounded-lg bg-card p-2 text-left shadow-float">
        <span className="flex w-full min-w-0 items-center gap-1 text-[10px]"><Wallet className="h-3 w-3 shrink-0" /><span className="truncate">{profile.nama}</span></span>
        <span className="text-[9px] text-muted-foreground">Total Uang</span>
        <span className="text-xs font-extrabold">{short(wealth(g))}</span>
        <span className="text-[9px] text-muted-foreground">⏸ Jeda & Alokasi</span>
      </Button>

      {/* scene: third-person, camera behind the back, walking straight ahead */}
      <Scene job={profile.pekerjaan} moving={phase === "walk" && !finOpen} />

      {finOpen && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 text-center text-2xl font-extrabold tracking-widest text-ink/70">⏸ DIJEDA</div>
      )}

      {banner && (
        <div key={banner} className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
          <span className="animate-month-in rounded-3xl bg-ink/70 px-6 py-4 text-4xl font-extrabold uppercase text-ink-foreground">{banner}</span>
        </div>
      )}

      {/* falling card */}
      {phase === "card" && current && (
        <div className="absolute inset-0 z-30 flex items-center justify-center overflow-hidden bg-ink/40 px-4 pb-3 pt-48">
          <div className="game-card-scale w-full max-w-sm">
          <div key={current.id + g.log.length} className="animate-card-fall max-h-[calc(100dvh-13rem)] w-full overflow-y-auto rounded-[24px] border border-border bg-card p-5 shadow-float">
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${current.kind === "masalah" ? "bg-danger-soft text-destructive" : current.kind === "info" ? "bg-tabungan-soft text-tabungan" : "bg-investasi-soft text-success"}`}>
                {current.kind === "masalah" ? "Kartu Masalah" : current.kind === "info" ? "Info" : "Kartu Pilihan"}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground">{MONTHS[g.month]}</span>
            </div>
            <div className={`animate-icon-pop mx-auto my-4 flex h-36 w-36 items-center justify-center rounded-[32px] ${current.kind === "masalah" ? "bg-danger-soft text-destructive" : current.kind === "info" ? "bg-tabungan-soft text-tabungan" : "bg-hidup-soft text-warning"}`}>
              <current.icon className="h-24 w-24" strokeWidth={1.5} />
            </div>
            <h3 className="text-center text-lg font-extrabold">{current.title}</h3>
            <p className="mt-1 text-center text-sm text-muted-foreground">{current.desc}</p>
            {current.lines && (
              <div className="mt-3 rounded-xl bg-muted p-3 text-xs">
                {current.lines.map(([l, v]) => (
                  <div key={l} className="flex justify-between py-0.5 last:border-t last:border-border last:pt-1 last:font-bold"><span>{l}</span><span>{v}</span></div>
                ))}
              </div>
            )}
            {current.input && (
              <label className="mt-3 block text-xs font-semibold text-muted-foreground">
                {current.input.label} (maks {short(current.input.max(g))})
                <input type="number" className="mt-1 w-full rounded-xl border border-input px-3 py-2 text-sm text-foreground" value={amount || ""} onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))} />
              </label>
            )}
            <div className="mt-4 grid gap-2">
              {current.choices.map((c, i) => (
                <Button
                  key={c.label}
                  variant={c.tone === "ghost" ? "outline" : c.tone === "danger" ? "destructive" : "default"}
                  className="rounded-xl"
                  disabled={c.disabled?.(g)}
                  onClick={() => resolve(i)}
                >
                  {c.label}{c.disabled?.(g) ? " ✓" : ""}
                </Button>
              ))}
            </div>
          </div>
          </div>
        </div>
      )}

      {(phase === "over" || phase === "win") && <Summary g={g} win={phase === "win"} onRestart={start} />}

      <FinanceDialog open={finOpen} onOpenChange={setFinOpen} g={g} setG={setG} profile={profile} />
    </div>
  );
}

function Row({ l, v, c = "" }: { l: string; v: string; c?: string }) {
  return <div className="flex justify-between capitalize"><span className="text-muted-foreground">{l}</span><span className={`font-bold ${c}`}>{v}</span></div>;
}

type Pot = "tabungan" | "darurat" | "reward";
function FinanceDialog({ open, onOpenChange, g, setG, profile }: { open: boolean; onOpenChange: (v: boolean) => void; g: GState; setG: (s: GState) => void; profile: Profile }) {
  const so = sortir(profile);
  const [from, setFrom] = useState<Pot>("tabungan");
  const [to, setTo] = useState<Pot>("reward");
  const [amt, setAmt] = useState(0);
  const pots: { k: Pot; l: string }[] = [{ k: "tabungan", l: "Tabungan" }, { k: "darurat", l: "Dana Darurat" }, { k: "reward", l: "Self Reward" }];
  const transfer = () => {
    if (from === to) return;
    const s: GState = structuredClone(g);
    const v = Math.min(amt, Math.max(0, s[from]));
    s[from] -= v; s[to] += v;
    setG(s); toast.success(`Pindah ${short(v)}`);
  };
  const sell = (k: InvKey) => {
    const s: GState = structuredClone(g);
    s.tabungan += s.inv[k]; s.log.push({ m: s.month, t: `Jual ${k} ${short(s.inv[k])}` }); s.inv[k] = 0;
    setG(s); toast.success("Investasi dijual ke Tabungan");
  };
  // Salary reallocation: split this month's salary (from Tabungan) into pockets by %.
  const [pct, setPct] = useState({ darurat: 10, reward: 10, investasi: 10 });
  const pctTotal = pct.darurat + pct.reward + pct.investasi;
  const applyGaji = () => {
    if (pctTotal > 100) { toast.error("Total maksimal 100%"); return; }
    const s: GState = structuredClone(g);
    const base = Math.max(0, Math.min(s.gaji, s.tabungan));
    const d = Math.round((base * pct.darurat) / 100);
    const r = Math.round((base * pct.reward) / 100);
    const i = Math.round((base * pct.investasi) / 100);
    s.tabungan -= d + r + i; s.darurat += d; s.reward += r; s.inv.reksadana += i;
    s.log.push({ m: s.month, t: `Alokasi ulang gaji: darurat ${short(d)}, reward ${short(r)}, reksadana ${short(i)}` });
    setG(s); toast.success("Gaji dialokasikan ulang");
  };
  const sel = "rounded-xl border border-input px-2 py-2 text-sm";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto rounded-2xl">
        <DialogHeader><DialogTitle>Kartu Keuangan · {MONTHS[g.month]} (dijeda)</DialogTitle></DialogHeader>
        <div className="space-y-1 text-xs">
          <p className="font-bold">{profile.nama} · {jobLabel(profile.pekerjaan)}</p>
          <Row l="Total Uang" v={short(wealth(g))} />
          <Row l="Gaji" v={short(g.gaji)} />
          <Row l="P. Tetap" v={short(so.tetap + premiGame(g))} />
          <Row l="Hidup" v={short(so.tidakTetap * lifeMult(g))} c={lifeMult(g) > 1 ? "text-destructive" : lifeMult(g) < 1 ? "text-success" : ""} />
          <Row l="Investasi" v={short(g.inv.reksadana + g.inv.saham + g.inv.crypto)} c="text-investasi" />
          <Row l="Kendaraan" v={profile.kendaraan} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {pots.map((p) => (
            <div key={p.k} className="rounded-xl bg-muted p-2"><p className="text-muted-foreground">{p.l}</p><p className="font-extrabold">{short(g[p.k])}</p></div>
          ))}
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-sm font-bold">Alokasi ulang gaji ({short(g.gaji)})</p>
          <p className="mb-2 text-[11px] text-muted-foreground">Sisanya tetap di Tabungan ({100 - Math.min(100, pctTotal)}%).</p>
          {([["darurat", "Dana Darurat"], ["reward", "Self Reward"], ["investasi", "Investasi (Reksadana)"]] as const).map(([k, l]) => (
            <div key={k} className="mb-2">
              <div className="flex justify-between text-xs"><span>{l}</span><span className="font-bold">{pct[k]}% · {short((g.gaji * pct[k]) / 100)}</span></div>
              <Slider value={[pct[k]]} max={100} step={5} onValueChange={([v]) => setPct((o) => ({ ...o, [k]: v ?? 0 }))} />
            </div>
          ))}
          <Button className="w-full rounded-xl" disabled={pctTotal > 100} onClick={applyGaji}>Terapkan Alokasi {pctTotal > 100 ? "(>100%)" : ""}</Button>
        </div>
        <div>
          <p className="mb-1 text-sm font-bold">Alokasi ulang dana</p>
          <div className="grid grid-cols-2 gap-2">
            <select className={sel} value={from} onChange={(e) => setFrom(e.target.value as Pot)}>{pots.map((p) => <option key={p.k} value={p.k}>Dari {p.l}</option>)}</select>
            <select className={sel} value={to} onChange={(e) => setTo(e.target.value as Pot)}>{pots.map((p) => <option key={p.k} value={p.k}>Ke {p.l}</option>)}</select>
          </div>
          <div className="mt-2 flex gap-2">
            <input type="number" className={`${sel} flex-1`} placeholder="Jumlah" value={amt || ""} onChange={(e) => setAmt(Math.max(0, Number(e.target.value)))} />
            <Button className="rounded-xl" onClick={transfer}>Pindah</Button>
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm font-bold">Investasi (fluktuatif)</p>
          {(["reksadana", "saham", "crypto"] as InvKey[]).map((k) => (
            <div key={k} className="flex items-center justify-between border-b border-border py-2 text-sm capitalize last:border-0">
              <span>{k} <span className={g.invReturn[k] >= 0 ? "text-success" : "text-destructive"}>({(g.invReturn[k] * 100).toFixed(1)}%)</span></span>
              <span className="flex items-center gap-2 font-bold">{short(g.inv[k])}
                <Button size="sm" variant="outline" className="h-7 rounded-lg" disabled={g.inv[k] <= 0} onClick={() => sell(k)}>Jual</Button>
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Asuransi: {(Object.keys(g.ins) as (keyof GState["ins"])[]).filter((k) => g.ins[k]).join(", ") || "belum ada"} · Premi {short(premiGame(g))}/bln</p>
        <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Lanjut Jalan</Button>
      </DialogContent>
    </Dialog>
  );
}

function Summary({ g, win, onRestart }: { g: GState; win: boolean; onRestart: () => void }) {
  const w = wealth(g);
  const diff = w - g.startWealth;
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-ink/60 p-5">
      <div className="animate-card-drop max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-[24px] bg-card p-5">
        <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-3xl ${win ? "bg-investasi-soft text-success" : "bg-danger-soft text-destructive"}`}>
          {win ? <Trophy className="h-12 w-12" /> : <Skull className="h-12 w-12" />}
        </div>
        <h2 className="mt-3 text-center text-xl font-extrabold">{win ? "Selamat! 1 Tahun Selesai" : "Game Over — Kurang Bahagia"}</h2>
        <p className="text-center text-sm text-muted-foreground">{win ? "Kamu berhasil melewati Januari–Desember." : `Happiness turun ke ${g.happiness} di bulan ${MONTHS[g.month]}.`}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <Stat l="Total Kekayaan" v={short(w)} />
          <Stat l="Perubahan" v={(diff >= 0 ? "+" : "") + short(diff)} />
          <Stat l="Happiness" v={`${g.happiness}/100`} />
          <Stat l="Klaim Asuransi" v={`${g.claims}x`} />
          <Stat l="Tabungan" v={short(g.tabungan)} />
          <Stat l="Investasi" v={short(g.inv.reksadana + g.inv.saham + g.inv.crypto)} />
        </div>
        <p className="mt-4 text-sm font-bold">Catatan Perjalanan</p>
        <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
          {g.log.filter((l) => !l.t.startsWith("Tagihan") && !l.t.startsWith("Gaji")).slice(-20).map((l, i) => (
            <li key={i}><b className="text-foreground">{MONTHS[l.m]}</b> · {l.t}</li>
          ))}
        </ul>
        <div className="mt-4 grid gap-2">
          <Button className="rounded-xl" onClick={onRestart}>Main Lagi</Button>
          <Button asChild variant="outline" className="rounded-xl"><Link to="/">Ke Beranda</Link></Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ l, v }: { l: string; v: string }) {
  return <div className="rounded-xl bg-muted p-2"><p className="text-muted-foreground">{l}</p><p className="text-sm font-extrabold">{v}</p></div>;
}

const SIDE = [0, 1, 2, 3, 4, 5];
const BLD = [0, 1, 2, 3];
const BCOL = ["var(--building-a)", "var(--building-b)", "var(--building-c)"];
const CLOUDS = [
  { top: "6%", delay: 0, s: 1 },
  { top: "14%", delay: -22, s: 0.7 },
  { top: "22%", delay: -41, s: 0.85 },
];
function Scene({ job, moving }: { job: Job; moving: boolean }) {
  const pause = moving ? "" : "anim-paused";
  return (
    <div className="absolute inset-0 overflow-hidden scene-sunset">
      <div className="absolute left-[62%] top-[30%] h-14 w-14 rounded-full bg-sun" />
      {CLOUDS.map((c, i) => (
        <div key={i} className="absolute left-0 animate-cloud" style={{ top: c.top, animationDelay: `${c.delay}s` }}><Cloud scale={c.s} /></div>
      ))}
      {/* far skyline (slow parallax) */}
      <div className={`absolute inset-x-0 bottom-[55%] h-20 animate-skyline ${pause}`}>
        <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="h-full w-full">
          <path d="M0 80 V50 h20 V30 h18 V45 h14 V20 h22 V40 h16 V55 h20 V25 h12 V10 h10 V25 h14 V45 h20 V35 h24 V50 h14 V28 h20 V42 h18 V18 h16 V40 h22 V52 h18 V30 h20 V45 h16 V36 h14 V80 Z" fill="var(--skyline)" opacity="0.75" />
        </svg>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[55%] bg-grass" />
      <div className="absolute inset-x-0 bottom-0 h-[55%] bg-sidewalk" style={{ clipPath: "polygon(44% 0, 56% 0, 125% 100%, -25% 100%)" }} />
      <div className="absolute inset-x-0 bottom-0 h-[55%] bg-curb" style={{ clipPath: "polygon(46.6% 0, 53.4% 0, 97% 100%, 3% 100%)" }} />
      <div className="absolute inset-x-0 bottom-0 h-[55%] bg-road" style={{ clipPath: "polygon(47% 0, 53% 0, 95% 100%, 5% 100%)" }} />
      <div className="absolute inset-x-0 bottom-0 h-[55%] overflow-hidden" style={{ clipPath: "polygon(49.7% 0, 50.3% 0, 52% 100%, 48% 100%)" }}>
        <div className={`absolute inset-0 road-stripes animate-stripes ${pause}`} />
      </div>
      {/* buildings (slower = parallax) */}
      {BLD.map((i) => (
        <div key={"bl" + i} className={`absolute origin-bottom animate-bld-left ${pause}`} style={{ animationDelay: `${-i * 1.25}s` }}><Building color={BCOL[i % 3]!} tall={i % 2 === 0} flip /></div>
      ))}
      {BLD.map((i) => (
        <div key={"br" + i} className={`absolute origin-bottom animate-bld-right ${pause}`} style={{ animationDelay: `${-i * 1.25 - 0.6}s` }}><Building color={BCOL[(i + 1) % 3]!} tall={i % 2 === 1} /></div>
      ))}
      {/* trees and street lamps alternate on the sidewalk */}
      {SIDE.map((i) => (
        <div key={"l" + i} className={`absolute origin-bottom animate-side-left ${pause}`} style={{ animationDelay: `${-i * 0.5}s` }}>{i % 2 ? <Lamp /> : <Tree />}</div>
      ))}
      {SIDE.map((i) => (
        <div key={"r" + i} className={`absolute origin-bottom animate-side-right ${pause}`} style={{ animationDelay: `${-i * 0.5 - 0.25}s` }}>{i % 2 ? <Tree /> : <Lamp />}</div>
      ))}
      <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 scale-110">
        <Character job={job} walking={moving} />
      </div>
    </div>
  );
}

function Cloud({ scale }: { scale: number }) {
  return (
    <svg viewBox="0 0 120 50" style={{ width: 120 * scale }} className="opacity-90">
      <polygon points="10,40 25,22 45,26 60,10 82,18 100,16 112,40" fill="var(--cloud)" />
      <polygon points="10,40 112,40 100,46 20,46" fill="var(--cloud)" opacity="0.7" />
    </svg>
  );
}

function Building({ color, tall, flip }: { color: string; tall: boolean; flip?: boolean }) {
  const h = tall ? 150 : 100;
  const rows = tall ? 6 : 4;
  return (
    <svg viewBox={`0 0 90 ${h}`} className={tall ? "h-40 w-24" : "h-28 w-24"} style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <polygon points={`0,12 60,12 60,${h} 0,${h}`} fill={color} />
      <polygon points={`60,12 90,0 90,${h - 8} 60,${h}`} fill={color} />
      <polygon points={`60,12 90,0 90,${h - 8} 60,${h}`} fill="var(--building-shade)" />
      <polygon points="0,12 30,0 90,0 60,12" fill={color} opacity="0.75" />
      {Array.from({ length: rows }, (_, r) => [0, 1, 2].map((c) => (
        <rect key={`${r}-${c}`} x={7 + c * 18} y={22 + r * 21} width="10" height="12" fill="var(--window)" opacity={(r + c) % 3 ? 0.9 : 0.45} />
      )))}
    </svg>
  );
}

function Lamp() {
  return (
    <svg viewBox="0 0 30 90" className="h-24 w-8">
      <rect x="13" y="12" width="4" height="78" fill="var(--lamp)" />
      <rect x="6" y="8" width="18" height="6" rx="2" fill="var(--lamp)" />
      <circle cx="15" cy="16" r="5" fill="var(--lamp-glow)" />
    </svg>
  );
}

function Tree() {
  return (
    <svg viewBox="0 0 40 70" className="h-20 w-12">
      <rect x="17" y="40" width="6" height="28" rx="2" fill="var(--ink-soft)" opacity="0.7" />
      <polygon points="20,4 38,38 2,38" fill="var(--investasi)" />
      <polygon points="20,4 38,38 20,38" fill="var(--building-shade)" />
      <polygon points="20,18 36,48 4,48" fill="var(--investasi)" />
    </svg>
  );
}
