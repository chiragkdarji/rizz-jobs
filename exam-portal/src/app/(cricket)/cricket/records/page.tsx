import type { Metadata } from "next";
import RecordsTable from "@/components/cricket/RecordsTable";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Cricket Records – Most Runs, Wickets & More | CricScore",
  description:
    "All-time cricket records: most runs, most wickets, highest scores, best bowling figures in Test, ODI and T20I cricket.",
};

export default function RecordsPage({
  searchParams,
}: {
  searchParams: { statsType?: string; matchType?: string };
}) {
  const statsType = (searchParams.statsType ?? "mostRuns") as Parameters<typeof RecordsTable>[0]["initialStatsType"];
  const matchType = (searchParams.matchType ?? "1") as "1" | "2" | "3";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1
        className="text-3xl font-bold mb-1"
        style={{ color: "#F0EDE8", fontFamily: "var(--font-cricket-display, sans-serif)" }}
      >
        Cricket Records
      </h1>
      <p className="text-sm mb-8" style={{ color: "#5A566A" }}>
        All-time batting & bowling records · Test · ODI · T20I
      </p>

      <RecordsTable
        initialMatchType={matchType}
        initialStatsType={statsType}
      />
    </div>
  );
}
