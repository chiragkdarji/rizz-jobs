import { Metadata } from "next";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-helpers";
import { BookmarkIcon, ArrowLeft, Settings } from "lucide-react";
import { NotificationBanner } from "@/components/NotificationBanner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard - Rizz Jobs",
  description: "View your saved job notifications and preferences",
};

interface Notification {
  id: string;
  title: string;
  slug?: string;
  ai_summary: string;
  exam_date: string;
  deadline: string;
  visuals?: {
    notification_image?: string;
  };
}

interface Bookmark {
  notification_id: string;
  created_at: string;
  notifications: Notification | Notification[];
}

function formatDate(dateStr: string | null) {
  if (!dateStr || dateStr === "TBA" || dateStr === "To be notified")
    return dateStr || "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

export default async function DashboardPage() {
  const user = await requireAuth();
  const supabase = await createServerSupabaseClient();

  // Fetch user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch user's bookmarks with notification details
  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select(
      `
      notification_id,
      created_at,
      notifications (
        id,
        title,
        slug,
        ai_summary,
        exam_date,
        deadline,
        visuals
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const savedNotifications = bookmarks
    ?.map((b: Bookmark) => (Array.isArray(b.notifications) ? b.notifications[0] : b.notifications))
    .filter(Boolean) as Notification[] | undefined;

  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans selection:bg-indigo-500/30">
      {/* Background Glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="flex items-center gap-3 group mb-8 hover:no-underline"
          >
            <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/10 transition-all">
              <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white" />
            </div>
            <span className="text-gray-400 font-medium group-hover:text-white">
              Back to Updates
            </span>
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-black mb-2">My Dashboard</h1>
              <p className="text-xl text-gray-400">
                Welcome back,{" "}
                <span className="text-indigo-400">
                  {profile?.display_name || user.email?.split("@")[0] || "User"}
                </span>
              </p>
            </div>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              <Settings className="w-5 h-5" />
              Settings
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Saved Jobs</p>
            <p className="text-3xl font-black text-indigo-400">
              {savedNotifications?.length || 0}
            </p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Email</p>
            <p className="text-sm font-bold truncate text-gray-200">{user.email}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Member Since</p>
            <p className="text-sm font-bold text-gray-200">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                : "Today"}
            </p>
          </div>
        </div>

        {/* Saved Notifications */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <BookmarkIcon className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="text-xl font-black">Saved Jobs</h2>
          </div>

          {!savedNotifications || savedNotifications.length === 0 ? (
            <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-12 text-center">
              <BookmarkIcon className="w-16 h-16 text-gray-500 mx-auto mb-4 opacity-50" />
              <p className="text-gray-400 text-lg mb-4">
                No saved jobs yet
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all"
              >
                Browse Jobs
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedNotifications.map((item) => (
                <Link
                  key={item.id}
                  href={`/exam/${item.slug || item.id}`}
                  className="group rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 block"
                >
                  {/* Notification Image */}
                  <NotificationBanner
                    imageUrl={item.visuals?.notification_image}
                    title={item.title}
                  />

                  {/* Title */}
                  <h3 className="text-lg font-bold mb-2 line-clamp-2 group-hover:text-indigo-400 transition-colors">
                    {item.title}
                  </h3>

                  {/* Summary */}
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                    {item.ai_summary?.replace(/<[^>]*>/g, "")}
                  </p>

                  {/* Dates */}
                  {item.exam_date && item.deadline ? (
                    <div className="flex gap-2 mb-4">
                      <div className="flex-1 text-xs bg-white/5 border border-white/5 px-3 py-2 rounded-lg">
                        <p className="text-gray-500 font-bold mb-0.5">Exam Date</p>
                        <p className="text-white font-bold">{formatDate(item.exam_date)}</p>
                      </div>
                      <div className="flex-1 text-xs bg-amber-500/5 border border-amber-500/10 px-3 py-2 rounded-lg">
                        <p className="text-amber-500/70 font-bold mb-0.5">Apply By</p>
                        <p className="text-amber-400 font-bold">{formatDate(item.deadline)}</p>
                      </div>
                    </div>
                  ) : item.exam_date ? (
                    <div className="inline-flex items-center gap-2 text-xs bg-white/5 border border-white/5 px-3 py-1.5 rounded-full mb-4">
                      <span className="text-gray-500 font-bold">Exam:</span>
                      <span className="text-white font-bold">{formatDate(item.exam_date)}</span>
                    </div>
                  ) : item.deadline ? (
                    <div className="inline-flex items-center gap-2 text-xs bg-amber-500/5 border border-amber-500/10 px-3 py-1.5 rounded-full mb-4">
                      <span className="text-amber-500/70 font-bold">Apply By:</span>
                      <span className="text-amber-400 font-bold">{formatDate(item.deadline)}</span>
                    </div>
                  ) : null}

                  {/* CTA */}
                  <button className="w-full py-2 px-3 rounded-lg bg-indigo-600 group-hover:bg-indigo-700 text-white text-sm font-bold transition-all">
                    View Details
                  </button>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
