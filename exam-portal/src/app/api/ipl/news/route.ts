import { NextResponse } from "next/server";
import { CB_BASE, cbFetchWithRetry, IPL_SERIES_ID } from "@/lib/cricbuzz";

const REVALIDATE = 900; // 15 min
export const revalidate = 900;

export async function GET() {
  try {
    // Fetch first 3 pages in parallel to get ~30 news items
    // Cricbuzz returns ~10 per page; page param is 0-indexed
    const pages = await Promise.allSettled(
      [0, 1, 2].map((page) =>
        cbFetchWithRetry(
          `${CB_BASE}/news/v1/series/${IPL_SERIES_ID}${page > 0 ? `?page=${page}` : ""}`,
          { next: { revalidate: REVALIDATE } }
        ).then((r) => (r.ok ? r.json() : null))
      )
    );

    // Merge storyLists, deduplicate by story id
    const seen = new Set<number>();
    const storyList: unknown[] = [];

    for (const result of pages) {
      if (result.status !== "fulfilled" || !result.value) continue;
      const items: { story?: { id?: number } }[] = result.value?.storyList ?? [];
      for (const item of items) {
        const id = item?.story?.id;
        if (id && !seen.has(id)) {
          seen.add(id);
          storyList.push(item);
        }
      }
    }

    return NextResponse.json(
      { storyList },
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
