"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/cricket", label: "Home" },
  { href: "/cricket/live", label: "🔴 Live" },
  { href: "/cricket/upcoming", label: "Schedule" },
  { href: "/cricket/rankings", label: "Rankings" },
  { href: "/cricket/records", label: "Records" },
  { href: "/cricket/news", label: "News" },
  { href: "/ipl", label: "IPL 2026" },
];

export default function CricketHeader() {
  const pathname = usePathname();
  return (
    <header
      style={{
        background: "#0A0A0F",
        borderBottom: "1px solid #2A2A3A",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14 gap-4">
        <Link href="/cricket" className="shrink-0">
          <span
            className="font-bold text-lg tracking-tight"
            style={{ color: "#FFB800", fontFamily: "var(--font-cricket-display, sans-serif)" }}
          >
            🏏 CricScore
          </span>
        </Link>
        <nav className="flex items-center gap-0.5 overflow-x-auto">
          {NAV.map((n) => {
            const active = pathname === n.href || (n.href !== "/cricket" && pathname.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className="whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                style={{
                  color: active ? "#FFB800" : "#9A96A0",
                  background: active ? "#1A1A26" : "transparent",
                }}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
