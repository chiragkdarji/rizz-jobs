import { NextResponse } from "next/server";
import { CRICAPI_BASE, findIplSeriesId } from "@/lib/cricapi";

/**
 * GET /api/ipl/series-data
 * Returns points table + upcoming schedule from one series_info call.
 * Combining both into one endpoint halves API quota usage.
 *
 * Cache: 30 minutes (points table updates after each match).
 */
export async function GET() {
  const apiKey = process.env.CRICAPI_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "CRICAPI_KEY not configured" }, { status: 503 });
  }

  try {
    const seriesId = await findIplSeriesId(apiKey);
    if (!seriesId) {
      return NextResponse.json({ error: "IPL series not found" }, { status: 404 });
    }

    const res = await fetch(
      `${CRICAPI_BASE}/series_info?apikey=${apiKey}&id=${seriesId}`,
      { next: { revalidate: 1800 } } // 30 minutes
    );

    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const json = await res.json();
    if (json.status !== "success") throw new Error(json.message ?? json.status);

    const info = json.data?.info ?? {};
    const rawTable: Array<{
      teamId?: string;
      teamName?: string;
      teamSName?: string;
      img?: string;
      matchesPlayed?: number;
      matchesWon?: number;
      matchesLost?: number;
      matchesNoResult?: number;
      points?: number;
      nrr?: string;
      lastFive?: string;
      qualify?: string;
    }> = json.data?.pointsTable ?? [];

    const rawMatches: Array<{
      id: string;
      name: string;
      date?: string;
      dateTimeGMT?: string;
      teams?: string[];
      teamInfo?: Array<{ name: string; shortname: string; img?: string }>;
      venue?: string;
      status?: string;
      matchEnded?: boolean;
    }> = json.data?.matchList ?? [];

    const now = Date.now();
    const upcoming = rawMatches
      .filter((m) => {
        if (!m.dateTimeGMT) return false;
        const t = new Date(m.dateTimeGMT).getTime();
        return t > now - 4 * 60 * 60 * 1000; // include matches started up to 4h ago
      })
      .slice(0, 12);

    return NextResponse.json(
      {
        seriesName: info.name ?? "IPL 2026",
        pointsTable: rawTable,
        schedule: upcoming,
      },
      {
        headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=300" },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
