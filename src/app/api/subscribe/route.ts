import { createServiceRoleClient } from "@/lib/supabase-server";
import { resend, buildConfirmationEmailHtml } from "@/lib/resend";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, categories, frequency } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate frequency
    const validFrequencies = ["daily", "weekly"];
    if (frequency && !validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: "Frequency must be 'daily' or 'weekly'" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Generate tokens
    const confirmToken = randomBytes(32).toString("hex");
    const unsubscribeToken = randomBytes(32).toString("hex");

    // Upsert subscription (creates or updates if email exists)
    const { error: upsertError } = await supabase
      .from("email_subscriptions")
      .upsert(
        {
          email,
          categories: Array.isArray(categories) ? categories : [],
          frequency: frequency || "daily",
          confirmed: false,
          confirm_token: confirmToken,
          unsubscribe_token: unsubscribeToken,
        },
        { onConflict: "email" }
      );

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return NextResponse.json(
        { error: "Failed to create subscription" },
        { status: 500 }
      );
    }

    // Send confirmation email
    if (process.env.RESEND_API_KEY) {
      const confirmationHtml = buildConfirmationEmailHtml(confirmToken);

      await resend.emails.send({
        from: "alerts@rizzjobs.in",
        to: email,
        subject: "Confirm your Rizz Jobs subscription",
        html: confirmationHtml,
      });
    }

    // Always return success to prevent email enumeration
    return NextResponse.json(
      {
        success: true,
        message: "Check your email to confirm your subscription",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
