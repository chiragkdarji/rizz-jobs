import type { Metadata } from "next";
import Image from "next/image";
import PlayerBio from "@/components/ipl/PlayerBio";

export const revalidate = 21600;

interface Props {
  params: Promise<{ playerId: string }>;
}

/**
 * Normalise Cricbuzz player info from stats/v1/player/{id}.
 * Response shape: { info: { name, fullName, DoB, birthPlace, role, bat, bowl, intlTeam, image, imageUrl, ... } }
 */
function extractPlayerInfo(data: unknown) {
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
    if (name && typeof name === "string" && name.length > 0) {
      // image: prefer numeric imageId for proxy; fall back to full URL
      const imageId = (c.faceImageId ?? c.imageId) as number | string | undefined;
      const imageUrl = (c.imageUrl ?? c.image) as string | undefined;

      return {
        name,
        role: String(c.role ?? ""),
        intlTeam: String(c.intlTeam ?? c.country ?? c.teamName ?? ""),
        // stats/v1 uses "DoB"; old api uses "dob" / "dateOfBirth"
        dob: String(c.DoB ?? c.dob ?? c.dateOfBirth ?? ""),
        birthPlace: String(c.birthPlace ?? c.placeOfBirth ?? ""),
        // stats/v1 uses "bat" / "bowl" for styles
        battingStyle: String(c.battingStyle ?? c.batStyle ?? c.bat ?? ""),
        bowlingStyle: String(c.bowlingStyle ?? c.bowlStyle ?? c.bowl ?? ""),
        description: String(c.description ?? c.bio ?? c.summary ?? ""),
        // Numeric id → use /api/ipl/image?id=; full URL → use /api/ipl/image?url=
        imageSrc: imageId && /^\d+$/.test(String(imageId))
          ? `/api/ipl/image?id=${imageId}&type=player`
          : imageUrl
            ? `/api/ipl/image?url=${encodeURIComponent(imageUrl)}`
            : null,
        // recent form lives inside info for stats/v1
        recentBatting: Array.isArray(c.recentBatting) ? c.recentBatting as Record<string, unknown>[] : [],
        recentBowling: Array.isArray(c.recentBowling) ? c.recentBowling as Record<string, unknown>[] : [],
      };
    }
  }

  return null;
}

interface StatRow {
  label: string;
  values: Record<string, string>;
}

/**
 * Normalise stats/v1/player/{id}/batting or /bowling response.
 * Shape: { values: [{ ROWHEADER: "Matches", Test: "90", ODI: "350", T20: "98", IPL: "264" }, ...],
 *           headers: ["ROWHEADER", "Test", "ODI", "T20", "IPL"] }
 */
function normalizeStats(data: unknown): { headers: string[]; rows: StatRow[] } {
  const empty = { headers: [], rows: [] };
  if (!data || typeof data !== "object") return empty;
  const raw = data as Record<string, unknown>;
  const values = raw.values as Record<string, string>[] | undefined;
  const headers = raw.headers as string[] | undefined;
  if (!Array.isArray(values) || !Array.isArray(headers)) return empty;

  // Format columns = headers minus "ROWHEADER"
  const formats = headers.filter((h) => h !== "ROWHEADER");
  const rows: StatRow[] = values
    .map((v) => ({
      label: String(v.ROWHEADER ?? ""),
      values: Object.fromEntries(formats.map((f) => [f, String(v[f] ?? "—")])),
    }))
    .filter((r) => r.label.length > 0);

  return { headers: formats, rows };
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

  let playerData: {
    info?: unknown;
    career?: unknown;
    batting?: unknown;
    bowling?: unknown;
    news?: unknown;
  } | null = null;

  try {
    const res = await fetch(`${base}/api/ipl/player/${playerId}`, { next: { revalidate: 21600 } });
    if (res.ok) playerData = await res.json();
  } catch {/* silently handle */}

  const info = extractPlayerInfo(playerData);
  const battingStats = normalizeStats(playerData?.batting);
  const bowlingStats = normalizeStats(playerData?.bowling);
  const recentForm = normalizeRecentForm(info?.recentBatting ?? []);
  const recentBowlingForm = normalizeRecentForm(info?.recentBowling ?? []);
  const newsItems = normalizeNews(playerData?.news);

  const hasBatting = battingStats.rows.length > 0;
  const hasBowling = bowlingStats.rows.length > 0;
  const hasRecentBatting = recentForm.batting.length > 0;
  const hasRecentBowling = recentBowlingForm.bowling.length > 0;

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Player header */}
      <div className="flex items-center gap-6 p-6 rounded-2xl" style={{ background: "#061624", border: "1px solid #0E2235" }}>
        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-[#0E2235] shrink-0">
          {info.imageSrc ? (
            <Image
              src={info.imageSrc}
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

      {/* Batting Stats */}
      {hasBatting && (
        <StatsTable title="Batting Stats" headers={battingStats.headers} rows={battingStats.rows} />
      )}

      {/* Bowling Stats */}
      {hasBowling && (
        <StatsTable title="Bowling Stats" headers={bowlingStats.headers} rows={bowlingStats.rows} />
      )}

      {/* Recent Batting Form */}
      {hasRecentBatting && (
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
      {hasRecentBowling && (
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
      {!hasBatting && !hasBowling && !hasRecentBatting && !hasRecentBowling && (
        <p className="text-sm text-center py-4" style={{ color: "#6B86A0" }}>
          Career stats not available for this player.
        </p>
      )}
    </div>
  );
}

function StatsTable({ title, headers, rows }: { title: string; headers: string[]; rows: { label: string; values: Record<string, string> }[] }) {
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
              <tr key={i} style={{ borderBottom: "1px solid #0E2235" }}>
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
