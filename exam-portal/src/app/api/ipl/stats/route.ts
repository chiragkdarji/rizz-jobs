import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders, IPL_SERIES_ID } from "@/lib/cricbuzz";

const REVALIDATE = 3600;
export const revalidate = 3600;

const STAT_TYPES = [
  "mostRuns",
  "mostWickets",
  "mostFours",
  "mostSixes",
  "mostFifties",
  "mostHundreds",
  "bestBattingAverage",
  "bestBattingStrikeRate",
  "bestBowlingAverage",
  "bestBowlingEconomy",
  "bestBowlingStrikeRate",
  "mostFiveWickets",
] as const;

export async function GET() {
  try {
    const results = await Promise.allSettled(
      STAT_TYPES.map((statsType) =>
        fetch(`${CB_BASE}/stats/v1/series/${IPL_SERIES_ID}?statsType=${statsType}`, {
          headers: cbHeaders(),
          next: { revalidate: REVALIDATE },
        }).then((r) => (r.ok ? r.json() : null))
      )
    );

    const data: Record<string, unknown> = {};
    STAT_TYPES.forEach((type, i) => {
      const result = results[i];
      data[type] = result.status === "fulfilled" ? result.value : null;
    });

    // Keep legacy keys for backward compat
    data.orangeCap = data.mostRuns;
    data.purpleCap = data.mostWickets;

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": `public, s-maxage=${REVALIDATE}, stale-while-revalidate=${REVALIDATE / 2}`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
