import { createServiceRoleClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/?error=no-token", request.url));
    }

    const supabase = createServiceRoleClient();

    // Find subscription by unsubscribe token
    const { data: subscription, error: fetchError } = await supabase
      .from("email_subscriptions")
      .select("*")
      .eq("unsubscribe_token", token)
      .maybeSingle();

    if (fetchError || !subscription) {
      return NextResponse.redirect(
        new URL("/?error=invalid-token", request.url)
      );
    }

    // Delete subscription
    const { error: deleteError } = await supabase
      .from("email_subscriptions")
      .delete()
      .eq("id", subscription.id);

    if (deleteError) {
      return NextResponse.redirect(new URL("/?error=delete-failed", request.url));
    }

    // Redirect to home with success message
    return NextResponse.redirect(new URL("/?unsubscribed=true", request.url));
  } catch (err) {
    console.error("Unsubscribe error:", err);
    return NextResponse.redirect(new URL("/?error=server-error", request.url));
  }
}
