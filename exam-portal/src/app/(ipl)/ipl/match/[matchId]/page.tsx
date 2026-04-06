import type { Metadata } from "next";
import IplScorecard from "@/components/ipl/IplScorecard";
import IplTeamBadge from "@/components/ipl/IplTeamBadge";
import { IPL_TEAMS } from "@/lib/cricbuzz";
import Link from "next/link";

export const revalidate = 60;

interface Props {
  params: Promise<{ matchId: string }>;
}

function teamColors(sName: string) {
  if (!sName) return { bg: "#1C3A6B", color: "#E8E4DC" };
  const t = Object.values(IPL_TEAMS).find(
    (t) => t.fullName.includes(sName) || t.id.toString() === sName
  );
  return t ? { bg: t.bg, color: t.color } : { bg: "#1C3A6B", color: "#E8E4DC" };
}

/** Normalise raw Cricbuzz mcenter response.
 *  The endpoint may return { matchInfo: {...} } or a flat match object.
 *  Field names may be camelCase (matchId, teamSName) or lowercase (matchid, teamsname).
 *  We unify to a single interface used by the page. */
function normalizeInfo(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  // Unwrap matchInfo wrapper if present
  const flat = (r.matchInfo && typeof r.matchInfo === "object")
    ? (r.matchInfo as Record<string, unknown>)
    : r;

  const t1Raw = (flat.team1 ?? flat.Team1) as Record<string, unknown> | undefined;
  const t2Raw = (flat.team2 ?? flat.Team2) as Record<string, unknown> | undefined;
  const venueRaw = (flat.venueinfo ?? flat.venue ?? flat.venueInfo) as Record<string, unknown> | undefined;

  return {
    matchid: flat.matchid ?? flat.matchId ?? flat.matchID,
    state: (flat.state ?? flat.matchState ?? "") as string,
    status: (flat.status ?? flat.matchStatus ?? "") as string,
    matchdesc: (flat.matchdesc ?? flat.matchDesc ?? flat.matchDescription ?? "") as string,
    tossstatus: flat.tossstatus ?? flat.tossResults ?? flat.tossStatus,
    team1: t1Raw
      ? {
          teamid: t1Raw.teamid ?? t1Raw.teamId,
          teamname: (t1Raw.teamname ?? t1Raw.teamName ?? "") as string,
          teamsname: (t1Raw.teamsname ?? t1Raw.teamSName ?? t1Raw.shortName ?? "") as string,
        }
      : null,
    team2: t2Raw
      ? {
          teamid: t2Raw.teamid ?? t2Raw.teamId,
          teamname: (t2Raw.teamname ?? t2Raw.teamName ?? "") as string,
          teamsname: (t2Raw.teamsname ?? t2Raw.teamSName ?? t2Raw.shortName ?? "") as string,
        }
      : null,
    venueinfo: venueRaw
      ? {
          ground: (venueRaw.ground ?? venueRaw.groundName ?? "") as string,
          city: (venueRaw.city ?? venueRaw.cityName ?? "") as string,
        }
      : null,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { matchId } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";
  try {
    const res = await fetch(`${base}/api/ipl/match/${matchId}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      const info = normalizeInfo(data?.info);
      if (info) {
        return {
          title: `${info.team1?.teamsname ?? ""} vs ${info.team2?.teamsname ?? ""} Scorecard — IPL 2026 | Rizz Jobs`,
          description: info.status || "Scorecard for IPL 2026 match",
        };
      }
    }
  } catch {/* silently handle */}
  return { title: "Match Scorecard — IPL 2026 | Rizz Jobs" };
}

export default async function MatchPage({ params }: Props) {
  const { matchId } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let rawData: { scorecard?: unknown; info?: unknown } | null = null;

  try {
    const res = await fetch(`${base}/api/ipl/match/${matchId}`, { next: { revalidate: 60 } });
    if (res.ok) rawData = await res.json();
  } catch {/* silently handle */}

  const info = rawData?.info ? normalizeInfo(rawData.info) : null;

  // Normalize scorecard innings array — may be at .scorecard or .innings
  const scardRaw = rawData?.scorecard as Record<string, unknown> | null;
  const innings: {
    inningsid: number;
    batteamname: string;
    score?: number;
    wickets?: number;
    overs?: number;
    batsman?: { id: number; name: string; runs: number; balls: number; fours: number; sixes: number; strkrate: string; outdec?: string; iscaptain?: boolean; iskeeper?: boolean }[];
    bowler?: { id: number; name: string; ovs: string; maidens: number; runs: number; wkts: number; noballs: number; wides: number; economy: string }[];
    fow?: { batid: number; batname: string; fowscore: number; fowballs: number; wktnbr: number }[];
    extras?: { total: number; byes?: number; legbyes?: number; wides?: number; noballs?: number };
  }[] = (
    (scardRaw?.scorecard ?? scardRaw?.innings ?? []) as unknown[]
  ).filter(Boolean) as typeof innings;

  const isLive = info?.state === "In Progress";
  const status = info?.status;

  const t1c = info?.team1 ? teamColors(info.team1.teamname) : { bg: "#1C3A6B", color: "#E8E4DC" };
  const t2c = info?.team2 ? teamColors(info.team2.teamname) : { bg: "#1C3A6B", color: "#E8E4DC" };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Match header */}
      {info && (
        <div className="rounded-xl p-6 text-center" style={{ background: "#061624", border: "1px solid #0E2235" }}>
          {isLive && (
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#FF5A1F] animate-pulse" />
              <span className="text-xs font-bold" style={{ color: "#FF5A1F" }}>LIVE</span>
            </div>
          )}
          <div className="flex items-center justify-center gap-8">
            {info.team1 && (
              <IplTeamBadge shortName={info.team1.teamsname} bg={t1c.bg} color={t1c.color} size="lg" />
            )}
            <span style={{ color: "#6B86A0" }}>vs</span>
            {info.team2 && (
              <IplTeamBadge shortName={info.team2.teamsname} bg={t2c.bg} color={t2c.color} size="lg" />
            )}
          </div>
          <p className="mt-2 text-sm" style={{ color: "#6B86A0" }}>
            {info.matchdesc}
            {info.venueinfo?.city && ` · ${info.venueinfo.city}`}
          </p>
          {status && (
            <p className="mt-2 text-sm font-semibold" style={{ color: isLive ? "#FF5A1F" : "#22C55E" }}>{status}</p>
          )}
          {typeof info.tossstatus === "string" && info.tossstatus && (
            <p className="mt-1 text-xs" style={{ color: "#6B86A0" }}>Toss: {info.tossstatus}</p>
          )}
        </div>
      )}

      {!info && (
        <div className="rounded-xl p-6 text-center" style={{ background: "#061624", border: "1px solid #0E2235" }}>
          <p className="text-sm" style={{ color: "#6B86A0" }}>Match data not available.</p>
          <Link href="/ipl/schedule" className="inline-block mt-4 text-sm font-semibold" style={{ color: "#8BB0C8" }}>
            ← Back to Schedule
          </Link>
        </div>
      )}

      {/* Commentary link if live */}
      {isLive && (
        <div className="text-center">
          <Link
            href={`/ipl/match/${matchId}/commentary`}
            className="inline-block px-6 py-2 rounded-lg font-bold text-sm"
            style={{ background: "#0E2235", color: "#D4AF37", border: "1px solid #D4AF3744", fontFamily: "var(--font-ipl-display, sans-serif)" }}
          >
            Ball-by-Ball Commentary →
          </Link>
        </div>
      )}

      {/* Innings scorecards */}
      {innings.map((inn) => {
        const batsmen = (inn.batsman ?? []).map((b) => ({
          batName: b.name,
          batRuns: b.runs,
          batBalls: b.balls,
          batFours: b.fours,
          batSixes: b.sixes,
          batStrikeRate: parseFloat(b.strkrate) || 0,
          outDesc: b.outdec,
          isCaptain: b.iscaptain,
          isKeeper: b.iskeeper,
        }));
        const bowlers = (inn.bowler ?? []).map((b) => ({
          bowlName: b.name,
          bowlOvs: b.ovs,
          bowlMaidens: b.maidens,
          bowlRuns: b.runs,
          bowlWkts: b.wkts,
          bowlNoballs: b.noballs,
          bowlWides: b.wides,
          bowlEcon: parseFloat(b.economy) || 0,
        }));
        const fow = (inn.fow ?? []).map((w) => ({
          batName: w.batname,
          fowScore: w.fowscore,
          fowBalls: w.fowballs,
          wktNbr: w.wktnbr,
        }));
        const extras = inn.extras
          ? { total: inn.extras.total, b: inn.extras.byes, lb: inn.extras.legbyes, wd: inn.extras.wides, nb: inn.extras.noballs }
          : undefined;

        return (
          <IplScorecard
            key={inn.inningsid}
            teamName={inn.batteamname}
            batsmen={batsmen}
            bowlers={bowlers}
            fow={fow}
            extras={extras}
            totalRuns={inn.score}
            totalWickets={inn.wickets}
            totalOvers={inn.overs}
          />
        );
      })}

      {innings.length === 0 && info && (
        <p className="text-center py-8 text-sm" style={{ color: "#6B86A0" }}>Scorecard not available yet.</p>
      )}

      {/* Match info */}
      {info?.venueinfo && (
        <div className="rounded-xl p-4 space-y-2 text-sm" style={{ background: "#061624", border: "1px solid #0E2235" }}>
          <div className="flex gap-2">
            <span style={{ color: "#6B86A0" }}>Venue:</span>
            <span style={{ color: "#E8E4DC" }}>{info.venueinfo.ground}{info.venueinfo.city ? `, ${info.venueinfo.city}` : ""}</span>
          </div>
        </div>
      )}
    </div>
  );
}
