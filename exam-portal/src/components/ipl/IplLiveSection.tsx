"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import IplHeroBanner from "./IplHeroBanner";
import IplLiveCard from "./IplLiveCard";

interface Innings {
  runs?: number;
  wickets?: number;
  overs?: number;
}

interface CommentaryItem {
  ballnbr?: number;
  overnum?: number;  // float e.g. 2.6 → over 2, ball 6
  commtxt?: string;
  eventtype?: string;
}

interface InningsScoreEntry {
  batTeamId?: number;
  runs?: number;
  wickets?: number;
  overs?: number;
}

interface LiveMatch {
  matchInfo: {
    matchId: number;
    team1: { teamSName: string; teamId?: number };
    team2: { teamSName: string; teamId?: number };
    status?: string;
    matchDesc?: string;
    venueInfo?: { city: string };
    state?: string;
  };
  matchScore?: {
    team1Score?: { inngs1?: Innings };
    team2Score?: { inngs1?: Innings };
  };
  leanback?: Parameters<typeof IplLiveCard>[0]["leanback"];
  commentary?: CommentaryItem[];
}

interface Props {
  initialMatches: LiveMatch[];
  nextMatch?: {
    team1: { teamSName: string };
    team2: { teamSName: string };
    startDate: string;
    venueInfo?: { city: string };
  };
}

const POLL_INTERVAL = 30_000; // 30s — halves API quota vs 15s; cricket commentary updates ~every 30s

const SECTION_H2 = "text-xl md:text-2xl font-bold uppercase tracking-wider";
const SECTION_STYLE = { color: "#F0EDE6", fontFamily: "var(--font-ipl-display, sans-serif)" };
const VIEW_ALL_STYLE = { color: "#8BB0C8" };

/** Count balls in curovsstats (mirrors IplLiveCard.parseRecentBalls) */
function parseCurOvBalls(curOv?: string, recentOvs?: string): number {
  const parse = (s: string): number => {
    const t = s.trim();
    if (!t) return 0;
    const parts = t.includes(",") ? t.split(",") : t.includes(" ") ? t.split(/\s+/) : t.split("");
    return parts.filter(Boolean).length;
  };
  if (curOv) return Math.min(parse(curOv), 5);
  if (!recentOvs) return 0;
  const segs = recentOvs.split("|").map((s) => s.trim()).filter(Boolean);
  return Math.min(parse(segs[segs.length - 1] ?? ""), 5);
}

/** When curovsstats has more balls than matchScore overs already reflects,
 *  advance the overs to match. Works for all cases:
 *  overs=13 + 1 ball → 13.1 | overs=15.5 + 6 balls → 15.6 (normalizeOvers→16) */
function applyOversFromBalls(
  score: { inngs1?: Innings } | undefined,
  ballsInOver: number
): { inngs1?: Innings } | undefined {
  if (!score?.inngs1 || ballsInOver <= 0) return score;
  const raw = score.inngs1.overs;
  if (raw == null) return score;
  const n = typeof raw === "string" ? parseFloat(raw as string) : (raw as number);
  if (isNaN(n)) return score;
  const complete = Math.floor(n);
  const existingBalls = Math.round((n - complete) * 10);
  if (ballsInOver <= existingBalls) return score; // curovsstats not ahead — no change
  return { inngs1: { ...score.inngs1, overs: complete + ballsInOver / 10 } };
}

/** Keep whichever innings score has more runs — cricket scores only go forward.
 *  Guards against edge CDN returning a stale response with an older run total. */
function keepHigherScore(
  next?: { inngs1?: Innings },
  prev?: { inngs1?: Innings }
): { inngs1?: Innings } | undefined {
  const nextR = next?.inngs1?.runs ?? -1;
  const prevR = prev?.inngs1?.runs ?? -1;
  if (nextR < 0 && prevR < 0) return undefined;
  return nextR >= prevR ? next : prev;
}

