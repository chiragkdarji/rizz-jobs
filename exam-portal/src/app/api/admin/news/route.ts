import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { createServiceRoleClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "published_at";
  const sortAsc = searchParams.get("sortOrder") === "asc";
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("news_articles")
    .select(
      "id, slug, headline, category, source_name, published_at, is_published, view_count",
      { count: "exact" }
    );

  if (search) query = query.ilike("headline", `%${search}%`);
  if (category) query = query.eq("category", category);

  query = query
    .order(sortBy, { ascending: sortAsc })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    articles: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  });
}

export async function DELETE(request: NextRequest) {
  await requireAdmin();
  const supabase = createServiceRoleClient();
  const body = await request.json().catch(() => ({}));
  const toDelete: string[] = body.ids ?? (body.id ? [body.id] : []);

  if (toDelete.length === 0) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }

  const { error } = await supabase
    .from("news_articles")
    .delete()
    .in("id", toDelete);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: toDelete.length });
}
