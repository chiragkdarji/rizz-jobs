import { NextRequest, NextResponse } from "next/server";

// Proxy Cricbuzz CDN images by imageId.
// Cricbuzz serves images at: https://static.cricbuzz.com/a/img/v1/imgs/{id}/i1/c{w}x{h}/{id}.jpg
// For news cover images a wider ratio is used; for player avatars square crop is fine.
// We try a few CDN patterns and forward whatever succeeds.

const CDN_PATTERNS = (id: string) => [
  `https://static.cricbuzz.com/a/img/v1/imgs/${id}/i1/c640x360/${id}.jpg`,
  `https://static.cricbuzz.com/a/img/v1/imgs/${id}/i1/c500x500/${id}.jpg`,
  `https://static.cricbuzz.com/a/img/v1/imgs/${id}/i1/c232x130/${id}.jpg`,
];

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) {
    return new NextResponse("Bad request", { status: 400 });
  }

  for (const url of CDN_PATTERNS(id)) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 86400 }, // cache 24h
      });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        return new NextResponse(buf, {
          headers: {
            "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
          },
        });
      }
    } catch {
      // try next pattern
    }
  }

  return new NextResponse("Not found", { status: 404 });
}
