import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { fetchAndStoreImage } from "@/lib/ipl-image";

const REVALIDATE = 21600; // 6 hr
export const revalidate = 21600;

// How long a cached player is considered fresh (6 h)
const FRESH_MS = 6 * 60 * 60 * 1000;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await params;
  const supabase = createServiceRoleClient();

  // 1. Try DB cache first
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
  } catch {/* handled below */}

  // 3. If all Cricbuzz calls failed, return stale DB data
  if (!info && !career && !batting && !bowling) {
    if (cached) {
      const payload = cached.data as Record<string, unknown>;
      return NextResponse.json(
        { ...payload, imageUrl: cached.image_url ?? undefined },
        { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
      );
    }
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  // 4. Persist to DB + image pipeline asynchronously
  persistPlayer(supabase, playerId, { info, career, batting, bowling }, cached?.image_url ?? null).catch(() => {});

  return NextResponse.json(
    { info, career, batting, bowling },
    { headers: { "Cache-Control": `public, s-maxage=${REVALIDATE}, stale-while-revalidate=3600` } }
  );
}

async function persistPlayer(
  supabase: ReturnType<typeof createServiceRoleClient>,
  playerId: string,
  data: { info: unknown; career: unknown; batting: unknown; bowling: unknown },
  existingImageUrl: string | null
) {
  try {
    // Extract name and image ID from info response
    const infoObj = data.info as Record<string, unknown> | null;
    const playerInfo = infoObj?.playerInfo as Record<string, unknown> | undefined;
    const name = (playerInfo?.name ?? infoObj?.name ?? "") as string;
    const cbImageId = playerInfo?.imageId ?? infoObj?.imageId;

    let imageUrl = existingImageUrl;

    // Fetch + store image if we have a CB image ID and no bucket URL yet
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
