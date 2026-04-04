"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const NAV = [
  { label: "Finance",  href: "/news/finance" },
  { label: "Business", href: "/news/business" },
  { label: "Markets",  href: "/news/markets" },
  { label: "Economy",  href: "/news/economy" },
  { label: "Startups", href: "/news/startups" },
  { label: "IPL",      href: "/news/ipl" },
];

// Both pass WCAG AA (4.5:1) on #070708
const MUTED = "#9898aa";
const TEXT  = "#ede9e2";

function DateBadge() {
  const [label, setLabel] = useState("");
  useEffect(() => {
    setLabel(
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
  }, []);
  return <>{label}</>;
}

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
  const closeSearch = () => { setSearchOpen(false); setSearchQuery(""); };
  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return closeSearch();
    router.push(`/news?q=${encodeURIComponent(q)}`);
    closeSearch();
  };

  return (
    <header>
      {/* ── Amber brand stripe ──────────────────────────────────── */}
      <div style={{ height: "3px", backgroundColor: "#f0a500" }} />

      {/* ── Masthead ─────────────────────────────────────────────── */}
      <div style={{ backgroundColor: "#070708", borderBottom: "1px solid #1e1e26" }}>
        <div
          className="max-w-7xl mx-auto px-4 sm:px-6"
          style={{
            height: "80px",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: "24px",
          }}
        >

          {/* Left: date + edition */}
          <div className="hidden lg:flex flex-col justify-center gap-1">
            <span
              style={{
                fontFamily: "var(--font-ui, system-ui, sans-serif)",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: MUTED,
                lineHeight: 1,
              }}
            >
              <DateBadge />
            </span>
            <span
              style={{
                fontFamily: "var(--font-ui, system-ui, sans-serif)",
                fontSize: "9px",
                fontWeight: 400,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "#7878a0",
                lineHeight: 1,
              }}
            >
              India Edition · English
            </span>
          </div>
          {/* Mobile spacer */}
          <div className="flex lg:hidden" />

          {/* Center: Logo with flanking rules */}
          <Link href="/news" className="flex flex-col items-center gap-1 select-none group">
            <div className="flex items-center gap-3 sm:gap-5 w-full">
              <div
                style={{ flex: 1, height: "1px", backgroundColor: "#2a2a34" }}
              />
              <span
                style={{
                  fontFamily: "var(--font-logo, 'Georgia', serif)",
                  fontSize: "clamp(1.55rem, 3.5vw, 2.15rem)",
                  fontWeight: 600,
                  color: TEXT,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  lineHeight: 1,
                  transition: "color 0.2s",
                }}
                className="group-hover:text-white"
              >
                Rizz Jobs
              </span>
              <div
                style={{ flex: 1, height: "1px", backgroundColor: "#2a2a34" }}
              />
            </div>
            <span
              style={{
                fontFamily: "var(--font-ui, system-ui, sans-serif)",
                fontSize: "8.5px",
                fontWeight: 600,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "#f0a500",
                lineHeight: 1,
              }}
            >
              Financial Intelligence
            </span>
          </Link>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-1 sm:gap-2">
            {/* Search */}
            {searchOpen ? (
              <form onSubmit={submitSearch} className="flex items-center gap-2 mr-1">
                <input
                  ref={inputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search news…"
                  onKeyDown={(e) => e.key === "Escape" && closeSearch()}
                  style={{
                    fontFamily: "var(--font-ui, system-ui, sans-serif)",
                    fontSize: "13px",
                    fontWeight: 400,
                    backgroundColor: "transparent",
                    outline: "none",
                    width: "140px",
                    color: TEXT,
                    caretColor: "#f0a500",
                    borderBottom: "1px solid #f0a500",
                    paddingBottom: "2px",
                  }}
                />
                <button
                  type="button"
                  onClick={closeSearch}
                  style={{ color: MUTED, background: "none", border: "none", cursor: "pointer", padding: "4px" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </form>
            ) : (
              <button
                onClick={openSearch}
                aria-label="Search"
                style={{ color: MUTED, background: "none", border: "none", cursor: "pointer", padding: "8px", transition: "color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = TEXT)}
                onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
              </button>
            )}

            {/* Saved */}
            <Link
              href="/news/saved"
              aria-label="Saved articles"
              className="hidden sm:flex"
              style={{ color: MUTED, padding: "8px", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = TEXT)}
              onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
            </Link>

            {/* Jobs */}
            <Link
              href="/"
              className="hidden md:flex items-center"
              style={{
                fontFamily: "var(--font-ui, system-ui, sans-serif)",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: MUTED,
                padding: "8px 6px",
                transition: "color 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = TEXT)}
              onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}
            >
              Jobs ↗
            </Link>

            {/* Subscribe CTA */}
            <Link
              href="/news/subscribe"
              style={{
                fontFamily: "var(--font-ui, system-ui, sans-serif)",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                backgroundColor: "#f0a500",
                color: "#070708",
                padding: "9px 15px",
                whiteSpace: "nowrap",
                transition: "background-color 0.15s",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#d99400")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f0a500")}
            >
              Subscribe
            </Link>
          </div>
        </div>
      </div>

      {/* ── Nav bar ──────────────────────────────────────────────── */}
      <div style={{ backgroundColor: "#070708", borderBottom: "1px solid #1e1e26" }}>
        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          <nav className="flex items-center" style={{ height: "42px" }}>
            {[{ label: "All", href: "/news" }, ...NAV].map((item) => {
              const active =
                item.href === "/news"
                  ? pathname === "/news"
                  : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 h-full flex items-center"
                  style={{
                    fontFamily: "var(--font-ui, system-ui, sans-serif)",
                    fontSize: "13px",
                    fontWeight: active ? 600 : 400,
                    padding: "0 18px",
                    color: active ? TEXT : MUTED,
                    borderBottom: active ? "2px solid #f0a500" : "2px solid transparent",
                    transition: "color 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = TEXT; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = MUTED; }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
