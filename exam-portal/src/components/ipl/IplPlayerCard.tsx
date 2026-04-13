import Link from "next/link";
import Image from "next/image";

interface Props {
  playerId: number | string;
  name: string;
  role?: string;
  teamShort?: string;
  teamBg?: string;
  teamColor?: string;
  imageId?: number;
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function IplPlayerCard({ playerId, name, role, teamShort, teamBg, teamColor, imageId }: Props) {
  const href = `/ipl/players/${playerId}-${slugify(name)}`;
  return (
    <Link href={href}>
      <div
        className="rounded-lg p-4 flex flex-col items-center text-center gap-2 transition-colors cursor-pointer"
        style={{ background: "#061624", border: "1px solid #0E2235" }}
      >
        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-[#0E2235]">
          {imageId ? (
            <Image
              src={`/api/ipl/image?id=${imageId}&type=player`}
              alt={name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl" style={{ color: "#6B86A0" }}>
              👤
            </div>
          )}
        </div>
        <div>
          <p className="font-bold text-sm" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
            {name}
          </p>
          {role && <p className="text-xs mt-0.5" style={{ color: "#6B86A0" }}>{role}</p>}
          {teamShort && (
            <span
              className="inline-block text-xs font-bold mt-1 px-2 py-0.5 rounded"
              style={{ background: teamBg ?? "#1C3A6B", color: teamColor ?? "#E8E4DC" }}
            >
              {teamShort}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
