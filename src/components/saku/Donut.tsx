import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { POCKETS, short, type PocketKey } from "@/lib/saku";

export function Donut({ sisa, alokasi }: { sisa: number; alokasi: Record<PocketKey, number> }) {
  const data = POCKETS.map((p) => ({ name: p.label, value: Math.max(0.0001, alokasi[p.key]), color: p.color }));
  return (
    <div className="relative h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius="68%" outerRadius="95%" paddingAngle={3} stroke="none" cornerRadius={6}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-muted-foreground">Sisa Bebas</span>
        <span className="text-2xl font-extrabold">{short(sisa)}</span>
      </div>
    </div>
  );
}
