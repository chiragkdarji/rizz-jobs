import { createServiceRoleClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

// POST — generate a presigned upload URL for the job-banners bucket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    await params; // consume params (id not needed for presign URL)
    const supabase = createServiceRoleClient();

    const { filePath, contentType } = await request.json() as {
      filePath: string;
      contentType: string;
    };

    if (!filePath || !contentType) {
      return NextResponse.json({ error: "filePath and contentType are required" }, { status: 400 });
    }

    const { data, error } = await supabase.storage
      .from("job-banners")
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Presign failed" }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

// PATCH — get public URL and persist it to notifications.visuals
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const supabase = createServiceRoleClient();

    const { filePath } = await request.json() as { filePath: string };
    if (!filePath) {
      return NextResponse.json({ error: "filePath is required" }, { status: 400 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from("job-banners")
      .getPublicUrl(filePath);

    // Load existing visuals and merge
    const { data: notif } = await supabase
      .from("notifications")
      .select("visuals")
      .eq("id", id)
      .single();

    const existingVisuals =
      typeof notif?.visuals === "object" && notif.visuals ? notif.visuals : {};
    const newVisuals = { ...existingVisuals, notification_image: publicUrl };

    await supabase
      .from("notifications")
      .update({ visuals: newVisuals, updated_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
