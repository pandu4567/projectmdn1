import type { LucideIcon } from "lucide-react";
import {
  Receipt, Wallet, ShieldAlert, TrendingUp, ShieldCheck, Award, Briefcase, ShoppingBag, Plane,
  Gift, PartyPopper, HeartPulse, Pill, Car, Waves, Flame, FileWarning, Smartphone, HandCoins,
  Coffee, CloudRain, Dumbbell, Tv, Cake, BadgePercent, TrafficCone,
} from "lucide-react";
import { sortir, short, type Profile } from "./saku";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export const MONTHS_FULL = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const INS_PRICE = { kesehatan: 150000, motor: 75000, mobil: 200000, rumah: 80000 } as const;
export type InsGame = keyof typeof INS_PRICE;
export type InvKey = "reksadana" | "saham" | "crypto";

export interface GState {
  month: number;
  happiness: number;
  tabungan: number;
  darurat: number;
  reward: number;
  inv: Record<InvKey, number>;
  invReturn: Record<InvKey, number>;
  gaji: number;
  gajiNext: number | null;
  spNext: boolean;
  ins: Record<InsGame, boolean>;
  pindah: boolean;
  claims: number;
  log: { m: number; t: string }[];
  startWealth: number;
}

export interface Choice {
  label: string;
  tone?: "primary" | "ghost" | "danger";
  disabled?: (s: GState) => boolean;
  run: (s: GState, amount: number) => string;
}
export interface GCard {
  id: string;
  kind: "pilihan" | "masalah" | "info";
  icon: LucideIcon;
  title: string;
  desc: string;
  lines?: [string, string][];
  input?: { label: string; max: (s: GState) => number; def: (s: GState) => number };
  choices: Choice[];
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)] as T;
const chance = (p: number) => Math.random() < p;

export const wealth = (s: GState) => s.tabungan + s.darurat + s.reward + s.inv.reksadana + s.inv.saham + s.inv.crypto;

export function happy(s: GState, d: number) {
  // Naik susah (maks +5 per kartu), turun gampang (x1.25, bisa sampai -15 atau lebih).
  const v = d > 0 ? Math.min(5, Math.max(1, Math.round(d * 0.6))) : Math.round(d * 1.25);
  s.happiness = Math.max(0, Math.min(100, s.happiness + v));
  return v;
}
export const lifeMult = (s: GState) => (s.happiness < 30 ? 1.3 : s.happiness > 80 ? 0.85 : 1);

/** Pay from Tabungan, then Dana Darurat, then Self Reward. Leftover becomes debt in Tabungan. */
export function pay(s: GState, amt: number) {
  let left = amt;
  const t = Math.min(Math.max(0, s.tabungan), left); s.tabungan -= t; left -= t;
  const d = Math.min(s.darurat, left); s.darurat -= d; left -= d;
  const r = Math.min(s.reward, left); s.reward -= r; left -= r;
  if (left > 0) { s.tabungan -= left; happy(s, -5); return " (kurang dana, jadi hutang!)"; }
  return d + r > 0 ? " (sebagian diambil dari dana lain)" : "";
}

export function premiGame(s: GState) {
  return (Object.keys(s.ins) as InsGame[]).reduce((a, k) => a + (s.ins[k] ? INS_PRICE[k] : 0), 0);
}

export function initState(p: Profile): GState {
  const s: GState = {
    month: 0, happiness: 50, tabungan: p.tabungan, darurat: 0, reward: 0,
    inv: { reksadana: p.aset, saham: 0, crypto: 0 }, invReturn: { reksadana: 0, saham: 0, crypto: 0 },
    gaji: p.gaji, gajiNext: null, spNext: false,
    ins: {
      kesehatan: p.asuransi.kesehatan.aktif,
      motor: p.asuransi.kendaraan.aktif && p.kendaraan === "motor",
      mobil: p.asuransi.kendaraan.aktif && p.kendaraan === "mobil",
      rumah: p.asuransi.properti.aktif,
    },
    pindah: false, claims: 0, log: [], startWealth: 0,
  };
  s.startWealth = wealth(s);
  return s;
}

