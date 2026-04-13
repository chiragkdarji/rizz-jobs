import Link from "next/link";
import IplTeamBadge from "./IplTeamBadge";
import { IPL_TEAMS } from "@/lib/cricbuzz";

interface Innings {
  runs?: number;
  wickets?: number;
  overs?: number;
}

interface LiveMatch {
  matchId: number;
  team1: { teamSName: string };
  team2: { teamSName: string };
  team1Score?: { inngs1?: Innings };
  team2Score?: { inngs1?: Innings };
  status?: string;
  matchDesc?: string;
  venueInfo?: { city: string };
}

interface Props {
  liveMatch?: LiveMatch;
  nextMatch?: {
    team1: { teamSName: string };
    team2: { teamSName: string };
    startDate: string;
    venueInfo?: { city: string };
  };
}

function teamColors(sName: string) {
  const t = Object.values(IPL_TEAMS).find((t) => t.fullName.includes(sName));
  return t ? { bg: t.bg, color: t.color } : { bg: "#1A1A26", color: "#F0EDE8" };
}

function normalizeOvers(overs: number | undefined): string {
  if (overs == null) return "0";
  const complete = Math.floor(overs);
  const balls = Math.round((overs - complete) * 10);
  if (balls >= 6) return `${complete + 1}`;
  if (balls === 0) return `${complete}`;
  return `${complete}.${balls}`;
}

function scoreStr(inn?: Innings) {
  if (!inn || inn.runs == null) return "Yet to bat";
  return `${inn.runs}/${inn.wickets ?? 0} (${normalizeOvers(inn.overs)})`;
}

export default function IplHeroBanner({ liveMatch, nextMatch }: Props) {
  if (liveMatch) {
    const t1c = teamColors(liveMatch.team1.teamSName);
    const t2c = teamColors(liveMatch.team2.teamSName);
    return (
      <div
        className="relative px-6 py-10 md:py-14 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #12121A 0%, #0A2540 50%, #12121A 100%)",
          borderBottom: "1px solid #2A2A3A",
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-5" style={{ background: "#FFB800" }} />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full opacity-5" style={{ background: "#FF5A1F" }} />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#FF5A1F] animate-pulse" />
            <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: "#FF5A1F" }}>
              Live Now
            </span>
            {liveMatch.matchDesc && (
              <span className="text-sm" style={{ color: "#5A566A" }}>· {liveMatch.matchDesc}</span>
            )}
          </div>

          <div className="flex items-center justify-center gap-8 md:gap-16">
            <div className="flex flex-col items-center gap-2">
              <IplTeamBadge shortName={liveMatch.team1.teamSName} bg={t1c.bg} color={t1c.color} size="lg" />
              <span
                className="text-3xl md:text-4xl font-bold"
                style={{ color: "#F0EDE8", fontFamily: "var(--font-ipl-stats, monospace)" }}
              >
                {scoreStr(liveMatch.team1Score?.inngs1)}
              </span>
            </div>
            <span className="text-2xl font-bold" style={{ color: "#5A566A" }}>VS</span>
            <div className="flex flex-col items-center gap-2">
              <IplTeamBadge shortName={liveMatch.team2.teamSName} bg={t2c.bg} color={t2c.color} size="lg" />
              <span
                className="text-3xl md:text-4xl font-bold"
                style={{ color: "#F0EDE8", fontFamily: "var(--font-ipl-stats, monospace)" }}
              >
                {scoreStr(liveMatch.team2Score?.inngs1)}
              </span>
            </div>
          </div>

          {liveMatch.status && (
            <p className="mt-4 text-sm" style={{ color: "#22C55E" }}>{liveMatch.status}</p>
          )}
          {liveMatch.venueInfo && (
            <p className="mt-1 text-xs" style={{ color: "#5A566A" }}>{liveMatch.venueInfo.city}</p>
          )}

          <Link
            href={`/ipl/match/${liveMatch.matchId}`}
            className="inline-block mt-6 px-6 py-2 rounded-lg font-bold text-sm transition-opacity hover:opacity-90"
            style={{
              background: "#FFB800",
              color: "#0A0A0F",
              fontFamily: "var(--font-ipl-display, sans-serif)",
            }}
          >
            Full Scorecard →
          </Link>
        </div>
      </div>
    );
  }

  // No live match — show tournament banner
  return (
    <div
      className="relative px-6 py-14 text-center overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #12121A 0%, #0A2540 50%, #12121A 100%)",
        borderBottom: "1px solid #2A2A3A",
      }}
    >
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-5" style={{ background: "#FFB800" }} />
      <h1
        className="text-4xl md:text-5xl font-bold tracking-wide"
        style={{ color: "#FFB800", fontFamily: "var(--font-ipl-display, sans-serif)" }}
      >
        IPL 2026
      </h1>
      <p className="mt-2 text-base" style={{ color: "#5A566A" }}>
        Indian Premier League · Season in Progress
      </p>
      {nextMatch && (
        <div className="mt-6 inline-flex items-center gap-3 px-5 py-3 rounded-xl" style={{ background: "#2A2A3A" }}>
          <IplTeamBadge
            shortName={nextMatch.team1.teamSName}
            bg={teamColors(nextMatch.team1.teamSName).bg}
            color={teamColors(nextMatch.team1.teamSName).color}
          />
          <span style={{ color: "#5A566A" }}>vs</span>
          <IplTeamBadge
            shortName={nextMatch.team2.teamSName}
            bg={teamColors(nextMatch.team2.teamSName).bg}
            color={teamColors(nextMatch.team2.teamSName).color}
          />
          <span className="text-xs" style={{ color: "#5A566A" }}>
            {new Date(parseInt(nextMatch.startDate)).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Kolkata",
            })}
            {nextMatch.venueInfo && ` · ${nextMatch.venueInfo.city}`}
          </span>
        </div>
      )}
    </div>
  );
}
