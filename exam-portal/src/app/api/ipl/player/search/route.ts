import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ error: "Missing ?name=" }, { status: 400 });

  try {
    const res = await fetch(
      `${CB_BASE}/stats/v1/player/search?plrN=${encodeURIComponent(name)}`,
      { headers: cbHeaders(), next: { revalidate: 300 } }
    );
    if (!res.ok) return NextResponse.json({ error: "Upstream error" }, { status: res.status });
    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to search players" }, { status: 502 });
  }
}
