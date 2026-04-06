import type { Metadata } from "next";
import { IPL_TEAMS } from "@/lib/cricbuzz";
import IplPlayerCard from "@/components/ipl/IplPlayerCard";
import IplScheduleStrip from "@/components/ipl/IplScheduleStrip";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return Object.values(IPL_TEAMS).map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const team = Object.values(IPL_TEAMS).find((t) => t.slug === slug);
  return {
    title: `${team?.fullName ?? slug} — IPL 2025 Squad & Schedule | Rizz Jobs`,
    description: `${team?.fullName ?? slug} squad, upcoming matches and recent results in IPL 2025.`,
  };
}

export default async function TeamDetailPage({ params }: Props) {
  const { slug } = await params;
  const team = Object.values(IPL_TEAMS).find((t) => t.slug === slug);
  const abbr = Object.entries(IPL_TEAMS).find(([, t]) => t.slug === slug)?.[0];

  if (!team) {
    return <div className="p-8 text-center" style={{ color: "#6B86A0" }}>Team not found.</div>;
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";
  let teamData: {
    players?: { player?: { id: number; name: string; role?: string; imageId?: number }[] };
    schedules?: unknown;
    results?: unknown;
  } | null = null;

  try {
    const res = await fetch(`${base}/api/ipl/team/${team.id}`, { next: { revalidate: 3600 } });
    if (res.ok) teamData = await res.json();
  } catch {/* silently handle */}

  const players = teamData?.players?.player ?? [];

  // Parse upcoming matches from schedules
  const upcomingMatches: Parameters<typeof IplScheduleStrip>[0]["matches"] = [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Team Header */}
      <div className="flex items-center gap-4 mb-8">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black shrink-0"
          style={{ background: team.bg, color: team.color, fontFamily: "var(--font-ipl-display, sans-serif)" }}
        >
          {abbr}
        </div>
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
            {team.fullName}
          </h1>
          <p className="text-sm" style={{ color: "#6B86A0" }}>IPL 2025</p>
        </div>
      </div>

      {/* Upcoming */}
      {upcomingMatches.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold uppercase tracking-wider mb-4" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
            Upcoming Matches
          </h2>
          <IplScheduleStrip matches={upcomingMatches} />
        </section>
      )}

      {/* Squad */}
      <section>
        <h2 className="text-lg font-bold uppercase tracking-wider mb-4" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
          Squad
        </h2>
        {players.length === 0 ? (
          <p className="text-sm" style={{ color: "#6B86A0" }}>Squad not available.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {players.map((p) => p && (
              <IplPlayerCard
                key={p.id}
                playerId={p.id}
                name={p.name}
                role={p.role}
                teamShort={abbr}
                teamBg={team.bg}
                teamColor={team.color}
                imageId={p.imageId}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
