"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Bell,
  Search,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// These will be configured by the user later
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface Notification {
  id: string;
  title: string;
  slug?: string;
  source: string;
  link: string;
  exam_date: string;
  deadline: string;
  ai_summary: string;
  direct_answer?: string;
  created_at: string;
  details?: {
    categories?: string[];
    [key: string]: unknown;
  };
}

export default function Home() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab] = useState("Engineering");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    async function fetchNotifications() {
      if (!SUPABASE_URL || !SUPABASE_KEY) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setNotifications(data);
      }
      setLoading(false);
    }

    fetchNotifications();
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr || dateStr === "TBA" || dateStr === "To be notified") return dateStr || "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  const filtered = notifications.filter(n => {
    // Search Filter
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.ai_summary.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    // Tab Filter
    if (activeTab === "Admit Cards") {
      return n.title.toLowerCase().includes("admit card") || n.ai_summary.toLowerCase().includes("admit card");
    }
    if (activeTab === "Results") {
      return n.title.toLowerCase().includes("result") || n.ai_summary.toLowerCase().includes("result");
    }

    if (activeTab !== "All") {
      // Fallback: If scraper hasn't run yet, some jobs might not have 'categories' in details.
      // We do a loose text match as a fallback if the categories array is missing.
      const hasCategoryTag = n.details?.categories?.includes(activeTab);
      if (hasCategoryTag) return true;

      // Fallback text matching for older notifications before this update
      const text = `${n.title} ${n.ai_summary}`.toLowerCase();
      if (activeTab === "10th / 12th Pass" && (text.includes("10th") || text.includes("12th") || text.includes("matric"))) return true;
      if (activeTab === "Banking" && (text.includes("bank") || text.includes("po ") || text.includes("clerk") || text.includes("ibps") || text.includes("sbi") || text.includes("rbi"))) return true;
      if (activeTab === "Railway" && (text.includes("railway") || text.includes("rrb") || text.includes("rrc"))) return true;
      if (activeTab === "Defense / Police" && (text.includes("police") || text.includes("defence") || text.includes("army") || text.includes("navy") || text.includes("air force") || text.includes("constable"))) return true;
      if (activeTab === "UPSC / SSC" && (text.includes("upsc") || text.includes("ssc ") || text.includes("staff selection"))) return true;
      if (activeTab === "Teaching" && (text.includes("teach") || text.includes("tet") || text.includes("professor") || text.includes("pgt") || text.includes("tgt"))) return true;

      if (activeTab === "Engineering" && (text.includes("engineer") || text.includes("b.tech") || text.includes("m.tech") || text.includes("gate ") || text.includes("diploma") || text.includes("ae ") || text.includes("je "))) return true;
    }

    return true; // "All" tab
  });

  // Reset to page 1 when search or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTab]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans selection:bg-indigo-500/30">
      {/* Background Glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>



      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-end justify-between gap-8"
          >
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-black uppercase tracking-widest mb-6 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                <Sparkles className="w-3.5 h-3.5 fill-cyan-400" />
                <span>100% Rizz. 0% Noise.</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[0.9] italic">
                Top <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-600 drop-shadow-[0_0_30px_rgba(99,102,241,0.3)] pr-3 pl-1" style={{ WebkitBoxDecorationBreak: "clone" }}>Engineering </span> Government Jobs.
              </h1>
              <p className="text-xl text-gray-400 leading-relaxed font-medium max-w-xl">
                B.Tech, M.Tech, and GATE opportunities. Build the nation&apos;s infrastructure.
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



        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {loading ? (
              // Skeleton screens
              [1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 rounded-3xl bg-white/[0.02] border border-white/5 animate-pulse" />
              ))
            ) : paginatedItems.length > 0 ? (
              paginatedItems.map((item) => (
                <article
                  key={item.id}
                  className="group relative bg-[#0d111c] border border-white/5 rounded-3xl p-6 hover:bg-[#111827] hover:border-white/10 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const text = `${item.title} ${item.ai_summary}`.toLowerCase();
                        if (text.includes("result")) {
                          return (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Result Out</span>
                            </div>
                          );
                        }
                        if (text.includes("admit card") || text.includes("call letter")) {
                          return (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.1)]">
                              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Admit Card</span>
                            </div>
                          );
                        }
                        return (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Apply Now</span>
                          </div>
                        );
                      })()}
                    </div>
                    <time className="text-xs text-gray-500 font-medium">
                      {formatDate(item.created_at)}
                    </time>
                  </div>

                  <Link href={`/exam/${item.slug || item.id}`} className="block">
                    <h2 className="text-xl font-black mb-3 group-hover:text-cyan-400 transition-colors leading-tight tracking-tight">
                      {item.title}
                    </h2>
                  </Link>

                  <p className="text-sm text-gray-400 font-light line-clamp-2 mb-4 leading-relaxed">
                    {item.ai_summary}
                  </p>

                  {/* Highlights Block */}
                  {item.direct_answer && (
                    <div className="mb-6 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Key Highlights</span>
                      </div>
                      <div className="text-xs text-gray-300 space-y-2 font-light">
                        {(() => {
                          let text = item.direct_answer;
                          // Handle stringified JSON from the scraper if it exists
                          if (text.startsWith('[') || text.startsWith('{')) {
                            try {
                              const parsed = JSON.parse(text);
                              text = Array.isArray(parsed) ? parsed.join('\n') : text;
                            } catch { /* fallback */ }
                          }

                          return text.split('\n').filter(Boolean).map((line: string, idx: number) => (
                            <div key={idx} className="flex gap-2">
                              <span className="text-indigo-500/50">•</span>
                              <p>{line.replace(/^\* /, '').replace(/^\["|"]$/g, '')}</p>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Exam Date</p>
                        <p className="text-xs font-semibold text-gray-300">{formatDate(item.exam_date)}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Apply By</p>
                        <p className="text-xs font-semibold text-pink-400">{formatDate(item.deadline)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        href={`/exam/${item.slug || item.id}`}
                        className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-xs font-black uppercase tracking-widest text-white hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-indigo-600/20"
                      >
                        View Intel
                      </Link>
                      <a
                        href={item.link && item.link.startsWith("http") ? item.link : `/exam/${item.slug || item.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:bg-white hover:text-gray-950 transition-all"
                      >
                        Official
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="col-span-full py-20 text-center">
                <div className="inline-flex p-4 rounded-full bg-white/5 mb-4">
                  <Bell className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-400">No updates found</h3>
                <p className="text-gray-500 max-w-xs mx-auto mt-2">Try adjusting your search or check back later for updates.</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Pagination Controls */}
        {!loading && filtered.length > ITEMS_PER_PAGE && (
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Results Counter */}
            <p className="text-sm text-gray-500 font-medium">
              Showing <span className="text-gray-300">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> –{" "}
              <span className="text-gray-300">{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span>{" "}
              of <span className="text-gray-300">{filtered.length}</span> results
            </p>

            {/* Page Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-gray-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>

              {getPageNumbers().map((page, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (typeof page === 'number') {
                      setCurrentPage(page);
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    }
                  }}
                  disabled={page === '...'}
                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${page === currentPage
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : page === '...'
                      ? 'text-gray-500 cursor-default'
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-gray-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>


    </div>
  );
}
