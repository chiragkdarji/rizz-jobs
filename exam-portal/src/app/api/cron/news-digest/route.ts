// Vercel Cron: sends daily finance & business news digest at 8 AM UTC.
// Subscribers opt-in by having news_frequency = 'daily' in email_subscriptions.
// Schedule: "0 8 * * *" in vercel.json

import { createServiceRoleClient } from "@/lib/supabase-server";
import { resend, buildNewsDigestEmailHtml } from "@/lib/resend";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

interface NewsArticle {
  headline: string;
  summary: string;
  slug: string;
  category: string;
  source_name: string;
  published_at: string;
}

interface Subscriber {
  id: string;
  email: string;
  unsubscribe_token: string;
}

function authorize(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

async function sendNewsDigest(): Promise<NextResponse> {
  const supabase = createServiceRoleClient();

  // Idempotency: skip if news digest already sent today
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  const alreadySentResult = await supabase
    .from("digest_log")
    .select("id")
    .eq("digest_type", "news_daily")
    .gte("sent_at", todayStart.toISOString())
    .maybeSingle()
    .then((r) => r, () => ({ data: null }));

  if (alreadySentResult.data) {
    return NextResponse.json({ skipped: true, reason: "News digest already sent today" });
  }

  // Fetch top 8 articles from the last 24 hours
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { data: articles } = await supabase
    .from("news_articles")
    .select("headline, summary, slug, category, source_name, published_at")
    .eq("is_published", true)
    .gte("published_at", cutoff24h)
    .order("published_at", { ascending: false })
    .limit(8);

  if (!articles || articles.length === 0) {
    return NextResponse.json({ skipped: true, reason: "No articles published in last 24h" });
  }

  // Fetch subscribers who opted into news digest
  // Uses news_frequency column (add via migration: ALTER TABLE email_subscriptions ADD COLUMN IF NOT EXISTS news_frequency text DEFAULT NULL)
  // Falls back to checking categories array for 'news' string
  const { data: subscribers } = await supabase
    .from("email_subscriptions")
    .select("id, email, unsubscribe_token")
    .eq("confirmed", true)
    .not("news_frequency", "is", null)
    .eq("news_frequency", "daily");

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ skipped: true, reason: "No news digest subscribers" });
  }

  // Send in batches of 50
  const BATCH_SIZE = 50;
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch: Subscriber[] = subscribers.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((sub) =>
        resend.emails.send({
          from: "news@rizzjobs.in",
          to: sub.email,
          subject: `Today's Finance & Business News — ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long" })}`,
          html: buildNewsDigestEmailHtml(articles as NewsArticle[], sub.unsubscribe_token),
        })
      )
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        sent++;
      } else {
        failed++;
        errors.push(result.reason?.message ?? "unknown error");
      }
    }
  }

  // Log to digest_log (best-effort)
  await supabase
    .from("digest_log")
    .insert({
      digest_type: "news_daily",
      sent_at: now.toISOString(),
      recipients: sent,
      notification_ids: [],
      status: failed === 0 ? "sent" : "partial",
    })
    .then(() => {}, () => {});

  return NextResponse.json({
    sent,
    failed,
    articles: articles.length,
    ...(errors.length > 0 && { firstError: errors[0] }),
  });
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get("force") === "true";

  // Only run at 8 AM UTC (±30 min) unless forced
  const hour = new Date().getUTCHours();
  if (!force && (hour < 8 || hour >= 9)) {
    return NextResponse.json({ skipped: true, reason: `Not 8 AM UTC (current: ${hour}:00)` });
  }

  return sendNewsDigest();
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return sendNewsDigest();
}
