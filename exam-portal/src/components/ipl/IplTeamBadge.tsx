interface Props {
  shortName: string;
  bg?: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE = { sm: "text-xs px-1.5 py-0.5", md: "text-sm px-2 py-1", lg: "text-base px-3 py-1.5" };

export default function IplTeamBadge({ shortName, bg = "#1C3A6B", color = "#E8E4DC", size = "md" }: Props) {
  return (
    <span
      className={`inline-block font-bold rounded leading-none ${SIZE[size]}`}
      style={{ background: bg, color, fontFamily: "var(--font-ipl-display, sans-serif)" }}
    >
      {shortName}
    </span>
  );
}
