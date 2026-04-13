import type { Metadata } from "next";
import RankingsTable from "@/components/cricket/RankingsTable";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "ICC Cricket Rankings – Test, ODI, T20I | CricScore",
  description:
    "Live ICC cricket rankings for batsmen, bowlers, all-rounders and teams across Test, ODI and T20I formats.",
};

export default function RankingsPage({
  searchParams,
}: {
  searchParams: { format?: string; category?: string };
}) {
  const format = (searchParams.format ?? "test") as "test" | "odi" | "t20";
  const category = (searchParams.category ?? "batsmen") as
    | "batsmen"
    | "bowlers"
    | "allrounders"
    | "teams";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1
        className="text-3xl font-bold mb-1"
        style={{ color: "#F0EDE8", fontFamily: "var(--font-cricket-display, sans-serif)" }}
      >
        ICC Rankings
      </h1>
      <p className="text-sm mb-8" style={{ color: "#5A566A" }}>
        Updated weekly · Batsmen · Bowlers · All-rounders · Teams
      </p>

      <RankingsTable initialFormat={format} initialCategory={category} />
    </div>
  );
}
