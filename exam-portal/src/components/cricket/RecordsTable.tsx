"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

type MatchType = "1" | "2" | "3";
type StatsType =
  | "mostRuns"
  | "mostWickets"
  | "highestScore"
  | "highestAvg"
  | "mostHundreds"
  | "mostFifties"
  | "mostSixes"
  | "lowestAvg"
  | "bestBowlingInnings"
  | "mostFiveWickets";

interface RecordRow {
  rank: string;
  name: string;
  country?: string;
  value: string;
  imageId?: number;
}

function extractRows(data: unknown): RecordRow[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  // Response: { t20StatsList | testStatsList | odiStatsList: { values: [{ values: string[] }] } }
  // OR flat: { values: [{ values: string[] }] }
  const listKey = Object.keys(d).find(
    (k) => k.endsWith("StatsList") || k === "values"
  );
  if (!listKey) return [];
  const statList = d[listKey] as Record<string, unknown> | unknown[] | undefined;
  const rows =
    Array.isArray(statList)
      ? (statList as unknown[])
      : (statList as Record<string, unknown>)?.values as unknown[];
  if (!Array.isArray(rows)) return [];
  return rows.map((r, i) => {
    const row = r as Record<string, unknown>;
    // Cricbuzz: row.values = [id, name, team, matches, innings, value, avg?]
    const v = Array.isArray(row.values) ? (row.values as string[]) : [];
    return {
      rank: String(i + 1),
      name: v[1] ?? (row.name as string) ?? "",
      country: v[2] ?? (row.country as string) ?? "",
      value: v[5] ?? v[4] ?? (row.value as string) ?? "",
      imageId: row.imageId as number | undefined,
    };
  }).filter((r) => r.name);
}

const FORMAT_TABS: { id: MatchType; label: string }[] = [
  { id: "1", label: "Test" },
  { id: "2", label: "ODI" },
  { id: "3", label: "T20I" },
];

const STAT_TABS: { id: StatsType; label: string; batting: boolean }[] = [
  { id: "mostRuns", label: "Most Runs", batting: true },
  { id: "mostWickets", label: "Most Wickets", batting: false },
  { id: "highestScore", label: "Highest Score", batting: true },
  { id: "highestAvg", label: "Highest Avg", batting: true },
  { id: "mostHundreds", label: "Most 100s", batting: true },
  { id: "mostFifties", label: "Most 50s", batting: true },
  { id: "mostSixes", label: "Most Sixes", batting: true },
  { id: "bestBowlingInnings", label: "Best Innings", batting: false },
  { id: "mostFiveWickets", label: "5-wicket Hauls", batting: false },
];

export default function RecordsTable({
  initialMatchType,
  initialStatsType,
}: {
  initialMatchType: MatchType;
  initialStatsType: StatsType;
}) {
  const [matchType, setMatchType] = useState<MatchType>(initialMatchType);
  const [statsType, setStatsType] = useState<StatsType>(initialStatsType);
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/cricket/records?statsType=${statsType}&matchType=${matchType}`)
      .then((r) => r.json())
      .then((d) => { setRows(extractRows(d)); setLoading(false); })
      .catch(() => setLoading(false));
  }, [matchType, statsType]);

  const TAB_ACTIVE = { background: "#1A1A26", color: "#FFB800", border: "1px solid #FFB80044" };
  const TAB_IDLE = { background: "transparent", color: "#9A96A0", border: "1px solid transparent" };

  const batting = STAT_TABS.find((s) => s.id === statsType)?.batting ?? true;

  return (
    <div>
      {/* Format tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {FORMAT_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setMatchType(t.id)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all"
            style={matchType === t.id ? TAB_ACTIVE : TAB_IDLE}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats type tabs — split batting/bowling */}
      <div className="space-y-1 mb-6">
        <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "#5A566A" }}>Batting</p>
        <div className="flex gap-1 flex-wrap">
          {STAT_TABS.filter((s) => s.batting).map((t) => (
            <button
              key={t.id}
              onClick={() => setStatsType(t.id)}
              className="px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all"
              style={statsType === t.id
                ? { background: "#12121A", color: "#F0EDE8", border: "1px solid #2A2A3A" }
                : { background: "transparent", color: "#5A566A", border: "1px solid transparent" }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs uppercase tracking-wider mt-3 mb-1" style={{ color: "#5A566A" }}>Bowling</p>
        <div className="flex gap-1 flex-wrap">
          {STAT_TABS.filter((s) => !s.batting).map((t) => (
            <button
              key={t.id}
              onClick={() => setStatsType(t.id)}
              className="px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all"
              style={statsType === t.id
                ? { background: "#12121A", color: "#F0EDE8", border: "1px solid #2A2A3A" }
                : { background: "transparent", color: "#5A566A", border: "1px solid transparent" }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-sm" style={{ color: "#5A566A" }}>
          Loading records…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: "#5A566A" }}>
          No data available
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #2A2A3A" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#12121A", borderBottom: "1px solid #2A2A3A" }}>
                <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider w-12" style={{ color: "#5A566A" }}>#</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: "#5A566A" }}>Player</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider hidden sm:table-cell" style={{ color: "#5A566A" }}>Country</th>
                <th className="text-right px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: "#5A566A" }}>
                  {batting ? "Value" : "Wickets"}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 25).map((r, i) => (
                <tr
                  key={i}
                  style={{
                    background: i % 2 === 0 ? "#0E0E16" : "#0A0A0F",
                    borderBottom: "1px solid #1A1A26",
                  }}
                >
                  <td className="px-4 py-3 font-bold tabular-nums" style={{ color: "#FFB800" }}>
                    {r.rank}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {r.imageId ? (
                        <div className="relative w-7 h-7 shrink-0">
                          <Image
                            src={`/api/ipl/image?id=${r.imageId}&type=player`}
                            alt={r.name}
                            fill
                            className="object-cover rounded-full"
                            unoptimized
                          />
                        </div>
                      ) : null}
                      <span style={{ color: "#F0EDE8" }}>{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell" style={{ color: "#9A96A0" }}>
                    {r.country}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold" style={{ color: "#22C55E" }}>
                    {r.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
