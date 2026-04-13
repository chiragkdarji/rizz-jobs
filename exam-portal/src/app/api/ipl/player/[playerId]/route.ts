import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders, IPL_SERIES_ID, IPL_TEAM_TO_SQUAD_ID, IPL_TEAMS } from "@/lib/cricbuzz";

/** Try to match IPL team from the player's all-time teams string */
function detectIplTeamId(teamsStr: string): number | null {
  for (const team of Object.values(IPL_TEAMS)) {
    if (teamsStr.includes(team.fullName)) return team.id;
  }
  return null;
}

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

  // 2. Fetch fresh from Cricbuzz (all 5 endpoints in parallel)
  let info: unknown = null;
  let career: unknown = null;
  let batting: unknown = null;
  let bowling: unknown = null;
  let news: unknown = null;

  try {
    const [infoRes, careerRes, battingRes, bowlingRes, newsRes] = await Promise.all([
      fetch(`${CB_BASE}/stats/v1/player/${playerId}`,         { headers: cbHeaders(), next: { revalidate: REVALIDATE } }),
      fetch(`${CB_BASE}/stats/v1/player/${playerId}/career`,  { headers: cbHeaders(), next: { revalidate: REVALIDATE } }),
      fetch(`${CB_BASE}/stats/v1/player/${playerId}/batting`, { headers: cbHeaders(), next: { revalidate: REVALIDATE } }),
      fetch(`${CB_BASE}/stats/v1/player/${playerId}/bowling`, { headers: cbHeaders(), next: { revalidate: REVALIDATE } }),
      fetch(`${CB_BASE}/news/v1/player/${playerId}`,          { headers: cbHeaders(), next: { revalidate: 1800 } }),
    ]);

    [info, career, batting, bowling, news] = await Promise.all([
      infoRes.ok    ? infoRes.json()    : null,
      careerRes.ok  ? careerRes.json()  : null,
      battingRes.ok ? battingRes.json() : null,
      bowlingRes.ok ? bowlingRes.json() : null,
      newsRes.ok    ? newsRes.json()    : null,
    ]);
  } catch {
    return NextResponse.json({ error: "Failed to fetch player data" }, { status: 502 });
  }

  if (!info && !career && !batting && !bowling && !news) {
    // Cricbuzz player endpoint unavailable — fall back to series squad lookup
    const squadResult = await findPlayerInSquads(playerId);
    if (!squadResult) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    info = squadResult.player;
    const squadTeam = Object.values(IPL_TEAMS).find((t) => t.id === squadResult.teamId);
    if (squadTeam) {
      // Inject iplTeamId into info so the page can use it
      (info as Record<string, unknown>).iplTeamId = squadResult.teamId;
    }
  }

  // Detect IPL team from player's all-time teams string
  const infoObj = info as Record<string, unknown> | null;
  const teamsStr = String(infoObj?.teams ?? "");
  const iplTeamId = teamsStr ? detectIplTeamId(teamsStr) : null;

  // 3. Persist to DB + image pipeline asynchronously (never blocks response)
  persistPlayer(playerId, { info, career, batting, bowling, iplTeamId }).catch(() => {});

  return NextResponse.json(
    { info, career, batting, bowling, news, ...(iplTeamId ? { iplTeamId } : {}) },
    { headers: { "Cache-Control": `public, s-maxage=${REVALIDATE}, stale-while-revalidate=3600` } }
  );
}

/** Search all IPL 2026 team squads for a player by ID.
 *  Returns the player data and their IPL teamId, or null if not found. */
async function findPlayerInSquads(playerId: string): Promise<{ player: Record<string, unknown>; teamId: number } | null> {
  const entries = Object.entries(IPL_TEAM_TO_SQUAD_ID) as [string, number][];
  const results = await Promise.all(
    entries.map(([teamId, squadId]) =>
      fetch(`${CB_BASE}/series/v1/${IPL_SERIES_ID}/squads/${squadId}`, {
        headers: cbHeaders(),
        next: { revalidate: 21600 },
      })
        .then((r) => (r.ok ? r.json().then((d: unknown) => ({ data: d, teamId: Number(teamId) })) : null))
        .catch(() => null)
    )
  );
  for (const result of results) {
    if (!result) continue;
    const { data, teamId } = result;
    if (!(data as Record<string, unknown>)?.player || !Array.isArray((data as Record<string, unknown>).player)) continue;
    const player = ((data as Record<string, unknown>).player as Record<string, unknown>[]).find(
      (p) => String(p.id) === playerId && !p.isHeader
    );
    if (player) return { player, teamId };
  }
  return null;
}

async function persistPlayer(
  playerId: string,
  data: { info: unknown; career: unknown; batting: unknown; bowling: unknown; iplTeamId: number | null }
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
        data: {
          info: data.info, career: data.career, batting: data.batting, bowling: data.bowling,
          name, ...(data.iplTeamId ? { iplTeamId: data.iplTeamId } : {}),
        },
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
