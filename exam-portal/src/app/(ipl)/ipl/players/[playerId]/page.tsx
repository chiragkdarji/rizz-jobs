import type { Metadata } from "next";

export const revalidate = 21600;

interface Props {
  params: Promise<{ playerId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { playerId } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";
  try {
    const res = await fetch(`${base}/api/ipl/player/${playerId}`, { next: { revalidate: 21600 } });
    if (res.ok) {
      const data = await res.json();
      const name = data?.info?.playerInfo?.bat?.name ?? "Player";
      return { title: `${name} — IPL 2026 Stats | Rizz Jobs` };
    }
  } catch {/* silently handle */}
  return { title: "Player Profile | Rizz Jobs" };
}

export default async function PlayerPage({ params }: Props) {
  const { playerId } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let playerData: {
    info?: {
      playerInfo?: {
        bat?: { name?: string; role?: string; intlTeam?: string; dob?: string; birthPlace?: string; imageId?: number };
      };
    };
    career?: unknown;
    batting?: unknown;
    bowling?: unknown;
  } | null = null;

  try {
    const res = await fetch(`${base}/api/ipl/player/${playerId}`, { next: { revalidate: 21600 } });
    if (res.ok) playerData = await res.json();
  } catch {/* silently handle */}

  const info = playerData?.info?.playerInfo?.bat;

  if (!info) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p style={{ color: "#6B86A0" }}>Player not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-6 mb-8">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-[#0E2235] shrink-0" />
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
            {info.name}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6B86A0" }}>
            {[info.role, info.intlTeam].filter(Boolean).join(" · ")}
          </p>
          {info.dob && (
            <p className="text-xs mt-1" style={{ color: "#6B86A0" }}>
              Born: {info.dob}
              {info.birthPlace ? ` · ${info.birthPlace}` : ""}
            </p>
          )}
        </div>
      </div>
      <p className="text-sm" style={{ color: "#6B86A0" }}>
        Detailed career stats and IPL 2026 performance coming soon.
      </p>
    </div>
  );
}
