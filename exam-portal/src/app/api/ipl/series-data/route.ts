import { NextResponse } from "next/server";
import { CRICAPI_BASE, findIplSeriesId } from "@/lib/cricapi";

/**
 * GET /api/ipl/series-data
 * Returns upcoming schedule from series_info matchList.
 * Note: CricAPI series_info does NOT include pointsTable — schedule only.
 *
 * Cache: 30 minutes.
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
    const rawMatches: Array<{
      id: string;
      name: string;
      date?: string;
      dateTimeGMT?: string;
      teams?: string[];
      venue?: string;
      status?: string;
    }> = json.data?.matchList ?? [];

    const now = Date.now();
    const upcoming = rawMatches
      .filter((m) => {
        if (!m.dateTimeGMT) return false;
        const t = new Date(m.dateTimeGMT).getTime();
        return t > now - 4 * 60 * 60 * 1000; // include matches started up to 4h ago
      })
      .sort((a, b) => new Date(a.dateTimeGMT!).getTime() - new Date(b.dateTimeGMT!).getTime())
      .slice(0, 12);

    return NextResponse.json(
      {
        seriesName: info.name ?? "IPL 2026",
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
