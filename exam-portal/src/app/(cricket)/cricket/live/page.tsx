import type { Metadata } from "next";
import LiveMatchGrid from "@/components/cricket/LiveMatchGrid";
import { extractMatches } from "@/lib/cricket-utils";
import type { MatchItem } from "@/components/cricket/LiveMatchCard";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Live Cricket Scores Today | CricScore",
  description:
    "Live cricket scores today — international and domestic matches updated ball by ball. Test, ODI, T20I and more.",
};

async function getLiveMatches(): Promise<MatchItem[]> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";
    const res = await fetch(`${base}/api/cricket/live`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    return extractMatches(await res.json());
  } catch {
    return [];
  }
}

export default async function LivePage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";
  const initialData = await getLiveMatches();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1
          className="text-3xl font-bold mb-1"
          style={{ color: "#FF3B3B", fontFamily: "var(--font-cricket-display, sans-serif)" }}
        >
          ● Live Matches
        </h1>
        <p className="text-sm" style={{ color: "#5A566A" }}>
          Auto-refreshes every 30 seconds
        </p>
      </div>
      <LiveMatchGrid
        initialData={initialData}
        apiUrl={`${base}/api/cricket/live`}
        pollIntervalMs={30_000}
      />
    </div>
  );
}
