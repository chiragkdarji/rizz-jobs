import { createServiceRoleClient, createServerSupabaseClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

// GET — return current subscription for logged-in user
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ subscription: null });
  }

  const serviceClient = createServiceRoleClient();
  const { data } = await serviceClient
    .from("email_subscriptions")
    .select("id, frequency, categories, confirmed")
    .eq("email", user.email)
    .maybeSingle();

  return NextResponse.json({ subscription: data ?? null });
}

// POST — create or update subscription (auto-confirmed, no email needed)
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { frequency, categories } = body;

  if (!["daily", "weekly"].includes(frequency)) {
    return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
  }

  const serviceClient = createServiceRoleClient();

  // Check if subscription already exists to preserve unsubscribe_token
  const { data: existing } = await serviceClient
    .from("email_subscriptions")
    .select("unsubscribe_token")
    .eq("email", user.email)
    .maybeSingle();

  const unsubscribeToken = existing?.unsubscribe_token || randomBytes(32).toString("hex");

  const { error } = await serviceClient
    .from("email_subscriptions")
    .upsert(
      {
        email: user.email,
        frequency,
        categories: Array.isArray(categories) ? categories : [],
        confirmed: true, // auto-confirm — user is already authenticated
        unsubscribe_token: unsubscribeToken,
        confirm_token: null,
      },
      { onConflict: "email" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE — unsubscribe
export async function DELETE() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient
    .from("email_subscriptions")
    .delete()
    .eq("email", user.email);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
