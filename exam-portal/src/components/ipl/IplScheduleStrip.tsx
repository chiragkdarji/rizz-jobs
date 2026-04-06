import Link from "next/link";
import IplTeamBadge from "./IplTeamBadge";
import { IPL_TEAMS } from "@/lib/cricbuzz";

interface MatchItem {
  matchId: number;
  team1: { teamSName: string };
  team2: { teamSName: string };
  startDate: string; // ms string
  venueInfo?: { ground: string; city: string };
  state: string;
  status?: string;
}

interface Props {
  matches: MatchItem[];
}

function teamColors(sName: string) {
  const t = Object.values(IPL_TEAMS).find((t) => t.fullName.includes(sName));
  return t ? { bg: t.bg, color: t.color } : { bg: "#1C3A6B", color: "#E8E4DC" };
}

export default function IplScheduleStrip({ matches }: Props) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {matches.map((m) => {
        const date = new Date(parseInt(m.startDate));
        const t1 = teamColors(m.team1.teamSName);
        const t2 = teamColors(m.team2.teamSName);
        const isLive = m.state === "In Progress";
        return (
          <Link key={m.matchId} href={`/ipl/match/${m.matchId}`}>
            <div
              className="shrink-0 rounded-xl p-4 w-52 flex flex-col gap-2 cursor-pointer transition-colors"
              style={{ background: "#061624", border: `1px solid ${isLive ? "#FF5A1F" : "#0E2235"}` }}
            >
              {isLive && (
                <span className="text-xs font-bold px-2 py-0.5 rounded self-start" style={{ background: "#FF5A1F22", color: "#FF5A1F" }}>
                  ● LIVE
                </span>
              )}
              <div className="flex items-center justify-between gap-2">
                <IplTeamBadge shortName={m.team1.teamSName} bg={t1.bg} color={t1.color} size="sm" />
                <span className="text-xs" style={{ color: "#6B86A0" }}>vs</span>
                <IplTeamBadge shortName={m.team2.teamSName} bg={t2.bg} color={t2.color} size="sm" />
              </div>
              <p className="text-xs" style={{ color: "#6B86A0" }}>
                {date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                {m.venueInfo && ` · ${m.venueInfo.city}`}
              </p>
              {m.status && m.state === "Complete" && (
                <p className="text-xs truncate" style={{ color: "#22C55E" }}>{m.status}</p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
