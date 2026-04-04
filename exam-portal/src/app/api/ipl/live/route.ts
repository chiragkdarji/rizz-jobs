import { NextResponse } from "next/server";
import { CRICAPI_BASE, findIplSeriesId } from "@/lib/cricapi";

/**
 * GET /api/ipl/live
 *
 * Strategy: CricAPI free tier excludes IPL from /currentMatches.
 * Instead we:
 *  1. Get matchList from series_info (cached 30 min, shared with /series-data)
 *  2. Find any match whose scheduled time is within the last 5h (live window)
 *  3. Fetch match_info for each such match (cached 2 min) to get live scores
 *
 * Quota per day (~100 free):
 *  - findIplSeriesId: ≤3 calls, cached 12h
 *  - series_info: 1 call, cached 30 min
 *  - match_info: 1 call per live match, cached 2 min (~30/match/day)
 */
export async function GET() {
  const apiKey = process.env.CRICAPI_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "CRICAPI_KEY not configured" }, { status: 503 });
  }

  try {
    const seriesId = await findIplSeriesId(apiKey);
    if (!seriesId) {
      return NextResponse.json([], { headers: { "Cache-Control": "public, s-maxage=120" } });
    }

    // Fetch series matchList — same cache key as /api/ipl/series-data so no extra quota used
    const seriesRes = await fetch(
      `${CRICAPI_BASE}/series_info?apikey=${apiKey}&id=${seriesId}`,
      { next: { revalidate: 1800 } }
    );
    if (!seriesRes.ok) throw new Error(`series_info ${seriesRes.status}`);
    const seriesJson = await seriesRes.json();
    if (seriesJson.status !== "success") throw new Error(seriesJson.message ?? seriesJson.status);

    const matchList: Array<{ id: string; name: string; dateTimeGMT?: string; teams?: string[]; venue?: string }> =
      seriesJson.data?.matchList ?? [];

    // Find matches in "live window": started up to 5h ago, not more than 30min in the future
    // Add Z suffix so the string is always parsed as UTC (API omits the Z)
    const toUTC = (s: string) => new Date(s.endsWith("Z") || s.includes("+") ? s : s + "Z");
    const now = Date.now();
    const liveWindow = matchList.filter((m) => {
      if (!m.dateTimeGMT) return false;
      const t = toUTC(m.dateTimeGMT).getTime();
      return t <= now + 30 * 60 * 1000 && t >= now - 5 * 60 * 60 * 1000;
    });

    if (liveWindow.length === 0) {
      return NextResponse.json([], {
        headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" },
      });
    }

    // Fetch match_info for each potentially live match (usually just 1)
    const results = await Promise.all(
      liveWindow.map(async (m) => {
        const r = await fetch(
          `${CRICAPI_BASE}/match_info?apikey=${apiKey}&id=${m.id}`,
          { next: { revalidate: 120 } } // 2 minutes
        );
        if (!r.ok) return null;
        const j = await r.json();
        if (j.status !== "success") return null;
        return j.data as Record<string, unknown>;
      })
    );

    // Filter nulls and already-ended matches
    const ENDED = ["won", "win", "draw", "tie", "no result", "abandoned"];
    const live = results.filter((m): m is Record<string, unknown> => {
      if (!m) return false;
      const s = String(m.status ?? "").toLowerCase();
      // Include if not ended OR no status yet (match about to start)
      return !ENDED.some((kw) => s.includes(kw));
    });

    return NextResponse.json(live, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
