import { NextResponse } from "next/server";

export const revalidate = 120;

const MARKETS = [
  { symbol: "^GSPC",  label: "S&P 500",  encoded: "%5EGSPC",  region: "US"  },
  { symbol: "^IXIC",  label: "NASDAQ",   encoded: "%5EIXIC",  region: "US"  },
  { symbol: "^DJI",   label: "DOW",      encoded: "%5EDJI",   region: "US"  },
  { symbol: "^FTSE",  label: "FTSE 100", encoded: "%5EFTSE",  region: "UK"  },
  { symbol: "^GDAXI", label: "DAX",      encoded: "%5EGDAXI", region: "DE"  },
  { symbol: "^N225",  label: "NIKKEI",   encoded: "%5EN225",  region: "JP"  },
  { symbol: "^HSI",   label: "HANG SENG",encoded: "%5EHSI",   region: "HK"  },
  { symbol: "000001.SS", label: "SHANGHAI", encoded: "000001.SS", region: "CN" },
];

async function fetchChart(encoded: string) {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1m&range=1d&includePrePost=false`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      next: { revalidate: 120 },
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
  const results = await Promise.all(MARKETS.map(({ encoded }) => fetchChart(encoded)));

  const data = MARKETS.map(({ symbol, label, region }, i) => {
    const d = results[i];
    return d ? { symbol, label, region, ...d } : null;
  }).filter(Boolean);

  if (data.length === 0) {
    return NextResponse.json({ error: "all upstreams failed" }, { status: 502 });
  }

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" },
  });
}
