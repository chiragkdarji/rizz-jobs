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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("notification_documents")
      .select("*")
      .eq("notification_id", id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data || []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const supabase = createServiceRoleClient();

    // Verify notification exists
    const { data: notification } = await supabase
      .from("notifications")
      .select("id, slug")
      .eq("id", id)
      .single();

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const documentType = (formData.get("document_type") as string) || "official_notification";
    const displayName = (formData.get("display_name") as string | null)?.trim() || null;

    if (!DOCUMENT_TYPES.includes(documentType as (typeof DOCUMENT_TYPES)[number])) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const results = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        results.push({ name: file.name, error: "Exceeds 10MB limit" });
        continue;
      }

      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["pdf", "doc", "docx"].includes(ext || "")) {
        results.push({ name: file.name, error: "Only PDF/DOC files allowed" });
        continue;
      }

      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${notification.slug || id}/${Date.now()}_${safeFileName}`;

      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from("notification-documents")
        .upload(storagePath, arrayBuffer, {
          contentType: file.type || "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        results.push({ name: file.name, error: uploadError.message });
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("notification-documents").getPublicUrl(storagePath);

      const { data: doc, error: dbError } = await supabase
        .from("notification_documents")
        .insert({
          notification_id: id,
          file_name: file.name,
          display_name: displayName,
          storage_path: storagePath,
          file_url: publicUrl,
          document_type: documentType,
          file_size_bytes: file.size,
          scraped: false,
        })
        .select()
        .single();

      if (dbError) {
        results.push({ name: file.name, error: dbError.message });
      } else {
        results.push(doc);
      }
    }

    return NextResponse.json(results, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
