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

const INDIAN_LABELS = new Set([
  "NIFTY 50", "SENSEX", "BANK NIFTY", "NIFTY IT", "INDIA VIX",
  "NIFTY MIDCAP", "NIFTY SMALLCAP",
]);

function formatPrice(q: Quote): string {
  if (q.format === "inr") return `₹${q.price.toFixed(2)}`;
  return q.price.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function IndexCard({ q }: { q: Quote }) {
  const up = q.change >= 0;
  const color = q.isVix ? (up ? "#f59e0b" : "#22c55e") : (up ? "#22c55e" : "#f43f5e");
  const sign = up ? "+" : "";
  const vixLabel = q.isVix
    ? (q.price >= 20 ? " · FEAR" : q.price >= 13 ? " · NEUTRAL" : " · CALM")
    : "";

  return (
    <div
      className="flex flex-col gap-1.5 p-3 rounded-lg transition-colors"
      style={{ background: "#0d0d14", border: "1px solid #1a1a24" }}
    >
      <span
        className="text-[9px] font-black uppercase tracking-[0.16em]"
        style={{ color: "#555466" }}
      >
        {q.label}{vixLabel}
      </span>
      <span
        className="text-[15px] font-bold tabular-nums leading-none"
        style={{ color: "#e8e4dc" }}
      >
        {formatPrice(q)}
      </span>
      <div className="flex items-center gap-1.5">
        <span
          className="text-[10px] font-bold tabular-nums"
          style={{ color }}
        >
          {sign}{q.changePercent.toFixed(2)}%
        </span>
        <span className="text-[9px]" style={{ color: "#3a3848" }}>
          {sign}{Math.abs(q.change).toLocaleString("en-IN", { maximumFractionDigits: 2 })} pts
        </span>
      </div>
    </div>
  );
}

export default function IndianMarketsCards() {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/market-data");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setQuotes(data.filter((q: Quote) => INDIAN_LABELS.has(q.label)));
        }
      } catch {}
    }
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 60_000);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (quotes.length === 0) return null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "#09090e", border: "1px solid #1a1a24" }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid #1a1a24" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#22c55e" }} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#555466" }}>
            Indian Markets
          </span>
        </div>
        <span className="text-[9px] uppercase tracking-wide" style={{ color: "#2a2838" }}>Live</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 p-3">
        {quotes.map((q) => <IndexCard key={q.symbol} q={q} />)}
      </div>
    </div>
  );
}
