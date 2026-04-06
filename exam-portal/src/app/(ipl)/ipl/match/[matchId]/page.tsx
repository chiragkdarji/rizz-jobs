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
  const t = Object.values(IPL_TEAMS).find((t) => t.fullName.includes(sName));
  return t ? { bg: t.bg, color: t.color } : { bg: "#1C3A6B", color: "#E8E4DC" };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { matchId } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";
  try {
    const res = await fetch(`${base}/api/ipl/match/${matchId}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      const mi = data?.info?.matchInfo;
      if (mi) {
        return {
          title: `${mi.team1?.teamSName} vs ${mi.team2?.teamSName} Scorecard — IPL 2025 | Rizz Jobs`,
          description: mi.status ?? `Live scorecard for ${mi.team1?.teamName} vs ${mi.team2?.teamName}`,
        };
      }
    }
  } catch {/* silently handle */}
  return { title: "Match Scorecard — IPL 2025 | Rizz Jobs" };
}

export default async function MatchPage({ params }: Props) {
  const { matchId } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let matchData: {
    scorecard?: {
      scoreCard?: {
        inningsId: number;
        batTeamDetails?: {
          batTeamName: string;
          batTeamShortName: string;
          batsmenData?: Record<string, {
            batName: string; batRuns: number; batBalls: number; batFours: number; batSixes: number; batStrikeRate: number; outDesc?: string; isCaptain?: boolean; isKeeper?: boolean;
          }>;
          bowlTeamDetails?: {
            bowlersData?: Record<string, {
              bowlName: string; bowlOvs: string; bowlMaidens: number; bowlRuns: number; bowlWkts: number; bowlNoballs: number; bowlWides: number; bowlEcon: number;
            }>;
          };
          wicketsData?: Record<string, { batName: string; fowScore: number; fowBalls: number; wktNbr: number }>;
          extras?: { total: number; byes?: number; legByes?: number; wides?: number; noBalls?: number };
          inningsScore?: { runs: number; wickets: number; overs: number };
        };
      }[];
      matchHeader?: {
        state: string;
        status: string;
        matchDescription: string;
        team1?: { shortName: string };
        team2?: { shortName: string };
      };
    };
    info?: {
      matchInfo?: {
        state: string;
        status: string;
        matchDesc: string;
        team1: { teamSName: string; teamName: string };
        team2: { teamSName: string; teamName: string };
        venueInfo?: { ground: string; city: string };
        tossResults?: { tossWinner: string; decision: string };
        playersOfTheMatch?: { name: string; fullName: string }[];
      };
    };
  } | null = null;

  try {
    const res = await fetch(`${base}/api/ipl/match/${matchId}`, { next: { revalidate: 60 } });
    if (res.ok) matchData = await res.json();
  } catch {/* silently handle */}

  const mi = matchData?.info?.matchInfo;
  const mh = matchData?.scorecard?.matchHeader;
  const innings = matchData?.scorecard?.scoreCard ?? [];
  const isLive = (mi?.state ?? mh?.state) === "In Progress";
  const status = mi?.status ?? mh?.status;

  const t1c = mi ? teamColors(mi.team1.teamSName) : { bg: "#1C3A6B", color: "#E8E4DC" };
  const t2c = mi ? teamColors(mi.team2.teamSName) : { bg: "#1C3A6B", color: "#E8E4DC" };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Match header */}
      {mi && (
        <div className="rounded-xl p-6 text-center" style={{ background: "#061624", border: "1px solid #0E2235" }}>
          {isLive && (
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#FF5A1F] animate-pulse" />
              <span className="text-xs font-bold" style={{ color: "#FF5A1F" }}>LIVE</span>
            </div>
          )}
          <div className="flex items-center justify-center gap-8">
            <IplTeamBadge shortName={mi.team1.teamSName} bg={t1c.bg} color={t1c.color} size="lg" />
            <span style={{ color: "#6B86A0" }}>vs</span>
            <IplTeamBadge shortName={mi.team2.teamSName} bg={t2c.bg} color={t2c.color} size="lg" />
          </div>
          <p className="mt-2 text-sm" style={{ color: "#6B86A0" }}>
            {mi.matchDesc}
            {mi.venueInfo && ` · ${mi.venueInfo.city}`}
          </p>
          {status && (
            <p className="mt-2 text-sm font-semibold" style={{ color: isLive ? "#FF5A1F" : "#22C55E" }}>{status}</p>
          )}
          {mi.tossResults && (
            <p className="mt-1 text-xs" style={{ color: "#3A5060" }}>
              Toss: {mi.tossResults.tossWinner} chose to {mi.tossResults.decision}
            </p>
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
        const btd = inn.batTeamDetails;
        if (!btd) return null;
        const batsmen = Object.values(btd.batsmenData ?? {});
        const bowlers = Object.values(btd.bowlTeamDetails?.bowlersData ?? {});
        const fow = Object.values(btd.wicketsData ?? {}).map((w) => ({
          batName: w.batName,
          fowScore: w.fowScore,
          fowBalls: w.fowBalls,
          wktNbr: w.wktNbr,
        }));
        const extras = btd.extras
          ? { total: btd.extras.total, b: btd.extras.byes, lb: btd.extras.legByes, wd: btd.extras.wides, nb: btd.extras.noBalls }
          : undefined;
        return (
          <IplScorecard
            key={inn.inningsId}
            teamName={btd.batTeamName}
            batsmen={batsmen.map((b) => ({ ...b, batStrikeRate: b.batStrikeRate ?? 0 }))}
            bowlers={bowlers.map((b) => ({ ...b, bowlOvs: b.bowlOvs }))}
            fow={fow}
            extras={extras}
            totalRuns={btd.inningsScore?.runs}
            totalWickets={btd.inningsScore?.wickets}
            totalOvers={btd.inningsScore?.overs}
          />
        );
      })}

      {innings.length === 0 && (
        <p className="text-center py-8 text-sm" style={{ color: "#6B86A0" }}>Scorecard not available yet.</p>
      )}

      {/* Match info */}
      {mi && (mi.venueInfo || mi.playersOfTheMatch?.length) && (
        <div className="rounded-xl p-4 space-y-2 text-sm" style={{ background: "#061624", border: "1px solid #0E2235" }}>
          {mi.venueInfo && (
            <div className="flex gap-2">
              <span style={{ color: "#6B86A0" }}>Venue:</span>
              <span style={{ color: "#E8E4DC" }}>{mi.venueInfo.ground}, {mi.venueInfo.city}</span>
            </div>
          )}
          {mi.playersOfTheMatch?.[0] && (
            <div className="flex gap-2">
              <span style={{ color: "#6B86A0" }}>POTM:</span>
              <span style={{ color: "#D4AF37" }}>{mi.playersOfTheMatch[0].fullName}</span>
            </div>
          )}
        </div>
      )}

      {/* Fantasy CTA */}
      <IplFantasyCard
        matchDesc={mi?.matchDesc}
        team1={mi?.team1.teamSName}
        team2={mi?.team2.teamSName}
      />
    </div>
  );
}
