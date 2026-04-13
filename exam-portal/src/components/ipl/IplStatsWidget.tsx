import Link from "next/link";
import Image from "next/image";

interface StatPlayer {
  playerId: number;
  playerName: string;
  teamName?: string;
  teamSName?: string;
  value: number; // runs or wickets
  matches?: number;
  imageId?: number;
}

interface Props {
  title: string;
  players: StatPlayer[];
  unit: string; // "runs" | "wkts"
  accent?: string;
}

export default function IplStatsWidget({ title, players, unit, accent = "#FFB800" }: Props) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #2A2A3A" }}>
      <div className="px-4 py-3" style={{ background: "#12121A", borderBottom: "1px solid #2A2A3A" }}>
        <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: accent, fontFamily: "var(--font-ipl-display, sans-serif)" }}>
          {title}
        </h3>
      </div>
      <div>
        {players.slice(0, 5).map((p, i) => (
          <Link key={p.playerId} href={`/ipl/players/${p.playerId}`}>
            <div
              className="flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer"
              style={{ borderBottom: "1px solid #2A2A3A", background: i === 0 ? "#12121A" : "transparent" }}
            >
              <span
                className="shrink-0 w-6 h-6 text-xs font-bold rounded-full flex items-center justify-center"
                style={{
                  background: i === 0 ? accent + "33" : "#2A2A3A",
                  color: i === 0 ? accent : "#5A566A",
                  fontFamily: "var(--font-ipl-stats, monospace)",
                }}
              >
                {i + 1}
              </span>
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#2A2A3A] shrink-0">
                {p.imageId ? (
                  <Image src={`/api/ipl/image?id=${p.imageId}&type=player`} alt={p.playerName} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: "#9A96A0" }}>?</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base truncate" style={{ color: "#F0EDE8", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
                  {p.playerName}
                </p>
                {p.teamSName && <p className="text-xs" style={{ color: "#9A96A0" }}>{p.teamSName}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-lg" style={{ color: i === 0 ? accent : "#F0EDE8", fontFamily: "var(--font-ipl-stats, monospace)" }}>
                  {p.value}
                </p>
                <p className="text-xs" style={{ color: "#9A96A0" }}>{unit}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
