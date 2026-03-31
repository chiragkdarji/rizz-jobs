"use client";

import { useEffect, useState } from "react";

interface Mover {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

interface MoversData {
  gainers: Mover[];
  losers: Mover[];
  timestamp: string;
}

function MoverRow({ m, type }: { m: Mover; type: "gainer" | "loser" }) {
  const color = type === "gainer" ? "#22c55e" : "#f43f5e";
  const sign = type === "gainer" ? "+" : "";

  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid #13131a" }}>
      <span className="text-[11px] font-black uppercase tracking-[0.1em]" style={{ color: "#e8e4dc" }}>
        {m.symbol}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-[11px] tabular-nums" style={{ color: "#7c7888" }}>
          ₹{m.price.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
        </span>
        <span
          className="text-[11px] font-bold tabular-nums w-14 text-right"
          style={{ color }}
        >
          {sign}{m.changePercent.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

export default function MarketMovers() {
  const [data, setData] = useState<MoversData | null>(null);
  const [tab, setTab] = useState<"gainers" | "losers">("gainers");

  useEffect(() => {
    fetch("/api/market-movers")
      .then((r) => r.json())
      .then((d) => { if (d.gainers) setData(d); })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const items = tab === "gainers" ? data.gainers : data.losers;

  return (
    <div
      className="p-4"
      style={{ backgroundColor: "#0a0a0f", border: "1px solid #1a1a22" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[9.5px] font-black uppercase tracking-[0.2em]"
          style={{ color: "#555466" }}
        >
          Nifty 50 Movers
        </span>
        <span className="text-[9px] uppercase tracking-wide" style={{ color: "#2a2838" }}>
          {new Date(data.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex mb-3" style={{ borderBottom: "1px solid #1a1a22" }}>
        {(["gainers", "losers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="text-[10px] font-black uppercase tracking-[0.16em] px-3 pb-2 transition-colors"
            style={{
              color: tab === t ? (t === "gainers" ? "#22c55e" : "#f43f5e") : "#2a2838",
              background: "none",
              border: "none",
              borderBottom: tab === t
                ? `2px solid ${t === "gainers" ? "#22c55e" : "#f43f5e"}`
                : "2px solid transparent",
              cursor: "pointer",
              padding: "0 12px 8px",
            }}
          >
            {t === "gainers" ? "▲ Top Gainers" : "▼ Top Losers"}
          </button>
        ))}
      </div>

      {/* Rows */}
      <div>
        {items.map((m) => (
          <MoverRow key={m.symbol} m={m} type={tab === "gainers" ? "gainer" : "loser"} />
        ))}
      </div>
    </div>
  );
}
