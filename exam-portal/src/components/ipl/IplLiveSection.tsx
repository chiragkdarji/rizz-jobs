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

const POLL_INTERVAL = 30_000; // 30s — halves API quota vs 15s; cricket commentary updates ~every 30s

const SECTION_H2 = "text-xl md:text-2xl font-bold uppercase tracking-wider";
const SECTION_STYLE = { color: "#F0EDE6", fontFamily: "var(--font-ipl-display, sans-serif)" };
const VIEW_ALL_STYLE = { color: "#8BB0C8" };

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
                const txt = item.commtxt ?? "";
                const inferredEv = ev.includes("WICKET") ? "WICKET" : ev === "SIX" ? "SIX" : ev === "FOUR" || ev === "BOUNDARY" ? "FOUR"
                  : txt.toUpperCase().includes(" SIX") ? "SIX" : txt.toUpperCase().includes(" FOUR") ? "FOUR"
                  : txt.toUpperCase().includes("OUT") || txt.toUpperCase().includes("WICKET") ? "WICKET" : null;
                const dotColor = inferredEv === "WICKET" ? "#EF4444" : inferredEv === "SIX" ? "#D4AF37" : inferredEv === "FOUR" ? "#3B82F6" : "#3A5670";
                const ovNum = item.overnum;
                return (
                  <div key={i} className="flex gap-3 px-4 py-3 text-xs" style={{ borderBottom: i < comm.slice(0, 8).length - 1 ? "1px solid #0E2235" : "none" }}>
                    <span className="shrink-0 w-10 text-right tabular-nums" style={{ color: "#6B86A0", fontFamily: "var(--font-ipl-stats, monospace)" }}>
                      {ovNum != null ? `${Math.floor(ovNum)}.${Math.round((ovNum % 1) * 10)}` : ""}
                    </span>
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-1" style={{ background: dotColor }} />
                    <p className="leading-relaxed" style={{ color: "#8BB0C8" }}>{txt}</p>
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
