import { NextResponse } from "next/server";
import { CRICAPI_BASE, IPL_TEAM_KEYWORDS, findIplSeriesId } from "@/lib/cricapi";

/**
 * GET /api/ipl/debug
 * Returns raw currentMatches data + filter diagnostics.
 * Remove this route once live scores are confirmed working.
 */
export async function GET() {
  const apiKey = process.env.CRICAPI_KEY;
  if (!apiKey) return NextResponse.json({ error: "no api key" }, { status: 503 });

  const [seriesId, res] = await Promise.all([
    findIplSeriesId(apiKey).catch((e) => ({ error: String(e) })),
    fetch(`${CRICAPI_BASE}/currentMatches?apikey=${apiKey}&offset=0`, { cache: "no-store" }),
  ]);

  const json = await res.json();
  const all = json.data ?? [];

  const diagnosed = all.map((m: Record<string, unknown>) => {
    const n = String(m.name ?? "").toLowerCase();
    const teamNames = (m.teams as string[] ?? []).map((t) => t.toLowerCase());
    const iplTeamMatches = teamNames.filter((t) =>
      IPL_TEAM_KEYWORDS.some((kw) => t.includes(kw))
    ).length;
    return {
      name: m.name,
      series_id: m.series_id,
      teams: m.teams,
      status: m.status,
      matchType: m.matchType,
      passesFilter: {
        bySeriesId: typeof seriesId === "string" && m.series_id === seriesId,
        byName: n.includes("ipl") || n.includes("indian premier league"),
        byTeamNames: iplTeamMatches >= 2,
      },
    };
  });

  return NextResponse.json({
    seriesIdFound: seriesId,
    totalMatches: all.length,
    hitsUsed: json.info?.hitsToday,
    hitsLimit: json.info?.hitsLimit,
    matches: diagnosed,
  });
}
