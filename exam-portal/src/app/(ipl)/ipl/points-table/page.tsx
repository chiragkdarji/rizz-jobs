import type { Metadata } from "next";
import IplPointsTable from "@/components/ipl/IplPointsTable";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "IPL 2026 Points Table | Rizz Jobs",
  description: "IPL 2026 points table with wins, losses and points for all 10 teams.",
};

export default async function PointsTablePage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let ptRows: Parameters<typeof IplPointsTable>[0]["rows"] = [];
  try {
    const res = await fetch(`${base}/api/ipl/series-data`, { next: { revalidate: 1800 } });
    if (res.ok) {
      const data = await res.json();
      // series-data now returns computed pointsTable: { teamId, teamSName, played, won, lost, nr, points }
      ptRows = (data?.pointsTable ?? []).map(
        (r: { teamId: number; teamSName: string; played: number; won: number; lost: number; nr: number; points: number }) => ({
          teamId: r.teamId,
          teamName: r.teamSName,
          teamSName: r.teamSName,
          matchesPlayed: r.played,
          matchesWon: r.won,
          matchesLost: r.lost,
          noResult: r.nr,
          points: r.points,
        })
      );
    }
  } catch {/* silently handle */}

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 uppercase tracking-wider" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
        IPL 2026 Points Table
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
