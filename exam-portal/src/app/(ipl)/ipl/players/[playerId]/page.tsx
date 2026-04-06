import type { Metadata } from "next";
import Image from "next/image";

export const revalidate = 21600;

interface Props {
  params: Promise<{ playerId: string }>;
}

/** Normalise Cricbuzz player info.
 *  The API endpoint /players/get-info returns the player object at different depths
 *  depending on the API version:
 *   { id, name, role, ... }            ← flat at top-level of info
 *   { playerInfo: { id, name, ... } }  ← one level nested
 *   { playerInfo: { bat: {...} } }      ← two levels nested
 */
function extractPlayerInfo(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const raw = d.info as Record<string, unknown> | undefined;
  if (!raw) return null;

  // Try each nesting level, most-specific first
  const candidates: (Record<string, unknown> | undefined)[] = [
    raw.playerInfo as Record<string, unknown> | undefined,
    (raw.playerInfo as Record<string, unknown> | undefined)?.bat as Record<string, unknown> | undefined,
    raw, // flat form: raw.name exists directly
  ];

  for (const c of candidates) {
    if (!c) continue;
    const name = (c.name ?? c.fullName ?? c.shortName) as string | undefined;
    if (name && typeof name === "string" && name.length > 0) {
      return {
        name,
        role: String(c.role ?? c.bat ?? ""),
        intlTeam: String(c.intlTeam ?? c.country ?? c.teamName ?? ""),
        dob: String(c.dob ?? c.dateOfBirth ?? ""),
        birthPlace: String(c.birthPlace ?? c.placeOfBirth ?? ""),
        imageId: (c.faceImageId ?? c.imageId) as number | undefined,
      };
    }
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
