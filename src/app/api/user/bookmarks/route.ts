import { createServerSupabaseClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
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

    // Check if already bookmarked
    const { data: existingBookmark } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", user.id)
      .eq("notification_id", notification_id)
      .maybeSingle();

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
