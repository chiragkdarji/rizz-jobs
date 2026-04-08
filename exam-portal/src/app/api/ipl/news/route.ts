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
    // 1. Fetch latest ~10 from Cricbuzz and sync to DB (fire-and-forget)
    cbFetchWithRetry(`${CB_BASE}/news/v1/series/${IPL_SERIES_ID}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data?.storyList ? syncNewsListToDB(data.storyList) : null)
      .catch(() => {});

    // 2. Return from DB — accumulates all articles seen so far, sorted newest first
    const supabase = createServiceRoleClient();
    const { data: dbNews } = await supabase
      .from("ipl_news")
      .select("id, headline, intro, cover_image_id, publish_time")
      .order("publish_time", { ascending: false })
      .limit(30);

    // Shape into { storyList: [{ story: {...} }] } — same format pages expect
    const storyList = (dbNews ?? []).map((row) => ({
      story: {
        id: row.id,
        hline: row.headline,
        intro: row.intro,
        imageId: row.cover_image_id,
        pubTime: row.publish_time,
      },
    }));

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
