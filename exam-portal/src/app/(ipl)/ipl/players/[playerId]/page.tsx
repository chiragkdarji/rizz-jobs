import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import PlayerBio from "@/components/ipl/PlayerBio";
import { IPL_TEAMS } from "@/lib/cricbuzz";

export const revalidate = 21600;

interface Props {
  params: Promise<{ playerId: string }>;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Accept "9582" or "9582-virat-kohli" — always returns the numeric part */
function extractNumericId(raw: string) {
  const m = raw.match(/^(\d+)/);
  return m ? m[1] : raw;
}

// ─── Data normalisers ─────────────────────────────────────────────────────────

interface PlayerInfo {
  name: string;
  nickName: string;
  role: string;
  intlTeam: string;
  dob: string;
  birthPlace: string;
  battingStyle: string;
  bowlingStyle: string;
  description: string;
  height: string;
  teams: string;
  imageSrc: string | null;
  recentBatting: Record<string, unknown>[];
  recentBowling: Record<string, unknown>[];
  rankings: Record<string, unknown> | undefined;
  iplTeam: { abbr: string; fullName: string; slug: string; bg: string; color: string } | null;
}

function extractPlayerInfo(data: unknown): PlayerInfo | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const raw = d.info as Record<string, unknown> | undefined;
  if (!raw) return null;

  // stats/v1 is flat; old players/v1 may nest under playerInfo
  const candidates: (Record<string, unknown> | undefined)[] = [
    raw.playerInfo as Record<string, unknown> | undefined,
    raw,
  ];

  for (const c of candidates) {
    if (!c) continue;
    const name = (c.name ?? c.fullName ?? c.shortName) as string | undefined;
    if (!name || typeof name !== "string" || name.length === 0) continue;

    const imageId = (c.faceImageId ?? c.imageId) as number | string | undefined;
    const imageUrl = (c.imageUrl ?? c.image) as string | undefined;

    // Resolve IPL team: prefer iplTeamId from API response, else match teams string
    const teamsStr = String(c.teams ?? "");
    const iplTeamId = d.iplTeamId as number | undefined;
    let iplTeam: PlayerInfo["iplTeam"] = null;

    if (iplTeamId) {
      const entry = Object.entries(IPL_TEAMS).find(([, t]) => t.id === iplTeamId);
      if (entry) iplTeam = { abbr: entry[0], ...entry[1] };
    }
    if (!iplTeam && teamsStr) {
      const entry = Object.entries(IPL_TEAMS).find(([, t]) => teamsStr.includes(t.fullName));
      if (entry) iplTeam = { abbr: entry[0], ...entry[1] };
    }

    return {
      name,
      nickName: String(c.nickName ?? ""),
      role: String(c.role ?? ""),
      intlTeam: String(c.intlTeam ?? c.country ?? c.teamName ?? ""),
      dob: String(c.DoB ?? c.dob ?? c.dateOfBirth ?? ""),
      birthPlace: String(c.birthPlace ?? c.placeOfBirth ?? ""),
      battingStyle: String(c.battingStyle ?? c.batStyle ?? c.bat ?? ""),
      bowlingStyle: String(c.bowlingStyle ?? c.bowlStyle ?? c.bowl ?? ""),
      description: String(c.description ?? c.bio ?? c.summary ?? ""),
      height: String(c.height ?? ""),
      teams: teamsStr,
      imageSrc: imageId && /^\d+$/.test(String(imageId))
        ? `/api/ipl/image?id=${imageId}&type=player`
        : imageUrl
          ? `/api/ipl/image?url=${encodeURIComponent(imageUrl)}`
          : null,
      recentBatting: Array.isArray(c.recentBatting) ? (c.recentBatting as Record<string, unknown>[]) : [],
      recentBowling: Array.isArray(c.recentBowling) ? (c.recentBowling as Record<string, unknown>[]) : [],
      rankings: c.rankings as Record<string, unknown> | undefined,
      iplTeam,
    };
  }
  return null;
}

interface StatRow { label: string; values: Record<string, string>; }

/**
 * Cricbuzz stats/v1 batting/bowling shape:
 *   { headers: ["ROWHEADER","Test","ODI","T20","IPL"],
 *     values: [{ values: ["Matches","43","42","56","102"] }, ...] }
 */
