"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Bell,
  Search,
  Calendar,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Zap,
  Globe,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StructuredData from "@/components/StructuredData";

// These will be configured by the user later
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface Notification {
  id: string;
  title: string;
  source: string;
  link: string;
  exam_date: string;
  deadline: string;
  ai_summary: string;
  direct_answer?: string;
  created_at: string;
}

export default function Home() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchNotifications() {
      if (!SUPABASE_URL || !SUPABASE_KEY) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .table("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setNotifications(data);
      }
      setLoading(false);
    }

    fetchNotifications();
  }, []);

  const filtered = notifications.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.source.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans selection:bg-indigo-500/30">
      {/* Background Glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-white/5 bg-gray-950/20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                GovExam.ai
              </p>
              <p className="text-[10px] text-indigo-400 uppercase tracking-[0.2em] font-semibold">
                Autonomous Updates
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Latest Exams</a>
            <a href="#" className="hover:text-white transition-colors">Deadlines</a>
            <a href="#" className="hover:text-white transition-colors">Resources</a>
          </nav>

          <button className="relative p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all group" aria-label="Notifications">
            <Bell className="w-5 h-5 text-gray-300 group-hover:text-white" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-gray-950" />
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-end justify-between gap-8"
          >
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
                <Sparkles className="w-3 h-3" />
                <span>100% Automated Intelligence</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
                Real-time <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Government Exam</span> Alerts.
              </h1>
              <p className="text-lg text-gray-400 leading-relaxed font-light">
                Never miss an update. Our AI agents monitor hundreds of official portals 24/7, providing you with verified, structured, and instant notifications.
              </p>
            </div>

            <div className="relative w-full md:w-96">
              <label htmlFor="search-exams" className="sr-only">Search exams</label>
              <input
                id="search-exams"
                type="text"
                placeholder="Search UPSC, SSC, Bank exams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            </div>
          </motion.div>
        </section>

        {/* Content Tabs */}
        <div className="flex items-center gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {["All Updates", "Application Open", "Exam Dates", "Results"].map((tab, i) => (
            <button key={tab} className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${i === 0 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10"
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {loading ? (
              // Skeleton screens
              [1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 rounded-3xl bg-white/[0.02] border border-white/5 animate-pulse" />
              ))
            ) : filtered.length > 0 ? (
              filtered.map((item, i) => (
                <article
                  key={item.id}
                  className="group relative bg-[#0d111c] border border-white/5 rounded-3xl p-6 hover:bg-[#111827] hover:border-white/10 transition-all duration-300"
                >
                  <StructuredData data={item} />
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/10">
                      <Globe className="w-3 h-3 text-indigo-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{item.source}</span>
                    </div>
                    <time className="text-xs text-gray-500 font-medium">
                      {new Date(item.created_at).toLocaleDateString()}
                    </time>
                  </div>

                  <h2 className="text-lg font-bold mb-3 group-hover:text-indigo-400 transition-colors leading-snug">
                    {item.title}
                  </h2>

                  <p className="text-sm text-gray-400 font-light line-clamp-2 mb-4 leading-relaxed">
                    {item.ai_summary}
                  </p>

                  {/* AEO Block: Direct Answer for Search Engines */}
                  {item.direct_answer && (
                    <div className="mb-6 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Quick Info (AEO)</span>
                      </div>
                      <div className="text-xs text-gray-300 space-y-1 font-light italic">
                        {item.direct_answer.split('\n').map((line, idx) => (
                          <p key={idx}>{line}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                      <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Exam Date</p>
                      <p className="text-xs font-semibold text-gray-300">{item.exam_date || "To be notified"}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                      <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Apply By</p>
                      <p className="text-xs font-semibold text-pink-400">{item.deadline || "TBA"}</p>
                    </div>
                  </div>

                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 h-12 rounded-2xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white text-gray-300 hover:text-gray-950 transition-all"
                  >
                    View Official Notice
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </article>
              ))
            ) : (
              <div className="col-span-full py-20 text-center">
                <div className="inline-flex p-4 rounded-full bg-white/5 mb-4">
                  <Bell className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-400">No updates found</h3>
                <p className="text-gray-500 max-w-xs mx-auto mt-2">Try adjusting your search or check back later for automated updates.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm text-gray-500">
            © 2026 GovExam.ai • Built for 100% Automation & SEO/AEO Excellence
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">Telegram Alerts</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
