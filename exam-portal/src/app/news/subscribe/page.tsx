"use client";

import { useState } from "react";
import Link from "next/link";

const TOPICS = [
  { id: "finance",  label: "Finance",  color: "#3b82f6", desc: "RBI, banking, mutual funds" },
  { id: "business", label: "Business", color: "#a855f7", desc: "Earnings, M&A, corporate" },
  { id: "markets",  label: "Markets",  color: "#22c55e", desc: "Nifty, Sensex, IPOs" },
  { id: "economy",  label: "Economy",  color: "#f59e0b", desc: "GDP, inflation, policy" },
  { id: "startups", label: "Startups", color: "#f43f5e", desc: "Funding, unicorns, VC" },
];

export default function NewsSubscribePage() {
  const [email, setEmail]       = useState("");
  const [topics, setTopics]     = useState<string[]>([]);
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  const toggleTopic = (id: string) =>
    setTopics((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/news-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, topics, frequency }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to subscribe"); setLoading(false); return; }
      setSuccess(true);
    } catch {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  // ── Success ───────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={{ backgroundColor: "#070708", minHeight: "100vh" }} className="flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] mb-4" style={{ color: "#f0a500" }}>
            Financial Intelligence
          </p>
          <div
            className="w-16 h-16 mx-auto mb-6 flex items-center justify-center"
            style={{ border: "2px solid #f0a500" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f0a500" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1
            className="text-[clamp(1.5rem,4vw,2.2rem)] text-[#f2ede6] mb-3"
            style={{ fontFamily: "'DM Serif Display', 'Georgia', serif", fontWeight: 400 }}
          >
            Check your inbox
          </h1>
          <p className="text-[#52505e] text-[13px] leading-relaxed mb-8">
            We&apos;ve sent a confirmation link to <span style={{ color: "#f2ede6" }}>{email}</span>.
            Click it to activate your briefing.
          </p>
          <Link
            href="/news"
            className="text-[10px] font-black uppercase tracking-[0.18em] px-6 py-3 transition-opacity hover:opacity-80 inline-block"
            style={{ backgroundColor: "#f0a500", color: "#070708" }}
          >
            ← Back to News
          </Link>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ backgroundColor: "#070708", minHeight: "100vh" }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">

        {/* Header */}
        <div className="mb-10">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] mb-3" style={{ color: "#f0a500" }}>
            Financial Intelligence
          </p>
          <h1
            className="text-[clamp(2rem,5vw,3.2rem)] text-[#f2ede6] leading-[1.1] mb-4"
            style={{ fontFamily: "'DM Serif Display', 'Georgia', serif", fontWeight: 400 }}
          >
            India&apos;s financial news,<br />delivered daily.
          </h1>
          <p className="text-[#52505e] text-[14px] leading-relaxed max-w-lg">
            Finance, markets, economy and startup stories curated for the Indian professional.
            No noise. No spam. Unsubscribe anytime.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-[9px] font-black uppercase tracking-[0.22em] mb-3"
              style={{ color: "#3a3848" }}
            >
              Your Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              className="w-full px-4 py-3 text-[13px] focus:outline-none disabled:opacity-50"
              style={{
                backgroundColor: "#0d0d10",
                border: "1px solid #1e1e24",
                color: "#f2ede6",
              }}
            />
          </div>

          {/* Topics */}
          <div>
            <label className="block text-[9px] font-black uppercase tracking-[0.22em] mb-1" style={{ color: "#3a3848" }}>
              Topics
            </label>
            <p className="text-[10px] mb-4" style={{ color: "#3a3848" }}>
              Leave all unselected to receive all categories
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TOPICS.map((t) => {
                const active = topics.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTopic(t.id)}
                    className="flex items-center gap-3 px-4 py-3 text-left transition-colors"
                    style={{
                      backgroundColor: active ? `${t.color}18` : "#0d0d10",
                      border: `1px solid ${active ? t.color : "#1e1e24"}`,
                    }}
                  >
                    <span
                      className="w-2 h-2 shrink-0 rounded-full"
                      style={{ backgroundColor: active ? t.color : "#3a3848" }}
                    />
                    <div>
                      <p
                        className="text-[11px] font-black uppercase tracking-[0.12em]"
                        style={{ color: active ? "#f2ede6" : "#52505e" }}
                      >
                        {t.label}
                      </p>
                      <p className="text-[10px]" style={{ color: "#3a3848" }}>{t.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-[9px] font-black uppercase tracking-[0.22em] mb-3" style={{ color: "#3a3848" }}>
              Frequency
            </label>
            <div className="flex gap-2">
              {(["daily", "weekly"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className="flex-1 py-3 text-[10px] font-black uppercase tracking-[0.16em] transition-colors"
                  style={{
                    backgroundColor: frequency === f ? "#f0a500" : "#0d0d10",
                    border: `1px solid ${frequency === f ? "#f0a500" : "#1e1e24"}`,
                    color: frequency === f ? "#070708" : "#52505e",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-[12px] px-4 py-3" style={{ backgroundColor: "#f43f5e18", border: "1px solid #f43f5e44", color: "#f43f5e" }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email}
            className="w-full py-4 text-[10px] font-black uppercase tracking-[0.22em] transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#f0a500", color: "#070708" }}
          >
            {loading ? "Subscribing..." : "Subscribe to Financial Intelligence →"}
          </button>

          <p className="text-center text-[10px]" style={{ color: "#3a3848" }}>
            Free forever. No spam. Unsubscribe anytime.
          </p>
        </form>
      </div>
    </div>
  );
}
