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
  matchType?: string;
  status: string;
  venue?: string;
  dateTimeGMT?: string;
  teams?: string[];
  teamInfo?: TeamInfo[];
  score?: Score[];
  tossWinner?: string;
  tossChoice?: string;
  matchStarted?: boolean;
  matchEnded?: boolean;
}

/* ── helpers ── */

function getShort(info: TeamInfo[] | undefined, teamName: string): string {
  return info?.find((t) => t.name === teamName)?.shortname
    ?? teamName.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase();
}

/** CricAPI inning names:
 *  "rajasthan royals Inning 1"               → RR 1st innings (may be all-lowercase)
 *  "Gujarat Titans,Rajasthan Royals Inning 1" → GT 2nd innings (batting team is before comma)
 */
function findTeamScore(scores: Score[] | undefined, teamName: string): Score | undefined {
  if (!scores?.length) return undefined;
  const key = teamName.split(" ")[0].toLowerCase();
  return scores.find((s) => {
    const battingPart = s.inning.toLowerCase().split(",")[0].split(" inning")[0].trim();
    return battingPart.includes(key);
  });
}

/** 12.3 overs → 75 balls */
function oversToBalls(o: number): number {
  const full = Math.floor(o);
  const extra = Math.round((o - full) * 10);
  return full * 6 + extra;
}

function calcCRR(r: number, o: number): string {
  if (!o) return "—";
  return (r / o).toFixed(2);
}

function calcRRR(needed: number, ballsLeft: number): string {
  if (ballsLeft <= 0 || needed <= 0) return "—";
  return ((needed / ballsLeft) * 6).toFixed(2);
}

function formatOvers(o: number): string {
  return o % 1 === 0 ? `${o}.0` : `${o}`;
}

const ENDED_KW = ["won", "win", "draw", "tie", "no result", "abandoned"];

function isLive(m: Match): boolean {
  if (m.matchStarted !== undefined) return !!m.matchStarted && !m.matchEnded;
  const s = m.status?.toLowerCase() ?? "";
  return !!s && !ENDED_KW.some((kw) => s.includes(kw));
}

function isEnded(m: Match): boolean {
  if (m.matchEnded !== undefined) return !!m.matchEnded;
  return ENDED_KW.some((kw) => m.status?.toLowerCase().includes(kw));
}

function tossLine(winner?: string, choice?: string): string | null {
  if (!winner || !choice) return null;
  const name = winner.split(" ").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  return `${name} won toss, elected to ${choice}`;
}

function matchSubtitle(name: string, matchType?: string): string {
  // e.g. "Gujarat Titans vs Rajasthan Royals, 9th Match, Indian Premier League 2026"
  const parts = name.split(",").map((s) => s.trim());
  const matchNum = parts[1] ?? "";
  const type = matchType ? matchType.toUpperCase() : "T20";
  return [matchNum, type].filter(Boolean).join(" · ");
}

/* ── sub-components ── */

function LivePulse() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ backgroundColor: "#22c55e", animation: "liveRing 1.4s ease-out infinite" }}
      />
      <span style={{ color: "#22c55e", fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
        LIVE
      </span>
    </span>
  );
}

function TeamBadge({ short, meta }: { short: string; meta?: { bg: string; color: string } }) {
  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{
        width: "32px", height: "32px",
        backgroundColor: meta?.bg ?? "#1e1e26",
        fontSize: "8px", fontWeight: 800,
        color: meta?.color ?? "#9898aa",
        fontFamily: "var(--font-ui, system-ui, sans-serif)",
        letterSpacing: "0.02em",
      }}
    >
      {short}
    </div>
  );
}

