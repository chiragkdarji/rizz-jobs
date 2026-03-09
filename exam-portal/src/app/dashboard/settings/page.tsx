"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

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

interface Profile {
  id: string;
  email: string;
  display_name: string;
  followed_categories: string[];
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [followedCategories, setFollowedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/user/profile");
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        setProfile(data);
        setDisplayName(data.display_name || "");
        setFollowedCategories(data.followed_categories || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, []);

  const handleToggleCategory = (category: string) => {
    setFollowedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          followed_categories: followedCategories,
        }),
      });

      if (!res.ok) throw new Error("Failed to update profile");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

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
          href="/dashboard"
          className="flex items-center gap-3 group mb-8 hover:no-underline"
        >
          <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/10 transition-all">
            <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white" />
          </div>
          <span className="text-gray-400 font-medium group-hover:text-white">
            Back to Dashboard
          </span>
        </Link>

        <h1 className="text-4xl font-black mb-2">Settings</h1>
        <p className="text-gray-400 mb-8">Manage your profile and preferences</p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            Settings saved successfully!
          </div>
        )}

        {profile && (
          <div className="space-y-8">
            {/* Profile Section */}
            <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8">
              <h2 className="text-2xl font-bold mb-6">Profile</h2>

              <div className="space-y-4">
                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-bold mb-2">Email</label>
                  <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300">
                    {profile.email}
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-indigo-500/50 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Categories Section */}
            <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8">
              <h2 className="text-2xl font-bold mb-6">Followed Categories</h2>
              <p className="text-gray-400 text-sm mb-6">
                Select the job categories you&apos;re interested in. We&apos;ll use this
                to personalize your alerts.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleToggleCategory(category)}
                    className={`px-4 py-3 rounded-lg font-bold transition-all text-left ${
                      followedCategories.includes(category)
                        ? "bg-indigo-600 text-white border border-indigo-500"
                        : "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
