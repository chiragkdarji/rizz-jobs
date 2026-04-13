import type { Metadata } from "next";
import IplScorecard from "@/components/ipl/IplScorecard";
import IplTeamBadge from "@/components/ipl/IplTeamBadge";
import { IPL_TEAMS } from "@/lib/cricbuzz";
import Link from "next/link";

export const revalidate = 30; // live match: refresh every 30s on next request

/** Normalise the raw Cricbuzz /scard response into a flat innings array.
 *
 * Confirmed API structure (from /api/ipl/debug/[matchId]):
 *   { scorecard: [ { inningsid, batteamname, score, wickets, overs,
 *       batsman: [{id,name,runs,balls,fours,sixes,strkrate,outdec,iscaptain,iskeeper}],
 *       bowler:  [{id,name,overs,maidens,runs,wickets,economy,noballs,wides}],
 *       fow:     { fow: [{batsmanid,batsmanname,overnbr,runs,ballnbr}] },
 *       extras:  {byes,legbyes,wides,noballs,penalty,total},
 *       pp:      { pp: [{pptype,overs,runs}] },
 *       partnership: { partnership: [{bat1id,bat1name,bat1runs,bat1balls,bat2id,bat2name,bat2runs,bat2balls,totalruns,totalballs}] }
 *   } ] }
 *
 * Also handles the camelCase nested format used by some API versions. */
