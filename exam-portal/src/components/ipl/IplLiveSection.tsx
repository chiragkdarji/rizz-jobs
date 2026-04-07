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
  ballNbr?: number;
  overNumber?: number;
  commText?: string;
  event?: string;
}

interface LiveMatch {
  matchInfo: {
    matchId: number;
    team1: { teamSName: string };
    team2: { teamSName: string };
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

const POLL_INTERVAL = 15_000; // 15s — fast enough for live cricket, respectful of API limits

const SECTION_H2 = "text-xl md:text-2xl font-bold uppercase tracking-wider";
const SECTION_STYLE = { color: "#F0EDE6", fontFamily: "var(--font-ipl-display, sans-serif)" };
const VIEW_ALL_STYLE = { color: "#8BB0C8" };

export default function IplLiveSection({ initialMatches, nextMatch }: Props) {
  const [matches, setMatches] = useState<LiveMatch[]>(initialMatches);
  // null on first render to avoid server/client timestamp mismatch (hydration error #418)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/ipl/live?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.matches) {
        // Preserve previous leanback + matchScore if the new poll has none
        // (e.g. during drinks/rain breaks, or transient API gaps)
        setMatches((prev) =>
          (data.matches as typeof prev).map((m, idx) => ({
            ...m,
            leanback: m.leanback ?? prev[idx]?.leanback ?? undefined,
            matchScore: m.matchScore ?? prev[idx]?.matchScore ?? undefined,
            commentary: (m.commentary && m.commentary.length > 0) ? m.commentary : prev[idx]?.commentary ?? [],
          }))
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

  const firstLive = matches[0]?.matchInfo
    ? {
        matchId: matches[0].matchInfo.matchId,
        team1: matches[0].matchInfo.team1,
        team2: matches[0].matchInfo.team2,
        team1Score: matches[0].matchScore?.team1Score,
        team2Score: matches[0].matchScore?.team2Score,
        status: matches[0].matchInfo.status,
        matchDesc: matches[0].matchInfo.matchDesc,
        venueInfo: matches[0].matchInfo.venueInfo,
      }
    : undefined;

  return (
    <>
      {/* Hero banner */}
      <IplHeroBanner liveMatch={firstLive} nextMatch={nextMatch} />

      {/* Live Scores section */}
      <div className="max-w-7xl mx-auto px-4 pt-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className={SECTION_H2} style={SECTION_STYLE}>Live Scores</h2>
          <Link href="/ipl/schedule" className="text-sm font-semibold" style={VIEW_ALL_STYLE}>
            View Schedule →
          </Link>
        </div>

        {matches.length > 0 ? (
          <div className="space-y-4">
            {matches.map((m) => (
              <div key={m.matchInfo.matchId}>
                <IplLiveCard
                  matchId={m.matchInfo.matchId}
                  team1={m.matchInfo.team1}
                  team2={m.matchInfo.team2}
                  team1Score={m.matchScore?.team1Score}
                  team2Score={m.matchScore?.team2Score}
                  status={m.matchInfo.status}
                  leanback={m.leanback}
                />
                {/* Inline commentary */}
                {m.commentary && m.commentary.length > 0 && (
                  <div className="rounded-b-xl -mt-1 overflow-hidden" style={{ background: "#040E1B", border: "1px solid #0E2235", borderTop: "none" }}>
                    <div className="px-4 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid #0E2235" }}>
                      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#6B86A0" }}>Ball-by-Ball</span>
                      <Link href={`/ipl/match/${m.matchInfo.matchId}/commentary`} className="text-xs font-semibold" style={{ color: "#D4AF37" }}>
                        Full →
                      </Link>
                    </div>
                    {[...m.commentary].reverse().slice(0, 8).map((item, i) => {
                      const ev = item.event?.toUpperCase();
                      const txt = item.commText ?? "";
                      const inferredEv = ev || (txt.toUpperCase().includes("SIX") ? "SIX" : txt.toUpperCase().includes("FOUR") ? "FOUR" : txt.toUpperCase().includes("OUT") || txt.toUpperCase().includes("WICKET") ? "WICKET" : null);
                      const dotColor = inferredEv === "WICKET" ? "#EF4444" : inferredEv === "SIX" ? "#D4AF37" : inferredEv === "FOUR" ? "#3B82F6" : "#3A5670";
                      return (
                        <div key={i} className="flex gap-3 px-4 py-2 text-xs" style={{ borderBottom: i < 7 ? "1px solid #0A1E30" : "none" }}>
                          <span className="shrink-0 w-10 text-right tabular-nums" style={{ color: "#3A5670", fontFamily: "var(--font-ipl-stats, monospace)" }}>
                            {item.overNumber != null ? `${item.overNumber}.${item.ballNbr}` : ""}
                          </span>
                          <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5" style={{ background: dotColor, flexShrink: 0 }} />
                          <p className="leading-relaxed" style={{ color: "#8BB0C8" }}>{txt}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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
    </>
  );
}
