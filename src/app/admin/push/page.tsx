"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";

export default function PushAdminPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSend = async () => {
    if (!title || !body) {
      setError("Title and body are required");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/admin/push/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setTitle("");
      setBody("");
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
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

        <h1 className="text-4xl font-black mb-2">Push Notifications</h1>
        <p className="text-gray-400 mb-8">
          Broadcast notifications to all subscribed users
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            ✓ Push notification broadcast sent successfully!
          </div>
        )}

        {/* Form */}
        <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-bold mb-2">Title *</label>
              <input
                type="text"
                placeholder="e.g., New UPSC Notification"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLoading}
                maxLength={100}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-indigo-500/50 focus:outline-none transition-colors disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1">{title.length}/100</p>
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-bold mb-2">Message *</label>
              <textarea
                placeholder="e.g., Check your email for the latest job updates..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={isLoading}
                rows={4}
                maxLength={250}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-indigo-500/50 focus:outline-none transition-colors disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1">{body.length}/250</p>
            </div>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={isLoading || !title || !body}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              {isLoading ? "Sending..." : "Send to All Users"}
            </button>

            {/* Info */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <p className="text-sm text-gray-300">
                <strong>Note:</strong> Push notifications will be sent to all users who have
                enabled browser notifications. This is an asynchronous operation and may take a
                few moments to complete.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
