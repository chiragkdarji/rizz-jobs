import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { fetchAndStoreImage } from "@/lib/ipl-image";

const REVALIDATE = 3600;
export const revalidate = 3600;

// How long a cached article is considered fresh (24 h)
const FRESH_MS = 24 * 60 * 60 * 1000;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ newsId: string }> }
) {
  const { newsId } = await params;
  const supabase = createServiceRoleClient();

  // 1. Try DB cache first
  const { data: cached } = await supabase
    .from("ipl_news")
    .select("id, headline, intro, publish_time, cover_image_id, cover_image_url, content, updated_at")
    .eq("id", Number(newsId))
    .single();

  if (cached?.content && cached.updated_at) {
    const age = Date.now() - new Date(cached.updated_at).getTime();
    if (age < FRESH_MS) {
      // Serve from DB — shape identical to raw Cricbuzz response
      return NextResponse.json(buildResponse(cached), {
        headers: { "Cache-Control": `public, s-maxage=${REVALIDATE}, stale-while-revalidate=1800` },
      });
    }
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

  // 3. If Cricbuzz failed, return stale DB data if available (even without content)
  if (!fresh) {
    if (cached) {
      return NextResponse.json(buildResponse(cached), {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
      });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 4. Persist to DB asynchronously (don't block response)
  persistArticle(supabase, newsId, fresh).catch(() => {});

  return NextResponse.json(fresh, {
    headers: { "Cache-Control": `public, s-maxage=${REVALIDATE}, stale-while-revalidate=1800` },
  });
}

// Upsert full article content + trigger image pipeline if needed
async function persistArticle(
  supabase: ReturnType<typeof createServiceRoleClient>,
  newsId: string,
  data: Record<string, unknown>
) {
  try {
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

    // Fetch + store image if we have a CB image ID and no bucket URL yet
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

// Build a response shape matching the raw Cricbuzz detail API
// so existing UI code (NewsDetailPage) doesn't need changes
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
    // coverImage shape used by NewsDetailPage: { id }
    coverImage: row.cover_image_id ? { id: row.cover_image_id } : undefined,
    // Expose bucket URL so UI can use it instead of /api/ipl/image proxy
    coverImageUrl: row.cover_image_url ?? undefined,
    content: row.content ?? [],
  };
}
