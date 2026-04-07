import { NextResponse } from "next/server";
import { CB_BASE, cbFetchWithRetry, IPL_SERIES_ID } from "@/lib/cricbuzz";

// Cache this route for 30s on the Vercel edge.
// All concurrent users share one cached response — only 1 real Cricbuzz call per 30s
// regardless of how many users are polling simultaneously.
export const revalidate = 30;

const CACHE_TTL = 30;

export async function GET() {
  try {
    const res = await cbFetchWithRetry(`${CB_BASE}/matches/v1/live`, {
      cache: "no-store", // always fresh when the route runs (route itself is cached)
    });
    if (!res.ok) return NextResponse.json({ error: "Upstream error" }, { status: 502 });

    const data = await res.json();

    // Filter for IPL matches only
    const iplMatches: unknown[] = [];
    for (const typeMatch of data?.typeMatches ?? []) {
      if (typeMatch.matchType !== "League") continue;
      for (const seriesMatch of typeMatch.seriesMatches ?? []) {
        if (!seriesMatch.seriesAdWrapper) continue;
        const wrapper = seriesMatch.seriesAdWrapper;
        if (wrapper.seriesId !== IPL_SERIES_ID) continue;
        iplMatches.push(...(wrapper.matches ?? []));
      }
    }

    // Enrich with miniscore + recent commentary for live (In Progress) matches only
    const enriched = await Promise.all(
      iplMatches.map(async (m: unknown) => {
        const match = m as { matchInfo?: { matchId?: number; state?: string } };
        if (match?.matchInfo?.state !== "In Progress") return m;
        try {
          const lb = await cbFetchWithRetry(
            `${CB_BASE}/mcenter/v1/${match.matchInfo.matchId}/comm`,
            { cache: "no-store" }
          );
          const lbData = lb.ok ? await lb.json() : null;
          // comwrapper is newest-first; each item has .commentary (single object)
          // Filter out overnum:0 (over-break/non-ball events), take newest 8
          const comwrapper: { commentary?: { overnum?: number } }[] = lbData?.comwrapper ?? [];
          const commentary = comwrapper
            .map((w) => w.commentary)
            .filter((c): c is NonNullable<typeof c> => !!c && (c.overnum ?? 0) > 0)
            .slice(0, 8);
          return {
            ...match,
            leanback: lbData ? { miniscore: lbData.miniscore } : null,
            commentary,
          };
        } catch {
          return m;
        }
      })
    );

    return NextResponse.json(
      { matches: enriched },
      {
        headers: {
          // Edge CDN caches for 30s; stale-while-revalidate allows serving stale
          // for 15s while fetching fresh in background — zero visible latency to users
          "Cache-Control": `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL / 2}`,
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
