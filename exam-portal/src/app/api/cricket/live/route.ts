import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders, getCached, setCached, CACHE_TTL } from "@/lib/cricbuzz";

export const revalidate = 30;
const CACHE_KEY = "cricket:live";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const matchType = searchParams.get("type") ?? "";

  const cached = await getCached<unknown>(CACHE_KEY, CACHE_TTL.live);
  let raw = cached;

  if (!raw) {
    try {
      const res = await fetch(`${CB_BASE}/matches/v1/live`, {
        headers: cbHeaders(),
        next: { revalidate: 30 },
      });
      if (!res.ok) return NextResponse.json({ typeMatches: [] });
      raw = await res.json();
      setCached(CACHE_KEY, raw).catch(() => {});
    } catch {
      return NextResponse.json({ typeMatches: [] });
    }
  }

  let data = raw as { typeMatches?: unknown[] };
  if (matchType && Array.isArray(data.typeMatches)) {
    data = {
      ...data,
      typeMatches: data.typeMatches.filter(
        (t) => (t as { matchType?: string }).matchType === matchType
      ),
    };
  }

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=10" },
  });
}
