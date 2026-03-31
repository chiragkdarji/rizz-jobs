"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Finance",  href: "/news/finance" },
  { label: "Business", href: "/news/business" },
  { label: "Markets",  href: "/news/markets" },
  { label: "Economy",  href: "/news/economy" },
  { label: "Startups", href: "/news/startups" },
];

export default function NewsHeader() {
  const pathname = usePathname();

  return (
    <header style={{ backgroundColor: "#070708", borderBottom: "1px solid #1e1e24" }}>
      {/* ── Top bar — masthead ──────────────────────────────────────── */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between"
        style={{ height: "60px" }}
      >
        {/* Logo / masthead */}
        <Link href="/news" className="flex flex-col leading-none group">
          <span
            className="text-[#f2ede6] tracking-tight"
            style={{
              fontFamily: "'DM Serif Display', 'Georgia', serif",
              fontSize: "clamp(1.2rem, 3vw, 1.6rem)",
              fontWeight: 400,
            }}
          >
            Rizz Jobs
          </span>
          <span
            className="font-black uppercase"
            style={{ fontSize: "8px", letterSpacing: "0.22em", color: "#f0a500" }}
          >
            Financial Intelligence
          </span>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/"
            className="text-[10px] font-black uppercase tracking-[0.18em] transition-colors hidden sm:block"
            style={{ color: "#3a3848" }}
          >
            Jobs Portal ↗
          </Link>
          <Link
            href="/news/subscribe"
            className="text-[10px] font-black uppercase tracking-[0.18em] px-4 py-2 transition-opacity hover:opacity-80"
            style={{ backgroundColor: "#f0a500", color: "#070708" }}
          >
            Subscribe
          </Link>
        </div>
      </div>

      {/* ── Nav bar — categories ────────────────────────────────────── */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-hide"
        style={{ borderTop: "1px solid #1e1e24" }}
      >
        <nav className="flex items-center gap-0" style={{ height: "40px" }}>
          <Link
            href="/news"
            className="shrink-0 text-[10px] font-black uppercase tracking-[0.18em] px-4 h-full flex items-center transition-colors"
            style={{
              color: pathname === "/news" ? "#f2ede6" : "#52505e",
              borderBottom: pathname === "/news" ? "2px solid #f0a500" : "2px solid transparent",
            }}
          >
            All
          </Link>
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 text-[10px] font-black uppercase tracking-[0.18em] px-4 h-full flex items-center transition-colors"
                style={{
                  color: active ? "#f2ede6" : "#52505e",
                  borderBottom: active ? "2px solid #f0a500" : "2px solid transparent",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
