import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";

// Temporary debug route — returns raw Cricbuzz scard response so we can inspect field names
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const res = await fetch(`${CB_BASE}/mcenter/v1/${matchId}/scard`, {
    headers: cbHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ error: "upstream failed", status: res.status }, { status: 502 });
  const data = await res.json();
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
