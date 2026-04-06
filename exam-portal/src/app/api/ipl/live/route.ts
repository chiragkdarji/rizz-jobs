import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders, IPL_SERIES_ID } from "@/lib/cricbuzz";

const REVALIDATE = 120; // 2 min

export const revalidate = 120;

export async function GET() {
  try {
    const res = await fetch(`${CB_BASE}/matches/live`, {
      headers: cbHeaders(),
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return NextResponse.json({ error: "Upstream error" }, { status: 502 });

    const data = await res.json();

    // Filter for IPL matches only (League type + matching seriesId)
    const iplMatches: unknown[] = [];
    for (const typeMatch of data?.typeMatches ?? []) {
      if (typeMatch.matchType !== "League") continue;
      for (const seriesMatch of typeMatch.seriesMatches ?? []) {
        if (!seriesMatch.seriesAdWrapper) continue; // skip ads
        const wrapper = seriesMatch.seriesAdWrapper;
        if (wrapper.seriesId !== IPL_SERIES_ID) continue;
        iplMatches.push(...(wrapper.matches ?? []));
      }
    }

    // For each live match, also fetch leanback data (batsmen/bowler/last balls)
    const enriched = await Promise.all(
      iplMatches.map(async (m: unknown) => {
        const match = m as { matchInfo?: { matchId?: number; state?: string } };
        if (match?.matchInfo?.state !== "In Progress") return m;
        try {
          const lb = await fetch(
            `${CB_BASE}/matches/get-leanback?matchId=${match.matchInfo.matchId}`,
            { headers: cbHeaders(), next: { revalidate: REVALIDATE } }
          );
          const lbData = lb.ok ? await lb.json() : null;
          return { ...match, leanback: lbData };
        } catch {
          return m;
        }
      })
    );

    return NextResponse.json(
      { matches: enriched },
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
