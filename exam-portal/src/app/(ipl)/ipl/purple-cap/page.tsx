import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "IPL 2025 Purple Cap — Most Wickets | Rizz Jobs",
  description: "IPL 2025 Purple Cap leaderboard — top wicket takers with economy and bowling averages.",
};

export default async function PurpleCapPage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let players: { id: number; name: string; teamSName: string; value: string; mat: string; bbi: string; avg: string; econ: string; sr: string; fiveWickets: string; imageId?: number }[] = [];
  try {
    const res = await fetch(`${base}/api/ipl/stats`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      players = data?.purpleCap?.values?.[0]?.stats ?? [];
    }
  } catch {/* silently handle */}

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2 uppercase tracking-wider" style={{ color: "#A855F7", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
        Purple Cap
      </h1>
      <p className="text-sm mb-6" style={{ color: "#6B86A0" }}>Most wickets in IPL 2025</p>
      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #0E2235" }}>
        <table className="w-full text-sm" style={{ fontFamily: "var(--font-ipl-stats, monospace)" }}>
          <thead>
            <tr style={{ background: "#061624", borderBottom: "1px solid #0E2235" }}>
              {["#", "Player", "Team", "Mat", "Wkts", "BBI", "Avg", "Econ", "SR", "5W"].map((h) => (
                <th key={h} className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#6B86A0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #0E2235", background: i === 0 ? "#0D001A" : "transparent" }}>
                <td className="px-3 py-3 font-bold" style={{ color: i === 0 ? "#A855F7" : "#6B86A0" }}>{i + 1}</td>
                <td className="px-3 py-3">
                  <Link href={`/ipl/players/${p.id}`} className="flex items-center gap-2">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#0E2235] shrink-0">
                      {p.imageId ? (
                        <Image src={`/api/ipl/image?id=${p.imageId}`} alt={p.name} fill className="object-cover" unoptimized />
                      ) : null}
                    </div>
                    <span className="font-semibold" style={{ color: "#E8E4DC" }}>{p.name}</span>
                  </Link>
                </td>
                <td className="px-3 py-3" style={{ color: "#6B86A0" }}>{p.teamSName}</td>
                <td className="px-3 py-3" style={{ color: "#E8E4DC" }}>{p.mat}</td>
                <td className="px-3 py-3 font-bold" style={{ color: i === 0 ? "#A855F7" : "#E8E4DC" }}>{p.value}</td>
                <td className="px-3 py-3" style={{ color: "#6B86A0" }}>{p.bbi}</td>
                <td className="px-3 py-3" style={{ color: "#6B86A0" }}>{p.avg}</td>
                <td className="px-3 py-3" style={{ color: "#6B86A0" }}>{p.econ}</td>
                <td className="px-3 py-3" style={{ color: "#6B86A0" }}>{p.sr}</td>
                <td className="px-3 py-3" style={{ color: "#6B86A0" }}>{p.fiveWickets}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
