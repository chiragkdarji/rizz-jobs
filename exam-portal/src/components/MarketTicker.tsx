"use client";

import { useEffect, useState } from "react";

interface Quote {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePercent: number;
  format?: string;
}

function formatPrice(q: Quote): string {
  if (q.format === "inr") return `₹${q.price.toFixed(2)}`;
  if (q.format === "usd_oz") return `$${q.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (q.format === "usd_bbl") return `$${q.price.toFixed(2)}`;
  // Indian indices — format with commas
  return q.price.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function QuoteItem({ q }: { q: Quote }) {
  const up = q.change >= 0;
  const color = up ? "#22c55e" : "#f43f5e";
  const arrow = up ? "▲" : "▼";

  return (
    <div className="flex items-center gap-2 shrink-0 px-5" style={{ borderRight: "1px solid #1e1e24" }}>
      <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: "#7c7888" }}>
        {q.label}
      </span>
      <span className="text-[12px] font-bold tabular-nums" style={{ color: "#f2ede6" }}>
        {formatPrice(q)}
      </span>
      <span className="text-[10px] font-bold tabular-nums" style={{ color }}>
        {arrow} {Math.abs(q.changePercent).toFixed(2)}%
      </span>
    </div>
  );
}

export default function MarketTicker() {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/market-data");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) setQuotes(data);
      } catch {}
    }

    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (quotes.length === 0) return null;

  // Duration scales with number of items so speed stays consistent (~80px/s)
  const itemWidth = 160; // approximate px per item
  const totalPx = quotes.length * itemWidth;
  const durationSec = Math.round(totalPx / 80);

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
        className="market-wrap border-b overflow-hidden"
        style={{ backgroundColor: "#070708", borderColor: "#1e1e24" }}
      >
        {/* Left label */}
        <div className="relative flex items-stretch">
          <div
            className="shrink-0 flex items-center px-4 z-10"
            style={{
              backgroundColor: "#f0a500",
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#070708",
            }}
          >
            Markets
          </div>

          {/* Scrolling strip */}
          <div className="overflow-hidden flex-1">
            <div className="market-track flex items-center" style={{ width: "max-content" }}>
              {/* Render twice for seamless loop */}
              {[...quotes, ...quotes].map((q, i) => (
                <QuoteItem key={`${q.symbol}-${i}`} q={q} />
              ))}
            </div>
          </div>

          {/* Right fade + timestamp */}
          <div
            className="shrink-0 flex items-center px-3 text-[9px] uppercase tracking-widest"
            style={{
              color: "#2a2838",
              background: "linear-gradient(to right, transparent, #070708 30%)",
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              pointerEvents: "none",
              paddingLeft: "40px",
            }}
          >
            1 min delay
          </div>
        </div>
      </div>
    </>
  );
}