function normalizeStats(data: unknown): { headers: string[]; rows: StatRow[] } {
  const empty = { headers: [], rows: [] };
  if (!data || typeof data !== "object") return empty;
  const raw = data as Record<string, unknown>;
  const rawValues = raw.values;
  const headers = raw.headers as string[] | undefined;
  if (!Array.isArray(rawValues) || !Array.isArray(headers)) return empty;

  const formats = headers.filter((h) => h !== "ROWHEADER");
  const rows: StatRow[] = (rawValues as unknown[])
    .map((v) => {
      const rowItem = v as Record<string, unknown>;
      // Nested array format: { values: [label, col1, col2, ...] }
      const arr = rowItem.values as string[] | undefined;
      if (Array.isArray(arr)) {
        return {
          label: arr[0] ?? "",
          values: Object.fromEntries(formats.map((f, i) => [f, arr[i + 1] ?? "—"])),
        };
      }
      // Flat object format (fallback): { ROWHEADER: "...", Test: "...", ... }
      return {
        label: String(rowItem.ROWHEADER ?? ""),
        values: Object.fromEntries(formats.map((f) => [f, String(rowItem[f] ?? "—")])),
      };
    })
    .filter((r) => r.label.length > 0);

  return { headers: formats, rows };
}

interface CareerEntry { format: string; debut: string; lastPlayed: string; }

function normalizeCareer(data: unknown): CareerEntry[] {
  if (!data || typeof data !== "object") return [];
  const raw = data as Record<string, unknown>;
  const values = raw.values as { name: string; debut: string; lastPlayed: string }[] | undefined;
  if (!Array.isArray(values)) return [];
  return values
    .filter((v) => v.debut && v.debut !== "Not played")
    .map((v) => ({
      format: v.name.toUpperCase(),
      debut: v.debut,
      lastPlayed: v.lastPlayed,
    }));
}

interface NewsItem {
  id: number;
  headline: string;
  intro?: string;
  context?: string;
  pubTime?: string;
  imageId?: number;
  url: string;
}

function normalizeNews(news: unknown): NewsItem[] {
  if (!news || typeof news !== "object") return [];
  const raw = news as Record<string, unknown>;
  const list = (raw.storyList ?? raw.newsListItems ?? []) as unknown[];
  if (!Array.isArray(list)) return [];
  const items: NewsItem[] = [];
  for (const item of list) {
    const i = item as Record<string, unknown>;
    const story = (i.story ?? i) as Record<string, unknown>;
    const id = Number(story.id ?? 0);
    const headline = String(story.hline ?? story.headline ?? story.title ?? "");
    if (!headline || !id) continue;
    items.push({
      id,
      headline,
      intro: story.intro ? String(story.intro) : undefined,
      context: story.context ? String(story.context) : undefined,
      pubTime: story.pubTime ? String(story.pubTime) : undefined,
      imageId: story.imageId ? Number(story.imageId) : undefined,
      url: `/ipl/news/${id}`,
    });
    if (items.length >= 6) break;
  }
  return items;
}

interface RecentMatch {
  opponent: string;
  runs?: string; balls?: string; sr?: string; dismissal?: string;
  wickets?: string; overs?: string; economy?: string;
}

function normalizeRecentForm(list: Record<string, unknown>[]): { batting: RecentMatch[]; bowling: RecentMatch[] } {
  const batting: RecentMatch[] = [];
  const bowling: RecentMatch[] = [];
  for (const m of list.slice(0, 5)) {
    const opponent = String(m.oppositionTeamName ?? m.opponent ?? m.opposition ?? "");
    if (m.runs != null || m.balls != null) {
      batting.push({
        opponent,
        runs: m.runs != null ? String(m.runs) : undefined,
        balls: m.balls != null ? String(m.balls) : undefined,
        sr: m.strikeRate != null ? String(m.strikeRate) : undefined,
        dismissal: m.dismissal != null ? String(m.dismissal) : undefined,
      });
    }
    if (m.wickets != null || m.overs != null) {
      bowling.push({
        opponent,
        wickets: m.wickets != null ? String(m.wickets) : undefined,
        overs: m.overs != null ? String(m.overs) : undefined,
        economy: m.economy != null ? String(m.economy) : undefined,
      });
    }
  }
  return { batting, bowling };
}

interface Rankings {
  bat: { test: string | null; odi: string | null; t20: string | null } | null;
  bowl: { test: string | null; odi: string | null; t20: string | null } | null;
}

