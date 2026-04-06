import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";

const REVALIDATE = 30; // 30 sec

export const revalidate = 30;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const { searchParams } = new URL(req.url);
  const innings = searchParams.get("innings") ?? "1";

  try {
    const res = await fetch(
      `${CB_BASE}/matches/get-commentaries-v2?matchId=${matchId}&inningsId=${innings}`,
      { headers: cbHeaders(), next: { revalidate: REVALIDATE } }
    );
    if (!res.ok) return NextResponse.json({ error: "Upstream error" }, { status: 502 });

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": `public, s-maxage=${REVALIDATE}, stale-while-revalidate=15`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
