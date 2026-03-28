"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Bell, BellOff, Check } from "lucide-react";

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
}

interface Subscription {
  id: string;
  frequency: "daily" | "weekly";
  categories: string[];
  confirmed: boolean;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Subscription state
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subFrequency, setSubFrequency] = useState<"daily" | "weekly">("daily");
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [isSubSaving, setIsSubSaving] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const [subSuccess, setSubSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, subRes] = await Promise.all([
          fetch("/api/user/profile"),
          fetch("/api/user/subscription"),
        ]);

        if (!profileRes.ok) throw new Error("Failed to fetch profile");
        const profileData = await profileRes.json();
        setProfile(profileData);
        setDisplayName(profileData.display_name || "");

        if (subRes.ok) {
          const subData = await subRes.json();
          if (subData.subscription) {
            setSubscription(subData.subscription);
            setSubFrequency(subData.subscription.frequency || "daily");
            setSubCategories(subData.subscription.categories || []);
          }
        }
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName }),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSubCategory = (category: string) => {
    setSubCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleSubscribe = async () => {
    setIsSubSaving(true);
    setSubError(null);
    setSubSuccess(null);
    try {
      const res = await fetch("/api/user/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequency: subFrequency, categories: subCategories }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to save");
      }
      setSubscription({ id: "", frequency: subFrequency, categories: subCategories, confirmed: true });
      setSubSuccess(subscription ? "Subscription updated!" : "Subscribed! You'll receive job alerts.");
      setTimeout(() => setSubSuccess(null), 4000);
    } catch (err) {
      setSubError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSubSaving(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsSubSaving(true);
    setSubError(null);
    setSubSuccess(null);
    try {
      const res = await fetch("/api/user/subscription", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to unsubscribe");
      setSubscription(null);
      setSubSuccess("Unsubscribed. You won't receive any more digest emails.");
      setTimeout(() => setSubSuccess(null), 4000);
    } catch (err) {
      setSubError(err instanceof Error ? err.message : "Failed to unsubscribe");
    } finally {
      setIsSubSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center">
        <p className="text-gray-400">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans selection:bg-indigo-500/30">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-12">
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

        <h1 className="text-3xl font-black mb-1">Settings</h1>
        <p className="text-gray-400 text-sm mb-8">Manage your profile and preferences</p>

        {profile && (
          <div className="space-y-8">
            {/* Profile Section */}
            <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8">
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-5">Profile</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Email</label>
                  <div className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-gray-400 text-sm">
                    {profile.email}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-gray-500 focus:border-indigo-500/50 focus:outline-none transition-colors text-sm"
                  />
                </div>
              </div>
              <div className="mt-6 space-y-3">
              {profileError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {profileError}
                </div>
              )}
              {profileSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                  <Check className="w-4 h-4" /> Saved!
                </div>
              )}
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex items-center gap-2 py-2 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save Profile"}
              </button>
              </div>
            </div>

            {/* Email Alerts Section */}
            <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 p-8">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-indigo-400" />
                  Email Job Alerts
                </p>
                {subscription ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/5 text-gray-400 border border-white/10">
                    Not subscribed
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm mb-6">
                Receive new government job alerts to{" "}
                <span className="text-white font-medium">{profile.email}</span>
              </p>

              {subError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {subError}
                </div>
              )}
              {subSuccess && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                  <Check className="w-4 h-4" /> {subSuccess}
                </div>
              )}

              {/* Frequency */}
              <div className="mb-6">
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3">Frequency</label>
                <div className="flex gap-3">
                  {(["daily", "weekly"] as const).map((freq) => (
                    <button
                      key={freq}
                      onClick={() => setSubFrequency(freq)}
                      className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
                        subFrequency === freq
                          ? "bg-indigo-600 text-white border border-indigo-500"
                          : "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alert Categories */}
              <div className="mb-6">
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1">Alert Categories</label>
                <p className="text-gray-500 text-xs mb-3">
                  Leave all unselected to receive alerts for every category.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category}
                      onClick={() => handleToggleSubCategory(category)}
                      className={`px-3 py-2 rounded-lg text-sm font-bold transition-all text-left ${
                        subCategories.includes(category)
                          ? "bg-indigo-600 text-white border border-indigo-500"
                          : "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSubscribe}
                  disabled={isSubSaving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Bell className="w-4 h-4" />
                  {isSubSaving ? "Saving..." : subscription ? "Update Alerts" : "Subscribe"}
                </button>
                {subscription && (
                  <button
                    onClick={handleUnsubscribe}
                    disabled={isSubSaving}
                    className="flex items-center gap-2 py-3 px-5 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-500/20 font-bold transition-all disabled:opacity-50"
                  >
                    <BellOff className="w-4 h-4" />
                    Unsubscribe
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
