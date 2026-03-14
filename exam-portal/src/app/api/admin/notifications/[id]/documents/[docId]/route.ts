import { createServiceRoleClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    await requireAdmin();
    const { id, docId } = await params;
    const supabase = createServiceRoleClient();

    const { data: doc, error: fetchError } = await supabase
      .from("notification_documents")
      .select("*")
      .eq("id", docId)
      .eq("notification_id", id)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Remove from Supabase Storage
    await supabase.storage.from("notification-documents").remove([doc.storage_path]);

    // Remove from DB
    const { error: deleteError } = await supabase
      .from("notification_documents")
      .delete()
      .eq("id", docId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
