import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";

const REVALIDATE = 21600; // 6 hr
export const revalidate = 21600;

// How long a cached player is considered fresh (6 h)
const FRESH_MS = 6 * 60 * 60 * 1000;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await params;

  // 1. Try DB cache first (wrapped in try-catch — never blocks Cricbuzz fallback)
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase-server");
    const supabase = createServiceRoleClient();

    const { data: cached } = await supabase
      .from("ipl_players")
      .select("id, data, image_url, updated_at")
      .eq("id", Number(playerId))
      .single();

    if (cached?.data && cached.updated_at) {
      const age = Date.now() - new Date(cached.updated_at).getTime();
      if (age < FRESH_MS) {
        const payload = cached.data as Record<string, unknown>;
        return NextResponse.json(
          { ...payload, imageUrl: cached.image_url ?? undefined },
          { headers: { "Cache-Control": `public, s-maxage=${REVALIDATE}, stale-while-revalidate=3600` } }
        );
      }
    }
  } catch {
    // Supabase unavailable — fall through to Cricbuzz
  }

  // 2. Fetch fresh from Cricbuzz (all 4 endpoints in parallel)
  let info: unknown = null;
  let career: unknown = null;
  let batting: unknown = null;
  let bowling: unknown = null;

  try {
    const [infoRes, careerRes, battingRes, bowlingRes] = await Promise.all([
      fetch(`${CB_BASE}/players/v1/${playerId}/info`,    { headers: cbHeaders(), next: { revalidate: REVALIDATE } }),
      fetch(`${CB_BASE}/players/v1/${playerId}/career`,  { headers: cbHeaders(), next: { revalidate: REVALIDATE } }),
      fetch(`${CB_BASE}/players/v1/${playerId}/batting`, { headers: cbHeaders(), next: { revalidate: REVALIDATE } }),
      fetch(`${CB_BASE}/players/v1/${playerId}/bowling`, { headers: cbHeaders(), next: { revalidate: REVALIDATE } }),
    ]);

    [info, career, batting, bowling] = await Promise.all([
      infoRes.ok    ? infoRes.json()    : null,
      careerRes.ok  ? careerRes.json()  : null,
      battingRes.ok ? battingRes.json() : null,
      bowlingRes.ok ? bowlingRes.json() : null,
    ]);
  } catch {
    return NextResponse.json({ error: "Failed to fetch player data" }, { status: 502 });
  }

  if (!info && !career && !batting && !bowling) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  // 3. Persist to DB + image pipeline asynchronously (never blocks response)
  persistPlayer(playerId, { info, career, batting, bowling }).catch(() => {});

  return NextResponse.json(
    { info, career, batting, bowling },
    { headers: { "Cache-Control": `public, s-maxage=${REVALIDATE}, stale-while-revalidate=3600` } }
  );
}

async function persistPlayer(
  playerId: string,
  data: { info: unknown; career: unknown; batting: unknown; bowling: unknown }
) {
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase-server");
    const { fetchAndStoreImage } = await import("@/lib/ipl-image");
    const supabase = createServiceRoleClient();

    // Extract name and image ID from info response
    const infoObj = data.info as Record<string, unknown> | null;
    const playerInfo = (infoObj?.playerInfo ?? infoObj) as Record<string, unknown> | undefined;
    const name = String(playerInfo?.name ?? playerInfo?.fullName ?? "");
    const cbImageId = playerInfo?.faceImageId ?? playerInfo?.imageId;

    // Check existing image URL
    const { data: existing } = await supabase
      .from("ipl_players")
      .select("image_url")
      .eq("id", Number(playerId))
      .single();

    let imageUrl: string | null = existing?.image_url ?? null;

    if (cbImageId && !imageUrl) {
      imageUrl = await fetchAndStoreImage(String(cbImageId), `players/${playerId}.webp`, "thumb");
    }

    await supabase.from("ipl_players").upsert(
      {
        id: Number(playerId),
        data: { info: data.info, career: data.career, batting: data.batting, bowling: data.bowling, name },
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  } catch (err) {
    console.error("[ipl/player] persistPlayer error:", err);
  }
}
