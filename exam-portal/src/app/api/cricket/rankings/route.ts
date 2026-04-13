import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders, getCached, setCached, CACHE_TTL } from "@/lib/cricbuzz";

export const revalidate = 3600;

// category: batsmen | bowlers | allrounders | teams
// format: test | odi | t20
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? "batsmen";
  const format = searchParams.get("format") ?? "test";

  const key = `cricket:rankings:${category}:${format}`;
  const cached = await getCached<unknown>(key, CACHE_TTL.rankings);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" },
    });
  }

  try {
    const matchTypeId = format === "test" ? 1 : format === "odi" ? 2 : 3;
    const url = category === "teams"
      ? `${CB_BASE}/stats/v1/iccstanding/team/matchtype/${matchTypeId}`
      : `${CB_BASE}/stats/v1/rankings/${category}?formatType=${format}`;

    const res = await fetch(url, {
      headers: cbHeaders(),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return NextResponse.json({ rank: [] });
    const data = await res.json();
    setCached(key, data).catch(() => {});
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json({ rank: [] });
  }
}
