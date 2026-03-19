import { createServiceRoleClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ categories: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceRoleClient();
    const body = await request.json();

    const { name, slug, description, tagline, keywords, sort_order } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
    }

    const keywordsArray = Array.isArray(keywords)
      ? keywords
      : String(keywords || "").split(",").map((k: string) => k.trim()).filter(Boolean);

    const { data, error } = await supabase
      .from("categories")
      .insert({
        name: String(name).trim(),
        slug: String(slug).trim().toLowerCase().replace(/\s+/g, "-"),
        description: String(description || "").trim(),
        tagline: String(tagline || "").trim(),
        keywords: keywordsArray,
        sort_order: parseInt(sort_order || "0", 10),
        is_active: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ category: data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
