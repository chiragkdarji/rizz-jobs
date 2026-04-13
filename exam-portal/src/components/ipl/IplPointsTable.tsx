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
  const t = Object.values(IPL_TEAMS).find(
    (t) => t.fullName.includes(sName) || sName.includes(t.fullName.split(" ").pop()!)
  );
  return t ? { bg: t.bg, color: t.color } : { bg: "#2A2A3A", color: "#F0EDE8" };
}

const PILL = { W: "#22C55E", L: "#EF4444", NR: "#5A566A" };

export default function IplPointsTable({ rows }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #2A2A3A" }}>
      <table className="w-full text-sm" style={{ fontFamily: "var(--font-ipl-stats, monospace)" }}>
        <thead>
          <tr style={{ background: "#12121A", borderBottom: "1px solid #2A2A3A" }}>
            {["#", "Team", "P", "W", "L", "NR", "Pts", "NRR", "Last 5"].map((h) => (
              <th
                key={h}
                className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wider"
                style={{ color: "#5A566A" }}
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
                  background: isPlayoff ? "#12121A" : "#0E0E16",
                  borderBottom: "1px solid #1A1A26",
                  borderLeft: isPlayoff ? "3px solid #FFB800" : "3px solid transparent",
                }}
              >
                <td className="px-3 py-3 font-bold" style={{ color: isPlayoff ? "#FFB800" : "#5A566A" }}>
                  {i + 1}
                </td>
                <td className="px-3 py-3">
                  <IplTeamBadge shortName={row.teamSName} bg={colors.bg} color={colors.color} size="sm" />
                </td>
                <td className="px-3 py-3" style={{ color: "#F0EDE8" }}>{row.matchesPlayed}</td>
                <td className="px-3 py-3 font-semibold" style={{ color: "#22C55E" }}>{row.matchesWon}</td>
                <td className="px-3 py-3" style={{ color: "#EF4444" }}>{row.matchesLost}</td>
                <td className="px-3 py-3" style={{ color: "#9A96A0" }}>{row.noResult}</td>
                <td className="px-3 py-3 font-bold" style={{ color: "#F0EDE8" }}>{row.points}</td>
                <td
                  className="px-3 py-3"
                  style={{
                    color:
                      row.nrr == null
                        ? "#5A566A"
                        : String(row.nrr).startsWith("+")
                        ? "#22C55E"
                        : String(row.nrr).startsWith("-")
                        ? "#EF4444"
                        : "#9A96A0",
                  }}
                >
                  {row.nrr ?? "—"}
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-1 flex-nowrap">
                    {(row.lastFive ?? []).slice(0, 5).map((r, j) => (
                      <span
                        key={j}
                        className="inline-flex w-5 h-5 text-xs font-bold rounded-full items-center justify-center shrink-0"
                        style={{
                          background: (PILL[r as keyof typeof PILL] ?? "#5A566A") + "22",
                          color: PILL[r as keyof typeof PILL] ?? "#5A566A",
                          border: `1px solid ${PILL[r as keyof typeof PILL] ?? "#5A566A"}44`,
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
