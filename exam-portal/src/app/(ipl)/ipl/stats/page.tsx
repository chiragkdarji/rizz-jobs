import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const revalidate = 3600;

interface StatRow {
  id?: number;
  name?: string;
  teamSName?: string;
  value?: string | number;
  mat?: string | number;
  hs?: string | number;
  avg?: string | number;
  sr?: string | number;
  fifties?: string | number;
  hundreds?: string | number;
  bbi?: string | number;
  eco?: string | number;
  fiveWickets?: string | number;
  imageId?: number;
}

type StatType =
  | "mostRuns"
  | "mostWickets"
  | "mostFours"
  | "mostSixes"
  | "mostFifties"
  | "mostHundreds"
  | "bestBattingAverage"
  | "bestBattingStrikeRate"
  | "bestBowlingAverage"
  | "bestBowlingEconomy"
  | "bestBowlingStrikeRate"
  | "mostFiveWickets";

interface StatCategory {
  label: string;
  type: StatType;
  group: "batting" | "bowling";
  mainLabel: string;
  columns: { key: keyof StatRow; label: string }[];
}

const STAT_CATEGORIES: StatCategory[] = [
  {
    label: "Most Runs",
    type: "mostRuns",
    group: "batting",
    mainLabel: "Runs",
    columns: [
      { key: "mat", label: "Mat" },
      { key: "value", label: "Runs" },
      { key: "hs", label: "HS" },
      { key: "avg", label: "Avg" },
      { key: "sr", label: "SR" },
      { key: "fifties", label: "50s" },
      { key: "hundreds", label: "100s" },
    ],
  },
  {
    label: "Most Fours",
    type: "mostFours",
    group: "batting",
    mainLabel: "Fours",
    columns: [
      { key: "mat", label: "Mat" },
      { key: "value", label: "4s" },
    ],
  },
  {
    label: "Most Sixes",
    type: "mostSixes",
    group: "batting",
    mainLabel: "Sixes",
    columns: [
      { key: "mat", label: "Mat" },
      { key: "value", label: "6s" },
    ],
  },
  {
    label: "Most Fifties",
    type: "mostFifties",
    group: "batting",
    mainLabel: "Fifties",
    columns: [
      { key: "mat", label: "Mat" },
      { key: "value", label: "50s" },
    ],
  },
  {
    label: "Most Hundreds",
    type: "mostHundreds",
    group: "batting",
    mainLabel: "Hundreds",
    columns: [
      { key: "mat", label: "Mat" },
      { key: "value", label: "100s" },
    ],
  },
  {
    label: "Best Avg",
    type: "bestBattingAverage",
    group: "batting",
    mainLabel: "Average",
    columns: [
      { key: "mat", label: "Mat" },
      { key: "value", label: "Avg" },
      { key: "hs", label: "HS" },
      { key: "sr", label: "SR" },
    ],
  },
  {
    label: "Best SR",
    type: "bestBattingStrikeRate",
    group: "batting",
    mainLabel: "Strike Rate",
    columns: [
      { key: "mat", label: "Mat" },
      { key: "value", label: "SR" },
      { key: "hs", label: "HS" },
    ],
  },
  {
    label: "Most Wickets",
    type: "mostWickets",
    group: "bowling",
    mainLabel: "Wickets",
    columns: [
      { key: "mat", label: "Mat" },
      { key: "value", label: "Wkts" },
      { key: "bbi", label: "BBI" },
      { key: "avg", label: "Avg" },
      { key: "eco", label: "Econ" },
      { key: "sr", label: "SR" },
    ],
  },
  {
    label: "Best Economy",
    type: "bestBowlingEconomy",
    group: "bowling",
    mainLabel: "Economy",
    columns: [
      { key: "mat", label: "Mat" },
      { key: "value", label: "Econ" },
      { key: "avg", label: "Avg" },
    ],
  },
  {
    label: "Best Avg",
    type: "bestBowlingAverage",
    group: "bowling",
    mainLabel: "Average",
    columns: [
      { key: "mat", label: "Mat" },
      { key: "value", label: "Avg" },
      { key: "eco", label: "Econ" },
    ],
  },
  {
    label: "Best SR",
    type: "bestBowlingStrikeRate",
    group: "bowling",
    mainLabel: "Strike Rate",
    columns: [
      { key: "mat", label: "Mat" },
      { key: "value", label: "SR" },
      { key: "avg", label: "Avg" },
    ],
  },
  {
    label: "5-Wicket Hauls",
    type: "mostFiveWickets",
    group: "bowling",
    mainLabel: "5Ws",
    columns: [
      { key: "mat", label: "Mat" },
      { key: "value", label: "5Ws" },
    ],
  },
];

