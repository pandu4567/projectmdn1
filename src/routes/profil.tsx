import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { AppShell, Loading, Panel } from "@/components/saku/AppShell";
import { Character } from "@/components/saku/Character";
import { clearProfile, isStudent, jobLabel, rp, useProfile } from "@/lib/saku";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Profil — EASY FINMA" },
      { name: "description", content: "Lihat dan ubah data profil keuanganmu." },
      { property: "og:title", content: "Profil — EASY FINMA" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:description", content: "Lihat dan ubah data profil keuanganmu." },
    ],
  }),
  component: Profil,
});

function Profil() {
  const { profile } = useProfile();
  const nav = useNavigate();
  if (!profile) return <Loading />;
  const rows: [string, string][] = [
    ["Umur", `${profile.umur} tahun`], ["Pekerjaan", jobLabel(profile.pekerjaan)], [isStudent(profile.pekerjaan) ? "Uang Saku (di luar UKT)" : "Gaji", rp(profile.gaji)],
    ["Tempat tinggal", rp(profile.tinggal)], ["Cicilan", rp(profile.cicilan)], ["Pajak tahunan", rp(profile.pajak)],
    ["Tabungan", rp(profile.tabungan)], ["Kendaraan", profile.kendaraan],
  ];
  return (
    <AppShell title="Profil">
      <Panel className="flex items-center gap-4">
        <div className="rounded-2xl bg-sky"><Character job={profile.pekerjaan} walking={false} /></div>
        <div>
          <p className="text-xl font-extrabold">{profile.nama}</p>
          <p className="text-sm text-muted-foreground">{jobLabel(profile.pekerjaan)}</p>
        </div>
      </Panel>
      <Panel className="mt-4">
        {rows.map(([l, v]) => (
          <div key={l} className="flex justify-between border-b border-border py-2 text-sm last:border-0">
            <span className="text-muted-foreground">{l}</span><span className="font-semibold">{v}</span>
          </div>
        ))}
      </Panel>
      <Button asChild className="mt-4 w-full rounded-xl"><Link to="/onboarding">Edit Data</Link></Button>
      <Button variant="outline" className="mt-2 w-full rounded-xl text-destructive" onClick={() => { clearProfile(); localStorage.removeItem("saku5-game"); nav({ to: "/onboarding" }); }}>
        Reset Semua Data
      </Button>
    </AppShell>
  );
}
