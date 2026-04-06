import type { Metadata } from "next";
import Link from "next/link";
import { IPL_TEAMS } from "@/lib/cricbuzz";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "IPL 2025 Teams | Rizz Jobs",
  description: "All 10 IPL 2025 teams — squads, schedules and results.",
};

export default function TeamsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8 uppercase tracking-wider" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
        IPL 2025 Teams
      </h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.entries(IPL_TEAMS).map(([abbr, team]) => (
          <Link key={abbr} href={`/ipl/teams/${team.slug}`}>
            <div
              className="rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-transform hover:scale-105"
              style={{ background: team.bg + "22", border: `2px solid ${team.bg}` }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black"
                style={{ background: team.bg, color: team.color, fontFamily: "var(--font-ipl-display, sans-serif)" }}
              >
                {abbr}
              </div>
              <p className="text-xs font-semibold text-center" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
                {team.fullName}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
