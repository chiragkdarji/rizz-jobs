"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Search, LogOut, User, ShieldCheck, Settings } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

export default function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY);

  const handleSignOut = async () => {
    setShowUserMenu(false);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      setIsLoading(false);
      return;
    }

    // Subscribe to auth state changes so header updates on login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // Also get the initial session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

          <form action="/" method="get" className="max-w-xs mx-4 hidden sm:block">
            <div className="relative group">
              <input
                type="text"
                name="q"
                placeholder="Search exams..."
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all border-transparent focus:border-white/20"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
            </div>
          </form>

          <div className="flex items-center gap-4">
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
                      <div className="absolute right-0 mt-3 w-52 bg-[#0d111c] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm text-gray-300 hover:text-white transition-colors border-b border-white/5"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <User className="w-4 h-4" />
                          Dashboard
                        </Link>
                        <Link
                          href="/dashboard/settings"
                          className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm text-gray-300 hover:text-white transition-colors border-b border-white/5"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </Link>
                        {ADMIN_EMAIL && user?.email === ADMIN_EMAIL && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-500/10 text-sm text-indigo-400 hover:text-indigo-300 transition-colors border-b border-white/5"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <ShieldCheck className="w-4 h-4" />
                            Admin Dashboard
                          </Link>
                        )}
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm text-gray-300 hover:text-white transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
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
