import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  // Sign out the user
  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Derive origin from the incoming request — works correctly on any domain
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(new URL("/", origin), { status: 302 });
}
