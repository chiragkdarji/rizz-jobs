import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";

export const revalidate = 0;

type CommItem = {
  overnum?: number;
  timestamp?: number;
  commtxt?: string;
  inningsid?: number;
  eventtype?: string;
  ballnbr?: number;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  try {
    // Fetch latest ball-by-ball + over summaries in parallel
    const [commRes, oversRes] = await Promise.all([
      fetch(`${CB_BASE}/mcenter/v1/${matchId}/comm`, {
        headers: cbHeaders(),
        cache: "no-store",
      }),
      fetch(`${CB_BASE}/mcenter/v1/${matchId}/overs`, {
        headers: cbHeaders(),
        cache: "no-store",
      }),
    ]);

    const [commData, oversData] = await Promise.all([
      commRes.ok ? commRes.json() : null,
      oversRes.ok ? oversRes.json() : null,
    ]);

    // Extract recent ball-by-ball commentary (comwrapper, newest-first)
    const comwrapper: { commentary?: CommItem }[] = commData?.comwrapper ?? [];
    const recentBalls: CommItem[] = comwrapper
      .map((w) => w.commentary)
      .filter((c): c is CommItem => !!c && (c.overnum ?? 0) > 0);

    // Build a set of overs covered by recent ball-by-ball
    const recentOvers = new Set(recentBalls.map((b) => Math.floor(b.overnum ?? 0)));

    // Extract over summaries from /overs endpoint (already newest-first)
    // Use these to represent overs NOT already covered by ball-by-ball
    const oversepList: {
      overnum?: number;
      inningsid?: number;
      score?: number;
      wickets?: number;
      runs?: number;
      oversummary?: string;
      battingteamname?: string;
      timestamp?: number;
    }[] = oversData?.overseplist?.oversep ?? [];

    // Convert over summaries to commentary-style items for older overs
    const overSummaryItems: CommItem[] = oversepList
      .filter((ov) => {
        const ovInt = Math.floor(ov.overnum ?? 0);
        return ovInt > 0 && !recentOvers.has(ovInt);
      })
      .map((ov) => ({
        overnum: ov.overnum,
        inningsid: ov.inningsid,
        timestamp: ov.timestamp,
        commtxt: `Over ${Math.floor(ov.overnum ?? 0)} — ${ov.battingteamname ?? ""}: ${ov.runs ?? 0} runs${ov.oversummary ? ` (${ov.oversummary.trim()})` : ""}`,
        eventtype: "over-summary",
      }));

    // Merge: recent balls (newest-first) + over summaries for older overs (also newest-first)
    const allItems = [...recentBalls, ...overSummaryItems];

    // Re-wrap in comwrapper format
    const mergedComwrapper = allItems.map((c) => ({ commentary: c }));

    return NextResponse.json(
      { comwrapper: mergedComwrapper, miniscore: commData?.miniscore ?? null },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