function billCard(p: Profile, s: GState): GCard {
  const so = sortir(p);
  const tidak = so.tidakTetap * lifeMult(s);
  const premi = premiGame(s);
  const total = so.tetap + tidak + premi;
  const mult = lifeMult(s);
  return {
    id: "bill", kind: "info", icon: Receipt, title: `Tagihan ${MONTHS[s.month]}`,
    desc: mult > 1 ? "Kamu stres! Biaya hidup naik 30%." : mult < 1 ? "Kamu bahagia, hemat 15% biaya hidup!" : "Pengeluaran otomatis dipotong dari Tabungan.",
    lines: [
      ["Tempat tinggal", short(p.tinggal)], ["Listrik, air, gas, internet", short(p.utilitas)],
      ["Cicilan", short(p.cicilan)], ["Pajak (÷12)", short(p.pajak / 12)],
      ["Makan & transport", short(tidak)], ["Premi asuransi", short(premi)], ["Total", short(total)],
    ],
    choices: [{ label: "Bayar & Tutup", tone: "primary", run: (st) => `Tagihan ${short(total)} dibayar` + pay(st, total) }],
  };
}

/** Salary modifiers: SP halves it; freelancer with happiness 30-50 loses 15%; happiness >80 auto-saves 10% to Dana Darurat. */
export function salaryFor(s: GState, job: Profile["pekerjaan"]) {
  let amt = s.spNext ? s.gaji / 2 : s.gaji;
  const freelanceCut = job === "freelancer" && s.happiness >= 30 && s.happiness <= 50;
  if (freelanceCut) amt *= 0.85;
  const autoSave = s.happiness > 80 ? Math.round(amt * 0.1) : 0;
  return { amt: Math.round(amt), freelanceCut, autoSave };
}

function gajiCard(p: Profile, s: GState): GCard {
  const { amt, freelanceCut, autoSave } = salaryFor(s, p.pekerjaan);
  const notes = [
    s.spNext && "Akibat Surat Peringatan, gaji bulan ini hanya setengah.",
    freelanceCut && "Mood biasa saja (30-50), klien berkurang: gaji freelancer -15%.",
    autoSave > 0 && "Kamu bahagia! 10% gaji otomatis ditabung ke Dana Darurat.",
  ].filter(Boolean).join(" ");
  return {
    id: "gaji", kind: "info", icon: Wallet, title: "Gajian! 💸",
    desc: notes || "Gaji masuk ke Tabungan. Atur ulang dana lewat kartu keuangan.",
    lines: [["Gaji masuk", short(amt)], ...(autoSave > 0 ? [["Auto nabung 10%", short(autoSave)] as [string, string]] : [])],
    choices: [{ label: "Terima Gaji", tone: "primary", run: (st) => { st.tabungan += amt - autoSave; st.darurat += autoSave; st.spNext = false; happy(st, 2); return `Gaji ${short(amt)} masuk`; } }],
  };
}

function daruratCard(): GCard {
  return {
    id: "darurat", kind: "pilihan", icon: ShieldAlert, title: "Isi Dana Darurat",
    desc: "Sisihkan sebagian Tabungan ke Dana Darurat untuk jaga-jaga.",
    input: { label: "Jumlah dari Tabungan", max: (s) => Math.max(0, s.tabungan), def: (s) => Math.max(0, Math.round(s.gaji * 0.1)) },
    choices: [
      { label: "Simpan", tone: "primary", run: (s, a) => { const v = Math.min(a, Math.max(0, s.tabungan)); s.tabungan -= v; s.darurat += v; if (v > 0) happy(s, 2); return `Dana darurat +${short(v)}`; } },
      { label: "Lewati", tone: "ghost", run: () => "Dana darurat dilewati" },
    ],
  };
}

