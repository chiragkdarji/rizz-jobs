import { NextResponse } from "next/server";
import { CRICAPI_BASE, IPL_TEAMS, findIplSeriesId } from "@/lib/cricapi";

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

    const IPL_TEAM_NAMES = new Set(
      Object.keys(IPL_TEAMS).map((k) => k.toLowerCase())
    );

    // Filter for IPL matches: series_id match OR name contains ipl/ipl team shorthands
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
      teamInfo?: Array<{ name: string; shortname: string; img?: string }>;
      score?: Array<{ r: number; w: number; o: number; inning: string }>;
      matchStarted?: boolean;
      matchEnded?: boolean;
    }> = json.data ?? [];

    const ipl = all.filter((m) => {
      const n = m.name.toLowerCase();
      // 1. Match by series_id (most reliable)
      if (seriesId && m.series_id === seriesId) return true;
      // 2. Match name contains "ipl" or "indian premier league"
      if (n.includes("ipl") || n.includes("indian premier league")) return true;
      // 3. Both teams are known IPL franchises (handles "MI vs CSK, 5th Match" style names)
      const shorts = m.teamInfo?.map((t) => t.shortname.toLowerCase()) ?? [];
      if (shorts.length >= 2 && shorts.every((s) => IPL_TEAM_NAMES.has(s))) return true;
      return false;
    });

    return NextResponse.json(ipl, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
