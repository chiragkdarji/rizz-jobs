import { NextRequest, NextResponse } from "next/server";

// Cricbuzz CDN blocks direct server-side fetches (Cloudflare bot protection).
// We redirect through images.weserv.nl which acts as a trusted CDN proxy.
//
// ?type=news   → 392×220 (standard Cricbuzz news thumbnail crop)
// ?type=player → 450×450 (standard Cricbuzz player avatar crop)
// default      → news dimensions

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const type = req.nextUrl.searchParams.get("type") ?? "news";

  if (!id || !/^\d+$/.test(id)) {
    return new NextResponse("Bad request", { status: 400 });
  }

  // Cricbuzz uses standard crop sizes; pick the closest available dimension.
  // News: 392x220 is the canonical thumbnail size used across Cricbuzz news pages.
  // Player: 450x450 is the standard player face crop.
  const [w, h] = type === "player" ? [450, 450] : [392, 220];

  // Primary Cricbuzz static CDN URL
  const cricbuzzUrl = encodeURIComponent(
    `https://static.cricbuzz.com/a/img/v1/imgs/${id}/i1/c${w}x${h}/${id}.jpg`
  );

  const weservUrl =
    `https://images.weserv.nl/?url=${cricbuzzUrl}&w=${w}&h=${h}&fit=cover&output=jpg&q=80`;

  return NextResponse.redirect(weservUrl, {
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
}
