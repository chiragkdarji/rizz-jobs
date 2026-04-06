import IplTeamBadge from "./IplTeamBadge";
import { IPL_TEAMS } from "@/lib/cricbuzz";

interface TeamRow {
  teamId: number;
  teamName: string;
  teamSName: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  noResult: number;
  points: number;
  nrr?: string | number;
  lastFive?: string[]; // e.g. ["W","W","L","NR","W"]
}

interface Props {
  rows: TeamRow[];
}

function getTeamColors(sName: string) {
  const t = Object.values(IPL_TEAMS).find((t) => t.fullName.includes(sName) || sName.includes(t.fullName.split(" ").pop()!));
  return t ? { bg: t.bg, color: t.color } : { bg: "#1C3A6B", color: "#E8E4DC" };
}

const PILL = { W: "#22C55E", L: "#EF4444", NR: "#6B86A0" };

export default function IplPointsTable({ rows }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #0E2235" }}>
      <table className="w-full text-sm" style={{ fontFamily: "var(--font-ipl-stats, monospace)" }}>
        <thead>
          <tr style={{ background: "#061624", borderBottom: "1px solid #0E2235" }}>
            {["#", "Team", "P", "W", "L", "NR", "Pts", "NRR", "Last 5"].map((h) => (
              <th
                key={h}
                className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider"
                style={{ color: "#6B86A0" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isPlayoff = i < 4;
            const colors = getTeamColors(row.teamSName);
            return (
              <tr
                key={row.teamId}
                style={{
                  background: isPlayoff ? "#061A2E" : "transparent",
                  borderBottom: "1px solid #0E2235",
                  borderLeft: isPlayoff ? "3px solid #D4AF37" : "3px solid transparent",
                }}
              >
                <td className="px-3 py-3 font-bold" style={{ color: isPlayoff ? "#D4AF37" : "#6B86A0" }}>{i + 1}</td>
                <td className="px-3 py-3">
                  <IplTeamBadge shortName={row.teamSName} bg={colors.bg} color={colors.color} size="sm" />
                </td>
                <td className="px-3 py-3" style={{ color: "#E8E4DC" }}>{row.matchesPlayed}</td>
                <td className="px-3 py-3 font-semibold" style={{ color: "#22C55E" }}>{row.matchesWon}</td>
                <td className="px-3 py-3" style={{ color: "#EF4444" }}>{row.matchesLost}</td>
                <td className="px-3 py-3" style={{ color: "#6B86A0" }}>{row.noResult}</td>
                <td className="px-3 py-3 font-bold" style={{ color: "#E8E4DC" }}>{row.points}</td>
                <td className="px-3 py-3" style={{ color: "#6B86A0" }}>{row.nrr ?? "—"}</td>
                <td className="px-3 py-3">
                  <div className="flex gap-1">
                    {(row.lastFive ?? []).slice(0, 5).map((r, j) => (
                      <span
                        key={j}
                        className="inline-block w-5 h-5 text-xs font-bold rounded-full flex items-center justify-center"
                        style={{
                          background: (PILL[r as keyof typeof PILL] ?? "#3A5060") + "33",
                          color: PILL[r as keyof typeof PILL] ?? "#6B86A0",
                          border: `1px solid ${PILL[r as keyof typeof PILL] ?? "#3A5060"}`,
                        }}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
