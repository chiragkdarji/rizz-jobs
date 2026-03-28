import { createServiceRoleClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceRoleClient();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const rawSearch = searchParams.get("search") || "";
    // Cap length and strip PostgREST syntax chars ( ) , that break .or() filter parsing
    const search = rawSearch.slice(0, 100).replace(/[(),]/g, " ").trim();
    const limit = 50;
    const offset = (page - 1) * limit;

    // Sorting — whitelist allowed columns
    const SORTABLE = ["title", "is_active", "updated_at", "created_at", "view_count"] as const;
    type SortCol = typeof SORTABLE[number];
    const rawSortBy = searchParams.get("sortBy") || "created_at";
    const sortBy: SortCol = (SORTABLE as readonly string[]).includes(rawSortBy)
      ? (rawSortBy as SortCol)
      : "created_at";
    const sortDir = searchParams.get("sortDir") === "asc";

    // Build query
    let query = supabase
      .from("notifications")
      .select(
        "id, title, slug, link, ai_summary, exam_date, deadline, created_at, updated_at, is_active, view_count",
        { count: "exact" }
      );

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,ai_summary.ilike.%${search}%`
      );
    }

    const { data, count, error } = await query
      .order(sortBy, { ascending: sortDir, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      notifications: data,
      total: count || 0,
      page,
      pageSize: limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceRoleClient();

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
