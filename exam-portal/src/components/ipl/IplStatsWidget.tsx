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

export default function IplStatsWidget({ title, players, unit, accent = "#D4AF37" }: Props) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #0E2235" }}>
      <div className="px-4 py-3" style={{ background: "#061A2E", borderBottom: "1px solid #0E2235" }}>
        <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: accent, fontFamily: "var(--font-ipl-display, sans-serif)" }}>
          {title}
        </h3>
      </div>
      <div>
        {players.slice(0, 5).map((p, i) => (
          <Link key={p.playerId} href={`/ipl/players/${p.playerId}`}>
            <div
              className="flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer"
              style={{ borderBottom: "1px solid #0E2235", background: i === 0 ? "#061624" : "transparent" }}
            >
              <span
                className="shrink-0 w-6 h-6 text-xs font-bold rounded-full flex items-center justify-center"
                style={{
                  background: i === 0 ? accent + "33" : "#0E2235",
                  color: i === 0 ? accent : "#6B86A0",
                  fontFamily: "var(--font-ipl-stats, monospace)",
                }}
              >
                {i + 1}
              </span>
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#0E2235] shrink-0">
                {p.imageId ? (
                  <Image src={`/api/ipl/image?id=${p.imageId}&type=player`} alt={p.playerName} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: "#6B86A0" }}>?</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: "#E8E4DC", fontFamily: "var(--font-ipl-display, sans-serif)" }}>
                  {p.playerName}
                </p>
                {p.teamSName && <p className="text-xs" style={{ color: "#6B86A0" }}>{p.teamSName}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-base" style={{ color: i === 0 ? accent : "#E8E4DC", fontFamily: "var(--font-ipl-stats, monospace)" }}>
                  {p.value}
                </p>
                <p className="text-xs" style={{ color: "#6B86A0" }}>{unit}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