const VALID_TYPES = new Set<string>(STAT_CATEGORIES.map((c) => c.type));

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}): Promise<Metadata> {
  const { type } = await searchParams;
  const cat = STAT_CATEGORIES.find((c) => c.type === type) ?? STAT_CATEGORIES[0];
  return {
    title: `IPL 2026 ${cat.label} — Stats | Rizz Jobs`,
    description: `IPL 2026 ${cat.label} leaderboard.`,
  };
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const activeType: StatType = (type && VALID_TYPES.has(type) ? type : "mostRuns") as StatType;
  const activeCat = STAT_CATEGORIES.find((c) => c.type === activeType) ?? STAT_CATEGORIES[0];

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";
  let players: StatRow[] = [];
  try {
    const res = await fetch(`${base}/api/ipl/stats`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      players = data?.[activeType]?.t20StatsList?.[0]?.values ?? [];
    }
  } catch {/* silently handle */}

  const battingCats = STAT_CATEGORIES.filter((c) => c.group === "batting");
  const bowlingCats = STAT_CATEGORIES.filter((c) => c.group === "bowling");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1
        className="text-2xl font-bold mb-6 uppercase tracking-wider"
        style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}
      >
        IPL 2026 Stats
      </h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <aside className="md:w-48 shrink-0">
          {/* Mobile: horizontal scroll */}
          <div className="flex md:hidden gap-2 overflow-x-auto pb-2 mb-4">
            {STAT_CATEGORIES.map((cat) => (
              <Link
                key={cat.type}
                href={`/ipl/stats?type=${cat.type}`}
                className="shrink-0 px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap"
                style={{
                  background: cat.type === activeType ? "#D4AF37" : "#0E2235",
                  color: cat.type === activeType ? "#040E1B" : "#8BB0C8",
                }}
              >
                {cat.label}
              </Link>
            ))}
          </div>

          {/* Desktop: grouped sidebar */}
          <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: "1px solid #0E2235" }}>
            <div className="px-3 py-2" style={{ background: "#061A2E" }}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#FF5A1F" }}>Batting</p>
            </div>
            {battingCats.map((cat) => (
              <Link
                key={cat.type}
                href={`/ipl/stats?type=${cat.type}`}
                className="block px-3 py-2 text-xs font-semibold"
                style={{
                  background: cat.type === activeType ? "#D4AF3722" : "transparent",
                  color: cat.type === activeType ? "#D4AF37" : "#8BB0C8",
                  borderBottom: "1px solid #0E2235",
                }}
              >
                {cat.label}
              </Link>
            ))}
            <div className="px-3 py-2" style={{ background: "#061A2E" }}>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#9333EA" }}>Bowling</p>
            </div>
            {bowlingCats.map((cat) => (
              <Link
                key={cat.type}
                href={`/ipl/stats?type=${cat.type}`}
                className="block px-3 py-2 text-xs font-semibold"
                style={{
                  background: cat.type === activeType ? "#D4AF3722" : "transparent",
                  color: cat.type === activeType ? "#D4AF37" : "#8BB0C8",
                  borderBottom: "1px solid #0E2235",
                }}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </aside>

        {/* Table */}
        <div className="flex-1 min-w-0">
          <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #0E2235" }}>
            <table className="w-full text-sm" style={{ fontFamily: "var(--font-ipl-stats, monospace)" }}>
              <thead>
                <tr style={{ background: "#061624", borderBottom: "1px solid #0E2235" }}>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#6B86A0" }}>#</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#6B86A0" }}>Player</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#6B86A0" }}>Team</th>
                  {activeCat.columns.map((col) => (
                    <th key={col.key} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#6B86A0" }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr key={p.id ?? i} style={{ borderBottom: "1px solid #0E2235" }}>
                    <td className="px-3 py-3 font-bold" style={{ color: i === 0 ? "#D4AF37" : "#6B86A0" }}>{i + 1}</td>
                    <td className="px-3 py-3">
                      <Link href={`/ipl/players/${p.id}`} className="flex items-center gap-2">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#0E2235] shrink-0">
                          {p.imageId ? (
                            <Image
                              src={`/api/ipl/image?id=${p.imageId}&type=player`}
                              alt={p.name ?? ""}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : null}
                        </div>
                        <span className="font-semibold" style={{ color: "#E8E4DC" }}>{p.name}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-3" style={{ color: "#6B86A0" }}>{p.teamSName}</td>
                    {activeCat.columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-3 py-3"
                        style={{
                          color: col.key === "value" ? (i === 0 ? "#D4AF37" : "#E8E4DC") : "#6B86A0",
                          fontWeight: col.key === "value" ? "bold" : "normal",
                        }}
                      >
                        {p[col.key] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
                {players.length === 0 && (
                  <tr>
                    <td colSpan={activeCat.columns.length + 3} className="px-3 py-8 text-center text-sm" style={{ color: "#6B86A0" }}>
                      Stats not available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