function investCard(): GCard {
  const mk = (k: InvKey, l: string): Choice => ({
    label: l, tone: "primary",
    run: (s, a) => { const v = Math.min(a, Math.max(0, s.tabungan)); s.tabungan -= v; s.inv[k] += v; if (v > 0) happy(s, 3); return `Investasi ${l} ${short(v)}`; },
  });
  return {
    id: "inv", kind: "pilihan", icon: TrendingUp, title: "Investasi Masa Depan",
    desc: "Reksadana 0.5–2%/bln · Saham -3–5%/bln · Crypto -7–9%/bln. Bisa dijual lewat kartu keuangan.",
    input: { label: "Jumlah investasi", max: (s) => Math.max(0, s.tabungan), def: (s) => Math.round(s.gaji * 0.1) },
    choices: [mk("reksadana", "Reksadana"), mk("saham", "Saham"), mk("crypto", "Crypto"), { label: "Nanti saja", tone: "ghost", run: () => "Tidak investasi" }],
  };
}

function insuranceCard(p: Profile): GCard {
  const opts: { k: InsGame; l: string }[] = [
    { k: "kesehatan", l: "Kesehatan 150rb/bln" },
    ...(p.kendaraan === "motor" ? [{ k: "motor" as InsGame, l: "Motor 75rb/bln" }] : []),
    ...(p.kendaraan === "mobil" ? [{ k: "mobil" as InsGame, l: "Mobil 200rb/bln" }] : []),
    { k: "rumah", l: "Rumah 80rb/bln" },
  ];
  return {
    id: "ins", kind: "pilihan", icon: ShieldCheck, title: "Asuransi Proteksi",
    desc: "Sekali beli, premi dibayar tiap bulan. Bisa dipakai berkali-kali untuk menutup biaya masalah.",
    choices: [
      ...opts.map((o): Choice => ({
        label: o.l, tone: "primary", disabled: (s) => s.ins[o.k],
        run: (s) => { s.ins[o.k] = true; happy(s, 3); return `Beli asuransi ${o.k}`; },
      })),
      { label: "Lewati", tone: "ghost", run: () => "Tawaran asuransi dilewati" },
    ],
  };
}

function raiseCard(): GCard {
  const r = rnd(0.2, 0.5);
  return {
    id: "raise", kind: "pilihan", icon: Award, title: "Naik Jabatan! 🎉",
    desc: `Kerja kerasmu dihargai. Gaji naik ${Math.round(r * 100)}%, efektif bulan depan.`,
    choices: [{ label: "Terima", tone: "primary", run: (s) => { s.gajiNext = Math.round(s.gaji * (1 + r)); happy(s, 15); return `Naik jabatan +${Math.round(r * 100)}%`; } }],
  };
}

function switchCard(): GCard {
  const r = rnd(-0.3, 0.3);
  const pct = Math.round(r * 100);
  return {
    id: "switch", kind: "pilihan", icon: Briefcase, title: "Tawaran Pindah Kerja",
    desc: `Perusahaan baru menawarkan gaji ${pct >= 0 ? "+" : ""}${pct}% dari sekarang.`,
    choices: [
      { label: "Pindah", tone: "primary", run: (s) => { s.gajiNext = Math.round(s.gaji * (1 + r)); s.pindah = true; happy(s, pct >= 0 ? 6 : -6); return `Pindah kerja (${pct}%)`; } },
      { label: "Tetap di sini", tone: "ghost", run: () => "Menolak tawaran kerja" },
    ],
  };
}

function simple(id: string, kind: GCard["kind"], icon: LucideIcon, title: string, desc: string, choices: Choice[]): GCard {
  return { id, kind, icon, title, desc, choices };
}

