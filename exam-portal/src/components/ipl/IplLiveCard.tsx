import Link from "next/link";
import IplTeamBadge from "./IplTeamBadge";
import { IPL_TEAMS } from "@/lib/cricbuzz";

interface Innings {
  runs?: number;
  wickets?: number;
  overs?: number;
}

// mcenter/v1/{id}/comm → data.miniscore fields
// Cricbuzz uses lowercase keys; internal bowler fields vary by API version
interface BatsmanData {
  name?: string;
  runs?: number;
  balls?: number;
  fours?: number;
  sixes?: number;
  strkrate?: string;
}
interface BowlerData {
  name?: string;
  ovs?: string;      // some versions
  overs?: string;    // other versions
  maidens?: number;
  runs?: number;
  wkts?: number;     // some versions
  wickets?: number;  // other versions
  economy?: string;
}
interface InningsScoreEntry {
  inningsId?: number;
  batTeamId?: number;
  runs?: number;
  wickets?: number;
  overs?: number;
  isCurrentInnings?: boolean;
}

interface Miniscore {
  batsmanstriker?: BatsmanData;
  batsmannonstriker?: BatsmanData;
  bowlerstriker?: BowlerData;
  crr?: number;
  rrr?: number;
  partnership?: Record<string, unknown>; // field names vary; guard before use
  curovsstats?: string; // last over balls e.g. "0,4,1,W,2,6"
  recentOvsStats?: string; // alternate field name
  // Live score — same cadence as ball data; fresher than match-list matchScore
  inningsScore?: InningsScoreEntry[];
  matchScoreDetails?: { inningsScoreList?: InningsScoreEntry[] };
}

interface Props {
  matchId: number;
  team1: { teamSName: string; teamId?: number };
  team2: { teamSName: string; teamId?: number };
  team1Score?: { inngs1?: Innings };
  team2Score?: { inngs1?: Innings };
  status?: string;
  leanback?: { miniscore?: Miniscore };
}

function teamColors(sName: string) {
  const t = Object.values(IPL_TEAMS).find((t) => t.fullName.includes(sName));
  return t ? { bg: t.bg, color: t.color } : { bg: "#1C3A6B", color: "#E8E4DC" };
}

/** Parse a single over segment into ball tokens (max 6).
 *  Handles: "0,4,1,W,2,6" / "0 1 1" / "011" */
function parseOverSegment(seg: string): string[] {
  const s = seg.trim();
  if (!s) return [];
  if (s.includes(",")) return s.split(",").map((x) => x.trim()).filter(Boolean).slice(-6);
  if (s.includes(" ")) return s.split(/\s+/).filter(Boolean).slice(-6);
  return s.split("").filter(Boolean).slice(-6);
}

/** Parse Cricbuzz ball-by-ball stats into individual ball tokens for the CURRENT over only.
 *  curovsstats  = current over balls (always prefer this).
 *  recentOvsStats may contain multiple overs separated by "|" or " | " —
 *  we take only the LAST segment (the most recent/current over). */
function parseRecentBalls(curOv: string | undefined, recentOvs: string | undefined): string[] {
  // Current over is authoritative — use it if available
  if (curOv && typeof curOv === "string") return parseOverSegment(curOv);

  // Fall back to recentOvsStats — extract the last over segment only
  if (!recentOvs || typeof recentOvs !== "string") return [];
  const segments = recentOvs.split("|").map((s) => s.trim()).filter(Boolean);
  return parseOverSegment(segments[segments.length - 1] ?? "");
}

/** Normalize cricket overs: 0.6 → 1.0, 1.6 → 2.0, etc.
 *  Cricbuzz sometimes emits X.6 on the last ball before incrementing the over counter. */
function normalizeOvers(overs: number | string | undefined): string {
  if (overs == null || overs === "") return "0";
  const n = typeof overs === "string" ? parseFloat(overs) : overs;
  if (isNaN(n)) return String(overs);
  const complete = Math.floor(n);
  const balls = Math.round((n - complete) * 10);
  if (balls >= 6) return `${complete + 1}`;  // 0.6 → 1, 1.6 → 2
  if (balls === 0) return `${complete}`;      // 10.0 → 10, 9.0 → 9
  return `${complete}.${balls}`;
}

function scoreStr(inn?: Innings) {
  if (!inn || inn.runs == null) return "Yet to bat";
  return `${inn.runs}/${inn.wickets ?? 0} (${normalizeOvers(inn.overs)})`;
}

/** Extract the freshest available score for a given team from miniscore.
 *  inningsScore / matchScoreDetails.inningsScoreList update at the same rate as
 *  ball-by-ball data — faster than the match-list matchScore field. */
