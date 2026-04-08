import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders, IPL_SERIES_ID } from "@/lib/cricbuzz";

const REVALIDATE = 1800; // 30 min — stats update during live matches
export const revalidate = 1800;

export async function GET() {
  try {
    const [runsRes, wicketsRes] = await Promise.all([
      fetch(`${CB_BASE}/stats/v1/series/${IPL_SERIES_ID}/mostRuns`, {
        headers: cbHeaders(),
        next: { revalidate: REVALIDATE },
      }),
      fetch(`${CB_BASE}/stats/v1/series/${IPL_SERIES_ID}/mostWickets`, {
        headers: cbHeaders(),
        next: { revalidate: REVALIDATE },
      }),
    ]);

    const [orangeCap, purpleCap] = await Promise.all([
      runsRes.ok ? runsRes.json() : null,
      wicketsRes.ok ? wicketsRes.json() : null,
    ]);

    return NextResponse.json(
      { orangeCap, purpleCap },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${REVALIDATE}, stale-while-revalidate=900`,
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
