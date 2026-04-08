import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders, IPL_SERIES_ID, IPL_TEAMS } from "@/lib/cricbuzz";

const REVALIDATE = 60; // 1 min — updates fast after a match ends
export const revalidate = 60;

interface MatchInfoRaw {
  matchId: number;
  team1: { teamId: number; teamSName: string; teamName: string };
  team2: { teamId: number; teamSName: string; teamName: string };
  startDate: string;
  state: string;
  status?: string;
  matchDesc: string;
  venueInfo?: { ground: string; city: string };
}

interface InningsRaw {
  runs?: number;
  wickets?: number;
  overs?: number; // Cricbuzz: X.Y where Y = balls (0–5), not decimals
}

interface MatchWithScore {
  matchInfo: MatchInfoRaw;
  matchScore?: {
    team1Score?: { inngs1?: InningsRaw };
    team2Score?: { inngs1?: InningsRaw };
  };
}

/** Convert Cricbuzz overs format to decimal.
 *  19.3 means 19 overs + 3 balls = 19.5 decimal overs */
function oversToDecimal(ov: number | undefined): number {
  if (!ov) return 0;
  const complete = Math.floor(ov);
  const balls = Math.round((ov - complete) * 10);
  return complete + balls / 6;
}

/** Compute points table + NRR + Last 5 from completed match results.
 *  Accepts a merged map of matchId → matchScore for NRR computation. */
function computePointsTable(
  matches: MatchWithScore[],
  scoreMap: Map<number, MatchWithScore["matchScore"]>
) {
  type NrrAccum = { runsFor: number; oversFor: number; runsAgainst: number; oversAgainst: number };
  type TeamRecord = {
    teamId: number; teamSName: string;
    played: number; won: number; lost: number; nr: number; points: number;
    nrr: NrrAccum;
    history: { date: number; result: "W" | "L" | "NR" }[];
  };

  const table: Record<number, TeamRecord> = {};
  const getOrCreate = (id: number, sName: string): TeamRecord => {
    if (!table[id]) table[id] = {
      teamId: id, teamSName: sName,
      played: 0, won: 0, lost: 0, nr: 0, points: 0,
      nrr: { runsFor: 0, oversFor: 0, runsAgainst: 0, oversAgainst: 0 },
      history: [],
    };
    return table[id];
  };

  const completed = matches
    .filter((m) => m.matchInfo?.state === "Complete")
    .sort((a, b) => parseInt(a.matchInfo.startDate) - parseInt(b.matchInfo.startDate));

  for (const m of completed) {
    const mi = m.matchInfo;
    const t1 = getOrCreate(mi.team1.teamId, mi.team1.teamSName);
    const t2 = getOrCreate(mi.team2.teamId, mi.team2.teamSName);
    t1.played++; t2.played++;

    const status = mi.status ?? "";
    const date = parseInt(mi.startDate);
    const isNoResult = status.toLowerCase().includes("no result") || status.toLowerCase().includes("abandoned");

    if (isNoResult) {
      t1.nr++; t2.nr++; t1.points++; t2.points++;
      t1.history.push({ date, result: "NR" });
      t2.history.push({ date, result: "NR" });
    } else {
      const t1Short = mi.team1.teamSName.toLowerCase();
      const t2Short = mi.team2.teamSName.toLowerCase();
      const t1Name = Object.values(IPL_TEAMS).find(t => t.id === mi.team1.teamId)?.fullName ?? "";
      const t2Name = Object.values(IPL_TEAMS).find(t => t.id === mi.team2.teamId)?.fullName ?? "";
      const statusLower = status.toLowerCase();
      const t1Won = statusLower.includes(t1Short + " won") ||
        (t1Name && statusLower.includes(t1Name.toLowerCase().split(" ").pop()! + " won"));
      const t2Won = statusLower.includes(t2Short + " won") ||
        (t2Name && statusLower.includes(t2Name.toLowerCase().split(" ").pop()! + " won"));

      if (t1Won) {
        t1.won++; t2.lost++; t1.points += 2;
        t1.history.push({ date, result: "W" });
        t2.history.push({ date, result: "L" });
      } else if (t2Won) {
        t2.won++; t1.lost++; t2.points += 2;
        t2.history.push({ date, result: "W" });
        t1.history.push({ date, result: "L" });
      } else {
        t1.nr++; t2.nr++; t1.points++; t2.points++;
        t1.history.push({ date, result: "NR" });
        t2.history.push({ date, result: "NR" });
      }

      // NRR: accumulate runs/overs from matchScore
      const score = scoreMap.get(mi.matchId) ?? m.matchScore;
      const inn1 = score?.team1Score?.inngs1;
      const inn2 = score?.team2Score?.inngs1;
      if (inn1?.runs != null && inn2?.runs != null) {
        const MAX_OV = 20;
        // team1 innings
        const ov1 = inn1.wickets === 10 ? MAX_OV : oversToDecimal(inn1.overs) || MAX_OV;
        // team2 innings
        const ov2 = inn2.wickets === 10 ? MAX_OV : oversToDecimal(inn2.overs) || MAX_OV;

        t1.nrr.runsFor += inn1.runs; t1.nrr.oversFor += ov1;
        t1.nrr.runsAgainst += inn2.runs; t1.nrr.oversAgainst += ov2;
        t2.nrr.runsFor += inn2.runs; t2.nrr.oversFor += ov2;
        t2.nrr.runsAgainst += inn1.runs; t2.nrr.oversAgainst += ov1;
      }
    }
  }

  return Object.values(table)
    .sort((a, b) => b.points - a.points || b.won - a.won)
    .map(({ history, nrr, ...rest }) => {
      const nrrVal = nrr.oversFor > 0 && nrr.oversAgainst > 0
        ? (nrr.runsFor / nrr.oversFor) - (nrr.runsAgainst / nrr.oversAgainst)
        : null;
      return {
        ...rest,
        nrr: nrrVal != null ? (nrrVal >= 0 ? "+" : "") + nrrVal.toFixed(3) : null,
        lastFive: history.slice(-5).map((h) => h.result),
      };
    });
}