function normalizeScard(scard: unknown) {
  if (!scard || typeof scard !== "object") return [];
  const raw = scard as Record<string, unknown>;

  // Top-level innings array — lowercase 'scorecard' confirmed, also try camelCase variants
  const arr = raw.scorecard ?? raw.scoreCard ?? raw.innings;
  if (!Array.isArray(arr) || arr.length === 0) return [];

  return arr.map((item: unknown) => {
    const i = item as Record<string, unknown>;

    // ── Batsmen ──────────────────────────────────────────────────────────────
    // Flat array (confirmed): i.batsman
    // Fallback nested (old format): batTeamDetails.batsmenData object
    const batTeam = (i.batTeamDetails ?? {}) as Record<string, unknown>;
    const batsmenRaw = i.batsman ?? batTeam.batsmenData ?? batTeam.batsmen ?? i.batsmenData ?? i.batsmen;
    const batsmenArr: unknown[] = Array.isArray(batsmenRaw)
      ? batsmenRaw
      : batsmenRaw && typeof batsmenRaw === "object"
      ? Object.values(batsmenRaw as Record<string, unknown>)
      : [];

    const batsman = batsmenArr
      .filter((b) => b && typeof b === "object")
      .map((b) => {
        const bat = b as Record<string, unknown>;
        return {
          id: Number(bat.id ?? bat.batId ?? 0),
          name: String(bat.name ?? bat.batName ?? ""),
          runs: Number(bat.runs ?? bat.batRuns ?? 0),
          balls: Number(bat.balls ?? bat.batBalls ?? 0),
          fours: Number(bat.fours ?? bat.batFours ?? 0),
          sixes: Number(bat.sixes ?? bat.batSixes ?? 0),
          strkrate: String(bat.strkrate ?? bat.batStrikeRate ?? "0.00"),
          outdec: (bat.outdec ?? bat.outDesc) as string | undefined,
          iscaptain: Boolean(bat.iscaptain ?? bat.isCaptain),
          iskeeper: Boolean(bat.iskeeper ?? bat.isKeeper),
        };
      });

    // ── Bowlers ──────────────────────────────────────────────────────────────
    const bowlTeam = (i.bowlTeamDetails ?? {}) as Record<string, unknown>;
    const bowlersRaw = i.bowler ?? bowlTeam.bowlersData ?? bowlTeam.bowlers ?? i.bowlersData ?? i.bowlers;
    const bowlersArr: unknown[] = Array.isArray(bowlersRaw)
      ? bowlersRaw
      : bowlersRaw && typeof bowlersRaw === "object"
      ? Object.values(bowlersRaw as Record<string, unknown>)
      : [];

    const bowler = bowlersArr
      .filter((b) => b && typeof b === "object")
      .map((b) => {
        const bowl = b as Record<string, unknown>;
        return {
          id: Number(bowl.id ?? bowl.bowlId ?? 0),
          name: String(bowl.name ?? bowl.bowlName ?? ""),
          ovs: String(bowl.overs ?? bowl.ovs ?? bowl.bowlOvs ?? "0"),
          maidens: Number(bowl.maidens ?? bowl.bowlMaidens ?? 0),
          runs: Number(bowl.runs ?? bowl.bowlRuns ?? 0),
          wkts: Number(bowl.wickets ?? bowl.wkts ?? bowl.bowlWkts ?? 0),
          noballs: Number(bowl.noballs ?? bowl.bowlNoballs ?? 0),
          wides: Number(bowl.wides ?? bowl.bowlWides ?? 0),
          economy: String(bowl.economy ?? bowl.bowlEcon ?? "0.00"),
        };
      });

    // ── Fall of Wickets ───────────────────────────────────────────────────────
    // Confirmed: i.fow = { fow: [{batsmanid,batsmanname,overnbr,runs,ballnbr}] }
    // Fallback: i.wicketsData = { wkt_1: {...} }
    const fowWrapper = i.fow as Record<string, unknown> | undefined;
    const fowRaw = (fowWrapper?.fow ?? i.wicketsData ?? batTeam.wicketsData ?? []) as unknown;
    const fowArr: unknown[] = Array.isArray(fowRaw)
      ? fowRaw
      : fowRaw && typeof fowRaw === "object"
      ? Object.values(fowRaw as Record<string, unknown>)
      : [];

    const fow = fowArr
      .filter((w) => w && typeof w === "object")
      .map((w) => {
        const wkt = w as Record<string, unknown>;
        return {
          batid: Number(wkt.batsmanid ?? wkt.batId ?? wkt.batid ?? 0),
          batname: String(wkt.batsmanname ?? wkt.batName ?? wkt.batname ?? ""),
          fowscore: Number(wkt.runs ?? wkt.wktScore ?? wkt.fowscore ?? 0),
          fowballs: Number(wkt.ballnbr ?? wkt.wktBalls ?? wkt.fowballs ?? 0),
          wktnbr: Number(wkt.wktnbr ?? wkt.wktNbr ?? 0),
        };
      })
      .filter((w) => w.batname);

    // ── Yet to Bat ───────────────────────────────────────────────────────────
    // Confirmed field name not yet seen — try common variants
    const ytbRaw = i.yettobat ?? i.yetToBat ?? i.batsmenYetToBat ?? batTeam.batsmenYetToBat ?? [];
    const ytbArr: unknown[] = Array.isArray(ytbRaw)
      ? ytbRaw
      : ytbRaw && typeof ytbRaw === "object"
      ? Object.values(ytbRaw as Record<string, unknown>)
      : [];
    const yetToBat = ytbArr
      .filter((p) => p && typeof p === "object")
      .map((p) => {
        const pl = p as Record<string, unknown>;
        return { id: Number(pl.id ?? 0), name: String(pl.name ?? pl.batName ?? "") };
      })
      .filter((p) => p.name);

    // ── Powerplays ───────────────────────────────────────────────────────────
    // Confirmed: i.pp = { pp: [{pptype, overs, runs}] }
    const ppWrapper = i.pp as Record<string, unknown> | undefined;
    const ppRaw = ppWrapper?.pp ?? i.powerPlayData ?? i.powerPlay ?? batTeam.powerPlayData ?? [];
    const ppArr: unknown[] = Array.isArray(ppRaw)
      ? ppRaw
      : ppRaw && typeof ppRaw === "object"
      ? Object.values(ppRaw as Record<string, unknown>)
      : [];
    const powerplays = ppArr
      .filter((p) => p && typeof p === "object")
      .map((p) => {
        const pp = p as Record<string, unknown>;
        return {
          ppType: String(pp.pptype ?? pp.ppType ?? pp.powerPlayType ?? pp.type ?? "Mandatory"),
          from: String(pp.overs?.toString().split("-")[0] ?? pp.fromOver ?? pp.from ?? ""),
          to: String(pp.overs?.toString().split("-")[1] ?? pp.toOver ?? pp.to ?? ""),
          runs: Number(pp.runs ?? 0),
          wickets: Number(pp.wickets ?? pp.wkts ?? 0),
        };
      })
      .filter((p) => p.ppType);

    // ── Partnerships ─────────────────────────────────────────────────────────
    // Confirmed: i.partnership = { partnership: [{bat1name,bat1runs,bat1balls,bat2name,bat2runs,bat2balls,totalruns,totalballs}] }
    const partWrapper = i.partnership as Record<string, unknown> | undefined;
    const partRaw = partWrapper?.partnership ?? i.partnerShipData ?? i.partnershipData ?? i.partnerships ?? [];
    const partArr: unknown[] = Array.isArray(partRaw)
      ? partRaw
      : partRaw && typeof partRaw === "object"
      ? Object.values(partRaw as Record<string, unknown>)
      : [];
    const partnerships = partArr
      .filter((p) => p && typeof p === "object")
      .map((p) => {
        const pt = p as Record<string, unknown>;
        return {
          bat1Name: String(pt.bat1name ?? pt.bat1Name ?? ""),
          bat1Runs: Number(pt.bat1runs ?? pt.bat1Runs ?? 0),
          bat1Balls: Number(pt.bat1balls ?? pt.bat1Balls ?? 0),
          bat2Name: String(pt.bat2name ?? pt.bat2Name ?? ""),
          bat2Runs: Number(pt.bat2runs ?? pt.bat2Runs ?? 0),
          bat2Balls: Number(pt.bat2balls ?? pt.bat2Balls ?? 0),
          totalRuns: Number(pt.totalruns ?? pt.totalRuns ?? 0),
          totalBalls: Number(pt.totalballs ?? pt.totalBalls ?? 0),
          wktNbr: Number(pt.wktnbr ?? pt.wktNbr ?? 0),
        };
      })
      .filter((p) => p.bat1Name || p.bat2Name);

    // ── Extras ───────────────────────────────────────────────────────────────
    // Confirmed: i.extras = {byes,legbyes,wides,noballs,penalty,total}
    const extRaw = (i.extras ?? i.extrasData ?? batTeam.extrasData ?? null) as Record<string, unknown> | null;

    // ── Score ─────────────────────────────────────────────────────────────────
    // Confirmed: score/wickets/overs directly on innings (not nested under scoreDetails)
    const scoreDetails = (i.scoreDetails ?? {}) as Record<string, unknown>;

    return {
      inningsid: Number(i.inningsid ?? i.inningsId ?? 0),
      batteamname: String(i.batteamname ?? batTeam.batTeamName ?? ""),
      score: (i.score ?? scoreDetails.runs) != null ? Number(i.score ?? scoreDetails.runs) : undefined,
      wickets: (i.wickets ?? scoreDetails.wickets) != null ? Number(i.wickets ?? scoreDetails.wickets) : undefined,
      overs: (i.overs ?? scoreDetails.overs) != null ? Number(i.overs ?? scoreDetails.overs) : undefined,
      batsman,
      bowler,
      fow,
      yetToBat,
      powerplays,
      partnerships,
      extras: extRaw
        ? {
            total: Number(extRaw.total ?? extRaw.extras ?? 0),
            byes: extRaw.byes as number | undefined,
            legbyes: (extRaw.legbyes ?? extRaw.legByes) as number | undefined,
            wides: extRaw.wides as number | undefined,
            noballs: (extRaw.noballs ?? extRaw.noBalls) as number | undefined,
          }
        : undefined,
    };
  });
}

