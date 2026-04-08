import { NextResponse } from "next/server";
import { CB_BASE, cbFetchWithRetry, IPL_SERIES_ID } from "@/lib/cricbuzz";
import { createServiceRoleClient } from "@/lib/supabase-server";

const REVALIDATE = 900; // 15 min
export const revalidate = 900;

// Fire-and-forget: upsert basic story metadata to ipl_news (no image fetch here)
async function syncNewsListToDB(storyList: unknown[]) {
  try {
    const supabase = createServiceRoleClient();
    const rows = (
      storyList as Array<{
        story?: {
          id?: number;
          hline?: string;
          intro?: string;
          pubTime?: number | string;
          imageId?: number | string;
        };
      }>
    )
      .filter((item) => item?.story?.id)
      .map((item) => ({
        id: item.story!.id!,
        headline: item.story!.hline ?? "",
        intro: item.story!.intro ?? null,
        publish_time: item.story!.pubTime ? Number(item.story!.pubTime) : null,
        cover_image_id: item.story!.imageId != null ? Number(item.story!.imageId) : null,
      }));

    if (rows.length === 0) return;

    // ignoreDuplicates: true — don't overwrite rows that already have full content
    await supabase.from("ipl_news").upsert(rows, {
      onConflict: "id",
      ignoreDuplicates: true,
    });
  } catch (err) {
    console.error("[ipl/news] syncNewsListToDB error:", err);
  }
}

export async function GET() {
  try {
    // Cricbuzz series news API returns ~10 latest stories; pagination (?page=N) is ignored
    const res = await cbFetchWithRetry(
      `${CB_BASE}/news/v1/series/${IPL_SERIES_ID}`,
      { next: { revalidate: REVALIDATE } }
    );
    const data = res.ok ? await res.json() : null;
    const storyList: unknown[] = data?.storyList ?? [];

    // Fire-and-forget DB sync (does not block the response)
    syncNewsListToDB(storyList).catch(() => {});

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
