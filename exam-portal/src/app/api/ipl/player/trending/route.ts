import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";

export const revalidate = 1800; // 30 min

export async function GET() {
  try {
    const res = await fetch(`${CB_BASE}/stats/v1/player/trending`, {
      headers: cbHeaders(),
      next: { revalidate: 1800 },
    });
    if (!res.ok) return NextResponse.json({ error: "Upstream error" }, { status: res.status });
    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch trending players" }, { status: 502 });
  }
}
