"use client";

import { useEffect, useState } from "react";

interface Market {
  symbol: string;
  label: string;
  region: string;
  price: number;
  change: number;
  changePercent: number;
}

const FLAG: Record<string, string> = {
  US: "🇺🇸", UK: "🇬🇧", DE: "🇩🇪", JP: "🇯🇵", HK: "🇭🇰", CN: "🇨🇳",
};

function MarketCard({ m }: { m: Market }) {
  const up = m.change >= 0;
  const color = up ? "#22c55e" : "#f43f5e";
  const sign = up ? "+" : "";

  return (
    <div
      className="flex flex-col gap-1 px-4 py-3 shrink-0"
      style={{ borderRight: "1px solid #1a1a22", minWidth: "120px" }}
    >
      <div className="flex items-center gap-1.5">
        <span style={{ fontSize: "11px", lineHeight: 1 }}>{FLAG[m.region] ?? "🌐"}</span>
        <span
          className="text-[9.5px] font-black uppercase tracking-[0.14em]"
          style={{ color: "#555466" }}
        >
          {m.label}
        </span>
      </div>
      <span
        className="text-[13px] font-bold tabular-nums"
        style={{ color: "#e8e4dc", letterSpacing: "0.01em" }}
      >
        {m.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
      </span>
      <span className="text-[10px] font-bold tabular-nums" style={{ color }}>
        {sign}{m.changePercent.toFixed(2)}%
      </span>
    </div>
  );
}

export default function WorldMarketsRow() {
  const [markets, setMarkets] = useState<Market[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/world-markets");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) setMarkets(data);
      } catch {}
    }
    load();
    const id = setInterval(load, 120_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (markets.length === 0) return null;

  return (
    <div
      className="border"
      style={{ backgroundColor: "#0a0a0f", borderColor: "#1a1a22" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: "1px solid #1a1a22" }}
      >
        <span
          className="text-[9.5px] font-black uppercase tracking-[0.2em]"
          style={{ color: "#555466" }}
        >
          World Markets
        </span>
        <span className="text-[9px] uppercase tracking-wide" style={{ color: "#2a2838" }}>
          2 min delay
        </span>
      </div>

      {/* Cards row — horizontally scrollable on mobile */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex">
          {markets.map((m) => (
            <MarketCard key={m.symbol} m={m} />
          ))}
        </div>
      </div>
    </div>
  );
}
