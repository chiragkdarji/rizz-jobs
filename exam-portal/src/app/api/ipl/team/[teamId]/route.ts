import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";

const REVALIDATE = 3600;
export const revalidate = 3600;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  try {
    const [playersRes, schedulesRes, resultsRes] = await Promise.all([
      fetch(`${CB_BASE}/teams/v1/${teamId}/players`, {
        headers: cbHeaders(),
        next: { revalidate: REVALIDATE },
      }),
      fetch(`${CB_BASE}/teams/v1/${teamId}/schedule`, {
        headers: cbHeaders(),
        next: { revalidate: REVALIDATE },
      }),
      fetch(`${CB_BASE}/teams/v1/${teamId}/results`, {
        headers: cbHeaders(),
        next: { revalidate: REVALIDATE },
      }),
    ]);

    const [players, schedules, results] = await Promise.all([
      playersRes.ok ? playersRes.json() : null,
      schedulesRes.ok ? schedulesRes.json() : null,
      resultsRes.ok ? resultsRes.json() : null,
    ]);

    return NextResponse.json(
      { players, schedules, results },
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
