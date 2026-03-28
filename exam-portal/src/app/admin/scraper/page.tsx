"use client";

import { useState } from "react";
import { Play, AlertCircle } from "lucide-react";

export default function ScraperPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleTrigger = async () => {
    setIsRunning(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/admin/scraper/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to trigger scraper");
        setIsRunning(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <main className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <p className="text-[11px] font-black uppercase tracking-widest text-indigo-400 mb-2">Admin Panel</p>
        <h1 className="text-3xl font-black mb-1">Trigger Scraper</h1>
        <p className="text-gray-400 text-sm mb-8">
          Manually run the job notification scraper to fetch latest updates
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            ✓ Scraper triggered successfully! Check back soon for updates.
          </div>
        )}

        {/* Main Card */}
        <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8">
          <div className="space-y-8">
            {/* Info */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-3">How it works</p>
              <ol className="space-y-2.5">
                {[
                  "Fetches latest job notifications from configured sources",
                  "Processes with AI to extract key information",
                  "Uploads to database with deduplication",
                  "Returns immediately (runs asynchronously)",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* Config */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-3">Configuration required</p>
              <ul className="space-y-2">
                {[
                  "SCRAPER_WEBHOOK_URL",
                  "SCRAPER_WEBHOOK_SECRET",
                ].map((env) => (
                  <li key={env} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <code className="bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-lg text-xs font-mono text-gray-300">{env}</code>
                  </li>
                ))}
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Scraper running on external server (not Vercel)
                </li>
              </ul>
            </div>

            {/* CTA */}
            <button
              onClick={handleTrigger}
              disabled={isRunning}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5" />
              {isRunning ? "Triggering..." : "Trigger Scraper Now"}
            </button>

            {/* Warning */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
              <p className="font-bold mb-1">⚠️ Note:</p>
              <p>
                This sends a webhook request to the configured scraper server. Make sure your
                scraper is running and accessible.
              </p>
            </div>
          </div>
        </div>
    </main>
  );
}
