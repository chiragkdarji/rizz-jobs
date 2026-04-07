import { IPL_TEAMS } from "@/lib/cricbuzz";

interface Props {
  shortName: string;
  bg?: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE = { sm: "text-xs px-2 py-1", md: "text-sm px-3 py-1.5", lg: "text-base px-4 py-2" };

/** Resolve team colors from any form of name:
 *  - direct key "KKR", "MI", "PBKS" (most schedule data)
 *  - partial full-name match "Mumbai", "Rajasthan" (live match data)
 *  Falls back to generic navy if unknown. */
function resolveColors(name: string): { bg: string; color: string } {
  if (!name) return { bg: "#1C3A6B", color: "#E8E4DC" };
  // 1. Direct abbreviation key
  const byKey = IPL_TEAMS[name.toUpperCase()];
  if (byKey) return { bg: byKey.bg, color: byKey.color };
  // 2. Partial full-name match (case-insensitive)
  const byName = Object.values(IPL_TEAMS).find((t) =>
    t.fullName.toLowerCase().includes(name.toLowerCase())
  );
  return byName ? { bg: byName.bg, color: byName.color } : { bg: "#1C3A6B", color: "#E8E4DC" };
}

export default function IplTeamBadge({ shortName, bg, color, size = "md" }: Props) {
  const resolved = resolveColors(shortName);
  const finalBg = bg ?? resolved.bg;
  const finalColor = color ?? resolved.color;
  return (
    <span
      className={`inline-block font-bold rounded leading-none ${SIZE[size]}`}
      style={{ background: finalBg, color: finalColor, fontFamily: "var(--font-ipl-display, sans-serif)" }}
    >
      {shortName}
    </span>
  );
}
