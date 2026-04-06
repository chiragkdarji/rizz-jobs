import type { Metadata } from "next";
import IplHeroBanner from "@/components/ipl/IplHeroBanner";
import IplLiveCard from "@/components/ipl/IplLiveCard";
import IplPointsTable from "@/components/ipl/IplPointsTable";
import IplScheduleStrip from "@/components/ipl/IplScheduleStrip";
import IplStatsWidget from "@/components/ipl/IplStatsWidget";
import IplNewsCard from "@/components/ipl/IplNewsCard";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "IPL 2025 Live Scores, Points Table & News | Rizz Jobs",
  description: "Follow IPL 2025 live scores, full scorecards, points table, orange cap, purple cap, schedule and latest news.",
  openGraph: {
    title: "IPL 2025 Live Scores | Rizz Jobs",
    description: "Live IPL scores, points table, stats and news in one place.",
    type: "website",
  },
};

async function fetchJson(url: string) {
  try {
    const res = await fetch(url, { next: { revalidate: 120 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function IplHubPage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  const [liveData, seriesData, statsData, newsData] = await Promise.all([
    fetchJson(`${base}/api/ipl/live`),
    fetchJson(`${base}/api/ipl/series-data`),
    fetchJson(`${base}/api/ipl/stats`),
    fetchJson(`${base}/api/ipl/news`),
  ]);

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

  const upcoming = seriesData?.upcoming ?? [];
  const nextMatch = upcoming[0]?.matchInfo;

  // Parse points table rows
  const ptRaw = seriesData?.pointsTable?.pointsTableInfo ?? [];
  const ptRows = ptRaw.flatMap((group: { pointsTableDTO?: unknown[] }) => group.pointsTableDTO ?? []).map(
    (r: {
      teamId: number;
      teamName: string;
      teamSName: string;
      matchesPlayed: number;
      matchesWon: number;
      matchesLost: number;
      noResult: number;
      points: number;
      nrr?: string;
      lastFive?: string[];
    }) => ({
      teamId: r.teamId,
      teamName: r.teamName,
      teamSName: r.teamSName,
      matchesPlayed: r.matchesPlayed,
      matchesWon: r.matchesWon,
      matchesLost: r.matchesLost,
      noResult: r.noResult,
      points: r.points,
      nrr: r.nrr,
      lastFive: r.lastFive,
    })
  );

  // Parse orange/purple cap
  const orangeCapRaw = statsData?.orangeCap?.values?.[0]?.stats ?? [];
  const purpleCapRaw = statsData?.purpleCap?.values?.[0]?.stats ?? [];

  const mapCapStats = (arr: { id: number; name: string; teamName: string; teamSName: string; value: string; matchesPlayed: number; imageId?: number }[], valueKey = "value") =>
    arr.slice(0, 5).map((p) => ({
      playerId: p.id,
      playerName: p.name,
      teamName: p.teamName,
      teamSName: p.teamSName,
      value: parseInt(p[valueKey as keyof typeof p] as string) || 0,
      imageId: p.imageId,
    }));

  const orangeCap = mapCapStats(orangeCapRaw);
  const purpleCap = mapCapStats(purpleCapRaw);

  // News articles
  const newsItems = newsData?.storyList
    ?.filter((n: { story?: unknown }) => n.story)
    .slice(0, 6)
    .map((n: { story: { id: number; hline: string; intro: string; imageId?: number; pubTime?: number } }) => n.story) ?? [];

  // Upcoming fixtures strip
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
      <IplHeroBanner liveMatch={firstLive} nextMatch={nextMatch ? { team1: nextMatch.team1, team2: nextMatch.team2, startDate: nextMatch.startDate, venueInfo: nextMatch.venueInfo } : undefined} />

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">

        {/* Live scores + Points table 60/40 */}
        {(liveMatches.length > 0 || ptRows.length > 0) && (
          <section>
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Live */}
              {liveMatches.length > 0 && (
                <div className="lg:w-3/5 space-y-4">
                  <h2 className="text-lg font-bold uppercase tracking-wider" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
                    Live
                  </h2>
                  {liveMatches.map((m: {
                    matchInfo: { matchId: number; team1: { teamSName: string }; team2: { teamSName: string }; status?: string; state?: string };
                    matchScore?: { team1Score?: { inngs1?: { runs: number; wickets: number; overs: number } }; team2Score?: { inngs1?: { runs: number; wickets: number; overs: number } } };
                    leanback?: unknown;
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

              {/* Points table */}
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
              {newsItems.map((n: { id: number; hline: string; intro?: string; imageId?: number; pubTime?: number }) => (
                <IplNewsCard
                  key={n.id}
                  id={n.id}
                  headline={n.hline}
                  intro={n.intro}
                  imageId={n.imageId}
                  publishTime={n.pubTime}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
