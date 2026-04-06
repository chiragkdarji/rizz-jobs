interface Batsman {
  batName: string;
  batRuns: number;
  batBalls: number;
  batFours: number;
  batSixes: number;
  batStrikeRate: number;
  outDesc?: string;
  isCaptain?: boolean;
  isKeeper?: boolean;
}

interface Bowler {
  bowlName: string;
  bowlOvs: number | string;
  bowlMaidens: number;
  bowlRuns: number;
  bowlWkts: number;
  bowlNoballs: number;
  bowlWides: number;
  bowlEcon: number;
}

interface FoW {
  batName: string;
  fowScore: number;
  fowBalls: number;
  wktNbr: number;
}

interface Props {
  teamName: string;
  batsmen: Batsman[];
  bowlers: Bowler[];
  fow?: FoW[];
  extras?: { total: number; b?: number; lb?: number; wd?: number; nb?: number };
  totalRuns?: number;
  totalWickets?: number;
  totalOvers?: number;
}

export default function IplScorecard({ teamName, batsmen, bowlers, fow, extras, totalRuns, totalWickets, totalOvers }: Props) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #0E2235" }}>
      {/* Team header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: "#061A2E" }}>
        <span className="font-bold" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>{teamName}</span>
        {totalRuns != null && (
          <span className="font-bold text-lg" style={{ color: "#D4AF37", fontFamily: "var(--font-ipl-stats, monospace)" }}>
            {totalRuns}/{totalWickets ?? 0} ({totalOvers ?? 0} ov)
          </span>
        )}
      </div>

      {/* Batting table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ fontFamily: "var(--font-ipl-stats, monospace)" }}>
          <thead>
            <tr style={{ background: "#061624", borderBottom: "1px solid #0E2235" }}>
              {["Batsman", "Dismissal", "R", "B", "4s", "6s", "SR"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wide" style={{ color: "#6B86A0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {batsmen.map((b, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #0E2235" }}>
                <td className="px-3 py-2 font-semibold" style={{ color: "#E8E4DC" }}>
                  {b.batName}{b.isCaptain ? " (c)" : ""}{b.isKeeper ? " †" : ""}
                </td>
                <td className="px-3 py-2 max-w-xs truncate" style={{ color: "#6B86A0" }}>{b.outDesc ?? "not out"}</td>
                <td className="px-3 py-2 font-bold" style={{ color: "#E8E4DC" }}>{b.batRuns}</td>
                <td className="px-3 py-2" style={{ color: "#6B86A0" }}>{b.batBalls}</td>
                <td className="px-3 py-2" style={{ color: "#3B82F6" }}>{b.batFours}</td>
                <td className="px-3 py-2" style={{ color: "#D4AF37" }}>{b.batSixes}</td>
                <td className="px-3 py-2" style={{ color: "#6B86A0" }}>{b.batStrikeRate?.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Extras */}
      {extras && (
        <div className="px-3 py-2 text-xs" style={{ background: "#061624", borderTop: "1px solid #0E2235", color: "#6B86A0" }}>
          Extras: <strong style={{ color: "#E8E4DC" }}>{extras.total}</strong>
          {extras.b ? ` (b ${extras.b}` : ""}
          {extras.lb ? `, lb ${extras.lb}` : ""}
          {extras.wd ? `, wd ${extras.wd}` : ""}
          {extras.nb ? `, nb ${extras.nb}` : ""}
          {extras.b || extras.lb || extras.wd || extras.nb ? ")" : ""}
        </div>
      )}

      {/* Bowling */}
      <div className="overflow-x-auto mt-1">
        <table className="w-full text-xs" style={{ fontFamily: "var(--font-ipl-stats, monospace)" }}>
          <thead>
            <tr style={{ background: "#061624", borderBottom: "1px solid #0E2235", borderTop: "1px solid #0E2235" }}>
              {["Bowler", "O", "M", "R", "W", "NB", "Wd", "Econ"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wide" style={{ color: "#6B86A0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bowlers.map((b, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #0E2235" }}>
                <td className="px-3 py-2 font-semibold" style={{ color: "#E8E4DC" }}>{b.bowlName}</td>
                <td className="px-3 py-2" style={{ color: "#6B86A0" }}>{b.bowlOvs}</td>
                <td className="px-3 py-2" style={{ color: "#6B86A0" }}>{b.bowlMaidens}</td>
                <td className="px-3 py-2" style={{ color: "#6B86A0" }}>{b.bowlRuns}</td>
                <td className="px-3 py-2 font-bold" style={{ color: "#EF4444" }}>{b.bowlWkts}</td>
                <td className="px-3 py-2" style={{ color: "#6B86A0" }}>{b.bowlNoballs}</td>
                <td className="px-3 py-2" style={{ color: "#6B86A0" }}>{b.bowlWides}</td>
                <td className="px-3 py-2" style={{ color: "#6B86A0" }}>{b.bowlEcon?.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Fall of wickets */}
      {fow && fow.length > 0 && (
        <div className="px-3 py-3" style={{ background: "#061624", borderTop: "1px solid #0E2235" }}>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "#6B86A0" }}>Fall of Wickets</p>
          <div className="flex flex-wrap gap-2">
            {fow.map((w, i) => (
              <span
                key={i}
                className="text-xs px-2 py-1 rounded"
                style={{ background: "#0E2235", color: "#E8E4DC", fontFamily: "var(--font-ipl-stats, monospace)" }}
              >
                {w.wktNbr}-{w.fowScore} ({w.batName}, {w.fowBalls} b)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