function scoreFromMiniscore(ms: Miniscore | undefined, teamId: number | undefined): { inngs1?: Innings } | undefined {
  if (!ms || teamId == null) return undefined;
  const list: InningsScoreEntry[] | undefined =
    ms.inningsScore ??
    ms.matchScoreDetails?.inningsScoreList;
  if (!Array.isArray(list)) return undefined;
  const entry = list.find((e) => e.batTeamId === teamId);
  if (!entry || entry.runs == null) return undefined;
  return { inngs1: { runs: entry.runs, wickets: entry.wickets ?? 0, overs: entry.overs } };
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
  const n = typeof raw === "string" ? parseFloat(raw) : (raw as number);
  if (isNaN(n)) return score;
  const complete = Math.floor(n);
  const existingBalls = Math.round((n - complete) * 10);
  if (ballsInOver <= existingBalls) return score; // curovsstats not ahead — no change
  return { inngs1: { ...score.inngs1, overs: complete + ballsInOver / 10 } };
}

export default function IplLiveCard({ matchId, team1, team2, team1Score, team2Score, status, leanback }: Props) {
  const t1c = teamColors(team1.teamSName);
  const t2c = teamColors(team2.teamSName);
  const ms = leanback?.miniscore;

  // Prefer miniscore-derived score (same cadence as ball circles) over match-list score
  const t1Base = scoreFromMiniscore(ms, team1.teamId) ?? team1Score;
  const t2Base = scoreFromMiniscore(ms, team2.teamId) ?? team2Score;

  // Apply overs precision from curovsstats: if matchScore shows whole overs but
  // curovsstats has N balls bowled this over, display overs as complete.N
  const ballsThisOver = parseRecentBalls(ms?.curovsstats, ms?.recentOvsStats).length;
  const t1Batting = t2Base?.inngs1?.runs == null; // team2 hasn't batted yet
  const t1Score = t1Batting ? applyOversFromBalls(t1Base, ballsThisOver) : t1Base;
  const t2Score = t1Batting ? t2Base : applyOversFromBalls(t2Base, ballsThisOver);

  // Normalise bowler fields — Cricbuzz uses either ovs/overs and wkts/wickets
  const bowlOvs = ms?.bowlerstriker?.ovs ?? ms?.bowlerstriker?.overs;
  const bowlWkts = ms?.bowlerstriker?.wkts ?? ms?.bowlerstriker?.wickets;
  const bowlEco = ms?.bowlerstriker?.economy;

  // Partnership — field names inside the object vary; only show if we have both values
  const pship = ms?.partnership;
  const pRuns = typeof pship?.runs === "number" ? pship.runs : (typeof pship?.pRuns === "number" ? pship.pRuns as number : null);
  const pBalls = typeof pship?.balls === "number" ? pship.balls : (typeof pship?.pBalls === "number" ? pship.pBalls as number : null);

  const recentBalls = parseRecentBalls(ms?.curovsstats, ms?.recentOvsStats);

  return (
    <Link href={`/ipl/match/${matchId}`}>
      <div className="rounded-xl overflow-hidden cursor-pointer" style={{ background: "#061624", border: "1px solid #FF5A1F" }}>
        {/* Live badge */}
        <div className="px-4 py-2 flex items-center gap-2" style={{ background: "#FF5A1F1A", borderBottom: "1px solid #FF5A1F33" }}>
          <span className="w-2 h-2 rounded-full bg-[#FF5A1F] animate-pulse" />
          <span className="text-xs font-bold" style={{ color: "#FF5A1F" }}>LIVE</span>
        </div>

        {/* Scores */}
        <div className="px-4 py-4 flex items-center gap-4">
          <div className="flex-1">
            <IplTeamBadge shortName={team1.teamSName} bg={t1c.bg} color={t1c.color} />
            <p className="mt-1 font-bold text-lg" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-stats, monospace)" }}>
              {scoreStr(t1Score?.inngs1)}
            </p>
          </div>
          <span className="text-xs font-bold" style={{ color: "#8BB0C8" }}>vs</span>
          <div className="flex-1 text-right">
            <IplTeamBadge shortName={team2.teamSName} bg={t2c.bg} color={t2c.color} />
            <p className="mt-1 font-bold text-lg" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-stats, monospace)" }}>
              {scoreStr(t2Score?.inngs1)}
            </p>
          </div>
        </div>

        {/* Batsmen */}
        {ms?.batsmanstriker && (
          <div className="px-4 pb-3 border-t" style={{ borderColor: "#0E2235" }}>
            <div className="flex text-xs pt-3 gap-2" style={{ color: "#8BB0C8", fontFamily: "var(--font-ipl-stats, monospace)" }}>
              <span className="flex-1 font-semibold" style={{ color: "#E8E4DC" }}>Batsmen</span>
              <span className="w-7 text-right">R</span>
              <span className="w-7 text-right">B</span>
              <span className="w-7 text-right">4s</span>
              <span className="w-7 text-right">6s</span>
              <span className="w-14 text-right">SR</span>
            </div>
            {[ms.batsmanstriker, ms.batsmannonstriker].filter(Boolean).map((b, i) => b && (
              <div key={i} className="flex text-sm mt-1 gap-2" style={{ fontFamily: "var(--font-ipl-stats, monospace)" }}>
                <span className="flex-1 truncate" style={{ color: i === 0 ? "#D4AF37" : "#E8E4DC" }}>{b.name}{i === 0 ? " *" : ""}</span>
                <span className="w-7 text-right font-bold" style={{ color: "#E8E4DC" }}>{b.runs ?? 0}</span>
                <span className="w-7 text-right" style={{ color: "#8BB0C8" }}>{b.balls ?? 0}</span>
                <span className="w-7 text-right" style={{ color: "#3B82F6" }}>{b.fours ?? 0}</span>
                <span className="w-7 text-right" style={{ color: "#D4AF37" }}>{b.sixes ?? 0}</span>
                <span className="w-14 text-right" style={{ color: "#8BB0C8" }}>{b.strkrate ? parseFloat(b.strkrate).toFixed(1) : "0.0"}</span>
              </div>
            ))}
            {ms.bowlerstriker && (
              <div className="mt-2 pt-2" style={{ borderTop: "1px solid #0E2235", fontFamily: "var(--font-ipl-stats, monospace)" }}>
                <div className="flex text-xs gap-2" style={{ color: "#8BB0C8" }}>
                  <span className="flex-1">Bowler</span>
                  <span className="w-10 text-right">O</span>
                  <span className="w-7 text-right">M</span>
                  <span className="w-7 text-right">R</span>
                  <span className="w-7 text-right">W</span>
                  <span className="w-14 text-right">ECO</span>
                </div>
                <div className="flex text-sm mt-1 gap-2">
                  <span className="flex-1 truncate" style={{ color: "#E8E4DC" }}>{ms.bowlerstriker.name} *</span>
                  <span className="w-10 text-right" style={{ color: "#8BB0C8" }}>{normalizeOvers(bowlOvs)}</span>
                  <span className="w-7 text-right" style={{ color: "#8BB0C8" }}>{ms.bowlerstriker.maidens ?? 0}</span>
                  <span className="w-7 text-right" style={{ color: "#8BB0C8" }}>{ms.bowlerstriker.runs ?? 0}</span>
                  <span className="w-7 text-right font-bold" style={{ color: "#EF4444" }}>{bowlWkts ?? 0}</span>
                  <span className="w-14 text-right" style={{ color: "#8BB0C8" }}>{bowlEco ? parseFloat(bowlEco).toFixed(2) : "—"}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Last 6 balls — current over only, never wrap */}
        {recentBalls.length > 0 && (
          <div className="px-4 pb-3 flex flex-nowrap gap-1 overflow-x-auto">
            {recentBalls.map((b, i) => {
              const isWicket = b.toUpperCase().startsWith("W");
              const isSix = b === "6";
              const isFour = b === "4";
              const isWide = b.toLowerCase().startsWith("wd") || b.toLowerCase() === "w+";
              const isNb = b.toLowerCase().startsWith("nb");
              const bg = isWicket && !isWide ? "#EF444433" : isSix ? "#D4AF3733" : isFour ? "#3B82F633" : "#0E2235";
              const color = isWicket && !isWide ? "#EF4444" : isSix ? "#D4AF37" : isFour ? "#3B82F6" : isWide || isNb ? "#F59E0B" : "#8BB0C8";
              const border = isWicket && !isWide ? "#EF4444" : isSix ? "#D4AF37" : isFour ? "#3B82F6" : isWide || isNb ? "#F59E0B" : "#1C3A6B";
              const label = isWide ? "Wd" : isNb ? "Nb" : b;
              return (
                <span
                  key={i}
                  className="h-7 min-w-[28px] px-1 text-[11px] font-bold rounded-full flex items-center justify-center shrink-0"
                  style={{ background: bg, color, border: `1px solid ${border}`, fontFamily: "var(--font-ipl-stats, monospace)" }}
                >
                  {label}
                </span>
              );
            })}
          </div>
        )}

        {/* CRR / RRR */}
        {ms && (
          <div className="px-4 py-3 flex gap-4 text-xs" style={{ background: "#010D1A", borderTop: "1px solid #0E2235", fontFamily: "var(--font-ipl-stats, monospace)" }}>
            {ms.crr != null && (
              <span style={{ color: "#8BB0C8" }}>CRR: <strong style={{ color: "#E8E4DC" }}>{ms.crr.toFixed(2)}</strong></span>
            )}
            {ms.rrr != null && ms.rrr > 0 && (
              <span style={{ color: "#8BB0C8" }}>RRR: <strong style={{ color: "#FF5A1F" }}>{ms.rrr.toFixed(2)}</strong></span>
            )}
            {pRuns != null && (
              <span style={{ color: "#8BB0C8" }}>P&apos;ship: <strong style={{ color: "#E8E4DC" }}>{pRuns}({pBalls ?? 0})</strong></span>
            )}
          </div>
        )}

        {status && (
          <div className="px-4 py-2">
            <p className="text-xs truncate" style={{ color: "#22C55E" }}>{status}</p>
          </div>
        )}
      </div>
    </Link>
  );
}
