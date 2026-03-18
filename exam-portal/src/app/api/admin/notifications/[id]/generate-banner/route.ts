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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured in Vercel env vars" },
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

    const prompt = `A professional government job recruitment banner image. ${notif.title}. ${notif.ai_summary || "Government recruitment notification"}. Dark blue to indigo gradient background, bold white typography, subtle official visual elements like a shield or document icon, "Rizz Jobs" watermark in bottom-right corner. Clean corporate design, no real government logos, minimal text, authoritative and trustworthy aesthetic.`;

    // Use DALL-E 3 — stable, accessible with standard OpenAI API key
    const dalleRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1792x1024",
        quality: "standard",
        response_format: "b64_json",
      }),
    });

    if (!dalleRes.ok) {
      const err = await dalleRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: `DALL-E error: ${JSON.stringify(err)}` },
        { status: 500 }
      );
    }

    const dalleData = await dalleRes.json() as {
      data?: { b64_json: string }[]
    };

    const b64 = dalleData.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json({ error: "DALL-E returned no image" }, { status: 500 });
    }

    const imageBytes = Buffer.from(b64, "base64");
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
