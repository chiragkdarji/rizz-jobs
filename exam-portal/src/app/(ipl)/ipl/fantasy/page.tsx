import type { Metadata } from "next";
import IplFantasyCard from "@/components/ipl/IplFantasyCard";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "IPL 2026 Fantasy Tips | Rizz Jobs",
  description: "IPL 2026 fantasy cricket tips — best picks for Dream11, MPL and MyTeam11.",
};

export default async function FantasyPage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let todayMatches: { matchInfo: { matchId: number; matchDesc: string; team1: { teamSName: string }; team2: { teamSName: string }; startDate: string } }[] = [];
  try {
    const res = await fetch(`${base}/api/ipl/live`, { next: { revalidate: 120 } });
    if (res.ok) {
      const data = await res.json();
      todayMatches = data?.matches ?? [];
    }
    if (todayMatches.length === 0) {
      // Try upcoming
      const res2 = await fetch(`${base}/api/ipl/series-data`, { next: { revalidate: 1800 } });
      if (res2.ok) {
        const data2 = await res2.json();
        todayMatches = (data2?.upcoming ?? []).slice(0, 2);
      }
    }
  } catch {/* silently handle */}

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2 uppercase tracking-wider" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
        IPL 2026 Fantasy
      </h1>
      <p className="text-sm mb-8" style={{ color: "#6B86A0" }}>
        Best fantasy picks for today&apos;s IPL matches.
      </p>

      {todayMatches.length === 0 ? (
        <div className="space-y-4">
          <IplFantasyCard />
        </div>
      ) : (
        <div className="space-y-6">
          {todayMatches.map((m) => (
            <IplFantasyCard
              key={m.matchInfo.matchId}
              matchDesc={m.matchInfo.matchDesc}
              team1={m.matchInfo.team1.teamSName}
              team2={m.matchInfo.team2.teamSName}
            />
          ))}
        </div>
      )}

      <div className="mt-12 p-6 rounded-xl" style={{ background: "#061624", border: "1px solid #0E2235" }}>
        <h2 className="text-lg font-bold mb-4" style={{ color: "#D4AF37", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
          Fantasy Tips for IPL 2026
        </h2>
        <ul className="space-y-2 text-sm" style={{ color: "#6B86A0" }}>
          <li>• Pick in-form batsmen from the top of the order</li>
          <li>• Include a wicket-keeper who bats early in the order</li>
          <li>• Choose death-over bowlers for maximum wicket potential</li>
          <li>• Balance your team between two squads</li>
          <li>• Check pitch conditions and playing XI before locking in</li>
        </ul>
        <p className="mt-4 text-xs" style={{ color: "#6B86A0" }}>
          Fantasy sports involve financial risk. Rizz Jobs is not responsible for fantasy decisions. Play responsibly and within your means.
        </p>
      </div>
    </div>
  );
}
