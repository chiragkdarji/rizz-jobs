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
  title: "Ball-by-Ball Commentary — IPL 2026 | Rizz Jobs",
};

function teamColors(sName: string) {
  const t = Object.values(IPL_TEAMS).find((t) => t.fullName.includes(sName));
  return t ? { bg: t.bg, color: t.color } : { bg: "#1C3A6B", color: "#E8E4DC" };
}

export default async function CommentaryPage({ params }: Props) {
  const { matchId } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  // mcenter/v1/{id}/comm returns { comwrapper: [...], miniscore, matchheaders }
  let comwrapper: { commentary?: { commtxt?: string; overnum?: number; ballnbr?: number; eventtype?: string } }[] = [];
  let matchInfo: { team1?: { teamsname: string }; team2?: { teamsname: string }; state?: string; matchdesc?: string } | null = null;

  try {
    const [commRes, matchRes] = await Promise.all([
      fetch(`${base}/api/ipl/match/${matchId}/commentary`, { next: { revalidate: 30 } }),
      fetch(`${base}/api/ipl/match/${matchId}`, { next: { revalidate: 60 } }),
    ]);
    if (commRes.ok) {
      const d = await commRes.json();
      comwrapper = d?.comwrapper ?? [];
    }
    if (matchRes.ok) {
      const d = await matchRes.json();
      matchInfo = d?.info ?? null;
    }
  } catch {/* silently handle */}

  const isLive = matchInfo?.state === "In Progress";
  const t1sName = matchInfo?.team1?.teamsname ?? "";
  const t2sName = matchInfo?.team2?.teamsname ?? "";
  const t1c = teamColors(t1sName);
  const t2c = teamColors(t2sName);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href={`/ipl/match/${matchId}`} className="text-sm mb-4 inline-block" style={{ color: "#6B86A0" }}>
        ← Back to Scorecard
      </Link>

      {matchInfo && (
        <div className="flex items-center gap-3 mb-6">
          {t1sName && <IplTeamBadge shortName={t1sName} bg={t1c.bg} color={t1c.color} />}
          <span style={{ color: "#6B86A0" }}>vs</span>
          {t2sName && <IplTeamBadge shortName={t2sName} bg={t2c.bg} color={t2c.color} />}
          {matchInfo.matchdesc && <span className="text-sm" style={{ color: "#6B86A0" }}>{matchInfo.matchdesc}</span>}
          {isLive && <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "#FF5A1F22", color: "#FF5A1F" }}>LIVE</span>}
        </div>
      )}

      <h1 className="text-xl font-bold mb-6 uppercase tracking-wider" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
        Ball-by-Ball Commentary
        {isLive && <span className="text-sm ml-2 font-normal" style={{ color: "#6B86A0" }}>(auto-refreshes every 30s)</span>}
      </h1>

      <IplCommentary matchId={matchId} isLive={isLive} initialComwrapper={comwrapper} />
    </div>
  );
}
