import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders, IPL_SERIES_ID } from "@/lib/cricbuzz";

export const revalidate = 0; // always fresh — client polls on its own schedule

export async function GET() {
  try {
    const res = await fetch(`${CB_BASE}/matches/v1/live`, {
      headers: cbHeaders(),
      cache: "no-store",
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

    // Enrich with miniscore from mcenter/comm for live matches
    const enriched = await Promise.all(
      iplMatches.map(async (m: unknown) => {
        const match = m as { matchInfo?: { matchId?: number; state?: string } };
        if (match?.matchInfo?.state !== "In Progress") return m;
        try {
          const lb = await fetch(
            `${CB_BASE}/mcenter/v1/${match.matchInfo.matchId}/comm`,
            { headers: cbHeaders(), cache: "no-store" }
          );
          const lbData = lb.ok ? await lb.json() : null;
          // Flatten commentary from comwrapper for inline display on the hub page
          const comwrapper: { commentsData?: unknown[] }[] = lbData?.comwrapper ?? [];
          const commentary = comwrapper.flatMap((w) => w.commentsData ?? []).slice(-10);
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
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
