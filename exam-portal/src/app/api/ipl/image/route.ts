import { NextRequest, NextResponse } from "next/server";
import { CB_BASE, cbHeaders } from "@/lib/cricbuzz";

// Cricbuzz images are served through the RapidAPI authenticated endpoint:
//   GET https://cricbuzz-cricket.p.rapidapi.com/img/v1/i1/c{imageId}/i.jpg?p={size}
//
// Size options (p param):
//   (none / de) → default large image
//   thumb       → standard thumbnail
//   gthumb      → grid thumbnail (smallest, fastest)
//
// Usage:
//   /api/ipl/image?id=231889              → default large
//   /api/ipl/image?id=231889&p=thumb      → thumbnail
//   /api/ipl/image?id=231889&p=gthumb     → grid thumbnail
//   /api/ipl/image?id=231889&type=player  → backward compat (maps type to p)

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  // Accept explicit p= param; fall back on type= for backward compat
  const p = req.nextUrl.searchParams.get("p");
  const type = req.nextUrl.searchParams.get("type");
  // Map type aliases to size params
  const sizeParam = p ?? (type === "news" ? "gthumb" : type === "player" ? "thumb" : null);

  if (!id || !/^\d+$/.test(id)) {
    return new NextResponse("Bad request", { status: 400 });
  }

  try {
    const imageUrl = `${CB_BASE}/img/v1/i1/c${id}/i.jpg${sizeParam ? `?p=${sizeParam}` : ""}`;

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
