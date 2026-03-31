"use client";

import { useEffect, useState } from "react";

interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

const LABEL: Record<string, string> = {
  "^NSEI":    "NIFTY",
  "^BSESN":   "SENSEX",
  "USDINR=X": "USD/INR",
};

export default function MarketTicker() {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/market-data");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setQuotes(data);
      } catch {}
    }

    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (quotes.length === 0) return null;

  return (
    <div
      className="border-b overflow-hidden"
      style={{ backgroundColor: "#070708", borderColor: "#1e1e24" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide py-2">
          {quotes.map((q) => {
            const positive = q.change >= 0;
            const color = positive ? "#22c55e" : "#f43f5e";
            const sign = positive ? "+" : "";
            return (
              <div key={q.symbol} className="flex items-center gap-2 shrink-0">
                <span
                  className="text-[10px] font-black uppercase tracking-[0.16em]"
                  style={{ color: "#7c7888" }}
                >
                  {LABEL[q.symbol] ?? q.symbol}
                </span>
                <span className="text-[12px] font-bold" style={{ color: "#f2ede6" }}>
                  {q.symbol === "USDINR=X"
                    ? `₹${q.price.toFixed(2)}`
                    : q.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] font-bold" style={{ color }}>
                  {sign}{q.changePercent.toFixed(2)}%
                </span>
              </div>
            );
          })}
          <span className="text-[9px] uppercase tracking-widest shrink-0 ml-auto" style={{ color: "#2a2838" }}>
            Live · 1min delay
          </span>
        </div>
      </div>
    </div>
  );
}