function normalizeRankings(rankings: Record<string, unknown> | undefined): Rankings | null {
  if (!rankings) return null;
  const parse = (arr: unknown[]): Rankings["bat"] => {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const r = arr[0] as Record<string, string>;
    const get = (fmt: string) => {
      const cur = r[`${fmt}Rank`];
      if (cur && cur !== "0") return cur;
      const best = r[`${fmt}BestRank`];
      if (best && best !== "0") return best;
      return null;
    };
    return { test: get("test"), odi: get("odi"), t20: get("t20") };
  };
  return {
    bat: parse((rankings.bat as unknown[]) ?? []),
    bowl: parse((rankings.bowl as unknown[]) ?? []),
  };
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { playerId: rawId } = await params;
  const numericId = extractNumericId(rawId);
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";
  try {
    const res = await fetch(`${base}/api/ipl/player/${numericId}`, { next: { revalidate: 21600 } });
    if (res.ok) {
      const data = await res.json();
      const info = extractPlayerInfo(data);
      if (info?.name) {
        const teamSuffix = info.iplTeam ? ` · ${info.iplTeam.fullName}` : (info.intlTeam ? ` · ${info.intlTeam}` : "");
        return {
          title: `${info.name}${teamSuffix} — IPL 2026 Stats | Rizz Jobs`,
          description: `${info.name} player profile — career stats, batting & bowling records, and latest cricket news for IPL 2026.`,
        };
      }
    }
  } catch {/* silently handle */}
  return { title: "Player Profile | Rizz Jobs" };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PlayerPage({ params }: Props) {
  const { playerId: rawId } = await params;
  const numericId = extractNumericId(rawId);

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";
  let playerData: {
    info?: unknown; career?: unknown; batting?: unknown; bowling?: unknown; news?: unknown; iplTeamId?: number;
  } | null = null;

  try {
    const res = await fetch(`${base}/api/ipl/player/${numericId}`, { next: { revalidate: 21600 } });
    if (res.ok) playerData = await res.json();
  } catch {/* silently handle */}

  const info = extractPlayerInfo(playerData);

  // SEO redirect: if URL has no name slug, redirect to canonical
  if (info?.name && rawId === numericId) {
    redirect(`/ipl/players/${numericId}-${slugify(info.name)}`);
  }

  const battingStats = normalizeStats(playerData?.batting);
  const bowlingStats = normalizeStats(playerData?.bowling);
  const careerEntries = normalizeCareer(playerData?.career);
  const recentForm = normalizeRecentForm(info?.recentBatting ?? []);
  const recentBowlingForm = normalizeRecentForm(info?.recentBowling ?? []);
  const newsItems = normalizeNews(playerData?.news);
  const rankings = normalizeRankings(info?.rankings);

  const hasBatting = battingStats.rows.length > 0;
  const hasBowling = bowlingStats.rows.length > 0;
  const hasStats = hasBatting || hasBowling || careerEntries.length > 0
    || recentForm.batting.length > 0 || recentBowlingForm.bowling.length > 0;

  if (!info?.name) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p style={{ color: "#6B86A0" }}>Player profile not available.</p>
        <p className="mt-2 text-xs" style={{ color: "#6B86A0" }}>
          Player data may not be available for this IPL season.
        </p>
      </div>
    );
  }

  const rankingEntries: { label: string; value: string; accent: string }[] = [];
  if (rankings?.bat) {
    const b = rankings.bat;
    if (b.test) rankingEntries.push({ label: "Test Bat", value: `#${b.test}`, accent: "#D4AF37" });
    if (b.odi) rankingEntries.push({ label: "ODI Bat", value: `#${b.odi}`, accent: "#D4AF37" });
    if (b.t20) rankingEntries.push({ label: "T20 Bat", value: `#${b.t20}`, accent: "#D4AF37" });
  }
  if (rankings?.bowl) {
    const b = rankings.bowl;
    if (b.test) rankingEntries.push({ label: "Test Bowl", value: `#${b.test}`, accent: "#7DD3E8" });
    if (b.odi) rankingEntries.push({ label: "ODI Bowl", value: `#${b.odi}`, accent: "#7DD3E8" });
    if (b.t20) rankingEntries.push({ label: "T20 Bowl", value: `#${b.t20}`, accent: "#7DD3E8" });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">

      {/* ── Hero ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#061624", border: "1px solid #0E2235" }}>
        {/* Team colour bar */}
        {info.iplTeam && (
          <div className="h-1.5 w-full" style={{ background: info.iplTeam.bg }} />
        )}
        <div className="p-6 flex flex-col sm:flex-row gap-6">
          {/* Photo */}
          <div
            className="relative shrink-0 rounded-2xl overflow-hidden mx-auto sm:mx-0"
            style={{ width: 160, height: 200, background: "#0E2235" }}
          >
            {info.imageSrc ? (
              <Image
                src={info.imageSrc}
                alt={info.name}
                fill
                className="object-cover object-top"
                unoptimized
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl" style={{ color: "#6B86A0" }}>
                👤
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-3 min-w-0">
            {/* Name */}
            <div>
              <h1 className="text-3xl font-bold leading-tight" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
                {info.name}
              </h1>
              {info.nickName && info.nickName !== info.name && (
                <p className="text-sm mt-0.5 italic" style={{ color: "#6B86A0" }}>&ldquo;{info.nickName}&rdquo;</p>
              )}
            </div>

            {/* Role + styles */}
            <div className="flex flex-wrap gap-2">
              {info.role && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "#0E2235", color: "#D4AF37" }}>
                  {info.role}
                </span>
              )}
              {info.battingStyle && (
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "#0E2235", color: "#8BB0C8" }}>
                  🏏 {info.battingStyle}
                </span>
              )}
              {info.bowlingStyle && (
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "#0E2235", color: "#8BB0C8" }}>
                  ⚡ {info.bowlingStyle}
                </span>
              )}
            </div>

            {/* Teams */}
            <div className="flex flex-wrap gap-2 items-center">
              {info.iplTeam && (
                <Link href={`/ipl/teams/${info.iplTeam.slug}`}>
                  <span
                    className="text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-opacity hover:opacity-80"
                    style={{ background: info.iplTeam.bg, color: info.iplTeam.color }}
                  >
                    {info.iplTeam.fullName}
                  </span>
                </Link>
              )}
              {info.intlTeam && (
                <span className="text-sm" style={{ color: "#8BB0C8" }}>
                  🌏 {info.intlTeam}
                </span>
              )}
            </div>

            {/* Personal info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ color: "#6B86A0" }}>
              {info.dob && <span>🎂 {info.dob}</span>}
              {info.birthPlace && <span>📍 {info.birthPlace}</span>}
              {info.height && <span>📏 {info.height}</span>}
            </div>

            {/* Rankings */}
            {rankingEntries.length > 0 && (
              <div className="flex flex-wrap gap-4 pt-1">
                {rankingEntries.map((r) => (
                  <div key={r.label} className="text-center">
                    <p className="text-xs" style={{ color: "#6B86A0" }}>{r.label}</p>
                    <p className="text-xl font-bold" style={{ color: r.accent }}>{r.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── About ── */}
      {info.description && (
        <div className="rounded-xl p-5" style={{ background: "#061624", border: "1px solid #0E2235" }}>
          <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "#6B86A0" }}>About</p>
          <PlayerBio text={info.description} />
        </div>
      )}

      {/* ── Career Details ── */}
      {careerEntries.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #0E2235" }}>
          <div className="px-4 py-3" style={{ background: "#061A2E" }}>
            <span className="font-bold text-sm uppercase tracking-wide" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
              Career Details
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ fontFamily: "var(--font-ipl-stats, monospace)" }}>
              <thead>
                <tr style={{ background: "#061624", borderBottom: "1px solid #0E2235" }}>
                  {["Format", "Debut", "Last Played"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-semibold uppercase tracking-wide" style={{ color: "#6B86A0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {careerEntries.map((entry) => (
                  <tr key={entry.format} style={{ borderBottom: "1px solid #0E2235", background: "#061624" }}>
                    <td className="px-4 py-2.5 font-bold" style={{ color: "#D4AF37" }}>{entry.format}</td>
                    <td className="px-4 py-2.5" style={{ color: "#8BB0C8" }}>{entry.debut}</td>
                    <td className="px-4 py-2.5" style={{ color: "#8BB0C8" }}>{entry.lastPlayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Batting Stats ── */}
      {hasBatting && (
        <StatsTable title="Batting Stats" headers={battingStats.headers} rows={battingStats.rows} />
      )}

      {/* ── Bowling Stats ── */}
      {hasBowling && (
        <StatsTable title="Bowling Stats" headers={bowlingStats.headers} rows={bowlingStats.rows} />
      )}

      {/* ── Recent Batting Form ── */}
      {recentForm.batting.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #0E2235" }}>
          <div className="px-4 py-3" style={{ background: "#061A2E" }}>
            <span className="font-bold text-sm uppercase tracking-wide" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
              Recent Batting Form
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ fontFamily: "var(--font-ipl-stats, monospace)" }}>
              <thead>
                <tr style={{ background: "#061624", borderBottom: "1px solid #0E2235" }}>
                  {["Opponent", "R", "B", "SR", "Dismissal"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wide" style={{ color: "#6B86A0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentForm.batting.map((m, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #0E2235", background: "#061624" }}>
                    <td className="px-3 py-2 font-semibold" style={{ color: "#E8E4DC" }}>{m.opponent || "—"}</td>
                    <td className="px-3 py-2 font-bold" style={{ color: "#E8E4DC" }}>{m.runs ?? "—"}</td>
                    <td className="px-3 py-2" style={{ color: "#6B86A0" }}>{m.balls ?? "—"}</td>
                    <td className="px-3 py-2" style={{ color: "#6B86A0" }}>{m.sr ?? "—"}</td>
                    <td className="px-3 py-2 max-w-xs truncate" style={{ color: "#6B86A0" }}>{m.dismissal ?? "not out"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Recent Bowling Form ── */}
      {recentBowlingForm.bowling.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #0E2235" }}>
          <div className="px-4 py-3" style={{ background: "#061A2E" }}>
            <span className="font-bold text-sm uppercase tracking-wide" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
              Recent Bowling Form
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ fontFamily: "var(--font-ipl-stats, monospace)" }}>
              <thead>
                <tr style={{ background: "#061624", borderBottom: "1px solid #0E2235" }}>
                  {["Opponent", "W", "O", "Economy"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wide" style={{ color: "#6B86A0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentBowlingForm.bowling.map((m, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #0E2235", background: "#061624" }}>
                    <td className="px-3 py-2 font-semibold" style={{ color: "#E8E4DC" }}>{m.opponent || "—"}</td>
                    <td className="px-3 py-2 font-bold" style={{ color: "#EF4444" }}>{m.wickets ?? "—"}</td>
                    <td className="px-3 py-2" style={{ color: "#6B86A0" }}>{m.overs ?? "—"}</td>
                    <td className="px-3 py-2" style={{ color: "#6B86A0" }}>{m.economy ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Latest News ── */}
      {newsItems.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #0E2235" }}>
          <div className="px-4 py-3" style={{ background: "#061A2E" }}>
            <span className="font-bold text-sm uppercase tracking-wide" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
              Latest News
            </span>
          </div>
          <ul>
            {newsItems.map((item) => (
              <li key={item.id} style={{ borderTop: "1px solid #0E2235" }}>
                <Link
                  href={item.url}
                  className="px-4 py-3 flex gap-3 items-start hover:bg-[#0E2235] transition-colors"
                  style={{ background: "#061624" }}
                >
                  {item.imageId && (
                    <div className="relative w-16 h-12 shrink-0 rounded overflow-hidden">
                      <Image
                        src={`/api/ipl/image?id=${item.imageId}&type=news`}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <p className="text-sm leading-snug font-medium" style={{ color: "#E8E4DC" }}>{item.headline}</p>
                    {item.intro && (
                      <p className="text-xs line-clamp-2" style={{ color: "#6B86A0" }}>{item.intro}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.context && (
                        <span className="text-xs" style={{ color: "#3A5470" }}>{item.context}</span>
                      )}
                      {item.pubTime && (
                        <span className="text-xs" style={{ color: "#3A5470" }}>
                          · {new Date(Number(item.pubTime)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fallback: no stats at all */}
      {!hasStats && (
        <p className="text-sm text-center py-4" style={{ color: "#6B86A0" }}>
          Career stats not available for this player.
        </p>
      )}
    </div>
  );
}

// ─── StatsTable component ────────────────────────────────────────────────────

function StatsTable({ title, headers, rows }: { title: string; headers: string[]; rows: StatRow[] }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #0E2235" }}>
      <div className="px-4 py-3" style={{ background: "#061A2E" }}>
        <span className="font-bold text-sm uppercase tracking-wide" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
          {title}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ fontFamily: "var(--font-ipl-stats, monospace)" }}>
          <thead>
            <tr style={{ background: "#061624", borderBottom: "1px solid #0E2235" }}>
              <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide" style={{ color: "#6B86A0" }}>Stat</th>
              {headers.map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wide" style={{ color: "#6B86A0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #0E2235", background: "#061624" }}>
                <td className="px-3 py-2 font-semibold" style={{ color: "#8BB0C8" }}>{row.label}</td>
                {headers.map((h) => (
                  <td key={h} className="px-3 py-2" style={{ color: "#E8E4DC" }}>{row.values[h] ?? "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