function sick(title: string, cost: number, hp: number, icon: LucideIcon): GCard {
  return simple("sick", "masalah", icon, title, `Biaya pengobatan ${short(cost)}. Gratis jika punya asuransi kesehatan.`, [
    { label: "Berobat", tone: "danger", run: (s) => {
      if (s.ins.kesehatan) { s.claims++; happy(s, Math.round(hp / 3)); return `${title}: ditanggung asuransi`; }
      happy(s, hp); return `${title}: bayar ${short(cost)}` + pay(s, cost);
    } },
  ]);
}

function problems(p: Profile, s: GState): GCard[] {
  const out: GCard[] = [];
  const m = s.month;
  if ([6, 8, 9].includes(m) && chance(0.05)) {
    const d = pick([{ n: "Kanker Tiroid", c: 50e6 }, { n: "Tumor Kista", c: 20e6 }, { n: "Penyakit Jantung", c: 60e6 }]);
    out.push(sick(d.n, d.c, -25, HeartPulse));
  }
  if (chance(0.1)) {
    const d = pick([{ n: "Asma kambuh", c: 1e6 }, { n: "Maag kambuh", c: 5e5 }, { n: "Darah tinggi", c: 4e5 }, { n: "Diabetes", c: 5e5 }, { n: "Eksim", c: 5e5 }]);
    out.push(sick(d.n, d.c, -12, Pill));
  }
  if (p.kendaraan !== "tidak" && chance(0.2)) {
    const isMobil = p.kendaraan === "mobil";
    const cost = isMobil ? 40e6 : 7e6;
    out.push(simple("veh", "masalah", Car, `${isMobil ? "Mobil" : "Motor"} Rusak`, `Biaya perbaikan ${short(cost)}. Gratis jika diasuransikan.`, [
      { label: "Perbaiki", tone: "danger", run: (st) => {
        if (st.ins[isMobil ? "mobil" : "motor"]) { st.claims++; happy(st, -3); return "Kendaraan diperbaiki asuransi"; }
        happy(st, -10); return `Perbaiki kendaraan ${short(cost)}` + pay(st, cost);
      } },
      { label: "Biarkan saja", tone: "ghost", run: (st) => { happy(st, -15); return "Kendaraan dibiarkan rusak"; } },
    ]));
  }
  if (chance(0.07)) out.push(simple("flood", "masalah", Waves, "Banjir!", "Rumah kebanjiran, renovasi 7 jt. Gratis jika ada asuransi rumah.", [
    { label: "Renovasi", tone: "danger", run: (st) => { if (st.ins.rumah) { st.claims++; happy(st, -5); return "Banjir ditanggung asuransi"; } happy(st, -15); return "Renovasi banjir 7 jt" + pay(st, 7e6); } },
  ]));
  if (chance(0.03)) out.push(simple("fire", "masalah", Flame, "Kebakaran!", "Renovasi 50 jt. Gratis jika ada asuransi rumah.", [
    { label: "Renovasi", tone: "danger", run: (st) => { if (st.ins.rumah) { st.claims++; happy(st, -8); return "Kebakaran ditanggung asuransi"; } happy(st, -25); return "Renovasi kebakaran 50 jt" + pay(st, 50e6); } },
  ]));
  if (p.pekerjaan !== "mahasiswa" && chance(0.05)) out.push(simple("sp", "masalah", FileWarning, "Surat Peringatan", "Kinerjamu menurun. Gaji bulan depan hanya setengah.", [
    { label: "Terima", tone: "danger", run: (st) => { st.spNext = true; happy(st, -15); return "Dapat Surat Peringatan"; } },
  ]));
  if (chance(0.1)) out.push(simple("gadget", "masalah", Smartphone, "Gadget Rusak", "HP jatuh dan layar pecah. Servis 2 jt.", [
    { label: "Servis", tone: "danger", run: (st) => { happy(st, -6); return "Servis gadget 2 jt" + pay(st, 2e6); } },
    { label: "Pakai seadanya", tone: "ghost", run: (st) => { happy(st, -10); return "Gadget dibiarkan rusak"; } },
  ]));
  if (chance(0.1)) out.push(simple("loan", "masalah", HandCoins, "Teman Pinjam Uang", "Teman dekat butuh pinjaman 1 jt.", [
    { label: "Pinjamkan", tone: "primary", run: (st) => { happy(st, 4); return "Pinjamkan teman 1 jt" + pay(st, 1e6); } },
    { label: "Tolak", tone: "ghost", run: (st) => { happy(st, -5); return "Menolak pinjaman teman"; } },
  ]));
  return out;
}

