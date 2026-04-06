"use client";

import { useEffect, useState, useCallback } from "react";
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

const POLL_INTERVAL = 30_000; // 30 seconds

export default function IplLiveSection({ initialMatches, nextMatch }: Props) {
  const [matches, setMatches] = useState<LiveMatch[]>(initialMatches);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const refresh = useCallback(async () => {
    try {
      // cache-bust so browser doesn't serve a stale cached response
      const res = await fetch(`/api/ipl/live?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.matches) {
        setMatches(data.matches);
        setLastUpdated(new Date());
      }
    } catch {
      // silently ignore — keep showing last known data
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
      {/* Hero */}
      <IplHeroBanner liveMatch={firstLive} nextMatch={nextMatch} />

      {/* Live Scores section body — rendered by parent, but scores injected here */}
      {matches.length > 0 && (
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
          <p className="text-right text-xs" style={{ color: "#3A5670" }}>
            Updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" })} IST
          </p>
        </div>
      )}
    </>
  );
}
