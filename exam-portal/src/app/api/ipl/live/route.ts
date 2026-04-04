import { NextResponse } from "next/server";
import { CRICAPI_BASE, IPL_TEAM_KEYWORDS, findIplSeriesId } from "@/lib/cricapi";

/**
 * GET /api/ipl/live
 * Returns current/live IPL matches from CricAPI.
 * Next.js Data Cache: revalidates every 2 minutes → CricAPI called at most 720×/day
 * but in practice only during match hours (~4h/day → ~120 calls).
 */
export async function GET() {
  const apiKey = process.env.CRICAPI_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "CRICAPI_KEY not configured" }, { status: 503 });
  }

  try {
    // Fetch IPL series ID and live matches in parallel
    const [seriesId, res] = await Promise.all([
      findIplSeriesId(apiKey),
      fetch(
        `${CRICAPI_BASE}/currentMatches?apikey=${apiKey}&offset=0`,
        { next: { revalidate: 120 } } // 2 minutes
      ),
    ]);

    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const json = await res.json();
    if (json.status !== "success") throw new Error(json.message ?? json.status);

    // Filter for IPL matches using 3-tier strategy
    const all: Array<{
      id: string;
      name: string;
      series_id?: string;
      matchType?: string;
      status: string;
      venue?: string;
      date?: string;
      dateTimeGMT?: string;
      teams?: string[];
      score?: Array<{ r: number; w: number; o: number; inning: string }>;
    }> = json.data ?? [];

    const IPL_SHORTCODES = new Set(["mi", "csk", "rcb", "rcbw", "kkr", "srh", "dc", "pbks", "rr", "lsg", "gt"]);

    const ipl = all.filter((m) => {
      const n = m.name.toLowerCase();
      // 1. series_id match (most reliable)
      if (seriesId && m.series_id === seriesId) return true;
      // 2. Match name contains "ipl" or "indian premier league"
      if (n.includes("ipl") || n.includes("indian premier league")) return true;
      // 3. teams[] as full names ("Gujarat Titans", "Rajasthan Royals")
      const teamNames = (m.teams ?? []).map((t) => t.toLowerCase());
      const fullNameMatches = teamNames.filter((t) =>
        IPL_TEAM_KEYWORDS.some((kw) => t.includes(kw))
      ).length;
      if (fullNameMatches >= 2) return true;
      // 4. teams[] as shortcodes ("GT", "RR") — API may return abbreviations
      const shortCodeMatches = teamNames.filter((t) => IPL_SHORTCODES.has(t)).length;
      if (shortCodeMatches >= 2) return true;
      return false;
    });

    return NextResponse.json(ipl, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
