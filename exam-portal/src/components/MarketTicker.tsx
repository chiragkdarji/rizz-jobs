"use client";

import { useEffect, useState } from "react";

interface Quote {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePercent: number;
  format?: string;
  isVix?: boolean;
}

// Separator labels between groups
const SECTION_BREAKS: Record<string, string> = {
  "USD/INR": "FOREX & GLOBAL",
  "INDIA VIX": "VOLATILITY",
};

function formatPrice(q: Quote): string {
  if (q.format === "inr")      return `₹${q.price.toFixed(2)}`;
  if (q.format === "usd_oz")   return `$${q.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (q.format === "usd_bbl")  return `$${q.price.toFixed(2)}`;
  if (q.label === "S&P 500")   return q.price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return q.price.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function QuoteItem({ q }: { q: Quote }) {
  const up = q.change >= 0;

  // VIX: rising = fear (show amber/red), falling = calm (show green)
  // Standard: rising = green, falling = red
  const color = q.isVix
    ? (up ? "#f59e0b" : "#22c55e")
    : (up ? "#22c55e" : "#f43f5e");

  const arrow = up ? "▲" : "▼";

  // VIX label with sentiment
  const vixSentiment = q.isVix
    ? (q.price >= 20 ? " · FEAR" : q.price >= 13 ? " · NEUTRAL" : " · CALM")
    : "";

  return (
    <div
      className="flex items-center gap-2.5 shrink-0 px-5"
      style={{ borderRight: "1px solid #1a1a22", height: "100%" }}
    >
      <span
        className="text-[9.5px] font-black uppercase tracking-[0.15em] shrink-0"
        style={{ color: "#555466" }}
      >
        {q.label}{vixSentiment}
      </span>
      <span
        className="text-[12px] font-bold tabular-nums shrink-0"
        style={{ color: "#e8e4dc", letterSpacing: "0.01em" }}
      >
        {formatPrice(q)}
      </span>
      <span
        className="text-[10px] font-bold tabular-nums shrink-0 flex items-center gap-0.5"
        style={{ color }}
      >
        <span style={{ fontSize: "7px" }}>{arrow}</span>
        {Math.abs(q.changePercent).toFixed(2)}%
      </span>
    </div>
  );
}

function SectionBreak({ label }: { label: string }) {
  return (
    <div
      className="shrink-0 flex items-center px-4 self-stretch"
      style={{ backgroundColor: "#0d0d10", borderRight: "1px solid #1a1a22" }}
    >
      <span
        className="text-[8px] font-black uppercase tracking-[0.2em]"
        style={{ color: "#2a2838" }}
      >
        {label}
      </span>
    </div>
  );
}

export default function MarketTicker() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/market-data");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setQuotes(data);
          setLastUpdated(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
        }
      } catch {}
    }

    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (quotes.length === 0) return null;

  // Build items with section breaks injected
  const items: Array<{ type: "quote"; q: Quote } | { type: "break"; label: string }> = [];
  quotes.forEach((q) => {
    if (SECTION_BREAKS[q.label]) {
      items.push({ type: "break", label: SECTION_BREAKS[q.label] });
    }
    items.push({ type: "quote", q });
  });

  // Duration: ~90px per item at ~75px/s
  const durationSec = Math.max(20, Math.round((items.length * 90) / 75));

  return (
    <>
      <style>{`
        @keyframes market-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .market-track {
          animation: market-scroll ${durationSec}s linear infinite;
          will-change: transform;
        }
        .market-wrap:hover .market-track {
          animation-play-state: paused;
        }
      `}</style>

      <div
        className="border-b"
        style={{ backgroundColor: "#070708", borderColor: "#1a1a22" }}
      >
        <div className="max-w-7xl mx-auto">
        <div className="market-wrap overflow-hidden flex items-stretch" style={{ height: "34px" }}>

          {/* Left badge */}
          <div
            className="shrink-0 flex items-center justify-center px-3.5 z-10 border-r"
            style={{
              backgroundColor: "#f0a500",
              borderColor: "#c88800",
              minWidth: "72px",
            }}
          >
            <span
              style={{
                fontSize: "8.5px",
                fontWeight: 900,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#070708",
              }}
            >
              MARKETS
            </span>
          </div>

          {/* Scrolling strip */}
          <div className="overflow-hidden flex-1 relative">
            <div className="market-track flex items-stretch h-full" style={{ width: "max-content" }}>
              {[...items, ...items].map((item, i) =>
                item.type === "break" ? (
                  <SectionBreak key={i} label={item.label} />
                ) : (
                  <QuoteItem key={i} q={item.q} />
                )
              )}
            </div>

            {/* Right fade mask */}
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: "60px",
                background: "linear-gradient(to right, transparent, #070708)",
                pointerEvents: "none",
              }}
            />
          </div>

          {/* Timestamp */}
          {lastUpdated && (
            <div
              className="shrink-0 flex items-center px-3 border-l"
              style={{ borderColor: "#1a1a22" }}
            >
              <span className="text-[9px] tabular-nums" style={{ color: "#2a2838" }}>
                {lastUpdated}
              </span>
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  );
}
