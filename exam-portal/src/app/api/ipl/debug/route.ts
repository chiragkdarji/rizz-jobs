import { NextResponse } from "next/server";
import { CRICAPI_BASE, findIplSeriesId } from "@/lib/cricapi";

/**
 * GET /api/ipl/debug
 * Diagnostic: shows series matchList + live window + raw match_info for today's match.
 * Remove once live scores are confirmed working.
 */
export async function GET() {
  const apiKey = process.env.CRICAPI_KEY;
  if (!apiKey) return NextResponse.json({ error: "no api key" }, { status: 503 });

  const seriesId = await findIplSeriesId(apiKey).catch((e) => String(e));

  if (!seriesId || typeof seriesId !== "string") {
    return NextResponse.json({ error: "series not found", seriesId });
  }

  const seriesRes = await fetch(
    `${CRICAPI_BASE}/series_info?apikey=${apiKey}&id=${seriesId}`,
    { cache: "no-store" }
  );
  const seriesJson = await seriesRes.json();
  const matchList = seriesJson.data?.matchList ?? [];

  const now = Date.now();
  const liveWindow = matchList.filter((m: { dateTimeGMT?: string }) => {
    if (!m.dateTimeGMT) return false;
    const t = new Date(m.dateTimeGMT).getTime();
    return t <= now + 30 * 60 * 1000 && t >= now - 5 * 60 * 60 * 1000;
  });

  // Fetch match_info for each live-window match
  const matchInfos = await Promise.all(
    liveWindow.map(async (m: { id: string; name: string; dateTimeGMT?: string }) => {
      const r = await fetch(`${CRICAPI_BASE}/match_info?apikey=${apiKey}&id=${m.id}`, { cache: "no-store" });
      const j = await r.json();
      return { matchId: m.id, matchName: m.name, scheduledGMT: m.dateTimeGMT, matchInfo: j.data ?? j };
    })
  );

  return NextResponse.json({
    seriesId,
    totalMatchesInSeries: matchList.length,
    liveWindowCount: liveWindow.length,
    liveWindow: liveWindow.map((m: { id: string; name: string; dateTimeGMT?: string }) => ({
      id: m.id, name: m.name, dateTimeGMT: m.dateTimeGMT,
    })),
    matchInfos,
  });
}
