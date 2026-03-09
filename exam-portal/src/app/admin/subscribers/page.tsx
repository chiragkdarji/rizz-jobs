import { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { ArrowLeft, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Email Subscribers - Admin",
};

interface Subscriber {
  id: string;
  email: string;
  frequency: "daily" | "weekly";
  categories: string[] | null;
  confirmed: boolean;
  created_at: string;
}

export default async function SubscribersPage() {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const { data: subscribers } = await supabase
    .from("email_subscriptions")
    .select("*")
    .eq("confirmed", true)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans selection:bg-indigo-500/30">
      {/* Background Glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <Link
          href="/admin"
          className="flex items-center gap-3 group mb-8 hover:no-underline"
        >
          <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/10 transition-all">
            <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white" />
          </div>
          <span className="text-gray-400 font-medium group-hover:text-white">
            Back to Admin
          </span>
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Mail className="w-8 h-8 text-indigo-400" />
          <h1 className="text-4xl font-black">Email Subscribers</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6">
            <p className="text-gray-400 text-sm font-bold mb-2">Total Confirmed</p>
            <p className="text-4xl font-black text-indigo-400">{subscribers?.length || 0}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6">
            <p className="text-gray-400 text-sm font-bold mb-2">Daily Digest</p>
            <p className="text-4xl font-black text-cyan-400">
              {subscribers?.filter((s: Subscriber) => s.frequency === "daily").length || 0}
            </p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6">
            <p className="text-gray-400 text-sm font-bold mb-2">Weekly Digest</p>
            <p className="text-4xl font-black text-purple-400">
              {subscribers?.filter((s: Subscriber) => s.frequency === "weekly").length || 0}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.03]">
                  <th className="px-6 py-4 text-left text-sm font-bold">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Frequency</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Categories</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {!subscribers || subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                      No confirmed subscribers yet
                    </td>
                  </tr>
                ) : (
                  subscribers.map((sub: Subscriber) => (
                    <tr key={sub.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                      <td className="px-6 py-4 font-mono text-sm">{sub.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          sub.frequency === "daily"
                            ? "bg-cyan-500/10 text-cyan-400"
                            : "bg-purple-500/10 text-purple-400"
                        }`}>
                          {sub.frequency?.charAt(0).toUpperCase() + sub.frequency?.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {sub.categories && sub.categories.length > 0
                          ? `${sub.categories.length} selected`
                          : "All"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
