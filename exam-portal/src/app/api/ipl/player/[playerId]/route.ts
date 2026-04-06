import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";

const REVALIDATE = 21600; // 6 hr

export const revalidate = 21600;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await params;
  try {
    const [infoRes, careerRes, battingRes, bowlingRes] = await Promise.all([
      fetch(`${CB_BASE}/players/get-info?playerId=${playerId}`, {
        headers: cbHeaders(),
        next: { revalidate: REVALIDATE },
      }),
      fetch(`${CB_BASE}/players/get-career?playerId=${playerId}`, {
        headers: cbHeaders(),
        next: { revalidate: REVALIDATE },
      }),
      fetch(`${CB_BASE}/players/get-batting?playerId=${playerId}`, {
        headers: cbHeaders(),
        next: { revalidate: REVALIDATE },
      }),
      fetch(`${CB_BASE}/players/get-bowling?playerId=${playerId}`, {
        headers: cbHeaders(),
        next: { revalidate: REVALIDATE },
      }),
    ]);

    const [info, career, batting, bowling] = await Promise.all([
      infoRes.ok ? infoRes.json() : null,
      careerRes.ok ? careerRes.json() : null,
      battingRes.ok ? battingRes.json() : null,
      bowlingRes.ok ? bowlingRes.json() : null,
    ]);

    return NextResponse.json(
      { info, career, batting, bowling },
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
