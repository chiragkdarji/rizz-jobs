"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Bell, Search, LogOut, User } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export default function Header() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [notifications, setNotifications] = useState<any[]>([]);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY);

  useEffect(() => {
    async function fetchUserAndNotifications() {
      if (!SUPABASE_URL || !SUPABASE_KEY) {
        setIsLoading(false);
        return;
      }

      try {
        // Get current user
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        setUser(currentUser);

        // Fetch recent notifications
        const { data, error } = await supabase
          .from("notifications")
          .select("id, title, slug, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

        if (!error && data) {
          setNotifications(data);
        }
      } catch {
        // Silently handle errors
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserAndNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-[#030712] text-white font-sans">
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-white/5 bg-gray-950/20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 relative group overflow-hidden group-hover:scale-105 transition-transform">
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Sparkles className="w-6 h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            </div>
            <div>
              <p className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent italic group-hover:from-white group-hover:to-white transition-all">
                Rizz Jobs
              </p>
              <p className="text-[9px] text-cyan-400 uppercase tracking-[0.3em] font-black -mt-1 hidden sm:block">
                Elite Career Intelligence
              </p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-400">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/admit-cards" className="hover:text-white transition-colors">Admit Cards</Link>
            <Link href="/results" className="hover:text-white transition-colors">Results</Link>
            <Link href="/state-jobs" className="hover:text-white transition-colors">State Jobs</Link>
          </nav>

          <div className="max-w-xs mx-4 hidden sm:block">
            <div className="relative group">
              <input
                type="text"
                placeholder="Search exams..."
                onChange={(e) => {
                  window.dispatchEvent(new CustomEvent("globalSearch", { detail: e.target.value }));
                }}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all border-transparent focus:border-white/20"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-gray-300 group-hover:text-white" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-gray-950" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-[#0d111c] border border-white/10 rounded-2xl p-4 shadow-2xl z-50">
                  <h3 className="text-sm font-bold mb-3 text-white">Recent Notifications</h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto w-full">
                    {notifications.map(n => (
                      <Link key={n.id} href={`/exam/${n.slug || n.id}`} className="block text-xs p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 cursor-pointer" onClick={() => setShowNotifications(false)}>
                        <p className="text-gray-200 line-clamp-1">{n.title}</p>
                        <p className="text-gray-500 mt-1">{formatDate(n.created_at)}</p>
                      </Link>
                    ))}
                    {notifications.length === 0 && (
                      <p className="text-xs text-gray-500">No recent notifications</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Auth Menu */}
            {!isLoading && (
              <div className="relative">
                {user ? (
                  <>
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                      aria-label="User menu"
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                        {user.email ? user.email[0].toUpperCase() : "U"}
                      </div>
                    </button>

                    {showUserMenu && (
                      <div className="absolute right-0 mt-3 w-48 bg-[#0d111c] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm text-gray-300 hover:text-white transition-colors border-b border-white/5"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <User className="w-4 h-4" />
                          Dashboard
                        </Link>
                        <form
                          action="/api/auth/signout"
                          method="POST"
                          onSubmit={() => setShowUserMenu(false)}
                        >
                          <button
                            type="submit"
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm text-gray-300 hover:text-white transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </form>
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href="/auth/login"
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
