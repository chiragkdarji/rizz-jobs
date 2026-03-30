"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Sparkles, Search, LogOut, User, ShieldCheck, Settings, Menu, X } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/news", label: "News" },
  { href: "/admit-cards", label: "Admit Cards" },
  { href: "/results", label: "Results" },
  { href: "/state-jobs", label: "State Jobs" },
];

const MOBILE_CATEGORIES = [
  { name: "All Jobs", path: "/" },
  { name: "Finance News", path: "/news/finance" },
  { name: "Business News", path: "/news/business" },
  { name: "Banking", path: "/banking" },
  { name: "Railway", path: "/railway" },
  { name: "UPSC / SSC", path: "/upsc-ssc" },
  { name: "Defense", path: "/defense-police" },
  { name: "Teaching", path: "/teaching" },
  { name: "Engineering", path: "/engineering" },
  { name: "Medical", path: "/medical" },
  { name: "10th / 12th", path: "/10th-12th-pass" },
  { name: "PSU", path: "/psu" },
];

export default function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY);

  const handleSignOut = async () => {
    setShowUserMenu(false);
    setShowMobileMenu(false);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      setIsLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showMobileMenu]);

  return (
    <div className="bg-[#030712] text-white font-sans">
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-white/5 bg-gray-950/20">
        <div className="max-w-7xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group shrink-0" onClick={() => setShowMobileMenu(false)}>
            <div className="w-9 h-9 md:w-11 md:h-11 bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 relative overflow-hidden group-hover:scale-105 transition-transform">
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            </div>
            <div>
              <span className="block text-xl md:text-2xl font-black tracking-tighter text-white italic">
                Rizz Jobs
              </span>
              <span className="block text-[9px] text-cyan-400 uppercase tracking-[0.3em] font-black -mt-1 hidden sm:block">
                Elite Career Intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-400">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-white transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Search */}
          <form action="/" method="get" className="flex-1 max-w-xs hidden sm:block">
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

          <div className="flex items-center gap-2 md:gap-4">
            {/* Auth Menu — Desktop */}
            {!isLoading && (
              <div
                className="relative"
                onMouseEnter={() => {
                  if (closeTimer.current) clearTimeout(closeTimer.current);
                  setShowUserMenu(true);
                }}
                onMouseLeave={() => {
                  closeTimer.current = setTimeout(() => setShowUserMenu(false), 120);
                }}
              >
                {user ? (
                  <>
                    <button
                      className="flex items-center gap-2 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
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
                    className="hidden sm:block px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setShowMobileMenu((v) => !v)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              aria-label={showMobileMenu ? "Close menu" : "Open menu"}
            >
              {showMobileMenu ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Menu className="w-5 h-5 text-gray-300" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        className={`fixed top-16 left-0 right-0 z-40 lg:hidden bg-[#080d18] border-b border-white/10 shadow-2xl transition-all duration-300 ease-out overflow-hidden ${
          showMobileMenu ? "max-h-[calc(100vh-4rem)] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        }`}
      >
        <div className="px-6 py-5 space-y-6">
          {/* Mobile Search */}
          <form action="/" method="get" onSubmit={() => setShowMobileMenu(false)}>
            <div className="relative">
              <input
                type="text"
                name="q"
                placeholder="Search government exams..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            </div>
          </form>

          {/* Mobile Nav Links */}
          <div>
            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-3">Navigate</p>
            <div className="space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile Categories */}
          <div>
            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-3">Categories</p>
            <div className="grid grid-cols-2 gap-2">
              {MOBILE_CATEGORIES.map((cat) => (
                <Link
                  key={cat.path}
                  href={cat.path}
                  onClick={() => setShowMobileMenu(false)}
                  className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/8 hover:border-indigo-500/20 transition-colors text-center"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile Auth */}
          {!isLoading && (
            <div className="pt-2 border-t border-white/5">
              {user ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {user.email ? user.email[0].toUpperCase() : "U"}
                    </div>
                    <span className="text-sm text-gray-400 truncate">{user.email}</span>
                  </div>
                  <Link href="/dashboard" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                    <User className="w-4 h-4" /> Dashboard
                  </Link>
                  <Link href="/dashboard/settings" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                    <Settings className="w-4 h-4" /> Settings
                  </Link>
                  <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center justify-center w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
