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
  return t ? { bg: t.bg, color: t.color } : { bg: "#1A1A26", color: "#F0EDE8" };
}

function formatDate(ms: string) {
  return new Date(parseInt(ms)).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata",
  });
}

function formatTime(ms: string) {
  return new Date(parseInt(ms)).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function SchedulePage({ searchParams }: PageProps) {
  const { tab } = await searchParams;
  const showFinished = tab === "finished";

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let allMatches: MatchInfo[] = [];
  try {
    const res = await fetch(`${base}/api/ipl/series-data`, { next: { revalidate: 1800 } });
    if (res.ok) {
      const data = await res.json();
      allMatches = (data?.schedule ?? [])
        .map((m: { matchInfo: MatchInfo }) => m.matchInfo)
        .filter(Boolean);
    }
  } catch {/* silently handle */}

  const upcoming = allMatches
    .filter((m) => m.state !== "Complete")
    .sort((a, b) => parseInt(a.startDate) - parseInt(b.startDate));

  const finished = allMatches
    .filter((m) => m.state === "Complete")
    .sort((a, b) => parseInt(b.startDate) - parseInt(a.startDate));

  const matches = showFinished ? finished : upcoming;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Page title */}
      <h1
        className="text-2xl font-bold mb-6 uppercase tracking-wider"
        style={{ color: "#F0EDE8", fontFamily: "var(--font-ipl-display, sans-serif)" }}
      >
        IPL 2026 Schedule
      </h1>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-8 p-1 rounded-xl w-fit"
        style={{ background: "#12121A", border: "1px solid #2A2A3A" }}
      >
        <Link
          href="/ipl/schedule"
          className="px-5 py-2 rounded-lg text-sm font-bold transition-colors"
          style={{
            background: !showFinished ? "#2A2A3A" : "transparent",
            color: !showFinished ? "#FFB800" : "#5A566A",
            fontFamily: "var(--font-ipl-display, sans-serif)",
          }}
        >
          Upcoming Matches
          {upcoming.length > 0 && (
            <span
              className="ml-2 px-1.5 py-0.5 rounded text-xs font-bold"
              style={{ background: "#1A3050", color: "#9A96A0" }}
            >
              {upcoming.length}
            </span>
          )}
        </Link>
        <Link
          href="/ipl/schedule?tab=finished"
          className="px-5 py-2 rounded-lg text-sm font-bold transition-colors"
          style={{
            background: showFinished ? "#2A2A3A" : "transparent",
            color: showFinished ? "#22C55E" : "#5A566A",
            fontFamily: "var(--font-ipl-display, sans-serif)",
          }}
        >
          Finished Matches
          {finished.length > 0 && (
            <span
              className="ml-2 px-1.5 py-0.5 rounded text-xs font-bold"
              style={{ background: "#1A3050", color: "#9A96A0" }}
            >
              {finished.length}
            </span>
          )}
        </Link>
      </div>

      {matches.length === 0 && (
        <p className="text-sm py-8 text-center" style={{ color: "#5A566A" }}>
          {showFinished ? "No finished matches yet." : "No upcoming matches scheduled."}
        </p>
      )}

      {/* Match cards */}
      <div className="space-y-3">
        {matches.map((m) => {
          const t1c = teamColors(m.team1?.teamSName ?? "");
          const t2c = teamColors(m.team2?.teamSName ?? "");
          const isLive = m.state === "In Progress";
          const isDone = m.state === "Complete";

          return (
            <Link key={m.matchId} href={`/ipl/match/${m.matchId}`}>
              <div
                className="group rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.01]"
                style={{
                  background: "#12121A",
                  border: `1px solid ${isLive ? "#FF5A1F55" : "#2A2A3A"}`,
                  boxShadow: isLive ? "0 0 12px #FF5A1F22" : "none",
                }}
              >
                {/* Top strip — match meta */}
                <div
                  className="flex items-center justify-between px-4 py-2 text-xs font-semibold"
                  style={{
                    background: isDone ? "#12121A" : "#050F1A",
                    borderBottom: "1px solid #2A2A3A",
                    color: "#5A566A",
                    fontFamily: "var(--font-ipl-stats, monospace)",
                  }}
                >
                  <span>{m.matchDesc}</span>
                  <div className="flex items-center gap-3">
                    {m.venueInfo && (
                      <span className="hidden sm:block">{m.venueInfo.city}</span>
                    )}
                    <span>
                      {formatDate(m.startDate)} · {formatTime(m.startDate)} IST
                    </span>
                    {isLive && (
                      <span
                        className="flex items-center gap-1 font-bold"
                        style={{ color: "#FF5A1F" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F] animate-pulse inline-block" />
                        LIVE
                      </span>
                    )}
                  </div>
                </div>

                {/* Main body */}
                <div className="px-4 py-4 flex items-center gap-4">
                  {/* Team 1 */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <IplTeamBadge
                      shortName={m.team1?.teamSName ?? "T1"}
                      bg={t1c.bg}
                      color={t1c.color}
                      size="md"
                    />
                    <span
                      className="font-bold text-base hidden sm:block truncate"
                      style={{ color: "#F0EDE8", fontFamily: "var(--font-ipl-display, sans-serif)" }}
                    >
                      {Object.values(IPL_TEAMS).find(t => t.id.toString() === String(m.team1?.teamId) ||
                        t.fullName.includes(m.team1?.teamSName ?? ""))?.fullName ?? m.team1?.teamSName}
                    </span>
                  </div>

                  {/* VS / Result badge */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    {isDone ? (
                      <span
                        className="text-xs font-bold px-3 py-1 rounded-full"
                        style={{ background: "#22C55E22", color: "#22C55E" }}
                      >
                        RESULT
                      </span>
                    ) : isLive ? (
                      <span
                        className="text-xs font-bold px-3 py-1 rounded-full"
                        style={{ background: "#FF5A1F22", color: "#FF5A1F" }}
                      >
                        LIVE
                      </span>
                    ) : (
                      <span
                        className="text-sm font-bold"
                        style={{ color: "#5A566A", fontFamily: "var(--font-ipl-display, sans-serif)" }}
                      >
                        VS
                      </span>
                    )}
                  </div>

                  {/* Team 2 */}
                  <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                    <span
                      className="font-bold text-base hidden sm:block truncate text-right"
                      style={{ color: "#F0EDE8", fontFamily: "var(--font-ipl-display, sans-serif)" }}
                    >
                      {Object.values(IPL_TEAMS).find(t => t.id.toString() === String(m.team2?.teamId) ||
                        t.fullName.includes(m.team2?.teamSName ?? ""))?.fullName ?? m.team2?.teamSName}
                    </span>
                    <IplTeamBadge
                      shortName={m.team2?.teamSName ?? "T2"}
                      bg={t2c.bg}
                      color={t2c.color}
                      size="md"
                    />
                  </div>
                </div>

                {/* Result bar */}
                {m.status && (
                  <div
                    className="px-4 py-2 text-xs font-semibold text-center"
                    style={{
                      background: "#040C16",
                      borderTop: "1px solid #2A2A3A",
                      color: isDone ? "#22C55E" : isLive ? "#FF5A1F" : "#5A566A",
                      fontFamily: "var(--font-ipl-display, sans-serif)",
                    }}
                  >
                    {m.status}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
