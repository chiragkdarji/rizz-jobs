import { createServiceRoleClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

// ONE-TIME USE: Delete all files from notification-documents bucket + clear DB table
// DELETE THIS FILE AFTER USE
export async function POST() {
  try {
    await requireAdmin();
    const supabase = createServiceRoleClient();
    const BUCKET = "notification-documents";

    let totalDeleted = 0;
    const errors: string[] = [];

    // List all top-level folders/files
    const { data: rootItems, error: listError } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: 1000 });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const folders = (rootItems || []).filter(item => !item.id);
    const rootFiles = (rootItems || []).filter(item => item.id).map(item => item.name);

    // Delete root-level files
    if (rootFiles.length > 0) {
      const { error } = await supabase.storage.from(BUCKET).remove(rootFiles);
      if (error) errors.push(`root: ${error.message}`);
      else totalDeleted += rootFiles.length;
    }

    // For each folder, list and delete all files
    for (const folder of folders) {
      const { data: files, error: folderErr } = await supabase.storage
        .from(BUCKET)
        .list(folder.name, { limit: 1000 });

      if (folderErr || !files) {
        errors.push(`${folder.name}: ${folderErr?.message}`);
        continue;
      }

      const paths = files.filter(f => f.id).map(f => `${folder.name}/${f.name}`);
      if (paths.length > 0) {
        const { error } = await supabase.storage.from(BUCKET).remove(paths);
        if (error) errors.push(`${folder.name}: ${error.message}`);
        else totalDeleted += paths.length;
      }
    }

    // Also truncate the notification_documents DB table
    const { error: dbError } = await supabase
      .from("notification_documents")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all rows

    return NextResponse.json({
      success: true,
      filesDeleted: totalDeleted,
      foldersProcessed: folders.length,
      dbCleared: !dbError,
      errors,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
