import { NextRequest, NextResponse } from "next/server";

// Cricbuzz CDN blocks direct server-side fetches (Cloudflare bot protection).
// We redirect through images.weserv.nl which acts as a trusted CDN proxy —
// it fetches from Cricbuzz on behalf of the browser and caches the result.
//
// ?type=news  → 640×360 (16:9 cover)
// ?type=player → 500×500 (square avatar)
// default     → try news ratio

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const type = req.nextUrl.searchParams.get("type") ?? "news";

  if (!id || !/^\d+$/.test(id)) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const [w, h] = type === "player" ? [500, 500] : [640, 360];

  // Cricbuzz static CDN — most reliable pattern
  const cricbuzzUrl = encodeURIComponent(
    `https://static.cricbuzz.com/a/img/v1/imgs/${id}/i1/c${w}x${h}/${id}.jpg`
  );

  const weservUrl = `https://images.weserv.nl/?url=${cricbuzzUrl}&w=${w}&h=${h}&fit=cover&output=jpg&q=85`;

  return NextResponse.redirect(weservUrl, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
