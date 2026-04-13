import type { MatchItem } from "@/components/cricket/LiveMatchCard";

/**
 * Flatten the Cricbuzz typeMatches → seriesMatches → seriesAdWrapper → matches
 * nesting into a flat MatchItem[]. Safe to call from both server and client.
 */
export function extractMatches(data: unknown): MatchItem[] {
  if (!data || typeof data !== "object") return [];
  const d = data as { typeMatches?: unknown[] };
  if (!Array.isArray(d.typeMatches)) return [];
  const out: MatchItem[] = [];
  for (const tm of d.typeMatches) {
    const t = tm as { seriesMatches?: unknown[] };
    if (!Array.isArray(t.seriesMatches)) continue;
    for (const sm of t.seriesMatches) {
      const s = sm as { seriesAdWrapper?: { matches?: MatchItem[] } };
      if (s.seriesAdWrapper?.matches) out.push(...s.seriesAdWrapper.matches);
    }
  }
  return out;
}
