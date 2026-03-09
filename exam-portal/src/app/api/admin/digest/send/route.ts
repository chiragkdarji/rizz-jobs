import { createServiceRoleClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-helpers";
import { resend, buildDigestEmailHtml } from "@/lib/resend";
import { NextRequest, NextResponse } from "next/server";

interface Notification {
  id: string;
  title: string;
  slug?: string;
  ai_summary: string;
  deadline: string;
}

interface Subscriber {
  id: string;
  email: string;
  categories: string[] | null;
  unsubscribe_token: string;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { type = "daily", dryRun = false } = body;

    // Validate digest type
    if (!["daily", "weekly"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'daily' or 'weekly'" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Fetch recent notifications
    const hoursAgo = type === "daily" ? 24 : 168; // 24h for daily, 7d for weekly
    const cutoffDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

    const { data: recentNotifications } = await supabase
      .from("notifications")
      .select("id, title, slug, ai_summary, deadline")
      .gte("created_at", cutoffDate)
      .order("created_at", { ascending: false });

    if (!recentNotifications || recentNotifications.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No new notifications in the last ${hoursAgo} hours`,
        sent: 0,
      });
    }

    // Fetch confirmed subscribers for this frequency
    const { data: subscribers } = await supabase
      .from("email_subscriptions")
      .select("id, email, categories, unsubscribe_token")
      .eq("confirmed", true)
      .eq("frequency", type);

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No ${type} subscribers found`,
        sent: 0,
      });
    }

    // Filter notifications by subscriber categories
    const filterNotificationsForSubscriber = (
      notifications: Notification[],
      subscriberCategories: string[] | null
    ) => {
      // If subscriber has no categories selected, send all notifications
      if (!subscriberCategories || subscriberCategories.length === 0) {
        return notifications;
      }
      // Otherwise, filter by categories (if implemented in database)
      // For now, send all since categories aren't in the notification query
      return notifications;
    };

    // In dry-run mode, just return what would be sent
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `Would send ${type} digest to ${subscribers.length} subscribers`,
        totalNotifications: recentNotifications.length,
        notificationPreview: recentNotifications.slice(0, 5),
        subscribersPreview: subscribers.slice(0, 3).map((s: Subscriber) => ({ email: s.email })),
      });
    }

    // Send emails (batch to avoid rate limits)
    let sentCount = 0;
    const batchSize = 50;

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);

      const emailPromises = batch.map((subscriber: Subscriber) => {
        const notificationsForSubscriber = filterNotificationsForSubscriber(
          recentNotifications,
          subscriber.categories
        );

        const html = buildDigestEmailHtml(
          notificationsForSubscriber,
          subscriber.unsubscribe_token
        );

        return resend.emails.send({
          from: "digest@rizzjobs.in",
          to: subscriber.email,
          subject: `${type === "daily" ? "Daily" : "Weekly"} Job Alerts - Rizz Jobs`,
          html,
        });
      });

      try {
        const results = await Promise.allSettled(emailPromises);
        sentCount += results.filter((r) => r.status === "fulfilled").length;
      } catch (err) {
        console.error(`Error sending batch ${i}:`, err);
      }
    }

    // Log to digest_log table
    const { error: logError } = await supabase.from("digest_log").insert({
      digest_type: type,
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
      message: `${type} digest sent to ${sentCount} subscribers`,
      sent: sentCount,
      notificationCount: recentNotifications.length,
    });
  } catch (err) {
    console.error("Digest send error:", err);
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
