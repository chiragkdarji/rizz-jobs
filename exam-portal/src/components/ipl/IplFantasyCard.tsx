interface Props {
  matchDesc?: string;
  team1?: string;
  team2?: string;
}

const PLATFORMS = [
  { name: "Dream11", href: "https://www.dream11.com", color: "#E8001C" },
  { name: "MPL", href: "https://www.mpl.live", color: "#00C896" },
  { name: "MyTeam11", href: "https://www.myteam11.com", color: "#FF6B35" },
];

export default function IplFantasyCard({ matchDesc, team1, team2 }: Props) {
  return (
    <div
      className="rounded-xl p-6"
      style={{ background: "#061624", border: "1px solid #0E2235" }}
    >
      <h3
        className="text-lg font-bold mb-1"
        style={{ color: "#D4AF37", fontFamily: "var(--font-ipl-display, sans-serif)" }}
      >
        Fantasy Tips
      </h3>
      {matchDesc && (
        <p className="text-sm mb-4" style={{ color: "#6B86A0" }}>
          {team1} vs {team2} · {matchDesc}
        </p>
      )}
      <div className="flex gap-3 flex-wrap">
        {PLATFORMS.map((p) => (
          <a
            key={p.name}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="px-4 py-2 rounded-lg font-bold text-sm transition-opacity hover:opacity-90"
            style={{ background: p.color, color: "#fff", fontFamily: "var(--font-ipl-display, sans-serif)" }}
          >
            Play on {p.name}
          </a>
        ))}
      </div>
      <p className="text-xs mt-4" style={{ color: "#6B86A0" }}>
        * Affiliate links. Fantasy sports involve financial risk. Play responsibly. T&Cs apply.
      </p>
    </div>
  );
}
