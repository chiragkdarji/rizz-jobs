import type { Metadata } from "next";
import IplPointsTable from "@/components/ipl/IplPointsTable";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "IPL 2025 Points Table | Rizz Jobs",
  description: "IPL 2025 points table with NRR, wins, losses and last 5 match results for all 10 teams.",
};

export default async function PointsTablePage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let ptRows: Parameters<typeof IplPointsTable>[0]["rows"] = [];
  try {
    const res = await fetch(`${base}/api/ipl/series-data`, { next: { revalidate: 1800 } });
    if (res.ok) {
      const data = await res.json();
      const ptRaw = data?.pointsTable?.pointsTableInfo ?? [];
      ptRows = ptRaw.flatMap((group: { pointsTableDTO?: unknown[] }) => group.pointsTableDTO ?? []).map(
        (r: {
          teamId: number;
          teamName: string;
          teamSName: string;
          matchesPlayed: number;
          matchesWon: number;
          matchesLost: number;
          noResult: number;
          points: number;
          nrr?: string;
          lastFive?: string[];
        }) => ({
          teamId: r.teamId,
          teamName: r.teamName,
          teamSName: r.teamSName,
          matchesPlayed: r.matchesPlayed,
          matchesWon: r.matchesWon,
          matchesLost: r.matchesLost,
          noResult: r.noResult,
          points: r.points,
          nrr: r.nrr,
          lastFive: r.lastFive,
        })
      );
    }
  } catch {/* silently handle */}

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 uppercase tracking-wider" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
        IPL 2025 Points Table
      </h1>
      {ptRows.length > 0 ? (
        <>
          <IplPointsTable rows={ptRows} />
          <p className="mt-3 text-xs" style={{ color: "#3A5060" }}>
            * Top 4 teams (highlighted) qualify for playoffs.
          </p>
        </>
      ) : (
        <p className="text-sm" style={{ color: "#6B86A0" }}>Points table not available yet.</p>
      )}
    </div>
  );
}
