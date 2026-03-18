import { createServiceRoleClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const supabase = createServiceRoleClient();

    const {
      storagePath,
      filename,
      document_type,
      display_name,
      file_size_bytes,
    } = await request.json();

    if (!storagePath || !filename) {
      return NextResponse.json(
        { error: "storagePath and filename are required" },
        { status: 400 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("notification-documents").getPublicUrl(storagePath);

    const { data, error } = await supabase
      .from("notification_documents")
      .insert({
        notification_id: id,
        file_name: filename,
        display_name: display_name || null,
        storage_path: storagePath,
        file_url: publicUrl,
        document_type: document_type || "official_notification",
        file_size_bytes: file_size_bytes || 0,
        scraped: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
