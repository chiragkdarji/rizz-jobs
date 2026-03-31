"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Headline {
  slug: string;
  headline: string;
  category: string;
}

const CATEGORY_ACCENT: Record<string, string> = {
  finance:  "#3b82f6",
  business: "#a855f7",
  markets:  "#22c55e",
  economy:  "#f59e0b",
  startups: "#f43f5e",
};

const INTERVAL_MS = 5000;

export default function HeadlineTickerInner({ headlines }: { headlines: Headline[] }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const goTo = useCallback((next: number) => {
    setVisible(false);
    setTimeout(() => {
      setIndex(next);
      setVisible(true);
    }, 250);
  }, []);

  const prev = () => goTo((index - 1 + headlines.length) % headlines.length);
  const next = useCallback(() => goTo((index + 1) % headlines.length), [goTo, index, headlines.length]);

  useEffect(() => {
    const id = setInterval(next, INTERVAL_MS);
    return () => clearInterval(id);
  }, [next]);

  const current = headlines[index];
  if (!current) return null;
  const accent = CATEGORY_ACCENT[current.category] ?? CATEGORY_ACCENT.finance;

  return (
    <>
      <style>{`
        .headline-text {
          transition: opacity 0.25s ease, transform 0.25s ease;
        }
        .headline-text.hidden-text {
          opacity: 0;
          transform: translateY(4px);
        }
        .headline-text.visible-text {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      <div
        className="border-b"
        style={{ backgroundColor: "#070708", borderColor: "#1e1e24" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-0" style={{ height: "36px" }}>

          {/* Label */}
          <span
            className="shrink-0 text-[9px] font-black uppercase tracking-[0.22em] pr-4 mr-4"
            style={{ color: "#f0a500", borderRight: "1px solid #1e1e24" }}
          >
            Latest
          </span>

          {/* Category badge */}
          <span
            className="shrink-0 text-[9px] font-black uppercase tracking-[0.14em] mr-3 hidden sm:inline"
            style={{ color: accent }}
          >
            {current.category}
          </span>

          {/* Headline */}
          <Link
            href={`/news/${current.slug}`}
            className={`headline-text flex-1 min-w-0 text-[12px] truncate transition-colors ${visible ? "visible-text" : "hidden-text"}`}
            style={{
              color: "#c8c4bc",
              fontFamily: "'DM Serif Display', 'Georgia', serif",
              fontWeight: 400,
            }}
            title={current.headline}
          >
            {current.headline}
          </Link>

          {/* Counter + nav */}
          <div className="shrink-0 flex items-center gap-2 ml-4 pl-4" style={{ borderLeft: "1px solid #1e1e24" }}>
            <span className="text-[10px] tabular-nums hidden sm:inline" style={{ color: "#2a2838" }}>
              {index + 1}/{headlines.length}
            </span>
            <button
              onClick={prev}
              aria-label="Previous headline"
              className="flex items-center justify-center"
              style={{ width: "24px", height: "24px", color: "#7c7888", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f2ede6")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#7c7888")}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={next}
              aria-label="Next headline"
              className="flex items-center justify-center"
              style={{ width: "24px", height: "24px", color: "#7c7888", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f2ede6")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#7c7888")}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
