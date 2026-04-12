import type { Metadata } from "next";
import Image from "next/image";
import PlayerBio from "@/components/ipl/PlayerBio";

export const revalidate = 21600;

interface Props {
  params: Promise<{ playerId: string }>;
}

/** Normalise Cricbuzz player info.
 *  Handles both old players/v1 shape and new stats/v1/player shape:
 *   { playerInfo: { id, name, role, ... } }   ← stats/v1/player/{id}
 *   { id, name, role, ... }                   ← flat fallback
 */
function extractPlayerInfo(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const raw = d.info as Record<string, unknown> | undefined;
  if (!raw) return null;

  // Try each nesting level, most-specific first
  const candidates: (Record<string, unknown> | undefined)[] = [
    raw.playerInfo as Record<string, unknown> | undefined,
    (raw.playerInfo as Record<string, unknown> | undefined)?.bat as Record<string, unknown> | undefined,
    raw, // flat form: raw.name exists directly
  ];

  for (const c of candidates) {
    if (!c) continue;
    const name = (c.name ?? c.fullName ?? c.shortName) as string | undefined;
    if (name && typeof name === "string" && name.length > 0) {
      return {
        name,
        role: String(c.role ?? c.bat ?? ""),
        intlTeam: String(c.intlTeam ?? c.country ?? c.teamName ?? ""),
        dob: String(c.dob ?? c.dateOfBirth ?? ""),
        birthPlace: String(c.birthPlace ?? c.placeOfBirth ?? ""),
        imageId: (c.faceImageId ?? c.imageId) as number | undefined,
        battingStyle: String(c.battingStyle ?? c.batStyle ?? ""),
        bowlingStyle: String(c.bowlingStyle ?? c.bowlStyle ?? ""),
        description: String(c.description ?? c.bio ?? c.summary ?? ""),
      };
    }
  }

  return null;
}

interface NewsItem {
  id: number;
  headline: string;
  context?: string;
  pubTime?: string;
  imageId?: number;
}

function normalizeNews(news: unknown): NewsItem[] {
  if (!news || typeof news !== "object") return [];
  const raw = news as Record<string, unknown>;
  // stats/v1 news response: { storyList: [ { story: { id, hline, context, pubTime, imageId } }, ... ] }
  const list = (raw.storyList ?? raw.newsListItems ?? []) as unknown[];
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, 6)
    .map((item: unknown) => {
      const i = item as Record<string, unknown>;
      const story = (i.story ?? i) as Record<string, unknown>;
      return {
        id: Number(story.id ?? 0),
        headline: String(story.hline ?? story.headline ?? story.title ?? ""),
        context: story.context ? String(story.context) : undefined,
        pubTime: story.pubTime ? String(story.pubTime) : undefined,
        imageId: story.imageId ? Number(story.imageId) : undefined,
      };
    })
    .filter((n) => n.headline.length > 0);
}

interface CareerRow {
  format: string;
  stats: { key: string; value: string }[];
}

function normalizeCareer(career: unknown): CareerRow[] {
  if (!career || typeof career !== "object") return [];
  const raw = career as Record<string, unknown>;
  const list = (
    (raw.plyrSeasonProjList ?? raw.careerSummary ?? raw.career) as unknown[] | undefined
  ) ?? [];
  if (!Array.isArray(list)) return [];
  return list
    .map((entry: unknown) => {
      const e = entry as Record<string, unknown>;
      const appIndex = e.appIndex as Record<string, unknown> | undefined;
      const format = String(appIndex?.seoTitle ?? appIndex?.seo ?? appIndex?.label ?? e.matchType ?? "Unknown");
      const stats = (e.stat ?? e.stats ?? []) as { key: string; value: string }[];
      return { format, stats: Array.isArray(stats) ? stats : [] };
    })
    .filter((r) => r.stats.length > 0);
}

interface RecentMatch {
  opponent: string;
  runs?: string;
  balls?: string;
  sr?: string;
  dismissal?: string;
  wickets?: string;
  overs?: string;
  economy?: string;
}

