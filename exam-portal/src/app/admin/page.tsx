import { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
import {
  BarChart3,
  Mail,
  Bell,
  Users,
  NotebookIcon,
  ArrowLeft,
  Clock,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Admin Dashboard - Rizz Jobs",
  description: "Admin panel for managing notifications and subscribers",
};

interface Stats {
  totalNotifications: number;
  totalEmailSubscribers: number;
  totalPushSubscriptions: number;
  totalUsers: number;
  recentNotifications: number;
}

async function fetchStats(): Promise<Stats | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/admin/stats`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Cookie headers are automatically included by Next.js
      },
      credentials: "include",
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function AdminDashboard() {
  await requireAdmin();
  const stats = await fetchStats();

  const StatCard = ({
    icon: Icon,
    label,
    value,
    color,
  }: {
    icon: React.ComponentType<{ className: string }>;
    label: string;
    value: number;
    color: string;
  }) => (
    <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-bold mb-2">{label}</p>
          <p className={`text-4xl font-black ${color}`}>{value}</p>
        </div>
        <Icon className={`w-12 h-12 ${color} opacity-20`} />
      </div>
    </div>
  );

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
              Back to Site
            </span>
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-black mb-2">Admin Dashboard</h1>
              <p className="text-xl text-gray-400">
                Manage notifications, subscribers, and settings
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
            <StatCard
              icon={NotebookIcon}
              label="Total Jobs"
              value={stats.totalNotifications}
              color="text-indigo-400"
            />
            <StatCard
              icon={Mail}
              label="Email Subscribers"
              value={stats.totalEmailSubscribers}
              color="text-cyan-400"
            />
            <StatCard
              icon={Bell}
              label="Push Subscriptions"
              value={stats.totalPushSubscriptions}
              color="text-purple-400"
            />
            <StatCard
              icon={Users}
              label="User Accounts"
              value={stats.totalUsers}
              color="text-emerald-400"
            />
            <StatCard
              icon={BarChart3}
              label="Last 7 Days"
              value={stats.recentNotifications}
              color="text-orange-400"
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Link
            href="/admin/notifications"
            className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8 hover:border-indigo-500/50 transition-all"
          >
            <NotebookIcon className="w-12 h-12 text-indigo-400 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Manage Notifications</h3>
            <p className="text-gray-400">Edit, delete, and search job notifications</p>
          </Link>

          <Link
            href="/admin/subscribers"
            className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8 hover:border-indigo-500/50 transition-all"
          >
            <Mail className="w-12 h-12 text-cyan-400 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Email Subscribers</h3>
            <p className="text-gray-400">View and manage email subscriptions</p>
          </Link>

          <Link
            href="/admin/scraper"
            className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8 hover:border-indigo-500/50 transition-all"
          >
            <BarChart3 className="w-12 h-12 text-purple-400 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Trigger Scraper</h3>
            <p className="text-gray-400">Manually run the job notification scraper</p>
          </Link>

          <Link
            href="/admin/push"
            className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8 hover:border-indigo-500/50 transition-all"
          >
            <Bell className="w-12 h-12 text-orange-400 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Push Notifications</h3>
            <p className="text-gray-400">Broadcast notifications to subscribed users</p>
          </Link>

          <Link
            href="/admin/digest"
            className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8 hover:border-indigo-500/50 transition-all"
          >
            <Clock className="w-12 h-12 text-cyan-400 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Email Digest</h3>
            <p className="text-gray-400">Send daily/weekly email digests to subscribers</p>
          </Link>
        </div>

        {/* Info */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-8">
          <h3 className="text-xl font-bold mb-4">Admin Info</h3>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li>✓ You are logged in as an admin</li>
            <li>✓ All admin actions are logged and audited</li>
            <li>✓ Changes to notifications are reflected in real-time</li>
            <li>✓ Email and push notifications require proper env vars configured</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
