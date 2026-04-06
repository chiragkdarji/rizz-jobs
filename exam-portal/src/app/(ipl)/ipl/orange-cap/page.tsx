import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "IPL 2026 Orange Cap — Most Runs | Rizz Jobs",
  description: "IPL 2026 Orange Cap leaderboard — top run scorers.",
};

interface StatRow {
  id?: number;
  name?: string;
  teamSName?: string;
  value?: string | number;
  mat?: string | number;
  hs?: string | number;
  avg?: string | number;
  sr?: string | number;
  fifties?: string | number;
  hundreds?: string | number;
  imageId?: number;
}

export default async function OrangeCapPage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let players: StatRow[] = [];
  try {
    const res = await fetch(`${base}/api/ipl/stats`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      // stats/v1/series response: { t20StatsList: [{ values: [...] }] }
      players = data?.orangeCap?.t20StatsList?.[0]?.values ?? [];
    }
  } catch {/* silently handle */}

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2 uppercase tracking-wider" style={{ color: "#FF5A1F", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
        Orange Cap
      </h1>
      <p className="text-sm mb-6" style={{ color: "#6B86A0" }}>Most runs in IPL 2026</p>
      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #0E2235" }}>
        <table className="w-full text-sm" style={{ fontFamily: "var(--font-ipl-stats, monospace)" }}>
          <thead>
            <tr style={{ background: "#061624", borderBottom: "1px solid #0E2235" }}>
              {["#", "Player", "Team", "Mat", "Runs", "HS", "Avg", "SR", "50s", "100s"].map((h) => (
                <th key={h} className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#6B86A0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr key={p.id ?? i} style={{ borderBottom: "1px solid #0E2235", background: i === 0 ? "#1A0A00" : "transparent" }}>
                <td className="px-3 py-3 font-bold" style={{ color: i === 0 ? "#FF5A1F" : "#6B86A0" }}>{i + 1}</td>
                <td className="px-3 py-3">
                  <Link href={`/ipl/players/${p.id}`} className="flex items-center gap-2">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#0E2235] shrink-0">
                      {p.imageId ? <Image src={`/api/ipl/image?id=${p.imageId}&type=player`} alt={p.name ?? ""} fill className="object-cover" unoptimized /> : null}
                    </div>
                    <span className="font-semibold" style={{ color: "#E8E4DC" }}>{p.name}</span>
                  </Link>
                </td>
                <td className="px-3 py-3" style={{ color: "#6B86A0" }}>{p.teamSName}</td>
                <td className="px-3 py-3" style={{ color: "#E8E4DC" }}>{p.mat}</td>
                <td className="px-3 py-3 font-bold" style={{ color: i === 0 ? "#FF5A1F" : "#E8E4DC" }}>{p.value}</td>
                <td className="px-3 py-3" style={{ color: "#6B86A0" }}>{p.hs}</td>
                <td className="px-3 py-3" style={{ color: "#6B86A0" }}>{p.avg}</td>
                <td className="px-3 py-3" style={{ color: "#6B86A0" }}>{p.sr}</td>
                <td className="px-3 py-3" style={{ color: "#6B86A0" }}>{p.fifties}</td>
                <td className="px-3 py-3" style={{ color: "#6B86A0" }}>{p.hundreds}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
