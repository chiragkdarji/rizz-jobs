import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders, IPL_SERIES_ID, IPL_TEAM_TO_SQUAD_ID, IPL_TEAMS } from "@/lib/cricbuzz";

const REVALIDATE = 1800; // 30 min — stats update during live matches
export const revalidate = 1800;

type SquadPlayer = { id?: string; name?: string; imageId?: number; role?: string; battingStyle?: string; bowlingStyle?: string; isHeader?: boolean };
type PlayerMeta = { imageId: number; teamSName: string };

export async function GET() {
  try {
    const [runsRes, wicketsRes] = await Promise.all([
      fetch(`${CB_BASE}/stats/v1/series/${IPL_SERIES_ID}?statsType=mostRuns`, {
        headers: cbHeaders(),
        next: { revalidate: REVALIDATE },
      }),
      fetch(`${CB_BASE}/stats/v1/series/${IPL_SERIES_ID}?statsType=mostWickets`, {
        headers: cbHeaders(),
        next: { revalidate: REVALIDATE },
      }),
    ]);

    const [orangeCap, purpleCap] = await Promise.all([
      runsRes.ok ? runsRes.json() : null,
      wicketsRes.ok ? wicketsRes.json() : null,
    ]);

    // Build teamId → abbr map
    const teamIdToAbbr: Record<number, string> = {};
    for (const [abbr, team] of Object.entries(IPL_TEAMS)) teamIdToAbbr[team.id] = abbr;

    // Fetch all squad data (cached 6h) — used for player photos, team names, and DB population
    const squadEntries = Object.entries(IPL_TEAM_TO_SQUAD_ID) as [string, number][];
    const squads = await Promise.allSettled(
      squadEntries.map(([, squadId]) =>
        fetch(`${CB_BASE}/series/v1/${IPL_SERIES_ID}/squads/${squadId}`, {
          headers: cbHeaders(),
          next: { revalidate: 21600 },
        }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
      )
    );

    const playerMeta: Record<string, PlayerMeta> = {};
    const dbRows: { id: number; data: Record<string, unknown>; teamSName: string }[] = [];

    for (let i = 0; i < squadEntries.length; i++) {
      const [teamIdStr] = squadEntries[i];
      const abbr = teamIdToAbbr[Number(teamIdStr)] ?? "";
      const result = squads[i];
      const squad = result.status === "fulfilled" ? result.value : null;
      if (!Array.isArray(squad?.player)) continue;
      for (const p of squad.player as SquadPlayer[]) {
        if (!p.id || p.isHeader) continue;
        if (p.imageId) playerMeta[p.id] = { imageId: p.imageId, teamSName: abbr };
        // Collect for DB upsert (basic info only — don't overwrite full player data)
        dbRows.push({
          id: Number(p.id),
          data: { info: { id: p.id, name: p.name, role: p.role, imageId: p.imageId, battingStyle: p.battingStyle, bowlingStyle: p.bowlingStyle }, name: p.name ?? "" },
          teamSName: abbr,
        });
      }
    }

    // Fire-and-forget: persist squad players to DB (ignoreDuplicates keeps richer data intact)
    persistSquadPlayers(dbRows).catch(() => {});

    return NextResponse.json(
      { orangeCap, purpleCap, playerMeta },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${REVALIDATE}, stale-while-revalidate=900`,
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

async function persistSquadPlayers(rows: { id: number; data: Record<string, unknown>; teamSName: string }[]) {
  if (rows.length === 0) return;
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase-server");
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();
    await supabase.from("ipl_players").upsert(
      rows.map((r) => ({ id: r.id, data: r.data, fetched_at: now, updated_at: now })),
      { onConflict: "id", ignoreDuplicates: true } // never overwrite richer data from page visits
    );
  } catch {/* non-critical */}
}
