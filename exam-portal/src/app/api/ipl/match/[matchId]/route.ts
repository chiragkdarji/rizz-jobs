import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  try {
    const [scardRes, infoRes] = await Promise.all([
      fetch(`${CB_BASE}/mcenter/v1/${matchId}/scard`, {
        headers: cbHeaders(),
        cache: "no-store",
      }),
      fetch(`${CB_BASE}/mcenter/v1/${matchId}`, {
        headers: cbHeaders(),
        cache: "no-store",
      }),
    ]);

    const [scorecard, info] = await Promise.all([
      scardRes.ok ? scardRes.json() : null,
      infoRes.ok ? infoRes.json() : null,
    ]);

    const state = info?.state ?? "Complete";
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
