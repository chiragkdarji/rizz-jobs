import type { Metadata } from "next";
import IplScorecard from "@/components/ipl/IplScorecard";
import IplTeamBadge from "@/components/ipl/IplTeamBadge";
import { IPL_TEAMS } from "@/lib/cricbuzz";
import Link from "next/link";

export const revalidate = 30; // live match: refresh every 30s on next request

/** Normalise the raw Cricbuzz /scard response into a flat innings array.
 *  Cricbuzz returns { scoreCard: [ { inningsId, batTeamDetails: { batsmenData: { bat_1: {...} } },
 *  bowlTeamDetails: { bowlersData: { bowl_1: {...} } }, scoreDetails, extrasData, wicketsData } ] }
 *  which is completely different from the simple array the page originally expected. */
function normalizeScard(scard: unknown) {
  if (!scard || typeof scard !== "object") return [];
  const raw = scard as Record<string, unknown>;

  // key may be scoreCard (capital C) or scorecard or innings
  const arr = raw.scoreCard ?? raw.scorecard ?? raw.innings;
  if (!Array.isArray(arr) || arr.length === 0) return [];

  return arr.map((item: unknown) => {
    const i = item as Record<string, unknown>;
    const batTeam = (i.batTeamDetails ?? {}) as Record<string, unknown>;
    const bowlTeam = (i.bowlTeamDetails ?? {}) as Record<string, unknown>;
    const scoreDetails = (i.scoreDetails ?? {}) as Record<string, unknown>;
    const extrasData = (i.extrasData ?? null) as Record<string, unknown> | null;
    const wicketsData = (i.wicketsData ?? {}) as Record<string, unknown>;

    // batsmenData is an object { bat_1: {...}, bat_2: {...}, ... } — convert to array
    const batsmenObj = (batTeam.batsmenData ?? batTeam.batsmen ?? {}) as Record<string, unknown>;
    const batsman = Object.values(batsmenObj)
      .filter((b) => b && typeof b === "object")
      .map((b) => {
        const bat = b as Record<string, unknown>;
        return {
          id: Number(bat.batId ?? bat.id ?? 0),
          name: String(bat.batName ?? bat.name ?? ""),
          runs: Number(bat.batRuns ?? bat.runs ?? 0),
          balls: Number(bat.batBalls ?? bat.balls ?? 0),
          fours: Number(bat.batFours ?? bat.fours ?? 0),
          sixes: Number(bat.batSixes ?? bat.sixes ?? 0),
          strkrate: String(bat.batStrikeRate ?? bat.strkrate ?? "0.00"),
          outdec: (bat.outDesc ?? bat.outdesc) as string | undefined,
          iscaptain: Boolean(bat.isCaptain ?? bat.iscaptain),
          iskeeper: Boolean(bat.isKeeper ?? bat.iskeeper),
        };
      });

    // bowlersData is an object { bowl_1: {...}, ... }
    const bowlersObj = (bowlTeam.bowlersData ?? bowlTeam.bowlers ?? {}) as Record<string, unknown>;
    const bowler = Object.values(bowlersObj)
      .filter((b) => b && typeof b === "object")
      .map((b) => {
        const bowl = b as Record<string, unknown>;
        return {
          id: Number(bowl.bowlId ?? bowl.id ?? 0),
          name: String(bowl.bowlName ?? bowl.name ?? ""),
          ovs: String(bowl.bowlOvs ?? bowl.ovs ?? "0"),
          maidens: Number(bowl.bowlMaidens ?? bowl.maidens ?? 0),
          runs: Number(bowl.bowlRuns ?? bowl.runs ?? 0),
          wkts: Number(bowl.bowlWkts ?? bowl.wkts ?? 0),
          noballs: Number(bowl.bowlNoballs ?? bowl.noballs ?? 0),
          wides: Number(bowl.bowlWides ?? bowl.wides ?? 0),
          economy: String(bowl.bowlEcon ?? bowl.economy ?? "0.00"),
        };
      });

    // wicketsData is an object { wkt_1: {...}, ... }
    const fow = Object.values(wicketsData)
      .filter((w) => w && typeof w === "object")
      .map((w) => {
        const wkt = w as Record<string, unknown>;
        return {
          batid: Number(wkt.batId ?? wkt.batid ?? 0),
          batname: String(wkt.batName ?? wkt.batname ?? ""),
          fowscore: Number(wkt.wktScore ?? wkt.fowscore ?? 0),
          fowballs: Number(wkt.wktBalls ?? wkt.fowballs ?? 0),
          wktnbr: Number(wkt.wktNbr ?? wkt.wktnbr ?? 0),
        };
      })
      .filter((w) => w.batname);

    return {
      inningsid: Number(i.inningsId ?? i.inningsid ?? 0),
      batteamname: String(batTeam.batTeamName ?? batTeam.batteamname ?? i.batteamname ?? ""),
      score: scoreDetails.runs != null ? Number(scoreDetails.runs) : (i.score as number | undefined),
      wickets: scoreDetails.wickets != null ? Number(scoreDetails.wickets) : (i.wickets as number | undefined),
      overs: scoreDetails.overs != null ? Number(scoreDetails.overs) : (i.overs as number | undefined),
      batsman,
      bowler,
      fow,
      extras: extrasData
        ? {
            total: Number(extrasData.extras ?? 0),
            byes: extrasData.byes as number | undefined,
            legbyes: (extrasData.legByes ?? extrasData.legbyes) as number | undefined,
            wides: extrasData.wides as number | undefined,
            noballs: (extrasData.noBalls ?? extrasData.noballs) as number | undefined,
          }
        : undefined,
    };
  });
}

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

  const innings = normalizeScard(rawData?.scorecard);

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
