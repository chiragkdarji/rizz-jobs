import { NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";

export const revalidate = 0;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  try {
    // Fetch commentary for both innings in parallel, plus default (current)
    const [r1, r2] = await Promise.all([
      fetch(`${CB_BASE}/mcenter/v1/${matchId}/comm?innId=1`, {
        headers: cbHeaders(),
        cache: "no-store",
      }),
      fetch(`${CB_BASE}/mcenter/v1/${matchId}/comm?innId=2`, {
        headers: cbHeaders(),
        cache: "no-store",
      }),
    ]);

    const [d1, d2] = await Promise.all([
      r1.ok ? r1.json() : null,
      r2.ok ? r2.json() : null,
    ]);

    // Extract and deduplicate commentary items across both innings
    // comwrapper is newest-first; each entry has { commentary: {...} }
    type RawItem = { overnum?: number; timestamp?: number; commtxt?: string; inningsid?: number };
    const extract = (d: { comwrapper?: { commentary?: RawItem }[] } | null): RawItem[] =>
      (d?.comwrapper ?? [])
        .map((w) => w.commentary)
        .filter((c): c is RawItem => !!c && (c.overnum ?? 0) > 0);

    const inn1 = extract(d1);
    const inn2 = extract(d2);

    // Combine: inn2 (current/latest innings) first, inn1 after; remove dupes by timestamp
    const seen = new Set<number>();
    const all: RawItem[] = [];
    for (const item of [...inn2, ...inn1]) {
      const key = item.timestamp ?? 0;
      if (!seen.has(key)) {
        seen.add(key);
        all.push(item);
      }
    }

    // Sort newest-first by timestamp, then by inningsid desc, then overnum desc
    all.sort((a, b) => {
      if ((b.inningsid ?? 0) !== (a.inningsid ?? 0)) return (b.inningsid ?? 0) - (a.inningsid ?? 0);
      return (b.overnum ?? 0) - (a.overnum ?? 0);
    });

    // Re-wrap in comwrapper format IplCommentary expects
    const comwrapper = all.map((c) => ({ commentary: c }));

    // Pass through miniscore from whichever innings is active
    const miniscore = d2?.miniscore ?? d1?.miniscore ?? null;

    return NextResponse.json(
      { comwrapper, miniscore },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
