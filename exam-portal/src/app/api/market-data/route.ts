import { NextResponse } from "next/server";

export const revalidate = 60;

// ── NSE India API — Indian indices ───────────────────────────────────────────
const NSE_SYMBOLS = ["NIFTY 50", "NIFTY BANK", "NIFTY IT", "NIFTY MIDCAP 50"];

async function fetchNSE(): Promise<Array<{
  symbol: string; label: string; price: number; change: number; changePercent: number;
}>> {
  try {
    const res = await fetch("https://www.nseindia.com/api/allIndices", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": "https://www.nseindia.com/",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.data ?? [])
      .filter((d: { index: string }) => NSE_SYMBOLS.includes(d.index))
      .map((d: { index: string; last: number; variation: number; percentChange: number }) => ({
        symbol: d.index.replace("NIFTY ", "NIFTY").replace(" ", "_"),
        label: d.index === "NIFTY 50" ? "NIFTY 50"
             : d.index === "NIFTY BANK" ? "BANK NIFTY"
             : d.index === "NIFTY IT" ? "NIFTY IT"
             : "MIDCAP 50",
        price: d.last,
        change: d.variation,
        changePercent: d.percentChange,
      }));
  } catch {
    return [];
  }
}

// ── Yahoo Finance v8 chart — global symbols ───────────────────────────────────
const YAHOO_SYMBOLS: Array<{ symbol: string; label: string; encoded: string; format: "inr" | "usd_oz" | "usd_bbl" | "price" }> = [
  { symbol: "^BSESN",   label: "SENSEX",    encoded: "%5EBSESN",    format: "price" },
  { symbol: "USDINR=X", label: "USD/INR",   encoded: "USDINR%3DX", format: "inr" },
  { symbol: "GC=F",     label: "GOLD",      encoded: "GC%3DF",      format: "usd_oz" },
  { symbol: "CL=F",     label: "CRUDE OIL", encoded: "CL%3DF",      format: "usd_bbl" },
];

async function fetchYahoo(encoded: string): Promise<{ price: number; change: number; changePercent: number } | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1m&range=1d&includePrePost=false`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      next: { revalidate: 60 },
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
  const [nseData, ...yahooResults] = await Promise.all([
    fetchNSE(),
    ...YAHOO_SYMBOLS.map(({ encoded }) => fetchYahoo(encoded)),
  ]);

  const yahooData = YAHOO_SYMBOLS.map(({ symbol, label, format }, i) => {
    const d = yahooResults[i];
    return d ? { symbol, label, format, ...d } : null;
  }).filter(Boolean);

  // Merge: SENSEX first from Yahoo, then NSE indices, then USD/INR, Gold, Crude
  const sensex = yahooData.find((d) => d!.symbol === "^BSESN");
  const niftyOrder = ["NIFTY50", "NIFTY_BANK", "NIFTY_IT", "NIFTY_MIDCAP_50"];

  const ordered = [
    ...(nseData.find((d) => d.label === "NIFTY 50") ? [nseData.find((d) => d.label === "NIFTY 50")] : []),
    ...(sensex ? [sensex] : []),
    ...(nseData.find((d) => d.label === "BANK NIFTY") ? [nseData.find((d) => d.label === "BANK NIFTY")] : []),
    ...(nseData.find((d) => d.label === "NIFTY IT") ? [nseData.find((d) => d.label === "NIFTY IT")] : []),
    ...(nseData.find((d) => d.label === "MIDCAP 50") ? [nseData.find((d) => d.label === "MIDCAP 50")] : []),
    ...yahooData.filter((d) => d!.symbol !== "^BSESN"),
  ].filter(Boolean);

  if (ordered.length === 0) {
    return NextResponse.json({ error: "all upstreams failed" }, { status: 502 });
  }

  return NextResponse.json(ordered, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
  });
}
