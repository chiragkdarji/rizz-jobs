import { NextResponse } from "next/server";
import { CRICAPI_BASE } from "@/lib/cricapi";

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
    const res = await fetch(
      `${CRICAPI_BASE}/currentMatches?apikey=${apiKey}&offset=0`,
      { next: { revalidate: 120 } } // 2 minutes
    );

    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const json = await res.json();
    if (json.status !== "success") throw new Error(json.message ?? json.status);

    // Filter for IPL matches only
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
      return n.includes("ipl") || n.includes("indian premier league");
    });

    return NextResponse.json(ipl, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
