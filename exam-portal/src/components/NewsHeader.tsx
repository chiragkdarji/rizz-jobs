"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef } from "react";

const NAV = [
  { label: "Finance",  href: "/news/finance" },
  { label: "Business", href: "/news/business" },
  { label: "Markets",  href: "/news/markets" },
  { label: "Economy",  href: "/news/economy" },
  { label: "Startups", href: "/news/startups" },
];

export default function NewsHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return closeSearch();
    router.push(`/news?q=${encodeURIComponent(q)}`);
    closeSearch();
  };

  return (
    <header style={{ backgroundColor: "#070708", borderBottom: "1px solid #1e1e24" }}>
      {/* ── Top bar — masthead ──────────────────────────────────────── */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between"
        style={{ height: "64px" }}
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
            style={{ fontSize: "10px", letterSpacing: "0.22em", color: "#f0a500" }}
          >
            Financial Intelligence
          </span>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Collapsible search */}
          {searchOpen ? (
            <form onSubmit={submitSearch} className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search news…"
                onKeyDown={(e) => e.key === "Escape" && closeSearch()}
                className="text-[12px] font-bold uppercase tracking-[0.1em] bg-transparent outline-none w-36 sm:w-48"
                style={{ color: "#f2ede6", caretColor: "#f0a500", borderBottom: "1px solid #f0a500", paddingBottom: "2px" }}
              />
              <button
                type="button"
                onClick={closeSearch}
                aria-label="Close search"
                style={{ color: "#7c7888", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </form>
          ) : (
            <button
              onClick={openSearch}
              aria-label="Search news"
              style={{ color: "#7c7888", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", minHeight: "44px", padding: "0 4px", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f2ede6")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#7c7888")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
          )}

          <Link
            href="/news/saved"
            aria-label="Saved articles"
            className="hidden sm:flex items-center"
            style={{ color: "#7c7888", minHeight: "44px", padding: "0 4px", transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#f2ede6")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#7c7888")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
          </Link>

          <Link
            href="/"
            className="text-[11px] font-black uppercase tracking-[0.18em] transition-colors hidden sm:block"
            style={{ color: "#7c7888" }}
          >
            Jobs ↗
          </Link>
          <Link
            href="/news/subscribe"
            className="text-[11px] font-black uppercase tracking-[0.18em] px-4 py-3 transition-opacity hover:opacity-80"
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
        <nav className="flex items-center gap-0" style={{ height: "48px" }}>
          <Link
            href="/news"
            className="shrink-0 text-[11px] font-black uppercase tracking-[0.18em] px-4 sm:px-5 h-full flex items-center transition-colors"
            style={{
              color: pathname === "/news" ? "#f2ede6" : "#7c7888",
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
                className="shrink-0 text-[11px] font-black uppercase tracking-[0.18em] px-4 sm:px-5 h-full flex items-center transition-colors"
                style={{
                  color: active ? "#f2ede6" : "#7c7888",
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
