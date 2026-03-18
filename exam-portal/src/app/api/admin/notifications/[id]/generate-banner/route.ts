import { createServiceRoleClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const supabase = createServiceRoleClient();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured in Vercel env vars" },
        { status: 500 }
      );
    }

    // Fetch notification title + summary
    const { data: notif, error: fetchError } = await supabase
      .from("notifications")
      .select("title, ai_summary, visuals")
      .eq("id", id)
      .single();

    if (fetchError || !notif) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    const prompt = `Create a professional, modern banner image for a government job notification.

Job Title: ${notif.title}
Summary: ${notif.ai_summary || "Government recruitment notification"}

STRICT Design Requirements:
- Exactly 1280x720 pixels (16:9 landscape ratio)
- Clean corporate design with gradient background (dark blue to indigo/purple tones)
- Include "${notif.title}" prominently in bold, clear white typography
- Add subtle official visual elements (shield icon, document icon, or official seal silhouette)
- Include a small "Rizz Jobs" watermark in the bottom-right corner
- Professional, trustworthy, and authoritative feel
- DO NOT include any real government logos or emblems
- Keep text minimal and readable
- No text saying "generated", "AI", or "created by" anywhere`;

    // Use Imagen 3 for image generation (stable, supports :predict endpoint)
    const imagenRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "16:9",
            safetyFilterLevel: "block_only_high",
          },
        }),
      }
    );

    if (!imagenRes.ok) {
      const err = await imagenRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: `Gemini error: ${JSON.stringify(err)}` },
        { status: 500 }
      );
    }

    const imagenData = await imagenRes.json() as {
      predictions?: { bytesBase64Encoded: string; mimeType: string }[]
    };

    const prediction = imagenData.predictions?.[0];
    if (!prediction?.bytesBase64Encoded) {
      return NextResponse.json({ error: "Imagen returned no image" }, { status: 500 });
    }

    const imageBytes = Buffer.from(prediction.bytesBase64Encoded, "base64");
    const filePath = `banners/banner_${id}_${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("job-banners")
      .upload(filePath, imageBytes, { contentType: "image/png", upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("job-banners").getPublicUrl(filePath);

    // Merge into existing visuals object
    const existingVisuals =
      typeof notif.visuals === "object" && notif.visuals ? notif.visuals : {};
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
