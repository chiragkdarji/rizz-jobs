import type { Metadata } from "next";
import IplScorecard from "@/components/ipl/IplScorecard";
import IplFantasyCard from "@/components/ipl/IplFantasyCard";
import IplTeamBadge from "@/components/ipl/IplTeamBadge";
import { IPL_TEAMS } from "@/lib/cricbuzz";
import Link from "next/link";

export const revalidate = 60;

interface Props {
  params: Promise<{ matchId: string }>;
}

function teamColors(sName: string) {
  const t = Object.values(IPL_TEAMS).find((t) => t.fullName.includes(sName) || t.id.toString() === sName);
  return t ? { bg: t.bg, color: t.color } : { bg: "#1C3A6B", color: "#E8E4DC" };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { matchId } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";
  try {
    const res = await fetch(`${base}/api/ipl/match/${matchId}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      // mcenter/v1/{id} returns flat: team1.teamsname, team2.teamsname, status
      const info = data?.info;
      if (info) {
        return {
          title: `${info.team1?.teamsname ?? ""} vs ${info.team2?.teamsname ?? ""} Scorecard — IPL 2026 | Rizz Jobs`,
          description: info.status ?? `Scorecard for IPL 2026 match`,
        };
      }
    }
  } catch {/* silently handle */}
  return { title: "Match Scorecard — IPL 2026 | Rizz Jobs" };
}

export default async function MatchPage({ params }: Props) {
  const { matchId } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let matchData: {
    scorecard?: {
      scorecard?: {
        inningsid: number;
        batteamname: string;
        batteamsname: string;
        score?: number;
        wickets?: number;
        overs?: number;
        batsman?: { id: number; name: string; runs: number; balls: number; fours: number; sixes: number; strkrate: string; outdec?: string; iscaptain?: boolean; iskeeper?: boolean }[];
        bowler?: { id: number; name: string; ovs: string; maidens: number; runs: number; wkts: number; noballs: number; wides: number; economy: string }[];
        fow?: { batid: number; batname: string; fowscore: number; fowballs: number; wktnbr: number }[];
        extras?: { total: number; byes?: number; legbyes?: number; wides?: number; noballs?: number };
      }[];
    };
    info?: {
      matchid: number;
      state: string;
      status: string;
      matchdesc: string;
      team1: { teamid: number; teamname: string; teamsname: string };
      team2: { teamid: number; teamname: string; teamsname: string };
      venueinfo?: { ground: string; city: string };
      tossstatus?: string;
    };
  } | null = null;

  try {
    const res = await fetch(`${base}/api/ipl/match/${matchId}`, { next: { revalidate: 60 } });
    if (res.ok) matchData = await res.json();
  } catch {/* silently handle */}

  const info = matchData?.info;
  const innings = matchData?.scorecard?.scorecard ?? [];
  const isLive = info?.state === "In Progress";
  const status = info?.status;

  const t1c = info ? teamColors(info.team1.teamname) : { bg: "#1C3A6B", color: "#E8E4DC" };
  const t2c = info ? teamColors(info.team2.teamname) : { bg: "#1C3A6B", color: "#E8E4DC" };

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
            <IplTeamBadge shortName={info.team1.teamsname} bg={t1c.bg} color={t1c.color} size="lg" />
            <span style={{ color: "#6B86A0" }}>vs</span>
            <IplTeamBadge shortName={info.team2.teamsname} bg={t2c.bg} color={t2c.color} size="lg" />
          </div>
          <p className="mt-2 text-sm" style={{ color: "#6B86A0" }}>
            {info.matchdesc}
            {info.venueinfo && ` · ${info.venueinfo.city}`}
          </p>
          {status && (
            <p className="mt-2 text-sm font-semibold" style={{ color: isLive ? "#FF5A1F" : "#22C55E" }}>{status}</p>
          )}
          {info.tossstatus && (
            <p className="mt-1 text-xs" style={{ color: "#6B86A0" }}>Toss: {info.tossstatus}</p>
          )}
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

      {innings.length === 0 && (
        <p className="text-center py-8 text-sm" style={{ color: "#6B86A0" }}>Scorecard not available yet.</p>
      )}

      {/* Match info */}
      {info && info.venueinfo && (
        <div className="rounded-xl p-4 space-y-2 text-sm" style={{ background: "#061624", border: "1px solid #0E2235" }}>
          <div className="flex gap-2">
            <span style={{ color: "#6B86A0" }}>Venue:</span>
            <span style={{ color: "#E8E4DC" }}>{info.venueinfo.ground}, {info.venueinfo.city}</span>
          </div>
        </div>
      )}

      {/* Fantasy CTA */}
      <IplFantasyCard
        matchDesc={info?.matchdesc}
        team1={info?.team1.teamsname}
        team2={info?.team2.teamsname}
      />
    </div>
  );
}
