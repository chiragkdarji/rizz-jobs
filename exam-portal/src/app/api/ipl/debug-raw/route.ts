import { NextRequest, NextResponse } from "next/server";
import { CB_BASE, cbHeaders, IPL_SERIES_ID } from "@/lib/cricbuzz";

// Temporary debug route — inspects raw Cricbuzz responses for teams & players
// Usage:
//   /api/ipl/debug-raw?type=squads             → series squads list
//   /api/ipl/debug-raw?type=team&id=58         → /teams/v1/58/players
//   /api/ipl/debug-raw?type=player&id=7915     → /players/v1/7915/info
//   /api/ipl/debug-raw?type=squad&id=1234      → /series/v1/{seriesId}/squads/1234
//   /api/ipl/debug-raw?type=mostRuns           → /stats/v1/series/{seriesId}/mostRuns
//   /api/ipl/debug-raw?type=mostWickets        → /stats/v1/series/{seriesId}/mostWickets

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const id = req.nextUrl.searchParams.get("id");

  let url = "";
  if (type === "squads") {
    url = `${CB_BASE}/series/v1/${IPL_SERIES_ID}/squads`;
  } else if (type === "team" && id) {
    url = `${CB_BASE}/teams/v1/${id}/players`;
  } else if (type === "player" && id) {
    url = `${CB_BASE}/players/v1/${id}/info`;
  } else if (type === "squad" && id) {
    url = `${CB_BASE}/series/v1/${IPL_SERIES_ID}/squads/${id}`;
  } else if (type === "mostRuns") {
    url = `${CB_BASE}/stats/v1/series/${IPL_SERIES_ID}/mostRuns`;
  } else if (type === "mostWickets") {
    url = `${CB_BASE}/stats/v1/series/${IPL_SERIES_ID}/mostWickets`;
  } else if (type === "statsAlt") {
    url = `${CB_BASE}/series/v1/${IPL_SERIES_ID}/stats`;
  } else if (type === "statsAlt2") {
    url = `${CB_BASE}/stats/v1/series/${IPL_SERIES_ID}?statsType=mostRuns`;
  } else if (type === "news1") {
    url = `${CB_BASE}/news/v1/series/${IPL_SERIES_ID}?page=1`;
  } else if (type === "news2") {
    url = `${CB_BASE}/news/v1/series/${IPL_SERIES_ID}?page=2`;
  } else {
    return NextResponse.json({ error: "Invalid params. Use ?type=squads|team|player|squad&id=..." }, { status: 400 });
  }

  const res = await fetch(url, { headers: cbHeaders(), cache: "no-store" });
  const data = res.ok ? await res.json() : { error: "upstream failed", status: res.status };
  return NextResponse.json({ url, data }, { headers: { "Cache-Control": "no-store" } });
}
