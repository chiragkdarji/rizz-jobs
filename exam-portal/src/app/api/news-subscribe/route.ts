/**
 * News Newsletter Subscribe API
 * Separate from /api/subscribe (which handles job alerts).
 *
 * Required Supabase table — run this migration once:
 *
 *   create table news_subscriptions (
 *     id               uuid primary key default gen_random_uuid(),
 *     email            text not null unique,
 *     topics           text[] default '{}',
 *     frequency        text not null default 'daily',
 *     confirmed        boolean not null default false,
 *     confirm_token    text,
 *     unsubscribe_token text,
 *     created_at       timestamptz not null default now()
 *   );
 *   create index on news_subscriptions (email);
 */

import { createServiceRoleClient } from "@/lib/supabase-server";
import { resend } from "@/lib/resend";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

const RATE_LIMIT_SECONDS = 60;

function generateExpiringToken(): string {
  const expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  const expHex = expiresAt.toString(16).padStart(12, "0");
  const random = randomBytes(28).toString("hex");
  return `${expHex}${random}`;
}

const VALID_TOPICS = ["finance", "business", "markets", "economy", "startups"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, topics, frequency } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const validFrequencies = ["daily", "weekly"];
    if (frequency && !validFrequencies.includes(frequency)) {
      return NextResponse.json({ error: "Frequency must be 'daily' or 'weekly'" }, { status: 400 });
    }

    const validatedTopics = Array.isArray(topics)
      ? topics.filter((t: string) => VALID_TOPICS.includes(t))
      : [];

    const supabase = createServiceRoleClient();

    // Rate limit
    const { data: existing } = await supabase
      .from("news_subscriptions")
      .select("created_at, confirmed")
      .eq("email", email)
      .maybeSingle();

    if (existing && !existing.confirmed) {
      const secondsAgo = (Date.now() - new Date(existing.created_at).getTime()) / 1000;
      if (secondsAgo < RATE_LIMIT_SECONDS) {
        return NextResponse.json(
          { success: true, message: "Check your email to confirm" },
          { status: 201 }
        );
      }
    }

    const confirmToken    = generateExpiringToken();
    const unsubscribeToken = randomBytes(32).toString("hex");

    const { error: upsertError } = await supabase
      .from("news_subscriptions")
      .upsert(
        {
          email,
          topics:    validatedTopics,
          frequency: frequency || "daily",
          confirmed: false,
          confirm_token:     confirmToken,
          unsubscribe_token: unsubscribeToken,
        },
        { onConflict: "email" }
      );

    if (upsertError) {
      console.error("News subscribe upsert error:", upsertError);
      return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
    }

    // Confirmation email
    if (process.env.RESEND_API_KEY) {
      const confirmUrl = `https://rizzjobs.in/news/subscribe/confirm?token=${confirmToken}`;
      await resend.emails.send({
        from: "Rizz Jobs Financial Intelligence <alerts@rizzjobs.in>",
        to: email,
        subject: "Confirm your Rizz Jobs Financial Intelligence subscription",
        html: `
          <div style="font-family:Georgia,serif;background:#070708;color:#f2ede6;padding:40px;max-width:480px;margin:auto;">
            <p style="font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:#f0a500;margin-bottom:16px;">Financial Intelligence</p>
            <h1 style="font-size:28px;font-weight:400;margin-bottom:16px;line-height:1.2;">One click to confirm</h1>
            <p style="color:#9a9699;font-size:14px;line-height:1.7;margin-bottom:24px;">
              You're almost subscribed to the Rizz Jobs Financial Intelligence daily briefing.
              Click below to confirm your email and start receiving India's top financial stories.
            </p>
            <a href="${confirmUrl}"
               style="display:inline-block;background:#f0a500;color:#070708;font-size:10px;font-weight:900;
                      letter-spacing:0.18em;text-transform:uppercase;padding:12px 24px;text-decoration:none;">
              Confirm Subscription →
            </a>
            <p style="color:#3a3848;font-size:11px;margin-top:24px;">
              If you didn't request this, ignore this email.
              Link expires in 24 hours.
            </p>
          </div>
        `,
      });
    }

    return NextResponse.json(
      { success: true, message: "Check your email to confirm" },
      { status: 201 }
    );
  } catch (err) {
    console.error("News subscribe error:", err);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
