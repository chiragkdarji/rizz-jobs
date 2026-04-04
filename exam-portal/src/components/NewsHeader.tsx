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

// Muted text that passes WCAG AA (4.5:1) on #070708 background
const MUTED = "#9898aa";
const TEXT  = "#e8e4dc";

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
    <header style={{ backgroundColor: "#070708", borderBottom: "1px solid #1e1e26" }}>

      {/* ── Masthead ──────────────────────────────────────────────────── */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between"
        style={{ height: "60px" }}
      >
        {/* Logo */}
        <Link href="/news" className="flex flex-col leading-none group select-none">
          <span
            style={{
              fontFamily: "var(--font-display, 'Georgia', serif)",
              fontSize: "clamp(1.15rem, 2.8vw, 1.5rem)",
              fontWeight: 400,
              color: TEXT,
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            Rizz Jobs
          </span>
          <span
            style={{
              fontFamily: "var(--font-ui, system-ui, sans-serif)",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "#f0a500",
              marginTop: "3px",
            }}
          >
            Financial Intelligence
          </span>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-4">

          {/* Search */}
          {searchOpen ? (
            <form onSubmit={submitSearch} className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search…"
                onKeyDown={(e) => e.key === "Escape" && closeSearch()}
                style={{
                  fontFamily: "var(--font-ui, system-ui, sans-serif)",
                  fontSize: "13px",
                  fontWeight: 500,
                  backgroundColor: "transparent",
                  outline: "none",
                  width: "160px",
                  color: TEXT,
                  caretColor: "#f0a500",
                  borderBottom: "1px solid #f0a500",
                  paddingBottom: "3px",
                }}
              />
              <button
                type="button"
                onClick={closeSearch}
                aria-label="Close search"
                style={{ color: MUTED, background: "none", border: "none", cursor: "pointer", lineHeight: 1, padding: "4px" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </form>
          ) : (
            <button
              onClick={openSearch}
              aria-label="Search news"
              style={{ color: MUTED, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", minHeight: "44px", padding: "0 6px", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = TEXT)}
              onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
          )}

          {/* Saved */}
          <Link
            href="/news/saved"
            aria-label="Saved articles"
            className="hidden sm:flex items-center"
            style={{ color: MUTED, minHeight: "44px", padding: "0 6px", transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = TEXT)}
            onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
          </Link>

          {/* Jobs link */}
          <Link
            href="/"
            className="hidden sm:flex items-center gap-1"
            style={{
              fontFamily: "var(--font-ui, system-ui, sans-serif)",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: MUTED,
              transition: "color 0.15s",
              padding: "0 4px",
              minHeight: "44px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = TEXT)}
            onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}
          >
            Jobs
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: "1px" }}>
              <path d="M7 17L17 7M7 7h10v10" />
            </svg>
          </Link>

          {/* Subscribe CTA */}
          <Link
            href="/news/subscribe"
            style={{
              fontFamily: "var(--font-ui, system-ui, sans-serif)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              backgroundColor: "#f0a500",
              color: "#070708",
              padding: "9px 16px",
              transition: "background-color 0.15s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#d99400")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f0a500")}
          >
            Subscribe
          </Link>
        </div>
      </div>

      {/* ── Category nav ──────────────────────────────────────────────── */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto"
        style={{ borderTop: "1px solid #1e1e26", scrollbarWidth: "none" }}
      >
        <nav className="flex items-center" style={{ height: "44px", gap: "0" }}>
          {[{ label: "All", href: "/news" }, ...NAV].map((item) => {
            const active =
              item.href === "/news"
                ? pathname === "/news"
                : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 h-full flex items-center transition-colors"
                style={{
                  fontFamily: "var(--font-ui, system-ui, sans-serif)",
                  fontSize: "13px",
                  fontWeight: active ? 600 : 400,
                  letterSpacing: "0.02em",
                  padding: "0 16px",
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
    </header>
  );
}
