import type { Metadata } from "next";
import Link from "next/link";
import LiveMatchGrid from "@/components/cricket/LiveMatchGrid";
import { extractMatches } from "@/lib/cricket-utils";
import type { MatchItem } from "@/components/cricket/LiveMatchCard";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "CricScore – Live Cricket Scores, ICC Rankings & Records",
  description:
    "Follow live cricket scores, ICC rankings, batting & bowling records, upcoming schedules and cricket news all in one place.",
  openGraph: {
    title: "CricScore – Live Cricket Scores",
    description: "Live scores, ICC rankings, records and news.",
    type: "website",
  },
};

async function safeFetch(url: string, rev = 60): Promise<unknown> {
  try {
    const res = await fetch(url, { next: { revalidate: rev } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const CARD =
  "rounded-xl p-4 flex flex-col gap-1 transition-all hover:border-[#FFB800]";
const CARD_STYLE = { background: "#12121A", border: "1px solid #2A2A3A" };

const FORMAT_LINKS = [
  { label: "Test", href: "/cricket/rankings?format=test" },
  { label: "ODI", href: "/cricket/rankings?format=odi" },
  { label: "T20I", href: "/cricket/rankings?format=t20" },
];

interface RankRow {
  rank?: string | number;
  name?: string;
  country?: string;
  rating?: string | number;
}

function extractRankings(data: unknown, max = 5): RankRow[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  const list = (d.rank ?? d.rankingData) as unknown[];
  if (!Array.isArray(list)) return [];
  return list.slice(0, max).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      rank: row.rank as string,
      name: (row.name ?? row.fullName) as string,
      country: row.country as string,
      rating: row.rating as string,
    };
  });
}

interface NewsStory {
  id: number;
  hline?: string;
  headline?: string;
  intro?: string;
  pubTime?: string | number;
}

export default async function CricketHubPage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  const [liveData, upcomingData, recentData, batRankData, newsData] =
    await Promise.all([
      safeFetch(`${base}/api/cricket/live`, 30),
      safeFetch(`${base}/api/cricket/upcoming`, 300),
      safeFetch(`${base}/api/cricket/recent`, 300),
      safeFetch(`${base}/api/cricket/rankings?category=batsmen&format=test`, 3600),
      safeFetch(`${base}/api/cricket/news`, 900),
    ]);

  const liveMatches: MatchItem[] = extractMatches(liveData);
  const upcomingMatches: MatchItem[] = extractMatches(upcomingData).slice(0, 6);
  const recentMatches: MatchItem[] = extractMatches(recentData).slice(0, 6);
  const topBatsmen = extractRankings(batRankData);

  const newsItems: NewsStory[] = ((newsData as { storyList?: { story?: NewsStory }[] })?.storyList ?? [])
    .filter((n) => n.story)
    .slice(0, 6)
    .map((n) => n.story as NewsStory);

  const H2 =
    "text-xl md:text-2xl font-bold uppercase tracking-wider";
  const H2_STYLE = {
    color: "#F0EDE8",
    fontFamily: "var(--font-cricket-display, sans-serif)",
  };

  return (
    <div>
      {/* Hero bar */}
      <div
        className="py-10 px-4 text-center"
        style={{
          background: "linear-gradient(180deg, #12121A 0%, #0A0A0F 100%)",
          borderBottom: "1px solid #2A2A3A",
        }}
      >
        <h1
          className="text-3xl md:text-5xl font-bold tracking-tight mb-2"
          style={{
            color: "#FFB800",
            fontFamily: "var(--font-cricket-display, sans-serif)",
          }}
        >
          🏏 CricScore
        </h1>
        <p className="text-sm" style={{ color: "#5A566A" }}>
          Live scores · ICC rankings · Records · News
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {[
            { label: "Live", href: "/cricket/live", color: "#FF3B3B" },
            { label: "Schedule", href: "/cricket/upcoming", color: "#FFB800" },
            { label: "Rankings", href: "/cricket/rankings", color: "#22C55E" },
            { label: "Records", href: "/cricket/records", color: "#A855F7" },
            { label: "News", href: "/cricket/news", color: "#38BDF8" },
            { label: "IPL 2026", href: "/ipl", color: "#FF6B00" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-semibold px-4 py-1.5 rounded-full transition-opacity hover:opacity-80"
              style={{ background: link.color + "22", color: link.color, border: `1px solid ${link.color}44` }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-14">

        {/* LIVE MATCHES */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className={H2} style={H2_STYLE}>
              <span style={{ color: "#FF3B3B" }}>● </span>Live Matches
            </h2>
            <Link
              href="/cricket/live"
              className="text-sm font-semibold"
              style={{ color: "#FFB800" }}
            >
              All Live →
            </Link>
          </div>
          <LiveMatchGrid
            initialData={liveMatches}
            apiUrl={`${base}/api/cricket/live`}
            pollIntervalMs={30_000}
            maxItems={6}
          />
        </section>

        {/* UPCOMING + RECENT */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-10">
          {/* Upcoming */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className={H2} style={H2_STYLE}>Upcoming</h2>
              <Link href="/cricket/upcoming" className="text-sm font-semibold" style={{ color: "#FFB800" }}>
                Full Schedule →
              </Link>
            </div>
            {upcomingMatches.length > 0 ? (
              <div className="space-y-2">
                {upcomingMatches.map((m) => {
                  const startMs = Number(m.matchInfo.startDate);
                  const dateStr = !isNaN(startMs)
                    ? new Date(startMs).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Kolkata",
                      })
                    : "";
                  return (
                    <Link key={m.matchInfo.matchId} href={`/ipl/match/${m.matchInfo.matchId}`}>
                      <div
                        className={CARD}
                        style={CARD_STYLE}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium" style={{ color: "#9A96A0" }}>
                            {m.matchInfo.team1.teamSName} vs {m.matchInfo.team2.teamSName}
                          </span>
                          <span className="text-xs" style={{ color: "#5A566A" }}>
                            {m.matchInfo.matchFormat}
                          </span>
                        </div>
                        <p className="text-xs truncate" style={{ color: "#5A566A" }}>
                          {m.matchInfo.seriesName} · {dateStr}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm py-8 text-center" style={{ color: "#5A566A" }}>
                No upcoming matches
              </p>
            )}
          </div>

          {/* Recent */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className={H2} style={H2_STYLE}>Recent Results</h2>
              <Link href="/cricket/live" className="text-sm font-semibold" style={{ color: "#FFB800" }}>
                All Results →
              </Link>
            </div>
            {recentMatches.length > 0 ? (
              <div className="space-y-2">
                {recentMatches.map((m) => (
                  <Link key={m.matchInfo.matchId} href={`/ipl/match/${m.matchInfo.matchId}`}>
                    <div className={CARD} style={CARD_STYLE}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium" style={{ color: "#9A96A0" }}>
                          {m.matchInfo.team1.teamSName} vs {m.matchInfo.team2.teamSName}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: "#22C55E22", color: "#22C55E" }}
                        >
                          Result
                        </span>
                      </div>
                      <p className="text-xs truncate" style={{ color: "#22C55E" }}>
                        {m.matchInfo.status}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm py-8 text-center" style={{ color: "#5A566A" }}>
                No recent results
              </p>
            )}
          </div>
        </section>

        {/* ICC RANKINGS PREVIEW */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className={H2} style={H2_STYLE}>ICC Rankings</h2>
            <Link href="/cricket/rankings" className="text-sm font-semibold" style={{ color: "#FFB800" }}>
              Full Rankings →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {FORMAT_LINKS.map((f) => (
              <Link key={f.href} href={f.href}>
                <div
                  className="rounded-xl p-3 text-center text-sm font-semibold transition-all hover:border-[#FFB800]"
                  style={{ background: "#12121A", border: "1px solid #2A2A3A", color: "#9A96A0" }}
                >
                  {f.label} Rankings
                </div>
              </Link>
            ))}
          </div>
          {topBatsmen.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #2A2A3A" }}>
              <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider" style={{ background: "#12121A", color: "#FFB800" }}>
                Top Test Batsmen
              </div>
              <table className="w-full text-sm" style={{ background: "#0E0E16" }}>
                <tbody>
                  {topBatsmen.map((r, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #2A2A3A" }}>
                      <td className="px-4 py-2 w-8 font-bold tabular-nums" style={{ color: "#FFB800" }}>
                        {r.rank}
                      </td>
                      <td className="px-4 py-2" style={{ color: "#F0EDE8" }}>
                        {r.name}
                      </td>
                      <td className="px-4 py-2" style={{ color: "#9A96A0" }}>
                        {r.country}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums" style={{ color: "#22C55E" }}>
                        {r.rating}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* QUICK LINKS: Records */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className={H2} style={H2_STYLE}>Records</h2>
            <Link href="/cricket/records" className="text-sm font-semibold" style={{ color: "#FFB800" }}>
              All Records →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {[
              { label: "Most Runs", href: "/cricket/records?statsType=mostRuns" },
              { label: "Most Wickets", href: "/cricket/records?statsType=mostWickets" },
              { label: "Highest Score", href: "/cricket/records?statsType=highestScore" },
              { label: "Most 100s", href: "/cricket/records?statsType=mostHundreds" },
              { label: "Best Bowling", href: "/cricket/records?statsType=bestBowlingInnings" },
            ].map((r) => (
              <Link key={r.href} href={r.href}>
                <div
                  className="rounded-xl p-3 text-center text-xs font-semibold transition-all hover:border-[#FFB800]"
                  style={{ background: "#12121A", border: "1px solid #2A2A3A", color: "#9A96A0" }}
                >
                  {r.label}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* NEWS */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className={H2} style={H2_STYLE}>Latest News</h2>
            <Link href="/cricket/news" className="text-sm font-semibold" style={{ color: "#FFB800" }}>
              All News →
            </Link>
          </div>
          {newsItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {newsItems.map((n) => {
                const pubMs = n.pubTime ? Number(n.pubTime) : 0;
                const pubDate =
                  pubMs > 0
                    ? new Date(pubMs).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "";
                return (
                  <Link key={n.id} href={`/ipl/news/${n.id}`}>
                    <div
                      className="rounded-xl p-4 h-full flex flex-col gap-2 transition-all hover:border-[#FFB800]"
                      style={{ background: "#12121A", border: "1px solid #2A2A3A" }}
                    >
                      <p className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: "#F0EDE8" }}>
                        {(n.hline ?? n.headline) as string}
                      </p>
                      {n.intro && (
                        <p className="text-xs leading-relaxed line-clamp-3" style={{ color: "#5A566A" }}>
                          {n.intro}
                        </p>
                      )}
                      {pubDate && (
                        <p className="text-xs mt-auto" style={{ color: "#5A566A" }}>
                          {pubDate}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm py-8 text-center" style={{ color: "#5A566A" }}>
              No news available
            </p>
          )}
        </section>

      </div>
    </div>
  );
}
