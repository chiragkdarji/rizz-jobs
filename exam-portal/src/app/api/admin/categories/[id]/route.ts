import { createServiceRoleClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceRoleClient();
    const { id } = await params;
    const body = await request.json();

    const allowed = ["name", "slug", "description", "tagline", "keywords", "is_active", "sort_order"];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) {
        if (key === "keywords") {
          update[key] = Array.isArray(body[key])
            ? body[key]
            : String(body[key]).split(",").map((k: string) => k.trim()).filter(Boolean);
        } else if (key === "slug") {
          update[key] = String(body[key]).trim().toLowerCase().replace(/\s+/g, "-");
        } else if (key === "sort_order") {
          update[key] = parseInt(body[key], 10);
        } else {
          update[key] = body[key];
        }
      }
    }

    const { data, error } = await supabase
      .from("categories")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ category: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceRoleClient();
    const { id } = await params;

    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
