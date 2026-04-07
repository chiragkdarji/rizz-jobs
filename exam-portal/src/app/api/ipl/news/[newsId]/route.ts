import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";

const REVALIDATE = 3600;
export const revalidate = 3600;

// How long a cached article is considered fresh (24 h)
const FRESH_MS = 24 * 60 * 60 * 1000;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ newsId: string }> }
) {
  const { newsId } = await params;

  // 1. Try DB cache first (wrapped — never blocks Cricbuzz fallback)
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase-server");
    const supabase = createServiceRoleClient();

    const { data: cached } = await supabase
      .from("ipl_news")
      .select("id, headline, intro, publish_time, cover_image_id, cover_image_url, content, updated_at")
      .eq("id", Number(newsId))
      .single();

    if (cached?.content && cached.updated_at) {
      const age = Date.now() - new Date(cached.updated_at).getTime();
      if (age < FRESH_MS) {
        return NextResponse.json(buildResponse(cached), {
          headers: { "Cache-Control": `public, s-maxage=${REVALIDATE}, stale-while-revalidate=1800` },
        });
      }
    }
  } catch {
    // Supabase unavailable — fall through to Cricbuzz
  }

  // 2. Fetch fresh from Cricbuzz
  let fresh: Record<string, unknown> | null = null;
  try {
    const res = await fetch(`${CB_BASE}/news/v1/detail/${newsId}`, {
      headers: cbHeaders(),
      next: { revalidate: REVALIDATE },
    });
    if (res.ok) fresh = await res.json();
  } catch {/* handled below */}

  if (!fresh) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 3. Persist to DB asynchronously (don't block response)
  persistArticle(newsId, fresh).catch(() => {});

  return NextResponse.json(fresh, {
    headers: { "Cache-Control": `public, s-maxage=${REVALIDATE}, stale-while-revalidate=1800` },
  });
}

// Upsert full article content + trigger image pipeline if needed
async function persistArticle(newsId: string, data: Record<string, unknown>) {
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase-server");
    const { fetchAndStoreImage } = await import("@/lib/ipl-image");
    const supabase = createServiceRoleClient();

    const cbImageId = data.coverImage
      ? String((data.coverImage as { id?: number | string }).id ?? "")
      : "";

    // Check if image already stored
    const { data: existing } = await supabase
      .from("ipl_news")
      .select("cover_image_url")
      .eq("id", Number(newsId))
      .single();

    let coverImageUrl: string | null = existing?.cover_image_url ?? null;

    if (cbImageId && !coverImageUrl) {
      coverImageUrl = await fetchAndStoreImage(cbImageId, `news/${newsId}.webp`, "thumb");
    }

    await supabase.from("ipl_news").upsert(
      {
        id: Number(newsId),
        headline: (data.headline as string) ?? "",
        intro: (data.intro as string) ?? null,
        publish_time: data.publishTime ? Number(data.publishTime) : null,
        cover_image_id: cbImageId ? Number(cbImageId) : null,
        cover_image_url: coverImageUrl,
        content: data.content ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  } catch (err) {
    console.error("[ipl/news/detail] persistArticle error:", err);
  }
}

function buildResponse(row: {
  headline?: string | null;
  intro?: string | null;
  publish_time?: number | null;
  cover_image_id?: number | null;
  cover_image_url?: string | null;
  content?: unknown;
}) {
  return {
    headline: row.headline,
    intro: row.intro,
    publishTime: row.publish_time ? String(row.publish_time) : undefined,
    coverImage: row.cover_image_id ? { id: row.cover_image_id } : undefined,
    coverImageUrl: row.cover_image_url ?? undefined,
    content: row.content ?? [],
  };
}
