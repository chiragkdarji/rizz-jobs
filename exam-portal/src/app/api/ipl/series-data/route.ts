import { NextResponse } from "next/server";
import { CRICAPI_BASE, TEAM_SHORT_MAP, findIplSeriesId } from "@/lib/cricapi";

/**
 * GET /api/ipl/series-data
 * Returns computed points table + upcoming schedule from series_info matchList.
 * CricAPI series_info has no native pointsTable — we compute it from match results.
 *
 * Cache: 30 minutes.
 */

interface RawMatch {
  id: string;
  name: string;
  date?: string;
  dateTimeGMT?: string;
  teams?: string[];
  venue?: string;
  status?: string;
}

interface TeamRow {
  teamName: string;
  teamSName: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  matchesNoResult: number;
  points: number;
}

function shortName(name: string): string {
  return TEAM_SHORT_MAP[name] ?? name.split(" ").map((w) => w[0]).join("").slice(0, 4).toUpperCase();
}

function buildPointsTable(matches: RawMatch[]): TeamRow[] {
  const table = new Map<string, TeamRow>();

  function ensure(name: string) {
    if (!table.has(name)) {
      table.set(name, {
        teamName: name,
        teamSName: shortName(name),
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        matchesNoResult: 0,
        points: 0,
      });
    }
    return table.get(name)!;
  }

  for (const m of matches) {
    const teams = m.teams ?? [];
    if (teams.length < 2) continue;
    const status = (m.status ?? "").toLowerCase().trim();

    // Skip unplayed / in-progress matches
    if (!status || status === "match not started" || status.includes("yet to bat") || status.includes("toss")) continue;

    const isNoResult = status.includes("no result") || status.includes("abandoned") || status.includes("cancelled");
    const isWon = status.includes(" won ");

    if (isNoResult) {
      for (const t of teams) {
        const r = ensure(t);
        r.matchesPlayed++;
        r.matchesNoResult++;
        r.points++;
      }
    } else if (isWon) {
      // Status format: "Gujarat Titans won by 5 wickets (with 6 balls remaining)"
      let winner: string | null = null;
      for (const t of teams) {
        if (status.startsWith(t.toLowerCase())) { winner = t; break; }
      }
      if (!winner) {
        // Fallback: check which team name appears before "won"
        const wonIdx = status.indexOf(" won ");
        const before = status.slice(0, wonIdx);
        winner = teams.find((t) => before.includes(t.toLowerCase())) ?? null;
      }
      if (winner) {
        const loser = teams.find((t) => t !== winner)!;
        const w = ensure(winner);
        const l = ensure(loser);
        w.matchesPlayed++; w.matchesWon++; w.points += 2;
        l.matchesPlayed++; l.matchesLost++;
      }
    }
  }

  return [...table.values()].sort((a, b) =>
    b.points - a.points || b.matchesWon - a.matchesWon || b.matchesPlayed - a.matchesPlayed
  );
}

export async function GET() {
  const apiKey = process.env.CRICAPI_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "CRICAPI_KEY not configured" }, { status: 503 });
  }

  try {
    const seriesId = await findIplSeriesId(apiKey);
    if (!seriesId) {
      return NextResponse.json({ error: "IPL series not found" }, { status: 404 });
    }

    const res = await fetch(
      `${CRICAPI_BASE}/series_info?apikey=${apiKey}&id=${seriesId}`,
      { next: { revalidate: 1800 } } // 30 minutes
    );

    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const json = await res.json();
    if (json.status !== "success") throw new Error(json.message ?? json.status);

    const info = json.data?.info ?? {};
    const allMatches: RawMatch[] = json.data?.matchList ?? [];

    const pointsTable = buildPointsTable(allMatches);

    // Add Z suffix so servers/clients consistently parse as UTC
    const toUTC = (s: string) => new Date(s.endsWith("Z") || s.includes("+") ? s : s + "Z");

    const now = Date.now();
    const schedule = allMatches
      .filter((m) => {
        if (!m.dateTimeGMT) return false;
        const t = toUTC(m.dateTimeGMT).getTime();
        return t > now - 4 * 60 * 60 * 1000;
      })
      .sort((a, b) => toUTC(a.dateTimeGMT!).getTime() - toUTC(b.dateTimeGMT!).getTime())
      .slice(0, 5);

    return NextResponse.json(
      { seriesName: info.name ?? "IPL 2026", pointsTable, schedule },
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=300" } }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
