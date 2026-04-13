import Link from "next/link";
import Image from "next/image";

interface TeamInfo {
  teamId?: number;
  teamName: string;
  teamSName: string;
  imageId?: number;
}
interface InningsScore {
  runs?: number;
  wickets?: number;
  overs?: number;
}
interface MatchScore {
  team1Score?: { inngs1?: InningsScore; inngs2?: InningsScore };
  team2Score?: { inngs1?: InningsScore; inngs2?: InningsScore };
}
export interface MatchItem {
  matchInfo: {
    matchId: number;
    seriesId?: number;
    seriesName: string;
    matchDesc: string;
    matchFormat: string;
    startDate: string;
    endDate?: string;
    state: string;
    status: string;
    team1: TeamInfo;
    team2: TeamInfo;
    venueInfo?: { ground?: string; city?: string };
    stateTitle?: string;
  };
  matchScore?: MatchScore;
}

function fmtScore(s?: InningsScore): string | null {
  if (!s || s.runs == null) return null;
  const wkts = s.wickets != null && s.wickets < 10 ? `/${s.wickets}` : "";
  const ovs = s.overs != null ? ` (${s.overs})` : "";
  return `${s.runs}${wkts}${ovs}`;
}

export default function LiveMatchCard({ match }: { match: MatchItem }) {
  const { matchInfo: m, matchScore: s } = match;
  const isLive = m.state === "In Progress";
  const isComplete = m.state === "Complete";
  const t1s1 = fmtScore(s?.team1Score?.inngs1);
  const t1s2 = fmtScore(s?.team1Score?.inngs2);
  const t2s1 = fmtScore(s?.team2Score?.inngs1);
  const t2s2 = fmtScore(s?.team2Score?.inngs2);

  const startMs = Number(m.startDate);
  const startLabel = !isNaN(startMs)
    ? new Date(startMs).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      })
    : "";

  return (
    <Link href={`/ipl/match/${m.matchId}`}>
      <div
        className="rounded-xl p-4 h-full flex flex-col justify-between cursor-pointer transition-all hover:border-[#FFB800]"
        style={{ background: "#12121A", border: "1px solid #2A2A3A" }}
      >
        {/* Series + format header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className="text-xs leading-tight line-clamp-2" style={{ color: "#5A566A" }}>
            {m.seriesName}
            <span style={{ color: "#2A2A3A" }}> · </span>
            {m.matchDesc}
          </span>
          <div className="shrink-0">
            {isLive ? (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#FF3B3B22", color: "#FF3B3B" }}
              >
                ● LIVE
              </span>
            ) : (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "#1A1A26", color: isComplete ? "#22C55E" : "#9A96A0" }}
              >
                {m.matchFormat}
              </span>
            )}
          </div>
        </div>

        {/* Teams + scores */}
        <div className="space-y-2 flex-1">
          {[
            { team: m.team1, s1: t1s1, s2: t1s2 },
            { team: m.team2, s1: t2s1, s2: t2s2 },
          ].map(({ team, s1, s2 }) => (
            <div key={team.teamId ?? team.teamName} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {team.imageId ? (
                  <div className="relative w-6 h-6 shrink-0">
                    <Image
                      src={`/api/ipl/image?id=${team.imageId}&type=team`}
                      alt={team.teamSName}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div
                    className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "#1A1A26", color: "#FFB800" }}
                  >
                    {team.teamSName.slice(0, 2)}
                  </div>
                )}
                <span className="font-semibold text-sm truncate" style={{ color: "#F0EDE8" }}>
                  {team.teamName}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 shrink-0">
                {s1 && (
                  <span className="font-bold text-sm tabular-nums" style={{ color: "#F0EDE8" }}>
                    {s1}
                  </span>
                )}
                {s2 && (
                  <span className="text-xs tabular-nums" style={{ color: "#9A96A0" }}>
                    &amp; {s2}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Status bar */}
        <p
          className="mt-3 text-xs leading-snug truncate"
          style={{ color: isLive ? "#FFB800" : isComplete ? "#9A96A0" : "#5A566A" }}
        >
          {m.status || m.stateTitle || startLabel}
        </p>
      </div>
    </Link>
  );
}
