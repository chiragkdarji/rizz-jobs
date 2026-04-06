import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  try {
    const [scorecardRes, infoRes] = await Promise.all([
      fetch(`${CB_BASE}/matches/get-scorecard-v2?matchId=${matchId}`, {
        headers: cbHeaders(),
        cache: "no-store", // always fresh — we'll compute revalidate below
      }),
      fetch(`${CB_BASE}/matches/get-info?matchId=${matchId}`, {
        headers: cbHeaders(),
        cache: "no-store",
      }),
    ]);

    const [scorecard, info] = await Promise.all([
      scorecardRes.ok ? scorecardRes.json() : null,
      infoRes.ok ? infoRes.json() : null,
    ]);

    const state = info?.matchInfo?.state ?? "Complete";
    const isLive = state === "In Progress";
    const revalidate = isLive ? 60 : 3600;

    return NextResponse.json(
      { scorecard, info },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${revalidate}, stale-while-revalidate=${revalidate / 2}`,
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
