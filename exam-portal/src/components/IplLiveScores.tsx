"use client";

import { useEffect, useState } from "react";
import { IPL_TEAMS } from "@/lib/cricapi";

interface Score {
  r: number;
  w: number;
  o: number;
  inning: string;
}

interface TeamInfo {
  name: string;
  shortname: string;
  img?: string;
}

interface Match {
  id: string;
  name: string;
  status: string;
  venue?: string;
  dateTimeGMT?: string;
  teams?: string[];
  teamInfo?: TeamInfo[];
  score?: Score[];
}

function getShort(info: TeamInfo[] | undefined, teamName: string): string {
  const found = info?.find((t) => t.name === teamName);
  return found?.shortname ?? teamName.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase();
}

function formatScore(score?: Score): string {
  if (!score) return "Yet to bat";
  return `${score.r}/${score.w} (${score.o} ov)`;
}

/**
 * Find the score for a given team.
 * CricAPI inning names:
 *   "rajasthan royals Inning 1"          → RR batted (1st innings, may be lowercase)
 *   "Gujarat Titans,Rajasthan Royals Inning 1" → GT batting (2nd innings; first name before comma is batting team)
 */
function findTeamScore(scores: Score[] | undefined, teamName: string): Score | undefined {
  if (!scores?.length) return undefined;
  const key = teamName.split(" ")[0].toLowerCase();
  return scores.find((s) => {
    // Extract batting team: everything before the first comma (or before " inning" if no comma)
    const battingPart = s.inning.toLowerCase().split(",")[0].split(" inning")[0].trim();
    return battingPart.includes(key);
  });
}

const ENDED_KEYWORDS = ["won", "win", "draw", "tie", "no result", "abandoned"];

function isLive(m: Match): boolean {
  // currentMatches API has no matchStarted/matchEnded fields — infer from status string
  const s = m.status?.toLowerCase() ?? "";
  if (!s || ENDED_KEYWORDS.some((kw) => s.includes(kw))) return false;
  return true;
}

function isEnded(m: Match): boolean {
  const s = m.status?.toLowerCase() ?? "";
  return ENDED_KEYWORDS.some((kw) => s.includes(kw));
}

function LivePulse() {
  return (
    <span className="relative inline-flex items-center gap-1.5">
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ backgroundColor: "#22c55e", boxShadow: "0 0 0 0 #22c55e44", animation: "liveRing 1.4s ease-out infinite" }}
      />
      <span style={{ color: "#22c55e", fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
        LIVE
      </span>
    </span>
  );
}

export default function IplLiveScores() {
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/ipl/live");
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) {
          if (Array.isArray(data)) setMatches(data);
          else setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    load();
    const id = setInterval(load, 120_000); // refresh every 2 min
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center py-10 text-center"
        style={{ border: "1px solid #1e1e26", backgroundColor: "#0a0a0e" }}
      >
        <span style={{ fontSize: "28px", marginBottom: "8px" }}>⚠️</span>
        <p style={{ color: "#9898aa", fontSize: "13px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
          Could not load live scores
        </p>
        <p style={{ color: "#9898aa", fontSize: "11px", marginTop: "4px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
          Check back shortly
        </p>
      </div>
    );
  }

  if (matches && matches.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-10 text-center"
        style={{ border: "1px solid #1e1e26", backgroundColor: "#0a0a0e" }}
      >
        <span style={{ fontSize: "28px", marginBottom: "8px" }}>🏏</span>
        <p style={{ color: "#9898aa", fontSize: "13px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
          No live IPL matches right now
        </p>
        <p style={{ color: "#9898aa", fontSize: "11px", marginTop: "4px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
          Check the schedule below for upcoming games
        </p>
      </div>
    );
  }

  if (!matches) {
    return (
      <div style={{ border: "1px solid #1e1e26", backgroundColor: "#0a0a0e" }}>
        {[0, 1].map((i) => (
          <div key={i} className="p-4" style={{ borderBottom: i === 0 ? "1px solid #1e1e26" : undefined }}>
            <div className="animate-pulse space-y-2">
              <div style={{ height: "10px", width: "80px", backgroundColor: "#1e1e26", borderRadius: "2px" }} />
              <div style={{ height: "16px", width: "200px", backgroundColor: "#1a1a22", borderRadius: "2px" }} />
              <div style={{ height: "12px", width: "140px", backgroundColor: "#1a1a22", borderRadius: "2px" }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes liveRing {
          0% { box-shadow: 0 0 0 0 #22c55e66; }
          70% { box-shadow: 0 0 0 8px #22c55e00; }
          100% { box-shadow: 0 0 0 0 #22c55e00; }
        }
      `}</style>

      <div style={{ border: "1px solid #1e1e26" }}>
        {matches.map((m, idx) => {
          const teams = m.teams ?? [];
          const t1 = teams[0] ?? "";
          const t2 = teams[1] ?? "";
          const s1short = getShort(m.teamInfo, t1);
          const s2short = getShort(m.teamInfo, t2);

          const score1 = findTeamScore(m.score, t1);
          const score2 = findTeamScore(m.score, t2);

          const t1meta = IPL_TEAMS[s1short];
          const t2meta = IPL_TEAMS[s2short];
          const live = isLive(m);

          return (
            <div
              key={m.id}
              style={{
                backgroundColor: "#0a0a0e",
                borderBottom: idx < matches.length - 1 ? "1px solid #1e1e26" : undefined,
                padding: "16px",
              }}
            >
              {/* Header: status badge + venue */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {live ? (
                    <LivePulse />
                  ) : (
                    <span style={{ color: "#9898aa", fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
                      {isEnded(m) ? "RESULT" : "UPCOMING"}
                    </span>
                  )}
                </div>
                {m.venue && (
                  <span style={{ color: "#9898aa", fontSize: "10px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }} className="hidden sm:block truncate ml-2">
                    {m.venue.split(",")[0]}
                  </span>
                )}
              </div>

              {/* Teams + Scores */}
              <div className="space-y-2">
                {[{ name: t1, short: s1short, meta: t1meta, score: score1 },
                  { name: t2, short: s2short, meta: t2meta, score: score2 }].map((team) => (
                  <div key={team.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {/* Team badge */}
                      <div
                        className="flex items-center justify-center shrink-0"
                        style={{
                          width: "32px",
                          height: "32px",
                          backgroundColor: team.meta?.bg ?? "#1e1e26",
                          fontSize: "9px",
                          fontWeight: 800,
                          fontFamily: "var(--font-ui, system-ui, sans-serif)",
                          color: team.meta?.color ?? "#9898aa",
                          letterSpacing: "0.02em",
                        }}
                      >
                        {team.short}
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--font-ui, system-ui, sans-serif)",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "#e8e4dc",
                        }}
                        className="hidden sm:block"
                      >
                        {team.name}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-ui, system-ui, sans-serif)",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#e8e4dc",
                        }}
                        className="block sm:hidden"
                      >
                        {team.short}
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--font-ui, system-ui, sans-serif)",
                        fontSize: "14px",
                        fontWeight: 700,
                        color: team.score ? "#f0ece6" : "#9898aa",
                        letterSpacing: "0.02em",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatScore(team.score)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Match status */}
              <div
                className="mt-3 pt-3"
                style={{ borderTop: "1px solid #1a1a22" }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-ui, system-ui, sans-serif)",
                    fontSize: "12px",
                    color: live ? "#22c55e" : "#9898aa",
                    fontWeight: live ? 500 : 400,
                    lineHeight: 1.5,
                  }}
                >
                  {m.status || "Match scheduled"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
