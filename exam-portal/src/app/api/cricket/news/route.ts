import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";
import { getCached, setCached, CACHE_TTL } from "@/lib/cricket-cache";

export const revalidate = 900;

export async function GET() {
  const key = "cricket:news:index";
  const cached = await getCached<unknown>(key, CACHE_TTL.news);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=120" },
    });
  }

  try {
    const res = await fetch(`${CB_BASE}/news/v1/index`, {
      headers: cbHeaders(),
      next: { revalidate: 900 },
    });
    if (!res.ok) return NextResponse.json({ storyList: [] });
    const data = await res.json();
    setCached(key, data).catch(() => {});
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=120" },
    });
  } catch {
    return NextResponse.json({ storyList: [] });
  }
}
