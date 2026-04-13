import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "IPL 2026 Purple Cap — Most Wickets | Rizz Jobs",
  description: "IPL 2026 Purple Cap leaderboard — top wicket takers.",
};

interface Player {
  id: number;
  name: string;
  teamSName: string;
  mat: string;
  wickets: string;
  bbi: string;
  avg: string;
  econ: string;
  sr: string;
  fiveWickets: string;
  imageId?: number;
}

/** Cricbuzz stats response shape:
 *  { t20StatsList: { headers: [...], values: [{ values: [id, name, ...stats] }] } }
 *  headers for mostWickets: ["Bowler","M","O","W","Avg"] — id is prepended (no header).
 *  Positional: v[0]=id, v[1]=name, v[2]=M, v[3]=O, v[4]=W, v[5]=Avg, ...
 */
function parsePurpleCap(raw: unknown): Player[] {
  if (!raw || typeof raw !== "object") return [];
  const r = raw as Record<string, unknown>;
  const t20 = r.t20StatsList as Record<string, unknown> | unknown[] | undefined;
  const rows: { values?: string[] }[] = Array.isArray(t20)
    ? (t20[0] as Record<string, unknown>)?.values as { values?: string[] }[] ?? []
    : (t20 as Record<string, unknown>)?.values as { values?: string[] }[] ?? [];
  return rows
    .map((row) => {
      const v: string[] = Array.isArray(row.values) ? row.values : Array.isArray(row) ? row as unknown as string[] : [];
      return {
        id: parseInt(v[0] ?? "0") || 0,
        name: v[1] ?? "",
        teamSName: "",           // not in stats response
        mat: v[2] ?? "",
        wickets: v[4] ?? v[3] ?? "",
        bbi: "",
        avg: v[5] ?? "",
        econ: v[3] ?? "",       // "O" column = overs → use as proxy or leave blank
        sr: "",
        fiveWickets: "",
      };
    })
    .filter((p) => p.name);
}

export default async function PurpleCapPage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let players: Player[] = [];
  try {
    const res = await fetch(`${base}/api/ipl/stats`, { next: { revalidate: 1800 } });
    if (res.ok) {
      const data = await res.json();
      const meta = (data?.playerMeta ?? {}) as Record<string, { imageId: number; teamSName: string }>;
      players = parsePurpleCap(data?.purpleCap).map((p) => ({
        ...p,
        imageId: meta[String(p.id)]?.imageId,
        teamSName: meta[String(p.id)]?.teamSName ?? "",
      }));
    }
  } catch {/* silently handle */}

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2 uppercase tracking-wider" style={{ color: "#A855F7", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
        Purple Cap
      </h1>
      <p className="text-sm mb-6" style={{ color: "#5A566A" }}>Most wickets in IPL 2026</p>
      {players.length === 0 ? (
        <div className="rounded-xl px-6 py-12 text-center" style={{ background: "#12121A", border: "1px solid #2A2A3A" }}>
          <p className="text-base font-semibold" style={{ color: "#9A96A0" }}>Data not available yet</p>
          <p className="text-sm mt-1" style={{ color: "#5A566A" }}>Check back after matches are played</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #2A2A3A" }}>
          <table className="w-full text-sm" style={{ fontFamily: "var(--font-ipl-stats, monospace)" }}>
            <thead>
              <tr style={{ background: "#12121A", borderBottom: "1px solid #2A2A3A" }}>
                {["#", "Player", "Team", "Mat", "Wkts", "Avg"].map((h) => (
                  <th key={h} className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider" style={{ color: "#5A566A" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.id || i} style={{ borderBottom: "1px solid #2A2A3A", background: i === 0 ? "#0D001A" : "transparent" }}>
                  <td className="px-3 py-3 font-bold" style={{ color: i === 0 ? "#A855F7" : "#5A566A" }}>{i + 1}</td>
                  <td className="px-3 py-3">
                    <Link href={`/ipl/players/${p.id}`} className="flex items-center gap-2">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#2A2A3A] shrink-0">
                        {p.imageId ? <Image src={`/api/ipl/image?id=${p.imageId}&type=player`} alt={p.name} fill className="object-cover" unoptimized /> : null}
                      </div>
                      <span className="font-semibold" style={{ color: "#F0EDE8" }}>{p.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-xs font-bold" style={{ color: "#9A96A0" }}>{p.teamSName}</td>
                  <td className="px-3 py-3" style={{ color: "#F0EDE8" }}>{p.mat}</td>
                  <td className="px-3 py-3 font-bold" style={{ color: i === 0 ? "#A855F7" : "#F0EDE8" }}>{p.wickets}</td>
                  <td className="px-3 py-3" style={{ color: "#5A566A" }}>{p.avg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
