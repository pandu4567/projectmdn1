import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AppShell, Panel } from "@/components/saku/AppShell";
import { rp } from "@/lib/saku";

export const Route = createFileRoute("/asuransi")({
  head: () => ({
    meta: [
      { title: "Asuransi — EASY FINMA" },
      { name: "description", content: "Survei singkat 5 pertanyaan untuk rekomendasi asuransi syariah atau konvensional beserta premi per bulan." },
      { property: "og:title", content: "Asuransi — EASY FINMA" },
      { property: "og:description", content: "Rekomendasi asuransi syariah/konvensional dan estimasi premi bulanan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Asuransi,
});

const Q = [
  { k: "umur", q: "Berapa umurmu?", o: ["< 25", "25-35", "36-45", "> 45"] },
  { k: "pekerjaan", q: "Apa pekerjaanmu?", o: ["Pelajar", "Kantoran", "Lapangan", "Wirausaha"] },
  { k: "motor", q: "Punya motor?", o: ["Ya", "Tidak"] },
  { k: "mobil", q: "Punya mobil?", o: ["Ya", "Tidak"] },
  { k: "rumah", q: "Punya rumah sendiri?", o: ["Ya", "Tidak"] },
] as const;
type Ans = Partial<Record<(typeof Q)[number]["k"], string>>;

const AGE_MULT: Record<string, number> = { "< 25": 0.8, "25-35": 1, "36-45": 1.4, "> 45": 2 };

export function recommend(a: Ans) {
  const age = AGE_MULT[a.umur ?? "25-35"] ?? 1;
  const recs: { t: string; d: string; syariah: string; konven: string; premi: number }[] = [
    { t: "BPJS Kesehatan (Kelas 2)", d: "Proteksi dasar wajib, paling murah.", syariah: "BPJS Kesehatan", konven: "BPJS Kesehatan", premi: 100000 },
    { t: "Kesehatan Swasta (rawat inap)", d: "Pelengkap BPJS untuk RS swasta.", syariah: "Prudential Syariah, Allianz Syariah", konven: "AXA Mandiri, Allianz", premi: Math.round(250000 * age) },
  ];
  if (a.pekerjaan !== "Pelajar") recs.push({ t: "Asuransi Jiwa Berjangka", d: "Lindungi keluarga dari kehilangan penghasilan.", syariah: "Takaful Keluarga, Sun Life Syariah", konven: "Manulife, FWD", premi: Math.round(150000 * age) });
  if (a.pekerjaan === "Lapangan" || a.pekerjaan === "Wirausaha") recs.push({ t: "Kecelakaan Diri", d: "Pekerjaan berisiko butuh proteksi kecelakaan.", syariah: "Takaful Umum", konven: "BPJS Ketenagakerjaan, Sinarmas", premi: 50000 });
  if (a.motor === "Ya") recs.push({ t: "Asuransi Motor (TLO)", d: "Proteksi kehilangan motor.", syariah: "Takaful Umum", konven: "Adira, MSIG", premi: 40000 });
  if (a.mobil === "Ya") recs.push({ t: "Asuransi Mobil (All Risk)", d: "Kerusakan & kehilangan mobil.", syariah: "Asuransi Astra Syariah", konven: "Garda Oto, Sinarmas", premi: 400000 });
  if (a.rumah === "Ya") recs.push({ t: "Asuransi Properti", d: "Proteksi kebakaran & banjir.", syariah: "Sinarmas Syariah", konven: "Sinarmas, ACA", premi: 60000 });
  // Syariah: profit-sharing (tabarru') — suggested for younger/lower income; recommendation note only.
  const saran = a.pekerjaan === "Pelajar" || a.umur === "< 25" ? "Syariah" : "Konvensional";
  return { recs, saran };
}

function Asuransi() {
  const [a, setA] = useState<Ans>({});
  const [done, setDone] = useState(false);
  const [prinsip, setPrinsip] = useState<"Syariah" | "Konvensional">("Syariah");
  const { recs, saran } = recommend(a);
  // Syariah premiums ~5% higher on average (tabarru' + ujrah).
  const pm = prinsip === "Syariah" ? 1.05 : 1;
  const total = recs.reduce((s, r) => s + Math.round(r.premi * pm), 0);
  return (
    <AppShell title="Asuransi">
      {!done ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Survei singkat 5 pertanyaan.</p>
          {Q.map((q, i) => (
            <Panel key={q.k}>
              <p className="mb-2 text-sm font-bold">{i + 1}. {q.q}</p>
              <div className="grid grid-cols-2 gap-2">
                {q.o.map((o) => (
                  <button key={o} onClick={() => setA({ ...a, [q.k]: o })} className={`rounded-xl py-2 text-sm font-semibold ${a[q.k] === o ? "bg-ink text-ink-foreground" : "bg-accent"}`}>{o}</button>
                ))}
              </div>
            </Panel>
          ))}
          <Button className="w-full rounded-xl" disabled={Object.keys(a).length < Q.length} onClick={() => { setPrinsip(saran as "Syariah" | "Konvensional"); setDone(true); }}>Lihat Rekomendasi</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Panel className="bg-ink text-ink-foreground">
            <p className="text-xs text-ink-muted">Saran untukmu: <b>{saran}</b></p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["Syariah", "Konvensional"] as const).map((p) => (
                <button key={p} onClick={() => setPrinsip(p)} className={`rounded-xl py-2 text-sm font-bold ${prinsip === p ? "bg-background text-foreground" : "bg-ink-foreground/10"}`}>{p}</button>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-muted">Total estimasi premi</p>
            <p className="text-2xl font-extrabold">{rp(total)}<span className="text-sm font-semibold">/bulan</span></p>
          </Panel>
          {recs.map((r) => (
            <Panel key={r.t} className="bg-tabungan-soft">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold">{r.t}</p>
                <p className="shrink-0 text-sm font-extrabold">{rp(Math.round(r.premi * pm))}<span className="text-[10px] font-semibold">/bln</span></p>
              </div>
              <p className="text-xs text-muted-foreground">{r.d}</p>
              <p className="mt-1 text-xs font-semibold">Contoh: {prinsip === "Syariah" ? r.syariah : r.konven}</p>
            </Panel>
          ))}
          <p className="text-[10px] text-muted-foreground">Premi adalah estimasi kasar; cek penawaran resmi tiap perusahaan.</p>
          <Button variant="outline" className="w-full rounded-xl" onClick={() => { setDone(false); setA({}); }}>Ulangi Survei</Button>
        </div>
      )}
    </AppShell>
  );
}
