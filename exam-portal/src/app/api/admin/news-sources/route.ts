import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { createServiceRoleClient } from "@/lib/supabase-server";

const VALID_CATEGORIES = [
  "finance",
  "business",
  "economy",
  "markets",
  "startups",
] as const;

export async function GET() {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("news_sources")
    .select("*")
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  await requireAdmin();
  const body = await request.json().catch(() => ({}));
  const { name, rss_url, category } = body;

  if (!name || !rss_url) {
    return NextResponse.json(
      { error: "name and rss_url are required" },
      { status: 400 }
    );
  }

  // Basic URL validation
  try {
    new URL(rss_url);
  } catch {
    return NextResponse.json({ error: "Invalid rss_url" }, { status: 400 });
  }

  const cat = VALID_CATEGORIES.includes(category) ? category : "finance";

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("news_sources")
    .insert({ name: name.trim(), rss_url: rss_url.trim(), category: cat, is_active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  await requireAdmin();
  const body = await request.json().catch(() => ({}));
  const { id, is_active } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("news_sources")
    .update({ is_active: Boolean(is_active) })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  await requireAdmin();
  const body = await request.json().catch(() => ({}));
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("news_sources").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
