import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders, IPL_SERIES_ID } from "@/lib/cricbuzz";

const REVALIDATE = 300;
export const revalidate = 300;

export async function GET() {
  try {
    const res = await fetch(`${CB_BASE}/news/v1/series/${IPL_SERIES_ID}`, {
      headers: cbHeaders(),
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
