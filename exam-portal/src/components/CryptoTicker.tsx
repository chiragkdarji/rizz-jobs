"use client";

import { useEffect, useState } from "react";

interface Coin {
  id: string;
  label: string;
  ticker: string;
  priceInr: number;
  priceUsd: number;
  change24h: number;
}

function formatInr(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(2)}`;
}

function CoinItem({ c }: { c: Coin }) {
  const up = c.change24h >= 0;
  const color = up ? "#22c55e" : "#f43f5e";
  const arrow = up ? "▲" : "▼";

  return (
    <div
      className="flex items-center gap-2.5 shrink-0 px-5"
      style={{ borderRight: "1px solid #1a1a22", height: "100%" }}
    >
      <span
        className="text-[9.5px] font-black uppercase tracking-[0.15em]"
        style={{ color: "#555466" }}
      >
        {c.ticker}
      </span>
      <span
        className="text-[12px] font-bold tabular-nums"
        style={{ color: "#e8e4dc" }}
      >
        {formatInr(c.priceInr)}
      </span>
      <span
        className="text-[10px] font-bold tabular-nums"
        style={{ color }}
      >
        <span style={{ fontSize: "7px" }}>{arrow}</span>
        {Math.abs(c.change24h).toFixed(2)}%
      </span>
    </div>
  );
}

export default function CryptoTicker() {
  const [coins, setCoins] = useState<Coin[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/crypto");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) setCoins(data);
      } catch {}
    }

    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (coins.length === 0) return null;

  const durationSec = Math.max(20, Math.round((coins.length * 150) / 75));

  return (
    <>
      <style>{`
        @keyframes crypto-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .crypto-track {
          animation: crypto-scroll ${durationSec}s linear infinite;
          will-change: transform;
        }
        .crypto-wrap:hover .crypto-track {
          animation-play-state: paused;
        }
      `}</style>

      <div
        className="crypto-wrap overflow-hidden border-b"
        style={{ backgroundColor: "#070708", borderColor: "#1a1a22" }}
      >
        <div className="flex items-stretch" style={{ height: "34px" }}>
          {/* Left badge */}
          <div
            className="shrink-0 flex items-center justify-center px-3.5 border-r"
            style={{
              backgroundColor: "#1a1a2e",
              borderColor: "#1a1a22",
              minWidth: "72px",
            }}
          >
            <span
              style={{
                fontSize: "8.5px",
                fontWeight: 900,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#818cf8",
              }}
            >
              CRYPTO
            </span>
          </div>

          {/* Scrolling strip */}
          <div className="overflow-hidden flex-1 relative">
            <div className="crypto-track flex items-stretch h-full" style={{ width: "max-content" }}>
              {[...coins, ...coins].map((c, i) => (
                <CoinItem key={`${c.id}-${i}`} c={c} />
              ))}
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

          <div
            className="shrink-0 flex items-center px-3 border-l"
            style={{ borderColor: "#1a1a22" }}
          >
            <span className="text-[9px] uppercase tracking-widest" style={{ color: "#2a2838" }}>
              24h
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
