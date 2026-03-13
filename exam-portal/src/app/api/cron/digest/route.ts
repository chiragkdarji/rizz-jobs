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

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Determine which digest type to send based on current day/time
    // Daily: every day at 9 AM UTC
    // Weekly: every Monday at 9 AM UTC
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
    const hour = now.getUTCHours();

    let digestType: "daily" | "weekly" | null = null;

    // Use hour range (>= 9 && < 10) so a cron firing at 9:30 still matches
    if (hour >= 9 && hour < 10) {
      digestType = "daily";
    }

    // Send weekly digest on Monday at 9 AM UTC (overrides daily)
    if (dayOfWeek === 1 && hour >= 9 && hour < 10) {
      digestType = "weekly";
    }

    if (!digestType) {
      return NextResponse.json({
        success: true,
        message: "Not scheduled to run at this time",
        now: now.toISOString(),
        dayOfWeek,
        hour,
      });
    }

    const supabase = createServiceRoleClient();

    // Idempotency check: if a digest of this type was already sent today, skip.
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    const { data: alreadySent } = await supabase
      .from("digest_log")
      .select("id")
      .eq("digest_type", digestType)
      .gte("sent_at", todayStart.toISOString())
      .maybeSingle();

    if (alreadySent) {
      return NextResponse.json({
        success: true,
        message: `${digestType} digest already sent today — skipping to prevent duplicates`,
        digestType,
        skipped: true,
      });
    }

    // Fetch recent notifications
    const hoursAgo = digestType === "daily" ? 24 : 168; // 24h for daily, 7d for weekly
    const cutoffDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

    const { data: recentNotifications } = await supabase
      .from("notifications")
      .select("id, title, slug, ai_summary, deadline, details")
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

    // Filter notifications by subscriber's category preferences.
    // notifications include details.categories from the scraper.
    // If subscriber has no preferences → send all.
    // If a notification has no categories → include it for everyone.
    const filterNotificationsForSubscriber = (
      notifications: Notification[],
      subscriberCategories: string[] | null
    ): Notification[] => {
      if (!subscriberCategories || subscriberCategories.length === 0) {
        return notifications;
      }
      return notifications.filter((n) => {
        const notifCategories = n.details?.categories ?? [];
        if (notifCategories.length === 0) return true;
        return notifCategories.some((cat) => subscriberCategories.includes(cat));
      });
    };

    // Send emails (batch to avoid rate limits)
    let sentCount = 0;
    const batchSize = 50;

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);

      const emailPromises = batch
        .map((subscriber: Subscriber) => {
          const notificationsForSubscriber = filterNotificationsForSubscriber(
            recentNotifications,
            subscriber.categories
          );

          // Skip if no matching notifications for this subscriber
          if (notificationsForSubscriber.length === 0) return null;

          const html = buildDigestEmailHtml(
            notificationsForSubscriber,
            subscriber.unsubscribe_token
          );

          return resend.emails.send({
            from: "digest@rizzjobs.in",
            to: subscriber.email,
            subject: `${digestType === "daily" ? "Daily" : "Weekly"} Job Alerts - Rizz Jobs`,
            html,
          });
        })
        .filter(Boolean);

      try {
        const results = await Promise.allSettled(emailPromises);
        sentCount += results.filter((r) => r.status === "fulfilled").length;
      } catch (err) {
        console.error(`Error sending batch ${i}:`, err);
      }
    }

    // Log to digest_log table
    const { error: logError } = await supabase.from("digest_log").insert({
      digest_type: digestType,
      sent_at: new Date().toISOString(),
      recipients: sentCount,
      notification_ids: recentNotifications.map((n: Notification) => n.id),
      status: "sent",
    });

    if (logError) {
      console.error("Failed to log digest send:", logError);
    }

    return NextResponse.json({
      success: true,
      message: `${digestType} digest sent to ${sentCount} subscribers`,
      digestType,
      sent: sentCount,
      notificationCount: recentNotifications.length,
    });
  } catch (err) {
    console.error("Cron digest error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process cron job" },
      { status: 500 }
    );
  }
}

// Configure this route to run as a cron job
export const maxDuration = 300; // 5 minutes max
