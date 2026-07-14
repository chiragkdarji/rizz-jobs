import { createServiceRoleClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const maxDuration = 30;

// Placeholder strings the LLM inserts when it doesn't know a date
const VAGUE_DEADLINES = new Set([
  "", "tba", "to be announced", "to be notified", "to be declared",
  "n/a", "na", "not available", "not announced", "yet to be announced",
]);

function formatDeadline(deadline: string | null | undefined): string | null {
  if (!deadline || VAGUE_DEADLINES.has(deadline.trim().toLowerCase())) return null;
  const d = new Date(deadline);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  return deadline.length <= 24 ? deadline : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const supabase = createServiceRoleClient();

    const { data: notif, error: fetchError } = await supabase
      .from("notifications")
      .select("title, slug, deadline, details, visuals")
      .eq("id", id)
      .single();

    if (fetchError || !notif) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    // Render the site's own /api/og exam template (satori). Template-based:
    // exact title text, zero cost, no third-party image API to break.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    const ogUrl = new URL("/api/og", baseUrl);
    ogUrl.searchParams.set("type", "exam");
    ogUrl.searchParams.set("title", notif.title.slice(0, 160));
    const deadline = formatDeadline(notif.deadline);
    if (deadline) ogUrl.searchParams.set("deadline", deadline);
    const categories = (notif.details as { categories?: string[] } | null)?.categories;
    if (categories?.[0]) ogUrl.searchParams.set("category", categories[0].slice(0, 40));

    const ogRes = await fetch(ogUrl);
    if (!ogRes.ok || !ogRes.headers.get("content-type")?.startsWith("image/")) {
      return NextResponse.json(
        { error: `Banner template render failed (${ogRes.status})` },
        { status: 500 }
      );
    }

    const rawBytes = Buffer.from(await ogRes.arrayBuffer());
    // Convert to WebP at quality 80 — ~5x smaller than PNG
    const imageBytes = await sharp(rawBytes).webp({ quality: 80 }).toBuffer();
    // SEO-friendly filename: {slug}-government-job-notification.webp
    const safeSlug = (notif.slug || id).replace(/[^a-z0-9-]/g, "-").toLowerCase();
    const filePath = `banners/${safeSlug}-government-job-notification.webp`;

    // Delete old banner from storage before uploading new one
    const existingVisuals =
      typeof notif.visuals === "object" && notif.visuals ? notif.visuals : {} as Record<string, unknown>;
    const oldImageUrl = (existingVisuals as Record<string, unknown>).notification_image as string | undefined;
    if (oldImageUrl) {
      // Extract storage path from public URL: .../object/public/job-banners/<path>
      const marker = "/object/public/job-banners/";
      const markerIdx = oldImageUrl.indexOf(marker);
      if (markerIdx !== -1) {
        const oldPath = oldImageUrl.slice(markerIdx + marker.length);
        await supabase.storage.from("job-banners").remove([oldPath]);
      }
    }

    const { error: uploadError } = await supabase.storage
      .from("job-banners")
      .upload(filePath, imageBytes, { contentType: "image/webp", upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("job-banners").getPublicUrl(filePath);

    // Merge into existing visuals object
    const newVisuals = { ...existingVisuals, notification_image: publicUrl };

    await supabase
      .from("notifications")
      .update({ visuals: newVisuals, updated_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Banner generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
