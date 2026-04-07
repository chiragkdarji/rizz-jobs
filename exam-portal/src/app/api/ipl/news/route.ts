import { NextResponse } from "next/server";
import { CB_BASE, cbFetchWithRetry, IPL_SERIES_ID } from "@/lib/cricbuzz";

const REVALIDATE = 900; // 15 min — news doesn't change by the minute
export const revalidate = 900;

export async function GET() {
  try {
    const res = await cbFetchWithRetry(`${CB_BASE}/news/v1/series/${IPL_SERIES_ID}`, {
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return NextResponse.json({ error: "Upstream error" }, { status: 502 });

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": `public, s-maxage=${REVALIDATE}, stale-while-revalidate=${REVALIDATE / 2}`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
