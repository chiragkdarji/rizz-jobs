import type { Metadata } from "next";
import IplCommentary from "@/components/ipl/IplCommentary";
import IplTeamBadge from "@/components/ipl/IplTeamBadge";
import { IPL_TEAMS } from "@/lib/cricbuzz";
import Link from "next/link";

export const revalidate = 30;

interface Props {
  params: Promise<{ matchId: string }>;
}

export const metadata: Metadata = {
  title: "Ball-by-Ball Commentary — IPL 2025 | Rizz Jobs",
};

function teamColors(sName: string) {
  const t = Object.values(IPL_TEAMS).find((t) => t.fullName.includes(sName));
  return t ? { bg: t.bg, color: t.color } : { bg: "#1C3A6B", color: "#E8E4DC" };
}

export default async function CommentaryPage({ params }: Props) {
  const { matchId } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let commentary: unknown[] = [];
  let matchInfo: { team1?: { teamSName: string }; team2?: { teamSName: string }; state?: string; matchDesc?: string } | null = null;

  try {
    const [commRes, matchRes] = await Promise.all([
      fetch(`${base}/api/ipl/match/${matchId}/commentary`, { next: { revalidate: 30 } }),
      fetch(`${base}/api/ipl/match/${matchId}`, { next: { revalidate: 60 } }),
    ]);
    if (commRes.ok) {
      const d = await commRes.json();
      commentary = d?.commentaryList ?? [];
    }
    if (matchRes.ok) {
      const d = await matchRes.json();
      matchInfo = d?.info?.matchInfo ?? null;
    }
  } catch {/* silently handle */}

  const isLive = matchInfo?.state === "In Progress";
  const t1c = matchInfo?.team1 ? teamColors(matchInfo.team1.teamSName) : { bg: "#1C3A6B", color: "#E8E4DC" };
  const t2c = matchInfo?.team2 ? teamColors(matchInfo.team2.teamSName) : { bg: "#1C3A6B", color: "#E8E4DC" };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link href={`/ipl/match/${matchId}`} className="text-sm mb-4 inline-block" style={{ color: "#6B86A0" }}>
        ← Back to Scorecard
      </Link>

      {/* Match identifier */}
      {matchInfo && (
        <div className="flex items-center gap-3 mb-6">
          {matchInfo.team1 && <IplTeamBadge shortName={matchInfo.team1.teamSName} bg={t1c.bg} color={t1c.color} />}
          <span style={{ color: "#6B86A0" }}>vs</span>
          {matchInfo.team2 && <IplTeamBadge shortName={matchInfo.team2.teamSName} bg={t2c.bg} color={t2c.color} />}
          {matchInfo.matchDesc && <span className="text-sm" style={{ color: "#6B86A0" }}>{matchInfo.matchDesc}</span>}
          {isLive && <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "#FF5A1F22", color: "#FF5A1F" }}>LIVE</span>}
        </div>
      )}

      <h1 className="text-xl font-bold mb-6 uppercase tracking-wider" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
        Ball-by-Ball Commentary
        {isLive && <span className="text-sm ml-2 font-normal" style={{ color: "#6B86A0" }}>(auto-refreshes every 30s)</span>}
      </h1>

      <IplCommentary
        matchId={matchId}
        isLive={isLive}
        initialData={commentary as Parameters<typeof IplCommentary>[0]["initialData"]}
      />
    </div>
  );
}
