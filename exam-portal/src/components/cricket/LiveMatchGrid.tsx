"use client";
import { useState, useEffect, useCallback } from "react";
import LiveMatchCard, { type MatchItem } from "./LiveMatchCard";

interface Props {
  initialData: MatchItem[];
  apiUrl: string;
  pollIntervalMs?: number;
  matchTypeFilter?: string;
  maxItems?: number;
}

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

export default function LiveMatchGrid({
  initialData,
  apiUrl,
  pollIntervalMs = 30_000,
  matchTypeFilter,
  maxItems,
}: Props) {
  const [matches, setMatches] = useState<MatchItem[]>(initialData);

  const refresh = useCallback(async () => {
    try {
      const url = matchTypeFilter ? `${apiUrl}?type=${encodeURIComponent(matchTypeFilter)}` : apiUrl;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) setMatches(extractMatches(await res.json()));
    } catch {
      /* ignore */
    }
  }, [apiUrl, matchTypeFilter]);

  useEffect(() => {
    const id = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(id);
  }, [refresh, pollIntervalMs]);

  const visible = maxItems ? matches.slice(0, maxItems) : matches;

  if (visible.length === 0) {
    return (
      <p className="text-center py-12 text-sm" style={{ color: "#5A566A" }}>
        No matches at the moment.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {visible.map((m) => (
        <LiveMatchCard key={m.matchInfo.matchId} match={m} />
      ))}
    </div>
  );
}
