import { createServerSupabaseClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await requireAuth();
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("bookmarks")
      .select("notification_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createServerSupabaseClient();

    const body = await request.json();
    const { notification_id } = body;

    if (!notification_id) {
      return NextResponse.json(
        { error: "notification_id is required" },
        { status: 400 }
      );
    }

    // Check bookmark count and duplicate in a single query
    const { data: existing, count } = await supabase
      .from("bookmarks")
      .select("id, notification_id", { count: "exact" })
      .eq("user_id", user.id);

    if ((count ?? 0) >= 500) {
      return NextResponse.json(
        { error: "Bookmark limit reached (max 500)" },
        { status: 429 }
      );
    }

    const existingBookmark = existing?.find(
      (b) => b.notification_id === notification_id
    );

    if (existingBookmark) {
      return NextResponse.json(
        { error: "Already bookmarked" },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .insert({
        user_id: user.id,
        notification_id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createServerSupabaseClient();

    const body = await request.json();
    const { notification_id } = body;

    if (!notification_id) {
      return NextResponse.json(
        { error: "notification_id is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("notification_id", notification_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
