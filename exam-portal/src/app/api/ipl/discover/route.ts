/**
 * ONE-TIME DISCOVERY ROUTE — DELETE AFTER USE
 *
 * Visit /api/ipl/discover in browser.
 * Copy the IPL seriesId and all 10 team IDs.
 * Hardcode them in src/lib/cricbuzz.ts (IPL_SERIES_ID + IPL_TEAM_IDS).
 * Then delete this file and its directory.
 */
import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";

export async function GET() {
  try {
    // 1. Find IPL series
    const seriesRes = await fetch(`${CB_BASE}/series/list?seriesType=League`, {
      headers: cbHeaders(),
      cache: "no-store",
    });
    const seriesData = await seriesRes.json();

    // Flatten all series across months
    const allSeries: { id: number; name: string; startDate: string; endDate: string }[] = [];
    for (const month of seriesData?.seriesMapProto ?? []) {
      for (const s of month?.series ?? []) {
        allSeries.push({ id: s.id, name: s.name, startDate: s.startDate, endDate: s.endDate });
      }
    }
    const iplSeries = allSeries.filter((s) =>
      s.name?.toLowerCase().includes("indian premier league")
    );

    // 2. Find IPL teams
    const teamsRes = await fetch(`${CB_BASE}/teams/list?teamType=IPL`, {
      headers: cbHeaders(),
      cache: "no-store",
    });
    const teamsData = await teamsRes.json();
    const teams = (teamsData?.list ?? []).map((t: { teamId: number; name: string; shortName: string; imageId: number }) => ({
      id: t.teamId,
      name: t.name,
      short: t.shortName,
      imageId: t.imageId,
    }));

    return NextResponse.json(
      {
        message: "Copy these values into src/lib/cricbuzz.ts, then delete this route",
        iplSeries,
        teams,
        allSeriesCount: allSeries.length,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
