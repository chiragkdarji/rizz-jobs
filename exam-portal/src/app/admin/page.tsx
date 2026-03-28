import { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
import {
  BarChart3,
  Mail,
  Users,
  NotebookIcon,
  Clock,
  Tag,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Admin Dashboard - Rizz Jobs",
  description: "Admin panel for managing notifications and subscribers",
};

interface Stats {
  totalNotifications: number;
  totalEmailSubscribers: number;
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
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">{label}</p>
          <p className={`text-3xl font-black ${color}`}>{value.toLocaleString()}</p>
        </div>
        <Icon className={`w-10 h-10 ${color} opacity-15`} />
      </div>
    </div>
  );

  return (
    <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[11px] font-black uppercase tracking-widest text-indigo-400 mb-2">Admin Panel</p>
          <h1 className="text-4xl font-black mb-1">Dashboard</h1>
          <p className="text-gray-400 text-sm">
            Overview of your site&apos;s activity and quick access to all tools
          </p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
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
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">Quick Actions</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          <Link
            href="/admin/notifications"
            className="group rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6 hover:border-indigo-500/40 hover:bg-white/[0.05] transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <NotebookIcon className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-bold mb-1 group-hover:text-indigo-300 transition-colors">Manage Notifications</h3>
                <p className="text-gray-500 text-xs">Edit, delete, and search job notifications</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/subscribers"
            className="group rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6 hover:border-cyan-500/40 hover:bg-white/[0.05] transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-bold mb-1 group-hover:text-cyan-300 transition-colors">Email Subscribers</h3>
                <p className="text-gray-500 text-xs">View and manage email subscriptions</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/scraper"
            className="group rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6 hover:border-purple-500/40 hover:bg-white/[0.05] transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-bold mb-1 group-hover:text-purple-300 transition-colors">Trigger Scraper</h3>
                <p className="text-gray-500 text-xs">Manually run the job notification scraper</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/categories"
            className="group rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6 hover:border-amber-500/40 hover:bg-white/[0.05] transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Tag className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold mb-1 group-hover:text-amber-300 transition-colors">Manage Categories</h3>
                <p className="text-gray-500 text-xs">Add categories, set keywords, backfill notifications</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/digest"
            className="group rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6 hover:border-teal-500/40 hover:bg-white/[0.05] transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h3 className="font-bold mb-1 group-hover:text-teal-300 transition-colors">Email Digest</h3>
                <p className="text-gray-500 text-xs">Send daily/weekly email digests to subscribers</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Info */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6">
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">System Status</p>
          <ul className="space-y-2.5">
            {[
              "You are logged in as an admin",
              "All admin actions are logged and audited",
              "Changes to notifications are reflected in real-time",
              "Email notifications require proper env vars configured",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
    </main>
  );
}
