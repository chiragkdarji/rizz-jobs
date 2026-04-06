import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders, IPL_SERIES_ID } from "@/lib/cricbuzz";

const REVALIDATE = 3600; // 1 hr

export const revalidate = 3600;

export async function GET() {
  try {
    const [runsRes, wicketsRes] = await Promise.all([
      fetch(
        `${CB_BASE}/series/get-stats?seriesId=${IPL_SERIES_ID}&statsType=mostRuns`,
        { headers: cbHeaders(), next: { revalidate: REVALIDATE } }
      ),
      fetch(
        `${CB_BASE}/series/get-stats?seriesId=${IPL_SERIES_ID}&statsType=mostWickets`,
        { headers: cbHeaders(), next: { revalidate: REVALIDATE } }
      ),
    ]);

    const [runs, wickets] = await Promise.all([
      runsRes.ok ? runsRes.json() : null,
      wicketsRes.ok ? wicketsRes.json() : null,
    ]);

    return NextResponse.json(
      { orangeCap: runs, purpleCap: wickets },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${REVALIDATE}, stale-while-revalidate=${REVALIDATE / 2}`,
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
