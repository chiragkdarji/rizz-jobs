"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Mail, Zap } from "lucide-react";

const CATEGORIES = [
  "10th / 12th Pass",
  "Banking",
  "Railway",
  "Defense / Police",
  "UPSC / SSC",
  "Teaching",
  "Engineering",
  "Medical",
  "PSU",
  "State Jobs",
];

function SubscribeForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleToggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          categories:
            selectedCategories.length > 0 ? selectedCategories : undefined,
          frequency,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to subscribe");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setEmail("");
      setSelectedCategories([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  // Show success state
  if (success) {
    return (
      <div className="min-h-screen bg-[#030712] text-white font-sans selection:bg-indigo-500/30 flex flex-col">
        {/* Background Glow */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        </div>

        <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md rounded-3xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8 text-center">
            <div className="flex justify-center mb-6">
              <Mail className="w-16 h-16 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-black mb-4">Check Your Email</h1>
            <p className="text-gray-400 mb-8">
              We&apos;ve sent a confirmation link to <strong>{email}</strong>. Click
              it to confirm your subscription and start getting alerts!
            </p>
            <Link
              href="/"
              className="inline-block py-2 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Show form
  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans selection:bg-indigo-500/30 flex flex-col">
      {/* Background Glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {/* Card */}
          <div className="rounded-3xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8 md:p-12">
            <div className="flex items-center gap-3 mb-8">
              <Zap className="w-8 h-8 text-indigo-400" />
              <div>
                <h1 className="text-4xl font-black">Get Job Alerts</h1>
                <p className="text-gray-400 mt-2">
                  Never miss a government job notification
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {searchParams?.get("subscribed") && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                ✓ Successfully subscribed! Check your email for updates.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-bold mb-2">
                  Email Address *
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-indigo-500/50 focus:outline-none transition-colors disabled:opacity-50"
                />
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-bold mb-3">
                  Email Frequency *
                </label>
                <div className="flex gap-3">
                  {(["daily", "weekly"] as const).map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setFrequency(freq)}
                      className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
                        frequency === freq
                          ? "bg-indigo-600 text-white border border-indigo-500"
                          : "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div>
                <label className="block text-sm font-bold mb-3">
                  Interested Categories (Optional)
                </label>
                <p className="text-gray-400 text-xs mb-3">
                  Leave empty to get alerts for all categories
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleToggleCategory(category)}
                      className={`px-3 py-2 rounded-lg text-sm font-bold transition-all text-left ${
                        selectedCategories.includes(category)
                          ? "bg-indigo-600 text-white border border-indigo-500"
                          : "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Subscribing..." : "Subscribe to Alerts"}
              </button>

              <p className="text-xs text-gray-500 text-center">
                We&apos;ll send you a confirmation email. You can unsubscribe anytime.
              </p>
            </form>

            {/* Benefits */}
            <div className="mt-8 pt-8 border-t border-white/10">
              <h3 className="font-bold mb-4">What you&apos;ll get:</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>✓ Job alerts delivered to your inbox</li>
                <li>✓ Filtered by your interests</li>
                <li>✓ No spam, no extra emails</li>
                <li>✓ Unsubscribe anytime</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030712]" />}>
      <SubscribeForm />
    </Suspense>
  );
}
