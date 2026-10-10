import { useEffect, useState } from "react";

export type Job = "mahasiswa" | "kantoran" | "pedagang" | "buruh" | "guru" | "freelancer";
export const JOBS: { v: Job; l: string }[] = [
  { v: "mahasiswa", l: "Pelajar/Mahasiswa" },
  { v: "kantoran", l: "Pekerja Kantoran" },
  { v: "pedagang", l: "Pedagang/Pebisnis" },
  { v: "buruh", l: "Buruh" },
  { v: "guru", l: "Guru/Pengajar" },
  { v: "freelancer", l: "Freelancer" },
];
export const isStudent = (j: Job) => j === "mahasiswa";
export const incomeLabel = (j: Job) => (isStudent(j) ? "Uang Saku / Pendapatan Bersih (di luar UKT)" : "Gaji / Pendapatan Bersih per bulan");
export const jobLabel = (j: Job) => JOBS.find((x) => x.v === j)?.l ?? j;

export type InsKey = "kesehatan" | "kendaraan" | "properti" | "lainnya";
export type Vehicle = "tidak" | "motor" | "mobil";
export type PocketKey = "darurat" | "hidup" | "tabungan" | "investasi" | "reward";

export interface Profile {
  nama: string;
  umur: number;
  gaji: number;
  pekerjaan: Job;
  tinggal: number;
  utilitas: number;
  makan: number;
  cicilan: number;
  transport: number;
  aset: number;
  tabungan: number;
  kendaraan: Vehicle;
  pajak: number;
  asuransi: Record<InsKey, { aktif: boolean; jenis: string; premi: number }>;
  alokasi: Record<PocketKey, number>;
  portfolio: { reksadana: number; saham: number; crypto: number; emas: number };
}

export const POCKETS: { key: PocketKey; label: string; color: string; soft: string; desc: string }[] = [
  { key: "darurat", label: "Dana Darurat", color: "var(--darurat)", soft: "var(--darurat-soft)", desc: "Cadangan 3-6x pengeluaran" },
  { key: "investasi", label: "Investasi", color: "var(--investasi)", soft: "var(--investasi-soft)", desc: "Tumbuh untuk masa depan" },
  { key: "tabungan", label: "Tabungan", color: "var(--tabungan)", soft: "var(--tabungan-soft)", desc: "Tujuan jangka pendek" },
  { key: "hidup", label: "Biaya Hidup", color: "var(--hidup)", soft: "var(--hidup-soft)", desc: "Kebutuhan tambahan" },
  { key: "reward", label: "Self Reward", color: "var(--reward)", soft: "var(--reward-soft)", desc: "Hadiah untuk dirimu" },
];

export const DEFAULT_ALOKASI: Record<PocketKey, number> = { darurat: 20, investasi: 20, tabungan: 20, hidup: 30, reward: 10 };

export const emptyProfile = (): Profile => ({
  nama: "",
  umur: 0,
  gaji: 0,
  pekerjaan: "kantoran",
  tinggal: 0,
  utilitas: 0,
  makan: 0,
  cicilan: 0,
  transport: 0,
  aset: 0,
  tabungan: 0,
  kendaraan: "tidak",
  pajak: 0,
  asuransi: {
    kesehatan: { aktif: false, jenis: "BPJS", premi: 0 },
    kendaraan: { aktif: false, jenis: "", premi: 0 },
    properti: { aktif: false, jenis: "", premi: 0 },
    lainnya: { aktif: false, jenis: "", premi: 0 },
  },
  alokasi: { ...DEFAULT_ALOKASI },
  portfolio: { reksadana: 0, saham: 0, crypto: 0, emas: 0 },
});

export function sortir(p: Profile) {
  const premi = (Object.values(p.asuransi) as { aktif: boolean; premi: number }[]).reduce(
    (a, x) => a + (x.aktif ? x.premi : 0),
    0,
  );
  // Fixed (locked after onboarding): housing, utilities, installments, yearly tax ÷ 12.
  const tetap = p.tinggal + p.utilitas + p.cicilan + p.pajak / 12;
  // Variable (freely editable on dashboard): food, transport.
  const tidakTetap = p.makan + p.transport;
  const sisa = Math.max(0, p.gaji - tetap - tidakTetap - premi);
  const ratio = p.gaji > 0 ? sisa / p.gaji : 0;
  const status = ratio >= 0.3 ? "Aman" : ratio >= 0.1 ? "Waspada" : "Bahaya";
  return { pendapatan: p.gaji, tetap, tidakTetap, lainnya: premi, sisa, status };
}

export const rp = (n: number) => (n < 0 ? "-" : "") + "Rp " + Math.round(Math.abs(n)).toLocaleString("id-ID");
export const short = (n: number) => {
  const a = Math.abs(n);
  const s = n < 0 ? "-" : "";
  if (a >= 1e9) return s + (a / 1e9).toFixed(1).replace(/\.0$/, "") + " M";
  if (a >= 1e6) return s + (a / 1e6).toFixed(1).replace(/\.0$/, "") + " jt";
  if (a >= 1e3) return s + Math.round(a / 1e3) + " rb";
  return s + Math.round(a);
};

const KEY = "saku5-profile";
export function loadProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...emptyProfile(), ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}
export function saveProfile(p: Profile) {
  localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new Event("saku-update"));
}
export function clearProfile() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("saku-update"));
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const f = () => {
      setProfile(loadProfile());
      setReady(true);
    };
    f();
    window.addEventListener("saku-update", f);
    return () => window.removeEventListener("saku-update", f);
  }, []);
  return { profile, ready, save: saveProfile };
}
