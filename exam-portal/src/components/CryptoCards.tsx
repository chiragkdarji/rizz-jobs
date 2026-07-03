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

const COIN_ICONS: Record<string, string> = {
  BTC: "₿", ETH: "Ξ", BNB: "◈", SOL: "◎", XRP: "✕",
};

function formatInr(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(2)}`;
}

function CoinCard({ c }: { c: Coin }) {
  const up = c.change24h >= 0;
  const color = up ? "#22c55e" : "#f43f5e";
  const sign = up ? "+" : "";
  const icon = COIN_ICONS[c.ticker] ?? "◉";

  return (
    <div
      className="flex flex-col gap-1.5 p-3 rounded-lg"
      style={{ background: "#0d0d14", border: "1px solid #1a1a24" }}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[13px]" style={{ color: "#555466" }}>{icon}</span>
        <span className="text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: "#555466" }}>
          {c.ticker}
        </span>
      </div>
      <span className="text-[15px] font-bold tabular-nums leading-none" style={{ color: "#e8e4dc" }}>
        {formatInr(c.priceInr)}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold tabular-nums" style={{ color }}>
          {sign}{Math.abs(c.change24h).toFixed(2)}%
        </span>
        <span className="text-[9px]" style={{ color: "#3a3848" }}>24h</span>
      </div>
    </div>
  );
}

export default function CryptoCards() {
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
    const id = setInterval(() => { if (!document.hidden) load(); }, 60_000);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (coins.length === 0) return null;

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
          <span className="text-[10px]" style={{ color: "#818cf8" }}>⬡</span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#555466" }}>
            Cryptocurrency
          </span>
        </div>
        <span className="text-[9px] uppercase tracking-wide" style={{ color: "#2a2838" }}>24h change</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 p-3">
        {coins.map((c) => <CoinCard key={c.id} c={c} />)}
      </div>
    </div>
  );
}