function normalizeRecentForm(data: unknown, type: "batting" | "bowling"): RecentMatch[] {
  if (!data || typeof data !== "object") return [];
  const raw = data as Record<string, unknown>;
  const key = type === "batting" ? "battingMatchList" : "bowlingMatchList";
  const list = ((raw as Record<string, unknown>)[key] ?? []) as unknown[];
  if (!Array.isArray(list)) return [];
  return list.slice(0, 5).map((m: unknown) => {
    const match = m as Record<string, unknown>;
    return {
      opponent: String(match.oppositionTeamName ?? match.opponent ?? match.opposition ?? ""),
      runs: match.runs != null ? String(match.runs) : undefined,
      balls: match.balls != null ? String(match.balls) : undefined,
      sr: match.strikeRate != null ? String(match.strikeRate) : undefined,
      dismissal: match.dismissal != null ? String(match.dismissal) : undefined,
      wickets: match.wickets != null ? String(match.wickets) : undefined,
      overs: match.overs != null ? String(match.overs) : undefined,
      economy: match.economy != null ? String(match.economy) : undefined,
    };
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { playerId } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";
  try {
    const res = await fetch(`${base}/api/ipl/player/${playerId}`, { next: { revalidate: 21600 } });
    if (res.ok) {
      const data = await res.json();
      const info = extractPlayerInfo(data);
      if (info?.name) return { title: `${info.name} — IPL 2026 Stats | Rizz Jobs` };
    }
  } catch {/* silently handle */}
  return { title: "Player Profile | Rizz Jobs" };
}

export default async function PlayerPage({ params }: Props) {
  const { playerId } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let playerData: { info?: unknown; career?: unknown; batting?: unknown; bowling?: unknown; news?: unknown } | null = null;

  try {
    const res = await fetch(`${base}/api/ipl/player/${playerId}`, { next: { revalidate: 21600 } });
    if (res.ok) playerData = await res.json();
  } catch {/* silently handle */}

  const info = extractPlayerInfo(playerData);
  const careerRows = normalizeCareer(playerData?.career);
  const recentBatting = normalizeRecentForm(playerData?.batting, "batting");
  const recentBowling = normalizeRecentForm(playerData?.bowling, "bowling");
  const newsItems = normalizeNews(playerData?.news);

  if (!info || !info.name) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p style={{ color: "#6B86A0" }}>Player profile not available.</p>
        <p className="mt-2 text-xs" style={{ color: "#6B86A0" }}>
          Player data may not be available for this IPL season.
        </p>
      </div>
    );
  }

  // Collect unique stat keys from career rows for table columns
  const statKeys = careerRows.length > 0
    ? Array.from(new Set(careerRows.flatMap((r) => r.stats.map((s) => s.key))))
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Player header */}
      <div className="flex items-center gap-6 p-6 rounded-2xl" style={{ background: "#061624", border: "1px solid #0E2235" }}>
        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-[#0E2235] shrink-0">
          {info.imageId ? (
            <Image
              src={`/api/ipl/image?id=${info.imageId}&type=player`}
              alt={info.name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl" style={{ color: "#6B86A0" }}>
              👤
            </div>
          )}
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
            {info.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {info.role && (
              <span className="text-sm" style={{ color: "#8BB0C8" }}>{info.role}</span>
            )}
            {info.intlTeam && (
              <span className="text-sm" style={{ color: "#8BB0C8" }}>· {info.intlTeam}</span>
            )}
            {info.battingStyle && (
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#0E2235", color: "#D4AF37" }}>
                {info.battingStyle}
              </span>
            )}
            {info.bowlingStyle && (
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#0E2235", color: "#8BB0C8" }}>
                {info.bowlingStyle}
              </span>
            )}
          </div>
          {info.dob && (
            <p className="text-xs" style={{ color: "#6B86A0" }}>
              Born: {info.dob}{info.birthPlace ? ` · ${info.birthPlace}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* Bio */}
      {info.description && (
        <div className="rounded-xl p-4" style={{ background: "#061624", border: "1px solid #0E2235" }}>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "#6B86A0" }}>About</p>
          <PlayerBio text={info.description} />
        </div>
      )}

      {/* Career Summary */}
      {careerRows.length > 0 && statKeys.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #0E2235" }}>
          <div className="px-4 py-3" style={{ background: "#061A2E" }}>
            <span className="font-bold text-sm uppercase tracking-wide" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
              Career Summary
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ fontFamily: "var(--font-ipl-stats, monospace)" }}>
              <thead>
                <tr style={{ background: "#061624", borderBottom: "1px solid #0E2235" }}>
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide" style={{ color: "#6B86A0" }}>Format</th>
                  {statKeys.map((k) => (
                    <th key={k} className="px-3 py-2 text-left font-semibold uppercase tracking-wide" style={{ color: "#6B86A0" }}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {careerRows.map((row, i) => {
                  const statMap = Object.fromEntries(row.stats.map((s) => [s.key, s.value]));
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #0E2235" }}>
                      <td className="px-3 py-2 font-semibold" style={{ color: "#E8E4DC" }}>{row.format}</td>
                      {statKeys.map((k) => (
                        <td key={k} className="px-3 py-2" style={{ color: "#8BB0C8" }}>{statMap[k] ?? "—"}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Batting Form */}
      {recentBatting.length > 0 && (
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
                {recentBatting.map((m, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #0E2235" }}>
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

      {/* Recent Bowling Form */}
      {recentBowling.length > 0 && (
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
                {recentBowling.map((m, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #0E2235" }}>
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

      {/* Player News */}
      {newsItems.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #0E2235" }}>
          <div className="px-4 py-3" style={{ background: "#061A2E" }}>
            <span className="font-bold text-sm uppercase tracking-wide" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
              Latest News
            </span>
          </div>
          <ul className="divide-y" style={{ borderColor: "#0E2235" }}>
            {newsItems.map((item) => (
              <li key={item.id} className="px-4 py-3 flex gap-3 items-start" style={{ background: "#061624" }}>
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
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm leading-snug" style={{ color: "#E8E4DC" }}>{item.headline}</p>
                  {item.context && (
                    <p className="text-xs truncate" style={{ color: "#6B86A0" }}>{item.context}</p>
                  )}
                  {item.pubTime && (
                    <p className="text-xs" style={{ color: "#3A5470" }}>
                      {new Date(Number(item.pubTime)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fallback if no stats available */}
      {careerRows.length === 0 && recentBatting.length === 0 && recentBowling.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: "#6B86A0" }}>
          Career stats not available for this player.
        </p>
      )}
    </div>
  );
}
