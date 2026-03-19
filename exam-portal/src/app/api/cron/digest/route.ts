import { createServiceRoleClient } from "@/lib/supabase-server";
import { resend, buildDigestEmailHtml } from "@/lib/resend";
import { NextRequest, NextResponse } from "next/server";

interface Notification {
  id: string;
  title: string;
  slug?: string;
  ai_summary: string;
  deadline: string;
  details?: { categories?: string[] } | null;
}

interface Subscriber {
  id: string;
  email: string;
  categories: string[] | null;
  unsubscribe_token: string;
}

function filterNotificationsForSubscriber(
  notifications: Notification[],
  subscriberCategories: string[] | null
): Notification[] {
  if (!subscriberCategories || subscriberCategories.length === 0) return notifications;
  return notifications.filter((n) => {
    const notifCategories = n.details?.categories ?? [];
    if (notifCategories.length === 0) return true;
    return notifCategories.some((cat) => subscriberCategories.includes(cat));
  });
}

async function sendDigest(digestType: "daily" | "weekly"): Promise<NextResponse> {
  const supabase = createServiceRoleClient();

  // Idempotency check (best-effort — skip if digest_log table missing)
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  const alreadySentResult = await supabase
    .from("digest_log")
    .select("id")
    .eq("digest_type", digestType)
    .gte("sent_at", todayStart.toISOString())
    .maybeSingle()
    .then((r) => r, () => ({ data: null }));
  const alreadySent = alreadySentResult.data;

  if (alreadySent) {
    return NextResponse.json({
      success: true,
      message: `${digestType} digest already sent today — skipping`,
      digestType,
      skipped: true,
    });
  }

  // Fetch recent notifications
  const hoursAgo = digestType === "daily" ? 24 : 168;
  const cutoffDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

  const { data: recentNotifications } = await supabase
    .from("notifications")
    .select("id, title, slug, ai_summary, deadline, details")
    .eq("is_active", true)
    .gte("created_at", cutoffDate)
    .order("created_at", { ascending: false });

  if (!recentNotifications || recentNotifications.length === 0) {
    return NextResponse.json({
      success: true,
      message: `No new notifications in the last ${hoursAgo} hours`,
      digestType,
      sent: 0,
    });
  }

  // Fetch confirmed subscribers for this frequency
  const { data: subscribers } = await supabase
    .from("email_subscriptions")
    .select("id, email, categories, unsubscribe_token")
    .eq("confirmed", true)
    .eq("frequency", digestType);

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({
      success: true,
      message: `No ${digestType} subscribers found`,
      digestType,
      sent: 0,
    });
  }

  // Send in batches of 50 to respect Resend rate limits
  let sentCount = 0;
  const batchSize = 50;

  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);

    const emailPromises = batch
      .map((subscriber: Subscriber) => {
        const relevant = filterNotificationsForSubscriber(
          recentNotifications,
          subscriber.categories
        );
        if (relevant.length === 0) return null;

        const html = buildDigestEmailHtml(
          relevant,
          subscriber.unsubscribe_token,
          digestType
        );

        return resend.emails.send({
          from: "Rizz Jobs <digest@rizzjobs.in>",
          to: subscriber.email,
          subject: `${digestType === "daily" ? "Daily" : "Weekly"} Job Alerts - Rizz Jobs`,
          html,
        });
      })
      .filter(Boolean);

    const results = await Promise.allSettled(emailPromises);
    sentCount += results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.error(`Batch ${i}: ${failed.length} emails failed`);
    }
  }

  // Log to digest_log (best-effort)
  supabase
    .from("digest_log")
    .insert({
      digest_type: digestType,
      sent_at: new Date().toISOString(),
      recipients: sentCount,
      notification_ids: recentNotifications.map((n: Notification) => n.id),
      status: "sent",
    })
    .then(({ error }) => { if (error) console.error("Failed to log digest:", error); });

  return NextResponse.json({
    success: true,
    message: `${digestType} digest sent to ${sentCount} subscribers`,
    digestType,
    sent: sentCount,
    notificationCount: recentNotifications.length,
  });
}

function authorize(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

// Vercel Cron calls GET
export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const hour = now.getUTCHours();
  const dayOfWeek = now.getUTCDay();

  if (hour < 9 || hour >= 10) {
    return NextResponse.json({
      success: true,
      message: "Not scheduled to run at this time",
      now: now.toISOString(),
      hour,
    });
  }

  // Monday at 9 AM UTC → weekly, otherwise daily
  const digestType: "daily" | "weekly" = dayOfWeek === 1 ? "weekly" : "daily";

  try {
    return await sendDigest(digestType);
  } catch (err) {
    console.error("Cron digest error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

// POST for manual admin test triggers (?type=daily|weekly)
export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const digestType: "daily" | "weekly" =
    searchParams.get("type") === "weekly" ? "weekly" : "daily";

  try {
    return await sendDigest(digestType);
  } catch (err) {
    console.error("Manual digest error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

export const maxDuration = 300;
