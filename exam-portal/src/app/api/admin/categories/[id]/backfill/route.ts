import { createServiceRoleClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceRoleClient();
    const { id } = await params;

    // Fetch the category
    const { data: category, error: catErr } = await supabase
      .from("categories")
      .select("name, keywords")
      .eq("id", id)
      .single();

    if (catErr || !category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const keywords: string[] = category.keywords || [];
    if (keywords.length === 0) {
      return NextResponse.json({ error: "No keywords defined for this category" }, { status: 400 });
    }

    // Fetch all active notifications (title + ai_summary + current details)
    // We page through in batches of 500 to avoid memory issues
    let updated = 0;
    let skipped = 0;
    let from = 0;
    const batchSize = 500;

    while (true) {
      const { data: notifications, error: fetchErr } = await supabase
        .from("notifications")
        .select("id, title, ai_summary, details")
        .eq("is_active", true)
        .range(from, from + batchSize - 1);

      if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 400 });
      if (!notifications || notifications.length === 0) break;

      for (const n of notifications) {
        const text = `${n.title || ""} ${n.ai_summary || ""}`.toLowerCase();
        const matches = keywords.some((kw) => text.includes(kw.toLowerCase()));
        if (!matches) { skipped++; continue; }

        const details = (n.details || {}) as Record<string, unknown>;
        const currentCategories: string[] = Array.isArray(details.categories)
          ? (details.categories as string[])
          : [];

        if (currentCategories.includes(category.name)) { skipped++; continue; }

        const { error: updateErr } = await supabase
          .from("notifications")
          .update({
            details: { ...details, categories: [...currentCategories, category.name] },
            updated_at: new Date().toISOString(),
          })
          .eq("id", n.id);

        if (!updateErr) updated++;
      }

      if (notifications.length < batchSize) break;
      from += batchSize;
    }

    return NextResponse.json({ success: true, updated, skipped });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
