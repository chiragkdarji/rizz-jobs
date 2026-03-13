"use client";

import { useState } from "react";
import { Send, Clock } from "lucide-react";

interface DigestResult {
  message: string;
  sent?: number;
  notificationCount?: number;
  totalNotifications?: number;
  subscribersPreview?: Array<{ email: string }>;
  notificationPreview?: Array<{ id: string; title: string }>;
}

export default function DigestAdminPage() {
  const [digestType, setDigestType] = useState<"daily" | "weekly">("daily");
  const [isLoading, setIsLoading] = useState(false);
  const [isDryRun, setIsDryRun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<DigestResult | null>(null);

  // TODO: Implement digest history fetching in future phase
  // useEffect(() => {
  //   // In a real app, you'd fetch digest history here
  // }, []);

  const handleSend = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setResult(null);

    try {
      const res = await fetch("/api/admin/digest/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: digestType,
          dryRun: isDryRun,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send digest");
        setIsLoading(false);
        return;
      }

      setResult(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Clock className="w-8 h-8 text-indigo-400" />
          <h1 className="text-4xl font-black">Email Digest</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            ✓ {isDryRun ? "Dry run completed" : "Digest sent successfully"}!
          </div>
        )}

        {/* Main Card */}
        <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Send Digest</h2>

          <div className="space-y-6">
            {/* Digest Type */}
            <div>
              <label className="block text-sm font-bold mb-3">Digest Type</label>
              <div className="flex gap-3">
                {(["daily", "weekly"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setDigestType(type)}
                    disabled={isLoading}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
                      digestType === type
                        ? "bg-indigo-600 text-white border border-indigo-500"
                        : "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10"
                    } disabled:opacity-50`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Dry Run Checkbox */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="dryRun"
                checked={isDryRun}
                onChange={(e) => setIsDryRun(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 rounded bg-white/5 border border-white/10 cursor-pointer"
              />
              <label htmlFor="dryRun" className="text-sm font-bold cursor-pointer">
                Dry Run (Preview only, don&apos;t send)
              </label>
            </div>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              {isLoading
                ? "Processing..."
                : isDryRun
                  ? "Preview Digest"
                  : "Send Digest"}
            </button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-8">
            <h3 className="text-xl font-bold mb-4">Result</h3>
            <div className="space-y-3 text-sm text-gray-300">
              {isDryRun ? (
                <>
                  <p>
                    <span className="text-gray-500">Message:</span> {result.message}
                  </p>
                  <p>
                    <span className="text-gray-500">Total Notifications:</span>{" "}
                    {result.totalNotifications}
                  </p>
                  <p>
                    <span className="text-gray-500">Would send to:</span>{" "}
                    {result.subscribersPreview?.length} subscribers (+ more)
                  </p>
                  {result.notificationPreview && (
                    <div className="mt-4 p-3 rounded bg-white/5 border border-white/10">
                      <p className="font-bold mb-2">Preview Notifications:</p>
                      <ul className="space-y-1 text-xs">
                        {result.notificationPreview.map((n: { id: string; title: string }) => (
                          <li key={n.id} className="truncate">
                            • {n.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p>
                    <span className="text-gray-500">Status:</span> {result.message}
                  </p>
                  <p>
                    <span className="text-gray-500">Sent to:</span> {result.sent}{" "}
                    subscribers
                  </p>
                  <p>
                    <span className="text-gray-500">Notifications:</span>{" "}
                    {result.notificationCount} new jobs
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-8 rounded-2xl bg-white/[0.03] border border-white/5 p-8">
          <h3 className="text-xl font-bold mb-4">About Email Digests</h3>
          <div className="space-y-4 text-sm text-gray-300">
            <p>
              <strong className="text-indigo-400">Daily Digest:</strong> Sent at 9 AM UTC
              every day to subscribers who chose daily emails.
            </p>
            <p>
              <strong className="text-indigo-400">Weekly Digest:</strong> Sent at 9 AM UTC
              every Monday to subscribers who chose weekly emails.
            </p>
            <p>
              <strong className="text-indigo-400">Scheduling:</strong> Automatically runs via
              Vercel Cron. Configuration is in <code className="bg-white/5 px-2 py-1 rounded">vercel.json</code>.
            </p>
            <p>
              <strong className="text-indigo-400">Dry Run:</strong> Preview what would be sent
              without actually sending emails (helpful for testing).
            </p>
          </div>
        </div>
    </main>
  );
}
