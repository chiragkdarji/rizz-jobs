import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders, IPL_SERIES_ID, IPL_TEAMS } from "@/lib/cricbuzz";

const REVALIDATE = 1800;
export const revalidate = 1800;

/** Compute points table from completed match results */
function computePointsTable(matches: { matchInfo: { team1: { teamId: number; teamSName: string }; team2: { teamId: number; teamSName: string }; state: string; status?: string; result?: { winningTeam?: string; resultType?: string } } }[]) {
  const table: Record<number, { teamId: number; teamSName: string; played: number; won: number; lost: number; nr: number; points: number }> = {};

  const getOrCreate = (id: number, sName: string) => {
    if (!table[id]) table[id] = { teamId: id, teamSName: sName, played: 0, won: 0, lost: 0, nr: 0, points: 0 };
    return table[id];
  };

  for (const m of matches) {
    const mi = m.matchInfo;
    if (mi.state !== "Complete") continue;
    const t1 = getOrCreate(mi.team1.teamId, mi.team1.teamSName);
    const t2 = getOrCreate(mi.team2.teamId, mi.team2.teamSName);
    t1.played++;
    t2.played++;

    const status = mi.status ?? "";
    const isNoResult = status.toLowerCase().includes("no result") || status.toLowerCase().includes("abandoned");

    if (isNoResult) {
      t1.nr++;
      t2.nr++;
      t1.points++;
      t2.points++;
    } else {
      // Parse winner from status: "RCB won by 6 wkts" or "SRH won by 20 runs"
      const t1Short = mi.team1.teamSName.toLowerCase();
      const t2Short = mi.team2.teamSName.toLowerCase();
      const t1Name = Object.values(IPL_TEAMS).find(t => t.id === mi.team1.teamId)?.fullName ?? "";
      const t2Name = Object.values(IPL_TEAMS).find(t => t.id === mi.team2.teamId)?.fullName ?? "";

      const statusLower = status.toLowerCase();
      const t1Won = statusLower.includes(t1Short + " won") || statusLower.includes(t1Name.toLowerCase().split(" ").pop()! + " won");
      const t2Won = statusLower.includes(t2Short + " won") || statusLower.includes(t2Name.toLowerCase().split(" ").pop()! + " won");

      if (t1Won) { t1.won++; t2.lost++; t1.points += 2; }
      else if (t2Won) { t2.won++; t1.lost++; t2.points += 2; }
      else { t1.nr++; t2.nr++; t1.points++; t2.points++; }
    }
  }

  return Object.values(table).sort((a, b) => b.points - a.points || b.won - a.won);
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

    // Flatten all matches from series
    const allMatches: { matchInfo: { matchId: number; team1: { teamId: number; teamSName: string; teamName: string }; team2: { teamId: number; teamSName: string; teamName: string }; startDate: string; state: string; status?: string; matchDesc: string; venueInfo?: { ground: string; city: string } } }[] = [];
    for (const entry of series?.matchDetails ?? []) {
      for (const m of entry.matchDetailsMap?.match ?? []) {
        if (m.matchInfo) allMatches.push(m);
      }
    }

    // Filter upcoming/recent for IPL
    const filterIpl = (data: unknown) => {
      const d = data as { typeMatches?: { matchType: string; seriesMatches?: { seriesAdWrapper?: { seriesId: number; matches?: unknown[] } }[] }[] };
      const result: unknown[] = [];
      for (const tm of d?.typeMatches ?? []) {
        if (tm.matchType !== "League") continue;
        for (const sm of tm.seriesMatches ?? []) {
          if (!sm.seriesAdWrapper) continue;
          if (sm.seriesAdWrapper.seriesId !== IPL_SERIES_ID) continue;
          result.push(...(sm.seriesAdWrapper.matches ?? []));
        }
      }
      return result;
    };

    const pointsTable = computePointsTable(allMatches);

    return NextResponse.json(
      {
        schedule: allMatches,
        pointsTable,
        upcoming: filterIpl(upcomingRaw ?? {}),
        recent: filterIpl(recentRaw ?? {}),
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
