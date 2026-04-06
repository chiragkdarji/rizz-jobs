import { NextRequest, NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";

// Cricbuzz images are served through the RapidAPI authenticated endpoint:
//   GET https://cricbuzz-cricket.p.rapidapi.com/img/v1/i1/c{imageId}/i.jpg
//
// This proxy fetches the image server-side (with the API key),
// streams it back to the browser, and caches it aggressively.
//
// Usage:
//   /api/ipl/image?id=231889           → any Cricbuzz image
//   /api/ipl/image?id=231889&type=player → same (type ignored, kept for compat)

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id || !/^\d+$/.test(id)) {
    return new NextResponse("Bad request", { status: 400 });
  }

  try {
    const imageUrl = `${CB_BASE}/img/v1/i1/c${id}/i.jpg`;

    const res = await fetch(imageUrl, {
      headers: cbHeaders(),
      // Server-side cache for 24 h
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      // Return a transparent 1×1 GIF so the <img> doesn't show a broken icon
      const transparent1x1 = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      );
      return new NextResponse(transparent1x1, {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("Content-Type") ?? "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      },
    });
  } catch {
    return new NextResponse("Error fetching image", { status: 502 });
  }
}
