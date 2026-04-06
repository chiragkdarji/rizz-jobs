import type { Metadata } from "next";
import Image from "next/image";

export const revalidate = 21600;

interface Props {
  params: Promise<{ playerId: string }>;
}

/** Normalise Cricbuzz player info — the API may return { playerInfo: { bat: {...} } }
 *  or the flat form { playerInfo: { id, name, role, ... } }. */
function extractPlayerInfo(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  // Try nested: info.playerInfo.bat (some Cricbuzz responses wrap batting info under "bat")
  const raw = d?.info as Record<string, unknown> | undefined;
  const playerInfo = raw?.playerInfo as Record<string, unknown> | undefined;
  if (!playerInfo) return null;

  // Flat form: playerInfo.name exists directly
  if (typeof playerInfo.name === "string" || typeof playerInfo.id !== "undefined") {
    return {
      name: (playerInfo.name ?? playerInfo.fullName ?? "") as string,
      role: (playerInfo.role ?? playerInfo.bat?.toString() ?? "") as string,
      intlTeam: (playerInfo.intlTeam ?? playerInfo.country ?? "") as string,
      dob: (playerInfo.dob ?? playerInfo.dateOfBirth ?? "") as string,
      birthPlace: (playerInfo.birthPlace ?? playerInfo.placeOfBirth ?? "") as string,
      imageId: (playerInfo.faceImageId ?? playerInfo.imageId) as number | undefined,
    };
  }

  // Wrapped form: playerInfo.bat contains the player details
  const bat = playerInfo.bat as Record<string, unknown> | undefined;
  if (bat) {
    return {
      name: (bat.name ?? bat.fullName ?? "") as string,
      role: (bat.role ?? "") as string,
      intlTeam: (bat.intlTeam ?? bat.country ?? "") as string,
      dob: (bat.dob ?? bat.dateOfBirth ?? "") as string,
      birthPlace: (bat.birthPlace ?? bat.placeOfBirth ?? "") as string,
      imageId: (bat.imageId ?? bat.faceImageId) as number | undefined,
    };
  }

  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { playerId } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";
  try {
    const res = await fetch(`${base}/api/ipl/player/${playerId}`, { next: { revalidate: 21600 } });
    if (res.ok) {
      const data = await res.json();
      const info = extractPlayerInfo(data);
      if (info?.name) return { title: `${info.name} — IPL 2026 Stats | Rizz Jobs` };
    }
  } catch {/* silently handle */}
  return { title: "Player Profile | Rizz Jobs" };
}

export default async function PlayerPage({ params }: Props) {
  const { playerId } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rizzjobs.in";

  let playerData: unknown = null;

  try {
    const res = await fetch(`${base}/api/ipl/player/${playerId}`, { next: { revalidate: 21600 } });
    if (res.ok) playerData = await res.json();
  } catch {/* silently handle */}

  const info = extractPlayerInfo(playerData);

  if (!info || !info.name) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p style={{ color: "#6B86A0" }}>Player profile not available.</p>
        <p className="mt-2 text-xs" style={{ color: "#6B86A0" }}>
          Player data may not be available for this IPL season.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-6 mb-8 p-6 rounded-2xl" style={{ background: "#061624", border: "1px solid #0E2235" }}>
        {/* Player avatar */}
        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-[#0E2235] shrink-0">
          {info.imageId ? (
            <Image
              src={`/api/ipl/image?id=${info.imageId}&type=player`}
              alt={info.name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl" style={{ color: "#6B86A0" }}>
              👤
            </div>
          )}
        </div>
        <div>
          <h1
            className="text-3xl font-bold"
            style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}
          >
            {info.name}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#8BB0C8" }}>
            {[info.role, info.intlTeam].filter(Boolean).join(" · ")}
          </p>
          {info.dob && (
            <p className="text-xs mt-1" style={{ color: "#6B86A0" }}>
              Born: {info.dob}{info.birthPlace ? ` · ${info.birthPlace}` : ""}
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