function InningsRow({
  label, team, short, meta, score, subStats,
}: {
  label: string;
  team: string;
  short: string;
  meta?: { bg: string; color: string };
  score?: Score;
  subStats?: React.ReactNode;
}) {
  const scoreStr = score ? `${score.r}/${score.w} (${formatOvers(score.o)} ov)` : "Yet to bat";
  const hasBatted = !!score;

  return (
    <div style={{ padding: "12px 16px", borderBottom: "1px solid #111118" }}>
      {/* Innings label */}
      <div style={{ marginBottom: "8px" }}>
        <span style={{ color: "#555466", fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
          {label}
        </span>
      </div>

      {/* Team + score row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <TeamBadge short={short} meta={meta} />
          <span style={{ color: "#e8e4dc", fontSize: "13px", fontWeight: 500, fontFamily: "var(--font-ui, system-ui, sans-serif)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {team}
          </span>
        </div>
        <span style={{ color: hasBatted ? "#f0ece6" : "#555466", fontSize: "15px", fontWeight: 700, fontFamily: "var(--font-ui, system-ui, sans-serif)", letterSpacing: "0.02em", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
          {scoreStr}
        </span>
      </div>

      {/* Sub-stats row (CRR, RRR, Needed) */}
      {subStats && (
        <div className="flex items-center gap-4 mt-2" style={{ paddingLeft: "40px" }}>
          {subStats}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <span style={{ fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
      <span style={{ color: "#555466", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label} </span>
      <span style={{ color: highlight ? "#f0a500" : "#9898aa", fontSize: "11px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </span>
  );
}

/* ── main component ── */

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
    const id = setInterval(load, 120_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center" style={{ border: "1px solid #1e1e26", backgroundColor: "#0a0a0e" }}>
        <p style={{ color: "#9898aa", fontSize: "13px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>Could not load live scores</p>
      </div>
    );
  }

  if (matches && matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center" style={{ border: "1px solid #1e1e26", backgroundColor: "#0a0a0e" }}>
        <span style={{ fontSize: "24px", marginBottom: "8px" }}>🏏</span>
        <p style={{ color: "#9898aa", fontSize: "13px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>No live IPL matches right now</p>
        <p style={{ color: "#9898aa", fontSize: "11px", marginTop: "4px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>Check upcoming fixtures below</p>
      </div>
    );
  }

  if (!matches) {
    return (
      <div style={{ border: "1px solid #1e1e26", backgroundColor: "#0a0a0e" }}>
        {[0, 1].map((i) => (
          <div key={i} className="p-4 animate-pulse space-y-3" style={{ borderBottom: i === 0 ? "1px solid #1a1a22" : undefined }}>
            <div style={{ height: "9px", width: "60px", backgroundColor: "#1e1e26", borderRadius: "2px" }} />
            <div style={{ height: "14px", width: "180px", backgroundColor: "#1a1a22", borderRadius: "2px" }} />
            <div style={{ height: "11px", width: "120px", backgroundColor: "#1a1a22", borderRadius: "2px" }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes liveRing {
          0%   { box-shadow: 0 0 0 0 #22c55e66; }
          70%  { box-shadow: 0 0 0 8px #22c55e00; }
          100% { box-shadow: 0 0 0 0 #22c55e00; }
        }
      `}</style>

      <div style={{ border: "1px solid #1e1e26" }}>
        {matches.map((m, idx) => {
          const teams = m.teams ?? [];
          const t1 = teams[0] ?? "";
          const t2 = teams[1] ?? "";
          const s1 = getShort(m.teamInfo, t1);
          const s2 = getShort(m.teamInfo, t2);
          const score1 = findTeamScore(m.score, t1);
          const score2 = findTeamScore(m.score, t2);
          const live = isLive(m);
          const ended = isEnded(m);

          // Determine innings order: who batted first?
          // score array is in play order; extract batting team from first entry
          const firstInningsBatter = m.score?.[0]
            ? m.score[0].inning.toLowerCase().split(",")[0].split(" inning")[0].trim()
            : "";
          const t1BattedFirst = firstInningsBatter.includes(t1.split(" ")[0].toLowerCase());
          const [batting1st, batting2nd] = t1BattedFirst ? [t1, t2] : [t2, t1];
          const [short1st, short2nd] = t1BattedFirst ? [s1, s2] : [s2, s1];
          const [score_1st, score_2nd] = t1BattedFirst ? [score1, score2] : [score2, score1];
          const meta1st = IPL_TEAMS[short1st];
          const meta2nd = IPL_TEAMS[short2nd];

          // 2nd innings stats
          const target = score_1st ? score_1st.r + 1 : null;
          const needed = target && score_2nd ? target - score_2nd.r : null;
          const ballsUsed = score_2nd ? oversToBalls(score_2nd.o) : 0;
          const totalBalls = m.matchType === "odi" ? 300 : 120;
          const ballsLeft = totalBalls - ballsUsed;

          const crr1 = score_1st ? calcCRR(score_1st.r, score_1st.o) : null;
          const crr2 = score_2nd ? calcCRR(score_2nd.r, score_2nd.o) : null;
          const rrr = needed !== null ? calcRRR(needed, ballsLeft) : null;

          const toss = tossLine(m.tossWinner, m.tossChoice);
          const subtitle = matchSubtitle(m.name, m.matchType);

          const in2ndInnings = !!m.score?.[1];
          const label1 = "1st Innings";
          const label2 = in2ndInnings
            ? target ? `2nd Innings · Target: ${target}` : "2nd Innings"
            : "2nd Innings";

          return (
            <div key={m.id} style={{ backgroundColor: "#0a0a0e", borderBottom: idx < matches.length - 1 ? "1px solid #1e1e26" : undefined }}>

              {/* ── Header ── */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex items-center gap-3">
                  {live ? <LivePulse /> : (
                    <span style={{ color: "#9898aa", fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
                      {ended ? "RESULT" : "UPCOMING"}
                    </span>
                  )}
                  {subtitle && (
                    <span style={{ color: "#555466", fontSize: "10px", fontFamily: "var(--font-ui, system-ui, sans-serif)", letterSpacing: "0.04em" }}>
                      {subtitle}
                    </span>
                  )}
                </div>
                {m.venue && (
                  <span style={{ color: "#555466", fontSize: "10px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }} className="hidden sm:block truncate ml-2 max-w-[180px]">
                    {m.venue.split(",")[0]}
                  </span>
                )}
              </div>

              {/* ── 1st Innings ── */}
              <InningsRow
                label={label1}
                team={batting1st}
                short={short1st}
                meta={meta1st}
                score={score_1st}
                subStats={crr1 && score_1st?.o === (m.matchType === "odi" ? 50 : 20)
                  ? <Stat label="CRR" value={crr1} />
                  : crr1 ? <Stat label="CRR" value={crr1} /> : undefined
                }
              />

              {/* ── 2nd Innings ── */}
              <InningsRow
                label={label2}
                team={batting2nd}
                short={short2nd}
                meta={meta2nd}
                score={score_2nd}
                subStats={score_2nd ? (
                  <>
                    {crr2 && <Stat label="CRR" value={crr2} />}
                    {rrr && needed !== null && needed > 0 && <Stat label="RRR" value={rrr} highlight />}
                  </>
                ) : undefined}
              />

              {/* ── Status + Toss ── */}
              <div className="px-4 py-3" style={{ borderTop: "1px solid #111118" }}>
                <p style={{ fontFamily: "var(--font-ui, system-ui, sans-serif)", fontSize: "12px", color: live ? "#22c55e" : "#9898aa", fontWeight: live ? 600 : 400, lineHeight: 1.5, marginBottom: toss ? "4px" : 0 }}>
                  {m.status || "Match scheduled"}
                </p>
                {toss && (
                  <p style={{ fontFamily: "var(--font-ui, system-ui, sans-serif)", fontSize: "11px", color: "#555466", lineHeight: 1.5 }}>
                    Toss: {toss}
                  </p>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </>
  );
}
