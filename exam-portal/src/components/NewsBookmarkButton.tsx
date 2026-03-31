"use client";

import { useEffect, useState } from "react";

interface BookmarkData {
  slug: string;
  headline: string;
  category: string;
  published_at: string;
  image_url?: string | null;
}

const STORAGE_KEY = "news_bookmarks";

function getBookmarks(): BookmarkData[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function setBookmarks(items: BookmarkData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function isNewsBookmarked(slug: string): boolean {
  return getBookmarks().some((b) => b.slug === slug);
}

export function addNewsBookmark(data: BookmarkData) {
  const existing = getBookmarks().filter((b) => b.slug !== data.slug);
  setBookmarks([data, ...existing].slice(0, 100)); // max 100 bookmarks
}

export function removeNewsBookmark(slug: string) {
  setBookmarks(getBookmarks().filter((b) => b.slug !== slug));
}

export default function NewsBookmarkButton({
  slug,
  headline,
  category,
  published_at,
  image_url,
  accent,
}: BookmarkData & { accent: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isNewsBookmarked(slug));
  }, [slug]);

  const toggle = () => {
    if (saved) {
      removeNewsBookmark(slug);
      setSaved(false);
    } else {
      addNewsBookmark({ slug, headline, category, published_at, image_url });
      setSaved(true);
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={saved ? "Remove bookmark" : "Bookmark this article"}
      title={saved ? "Saved — click to remove" : "Save for later"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "7px",
        fontSize: "11px",
        fontWeight: 900,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        padding: "11px 16px",
        minHeight: "44px",
        border: `1px solid ${saved ? accent : "#1e1e24"}`,
        color: saved ? accent : "#7c7888",
        backgroundColor: "#0d0d10",
        transition: "color 0.15s, border-color 0.15s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        if (!saved) {
          (e.currentTarget as HTMLElement).style.color = "#f2ede6";
          (e.currentTarget as HTMLElement).style.borderColor = accent;
        }
      }}
      onMouseLeave={(e) => {
        if (!saved) {
          (e.currentTarget as HTMLElement).style.color = "#7c7888";
          (e.currentTarget as HTMLElement).style.borderColor = "#1e1e24";
        }
      }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
      </svg>
      {saved ? "Saved" : "Save"}
    </button>
  );
}
