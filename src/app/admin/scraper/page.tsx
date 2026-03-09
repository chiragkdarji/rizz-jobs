"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Play, AlertCircle } from "lucide-react";

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
    <div className="min-h-screen bg-[#030712] text-white font-sans selection:bg-indigo-500/30">
      {/* Background Glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-12">
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

        <h1 className="text-4xl font-black mb-2">Trigger Scraper</h1>
        <p className="text-gray-400 mb-8">
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
              <h2 className="text-xl font-bold mb-4">How it works:</h2>
              <ol className="space-y-3 text-gray-300 text-sm">
                <li>
                  <span className="font-bold text-indigo-400">1.</span> Fetches latest job
                  notifications from configured sources
                </li>
                <li>
                  <span className="font-bold text-indigo-400">2.</span> Processes with AI to
                  extract key information
                </li>
                <li>
                  <span className="font-bold text-indigo-400">3.</span> Uploads to database
                  with deduplication
                </li>
                <li>
                  <span className="font-bold text-indigo-400">4.</span> Returns immediately
                  (runs asynchronously)
                </li>
              </ol>
            </div>

            {/* Config */}
            <div>
              <h2 className="text-xl font-bold mb-4">Configuration required:</h2>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>✓ <code className="bg-white/5 px-2 py-1 rounded">SCRAPER_WEBHOOK_URL</code></li>
                <li>✓ <code className="bg-white/5 px-2 py-1 rounded">SCRAPER_WEBHOOK_SECRET</code></li>
                <li>✓ Scraper running on external server (not Vercel)</li>
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
    </div>
  );
}
