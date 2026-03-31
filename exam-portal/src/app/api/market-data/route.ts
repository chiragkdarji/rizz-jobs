import { NextResponse } from "next/server";

export const revalidate = 60; // 1-minute cache

const SYMBOLS = "^NSEI,^BSESN,USDINR=X";
const YAHOO_URL = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${SYMBOLS}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,shortName`;

export async function GET() {
  try {
    const res = await fetch(YAHOO_URL, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "upstream failed" }, { status: 502 });
    }

    const json = await res.json();
    const quotes: Array<{
      symbol: string;
      shortName: string;
      regularMarketPrice: number;
      regularMarketChange: number;
      regularMarketChangePercent: number;
    }> = json?.quoteResponse?.result ?? [];

    const data = quotes.map((q) => ({
      symbol: q.symbol,
      name: q.shortName,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
    }));

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  }
}
