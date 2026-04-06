import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";

const REVALIDATE = 3600; // 1 hr

export const revalidate = 3600;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ newsId: string }> }
) {
  const { newsId } = await params;
  try {
    const res = await fetch(`${CB_BASE}/news/detail?id=${newsId}`, {
      headers: cbHeaders(),
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
