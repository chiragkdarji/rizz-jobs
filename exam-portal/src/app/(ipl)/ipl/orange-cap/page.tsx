import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "IPL 2026 Orange Cap — Most Runs | Rizz Jobs",
  description: "IPL 2026 Orange Cap leaderboard — top run scorers.",
};

interface Player {
  id: number;
  name: string;
  teamSName: string;
  mat: string;
  runs: string;
  hs: string;
  avg: string;
  sr: string;
  fifties: string;
  hundreds: string;
  imageId?: number;
}

/** Cricbuzz stats response shape:
 *  { t20StatsList: { headers: [...], values: [{ values: [id, name, ...stats] }] } }
 *  headers does NOT include id — so values[0]=id, values[1]=name, rest = headers positional.
 */
function parseOrangeCap(raw: unknown): Player[] {
  if (!raw || typeof raw !== "object") return [];
  const r = raw as Record<string, unknown>;
  const t20 = r.t20StatsList as Record<string, unknown> | unknown[] | undefined;
  // Handle both object {headers, values} and legacy array [{values}]
  const rows: { values?: string[] }[] = Array.isArray(t20)
    ? (t20[0] as Record<string, unknown>)?.values as { values?: string[] }[] ?? []
    : (t20 as Record<string, unknown>)?.values as { values?: string[] }[] ?? [];
  return rows
    .map((row) => {
      const v: string[] = Array.isArray(row.values) ? row.values : Array.isArray(row) ? row as unknown as string[] : [];
      // Confirmed headers for mostRuns: [Player, M, Inn, NO, Runs, HS, Avg, SR, 100s, 50s, 4s, 6s]
      // Positional: v[0]=id, v[1]=name, v[2]=M, v[3]=Inn, v[4]=NO, v[5]=Runs, v[6]=HS, v[7]=Avg, v[8]=SR, ...
      return {
        id: parseInt(v[0] ?? "0") || 0,
        name: v[1] ?? "",
        teamSName: v[2] ?? "",          // may shift based on actual response
        mat: v[2] ?? "",
        runs: v[5] ?? v[4] ?? v[3] ?? "",
        hs: v[6] ?? "",
        avg: v[7] ?? "",
        sr: v[8] ?? "",
        fifties: v[10] ?? "",
        hundreds: v[9] ?? "",
      };
    })
    .filter((p) => p.name);
}

export default async function OrangeCapPage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let players: Player[] = [];
  try {
    const res = await fetch(`${base}/api/ipl/stats`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      players = parseOrangeCap(data?.orangeCap);
    }
  } catch {/* silently handle */}

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2 uppercase tracking-wider" style={{ color: "#FF5A1F", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
        Orange Cap
      </h1>
      <p className="text-sm mb-6" style={{ color: "#6B86A0" }}>Most runs in IPL 2026</p>
      {players.length === 0 ? (
        <div className="rounded-xl px-6 py-12 text-center" style={{ background: "#061624", border: "1px solid #0E2235" }}>
          <p className="text-base font-semibold" style={{ color: "#8BB0C8" }}>Data not available yet</p>
          <p className="text-sm mt-1" style={{ color: "#6B86A0" }}>Check back after matches are played</p>
        </div>
      ) : (
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
                <tr key={p.id || i} style={{ borderBottom: "1px solid #0E2235", background: i === 0 ? "#1A0A00" : "transparent" }}>
                  <td className="px-3 py-3 font-bold" style={{ color: i === 0 ? "#FF5A1F" : "#6B86A0" }}>{i + 1}</td>
                  <td className="px-3 py-3">
                    <Link href={`/ipl/players/${p.id}`} className="flex items-center gap-2">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#0E2235] shrink-0">
                        {p.imageId ? <Image src={`/api/ipl/image?id=${p.imageId}&type=player`} alt={p.name} fill className="object-cover" unoptimized /> : null}
                      </div>
                      <span className="font-semibold" style={{ color: "#E8E4DC" }}>{p.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-3" style={{ color: "#6B86A0" }}>{p.teamSName}</td>
                  <td className="px-3 py-3" style={{ color: "#E8E4DC" }}>{p.mat}</td>
                  <td className="px-3 py-3 font-bold" style={{ color: i === 0 ? "#FF5A1F" : "#E8E4DC" }}>{p.runs}</td>
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
      )}
    </div>
  );
}
