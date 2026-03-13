import { createServiceRoleClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceRoleClient();

    // Total notifications
    const { count: totalNotifications } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true });

    // Total confirmed email subscribers
    const { count: totalEmailSubscribers } = await supabase
      .from("email_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("confirmed", true);

    // Total users
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Recent notifications (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: recentNotifications } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo);

    return NextResponse.json({
      totalNotifications: totalNotifications || 0,
      totalEmailSubscribers: totalEmailSubscribers || 0,
      totalUsers: totalUsers || 0,
      recentNotifications: recentNotifications || 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
