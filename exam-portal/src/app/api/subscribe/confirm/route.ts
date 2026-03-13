import { createServiceRoleClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Confirm tokens embed a 24h expiry in the first 12 hex chars (unix timestamp).
 * Returns false if expired or malformed.
 */
function isConfirmTokenValid(token: string): boolean {
  if (token.length < 12) return false;
  try {
    const expiresAt = parseInt(token.substring(0, 12), 16);
    return Math.floor(Date.now() / 1000) < expiresAt;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/?error=no-token", request.url));
    }

    // Check expiry before hitting the database
    if (!isConfirmTokenValid(token)) {
      return NextResponse.redirect(new URL("/?error=token-expired", request.url));
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
