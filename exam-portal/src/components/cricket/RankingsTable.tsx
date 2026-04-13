"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

type Format = "test" | "odi" | "t20";
type Category = "batsmen" | "bowlers" | "allrounders" | "teams";

interface RankRow {
  rank: string;
  name: string;
  country?: string;
  team?: string;
  rating: string;
  points?: string;
  imageId?: number;
}

function extractRows(data: unknown): RankRow[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  // player rankings: { rank: [{ rank, name, country, rating, imageId }] }
  // team standings: { rankingData: [{ rank, name, rating, points }] }
  const arr = (d.rank ?? d.rankingData) as unknown[] | undefined;
  if (!Array.isArray(arr)) return [];
  return arr.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      rank: String(row.rank ?? ""),
      name: String(row.name ?? row.fullName ?? ""),
      country: row.country as string | undefined,
      team: row.team as string | undefined,
      rating: String(row.rating ?? ""),
      points: row.points != null ? String(row.points) : undefined,
      imageId: row.imageId as number | undefined,
    };
  });
}

const FORMAT_TABS: { id: Format; label: string }[] = [
  { id: "test", label: "Test" },
  { id: "odi", label: "ODI" },
  { id: "t20", label: "T20I" },
];

const CAT_TABS: { id: Category; label: string }[] = [
  { id: "batsmen", label: "Batsmen" },
  { id: "bowlers", label: "Bowlers" },
  { id: "allrounders", label: "All-rounders" },
  { id: "teams", label: "Teams" },
];

export default function RankingsTable({
  initialFormat,
  initialCategory,
}: {
  initialFormat: Format;
  initialCategory: Category;
}) {
  const [format, setFormat] = useState<Format>(initialFormat);
  const [category, setCategory] = useState<Category>(initialCategory);
  const [rows, setRows] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/cricket/rankings?category=${category}&format=${format}`)
      .then((r) => r.json())
      .then((d) => { setRows(extractRows(d)); setLoading(false); })
      .catch(() => setLoading(false));
  }, [format, category]);

  const TAB_ACTIVE = { background: "#1A1A26", color: "#FFB800", border: "1px solid #FFB80044" };
  const TAB_IDLE = { background: "transparent", color: "#9A96A0", border: "1px solid transparent" };

  return (
    <div>
      {/* Format tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {FORMAT_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setFormat(t.id)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all"
            style={format === t.id ? TAB_ACTIVE : TAB_IDLE}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {CAT_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setCategory(t.id)}
            className="px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all"
            style={category === t.id
              ? { background: "#12121A", color: "#F0EDE8", border: "1px solid #2A2A3A" }
              : { background: "transparent", color: "#5A566A", border: "1px solid transparent" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-sm" style={{ color: "#5A566A" }}>
          Loading rankings…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: "#5A566A" }}>
          No rankings data available
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #2A2A3A" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#12121A", borderBottom: "1px solid #2A2A3A" }}>
                <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider w-12" style={{ color: "#5A566A" }}>#</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: "#5A566A" }}>Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider hidden sm:table-cell" style={{ color: "#5A566A" }}>Country</th>
                <th className="text-right px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: "#5A566A" }}>
                  {category === "teams" ? "Points" : "Rating"}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
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
                    {r.country ?? r.team ?? ""}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: "#22C55E" }}>
                    {category === "teams" ? (r.points ?? r.rating) : r.rating}
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
