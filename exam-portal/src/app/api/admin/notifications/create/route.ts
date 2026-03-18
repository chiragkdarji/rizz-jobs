import { createServiceRoleClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 120);
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceRoleClient();

    const body = await request.json();
    const { title, link, ai_summary, exam_date, deadline, details } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const baseSlug = generateSlug(title);

    // Resolve slug conflicts
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("slug", baseSlug)
      .maybeSingle();

    const slug = existing ? `${baseSlug}_${Date.now()}` : baseSlug;

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        title: title.trim(),
        slug,
        source: "Manual Entry",
        link: link?.trim() || null,
        ai_summary: ai_summary?.trim() || null,
        exam_date: exam_date || null,
        deadline: deadline || null,
        details: details || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id, slug")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ id: data.id, slug: data.slug });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
