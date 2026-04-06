import Link from "next/link";
import IplTeamBadge from "./IplTeamBadge";
import { IPL_TEAMS } from "@/lib/cricbuzz";

interface Innings {
  runs?: number;
  wickets?: number;
  overs?: number;
}

interface Batsman {
  batName: string;
  batRuns: number;
  batBalls: number;
  batStrikeRate: number;
  isStriker?: boolean;
}

interface Bowler {
  bowlName: string;
  bowlOvs: number;
  bowlRuns: number;
  bowlWkts: number;
  bowlEcon: number;
}

interface Props {
  matchId: number;
  team1: { teamSName: string };
  team2: { teamSName: string };
  team1Score?: { inngs1?: Innings };
  team2Score?: { inngs1?: Innings };
  status?: string;
  leanback?: {
    miniscore?: {
      batTeam?: { batsman1?: Batsman; batsman2?: Batsman };
      bowlerStriker?: Bowler;
      currentRunRate?: number;
      requiredRunRate?: number;
      partnerShip?: { runs: number; balls: number };
      lastWicket?: string;
      recentOvsStats?: string;
    };
  };
}

function teamColors(sName: string) {
  const t = Object.values(IPL_TEAMS).find((t) => t.fullName.includes(sName));
  return t ? { bg: t.bg, color: t.color } : { bg: "#1C3A6B", color: "#E8E4DC" };
}

function scoreStr(inn?: Innings) {
  if (!inn) return "—";
  return `${inn.runs ?? 0}/${inn.wickets ?? 0} (${inn.overs ?? 0})`;
}

export default function IplLiveCard({
  matchId,
  team1,
  team2,
  team1Score,
  team2Score,
  status,
  leanback,
}: Props) {
  const t1c = teamColors(team1.teamSName);
  const t2c = teamColors(team2.teamSName);
  const ms = leanback?.miniscore;

  const recentBalls = ms?.recentOvsStats
    ? ms.recentOvsStats.split(",").slice(-6)
    : [];

  return (
    <Link href={`/ipl/match/${matchId}`}>
      <div
        className="rounded-xl overflow-hidden cursor-pointer transition-all"
        style={{ background: "#061624", border: "1px solid #FF5A1F" }}
      >
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
              {scoreStr(team1Score?.inngs1)}
            </p>
          </div>
          <span className="text-xs font-bold" style={{ color: "#6B86A0" }}>vs</span>
          <div className="flex-1 text-right">
            <IplTeamBadge shortName={team2.teamSName} bg={t2c.bg} color={t2c.color} />
            <p className="mt-1 font-bold text-lg" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-stats, monospace)" }}>
              {scoreStr(team2Score?.inngs1)}
            </p>
          </div>
        </div>

        {/* Batsmen */}
        {ms?.batTeam && (
          <div className="px-4 pb-3 border-t" style={{ borderColor: "#0E2235" }}>
            <div className="flex justify-between text-xs pt-3" style={{ color: "#6B86A0", fontFamily: "var(--font-ipl-stats, monospace)" }}>
              <span className="font-semibold" style={{ color: "#E8E4DC" }}>Batsmen</span>
              <span>R B SR</span>
            </div>
            {[ms.batTeam.batsman1, ms.batTeam.batsman2].filter(Boolean).map((b) => b && (
              <div key={b.batName} className="flex justify-between text-xs mt-1" style={{ fontFamily: "var(--font-ipl-stats, monospace)" }}>
                <span style={{ color: b.isStriker ? "#D4AF37" : "#E8E4DC" }}>
                  {b.batName} {b.isStriker ? "*" : ""}
                </span>
                <span style={{ color: "#6B86A0" }}>{b.batRuns} {b.batBalls} {b.batStrikeRate?.toFixed(1)}</span>
              </div>
            ))}
            {ms.bowlerStriker && (
              <div className="flex justify-between text-xs mt-2 pt-2" style={{ borderTop: "1px solid #0E2235", fontFamily: "var(--font-ipl-stats, monospace)" }}>
                <span style={{ color: "#E8E4DC" }}>{ms.bowlerStriker.bowlName}</span>
                <span style={{ color: "#6B86A0" }}>
                  {ms.bowlerStriker.bowlOvs}-{ms.bowlerStriker.bowlRuns}-{ms.bowlerStriker.bowlWkts} ({ms.bowlerStriker.bowlEcon?.toFixed(1)})
                </span>
              </div>
            )}
          </div>
        )}

        {/* Last 6 balls */}
        {recentBalls.length > 0 && (
          <div className="px-4 pb-3 flex gap-1">
            {recentBalls.map((b, i) => {
              const isWicket = b.includes("W");
              const isSix = b === "6";
              const isFour = b === "4";
              return (
                <span
                  key={i}
                  className="w-7 h-7 text-xs font-bold rounded-full flex items-center justify-center"
                  style={{
                    background: isWicket ? "#EF444433" : isSix ? "#D4AF3733" : isFour ? "#3B82F633" : "#0E2235",
                    color: isWicket ? "#EF4444" : isSix ? "#D4AF37" : isFour ? "#3B82F6" : "#6B86A0",
                    border: `1px solid ${isWicket ? "#EF4444" : isSix ? "#D4AF37" : isFour ? "#3B82F6" : "#1C3A6B"}`,
                    fontFamily: "var(--font-ipl-stats, monospace)",
                  }}
                >
                  {b}
                </span>
              );
            })}
          </div>
        )}

        {/* CRR / RRR + partnership */}
        {ms && (
          <div
            className="px-4 py-3 flex gap-4 text-xs"
            style={{ background: "#010D1A", borderTop: "1px solid #0E2235", fontFamily: "var(--font-ipl-stats, monospace)" }}
          >
            {ms.currentRunRate != null && (
              <span style={{ color: "#6B86A0" }}>CRR: <strong style={{ color: "#E8E4DC" }}>{ms.currentRunRate.toFixed(2)}</strong></span>
            )}
            {ms.requiredRunRate != null && ms.requiredRunRate > 0 && (
              <span style={{ color: "#6B86A0" }}>RRR: <strong style={{ color: "#FF5A1F" }}>{ms.requiredRunRate.toFixed(2)}</strong></span>
            )}
            {ms.partnerShip && (
              <span style={{ color: "#6B86A0" }}>P&apos;ship: <strong style={{ color: "#E8E4DC" }}>{ms.partnerShip.runs}({ms.partnerShip.balls})</strong></span>
            )}
          </div>
        )}

        {/* Status */}
        {status && (
          <div className="px-4 py-2">
            <p className="text-xs truncate" style={{ color: "#22C55E" }}>{status}</p>
          </div>
        )}
      </div>
    </Link>
  );
}
