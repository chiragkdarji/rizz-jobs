import { NextResponse } from "next/server";

export const revalidate = 60;

const SYMBOLS = [
  { symbol: "^NSEI",   encoded: "%5ENSEI" },
  { symbol: "^BSESN",  encoded: "%5EBSESN" },
  { symbol: "USDINR=X", encoded: "USDINR%3DX" },
];

async function fetchChart(encoded: string): Promise<{
  price: number;
  change: number;
  changePercent: number;
} | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1m&range=1d&includePrePost=false`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price: number = meta.regularMarketPrice ?? 0;
    const prev: number = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prev;
    const changePercent = prev !== 0 ? (change / prev) * 100 : 0;
    return { price, change, changePercent };
  } catch {
    return null;
  }
}

export async function GET() {
  const results = await Promise.all(
    SYMBOLS.map(async ({ symbol, encoded }) => {
      const data = await fetchChart(encoded);
      return data ? { symbol, ...data } : null;
    })
  );

  const data = results.filter(Boolean);

  if (data.length === 0) {
    return NextResponse.json({ error: "all upstreams failed" }, { status: 502 });
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
    },
  });
}
