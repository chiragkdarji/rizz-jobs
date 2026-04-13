import type { Metadata } from "next";
import Image from "next/image";
import { IPL_TEAMS, getTeamLogoUrl } from "@/lib/cricbuzz";
import IplPlayerCard from "@/components/ipl/IplPlayerCard";

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
    title: `${team?.fullName ?? slug} — IPL 2026 Squad & Schedule | Rizz Jobs`,
    description: `${team?.fullName ?? slug} squad in IPL 2026.`,
  };
}

export default async function TeamDetailPage({ params }: Props) {
  const { slug } = await params;
  const team = Object.values(IPL_TEAMS).find((t) => t.slug === slug);
  const abbr = Object.entries(IPL_TEAMS).find(([, t]) => t.slug === slug)?.[0];

  if (!team || !abbr) {
    return <div className="p-8 text-center" style={{ color: "#5A566A" }}>Team not found.</div>;
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";
  let teamData: {
    players?: {
      player?: {
        id?: string;
        name: string;
        imageId?: number;
        battingStyle?: string;
        bowlingStyle?: string;
        role?: string;
      }[];
    };
  } | null = null;

  try {
    const res = await fetch(`${base}/api/ipl/team/${team.id}`, { next: { revalidate: 3600 } });
    if (res.ok) teamData = await res.json();
  } catch {/* silently handle */}

  // Cricbuzz returns either:
  //   { Players: { player: [...] } }  (capital P — most common)
  //   { player: [...] }               (flat — older format)
  // Group header rows (BATSMEN, BOWLERS …) have no id and are filtered out.
  const ROLE_HEADERS = ["BATSMEN", "ALL ROUNDER", "WICKET KEEPER", "BOWLERS", "ALL-ROUNDERS", "WICKETKEEPER"];

  type PlayerEntry = { id?: string; name: string; imageId?: number; battingStyle?: string; bowlingStyle?: string; role?: string };
  const raw = teamData?.players as Record<string, unknown> | null;
  const playerArray: PlayerEntry[] =
    (raw?.["Players"] as { player?: PlayerEntry[] } | undefined)?.player ??
    (raw?.["player"] as PlayerEntry[] | undefined) ??
    [];

  const players = playerArray.filter(
    (p) => p.id != null && !ROLE_HEADERS.includes(p.name.toUpperCase())
  );

  const getRole = (p: { battingStyle?: string; bowlingStyle?: string; role?: string }) => {
    if (p.role) return p.role;
    if (p.bowlingStyle && !p.battingStyle) return "Bowler";
    if (p.battingStyle && !p.bowlingStyle) return "Batsman";
    if (p.battingStyle && p.bowlingStyle) return "All-Rounder";
    return undefined;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Team Header */}
      <div
        className="flex items-center gap-6 mb-10 p-6 rounded-2xl"
        style={{ background: team.bg + "18", border: `2px solid ${team.bg}44` }}
      >
        {/* Logo */}
        <div className="relative w-24 h-24 shrink-0">
          <Image
            src={getTeamLogoUrl(abbr)}
            alt={`${team.fullName} logo`}
            fill
            className="object-contain drop-shadow-lg"
            unoptimized
          />
        </div>
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: team.bg, fontFamily: "var(--font-ipl-display, sans-serif)" }}
          >
            {abbr} · IPL 2026
          </p>
          <h1
            className="text-3xl font-bold"
            style={{ color: "#F0EDE8", fontFamily: "var(--font-ipl-display, sans-serif)" }}
          >
            {team.fullName}
          </h1>
        </div>
      </div>

      {/* Squad */}
      <section>
        <h2
          className="text-lg font-bold uppercase tracking-wider mb-4"
          style={{ color: "#F0EDE8", fontFamily: "var(--font-ipl-display, sans-serif)" }}
        >
          Squad
        </h2>
        {players.length === 0 ? (
          <p className="text-sm" style={{ color: "#5A566A" }}>Squad not available.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {players.map((p) => (
              <IplPlayerCard
                key={p.id}
                playerId={p.id!}
                name={p.name}
                role={getRole(p)}
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
