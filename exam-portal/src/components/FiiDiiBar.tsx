"use client";

import { useEffect, useState } from "react";

interface FiiDiiData {
  date: string;
  fii: { buy: number; sell: number; net: number };
  dii: { buy: number; sell: number; net: number };
}

function formatCr(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 10000) return `₹${(abs / 1000).toFixed(1)}K Cr`;
  return `₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`;
}

function formatDate(d: string): string {
  // "30-Mar-2026" → "30 Mar"
  const parts = d.split("-");
  return `${parts[0]} ${parts[1]}`;
}

export default function FiiDiiBar() {
  const [data, setData] = useState<FiiDiiData | null>(null);

  useEffect(() => {
    fetch("/api/fii-dii")
      .then((r) => r.json())
      .then((d) => { if (d.fii) setData(d); })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const fiiUp = data.fii.net >= 0;
  const diiUp = data.dii.net >= 0;

  return (
    <div
      className="border-b hidden sm:block"
      style={{ backgroundColor: "#070708", borderColor: "#1a1a22" }}
    >
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-0"
        style={{ height: "30px" }}
      >
        {/* Label */}
        <span
          className="text-[9px] font-black uppercase tracking-[0.2em] pr-4 mr-4 shrink-0"
          style={{ color: "#2a2838", borderRight: "1px solid #1a1a22" }}
        >
          Institutional Flow · {formatDate(data.date)}
        </span>

        {/* FII */}
        <div className="flex items-center gap-2 pr-4 mr-4 shrink-0" style={{ borderRight: "1px solid #1a1a22" }}>
          <span className="text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: "#555466" }}>
            FII / FPI
          </span>
          <span
            className="text-[11px] font-bold tabular-nums"
            style={{ color: fiiUp ? "#22c55e" : "#f43f5e" }}
          >
            {fiiUp ? "+" : "−"}{formatCr(data.fii.net)}
          </span>
          <span className="text-[9px]" style={{ color: "#2a2838" }}>
            {fiiUp ? "NET BUY" : "NET SELL"}
          </span>
        </div>

        {/* DII */}
        <div className="flex items-center gap-2 pr-4 mr-4 shrink-0" style={{ borderRight: "1px solid #1a1a22" }}>
          <span className="text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: "#555466" }}>
            DII
          </span>
          <span
            className="text-[11px] font-bold tabular-nums"
            style={{ color: diiUp ? "#22c55e" : "#f43f5e" }}
          >
            {diiUp ? "+" : "−"}{formatCr(data.dii.net)}
          </span>
          <span className="text-[9px]" style={{ color: "#2a2838" }}>
            {diiUp ? "NET BUY" : "NET SELL"}
          </span>
        </div>

        {/* Net interpretation */}
        <span className="text-[9px] uppercase tracking-[0.14em] hidden md:inline" style={{ color: "#2a2838" }}>
          {!fiiUp && diiUp
            ? "DIIs absorbing FII selling"
            : fiiUp && diiUp
            ? "Both buying — bullish"
            : fiiUp && !diiUp
            ? "FIIs driving markets"
            : "Heavy institutional selling"}
        </span>
      </div>
    </div>
  );
}
