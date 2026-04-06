import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { IPL_TEAMS, getTeamLogoUrl } from "@/lib/cricbuzz";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "IPL 2026 Teams | Rizz Jobs",
  description: "All 10 IPL 2026 teams — squads, schedules and results.",
};

export default function TeamsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1
        className="text-2xl font-bold mb-8 uppercase tracking-wider"
        style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}
      >
        IPL 2026 Teams
      </h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.entries(IPL_TEAMS).map(([abbr, team]) => (
          <Link key={abbr} href={`/ipl/teams/${team.slug}`}>
            <div
              className="rounded-xl p-5 flex flex-col items-center gap-4 cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
              style={{
                background: team.bg + "18",
                border: `2px solid ${team.bg}66`,
              }}
            >
              {/* Logo */}
              <div className="relative w-20 h-20 shrink-0">
                <Image
                  src={getTeamLogoUrl(abbr)}
                  alt={`${team.fullName} logo`}
                  fill
                  className="object-contain drop-shadow-md"
                  unoptimized
                />
              </div>
              {/* Team name + abbr */}
              <div className="text-center">
                <p
                  className="text-xs font-bold uppercase tracking-wider mb-1"
                  style={{ color: team.bg, fontFamily: "var(--font-ipl-display, sans-serif)" }}
                >
                  {abbr}
                </p>
                <p
                  className="text-xs font-semibold leading-tight"
                  style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}
                >
                  {team.fullName}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
