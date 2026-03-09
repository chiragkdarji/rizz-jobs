import { createServerSupabaseClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await requireAuth();
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = await createServerSupabaseClient();

    const body = await request.json();
    const { display_name, followed_categories } = body;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (display_name !== undefined) {
      updates.display_name = display_name;
    }

    if (followed_categories !== undefined) {
      if (!Array.isArray(followed_categories)) {
        return NextResponse.json(
          { error: "followed_categories must be an array" },
          { status: 400 }
        );
      }
      updates.followed_categories = followed_categories;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
