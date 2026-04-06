import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import IplLiveSection from "@/components/ipl/IplLiveSection";
import IplPointsTable from "@/components/ipl/IplPointsTable";
import IplScheduleStrip from "@/components/ipl/IplScheduleStrip";
import IplStatsWidget from "@/components/ipl/IplStatsWidget";
import IplNewsCard from "@/components/ipl/IplNewsCard";
import IplTeamBadge from "@/components/ipl/IplTeamBadge";
import { IPL_TEAMS, getTeamLogoUrl } from "@/lib/cricbuzz";

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

interface StatRow {
  id?: number;
  name?: string;
  teamSName?: string;
  value?: string | number;
  imageId?: number;
}

interface MatchInfo {
  matchId: number;
  team1: { teamSName: string };
  team2: { teamSName: string };
  startDate: string;
  venueInfo?: { ground: string; city: string };
  state: string;
  status?: string;
}

const SECTION_H2 = "text-xl md:text-2xl font-bold uppercase tracking-wider";
const SECTION_STYLE = { color: "#F0EDE6", fontFamily: "var(--font-ipl-display, sans-serif)" };
const VIEW_ALL_STYLE = { color: "#8BB0C8" };

export default async function IplHubPage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  const [liveData, seriesData, statsData, newsData] = await Promise.all([
    fetchJson(`${base}/api/ipl/live`, 120),
    fetchJson(`${base}/api/ipl/series-data`, 1800),
    fetchJson(`${base}/api/ipl/stats`, 3600),
    fetchJson(`${base}/api/ipl/news`, 900),
  ]);

  // ── Live ──────────────────────────────────────────────────────────────────
  const liveMatches = liveData?.matches ?? [];

  // ── Schedule (all series matches) ─────────────────────────────────────────
  const allSchedule: MatchInfo[] = (seriesData?.schedule ?? []).map(
    (m: { matchInfo: MatchInfo }) => m.matchInfo
  ).filter(Boolean);

  // Upcoming: not complete, sorted by date, up to 10
  const fixtureMatches = allSchedule
    .filter((m) => m.state !== "Complete")
    .sort((a, b) => parseInt(a.startDate) - parseInt(b.startDate))
    .slice(0, 10)
    .map((m) => ({
      matchId: m.matchId,
      team1: m.team1,
      team2: m.team2,
      startDate: m.startDate,
      venueInfo: m.venueInfo,
      state: m.state,
      status: m.status,
    }));

  const nextMatch = fixtureMatches[0]
    ? {
        team1: fixtureMatches[0].team1,
        team2: fixtureMatches[0].team2,
        startDate: fixtureMatches[0].startDate,
        venueInfo: fixtureMatches[0].venueInfo,
      }
    : undefined;

  // Recent: complete, latest first, up to 6 — prefer API recent, fallback to schedule
  const recentFromApi = seriesData?.recent ?? [];
  const recentRaw: MatchInfo[] = recentFromApi.length > 0
    ? recentFromApi.slice(0, 6).map(
        (m: { matchInfo: MatchInfo }) => m.matchInfo
      ).filter(Boolean)
    : allSchedule
        .filter((m) => m.state === "Complete")
        .sort((a, b) => parseInt(b.startDate) - parseInt(a.startDate))
        .slice(0, 6);

  const recentMatches = recentRaw.map((m) => ({
    matchId: m.matchId,
    team1: m.team1,
    team2: m.team2,
    startDate: m.startDate,
    venueInfo: m.venueInfo,
    state: m.state,
    status: m.status,
  }));

  // ── Points table ──────────────────────────────────────────────────────────
  const ptRows = (seriesData?.pointsTable ?? []).map(
    (r: { teamId: number; teamSName: string; played: number; won: number; lost: number; nr: number; points: number; lastFive?: string[] }) => ({
      teamId: r.teamId,
      teamName: r.teamSName,
      teamSName: r.teamSName,
      matchesPlayed: r.played,
      matchesWon: r.won,
      matchesLost: r.lost,
      noResult: r.nr,
      points: r.points,
      lastFive: r.lastFive ?? [],
    })
  );

  // ── Caps ──────────────────────────────────────────────────────────────────
  const orangeCapRaw: StatRow[] = statsData?.orangeCap?.t20StatsList?.[0]?.values
    ?? statsData?.orangeCap?.values
    ?? [];
  const purpleCapRaw: StatRow[] = statsData?.purpleCap?.t20StatsList?.[0]?.values
    ?? statsData?.purpleCap?.values
    ?? [];
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
  const newsItems = (newsData?.storyList ?? [])
    .filter((n: { story?: unknown }) => n.story)
    .slice(0, 6)
    .map((n: { story: { id: number; headline: string; intro?: string; coverImage?: { id: number }; publishTime?: number } }) => n.story);

  return (
    <div>
      {/* Hero + Live Scores — client component, polls every 30s */}
      <IplLiveSection
        initialMatches={liveMatches}
        nextMatch={nextMatch}
      />

      <div className="max-w-7xl mx-auto px-4 pb-10 space-y-16">

        {/* ── POINTS TABLE + RECENT ─────────────────────────────────────── */}
        <section>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            {/* Points Table */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className={SECTION_H2} style={SECTION_STYLE}>Points Table</h2>
                <Link href="/ipl/points-table" className="text-sm font-semibold" style={VIEW_ALL_STYLE}>Full Table →</Link>
              </div>
              {ptRows.length > 0 ? (
                <IplPointsTable rows={ptRows} />
              ) : (
                <div className="rounded-xl px-6 py-10 text-center" style={{ background: "#061624", border: "1px solid #0E2235" }}>
                  <p className="text-base" style={{ color: "#8BB0C8" }}>Points table not available yet</p>
                </div>
              )}
            </div>

            {/* Recent Results */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className={SECTION_H2} style={SECTION_STYLE}>Recent Results</h2>
                <Link href="/ipl/schedule?tab=finished" className="text-sm font-semibold" style={VIEW_ALL_STYLE}>All Results →</Link>
              </div>
              {recentMatches.length > 0 ? (
                <div className="space-y-2">
                  {recentMatches.map((m) => {
                    const t1 = Object.values(IPL_TEAMS).find((t) => t.fullName.includes(m.team1?.teamSName ?? ""));
                    const t2 = Object.values(IPL_TEAMS).find((t) => t.fullName.includes(m.team2?.teamSName ?? ""));
                    return (
                      <Link key={m.matchId} href={`/ipl/match/${m.matchId}`}>
                        <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ background: "#061624", border: "1px solid #0E2235" }}>
                          <IplTeamBadge shortName={m.team1?.teamSName ?? "T1"} bg={t1?.bg ?? "#1C3A6B"} color={t1?.color ?? "#E8E4DC"} size="sm" />
                          <span className="text-sm" style={{ color: "#6B86A0" }}>vs</span>
                          <IplTeamBadge shortName={m.team2?.teamSName ?? "T2"} bg={t2?.bg ?? "#1C3A6B"} color={t2?.color ?? "#E8E4DC"} size="sm" />
                          <p className="flex-1 text-sm truncate ml-2" style={{ color: "#22C55E" }}>{m.status}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl px-6 py-10 text-center" style={{ background: "#061624", border: "1px solid #0E2235" }}>
                  <p className="text-base" style={{ color: "#8BB0C8" }}>No recent results</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── SCHEDULE ──────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className={SECTION_H2} style={SECTION_STYLE}>Upcoming Schedule</h2>
            <Link href="/ipl/schedule" className="text-sm font-semibold" style={VIEW_ALL_STYLE}>Full Schedule →</Link>
          </div>
          {fixtureMatches.length > 0 ? (
            <IplScheduleStrip matches={fixtureMatches} />
          ) : (
            <div className="rounded-xl px-6 py-10 text-center" style={{ background: "#061624", border: "1px solid #0E2235" }}>
              <p className="text-base" style={{ color: "#8BB0C8" }}>No upcoming fixtures</p>
            </div>
          )}
        </section>

        {/* ── ORANGE + PURPLE CAP ───────────────────────────────────────── */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className={SECTION_H2} style={{ ...SECTION_STYLE, color: "#FF5A1F" }}>Orange Cap</h2>
                <Link href="/ipl/orange-cap" className="text-sm font-semibold" style={VIEW_ALL_STYLE}>Full List →</Link>
              </div>
              {orangeCap.length > 0 ? (
                <IplStatsWidget title="Orange Cap" players={orangeCap} unit="runs" accent="#FF5A1F" />
              ) : (
                <div className="rounded-xl px-6 py-10 text-center" style={{ background: "#061624", border: "1px solid #0E2235" }}>
                  <p className="text-base" style={{ color: "#8BB0C8" }}>Stats not available yet</p>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className={SECTION_H2} style={{ ...SECTION_STYLE, color: "#A855F7" }}>Purple Cap</h2>
                <Link href="/ipl/purple-cap" className="text-sm font-semibold" style={VIEW_ALL_STYLE}>Full List →</Link>
              </div>
              {purpleCap.length > 0 ? (
                <IplStatsWidget title="Purple Cap" players={purpleCap} unit="wkts" accent="#A855F7" />
              ) : (
                <div className="rounded-xl px-6 py-10 text-center" style={{ background: "#061624", border: "1px solid #0E2235" }}>
                  <p className="text-base" style={{ color: "#8BB0C8" }}>Stats not available yet</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── TEAMS ─────────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className={SECTION_H2} style={SECTION_STYLE}>Teams</h2>
            <Link href="/ipl/teams" className="text-sm font-semibold" style={VIEW_ALL_STYLE}>All Teams →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {Object.entries(IPL_TEAMS).map(([abbr, team]) => (
              <Link key={abbr} href={`/ipl/teams/${team.slug}`}>
                <div
                  className="rounded-xl p-4 flex flex-col items-center gap-3 cursor-pointer transition-transform hover:scale-105"
                  style={{ background: team.bg + "22", border: `2px solid ${team.bg}44` }}
                >
                  <div className="relative w-14 h-14 shrink-0">
                    <Image
                      src={getTeamLogoUrl(abbr)}
                      alt={team.fullName}
                      fill
                      className="object-contain"
                      unoptimized
                      onError={undefined}
                    />
                  </div>
                  <p className="text-xs font-semibold text-center leading-tight" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
                    {team.fullName}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── NEWS ──────────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className={SECTION_H2} style={SECTION_STYLE}>Latest News</h2>
            <Link href="/ipl/news" className="text-sm font-semibold" style={VIEW_ALL_STYLE}>All News →</Link>
          </div>
          {newsItems.length > 0 ? (
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
          ) : (
            <div className="rounded-xl px-6 py-10 text-center" style={{ background: "#061624", border: "1px solid #0E2235" }}>
              <p className="text-base" style={{ color: "#8BB0C8" }}>No news available yet</p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
