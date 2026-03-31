import { NextResponse } from "next/server";

export const revalidate = 3600; // update hourly — NSE updates once EOD

interface NSEEntry {
  category: string;
  date: string;
  buyValue: string;
  sellValue: string;
  netValue: string;
}

export async function GET() {
  try {
    const res = await fetch("https://www.nseindia.com/api/fiidiiTradeReact", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": "https://www.nseindia.com/",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return NextResponse.json({ error: "upstream failed" }, { status: 502 });

    const data: NSEEntry[] = await res.json();

    const fii = data.find((d) => d.category === "FII/FPI");
    const dii = data.find((d) => d.category === "DII");

    if (!fii || !dii) return NextResponse.json({ error: "no data" }, { status: 404 });

    const parse = (v: string) => parseFloat(v.replace(/,/g, ""));

    return NextResponse.json(
      {
        date: fii.date,
        fii: {
          buy: parse(fii.buyValue),
          sell: parse(fii.sellValue),
          net: parse(fii.netValue),
        },
        dii: {
          buy: parse(dii.buyValue),
          sell: parse(dii.sellValue),
          net: parse(dii.netValue),
        },
      },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" } }
    );
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  }
}