function normalizeMatchHeader(scard: unknown) {
  if (!scard || typeof scard !== "object") return null;
  const raw = scard as Record<string, unknown>;
  const mh = (raw.matchHeader ?? raw.matchheader) as Record<string, unknown> | undefined;
  if (!mh) return null;
  const getName = (v: unknown) => {
    if (!v) return "";
    if (typeof v === "string") return v;
    return String((v as Record<string, unknown>).name ?? "");
  };
  return {
    umpire1: getName(mh.umpire1),
    umpire2: getName(mh.umpire2),
    thirdUmpire: getName(mh.thirdUmpire ?? mh.umpire3),
    referee: getName(mh.matchReferee ?? mh.referee),
  };
}

function normalizeSquads(info: unknown) {
  if (!info || typeof info !== "object") return [];
  const raw = info as Record<string, unknown>;
  const teams = (raw.teams ?? raw.teamInfo ?? []) as unknown[];
  if (!Array.isArray(teams)) return [];
  return teams.slice(0, 2).map((t: unknown) => {
    const team = t as Record<string, unknown>;
    const p11Raw = team.playing11 ?? team.playingXI ?? {};
    const p11Arr = Array.isArray(p11Raw) ? p11Raw : Object.values(p11Raw as Record<string, unknown>);
    const playing11 = (p11Arr as unknown[])
      .filter(Boolean)
      .map((p: unknown) => {
        const pl = p as Record<string, unknown>;
        return {
          id: Number(pl.id ?? 0),
          name: String(pl.name ?? pl.fullName ?? ""),
          isCaptain: Boolean(pl.isCaptain),
          isKeeper: Boolean(pl.isKeeper ?? pl.isWk),
        };
      })
      .filter((p) => p.name);
    return { teamName: String(team.teamName ?? team.name ?? ""), playing11 };
  }).filter((t) => t.playing11.length > 0);
}

