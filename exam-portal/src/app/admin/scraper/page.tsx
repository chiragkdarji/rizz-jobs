"use client";

import { useState } from "react";
import { Play, AlertCircle, RefreshCw, CheckCircle } from "lucide-react";

type ActionState = {
  running: boolean;
  error: string | null;
  success: string | null;
};

const idle: ActionState = { running: false, error: null, success: null };

export default function ScraperPage() {
  const [scrape, setScrape]   = useState<ActionState>(idle);
  const [refill, setRefill]   = useState<ActionState>(idle);
  const [refillLimit, setRefillLimit] = useState(30);

  const handleTrigger = async () => {
    setScrape({ running: true, error: null, success: null });
    try {
      const res  = await fetch("/api/admin/scraper/trigger", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setScrape({ running: false, error: data.error || "Failed to trigger scraper", success: null });
        return;
      }
      setScrape({ running: false, error: null, success: data.message || "Scraper triggered!" });
      setTimeout(() => setScrape(idle), 6000);
    } catch (err) {
      setScrape({ running: false, error: err instanceof Error ? err.message : "Error", success: null });
    }
  };

  const handleRefill = async () => {
    setRefill({ running: true, error: null, success: null });
    try {
      const res  = await fetch(`/api/admin/scraper/refill?limit=${refillLimit}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setRefill({ running: false, error: data.error || "Failed to trigger refill", success: null });
        return;
      }
      setRefill({ running: false, error: null, success: data.message || "Refill triggered!" });
      setTimeout(() => setRefill(idle), 8000);
    } catch (err) {
      setRefill({ running: false, error: err instanceof Error ? err.message : "Error", success: null });
    }
  };

  return (
    <main className="relative z-10 max-w-2xl mx-auto px-6 py-12">
      <p className="text-[11px] font-black uppercase tracking-widest text-indigo-400 mb-2">Admin Panel</p>
      <h1 className="text-3xl font-black mb-1">Scraper Tools</h1>
      <p className="text-gray-400 text-sm mb-8">
        Fetch new notifications or enrich existing ones with missing data
      </p>

      {/* ── Full Scrape ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6 mb-5 space-y-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-1">Full Scrape</p>
          <p className="text-sm text-gray-400">
            Fetches all sources, deep-researches each title with AI, validates URLs, and upserts to DB.
          </p>
        </div>

        <ol className="space-y-2">
          {[
            "Scrapes 9 sources (aggregators + direct gov portals)",
            "AI deep-researches each notification",
            "Validates every URL — fixes 404s via DuckDuckGo",
            "Upserts to database (smart-merge, never loses data)",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        {scrape.error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {scrape.error}
          </div>
        )}
        {scrape.success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {scrape.success}
          </div>
        )}

        <button
          onClick={handleTrigger}
          disabled={scrape.running || refill.running}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4" />
          {scrape.running ? "Triggering…" : "Run Full Scrape"}
        </button>
      </div>

      {/* ── Refill Mode ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-6 mb-5 space-y-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-1">Refill Old Notifications</p>
          <p className="text-sm text-gray-400">
            Re-researches existing DB notifications that are missing key fields — exam date, vacancies,
            eligibility, etc. Does <strong className="text-white">not</strong> scrape any websites;
            only enriches what&apos;s already in your database.
          </p>
        </div>

        <ol className="space-y-2">
          {[
            "Queries DB for notifications with null exam_date, deadline, or sparse details",
            "AI re-researches each one with the improved prompt",
            "Validates and fixes broken/aggregator URLs",
            "Smart-merges — only fills gaps, never overwrites good data",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        {/* Limit selector */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">
            Notifications to refill
          </label>
          <div className="flex gap-2">
            {[10, 30, 50, 100].map((n) => (
              <button
                key={n}
                onClick={() => setRefillLimit(n)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  refillLimit === n
                    ? "bg-cyan-600 text-white border border-cyan-500"
                    : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {refill.error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {refill.error}
          </div>
        )}
        {refill.success && (
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {refill.success}
          </div>
        )}

        <button
          onClick={handleRefill}
          disabled={refill.running || scrape.running}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${refill.running ? "animate-spin" : ""}`} />
          {refill.running ? "Triggering…" : `Refill ${refillLimit} Notifications`}
        </button>
      </div>

      {/* ── Warning ───────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
        <p className="font-bold mb-1">Note</p>
        <p>
          Both actions run asynchronously on the scraper server and may take several minutes.
          Check <a href="/admin/scraper-logs" className="underline hover:text-amber-200">Scraper Logs</a> for progress.
        </p>
      </div>
    </main>
  );
}
