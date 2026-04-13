import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";
import { getCached, setCached, CACHE_TTL } from "@/lib/cricket-cache";

export const revalidate = 300;
const CACHE_KEY = "cricket:recent";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const matchType = searchParams.get("type") ?? "";

  const cached = await getCached<unknown>(CACHE_KEY, CACHE_TTL.matches);
  let raw = cached;

  if (!raw) {
    try {
      const res = await fetch(`${CB_BASE}/matches/v1/recent`, {
        headers: cbHeaders(),
        next: { revalidate: 300 },
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
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
