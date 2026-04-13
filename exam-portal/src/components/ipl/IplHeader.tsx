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
];

export default function IplHeader() {
  const pathname = usePathname();

  return (
    <header
      style={{
        background: "#0A0A0F",
        borderBottom: "1px solid #2A2A3A",
        position: "sticky",
        top: 0,
        zIndex: 50,
        fontFamily: "var(--font-ipl-display, sans-serif)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-4 h-14">
        <Link href="/ipl" className="flex items-center gap-2 shrink-0">
          <span
            className="text-lg font-bold tracking-wider"
            style={{ color: "#FFB800" }}
          >
            IPL 2026
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded font-bold"
            style={{ background: "#FF3B3B", color: "#fff" }}
          >
            LIVE
          </span>
        </Link>
        <nav className="flex items-center gap-0.5 overflow-x-auto flex-1">
          {NAV.map((item) => {
            const isActive =
              item.href === "/ipl"
                ? pathname === "/ipl"
                : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors"
                style={{
                  color: isActive ? "#FFB800" : "#9A96A0",
                  background: isActive ? "#1A1A26" : "transparent",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/cricket"
          className="text-xs font-semibold shrink-0 px-3 py-1.5 rounded-md transition-colors"
          style={{ color: "#5A566A", background: "transparent" }}
        >
          🏏 Cricket
        </Link>
        <Link
          href="/"
          className="text-xs shrink-0 transition-colors"
          style={{ color: "#5A566A" }}
        >
          ← Jobs
        </Link>
      </div>
    </header>
  );
}
