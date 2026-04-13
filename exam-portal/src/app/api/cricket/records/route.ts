import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";
import { getCached, setCached, CACHE_TTL } from "@/lib/cricket-cache";

export const revalidate = 86400;

// statsType: mostRuns | mostWickets | highestScore | highestAvg | mostHundreds |
//            mostFifties | mostSixes | lowestAvg | bestBowlingInnings | mostFiveWickets
// matchType: 1=Test 2=ODI 3=T20
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const statsType = searchParams.get("statsType") ?? "mostRuns";
  const matchType = searchParams.get("matchType") ?? "1";

  const key = `cricket:records:${statsType}:${matchType}`;
  const cached = await getCached<unknown>(key, CACHE_TTL.records);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
    });
  }

  try {
    const res = await fetch(
      `${CB_BASE}/stats/v1/topstats/${matchType}?statsType=${statsType}`,
      { headers: cbHeaders(), next: { revalidate: 86400 } }
    );
    if (!res.ok) return NextResponse.json({ values: [] });
    const data = await res.json();
    setCached(key, data).catch(() => {});
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
    });
  } catch {
    return NextResponse.json({ values: [] });
  }
}