const FILLERS: (() => GCard)[] = [
  () => simple("f1", "pilihan", Coffee, "Nongkrong Bareng Teman", "Ngopi & ngobrol santai, 100 rb.", [
    { label: "Ikut (100rb)", tone: "primary", run: (s) => { happy(s, 6); return "Nongkrong 100 rb" + pay(s, 1e5); } },
    { label: "Skip", tone: "ghost", run: (s) => { happy(s, -3); return "Skip nongkrong"; } },
  ]),
  () => simple("f2", "masalah", TrafficCone, "Macet Parah", "Terjebak macet 2 jam. Capek!", [{ label: "Sabar…", tone: "ghost", run: (s) => { happy(s, -4); return "Kena macet"; } }]),
  () => simple("f3", "pilihan", BadgePercent, "Dapat Cashback", "Cashback e-wallet 50 rb masuk tabungan.", [{ label: "Asik!", tone: "primary", run: (s) => { s.tabungan += 5e4; happy(s, 3); return "Cashback 50 rb"; } }]),
  () => simple("f4", "pilihan", Cake, "Ultah Sahabat", "Beli kado 150 rb?", [
    { label: "Beli kado", tone: "primary", run: (s) => { happy(s, 5); return "Kado ultah 150 rb" + pay(s, 15e4); } },
    { label: "Ucapan saja", tone: "ghost", run: (s) => { happy(s, -3); return "Hanya ucapan ultah"; } },
  ]),
  () => simple("f5", "masalah", CloudRain, "Kehujanan", "Lupa bawa payung, basah kuyup.", [{ label: "Huft", tone: "ghost", run: (s) => { happy(s, -3); return "Kehujanan"; } }]),
  () => simple("f6", "pilihan", Dumbbell, "Olahraga Pagi", "Jogging gratis di taman.", [
    { label: "Gas!", tone: "primary", run: (s) => { happy(s, 4); return "Olahraga pagi"; } },
    { label: "Rebahan", tone: "ghost", run: (s) => { happy(s, -1); return "Rebahan"; } },
  ]),
  () => simple("f7", "pilihan", Tv, "Langganan Streaming", "Film baru rilis, langganan 55 rb?", [
    { label: "Langganan", tone: "primary", run: (s) => { happy(s, 4); return "Streaming 55 rb" + pay(s, 55e3); } },
    { label: "Hemat", tone: "ghost", run: (s) => { happy(s, -2); return "Tidak langganan"; } },
  ]),
];

/** Spec cards that must never be trimmed. Extras (gadget, loan, fillers) are trimmed first. */
const EXTRA_IDS = new Set(["gadget", "loan", "f1", "f2", "f3", "f4", "f5", "f6", "f7"]);
/** Pad with fillers up to target; if over 10, drop extra cards first so the month stays 7-10. */
export function fitCount<T extends { id: string }>(cards: T[], target: number, filler: () => T): T[] {
  const out = [...cards];
  while (out.length < target) out.push(filler());
  for (let i = out.length - 1; out.length > Math.max(target, 7) && i >= 0; i--) {
    if (EXTRA_IDS.has(out[i]!.id)) out.splice(i, 1);
  }
  return out.slice(0, Math.max(out.length > 10 ? 10 : out.length, 0));
}

