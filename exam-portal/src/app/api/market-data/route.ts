import { NextResponse } from "next/server";

export const revalidate = 60;

// ── NSE India API — Indian indices ───────────────────────────────────────────
const NSE_WANT = ["NIFTY 50", "NIFTY BANK", "NIFTY IT", "NIFTY MIDCAP 50", "INDIA VIX"];

const NSE_LABEL: Record<string, string> = {
  "NIFTY 50":      "NIFTY 50",
  "NIFTY BANK":    "BANK NIFTY",
  "NIFTY IT":      "NIFTY IT",
  "NIFTY MIDCAP 50": "MIDCAP 50",
  "INDIA VIX":     "INDIA VIX",
};

async function fetchNSE(): Promise<Array<{
  symbol: string; label: string; price: number; change: number; changePercent: number; isVix?: boolean;
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
      .filter((d: { index: string }) => NSE_WANT.includes(d.index))
      .map((d: { index: string; last: number; variation: number; percentChange: number }) => ({
        symbol: d.index.replace(/\s+/g, "_"),
        label: NSE_LABEL[d.index] ?? d.index,
        price: d.last,
        change: d.variation,
        changePercent: d.percentChange,
        isVix: d.index === "INDIA VIX",
      }));
  } catch {
    return [];
  }
}

// ── Yahoo Finance v8 chart — global symbols ───────────────────────────────────
const YAHOO_SYMBOLS: Array<{
  symbol: string; label: string; encoded: string;
  format: "inr" | "usd_oz" | "usd_bbl" | "price" | "usd_index";
}> = [
  { symbol: "^BSESN",   label: "SENSEX",     encoded: "%5EBSESN",    format: "price"     },
  { symbol: "USDINR=X", label: "USD/INR",    encoded: "USDINR%3DX", format: "inr"       },
  { symbol: "^GSPC",    label: "S&P 500",    encoded: "%5EGSPC",     format: "price"     },
  { symbol: "GC=F",     label: "GOLD",       encoded: "GC%3DF",      format: "usd_oz"    },
  { symbol: "BZ=F",     label: "BRENT",      encoded: "BZ%3DF",      format: "usd_bbl"   },
  { symbol: "CL=F",     label: "WTI",        encoded: "CL%3DF",      format: "usd_bbl"   },
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

// ── Ordered output ────────────────────────────────────────────────────────────
// Display order: Indian indices → USD/INR → S&P 500 → Commodities → VIX
const ORDER = [
  "NIFTY 50", "SENSEX", "BANK NIFTY", "NIFTY IT", "MIDCAP 50",
  "USD/INR", "S&P 500", "GOLD", "BRENT", "WTI", "INDIA VIX",
];

export async function GET() {
  const [nseData, ...yahooResults] = await Promise.all([
    fetchNSE(),
    ...YAHOO_SYMBOLS.map(({ encoded }) => fetchYahoo(encoded)),
  ]);

  const yahooData = YAHOO_SYMBOLS.map(({ symbol, label, format }, i) => {
    const d = yahooResults[i];
    return d ? { symbol, label, format, ...d } : null;
  }).filter(Boolean);

  const all = [...nseData, ...yahooData];

  const ordered = ORDER
    .map((lbl) => all.find((d) => d!.label === lbl))
    .filter(Boolean);

  // Fallback: anything not in ORDER
  const leftover = all.filter((d) => !ORDER.includes(d!.label));
  const result = [...ordered, ...leftover];

  if (result.length === 0) {
    return NextResponse.json({ error: "all upstreams failed" }, { status: 502 });
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
  });
}
