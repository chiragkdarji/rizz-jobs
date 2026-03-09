"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Bookmark } from "lucide-react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

interface BookmarkButtonProps {
  notificationId: string;
  onBookmarkChange?: (isBookmarked: boolean) => void;
}

export function BookmarkButton({
  notificationId,
  onBookmarkChange,
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY);

  // Check if user is logged in and if notification is bookmarked
  useEffect(() => {
    async function checkBookmarkStatus() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        setUser(currentUser);

        if (currentUser) {
          const res = await fetch("/api/user/bookmarks");
          if (res.ok) {
            const bookmarks = await res.json() as Array<{ notification_id: string }>;
            const ids = bookmarks.map((b) => b.notification_id);
            setIsBookmarked(ids.includes(notificationId));
          }
        }
      } catch {
        // Silently handle errors
      } finally {
        setIsLoading(false);
      }
    }

    checkBookmarkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleBookmark = async () => {
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = `/auth/login?redirect=/exam/${notificationId}`;
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isBookmarked) {
        // Remove bookmark
        const res = await fetch("/api/user/bookmarks", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notification_id: notificationId }),
        });

        if (!res.ok) throw new Error("Failed to remove bookmark");
        setIsBookmarked(false);
        onBookmarkChange?.(false);
      } else {
        // Add bookmark
        const res = await fetch("/api/user/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notification_id: notificationId }),
        });

        if (!res.ok) {
          const data = await res.json();
          if (res.status === 409) {
            // Already bookmarked
            setIsBookmarked(true);
            onBookmarkChange?.(true);
            return;
          }
          throw new Error(data.error || "Failed to bookmark");
        }
        setIsBookmarked(true);
        onBookmarkChange?.(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleToggleBookmark}
        disabled={isLoading}
        className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-bold transition-all ${
          isBookmarked
            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
            : "bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Bookmark
          className={`w-5 h-5 ${isBookmarked ? "fill-current" : ""}`}
        />
        {isLoading
          ? "Loading..."
          : isBookmarked
            ? "Saved"
            : "Save Job"}
      </button>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
      {!user && !isLoading && (
        <p className="text-xs text-gray-500">Sign in to save jobs</p>
      )}
    </div>
  );
}
