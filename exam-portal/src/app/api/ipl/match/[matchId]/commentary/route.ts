import { NextResponse } from "next/server";
import { CB_BASE, cbFetchWithRetry } from "@/lib/cricbuzz";

// Cache for 30s on the Vercel edge — multiple users on the commentary page
// all share the same cached response; only 1 upstream Cricbuzz call per 30s.
export const revalidate = 30;
const CACHE_TTL = 30;

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
    // Fetch latest ball-by-ball + over summaries in parallel (2 calls total)
    const [commRes, oversRes] = await Promise.all([
      cbFetchWithRetry(`${CB_BASE}/mcenter/v1/${matchId}/comm`, { cache: "no-store" }),
      cbFetchWithRetry(`${CB_BASE}/mcenter/v1/${matchId}/overs`, { cache: "no-store" }),
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

    // Build a set of overs already covered by ball-by-ball
    const recentOvers = new Set(recentBalls.map((b) => Math.floor(b.overnum ?? 0)));

    // Over summaries from /overs for older overs not in recent balls
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

    // Merge: recent balls (newest-first) + over summaries for older overs
    const allItems = [...recentBalls, ...overSummaryItems];
    const mergedComwrapper = allItems.map((c) => ({ commentary: c }));

    return NextResponse.json(
      { comwrapper: mergedComwrapper, miniscore: commData?.miniscore ?? null },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL / 2}`,
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
