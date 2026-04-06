import type { Metadata } from "next";
import Link from "next/link";
import IplTeamBadge from "@/components/ipl/IplTeamBadge";
import { IPL_TEAMS } from "@/lib/cricbuzz";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "IPL 2026 Schedule — All Matches | Rizz Jobs",
  description: "Complete IPL 2026 match schedule with dates, venues, and results.",
};

interface MatchInfo {
  matchId: number;
  matchDesc: string;
  team1: { teamId: number; teamSName: string };
  team2: { teamId: number; teamSName: string };
  startDate: string;
  state: string;
  status?: string;
  venueInfo?: { ground: string; city: string };
}

function teamColors(sName: string) {
  const t = Object.values(IPL_TEAMS).find((t) => t.fullName.includes(sName));
  return t ? { bg: t.bg, color: t.color } : { bg: "#1C3A6B", color: "#E8E4DC" };
}

export default async function SchedulePage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  // series-data now returns schedule as flat array of { matchInfo: {...}, matchScore: {...} }
  let allMatches: MatchInfo[] = [];
  try {
    const res = await fetch(`${base}/api/ipl/series-data`, { next: { revalidate: 1800 } });
    if (res.ok) {
      const data = await res.json();
      allMatches = (data?.schedule ?? []).map(
        (m: { matchInfo: MatchInfo }) => m.matchInfo
      ).filter(Boolean);
    }
  } catch {/* silently handle */}

  // Group by date
  const byDate = new Map<string, MatchInfo[]>();
  for (const m of allMatches) {
    const d = new Date(parseInt(m.startDate)).toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata",
    });
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(m);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8 uppercase tracking-wider" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
        IPL 2026 Schedule
      </h1>
      {allMatches.length === 0 && (
        <p className="text-sm" style={{ color: "#6B86A0" }}>Schedule not available yet.</p>
      )}
      {Array.from(byDate.entries()).map(([date, matches]) => (
        <div key={date} className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 pb-2" style={{ color: "#6B86A0", borderBottom: "1px solid #0E2235" }}>
            {date}
          </h2>
          <div className="space-y-2">
            {matches.map((m) => {
              const t1c = teamColors(m.team1?.teamSName ?? "");
              const t2c = teamColors(m.team2?.teamSName ?? "");
              const isLive = m.state === "In Progress";
              const isDone = m.state === "Complete";
              return (
                <Link key={m.matchId} href={`/ipl/match/${m.matchId}`}>
                  <div
                    className="flex items-center gap-4 px-4 py-3 rounded-lg cursor-pointer transition-colors"
                    style={{ background: "#061624", border: `1px solid ${isLive ? "#FF5A1F" : "#0E2235"}` }}
                  >
                    <span className="text-xs w-20 shrink-0" style={{ color: "#6B86A0" }}>
                      {new Date(parseInt(m.startDate)).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}
                    </span>
                    <div className="flex items-center gap-2 flex-1">
                      <IplTeamBadge shortName={m.team1?.teamSName ?? "T1"} bg={t1c.bg} color={t1c.color} size="sm" />
                      <span style={{ color: "#6B86A0" }}>vs</span>
                      <IplTeamBadge shortName={m.team2?.teamSName ?? "T2"} bg={t2c.bg} color={t2c.color} size="sm" />
                      <span className="text-xs ml-2" style={{ color: "#6B86A0" }}>{m.matchDesc}</span>
                    </div>
                    {m.venueInfo && (
                      <span className="text-xs hidden md:block shrink-0" style={{ color: "#3A5060" }}>{m.venueInfo.city}</span>
                    )}
                    <span className="text-xs shrink-0 font-semibold" style={{ color: isLive ? "#FF5A1F" : isDone ? "#22C55E" : "#6B86A0" }}>
                      {isLive ? "LIVE" : isDone ? "Done" : "Upcoming"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
