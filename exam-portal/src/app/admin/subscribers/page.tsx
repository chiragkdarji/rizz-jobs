import { Metadata } from "next";
import { requireAdmin } from "@/lib/auth-helpers";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { Mail } from "lucide-react";

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
    <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <p className="text-[11px] font-black uppercase tracking-widest text-indigo-400 mb-1.5">Admin Panel</p>
          <h1 className="text-3xl font-black">Email Subscribers</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Total Confirmed</p>
            <p className="text-3xl font-black text-indigo-400">{subscribers?.length || 0}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Daily Digest</p>
            <p className="text-3xl font-black text-cyan-400">
              {subscribers?.filter((s: Subscriber) => s.frequency === "daily").length || 0}
            </p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Weekly Digest</p>
            <p className="text-3xl font-black text-purple-400">
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
                  <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Email</th>
                  <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Frequency</th>
                  <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Categories</th>
                  <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Joined</th>
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
  );
}