export async function GET() {
  try {
    const [seriesRes, upcomingRes, recentRes] = await Promise.all([
      fetch(`${CB_BASE}/series/v1/${IPL_SERIES_ID}`, {
        headers: cbHeaders(),
        next: { revalidate: REVALIDATE },
      }),
      fetch(`${CB_BASE}/matches/v1/upcoming`, {
        headers: cbHeaders(),
        next: { revalidate: REVALIDATE },
      }),
      fetch(`${CB_BASE}/matches/v1/recent`, {
        headers: cbHeaders(),
        next: { revalidate: REVALIDATE },
      }),
    ]);

    const [series, upcomingRaw, recentRaw] = await Promise.all([
      seriesRes.ok ? seriesRes.json() : null,
      upcomingRes.ok ? upcomingRes.json() : null,
      recentRes.ok ? recentRes.json() : null,
    ]);

    // Flatten all matches from series (may include matchScore inline)
    const allMatches: MatchWithScore[] = [];
    for (const entry of series?.matchDetails ?? []) {
      for (const m of entry.matchDetailsMap?.match ?? []) {
        if (m.matchInfo) allMatches.push(m as MatchWithScore);
      }
    }

    // Filter upcoming/recent for IPL
    const filterIpl = (data: unknown): MatchWithScore[] => {
      const d = data as { typeMatches?: { matchType: string; seriesMatches?: { seriesAdWrapper?: { seriesId: number; matches?: unknown[] } }[] }[] };
      const result: MatchWithScore[] = [];
      for (const tm of d?.typeMatches ?? []) {
        if (tm.matchType !== "League") continue;
        for (const sm of tm.seriesMatches ?? []) {
          if (!sm.seriesAdWrapper) continue;
          if (sm.seriesAdWrapper.seriesId !== IPL_SERIES_ID) continue;
          result.push(...(sm.seriesAdWrapper.matches ?? []) as MatchWithScore[]);
        }
      }
      return result;
    };

    const recentMatches = filterIpl(recentRaw ?? {});

    // Build scoreMap: matchId → matchScore, prefer recent (fresher) over series data
    const scoreMap = new Map<number, MatchWithScore["matchScore"]>();
    for (const m of allMatches) {
      if (m.matchScore && m.matchInfo?.matchId) scoreMap.set(m.matchInfo.matchId, m.matchScore);
    }
    // Recent endpoint overrides — it has the final settled scores
    for (const m of recentMatches) {
      if (m.matchScore && m.matchInfo?.matchId) scoreMap.set(m.matchInfo.matchId, m.matchScore);
    }

    const pointsTable = computePointsTable(allMatches, scoreMap);

    return NextResponse.json(
      {
        schedule: allMatches,
        pointsTable,
        upcoming: filterIpl(upcomingRaw ?? {}),
        recent: recentMatches,
      },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${REVALIDATE}, stale-while-revalidate=${REVALIDATE / 2}`,
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
