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

interface Powerplay {
  ppType: string;
  from: string;
  to: string;
  runs: number;
  wickets: number;
}

interface Partnership {
  bat1Name: string;
  bat1Runs: number;
  bat1Balls: number;
  bat2Name: string;
  bat2Runs: number;
  bat2Balls: number;
  totalRuns: number;
  totalBalls: number;
  wktNbr: number;
}

interface YetToBat {
  id: number;
  name: string;
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
  yetToBat?: YetToBat[];
  powerplays?: Powerplay[];
  partnerships?: Partnership[];
}

/** Convert sequential ball count to cricket over notation. e.g. 30 → "4.6" */
function ballsToOvr(balls: number): string {
  if (!balls) return "0.0";
  const ov = Math.floor((balls - 1) / 6);
  const b = ((balls - 1) % 6) + 1;
  return `${ov}.${b}`;
}

function fmtOvers(ov: number | undefined): string {
  if (ov == null) return "0";
  const complete = Math.floor(ov);
  const balls = Math.round((ov - complete) * 10);
  if (balls >= 6) return `${complete + 1}`;
  if (balls === 0) return `${complete}`;
  return `${complete}.${balls}`;
}

export default function IplScorecard({ teamName, batsmen, bowlers, fow, extras, totalRuns, totalWickets, totalOvers, yetToBat, powerplays, partnerships }: Props) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #2A2A3A" }}>
      {/* Team header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: "#12121A" }}>
        <span className="font-bold" style={{ color: "#F0EDE8", fontFamily: "var(--font-ipl-display, sans-serif)" }}>{teamName}</span>
        {totalRuns != null && (
          <span className="font-bold text-lg" style={{ color: "#FFB800", fontFamily: "var(--font-ipl-stats, monospace)" }}>
            {totalRuns}/{totalWickets ?? 0} ({fmtOvers(totalOvers)} ov)
          </span>
        )}
      </div>

      {/* Batting table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ fontFamily: "var(--font-ipl-stats, monospace)" }}>
          <thead>
            <tr style={{ background: "#12121A", borderBottom: "1px solid #2A2A3A" }}>
              {["Batsman", "Dismissal", "R", "B", "4s", "6s", "SR"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wide" style={{ color: "#5A566A" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {batsmen.map((b, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #2A2A3A" }}>
                <td className="px-3 py-2 font-semibold" style={{ color: "#F0EDE8" }}>
                  {b.batName}{b.isCaptain ? " (c)" : ""}{b.isKeeper ? " †" : ""}
                </td>
                <td className="px-3 py-2 max-w-xs truncate" style={{ color: "#5A566A" }}>{b.outDesc ?? "not out"}</td>
                <td className="px-3 py-2 font-bold" style={{ color: "#F0EDE8" }}>{b.batRuns}</td>
                <td className="px-3 py-2" style={{ color: "#5A566A" }}>{b.batBalls}</td>
                <td className="px-3 py-2" style={{ color: "#3B82F6" }}>{b.batFours}</td>
                <td className="px-3 py-2" style={{ color: "#FFB800" }}>{b.batSixes}</td>
                <td className="px-3 py-2" style={{ color: "#5A566A" }}>{b.batStrikeRate?.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
          {/* Total row */}
          {totalRuns != null && (
            <tfoot>
              <tr style={{ borderTop: "1px solid #2A2A3A", background: "#12121A" }}>
                <td className="px-3 py-2 font-semibold text-xs uppercase tracking-wide" style={{ color: "#5A566A" }}>Total</td>
                <td className="px-3 py-2 text-xs" style={{ color: "#5A566A" }}>
                  {totalOvers != null && totalOvers > 0
                    ? `${fmtOvers(totalOvers)} Ov, RR: ${(totalRuns / totalOvers).toFixed(2)}`
                    : ""}
                </td>
                <td className="px-3 py-2 font-bold text-xs" style={{ color: "#FFB800" }}>
                  {totalRuns}/{totalWickets ?? 0}
                </td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Yet to Bat */}
      {yetToBat && yetToBat.length > 0 && (
        <div className="px-3 py-2 flex flex-wrap items-center gap-2 text-xs" style={{ borderTop: "1px solid #2A2A3A" }}>
          <span style={{ color: "#5A566A" }}>Yet to Bat:</span>
          {yetToBat.map((p) => (
            <span key={p.id} className="px-2 py-0.5 rounded" style={{ background: "#2A2A3A", color: "#F0EDE8" }}>
              {p.name}
            </span>
          ))}
        </div>
      )}

      {/* Extras */}
      {extras && (
        <div className="px-3 py-2 text-xs" style={{ background: "#12121A", borderTop: "1px solid #2A2A3A", color: "#5A566A" }}>
          Extras: <strong style={{ color: "#F0EDE8" }}>{extras.total}</strong>
          {extras.b ? ` (b ${extras.b}` : ""}
          {extras.lb ? `, lb ${extras.lb}` : ""}
          {extras.wd ? `, wd ${extras.wd}` : ""}
          {extras.nb ? `, nb ${extras.nb}` : ""}
          {extras.b || extras.lb || extras.wd || extras.nb ? ")" : ""}
        </div>
      )}

      {/* Powerplays */}
      {powerplays && powerplays.length > 0 && (
        <div className="px-3 py-3" style={{ background: "#12121A", borderTop: "1px solid #2A2A3A" }}>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "#5A566A" }}>Powerplays</p>
          <table className="w-full text-xs" style={{ fontFamily: "var(--font-ipl-stats, monospace)" }}>
            <thead>
              <tr>
                {["Type", "Overs", "Runs", "Wkts"].map((h) => (
                  <th key={h} className="pb-1 text-left font-semibold" style={{ color: "#5A566A" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {powerplays.map((pp, i) => (
                <tr key={i}>
                  <td className="py-1 pr-4" style={{ color: "#F0EDE8" }}>{pp.ppType}</td>
                  <td className="py-1 pr-4" style={{ color: "#5A566A" }}>{pp.from}–{pp.to}</td>
                  <td className="py-1 pr-4 font-bold" style={{ color: "#F0EDE8" }}>{pp.runs}</td>
                  <td className="py-1" style={{ color: "#EF4444" }}>{pp.wickets}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bowling */}
      <div className="overflow-x-auto mt-1">
        <table className="w-full text-xs" style={{ fontFamily: "var(--font-ipl-stats, monospace)" }}>
          <thead>
            <tr style={{ background: "#12121A", borderBottom: "1px solid #2A2A3A", borderTop: "1px solid #2A2A3A" }}>
              {["Bowler", "O", "M", "R", "W", "NB", "Wd", "Econ"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wide" style={{ color: "#5A566A" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bowlers.map((b, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #2A2A3A" }}>
                <td className="px-3 py-2 font-semibold" style={{ color: "#F0EDE8" }}>{b.bowlName}</td>
                <td className="px-3 py-2" style={{ color: "#5A566A" }}>{b.bowlOvs}</td>
                <td className="px-3 py-2" style={{ color: "#5A566A" }}>{b.bowlMaidens}</td>
                <td className="px-3 py-2" style={{ color: "#5A566A" }}>{b.bowlRuns}</td>
                <td className="px-3 py-2 font-bold" style={{ color: "#EF4444" }}>{b.bowlWkts}</td>
                <td className="px-3 py-2" style={{ color: "#5A566A" }}>{b.bowlNoballs}</td>
                <td className="px-3 py-2" style={{ color: "#5A566A" }}>{b.bowlWides}</td>
                <td className="px-3 py-2" style={{ color: "#5A566A" }}>{b.bowlEcon?.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Fall of wickets */}
      {fow && fow.length > 0 && (
        <div className="px-3 py-3" style={{ background: "#12121A", borderTop: "1px solid #2A2A3A" }}>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "#5A566A" }}>Fall of Wickets</p>
          <div className="flex flex-wrap gap-2">
            {[...fow].sort((a, b) => (a.wktNbr && b.wktNbr ? a.wktNbr - b.wktNbr : a.fowScore - b.fowScore)).map((w, i) => (
              <span
                key={i}
                className="text-xs px-2 py-1 rounded"
                style={{ background: "#2A2A3A", color: "#F0EDE8", fontFamily: "var(--font-ipl-stats, monospace)" }}
              >
                {w.wktNbr || i + 1}-{w.fowScore} ({w.batName}, {ballsToOvr(w.fowBalls)} ov)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Partnerships */}
      {partnerships && partnerships.length > 0 && (
        <div className="px-3 py-3" style={{ background: "#12121A", borderTop: "1px solid #2A2A3A" }}>
          <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "#5A566A" }}>Partnerships</p>
          <div className="space-y-3">
            {partnerships.map((p, i) => {
              const bat1Pct = p.totalRuns > 0 ? Math.round((p.bat1Runs / p.totalRuns) * 100) : 50;
              const bat2Pct = 100 - bat1Pct;
              return (
                <div key={i} className="text-xs" style={{ fontFamily: "var(--font-ipl-stats, monospace)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex-1 text-right truncate" style={{ color: "#F0EDE8" }}>
                      {p.bat1Name} <span style={{ color: "#9A96A0" }}>{p.bat1Runs}({p.bat1Balls})</span>
                    </span>
                    <span className="px-2 py-0.5 rounded font-bold shrink-0 text-center" style={{ background: "#2A2A3A", color: "#FFB800", minWidth: 60 }}>
                      {p.totalRuns}({p.totalBalls})
                    </span>
                    <span className="flex-1 truncate" style={{ color: "#F0EDE8" }}>
                      {p.bat2Name} <span style={{ color: "#9A96A0" }}>{p.bat2Runs}({p.bat2Balls})</span>
                    </span>
                  </div>
                  <div className="flex rounded overflow-hidden h-1.5">
                    <div style={{ width: `${bat1Pct}%`, background: "#9A96A0" }} />
                    <div style={{ width: `${bat2Pct}%`, background: "#FFB800" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
