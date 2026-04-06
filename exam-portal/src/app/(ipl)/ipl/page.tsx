import type { Metadata } from "next";
import IplHeroBanner from "@/components/ipl/IplHeroBanner";
import IplLiveCard from "@/components/ipl/IplLiveCard";
import IplPointsTable from "@/components/ipl/IplPointsTable";
import IplScheduleStrip from "@/components/ipl/IplScheduleStrip";
import IplStatsWidget from "@/components/ipl/IplStatsWidget";
import IplNewsCard from "@/components/ipl/IplNewsCard";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "IPL 2026 Live Scores, Points Table & News | Rizz Jobs",
  description: "Follow IPL 2026 live scores, full scorecards, points table, orange cap, purple cap, schedule and latest news.",
  openGraph: {
    title: "IPL 2026 Live Scores | Rizz Jobs",
    description: "Live IPL scores, points table, stats and news in one place.",
    type: "website",
  },
};

async function fetchJson(url: string, rev = 120) {
  try {
    const res = await fetch(url, { next: { revalidate: rev } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Stats row shape from stats/v1/series/{id}?statsType=mostRuns
interface StatRow {
  id?: number;
  name?: string;
  teamName?: string;
  teamSName?: string;
  value?: string | number;
  imageId?: number;
}

export default async function IplHubPage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  const [liveData, seriesData, statsData, newsData] = await Promise.all([
    fetchJson(`${base}/api/ipl/live`, 120),
    fetchJson(`${base}/api/ipl/series-data`, 1800),
    fetchJson(`${base}/api/ipl/stats`, 3600),
    fetchJson(`${base}/api/ipl/news`, 900),
  ]);

  // ── Live matches ──────────────────────────────────────────────────────────
  const liveMatches = liveData?.matches ?? [];
  const firstLive = liveMatches[0]?.matchInfo
    ? {
        matchId: liveMatches[0].matchInfo.matchId,
        team1: liveMatches[0].matchInfo.team1,
        team2: liveMatches[0].matchInfo.team2,
        team1Score: liveMatches[0].matchScore?.team1Score,
        team2Score: liveMatches[0].matchScore?.team2Score,
        status: liveMatches[0].matchInfo.status,
        matchDesc: liveMatches[0].matchInfo.matchDesc,
        venueInfo: liveMatches[0].matchInfo.venueInfo,
      }
    : undefined;

  // ── Upcoming ──────────────────────────────────────────────────────────────
  const upcoming = seriesData?.upcoming ?? [];
  const nextMatch = upcoming[0]?.matchInfo;

  // ── Points table (computed, already normalized in series-data route) ──────
  // Shape: { teamId, teamSName, played, won, lost, nr, points }
  const ptRows = (seriesData?.pointsTable ?? []).map(
    (r: { teamId: number; teamSName: string; played: number; won: number; lost: number; nr: number; points: number }) => ({
      teamId: r.teamId,
      teamName: r.teamSName,
      teamSName: r.teamSName,
      matchesPlayed: r.played,
      matchesWon: r.won,
      matchesLost: r.lost,
      noResult: r.nr,
      points: r.points,
    })
  );

  // ── Orange / Purple cap ───────────────────────────────────────────────────
  // stats/v1/series response: { t20StatsList: [{ values: [{ name, id, teamSName, value, ... }] }] }
  const orangeCapRaw: StatRow[] = statsData?.orangeCap?.t20StatsList?.[0]?.values ?? [];
  const purpleCapRaw: StatRow[] = statsData?.purpleCap?.t20StatsList?.[0]?.values ?? [];

  const mapCap = (arr: StatRow[]) =>
    arr.slice(0, 5).map((p) => ({
      playerId: p.id ?? 0,
      playerName: p.name ?? "",
      teamSName: p.teamSName ?? "",
      value: typeof p.value === "number" ? p.value : parseInt(String(p.value ?? "0")) || 0,
      imageId: p.imageId,
    }));

  const orangeCap = mapCap(orangeCapRaw);
  const purpleCap = mapCap(purpleCapRaw);

  // ── News ──────────────────────────────────────────────────────────────────
  // news/v1/series/{id} returns { storyList: [{ story: {...} }, ...] }
  const newsItems = (newsData?.storyList ?? [])
    .filter((n: { story?: unknown }) => n.story)
    .slice(0, 6)
    .map((n: { story: { id: number; headline: string; intro?: string; coverImage?: { id: number }; publishTime?: number } }) => n.story);

  // ── Upcoming fixture strip ─────────────────────────────────────────────────
  const fixtureMatches = upcoming.slice(0, 10).map(
    (m: { matchInfo: { matchId: number; team1: { teamSName: string }; team2: { teamSName: string }; startDate: string; venueInfo?: { ground: string; city: string }; state: string; status?: string } }) => ({
      matchId: m.matchInfo.matchId,
      team1: m.matchInfo.team1,
      team2: m.matchInfo.team2,
      startDate: m.matchInfo.startDate,
      venueInfo: m.matchInfo.venueInfo,
      state: m.matchInfo.state,
      status: m.matchInfo.status,
    })
  );

  return (
    <div>
      {/* Hero */}
      <IplHeroBanner
        liveMatch={firstLive}
        nextMatch={
          nextMatch
            ? {
                team1: nextMatch.team1,
                team2: nextMatch.team2,
                startDate: nextMatch.startDate,
                venueInfo: nextMatch.venueInfo,
              }
            : undefined
        }
      />

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">

        {/* Live scores + Points table 60/40 */}
        {(liveMatches.length > 0 || ptRows.length > 0) && (
          <section>
            <div className="flex flex-col lg:flex-row gap-6">
              {liveMatches.length > 0 && (
                <div className="lg:w-3/5 space-y-4">
                  <h2 className="text-lg font-bold uppercase tracking-wider" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
                    Live
                  </h2>
                  {liveMatches.map((m: {
                    matchInfo: { matchId: number; team1: { teamSName: string }; team2: { teamSName: string }; status?: string };
                    matchScore?: { team1Score?: { inngs1?: { runs: number; wickets: number; overs: number } }; team2Score?: { inngs1?: { runs: number; wickets: number; overs: number } } };
                    leanback?: { miniscore?: Parameters<typeof IplLiveCard>[0]["leanback"] extends { miniscore?: infer M } ? M : unknown };
                  }) => (
                    <IplLiveCard
                      key={m.matchInfo.matchId}
                      matchId={m.matchInfo.matchId}
                      team1={m.matchInfo.team1}
                      team2={m.matchInfo.team2}
                      team1Score={m.matchScore?.team1Score}
                      team2Score={m.matchScore?.team2Score}
                      status={m.matchInfo.status}
                      leanback={m.leanback as Parameters<typeof IplLiveCard>[0]["leanback"]}
                    />
                  ))}
                </div>
              )}

              {ptRows.length > 0 && (
                <div className={liveMatches.length > 0 ? "lg:w-2/5" : "w-full"}>
                  <h2 className="text-lg font-bold uppercase tracking-wider mb-4" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
                    Points Table
                  </h2>
                  <IplPointsTable rows={ptRows} />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Upcoming fixtures */}
        {fixtureMatches.length > 0 && (
          <section>
            <h2 className="text-lg font-bold uppercase tracking-wider mb-4" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
              Upcoming Fixtures
            </h2>
            <IplScheduleStrip matches={fixtureMatches} />
          </section>
        )}

        {/* Orange + Purple cap */}
        {(orangeCap.length > 0 || purpleCap.length > 0) && (
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {orangeCap.length > 0 && (
                <IplStatsWidget title="Orange Cap" players={orangeCap} unit="runs" accent="#FF5A1F" />
              )}
              {purpleCap.length > 0 && (
                <IplStatsWidget title="Purple Cap" players={purpleCap} unit="wkts" accent="#A855F7" />
              )}
            </div>
          </section>
        )}

        {/* News */}
        {newsItems.length > 0 && (
          <section>
            <h2 className="text-lg font-bold uppercase tracking-wider mb-4" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
              Latest IPL News
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {newsItems.map((n: { id: number; headline: string; intro?: string; coverImage?: { id: number }; publishTime?: number }) => (
                <IplNewsCard
                  key={n.id}
                  id={n.id}
                  headline={n.headline}
                  intro={n.intro}
                  imageId={n.coverImage?.id}
                  publishTime={n.publishTime}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