export default function IplLiveSection({ initialMatches, nextMatch }: Props) {
  const [matches, setMatches] = useState<LiveMatch[]>(initialMatches);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  // true until first client fetch completes — prevents showing stale SSR data
  const [loading, setLoading] = useState(initialMatches.length === 0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/ipl/live?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.matches) {
        setMatches((prev) =>
          (data.matches as typeof prev).map((m, idx) => {
            const p = prev[idx];
            return {
              ...m,
              leanback: m.leanback ?? p?.leanback ?? undefined,
              // Never show a lower run total than already displayed — stale CDN responses
              // can return an older matchScore while the client already has a higher count.
              matchScore: m.matchScore
                ? {
                    team1Score: { inngs1: keepHigherScore(m.matchScore.team1Score, p?.matchScore?.team1Score)?.inngs1 },
                    team2Score: { inngs1: keepHigherScore(m.matchScore.team2Score, p?.matchScore?.team2Score)?.inngs1 },
                  }
                : p?.matchScore ?? undefined,
              commentary: (m.commentary && m.commentary.length > 0) ? m.commentary : p?.commentary ?? [],
            };
          })
        );
        setLastUpdated(
          new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZone: "Asia/Kolkata",
          })
        );
      }
    } catch {
      // keep showing last known data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Immediate fetch on mount so we don't show stale SSR data for up to 30s
    refresh();

    const id = setInterval(() => {
      if (!document.hidden) refresh();
    }, POLL_INTERVAL);

    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const firstLive = (() => {
    const m = matches[0];
    if (!m?.matchInfo) return undefined;
    const ms = m.leanback?.miniscore as (Record<string, unknown> & {
      inningsScore?: InningsScoreEntry[];
      matchScoreDetails?: { inningsScoreList?: InningsScoreEntry[] };
    }) | undefined;
    const inningsList: InningsScoreEntry[] | undefined =
      ms?.inningsScore ?? ms?.matchScoreDetails?.inningsScoreList;
    const freshScore = (teamId: number | undefined) => {
      if (!Array.isArray(inningsList) || teamId == null) return undefined;
      const e = inningsList.find((x) => x.batTeamId === teamId);
      return e?.runs != null ? { inngs1: { runs: e.runs, wickets: e.wickets ?? 0, overs: e.overs } } : undefined;
    };
    const t1Id = m.matchInfo.team1.teamId;
    const t2Id = m.matchInfo.team2.teamId;
    const rawT1 = freshScore(t1Id) ?? m.matchScore?.team1Score;
    const rawT2 = freshScore(t2Id) ?? m.matchScore?.team2Score;

    // Derive precise overs from curovsstats ball count (same fix as IplLiveCard)
    const curovsstats = (ms as Record<string, unknown> | undefined)?.curovsstats as string | undefined;
    const recentOvsStats = (ms as Record<string, unknown> | undefined)?.recentOvsStats as string | undefined;
    const balls = parseCurOvBalls(curovsstats, recentOvsStats);
    const t1Batting = rawT2?.inngs1?.runs == null;
    const finalT1 = t1Batting ? applyOversFromBalls(rawT1, balls) : rawT1;
    const finalT2 = t1Batting ? rawT2 : applyOversFromBalls(rawT2, balls);

    return {
      matchId: m.matchInfo.matchId,
      team1: m.matchInfo.team1,
      team2: m.matchInfo.team2,
      team1Score: finalT1,
      team2Score: finalT2,
      status: m.matchInfo.status,
      matchDesc: m.matchInfo.matchDesc,
      venueInfo: m.matchInfo.venueInfo,
    };
  })();

  return (
    <>
      {/* Hero banner */}
      <IplHeroBanner liveMatch={firstLive} nextMatch={nextMatch} />

      {/* ── Live Scores ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 pt-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className={SECTION_H2} style={SECTION_STYLE}>Live Scores</h2>
          <Link href="/ipl/schedule" className="text-sm font-semibold" style={VIEW_ALL_STYLE}>
            View Schedule →
          </Link>
        </div>

        {loading ? (
          <div className="rounded-xl px-6 py-8 flex items-center gap-3" style={{ background: "#061624", border: "1px solid #0E2235" }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#3A5670" }} />
            <p className="text-sm" style={{ color: "#3A5670" }}>Fetching live scores…</p>
          </div>
        ) : matches.length > 0 ? (
          <div className="space-y-4">
            {matches.map((m) => (
              <IplLiveCard
                key={m.matchInfo.matchId}
                matchId={m.matchInfo.matchId}
                team1={m.matchInfo.team1}
                team2={m.matchInfo.team2}
                team1Score={m.matchScore?.team1Score}
                team2Score={m.matchScore?.team2Score}
                status={m.matchInfo.status}
                leanback={m.leanback}
              />
            ))}
            {lastUpdated && (
              <p className="text-right text-xs" style={{ color: "#3A5670" }}>
                Updated {lastUpdated} IST
              </p>
            )}
          </div>
        ) : (
          <div
            className="rounded-xl px-6 py-10 text-center"
            style={{ background: "#061624", border: "1px solid #0E2235" }}
          >
            <p className="text-base font-semibold" style={{ color: "#8BB0C8" }}>
              No live match right now
            </p>
            <p className="text-sm mt-1" style={{ color: "#6B86A0" }}>
              Check the schedule for the next game
            </p>
          </div>
        )}
      </div>

      {/* ── Ball-by-Ball (first live match with commentary) ──────────────── */}
      {(() => {
        const liveWithComm = matches.find((m) => m.commentary && m.commentary.length > 0);
        if (!liveWithComm) return null;
        const comm = liveWithComm.commentary!;
        const matchId = liveWithComm.matchInfo.matchId;
        return (
          <div className="max-w-7xl mx-auto px-4 pt-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className={SECTION_H2} style={SECTION_STYLE}>Ball-by-Ball</h2>
              <Link href={`/ipl/match/${matchId}/commentary`} className="text-sm font-semibold" style={VIEW_ALL_STYLE}>
                Full Commentary →
              </Link>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: "#040E1B", border: "1px solid #0E2235" }}>
              {comm.slice(0, 8).map((item, i) => {
                const ev = (item.eventtype ?? "").toUpperCase();
                // Strip Cricbuzz internal bold markers (B0$, B1$, etc.)
                const txt = (item.commtxt ?? "").replace(/B\d\$/g, "").replace(/\s{2,}/g, " ").trim();
                const txtU = txt.toUpperCase();

                // Detect event type — eventtype first, then infer from text
                const isWicket = ev.includes("WICKET") || ev === "OUT" ||
                  /,\s*(OUT|WICKET|STUMPED|CAUGHT|LBW|RUN\s*OUT|BOWLED)\b/i.test(txt);
                const isSix = ev === "SIX" || /,\s*SIX[^A-Z]/i.test(txt) || txtU.includes(", SIX,");
                const isFour = !isSix && (ev === "FOUR" || ev === "BOUNDARY" || /,\s*FOUR[^A-Z]/i.test(txt) || txtU.includes(", FOUR,"));
                const isWide = ev === "WIDE" || /,\s*WIDE[^A-Z]/i.test(txt);
                const isNoBall = ev.includes("NO_BALL") || ev.includes("NOBALL") || /,\s*NO[\s-]BALL/i.test(txt);

                const inferredEv = isWicket ? "WICKET" : isSix ? "SIX" : isFour ? "FOUR"
                  : isWide ? "WIDE" : isNoBall ? "NOBALL" : null;

                const dotColor = inferredEv === "WICKET" ? "#EF4444" : inferredEv === "SIX" ? "#D4AF37"
                  : inferredEv === "FOUR" ? "#3B82F6" : inferredEv === "WIDE" || inferredEv === "NOBALL" ? "#F59E0B" : "#3A5670";

                // Badge shown before the text for boundaries / wickets
                const badge = inferredEv === "FOUR" ? { label: "4", bg: "#1E3A5F", color: "#3B82F6", border: "#3B82F6" }
                  : inferredEv === "SIX" ? { label: "6", bg: "#3B2A00", color: "#D4AF37", border: "#D4AF37" }
                  : inferredEv === "WICKET" ? { label: "W", bg: "#3B0000", color: "#EF4444", border: "#EF4444" }
                  : inferredEv === "WIDE" ? { label: "Wd", bg: "#2A1F00", color: "#F59E0B", border: "#F59E0B" }
                  : inferredEv === "NOBALL" ? { label: "Nb", bg: "#2A1F00", color: "#F59E0B", border: "#F59E0B" }
                  : null;

                // Bold the result word: "Bowler to Bat, RESULT, desc…"
                const commaIdx = txt.indexOf(",");
                const commaIdx2 = commaIdx >= 0 ? txt.indexOf(",", commaIdx + 1) : -1;
                const prefix = commaIdx >= 0 ? txt.slice(0, commaIdx + 1) : txt;
                const result = commaIdx >= 0 && commaIdx2 > commaIdx ? txt.slice(commaIdx + 1, commaIdx2) : "";
                const rest = commaIdx2 >= 0 ? txt.slice(commaIdx2) : "";

                const ovNum = item.overnum;
                return (
                  <div key={i} className="flex gap-3 px-4 py-3 text-xs" style={{ borderBottom: i < comm.slice(0, 8).length - 1 ? "1px solid #0E2235" : "none" }}>
                    <span className="shrink-0 w-10 text-right tabular-nums" style={{ color: "#6B86A0", fontFamily: "var(--font-ipl-stats, monospace)" }}>
                      {ovNum != null ? `${Math.floor(ovNum)}.${Math.round((ovNum % 1) * 10)}` : ""}
                    </span>
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-[3px]" style={{ background: dotColor }} />
                    {badge && (
                      <span className="shrink-0 h-5 min-w-[20px] px-1 text-[10px] font-black rounded-full flex items-center justify-center"
                        style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, fontFamily: "var(--font-ipl-stats, monospace)" }}>
                        {badge.label}
                      </span>
                    )}
                    <p className="leading-relaxed" style={{ color: "#8BB0C8" }}>
                      <span>{prefix}</span>
                      {result && (
                        <strong style={{ color: dotColor !== "#3A5670" ? dotColor : "#E8E4DC" }}>{result}</strong>
                      )}
                      <span>{rest}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </>
  );
}
