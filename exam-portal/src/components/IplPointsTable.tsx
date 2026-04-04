"use client";

import { useEffect, useState } from "react";
import { IPL_TEAMS } from "@/lib/cricapi";

interface TeamRow {
  teamId?: string;
  teamName?: string;
  teamSName?: string;
  img?: string;
  matchesPlayed?: number;
  matchesWon?: number;
  matchesLost?: number;
  matchesNoResult?: number;
  points?: number;
  nrr?: string;
  lastFive?: string;
  qualify?: string;
}

interface SeriesData {
  seriesName: string;
  pointsTable: TeamRow[];
}

function LastFive({ code }: { code: string }) {
  return (
    <div className="flex gap-0.5">
      {code.split("").slice(-5).map((c, i) => (
        <div
          key={i}
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "2px",
            backgroundColor: c === "W" ? "#22c55e" : c === "L" ? "#f43f5e" : "#9898aa",
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

export default function IplPointsTable() {
  const [data, setData] = useState<SeriesData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/ipl/series-data")
      .then((r) => r.json())
      .then((d) => {
        if (d.pointsTable) setData(d);
        else setError(true);
      })
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="py-6 text-center" style={{ border: "1px solid #1e1e26", backgroundColor: "#0a0a0e" }}>
        <p style={{ color: "#9898aa", fontSize: "12px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
          Points table unavailable
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ border: "1px solid #1e1e26", backgroundColor: "#0a0a0e" }}>
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3 animate-pulse"
            style={{ borderBottom: i < 7 ? "1px solid #1a1a22" : undefined }}
          >
            <div style={{ width: "28px", height: "28px", backgroundColor: "#1e1e26" }} />
            <div style={{ flex: 1, height: "12px", backgroundColor: "#1a1a22", borderRadius: "2px" }} />
            <div style={{ width: "80px", height: "12px", backgroundColor: "#1a1a22", borderRadius: "2px" }} />
          </div>
        ))}
      </div>
    );
  }

  const table = data.pointsTable;

  return (
    <div style={{ border: "1px solid #1e1e26", backgroundColor: "#0a0a0e", overflow: "hidden" }}>
      {/* Column headers */}
      <div
        className="hidden sm:grid px-4 py-2"
        style={{
          gridTemplateColumns: "24px 1fr 36px 36px 36px 36px 52px 72px",
          gap: "8px",
          borderBottom: "1px solid #1e1e26",
          backgroundColor: "#070708",
        }}
      >
        {["#", "Team", "P", "W", "L", "NR", "Pts", "Last 5"].map((h) => (
          <span
            key={h}
            style={{
              fontFamily: "var(--font-ui, system-ui, sans-serif)",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#9898aa",
              textAlign: h === "Team" || h === "#" ? "left" : "center",
              display: "flex",
              alignItems: "center",
              justifyContent: h === "Team" || h === "#" ? "flex-start" : "center",
            }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {table.map((row, idx) => {
        const short = row.teamSName ?? "";
        const meta = IPL_TEAMS[short];
        const inPlayoffs = idx < 4;
        const pts = row.points ?? 0;
        const nrr = row.nrr ?? "+0.000";

        return (
          <div
            key={row.teamId ?? idx}
            style={{
              borderBottom: idx < table.length - 1 ? "1px solid #1a1a22" : undefined,
              borderLeft: inPlayoffs ? "2px solid #22c55e" : "2px solid transparent",
            }}
          >
            {/* Desktop layout */}
            <div
              className="hidden sm:grid px-4 py-3 items-center"
              style={{ gridTemplateColumns: "24px 1fr 36px 36px 36px 36px 52px 72px", gap: "8px" }}
            >
              {/* Rank */}
              <span style={{ color: inPlayoffs ? "#22c55e" : "#9898aa", fontSize: "12px", fontWeight: 600, fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
                {idx + 1}
              </span>

              {/* Team */}
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="shrink-0 flex items-center justify-center"
                  style={{ width: "28px", height: "28px", backgroundColor: meta?.bg ?? "#1e1e26", fontSize: "8px", fontWeight: 800, color: meta?.color ?? "#9898aa", fontFamily: "var(--font-ui, system-ui, sans-serif)", letterSpacing: "0.02em" }}
                >
                  {short}
                </div>
                <span style={{ color: "#e8e4dc", fontSize: "13px", fontWeight: 500, fontFamily: "var(--font-ui, system-ui, sans-serif)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {row.teamName ?? short}
                </span>
              </div>

              {/* P W L NR */}
              {[row.matchesPlayed, row.matchesWon, row.matchesLost, row.matchesNoResult].map((val, i) => (
                <span key={i} style={{ color: "#9898aa", fontSize: "12px", fontFamily: "var(--font-ui, system-ui, sans-serif)", textAlign: "center", display: "block", fontVariantNumeric: "tabular-nums" }}>
                  {val ?? 0}
                </span>
              ))}

              {/* Pts */}
              <span style={{ color: "#f0ece6", fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-ui, system-ui, sans-serif)", textAlign: "center", display: "block", fontVariantNumeric: "tabular-nums" }}>
                {pts}
              </span>

              {/* Last 5 + NRR */}
              <div className="flex flex-col items-center gap-1">
                {row.lastFive ? <LastFive code={row.lastFive} /> : null}
                <span style={{ color: Number(nrr) >= 0 ? "#22c55e" : "#f43f5e", fontSize: "10px", fontFamily: "var(--font-ui, system-ui, sans-serif)", fontVariantNumeric: "tabular-nums" }}>
                  {nrr.startsWith("-") ? nrr : `+${nrr}`}
                </span>
              </div>
            </div>

            {/* Mobile layout */}
            <div className="flex sm:hidden items-center gap-3 px-4 py-3">
              <span style={{ color: inPlayoffs ? "#22c55e" : "#555466", fontSize: "11px", fontWeight: 700, fontFamily: "var(--font-ui, system-ui, sans-serif)", width: "16px", flexShrink: 0 }}>
                {idx + 1}
              </span>
              <div
                className="shrink-0 flex items-center justify-center"
                style={{ width: "28px", height: "28px", backgroundColor: meta?.bg ?? "#1e1e26", fontSize: "8px", fontWeight: 800, color: meta?.color ?? "#9898aa", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}
              >
                {short}
              </div>
              <span style={{ flex: 1, color: "#e8e4dc", fontSize: "13px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
                {row.teamName ?? short}
              </span>
              <div className="text-right shrink-0">
                <div style={{ color: "#f0ece6", fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>{pts} pts</div>
                <div style={{ color: "#555466", fontSize: "10px", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>{row.matchesPlayed ?? 0} played</div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Playoff indicator */}
      {table.length >= 4 && (
        <div className="px-4 py-2" style={{ backgroundColor: "#070708", borderTop: "1px solid #1e1e26" }}>
          <span style={{ color: "#22c55e", fontSize: "9px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-ui, system-ui, sans-serif)" }}>
            ▎ Playoff qualification zone
          </span>
        </div>
      )}
    </div>
  );
}
