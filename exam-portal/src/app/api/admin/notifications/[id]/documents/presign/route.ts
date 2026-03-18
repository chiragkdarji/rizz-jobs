import { createServiceRoleClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

const DOCUMENT_TYPES = [
  "official_notification",
  "admit_card",
  "result",
  "syllabus",
  "answer_key",
  "other",
] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const supabase = createServiceRoleClient();

    const body = await request.json();
    const { filename, document_type } = body;

    if (!filename || !document_type) {
      return NextResponse.json(
        { error: "filename and document_type are required" },
        { status: 400 }
      );
    }

    if (!DOCUMENT_TYPES.includes(document_type)) {
      return NextResponse.json({ error: "Invalid document_type" }, { status: 400 });
    }

    const { data: notification } = await supabase
      .from("notifications")
      .select("slug")
      .eq("id", id)
      .single();

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${notification.slug || id}/${Date.now()}_${safeFilename}`;

    const { data, error } = await supabase.storage
      .from("notification-documents")
      .createSignedUploadUrl(storagePath);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      storagePath,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
