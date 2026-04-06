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

const POLL_INTERVAL = 30_000;

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
        // Preserve previous leanback if the new data has none (e.g. during drinks/rain breaks)
        setMatches((prev) =>
          (data.matches as typeof prev).map((m, idx) => ({
            ...m,
            leanback: m.leanback ?? prev[idx]?.leanback ?? undefined,
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
    </>
  );
}
