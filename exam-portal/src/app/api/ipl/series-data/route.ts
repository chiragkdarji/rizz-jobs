import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders, IPL_SERIES_ID } from "@/lib/cricbuzz";

const REVALIDATE = 1800; // 30 min

export const revalidate = 1800;

export async function GET() {
  try {
    const [matchesRes, pointsRes, upcomingRes, recentRes] = await Promise.all([
      fetch(`${CB_BASE}/series/get-matches?seriesId=${IPL_SERIES_ID}`, {
        headers: cbHeaders(),
        next: { revalidate: REVALIDATE },
      }),
      fetch(`${CB_BASE}/series/get-points-table?seriesId=${IPL_SERIES_ID}`, {
        headers: cbHeaders(),
        next: { revalidate: REVALIDATE },
      }),
      fetch(`${CB_BASE}/matches/upcoming`, {
        headers: cbHeaders(),
        next: { revalidate: REVALIDATE },
      }),
      fetch(`${CB_BASE}/matches/recent`, {
        headers: cbHeaders(),
        next: { revalidate: REVALIDATE },
      }),
    ]);

    const [matches, points, upcomingRaw, recentRaw] = await Promise.all([
      matchesRes.ok ? matchesRes.json() : null,
      pointsRes.ok ? pointsRes.json() : null,
      upcomingRes.ok ? upcomingRes.json() : null,
      recentRes.ok ? recentRes.json() : null,
    ]);

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

    return NextResponse.json(
      {
        schedule: matches,
        pointsTable: points,
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