interface Props {
  params: Promise<{ matchId: string }>;
}

function teamColors(sName: string) {
  if (!sName) return { bg: "#1A1A26", color: "#F0EDE8" };
  const t = Object.values(IPL_TEAMS).find(
    (t) => t.fullName.includes(sName) || t.id.toString() === sName
  );
  return t ? { bg: t.bg, color: t.color } : { bg: "#1A1A26", color: "#F0EDE8" };
}

/** Cricbuzz sometimes returns status as "X-X" (same string duplicated with a hyphen).
 *  Strip the duplicate half if detected. */
function dedupeStatus(s: string): string {
  if (!s) return s;
  const mid = s.indexOf("-");
  if (mid > 0 && s.slice(0, mid) === s.slice(mid + 1)) return s.slice(0, mid);
  return s;
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
    status: dedupeStatus(String(flat.status ?? flat.matchStatus ?? "")),
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

  let rawData: { scorecard?: unknown; info?: unknown; rawScard?: unknown } | null = null;

  try {
    const res = await fetch(`${base}/api/ipl/match/${matchId}`, { next: { revalidate: 60 } });
    if (res.ok) rawData = await res.json();
  } catch {/* silently handle */}

  const info = rawData?.info ? normalizeInfo(rawData.info) : null;
  const matchHeader = normalizeMatchHeader(rawData?.scorecard);
  const squads = normalizeSquads(rawData?.info);

  const innings = normalizeScard(rawData?.scorecard);

  const isLive = info?.state === "In Progress";
  const status = info?.status;

  const t1c = info?.team1 ? teamColors(info.team1.teamname) : { bg: "#1A1A26", color: "#F0EDE8" };
  const t2c = info?.team2 ? teamColors(info.team2.teamname) : { bg: "#1A1A26", color: "#F0EDE8" };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Match header */}
      {info && (
        <div className="rounded-xl p-6 text-center" style={{ background: "#12121A", border: "1px solid #2A2A3A" }}>
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
            <span style={{ color: "#5A566A" }}>vs</span>
            {info.team2 && (
              <IplTeamBadge shortName={info.team2.teamsname} bg={t2c.bg} color={t2c.color} size="lg" />
            )}
          </div>
          <p className="mt-2 text-sm" style={{ color: "#5A566A" }}>
            {info.matchdesc}
            {info.venueinfo?.city && ` · ${info.venueinfo.city}`}
          </p>
          {status && (
            <p className="mt-2 text-sm font-semibold" style={{ color: isLive ? "#FF5A1F" : "#22C55E" }}>{status}</p>
          )}
          {typeof info.tossstatus === "string" && info.tossstatus && info.tossstatus !== status && (
            <p className="mt-1 text-xs" style={{ color: "#5A566A" }}>Toss: {info.tossstatus}</p>
          )}
        </div>
      )}

      {!info && (
        <div className="rounded-xl p-6 text-center" style={{ background: "#12121A", border: "1px solid #2A2A3A" }}>
          <p className="text-sm" style={{ color: "#5A566A" }}>Match data not available.</p>
          <Link href="/ipl/schedule" className="inline-block mt-4 text-sm font-semibold" style={{ color: "#9A96A0" }}>
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
            style={{ background: "#2A2A3A", color: "#FFB800", border: "1px solid #FFB80044", fontFamily: "var(--font-ipl-display, sans-serif)" }}
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
            yetToBat={inn.yetToBat}
            powerplays={inn.powerplays}
            partnerships={inn.partnerships}
          />
        );
      })}

      {innings.length === 0 && info && (
        <p className="text-center py-8 text-sm" style={{ color: "#5A566A" }}>Scorecard not available yet.</p>
      )}

      {/* Match Officials */}
      {matchHeader && (matchHeader.umpire1 || matchHeader.umpire2 || matchHeader.thirdUmpire || matchHeader.referee) && (
        <div className="rounded-xl p-4 text-sm" style={{ background: "#12121A", border: "1px solid #2A2A3A" }}>
          <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "#5A566A" }}>Match Officials</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {matchHeader.umpire1 && (
              <div><span style={{ color: "#5A566A" }}>Umpire 1: </span><span style={{ color: "#F0EDE8" }}>{matchHeader.umpire1}</span></div>
            )}
            {matchHeader.umpire2 && (
              <div><span style={{ color: "#5A566A" }}>Umpire 2: </span><span style={{ color: "#F0EDE8" }}>{matchHeader.umpire2}</span></div>
            )}
            {matchHeader.thirdUmpire && (
              <div><span style={{ color: "#5A566A" }}>3rd Umpire: </span><span style={{ color: "#F0EDE8" }}>{matchHeader.thirdUmpire}</span></div>
            )}
            {matchHeader.referee && (
              <div><span style={{ color: "#5A566A" }}>Referee: </span><span style={{ color: "#F0EDE8" }}>{matchHeader.referee}</span></div>
            )}
          </div>
        </div>
      )}

      {/* Squads */}
      {squads.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {squads.map((squad) => (
            <div key={squad.teamName} className="rounded-xl p-4" style={{ background: "#12121A", border: "1px solid #2A2A3A" }}>
              <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "#5A566A" }}>
                {squad.teamName} — Playing XI
              </p>
              <div className="flex flex-wrap gap-2">
                {squad.playing11.map((pl) => (
                  <span key={pl.id} className="text-xs px-2 py-1 rounded" style={{ background: "#2A2A3A", color: "#F0EDE8" }}>
                    {pl.name}{pl.isCaptain ? " (c)" : ""}{pl.isKeeper ? " †" : ""}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Match info */}
      {info?.venueinfo && (
        <div className="rounded-xl p-4 space-y-2 text-sm" style={{ background: "#12121A", border: "1px solid #2A2A3A" }}>
          <div className="flex gap-2">
            <span style={{ color: "#5A566A" }}>Venue:</span>
            <span style={{ color: "#F0EDE8" }}>{info.venueinfo.ground}{info.venueinfo.city ? `, ${info.venueinfo.city}` : ""}</span>
          </div>
        </div>
      )}
    </div>
  );
}
