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

    // Find subscription by confirm token
    const { data: subscription, error: fetchError } = await supabase
      .from("email_subscriptions")
      .select("*")
      .eq("confirm_token", token)
      .maybeSingle();

    if (fetchError || !subscription) {
      return NextResponse.redirect(
        new URL("/?error=invalid-token", request.url)
      );
    }

    // Check if already confirmed
    if (subscription.confirmed) {
      return NextResponse.redirect(
        new URL("/?subscribed=true&already=true", request.url)
      );
    }

    // Update to confirmed
    const { error: updateError } = await supabase
      .from("email_subscriptions")
      .update({ confirmed: true })
      .eq("id", subscription.id);

    if (updateError) {
      return NextResponse.redirect(new URL("/?error=update-failed", request.url));
    }

    // Redirect to home with success message
    return NextResponse.redirect(new URL("/?subscribed=true", request.url));
  } catch (err) {
    console.error("Confirm error:", err);
    return NextResponse.redirect(new URL("/?error=server-error", request.url));
  }
}
