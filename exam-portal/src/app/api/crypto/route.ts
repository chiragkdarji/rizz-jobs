import { NextResponse } from "next/server";

export const revalidate = 60;

const COINS = "bitcoin,ethereum,solana,ripple,binancecoin";
const URL = `https://api.coingecko.com/api/v3/simple/price?ids=${COINS}&vs_currencies=inr,usd&include_24hr_change=true`;

const LABELS: Record<string, { label: string; ticker: string }> = {
  bitcoin:     { label: "Bitcoin",  ticker: "BTC" },
  ethereum:    { label: "Ethereum", ticker: "ETH" },
  solana:      { label: "Solana",   ticker: "SOL" },
  ripple:      { label: "XRP",      ticker: "XRP" },
  binancecoin: { label: "BNB",      ticker: "BNB" },
};

export async function GET() {
  try {
    const res = await fetch(URL, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 60 },
    });

    if (!res.ok) return NextResponse.json({ error: "upstream failed" }, { status: 502 });

    const json: Record<string, {
      inr: number; inr_24h_change: number;
      usd: number; usd_24h_change: number;
    }> = await res.json();

    const coins = Object.entries(json).map(([id, d]) => ({
      id,
      label: LABELS[id]?.label ?? id,
      ticker: LABELS[id]?.ticker ?? id.toUpperCase(),
      priceInr: d.inr,
      priceUsd: d.usd,
      change24h: d.inr_24h_change,
    }));

    // Sort by market cap importance
    const order = ["bitcoin", "ethereum", "binancecoin", "solana", "ripple"];
    coins.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

    return NextResponse.json(coins, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  }
}
