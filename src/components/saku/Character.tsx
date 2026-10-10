import type { Job } from "@/lib/saku";

/** Back-view character. Outfit depends on job. */
const OUTFIT: Record<Job, { top: string; accent: string; pants: string }> = {
  mahasiswa: { top: "var(--tabungan)", accent: "var(--hidup)", pants: "var(--ink-soft)" },
  kantoran: { top: "var(--background)", accent: "var(--ink)", pants: "var(--ink)" },
  pedagang: { top: "var(--investasi)", accent: "var(--background)", pants: "var(--ink-soft)" },
  buruh: { top: "var(--warning)", accent: "var(--hidup)", pants: "var(--tabungan)" },
  guru: { top: "var(--reward)", accent: "var(--darurat)", pants: "var(--ink-soft)" },
  freelancer: { top: "var(--ink-soft)", accent: "var(--muted-foreground)", pants: "var(--ink-muted)" },
};

export function Character({ job, walking }: { job: Job; walking: boolean }) {
  const o = OUTFIT[job];
  const skin = "#f2c29b";
  const hair = "#2b1d14";
  return (
    <svg viewBox="0 0 100 160" className={`h-40 w-28 drop-shadow-lg ${walking ? "animate-bob" : ""}`}>
      <ellipse cx="50" cy="155" rx="26" ry="5" fill="var(--ink)" opacity="0.15" />
      {/* legs */}
      <g className={walking ? "animate-leg-a" : ""}>
        <rect x="36" y="100" width="12" height="48" rx="5" fill={o.pants} />
        <rect x="35" y="144" width="14" height="8" rx="3" fill="var(--ink)" />
      </g>
      <g className={walking ? "animate-leg-b" : ""}>
        <rect x="52" y="100" width="12" height="48" rx="5" fill={o.pants} />
        <rect x="51" y="144" width="14" height="8" rx="3" fill="var(--ink)" />
      </g>
      {/* arms */}
      <rect x="18" y="52" width="12" height="44" rx="6" fill={o.top} stroke="var(--ink)" strokeOpacity="0.15" />
      <rect x="70" y="52" width="12" height="44" rx="6" fill={o.top} stroke="var(--ink)" strokeOpacity="0.15" />
      <circle cx="24" cy="98" r="5" fill={skin} />
      <circle cx="76" cy="98" r="5" fill={skin} />
      {/* torso */}
      <rect x="28" y="48" width="44" height="58" rx="10" fill={o.top} stroke="var(--ink)" strokeOpacity="0.15" />
      {job === "mahasiswa" && (
        <>
          <rect x="34" y="56" width="32" height="36" rx="6" fill={o.accent} opacity="0.9" />
          <text x="50" y="78" textAnchor="middle" fontSize="8" fontWeight="800" fill="var(--ink)">KAMPUS</text>
        </>
      )}
      {job === "kantoran" && (
        <>
          <line x1="50" y1="50" x2="50" y2="104" stroke="var(--ink)" strokeOpacity="0.2" />
          <rect x="28" y="96" width="44" height="5" fill={o.accent} />
        </>
      )}
      {job === "pedagang" && <rect x="40" y="48" width="20" height="8" rx="2" fill={o.accent} />}
      {job === "buruh" && (
        <>
          <rect x="28" y="70" width="44" height="5" fill={o.accent} />
          <rect x="28" y="86" width="44" height="5" fill={o.accent} />
        </>
      )}
      {job === "guru" && (
        <>
          <path d="M30 60 L70 60 M30 72 L70 72 M30 84 L70 84" stroke={o.accent} strokeWidth="2" opacity="0.5" />
          <rect x="72" y="80" width="14" height="18" rx="2" fill="var(--tabungan)" />
        </>
      )}
      {job === "freelancer" && <path d="M32 50 Q50 64 68 50 L68 62 Q50 74 32 62 Z" fill={o.accent} />}
      {/* head (back) */}
      <rect x="44" y="40" width="12" height="10" fill={skin} />
      <circle cx="50" cy="28" r="17" fill={hair} />
      <ellipse cx="33" cy="30" rx="3" ry="5" fill={skin} />
      <ellipse cx="67" cy="30" rx="3" ry="5" fill={skin} />
      {job === "buruh" && <path d="M31 24 Q50 2 69 24 L72 26 L28 26 Z" fill="var(--hidup)" />}
      {job === "freelancer" && (
        <>
          <path d="M32 28 Q50 4 68 28" stroke="var(--ink)" strokeWidth="4" fill="none" />
          <rect x="27" y="24" width="8" height="12" rx="3" fill="var(--ink)" />
          <rect x="65" y="24" width="8" height="12" rx="3" fill="var(--ink)" />
        </>
      )}
    </svg>
  );
}