/** Random 7-10 mid-month cards for the current month. */
export function monthCards(p: Profile, s: GState): GCard[] {
  const cards: GCard[] = [];
  if (s.month === 2) cards.push(simple("thr", "pilihan", Gift, "THR Lebaran", "Tunjangan Hari Raya sebesar 1x gaji!", [
    { label: "Terima THR", tone: "primary", run: (st) => { st.tabungan += st.gaji; happy(st, 12); return `THR ${short(st.gaji)}`; } },
  ]));
  if ([0, 3, 6, 9].includes(s.month)) cards.push(insuranceCard(p));
  if (chance(0.3)) cards.push(investCard());
  if (s.month === 5 && !s.pindah && p.pekerjaan !== "mahasiswa") cards.push(raiseCard());
  else if (p.pekerjaan !== "mahasiswa" && chance(0.1)) cards.push(switchCard());
  cards.push(...problems(p, s));
  const target = 7 + Math.floor(Math.random() * 4);
  const shuffled = fitCount(cards, target, () => pick(FILLERS)()).sort(() => Math.random() - 0.5);
  if (s.month === 11) shuffled.push(simple("bonus", "pilihan", PartyPopper, "Bonus Tahunan", "Kinerja setahun dihargai dengan bonus!", [
    { label: "Terima Bonus", tone: "primary", run: (st) => { const b = Math.round(st.gaji * rnd(0.5, 2)); st.tabungan += b; happy(st, 12); return `Bonus ${short(b)}`; } },
  ]));
  return shuffled;
}

function belanja(): Choice {
  return { label: "Belanja", tone: "primary", run: (s, a) => {
    const v = Math.min(a, s.reward);
    s.reward -= v;
    const gain = v <= 0 ? -3 : Math.min(14, 3 + Math.round((v / Math.max(1, s.gaji)) * 40));
    happy(s, gain);
    return v > 0 ? `Belanja ${short(v)} dari Self Reward` : "Tidak belanja";
  } };
}

export function endCard(s: GState): GCard {
  const even = (s.month + 1) % 2 === 0;
  const cost = Math.round(s.gaji * 0.25);
  return {
    id: "end", kind: "pilihan", icon: even ? Plane : ShoppingBag,
    title: even ? "Akhir Bulan: Belanja atau Liburan?" : "Waktunya Belanja",
    desc: even
      ? `Liburan ${short(cost)} (25% gaji) dari Tabungan, atau belanja pakai dana Self Reward (${short(s.reward)}).`
      : `Gunakan dana Self Reward (${short(s.reward)}) untuk belanja, jumlah bebas.`,
    input: { label: "Jumlah belanja (Self Reward)", max: (st) => st.reward, def: (st) => Math.round(st.reward / 2) },
    choices: [
      belanja(),
      ...(even ? [{ label: `Liburan (${short(cost)})`, tone: "primary" as const, run: (st: GState) => { happy(st, 15); return `Liburan ${short(cost)}` + pay(st, cost); } }] : []),
      { label: "Hemat dulu", tone: "ghost", run: (st) => { happy(st, -3); return "Tidak belanja"; } },
    ],
  };
}

/** Called at month start: market fluctuation + pending salary changes. */
export function beginMonth(s: GState) {
  const ranges: Record<InvKey, [number, number]> = { reksadana: [0.005, 0.02], saham: [-0.03, 0.05], crypto: [-0.07, 0.09] };
  (Object.keys(ranges) as InvKey[]).forEach((k) => {
    const r = rnd(...ranges[k]);
    s.invReturn[k] = r;
    s.inv[k] = Math.round(s.inv[k] * (1 + r));
  });
  if (s.gajiNext) { s.gaji = s.gajiNext; s.gajiNext = null; }
}

export function startCards(p: Profile, s: GState): GCard[] {
  return [billCard(p, s), gajiCard(p, s), daruratCard()];
}
