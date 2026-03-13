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
  );
}
