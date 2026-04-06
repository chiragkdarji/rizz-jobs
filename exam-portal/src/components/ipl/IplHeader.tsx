"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Scores", href: "/ipl" },
  { label: "Schedule", href: "/ipl/schedule" },
  { label: "Points Table", href: "/ipl/points-table" },
  { label: "Orange Cap", href: "/ipl/orange-cap" },
  { label: "Purple Cap", href: "/ipl/purple-cap" },
  { label: "Teams", href: "/ipl/teams" },
  { label: "News", href: "/ipl/news" },
  { label: "Fantasy", href: "/ipl/fantasy" },
];

export default function IplHeader() {
  const pathname = usePathname();

  return (
    <header
      style={{
        background: "#061624",
        borderBottom: "1px solid #0E2235",
        fontFamily: "var(--font-ipl-display, sans-serif)",
      }}
    >
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
        <Link href="/ipl" className="flex items-center gap-2 shrink-0">
          <span
            className="text-xl font-bold tracking-wider"
            style={{ color: "#D4AF37" }}
          >
            IPL 2025
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: "#FF5A1F", color: "#fff" }}>
            LIVE
          </span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1">
          {NAV.map((item) => {
            const isActive =
              item.href === "/ipl"
                ? pathname === "/ipl"
                : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 rounded text-sm font-semibold whitespace-nowrap transition-colors"
                style={{
                  color: isActive ? "#D4AF37" : "#6B86A0",
                  background: isActive ? "#0E2235" : "transparent",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/"
          className="text-xs shrink-0 transition-colors"
          style={{ color: "#6B86A0" }}
        >
          ← Jobs
        </Link>
      </div>
    </header>
  );
}
