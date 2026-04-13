import type { Metadata } from "next";
import LiveMatchGrid, { extractMatches } from "@/components/cricket/LiveMatchGrid";
import type { MatchItem } from "@/components/cricket/LiveMatchCard";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Cricket Schedule & Upcoming Matches | CricScore",
  description:
    "Full cricket schedule — upcoming Test, ODI, T20I series and matches worldwide.",
};

async function getMatches(
  base: string,
  path: string,
  rev: number
): Promise<MatchItem[]> {
  try {
    const res = await fetch(`${base}${path}`, { next: { revalidate: rev } });
    if (!res.ok) return [];
    return extractMatches(await res.json());
  } catch {
    return [];
  }
}

export default async function UpcomingPage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  const [upcoming, recent] = await Promise.all([
    getMatches(base, "/api/cricket/upcoming", 300),
    getMatches(base, "/api/cricket/recent", 300),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      {/* Upcoming */}
      <section>
        <h1
          className="text-3xl font-bold mb-1"
          style={{ color: "#FFB800", fontFamily: "var(--font-cricket-display, sans-serif)" }}
        >
          Upcoming Matches
        </h1>
        <p className="text-sm mb-6" style={{ color: "#5A566A" }}>
          Schedule · Series · Fixtures
        </p>
        <LiveMatchGrid
          initialData={upcoming}
          apiUrl={`${base}/api/cricket/upcoming`}
          pollIntervalMs={300_000}
        />
      </section>

      {/* Recent */}
      {recent.length > 0 && (
        <section>
          <h2
            className="text-2xl font-bold mb-6"
            style={{ color: "#F0EDE8", fontFamily: "var(--font-cricket-display, sans-serif)" }}
          >
            Recent Results
          </h2>
          <LiveMatchGrid
            initialData={recent}
            apiUrl={`${base}/api/cricket/recent`}
            pollIntervalMs={300_000}
            maxItems={12}
          />
        </section>
      )}
    </div>
  );
}
