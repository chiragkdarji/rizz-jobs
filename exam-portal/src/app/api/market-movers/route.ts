import { NextResponse } from "next/server";

export const revalidate = 300; // 5-min cache

interface NSEStock {
  symbol: string;
  lastPrice: number;
  change: number;
  pChange: number;
  previousClose: number;
  totalTradedVolume: number;
}

export async function GET() {
  try {
    const res = await fetch(
      "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
          "Referer": "https://www.nseindia.com/",
          "Accept-Language": "en-US,en;q=0.9",
        },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) return NextResponse.json({ error: "upstream failed" }, { status: 502 });

    const json = await res.json();
    const stocks: NSEStock[] = (json?.data ?? []).filter(
      (s: NSEStock) => s.symbol !== "NIFTY 50" // exclude the index row itself
    );

    const gainers = [...stocks]
      .filter((s) => s.pChange > 0)
      .sort((a, b) => b.pChange - a.pChange)
      .slice(0, 5)
      .map((s) => ({
        symbol: s.symbol,
        price: s.lastPrice,
        change: s.change,
        changePercent: s.pChange,
      }));

    const losers = [...stocks]
      .filter((s) => s.pChange < 0)
      .sort((a, b) => a.pChange - b.pChange)
      .slice(0, 5)
      .map((s) => ({
        symbol: s.symbol,
        price: s.lastPrice,
        change: s.change,
        changePercent: s.pChange,
      }));

    return NextResponse.json(
      { gainers, losers, timestamp: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } }
    );
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  }
}
